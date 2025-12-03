
import { store } from './data_model.js';

let container = null;
let resizeObserver = null;

// Palette for solutions
const COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', 
    '#ec4899', '#6366f1', '#14b8a6', '#f43f5e', 
    '#06b6d4', '#84cc16'
];

// Layout Configuration
const CONFIG = {
    domain: {
        headerHeight: 32,
        padding: 6, // Gap between domain border and categories
        headerBg: '#334155', // Slate-700
        headerText: '#ffffff',
        borderColor: '#334155',
        borderWidth: 2
    },
    category: {
        headerHeight: 26,
        padding: 4, // Gap between category border and solutions
        headerBg: '#f1f5f9', // Slate-100
        headerText: '#334155', // Slate-700
        borderColor: '#cbd5e1', // Slate-300
        borderWidth: 1
    },
    solution: {
        padding: 1 // Gap between solutions
    }
};

export function initTreemap(containerId) {
    container = document.getElementById(containerId);
    if (!container) return;

    // Set container base styles
    container.style.position = 'relative';
    container.style.overflow = 'hidden';

    // Initial Render
    render(store.getData());

    // Subscribe to data changes
    store.subscribe((data) => {
        render(data);
    });

    // Handle Resize
    resizeObserver = new ResizeObserver(() => {
        window.requestAnimationFrame(() => {
            if (store.getData()) {
                render(store.getData());
            }
        });
    });
    resizeObserver.observe(container);
}

function render(data) {
    if (!container) return;
    
    // Clear container
    container.innerHTML = '';
    
    // Handle empty state
    const hasData = data && Object.keys(data).length > 0;
    const emptyState = document.getElementById('empty-state');
    if (emptyState) {
        if (!hasData) {
            emptyState.classList.remove('hidden');
            return;
        } else {
            emptyState.classList.add('hidden');
        }
    }

    const width = container.clientWidth;
    const height = container.clientHeight;

    if (width === 0 || height === 0) return;

    // 1. Transform Data into Hierarchy with Values
    const rootNode = buildHierarchy(data);

    if (rootNode.value === 0) return;

    // 2. Calculate Layout (Squarified)
    // We start with the full container area
    const layoutNodes = calculateLayout(rootNode, { x: 0, y: 0, width, height });

    // 3. Render to DOM
    renderNodes(container, layoutNodes);
}

/**
 * Transforms the flat data store into a node tree with computed values.
 */
function buildHierarchy(data) {
    const root = {
        name: 'root',
        type: 'root',
        children: [],
        value: 0
    };

    Object.entries(data).forEach(([domainName, categories]) => {
        const domainNode = {
            name: domainName,
            type: 'domain',
            children: [],
            value: 0
        };

        Object.entries(categories).forEach(([catName, solutions]) => {
            const catNode = {
                name: catName,
                type: 'category',
                children: [],
                value: 0
            };

            solutions.forEach(sol => {
                // Ensure share is a number
                const shareVal = parseFloat(sol.share) || 0;
                const solNode = {
                    name: sol.name,
                    type: 'solution',
                    share: shareVal,
                    value: shareVal // Use share as the sizing value
                };
                catNode.children.push(solNode);
                catNode.value += solNode.value;
            });

            if (catNode.value > 0) {
                domainNode.children.push(catNode);
                domainNode.value += catNode.value;
            }
        });

        if (domainNode.value > 0) {
            root.children.push(domainNode);
            root.value += domainNode.value;
        }
    });

    return root;
}

/**
 * Recursively calculates the layout for the tree.
 * Returns a list of nodes with {rect} attached.
 */
function calculateLayout(node, rect) {
    // Add current node to results
    const results = [{ node, rect }];

    // Base case: No children
    if (!node.children || node.children.length === 0) return results;

    // Determine Content Area for Children based on Node Type (Subtract headers/padding)
    let contentRect = { ...rect };

    if (node.type === 'domain') {
        // Header space
        contentRect.y += CONFIG.domain.headerHeight;
        contentRect.height -= CONFIG.domain.headerHeight;
        
        // Padding
        const pad = CONFIG.domain.padding;
        contentRect.x += pad;
        contentRect.y += pad;
        contentRect.width -= (pad * 2);
        contentRect.height -= (pad * 2);

    } else if (node.type === 'category') {
        // Header space
        contentRect.y += CONFIG.category.headerHeight;
        contentRect.height -= CONFIG.category.headerHeight;

        // Padding
        const pad = CONFIG.category.padding;
        contentRect.x += pad;
        contentRect.y += pad;
        contentRect.width -= (pad * 2);
        contentRect.height -= (pad * 2);
    } 
    // Root has no chrome, just uses full rect

    // Safety check for negative dimensions
    if (contentRect.width <= 0 || contentRect.height <= 0) return results;

    // Run Squarify Algorithm for Children
    // This returns an array of { child: node, rect: {...} }
    const layoutChildren = squarify(node.children, contentRect);

    // Recursively calculate layout for children
    layoutChildren.forEach(item => {
        const childResults = calculateLayout(item.child, item.rect);
        // Merge results
        childResults.forEach(r => results.push(r));
    });

    return results;
}

/**
 * Squarified Treemap Algorithm
 * Returns [{ child, rect }, ...]
 */
function squarify(children, rect) {
    const { x, y, width, height } = rect;
    if (children.length === 0) return [];

    const totalValue = children.reduce((sum, c) => sum + c.value, 0);
    // Sort children by value descending
    const sortedChildren = [...children].sort((a, b) => b.value - a.value);

    const results = [];
    
    let cursorX = x;
    let cursorY = y;
    let availableWidth = width;
    let availableHeight = height;
    
    let currentRow = [];
    
    // Helper to process a finished row
    const layoutRow = (row, containerDim, isVerticalStacking) => {
        const rowValue = row.reduce((s, c) => s + c.value, 0);
        const rowArea = (rowValue / totalValue) * (width * height);
        
        let rowH, rowW;
        
        // isVerticalStacking means we are stacking rows vertically (width is fixed to containerDim)
        // If false, we are stacking columns horizontally (height is fixed to containerDim)
        
        if (isVerticalStacking) {
            // Stacking rows along Y axis. Row width is fixed.
            rowW = containerDim; // which is availableWidth
            rowH = rowArea / rowW;
        } else {
            // Stacking columns along X axis. Column height is fixed.
            rowH = containerDim; // which is availableHeight
            rowW = rowArea / rowH;
        }

        let itemX = cursorX;
        let itemY = cursorY;

        row.forEach(child => {
            const itemArea = (child.value / totalValue) * (width * height);
            let itemW, itemH;

            if (isVerticalStacking) {
                 // Items in this row flow Horizontally
                 itemH = rowH;
                 itemW = itemArea / itemH;
                 results.push({ child, rect: { x: itemX, y: itemY, width: itemW, height: itemH } });
                 itemX += itemW;
            } else {
                 // Items in this column flow Vertically
                 itemW = rowW;
                 itemH = itemArea / itemW;
                 results.push({ child, rect: { x: itemX, y: itemY, width: itemW, height: itemH } });
                 itemY += itemH;
            }
        });

        // Update cursor and available space
        if (isVerticalStacking) {
            cursorY += rowH;
            availableHeight -= rowH;
        } else {
            cursorX += rowW;
            availableWidth -= rowW;
        }
    };

    sortedChildren.forEach(child => {
        if (currentRow.length === 0) {
            currentRow.push(child);
            return;
        }

        const shortSide = Math.min(availableWidth, availableHeight);
        const isVerticalStacking = availableWidth >= availableHeight; // If width > height, we cut vertically? No.
        // Standard approach:
        // If width >= height, we treat 'width' as the long side. We stack columns along the long side.
        // Wait, 'squarify' fills the short side.
        // If width (600) > height (400). Short side is 400.
        // We build a column of width `w`. `w` is determined by area.
        // The items stack vertically inside this column.
        
        // Let's stick to the parameter `w` in `worst(row, w)`. `w` is the fixed dimension of the row.
        
        const currentWorst = worstRatio(currentRow, shortSide, totalValue, width * height);
        const nextRow = [...currentRow, child];
        const nextWorst = worstRatio(nextRow, shortSide, totalValue, width * height);

        if (nextWorst <= currentWorst) {
            currentRow.push(child);
        } else {
            layoutRow(currentRow, availableWidth >= availableHeight ? availableHeight : availableWidth, availableWidth < availableHeight); 
            // Note logic above: 
            // If availableWidth (600) > availableHeight (400):
            // We are cutting off a chunk from width. The "row" acts as a vertical strip.
            // The fixed dimension for items inside is the strip width? No, items stack inside.
            // Items stack vertically. The fixed dimension of the row/strip is availableHeight.
            
            currentRow = [child];
        }
    });

    if (currentRow.length > 0) {
        layoutRow(currentRow, availableWidth >= availableHeight ? availableHeight : availableWidth, availableWidth < availableHeight);
    }

    return results;
}

function worstRatio(row, w, totalTreeValue, totalTreeArea) {
    if (row.length === 0) return Infinity;
    const rowValue = row.reduce((a, b) => a + b.value, 0);
    const rowArea = (rowValue / totalTreeValue) * totalTreeArea;
    const rowSide = rowArea / w; // The calculated thickness of the row
    const r1 = (w * w * Math.max(...row.map(c => c.value))) / (rowValue * rowArea); // Simplified formula
    // Actually let's use the explicit one for clarity
    const minVal = Math.min(...row.map(c => c.value));
    const maxVal = Math.max(...row.map(c => c.value));
    const minArea = (minVal / rowValue) * rowArea;
    const maxArea = (maxVal / rowValue) * rowArea;
    
    // Side of item along w = minArea / rowSide? No.
    // If row is a strip of thickness `rowSide` and length `w`.
    // Item is a rectangle inside. One side is `rowSide`. Other is `ItemArea / rowSide`.
    // Ratio = max(rowSide / other, other / rowSide).
    
    // Let's use the standard formula: max(w^2 * maxVal / s^2, s^2 / (w^2 * minVal)) where s is sum.
    // Derived from Bruls et al.
    const s = rowValue;
    const s2 = s * s;
    const w2 = w * w;
    return Math.max(
        (w2 * maxVal) / s2,
        s2 / (w2 * minVal)
    );
}

/**
 * Renders the layout nodes to DOM elements.
 */
function renderNodes(container, layoutItems) {
    // Sort items so containers render before children (z-index naturally works or use explict z-index)
    // We'll use explicit z-index.
    
    layoutItems.forEach(({ node, rect }) => {
        if (node.type === 'root') return;

        const el = document.createElement('div');
        el.style.position = 'absolute';
        el.style.left = `${rect.x}px`;
        el.style.top = `${rect.y}px`;
        el.style.width = `${Math.max(0, rect.width)}px`;
        el.style.height = `${Math.max(0, rect.height)}px`;
        el.style.boxSizing = 'border-box';
        el.style.overflow = 'hidden';
        el.style.transition = 'all 0.5s ease-out';

        if (node.type === 'domain') {
            applyDomainStyle(el, node);
        } else if (node.type === 'category') {
            applyCategoryStyle(el, node);
        } else if (node.type === 'solution') {
            applySolutionStyle(el, node);
        }

        container.appendChild(el);
    });
}

function applyDomainStyle(el, node) {
    el.className = "rounded-lg shadow-sm flex flex-col";
    el.style.border = `${CONFIG.domain.borderWidth}px solid ${CONFIG.domain.borderColor}`;
    el.style.backgroundColor = '#fff';
    el.style.zIndex = 10;

    // Header
    const header = document.createElement('div');
    header.style.height = `${CONFIG.domain.headerHeight}px`;
    header.style.backgroundColor = CONFIG.domain.headerBg;
    header.style.color = CONFIG.domain.headerText;
    header.className = "flex items-center justify-center font-bold text-sm tracking-wide shrink-0 uppercase";
    header.textContent = node.name;
    el.appendChild(header);
}

function applyCategoryStyle(el, node) {
    el.className = "rounded flex flex-col";
    el.style.border = `${CONFIG.category.borderWidth}px solid ${CONFIG.category.borderColor}`;
    el.style.backgroundColor = '#fff';
    el.style.zIndex = 20;

    // Header
    const header = document.createElement('div');
    header.style.height = `${CONFIG.category.headerHeight}px`;
    header.style.backgroundColor = CONFIG.category.headerBg;
    header.style.color = CONFIG.category.headerText;
    header.className = "flex items-center justify-center font-semibold text-xs shrink-0";
    header.textContent = node.name;
    el.appendChild(header);
}

function applySolutionStyle(el, node) {
    el.style.zIndex = 30;
    
    const colorIndex = Math.abs(stringHash(node.name)) % COLORS.length;
    const bg = COLORS[colorIndex];

    el.style.backgroundColor = bg;
    el.style.color = '#fff';
    el.className = "flex flex-col items-center justify-center text-center p-1 hover:brightness-110 transition-all cursor-default shadow-sm";
    
    // Gap adjustment (simulate gap by shrinking size)
    const gap = CONFIG.solution.padding;
    el.style.width = `${Math.max(0, parseFloat(el.style.width) - gap * 2)}px`;
    el.style.height = `${Math.max(0, parseFloat(el.style.height) - gap * 2)}px`;
    el.style.left = `${parseFloat(el.style.left) + gap}px`;
    el.style.top = `${parseFloat(el.style.top) + gap}px`;

    // Content
    const w = parseFloat(el.style.width);
    const h = parseFloat(el.style.height);

    // Only show text if box is big enough
    if (w > 30 && h > 30) {
        const nameEl = document.createElement('div');
        nameEl.className = "font-medium text-xs leading-tight break-words w-full px-1 mb-0.5 line-clamp-2";
        nameEl.textContent = node.name;
        el.appendChild(nameEl);
        
        if (h > 45) {
            const shareEl = document.createElement('div');
            shareEl.className = "text-[10px] opacity-90 font-mono";
            shareEl.textContent = `${node.share}%`;
            el.appendChild(shareEl);
        }
    } else {
        el.title = `${node.name} (${node.share}%)`;
    }
}

function stringHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
}

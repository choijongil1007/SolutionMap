

import { store } from './data_model.js';

let container = null;
let resizeObserver = null;

// Palette: Custom User Palette
// Used by rank order (1st, 2nd, 3rd...)
const CHROMATIC_PALETTE = [
    '#4C6EF5', // Blue
    '#0CA678', // Green
    '#FFA94D', // Orange
    '#F06595', // Pink
    '#7950F2'  // Purple
];

// Layout Configuration
const CONFIG = {
    globalPadding: 32, 

    domain: {
        headerHeight: 46, 
        padding: 6,
        marginBottom: 24, // Space between stacked domains       
        headerBg: 'transparent', 
        headerText: '#171717', 
        borderColor: 'transparent', 
        borderWidth: 0    
    },
    category: {
        headerHeight: 32,
        padding: 0, 
        headerBg: '#171717', 
        headerText: '#ffffff', 
        borderColor: '#000000', // Changed to Black
        borderWidth: 1
    },
    solution: {
        padding: 0 
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
    // Note: We only trigger if width changes to avoid infinite loop with height updates
    let lastWidth = container.clientWidth;
    resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
            if (entry.contentRect.width !== lastWidth) {
                lastWidth = entry.contentRect.width;
                window.requestAnimationFrame(() => {
                    if (store.getData()) {
                        render(store.getData());
                    }
                });
            }
        }
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

    // 1. Calculate Dynamic Height based on Domain Count
    // To allow the map to grow vertically as domains are added.
    const domainKeys = Object.keys(data);
    const domainCount = domainKeys.length;
    const minHeight = 600; // Minimum default height
    const heightPerDomain = 300; // Pixels allocated per domain approx
    
    // Calculate required height: Domains + Gaps + Padding
    let calculatedHeight = minHeight;
    if (domainCount > 0) {
        calculatedHeight = (domainCount * heightPerDomain) + ((domainCount - 1) * CONFIG.domain.marginBottom) + (CONFIG.globalPadding * 2);
    }
    
    // Ensure height is at least the minimum
    calculatedHeight = Math.max(minHeight, calculatedHeight);
    
    // Apply height to container
    container.style.height = `${calculatedHeight}px`;

    const width = container.clientWidth;
    const height = calculatedHeight;

    if (width === 0 || height === 0) return;

    // 2. Transform Data into Hierarchy with Values
    const rootNode = buildHierarchy(data);

    if (rootNode.value === 0) return;

    // 3. Calculate Layout
    // Apply Global Padding
    const pad = CONFIG.globalPadding;
    const layoutNodes = calculateLayout(rootNode, { 
        x: pad, 
        y: pad, 
        width: width - (pad * 2), 
        height: height - (pad * 2) 
    });

    // 4. Render to DOM
    renderNodes(container, layoutNodes);
}

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

            // Sort solutions by share descending
            const sortedSolutions = [...solutions].sort((a, b) => b.share - a.share);

            sortedSolutions.forEach((sol, index) => {
                const shareVal = parseFloat(sol.share) || 0;
                const safeVal = shareVal <= 0 ? 0.01 : shareVal;
                
                const solNode = {
                    name: sol.name,
                    type: 'solution',
                    share: shareVal,
                    value: safeVal,
                    rank: index 
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

function calculateLayout(node, rect) {
    const results = [{ node, rect }];

    if (!node.children || node.children.length === 0) return results;

    let contentRect = { ...rect };

    // --- Special Layout for Root -> Domain (Vertical Stack) ---
    if (node.type === 'root') {
        const children = node.children;
        const totalValue = children.reduce((sum, c) => sum + c.value, 0);
        
        // Calculate gaps
        const gap = CONFIG.domain.marginBottom;
        const totalGaps = Math.max(0, children.length - 1) * gap;
        const availableHeight = contentRect.height - totalGaps;
        
        let currentY = contentRect.y;

        children.forEach(child => {
            // Determine height proportional to value
            // Guard against division by zero if totalValue is 0
            const ratio = totalValue === 0 ? 0 : child.value / totalValue;
            const childH = Math.max(0, availableHeight * ratio);
            
            const childRect = {
                x: contentRect.x,
                y: currentY,
                width: contentRect.width,
                height: childH
            };

            // Recurse
            const childResults = calculateLayout(child, childRect);
            childResults.forEach(r => results.push(r));

            // Move cursor
            currentY += childH + gap;
        });

        return results;
    }

    // --- Standard Squarified Layout for Domain -> Category -> Solution ---
    
    if (node.type === 'domain') {
        contentRect.y += CONFIG.domain.headerHeight;
        contentRect.height -= CONFIG.domain.headerHeight;
        const pad = CONFIG.domain.padding;
        contentRect.x += pad;
        contentRect.y += pad;
        contentRect.width -= (pad * 2);
        contentRect.height -= (pad * 2);

    } else if (node.type === 'category') {
        contentRect.y += CONFIG.category.headerHeight;
        contentRect.height -= CONFIG.category.headerHeight;
        const pad = CONFIG.category.padding;
        contentRect.x += pad;
        contentRect.y += pad;
        contentRect.width -= (pad * 2);
        contentRect.height -= (pad * 2);
    } 

    if (contentRect.width <= 0 || contentRect.height <= 0) return results;

    const layoutChildren = squarify(node.children, contentRect);

    layoutChildren.forEach(item => {
        const childResults = calculateLayout(item.child, item.rect);
        childResults.forEach(r => results.push(r));
    });

    return results;
}

function squarify(children, rect) {
    const { x, y, width, height } = rect;
    if (children.length === 0) return [];

    const totalValue = children.reduce((sum, c) => sum + c.value, 0);
    const sortedChildren = [...children].sort((a, b) => b.value - a.value);
    
    const totalArea = width * height;
    const scale = totalArea / totalValue;

    const results = [];
    
    let cursorX = x;
    let cursorY = y;
    let availableWidth = width;
    let availableHeight = height;
    
    let currentRow = [];
    
    const layoutRow = (row) => {
        const rowValue = row.reduce((s, c) => s + c.value, 0);
        const rowArea = rowValue * scale;
        
        const isWide = availableWidth >= availableHeight;
        
        if (isWide) {
            const stripH = availableHeight;
            const stripW = rowArea / stripH;
            
            let itemY = cursorY;
            row.forEach(child => {
                const itemArea = child.value * scale;
                const itemW = stripW;
                const itemH = itemArea / itemW;
                
                results.push({ 
                    child, 
                    rect: { x: cursorX, y: itemY, width: itemW, height: itemH } 
                });
                itemY += itemH; 
            });
            
            cursorX += stripW;
            availableWidth -= stripW;
            
        } else {
            const stripW = availableWidth;
            const stripH = rowArea / stripW;
            
            let itemX = cursorX;
            row.forEach(child => {
                const itemArea = child.value * scale;
                const itemH = stripH;
                const itemW = itemArea / itemH;
                
                results.push({ 
                    child, 
                    rect: { x: itemX, y: cursorY, width: itemW, height: itemH } 
                });
                itemX += itemW;
            });
            
            cursorY += stripH;
            availableHeight -= stripH;
        }
    };

    sortedChildren.forEach(child => {
        if (currentRow.length === 0) {
            currentRow.push(child);
            return;
        }

        const shortSide = Math.min(availableWidth, availableHeight);
        
        const currentWorst = worstRatio(currentRow, shortSide, scale);
        const nextRow = [...currentRow, child];
        const nextWorst = worstRatio(nextRow, shortSide, scale);

        if (nextWorst <= currentWorst) {
            currentRow.push(child);
        } else {
            layoutRow(currentRow);
            currentRow = [child];
        }
    });

    if (currentRow.length > 0) {
        layoutRow(currentRow);
    }

    return results;
}

function worstRatio(row, w, scale) {
    if (row.length === 0) return Infinity;
    
    const rowValue = row.reduce((a, b) => a + b.value, 0);
    const rowArea = rowValue * scale;
    const s2 = rowArea * rowArea;
    const w2 = w * w;
    
    if (s2 === 0 || w2 === 0) return Infinity;

    const minVal = Math.min(...row.map(c => c.value));
    const maxVal = Math.max(...row.map(c => c.value));
    
    const minArea = minVal * scale;
    const maxArea = maxVal * scale;
    
    return Math.max(
        (w2 * maxArea) / s2,
        s2 / (w2 * minArea)
    );
}

function renderNodes(container, layoutItems) {
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
        el.style.transition = 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)'; 

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
    // Large Category Bar Style: Transparent container, bottom-bordered header
    el.className = "flex flex-col"; // No box shadow or border on the container
    el.style.border = 'none';
    el.style.backgroundColor = 'transparent';
    el.style.zIndex = 10;

    const header = document.createElement('div');
    header.style.height = `${CONFIG.domain.headerHeight}px`;
    header.style.backgroundColor = 'transparent';
    header.style.color = CONFIG.domain.headerText;
    // Strong bottom border acts as the "Bar"
    header.style.borderBottom = '3px solid #171717'; 
    header.className = "flex items-center justify-center font-extrabold text-xl tracking-tight shrink-0 uppercase px-2 mb-1";
    header.textContent = node.name;
    el.appendChild(header);
}

function applyCategoryStyle(el, node) {
    // Changed: Removed rounded-lg for square corners
    el.className = "flex flex-col overflow-hidden shadow-sm"; 
    el.style.border = `${CONFIG.category.borderWidth}px solid ${CONFIG.category.borderColor}`;
    el.style.backgroundColor = '#fff';
    el.style.zIndex = 20;

    const header = document.createElement('div');
    header.style.height = `${CONFIG.category.headerHeight}px`;
    header.style.backgroundColor = CONFIG.category.headerBg;
    header.style.color = CONFIG.category.headerText;
    header.className = "flex items-center justify-center font-bold text-sm shrink-0 truncate px-1 tracking-tight";
    header.textContent = node.name;
    el.appendChild(header);
}

function applySolutionStyle(el, node) {
    el.style.zIndex = 30;
    
    const rank = node.rank || 0;
    const colorIndex = rank % CHROMATIC_PALETTE.length;
    const bg = CHROMATIC_PALETTE[colorIndex];

    el.style.backgroundColor = bg;
    el.style.color = '#ffffff'; 
    el.style.textShadow = '0 1px 2px rgba(0,0,0,0.15)';
    
    // Changed: Removed rounded-sm and shadow-sm for flat full tile look
    el.className = "flex flex-col items-center justify-center text-center p-1 hover:brightness-110 transition-all cursor-default group";

    const gap = CONFIG.solution.padding;
    el.style.width = `${Math.max(0, parseFloat(el.style.width) - gap * 2)}px`;
    el.style.height = `${Math.max(0, parseFloat(el.style.height) - gap * 2)}px`;
    el.style.left = `${parseFloat(el.style.left) + gap}px`;
    el.style.top = `${parseFloat(el.style.top) + gap}px`;

    const w = parseFloat(el.style.width);
    const h = parseFloat(el.style.height);

    if (w > 30 && h > 24) {
        const nameEl = document.createElement('div');
        // Increased font size and weight
        nameEl.className = "font-bold leading-tight break-words w-full px-0.5 mb-0.5 line-clamp-2";
        // Adaptive font size: Bigger than before (12px min, 15px max)
        nameEl.style.fontSize = w < 80 ? '12px' : '15px'; 
        nameEl.textContent = node.name;
        el.appendChild(nameEl);
        
        if (h > 50) {
            const shareEl = document.createElement('div');
            shareEl.className = "text-[11px] opacity-90 font-mono font-medium";
            shareEl.textContent = `${node.share}%`;
            el.appendChild(shareEl);
        }
    }
    
    el.title = `${node.name} (${node.share}%)`;
    
    // Optional: Add a subtle border to separate tiles since padding is 0
    el.style.boxShadow = "inset 0 0 0 1px rgba(255,255,255,0.15)";
}


import { store } from './data_model.js';

let container = null;
let resizeObserver = null;

// Palette for solutions - Updated to fit premium aesthetic (Slightly less saturated)
const COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', 
    '#ec4899', '#6366f1', '#14b8a6', '#f43f5e', 
    '#06b6d4', '#84cc16', '#e11d48', '#0891b2',
    '#7c3aed', '#db2777', '#ea580c', '#65a30d'
];

// Layout Configuration
const CONFIG = {
    domain: {
        headerHeight: 34,
        padding: 6, 
        headerBg: '#1e293b', // Slate-800
        headerText: '#f8fafc',
        borderColor: '#cbd5e1', // Slate-300
        borderWidth: 1
    },
    category: {
        headerHeight: 28,
        padding: 4, 
        headerBg: '#f1f5f9', // Slate-100
        headerText: '#475569', // Slate-600
        borderColor: '#e2e8f0', // Slate-200
        borderWidth: 1
    },
    solution: {
        padding: 1 
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
    const layoutNodes = calculateLayout(rootNode, { x: 0, y: 0, width, height });

    // 3. Render to DOM
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

            solutions.forEach(sol => {
                const shareVal = parseFloat(sol.share) || 0;
                // Ensure non-zero value for layout algo stability
                const safeVal = shareVal <= 0 ? 0.01 : shareVal;
                
                const solNode = {
                    name: sol.name,
                    type: 'solution',
                    share: shareVal,
                    value: safeVal
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
        el.style.transition = 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)'; // Smoother easing

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
    el.className = "rounded-xl shadow-sm flex flex-col overflow-hidden";
    el.style.border = `${CONFIG.domain.borderWidth}px solid ${CONFIG.domain.borderColor}`;
    el.style.backgroundColor = '#fff';
    el.style.zIndex = 10;

    const header = document.createElement('div');
    header.style.height = `${CONFIG.domain.headerHeight}px`;
    header.style.backgroundColor = CONFIG.domain.headerBg;
    header.style.color = CONFIG.domain.headerText;
    header.className = "flex items-center justify-center font-bold text-sm tracking-wide shrink-0 uppercase truncate px-2";
    header.textContent = node.name;
    el.appendChild(header);
}

function applyCategoryStyle(el, node) {
    el.className = "rounded-lg flex flex-col overflow-hidden";
    el.style.border = `${CONFIG.category.borderWidth}px solid ${CONFIG.category.borderColor}`;
    el.style.backgroundColor = '#fff';
    el.style.zIndex = 20;

    const header = document.createElement('div');
    header.style.height = `${CONFIG.category.headerHeight}px`;
    header.style.backgroundColor = CONFIG.category.headerBg;
    header.style.color = CONFIG.category.headerText;
    header.className = "flex items-center justify-center font-semibold text-xs shrink-0 truncate px-1 tracking-tight";
    header.textContent = node.name;
    el.appendChild(header);
}

function applySolutionStyle(el, node) {
    el.style.zIndex = 30;
    
    const colorIndex = Math.abs(stringHash(node.name)) % COLORS.length;
    const bg = COLORS[colorIndex];

    el.style.backgroundColor = bg;
    el.style.color = '#fff';
    // Remove shadow on individual solution to clean up noise, add slight border radius
    el.className = "flex flex-col items-center justify-center text-center p-1 hover:brightness-110 transition-all cursor-default group rounded-sm";
    
    const gap = CONFIG.solution.padding;
    el.style.width = `${Math.max(0, parseFloat(el.style.width) - gap * 2)}px`;
    el.style.height = `${Math.max(0, parseFloat(el.style.height) - gap * 2)}px`;
    el.style.left = `${parseFloat(el.style.left) + gap}px`;
    el.style.top = `${parseFloat(el.style.top) + gap}px`;

    const w = parseFloat(el.style.width);
    const h = parseFloat(el.style.height);

    if (w > 30 && h > 24) {
        const nameEl = document.createElement('div');
        nameEl.className = "font-medium text-xs leading-tight break-words w-full px-0.5 mb-0.5 line-clamp-2";
        nameEl.style.fontSize = w < 60 ? '10px' : '11px';
        nameEl.textContent = node.name;
        el.appendChild(nameEl);
        
        if (h > 45) {
            const shareEl = document.createElement('div');
            shareEl.className = "text-[9px] opacity-90 font-mono";
            shareEl.textContent = `${node.share}%`;
            el.appendChild(shareEl);
        }
    }
    
    el.title = `${node.name} (${node.share}%)`;
}

function stringHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
}


import { store } from './data_model.js';

let container = null;
let resizeObserver = null;

// Palette: Pastel / Soft Tones (Premium SaaS Look)
// Ordered to be used by rank (1st, 2nd, 3rd...)
const COLORS = [
    '#60a5fa', // Blue 400 (Top 1)
    '#34d399', // Emerald 400 (Top 2)
    '#f472b6', // Pink 400
    '#a78bfa', // Violet 400
    '#fbbf24', // Amber 400
    '#22d3ee', // Cyan 400
    '#fb7185', // Rose 400
    '#94a3b8', // Slate 400
    '#818cf8', // Indigo 400
    '#a3e635'  // Lime 400
];

// Layout Configuration
const CONFIG = {
    domain: {
        headerHeight: 36, // Slightly taller for better proportions with thicker border
        padding: 8,       // More breathing room
        headerBg: '#1e293b', // Slate-800
        headerText: '#f8fafc',
        borderColor: '#475569', // Slate-600 (Much more visible than before)
        borderWidth: 2    // Thicker border for outer container
    },
    category: {
        headerHeight: 28,
        padding: 5, 
        headerBg: '#e2e8f0', // Slate-200 (Distinct from white body)
        headerText: '#334155', // Slate-700 (High contrast)
        borderColor: '#94a3b8', // Slate-400 (Visible mid-tone grey)
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

            // Sort solutions by share descending to assign rank-based colors
            // Clone array to avoid mutating store data directly during sort
            const sortedSolutions = [...solutions].sort((a, b) => b.share - a.share);

            sortedSolutions.forEach((sol, index) => {
                const shareVal = parseFloat(sol.share) || 0;
                // Ensure non-zero value for layout algo stability
                const safeVal = shareVal <= 0 ? 0.01 : shareVal;
                
                const solNode = {
                    name: sol.name,
                    type: 'solution',
                    share: shareVal,
                    value: safeVal,
                    rank: index // Assign rank (0 = 1st, 1 = 2nd, ...)
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
    // Squarify still needs to sort by size for the algorithm to work best
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
    el.className = "rounded-xl shadow-md flex flex-col overflow-hidden";
    el.style.border = `${CONFIG.domain.borderWidth}px solid ${CONFIG.domain.borderColor}`;
    el.style.backgroundColor = '#fff';
    el.style.zIndex = 10;

    const header = document.createElement('div');
    header.style.height = `${CONFIG.domain.headerHeight}px`;
    header.style.backgroundColor = CONFIG.domain.headerBg;
    header.style.color = CONFIG.domain.headerText;
    header.className = "flex items-center justify-center font-bold text-sm tracking-wide shrink-0 uppercase truncate px-2 border-b border-slate-700";
    header.textContent = node.name;
    el.appendChild(header);
}

function applyCategoryStyle(el, node) {
    el.className = "rounded-lg flex flex-col overflow-hidden shadow-sm";
    el.style.border = `${CONFIG.category.borderWidth}px solid ${CONFIG.category.borderColor}`;
    el.style.backgroundColor = '#fff';
    el.style.zIndex = 20;

    const header = document.createElement('div');
    header.style.height = `${CONFIG.category.headerHeight}px`;
    header.style.backgroundColor = CONFIG.category.headerBg;
    header.style.color = CONFIG.category.headerText;
    header.className = "flex items-center justify-center font-semibold text-xs shrink-0 truncate px-1 tracking-tight border-b border-slate-300";
    header.textContent = node.name;
    el.appendChild(header);
}

function applySolutionStyle(el, node) {
    el.style.zIndex = 30;
    
    // Use the rank assigned in buildHierarchy to determine color
    const colorIndex = (node.rank || 0) % COLORS.length;
    const bg = COLORS[colorIndex];

    el.style.backgroundColor = bg;
    el.style.color = '#fff'; 
    el.className = "flex flex-col items-center justify-center text-center p-1 hover:brightness-110 transition-all cursor-default group rounded-sm shadow-sm";
    
    el.style.textShadow = '0 1px 2px rgba(0,0,0,0.1)';

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

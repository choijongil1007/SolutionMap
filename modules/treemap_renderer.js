

import { store } from './data_model.js';

let container = null;
let resizeObserver = null;
let tooltipEl = null; // Custom Tooltip Element

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
        headerHeight: 32, // Reduced height for the bar
        padding: 6,
        marginBottom: 24, // Space between stacked domains       
        headerBg: '#1f2937', // Dark gray background (Bar style)
        headerText: '#ffffff', // White text
        borderColor: 'transparent', 
        borderWidth: 0    
    },
    category: {
        headerHeight: 32,
        padding: 0, 
        headerBg: '#171717', 
        headerText: '#ffffff', 
        borderColor: '#000000', 
        borderWidth: 1,
        margin: 1 // Spacing between categories
    },
    solution: {
        padding: 0 
    }
};

export function initTreemap(containerId) {
    container = document.getElementById(containerId);
    tooltipEl = document.getElementById('custom-tooltip');
    
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

    const containerWidth = container.clientWidth;
    if (containerWidth === 0) return;

    // 1. Calculate Dynamic Height based on Content Density (Solutions count)
    const domainKeys = Object.keys(data);
    
    // Configuration for dynamic sizing
    const MIN_DOMAIN_HEIGHT = 400; // Minimum height for a domain
    const AREA_PER_SOLUTION = 14000; // Estimated pixels needed per solution (approx 140x100)
    
    // Calculate required height for each domain
    const domainHeights = {};
    let totalRequiredHeight = CONFIG.globalPadding * 2; // Start with top/bottom padding

    domainKeys.forEach(domainName => {
        const categories = data[domainName];
        let solutionCount = 0;
        
        Object.values(categories).forEach(solutions => {
            // Count actual solutions + potentially 1 for the "Unknown" block if shares < 100
            let currentShare = solutions.reduce((acc, s) => acc + s.share, 0);
            solutionCount += solutions.length;
            if (currentShare < 100) {
                solutionCount += 1; // Add space for the '?' block
            }
        });

        // Ensure at least 1 count to avoid 0 height
        solutionCount = Math.max(1, solutionCount);

        // Calculate required area
        const requiredArea = solutionCount * AREA_PER_SOLUTION;
        
        // Convert Area to Height (Area / Width)
        // Adjust width for padding
        const effectiveWidth = containerWidth - (CONFIG.globalPadding * 2);
        let calculatedH = requiredArea / effectiveWidth;
        
        // Add header heights overhead
        const categoryCount = Object.keys(categories).length;
        const overhead = CONFIG.domain.headerHeight + (categoryCount * CONFIG.category.headerHeight) + 100; // buffer
        
        calculatedH += overhead;

        // Apply constraints
        domainHeights[domainName] = Math.max(MIN_DOMAIN_HEIGHT, calculatedH);
        
        totalRequiredHeight += domainHeights[domainName];
    });

    // Add gaps
    if (domainKeys.length > 0) {
        totalRequiredHeight += (domainKeys.length - 1) * CONFIG.domain.marginBottom;
    }
    
    // Apply height to container
    container.style.height = `${totalRequiredHeight}px`;

    // 2. Transform Data into Hierarchy with Values AND Custom Heights
    const rootNode = buildHierarchy(data, domainHeights);

    if (rootNode.value === 0 && domainKeys.length === 0) return;

    // 3. Calculate Layout
    const pad = CONFIG.globalPadding;
    const layoutNodes = calculateLayout(rootNode, { 
        x: pad, 
        y: pad, 
        width: containerWidth - (pad * 2), 
        height: totalRequiredHeight - (pad * 2) 
    });

    // 4. Render to DOM
    renderNodes(container, layoutNodes);
}

function buildHierarchy(data, domainHeights) {
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
            value: 0,
            customHeight: domainHeights ? domainHeights[domainName] : 0 // Inject calculated height
        };

        Object.entries(categories).forEach(([catName, solutions]) => {
            const catNode = {
                name: catName,
                type: 'category',
                children: [],
                value: 0
            };

            // Track total share to handle "Unknown" gap
            let totalShare = 0;

            // Sort solutions by share descending
            const sortedSolutions = [...solutions].sort((a, b) => b.share - a.share);

            sortedSolutions.forEach((sol, index) => {
                const shareVal = parseFloat(sol.share) || 0;
                totalShare += shareVal;
                
                const safeVal = shareVal <= 0 ? 0.01 : shareVal;
                
                const solNode = {
                    name: sol.name,
                    type: 'solution',
                    share: shareVal,
                    value: safeVal,
                    rank: index,
                    isUnknown: false
                };
                catNode.children.push(solNode);
                catNode.value += solNode.value;
            });

            // Check if there is missing share (e.g., total < 100)
            if (totalShare < 100) {
                const remainder = 100 - totalShare;
                // Fix floating point precision
                const cleanRemainder = parseFloat(remainder.toFixed(2));
                
                if (cleanRemainder > 0) {
                    const unknownNode = {
                        name: '?',
                        type: 'solution',
                        share: cleanRemainder,
                        value: cleanRemainder,
                        rank: 999, // Push to end usually
                        isUnknown: true // Flag to identify
                    };
                    catNode.children.push(unknownNode);
                    catNode.value += unknownNode.value;
                }
            }

            if (catNode.value > 0) {
                domainNode.children.push(catNode);
                domainNode.value += catNode.value;
            }
        });

        // Even if value is 0, we might want to show the domain structure (handle empty domains)
        root.children.push(domainNode);
        root.value += domainNode.value;
    });

    return root;
}

function calculateLayout(node, rect) {
    const results = [{ node, rect }];

    if (!node.children || node.children.length === 0) return results;

    let contentRect = { ...rect };

    // --- Special Layout for Root -> Domain (Vertical Stack using Custom Heights) ---
    if (node.type === 'root') {
        const children = node.children;
        const gap = CONFIG.domain.marginBottom;
        let currentY = contentRect.y;

        children.forEach(child => {
            // Use the pre-calculated custom height
            const childH = child.customHeight || 0;
            
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

    // Safety check for negative dimensions
    contentRect.width = Math.max(0, contentRect.width);
    contentRect.height = Math.max(0, contentRect.height);

    if (contentRect.width <= 0 || contentRect.height <= 0) return results;

    const layoutChildren = squarify(node.children, contentRect);

    layoutChildren.forEach(item => {
        let childRect = item.rect;

        // Apply spacing (margin) between Categories
        if (node.type === 'domain') {
            const m = CONFIG.category.margin;
            childRect = {
                x: item.rect.x + (m / 2),
                y: item.rect.y + (m / 2),
                width: item.rect.width - m,
                height: item.rect.height - m
            };
        }

        const childResults = calculateLayout(item.child, childRect);
        childResults.forEach(r => results.push(r));
    });

    return results;
}

function squarify(children, rect) {
    const { x, y, width, height } = rect;
    if (children.length === 0) return [];

    const totalValue = children.reduce((sum, c) => sum + c.value, 0);
    // If total value is 0 (e.g. empty categories), we can't layout properly
    if (totalValue === 0) return [];

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
        // Avoid division by zero
        if (shortSide <= 0) return;
        
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
    header.style.backgroundColor = CONFIG.domain.headerBg; // Dark Bar background
    header.style.color = CONFIG.domain.headerText;
    header.style.borderBottom = 'none'; // Removed thick line
    // Changed: Reduced font size (text-sm) and added rounded corners
    header.className = "flex items-center justify-center font-bold text-sm tracking-tight shrink-0 uppercase px-2 mb-1 rounded-sm";
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
    
    // CUSTOM STYLE FOR UNKNOWN
    if (node.isUnknown) {
        el.style.backgroundColor = '#9CA3AF'; // Gray (Slate 400)
        el.style.color = '#ffffff';
    } else {
        const rank = node.rank || 0;
        const colorIndex = rank % CHROMATIC_PALETTE.length;
        const bg = CHROMATIC_PALETTE[colorIndex];
        el.style.backgroundColor = bg;
        el.style.color = '#ffffff'; 
    }
    
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
    
    // CUSTOM TOOLTIP LOGIC
    // Remove native tooltip
    el.removeAttribute('title');

    el.addEventListener('mouseenter', (e) => {
        if (!tooltipEl) return;
        
        if (node.isUnknown) {
            tooltipEl.innerHTML = `미확인 솔루션 (${node.share}%)<br><span class="text-red-400 text-xs mt-1 block font-medium">확인 필요</span>`;
        } else {
            tooltipEl.textContent = `${node.name} (${node.share}%)`;
        }
        
        tooltipEl.classList.remove('hidden');
    });

    el.addEventListener('mousemove', (e) => {
        if (!tooltipEl) return;
        // Position above the cursor with offset
        const x = e.clientX;
        const y = e.clientY - 15;
        
        tooltipEl.style.left = `${x}px`;
        tooltipEl.style.top = `${y}px`;
        // Center horizontally relative to cursor, place above
        tooltipEl.style.transform = 'translate(-50%, -100%)';
    });

    el.addEventListener('mouseleave', () => {
        if (!tooltipEl) return;
        tooltipEl.classList.add('hidden');
    });
    
    // Optional: Add a subtle border to separate tiles since padding is 0
    el.style.boxShadow = "inset 0 0 0 1px rgba(255,255,255,0.15)";
}
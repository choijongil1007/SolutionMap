import { store } from './data_model.js';
import { showSolutionDetailModal } from '../utils/modal.js';

// Tooltip is global/singleton
let tooltipEl = null;

// Palette: Custom User Palette
const CHROMATIC_PALETTE = [
    '#4C6EF5', // Blue
    '#0CA678', // Green
    '#FFA94D', // Orange
    '#F06595', // Pink
    '#7950F2'  // Purple
];

// Layout Configuration
const CONFIG = {
    globalPadding: 24, 

    domain: {
        headerHeight: 0, // Removed header height (was 32)
        padding: 0,      // Removed padding (was 6)
        marginBottom: 0,     
        headerBg: 'transparent', 
        headerText: '#ffffff', 
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
        margin: 1 
    },
    solution: {
        padding: 0 
    }
};

export function initTreemap(containerId) {
    const container = document.getElementById(containerId);
    tooltipEl = document.getElementById('custom-tooltip');
    
    if (!container) return;

    // Initial Render
    render(container, store.getData());

    // Subscribe to data changes
    store.subscribe(() => {
        // Render specifically for this container.
        // Wrap in requestAnimationFrame to ensure layout updates from UI changes (like adding a node) are ready
        window.requestAnimationFrame(() => {
            render(container, store.getData());
        });
    });

    // Handle Resize
    let lastWidth = container.clientWidth;
    const resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
            if (entry.contentRect.width !== lastWidth) {
                lastWidth = entry.contentRect.width;
                window.requestAnimationFrame(() => {
                    if (store.getData()) {
                        render(container, store.getData());
                    }
                });
            }
        }
    });
    resizeObserver.observe(container);
}

function render(container, data) {
    if (!container) return;
    
    // Check width BEFORE clearing.
    const containerWidth = container.clientWidth;
    // Safety check: if width is 0 (hidden), don't try to render as it might break layout calculations
    if (containerWidth === 0) return;

    // FIX: Calculate available width by subtracting padding AND border offset
    const compStyle = window.getComputedStyle(container);
    const paddingX = parseFloat(compStyle.paddingLeft) + parseFloat(compStyle.paddingRight);
    
    // Subtract extra space for the border of the mapContainer (2px) and a tiny safety buffer (2px)
    // mapContainer has 'border' class which adds 1px border on each side.
    const BORDER_OFFSET = 4; 
    const availableWidth = Math.max(0, containerWidth - paddingX - BORDER_OFFSET);

    // Safe to clear
    container.innerHTML = '';
    
    // Handle empty state
    const domainEntries = Object.entries(data);
    const hasData = domainEntries.length > 0;
    
    if (container.id === 'treemap-container') {
        const emptyState = document.getElementById('empty-state');
        if (emptyState) {
            if (!hasData) {
                emptyState.classList.remove('hidden');
                return;
            } else {
                emptyState.classList.add('hidden');
            }
        }
    }

    // Configuration for dynamic sizing
    const MIN_DOMAIN_HEIGHT = 400; 
    const AREA_PER_SOLUTION = 14000; 

    // --- MAIN RENDER LOOP: Process each Domain separately ---
    
    domainEntries.forEach(([domainName, categories]) => {
        // 1. Create Wrapper for this Domain Section
        const sectionWrapper = document.createElement('div');
        // Added styling for distinct separation: bottom border and margin
        sectionWrapper.className = "w-full mb-16 border-b border-slate-200 pb-16 last:border-0 last:mb-0 last:pb-0"; 

        // 2. Main Header: | [Domain] Solution Map & Insight
        const mainHeader = document.createElement('h2');
        mainHeader.className = "text-2xl font-bold text-slate-800 mb-8 flex items-center tracking-tight";
        mainHeader.innerHTML = `<span class="text-blue-600 mr-3 text-3xl font-light">|</span> ${domainName}`;
        sectionWrapper.appendChild(mainHeader);

        // --- PART A: VISUAL TREEMAP FOR THIS DOMAIN ---
        
        // 3. Sub-header: Solution Map
        const mapHeader = document.createElement('h3');
        mapHeader.className = "text-lg font-bold text-slate-700 mb-4 pl-1";
        mapHeader.textContent = "Solution Map";
        sectionWrapper.appendChild(mapHeader);

        // Calculate Height for this Domain
        let solutionCount = 0;
        Object.values(categories).forEach(solutions => {
            let currentShare = solutions.reduce((acc, s) => acc + s.share, 0);
            solutionCount += solutions.length;
            if (currentShare < 100) solutionCount += 1; // Unknown block
        });
        solutionCount = Math.max(1, solutionCount);
        
        // Calculate dimensions
        const effectiveWidth = availableWidth; 
        const requiredArea = solutionCount * AREA_PER_SOLUTION;
        let calculatedH = requiredArea / effectiveWidth;
        
        const categoryCount = Object.keys(categories).length;
        // Overhead calculation adjusted (domain header is now 0)
        const overhead = CONFIG.domain.headerHeight + (categoryCount * CONFIG.category.headerHeight) + 40;
        calculatedH += overhead;
        const finalHeight = Math.max(MIN_DOMAIN_HEIGHT, calculatedH);

        // Map Container
        const mapContainer = document.createElement('div');
        // Removed border, bg, rounded, overflow-hidden to prevent clipping
        mapContainer.className = "relative w-full mb-10"; 
        mapContainer.style.height = `${finalHeight}px`;

        // Build Mini-Tree just for this Domain
        const domainRoot = buildDomainTree(domainName, categories);

        if (domainRoot.value > 0 || Object.keys(categories).length > 0) {
            // Layout
            const layoutNodes = calculateLayout(domainRoot, { 
                x: 0, 
                y: 0, 
                width: effectiveWidth, 
                height: finalHeight 
            });
            // Render Nodes into mapContainer
            renderNodes(mapContainer, layoutNodes);
        } else {
            // Empty domain placeholder
            mapContainer.innerHTML = `<div class="flex items-center justify-center h-full text-slate-400 text-sm">데이터 없음</div>`;
        }
        
        sectionWrapper.appendChild(mapContainer);


        // --- PART B: INSIGHTS FOR THIS DOMAIN ---
        
        const insightsEl = generateDomainInsights(domainName, categories);
        if (insightsEl) {
            sectionWrapper.appendChild(insightsEl);
        }

        // Add to Main Container
        container.appendChild(sectionWrapper);
    });
}

/**
 * Generates the Insight DOM element for a specific domain.
 * Returns null if no insights exist.
 */
function generateDomainInsights(domainName, categories) {
    let hasContent = false;
    
    // Check if any content exists first
    Object.values(categories).forEach(solutions => {
        solutions.forEach(sol => {
            if ((sol.painPoints && sol.painPoints.length > 0) || (sol.note && sol.note.trim().length > 0)) {
                hasContent = true;
            }
        });
    });

    if (!hasContent) return null;

    const wrapper = document.createElement('div');
    wrapper.className = "w-full";

    // Insight Sub-Header: Insight
    const insightHeader = document.createElement('h3');
    insightHeader.className = "text-lg font-bold text-slate-700 mb-4 pl-1";
    insightHeader.textContent = "Insight";
    wrapper.appendChild(insightHeader);
    
    const grid = document.createElement('div');
    grid.className = "grid grid-cols-1 gap-4";

    Object.entries(categories).forEach(([catName, solutions]) => {
        solutions.forEach(sol => {
            const hasPainPoints = sol.painPoints && sol.painPoints.length > 0;
            const hasNote = sol.note && sol.note.trim().length > 0;

            if (!hasPainPoints && !hasNote) return;

            const card = document.createElement('div');
            card.className = "bg-slate-50 rounded-xl border border-slate-200 p-5 hover:border-blue-300 transition-colors";

            let headerHtml = `
                <div class="flex flex-wrap items-start justify-between gap-4 mb-3">
                    <div>
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">${catName}</span>
                            <span class="text-xs font-medium text-slate-400">제조사: ${sol.manufacturer || '-'}</span>
                        </div>
                        <h4 class="text-lg font-bold text-slate-800">${sol.name}</h4>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <span class="text-2xl font-bold text-blue-600">${sol.share}%</span>
                        <span class="text-xs text-slate-400 font-medium uppercase mt-2">Share</span>
                    </div>
                </div>
            `;

            let bodyHtml = '';
            if (hasPainPoints) {
                const tags = sol.painPoints.map(p => 
                    `<span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                        ${p}
                     </span>`
                ).join('');
                
                bodyHtml += `
                    <div class="mb-3">
                        <p class="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Pain Points</p>
                        <div class="flex flex-wrap gap-2">${tags}</div>
                    </div>
                `;
            }

            if (hasNote) {
                bodyHtml += `
                    <div class="${hasPainPoints ? 'pt-3 border-t border-slate-200/60' : ''}">
                        <p class="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">추가 사항</p>
                        <p class="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">${sol.note}</p>
                    </div>
                `;
            }
            
            card.innerHTML = headerHtml + bodyHtml;
            grid.appendChild(card);
        });
    });

    wrapper.appendChild(grid);
    return wrapper;
}

/**
 * Builds a mini-tree for a single domain to pass to the layout engine.
 * Wraps the domain in a fake 'root'.
 */
function buildDomainTree(domainName, categories) {
    const root = {
        name: 'root',
        type: 'root',
        children: [],
        value: 0
    };

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

        let totalShare = 0;
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
                isUnknown: false,
                manufacturer: sol.manufacturer,
                painPoints: sol.painPoints,
                note: sol.note
            };
            catNode.children.push(solNode);
            catNode.value += solNode.value;
        });

        if (totalShare < 100) {
            const remainder = parseFloat((100 - totalShare).toFixed(2));
            if (remainder > 0) {
                const unknownNode = {
                    name: '?',
                    type: 'solution',
                    share: remainder,
                    value: remainder,
                    rank: 999,
                    isUnknown: true
                };
                catNode.children.push(unknownNode);
                catNode.value += unknownNode.value;
            }
        }
        
        // Fix for Real-time Display: 
        // If a category has no solutions, give it a small value so it renders as a placeholder box.
        if (catNode.value === 0) {
            catNode.value = 10;
        }

        if (catNode.value > 0) {
            domainNode.children.push(catNode);
            domainNode.value += catNode.value;
        }
    });

    // Always push the domain node even if empty to ensure header renders (if logic permits)
    root.children.push(domainNode);
    root.value += domainNode.value;

    return root;
}

function calculateLayout(node, rect) {
    const results = [{ node, rect }];

    if (!node.children || node.children.length === 0) return results;

    let contentRect = { ...rect };

    // --- Root -> Domain ---
    if (node.type === 'root') {
        const child = node.children[0];
        if(!child) return results;

        const childRect = {
            x: contentRect.x,
            y: contentRect.y,
            width: contentRect.width,
            height: contentRect.height
        };
        
        const childResults = calculateLayout(child, childRect);
        childResults.forEach(r => results.push(r));
        return results;
    }

    // --- Domain -> Category ---
    if (node.type === 'domain') {
        // If headerHeight is 0, this does nothing, which effectively removes the space reservation
        contentRect.y += CONFIG.domain.headerHeight;
        contentRect.height -= CONFIG.domain.headerHeight;
        const pad = CONFIG.domain.padding;
        contentRect.x += pad;
        contentRect.y += pad;
        contentRect.width -= (pad * 2);
        contentRect.height -= (pad * 2);
    } 
    // --- Category -> Solution ---
    else if (node.type === 'category') {
        contentRect.y += CONFIG.category.headerHeight;
        contentRect.height -= CONFIG.category.headerHeight;
        const pad = CONFIG.category.padding;
        contentRect.x += pad;
        contentRect.y += pad;
        contentRect.width -= (pad * 2);
        contentRect.height -= (pad * 2);
    } 

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
    el.className = "flex flex-col";
    el.style.border = 'none';
    el.style.backgroundColor = 'transparent';
    el.style.zIndex = 10;

    // Header removed as requested. CONFIG.domain.headerHeight is 0.
    // We do NOT create the header child div.
}

function applyCategoryStyle(el, node) {
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
    
    if (node.isUnknown) {
        el.style.backgroundColor = '#9CA3AF'; 
        el.style.color = '#ffffff';
    } else {
        const rank = node.rank || 0;
        const colorIndex = rank % CHROMATIC_PALETTE.length;
        const bg = CHROMATIC_PALETTE[colorIndex];
        el.style.backgroundColor = bg;
        el.style.color = '#ffffff'; 
    }
    
    el.style.textShadow = '0 1px 2px rgba(0,0,0,0.15)';
    // FIX: Reduced padding to p-[2px] to give more room. Kept items-center justify-center.
    el.className = "flex flex-col items-center justify-center text-center p-[2px] hover:brightness-110 transition-all cursor-pointer group";

    const gap = CONFIG.solution.padding;
    el.style.width = `${Math.max(0, parseFloat(el.style.width) - gap * 2)}px`;
    el.style.height = `${Math.max(0, parseFloat(el.style.height) - gap * 2)}px`;
    el.style.left = `${parseFloat(el.style.left) + gap}px`;
    el.style.top = `${parseFloat(el.style.top) + gap}px`;

    const w = parseFloat(el.style.width);
    const h = parseFloat(el.style.height);

    if (w > 30 && h > 24) {
        const nameEl = document.createElement('div');
        // FIX: Changed leading-snug to leading-tight (approx 1.25) or custom tight line height.
        // Added pb-[1px] to prevent descender clipping at bottom.
        nameEl.className = "font-bold leading-tight break-words w-full px-0.5 pb-[1px] line-clamp-2";
        // FIX: Slightly reduced font size: 13px (was 14px), 10px (was 11px)
        nameEl.style.fontSize = w < 80 ? '10px' : '13px'; 
        nameEl.textContent = node.name;
        el.appendChild(nameEl);
        
        if (h > 50) {
            const shareEl = document.createElement('div');
            shareEl.className = "text-[10px] opacity-90 font-mono font-medium";
            shareEl.textContent = `${node.share}%`;
            el.appendChild(shareEl);
        }
    }
    
    el.addEventListener('click', (e) => {
        e.stopPropagation();
        showSolutionDetailModal(node);
    });
    
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
        const x = e.clientX;
        const y = e.clientY - 15;
        
        tooltipEl.style.left = `${x}px`;
        tooltipEl.style.top = `${y}px`;
        tooltipEl.style.transform = 'translate(-50%, -100%)';
    });

    el.addEventListener('mouseleave', () => {
        if (!tooltipEl) return;
        tooltipEl.classList.add('hidden');
    });
    
    el.style.boxShadow = "inset 0 0 0 1px rgba(255,255,255,0.15)";
}
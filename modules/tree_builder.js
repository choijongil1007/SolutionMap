
import { store } from './data_model.js';

// State to track which tree nodes are expanded
const expandedState = new Set();
let container = null;

// Icons
const ICONS = {
    chevronRight: `<svg class="w-4 h-4 text-slate-400 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg>`,
    chevronDown: `<svg class="w-4 h-4 text-slate-500 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>`,
    plus: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
    edit: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
    trash: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
    check: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    x: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`
};

export function initTreeBuilder(elementId) {
    container = document.getElementById(elementId);
    
    const addDomainBtn = document.getElementById('btn-add-domain');
    if (addDomainBtn) {
        const newBtn = addDomainBtn.cloneNode(true);
        addDomainBtn.parentNode.replaceChild(newBtn, addDomainBtn);
        newBtn.addEventListener('click', handleAddDomain);
    }

    store.subscribe((data) => {
        render(data);
    });
}

function handleAddDomain() {
    // Keep prompt for Domain (Root level) as requested, or can be inline too. 
    // User specifically asked for Category and Solution to be inline.
    // Let's keep domain simple for now as it adds a big block.
    const name = prompt("새로운 대분류 이름을 입력하세요:");
    if (name && name.trim()) {
        const success = store.addDomain(name.trim());
        if (!success) alert("이미 존재하는 대분류입니다.");
        else expandedState.add(`d-${name.trim()}`);
    }
}

function render(data) {
    if (!container) return;
    
    // Save current scroll position
    const scrollTop = container.scrollTop;

    container.innerHTML = '';
    const domainKeys = Object.keys(data);

    if (domainKeys.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-40 text-slate-400">
                <p class="text-sm">데이터가 없습니다.</p>
                <p class="text-xs mt-1">'대분류 추가' 버튼을 눌러 시작하세요.</p>
            </div>`;
        return;
    }

    domainKeys.forEach(domainName => {
        const categories = data[domainName];
        const isExpanded = expandedState.has(`d-${domainName}`);
        
        // 1. Domain Wrapper
        const domainEl = document.createElement('div');
        domainEl.className = "bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm transition-all mb-3";
        domainEl.dataset.domainName = domainName; // Identity for logic
        
        // 2. Domain Header
        const header = document.createElement('div');
        header.className = `p-3 flex items-center justify-between cursor-pointer select-none transition-colors ${isExpanded ? 'bg-slate-50 border-b border-slate-100' : 'bg-white hover:bg-slate-50'}`;
        
        // Domain Title Area
        const titleArea = document.createElement('div');
        titleArea.className = "flex items-center gap-2 flex-1";
        titleArea.innerHTML = `
            <span class="p-1 rounded-md hover:bg-slate-200 transition-colors">${isExpanded ? ICONS.chevronDown : ICONS.chevronRight}</span>
            <span class="font-bold text-slate-800 text-sm tracking-tight domain-title-text">${escapeHtml(domainName)}</span>
        `;
        // Toggle expand on click
        titleArea.addEventListener('click', () => toggleExpand(`d-${domainName}`));

        // Action Buttons
        const actionsArea = document.createElement('div');
        actionsArea.className = "flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity";
        
        const btnAdd = createActionButton(ICONS.plus, 'text-slate-600', '중분류 추가');
        btnAdd.onclick = (e) => { e.stopPropagation(); showAddCategoryInput(domainName); };
        
        const btnEdit = createActionButton(ICONS.edit, 'text-blue-600', '이름 수정');
        btnEdit.onclick = (e) => { e.stopPropagation(); showEditDomainInput(domainName, header); };

        const btnDel = createActionButton(ICONS.trash, 'text-red-500', '삭제');
        btnDel.onclick = (e) => { e.stopPropagation(); deleteDomain(domainName); };

        actionsArea.append(btnAdd, btnEdit, btnDel);

        header.appendChild(titleArea);
        header.appendChild(actionsArea);
        header.classList.add('group');
        domainEl.appendChild(header);

        // 3. Domain Body (Categories)
        if (isExpanded) {
            const catContainer = document.createElement('div');
            catContainer.className = "p-2 bg-slate-50/50 space-y-1";
            catContainer.dataset.domainContent = domainName; // Target for appending inputs

            const catKeys = Object.keys(categories);
            
            // Existing Categories
            catKeys.forEach(catName => {
                const solutions = categories[catName];
                const isCatExpanded = expandedState.has(`c-${domainName}-${catName}`);

                const catEl = document.createElement('div');
                catEl.className = "rounded-md border border-transparent hover:border-slate-200 hover:bg-white transition-all";
                catEl.dataset.catName = catName;

                // Category Header
                const catHeader = document.createElement('div');
                catHeader.className = "flex items-center justify-between py-1.5 px-2 group/cat cursor-pointer select-none";
                
                // Cat Title
                const catTitleArea = document.createElement('div');
                catTitleArea.className = "flex items-center gap-2 flex-1 pl-2";
                catTitleArea.innerHTML = `
                    <span class="text-slate-400">${isCatExpanded ? ICONS.chevronDown : ICONS.chevronRight}</span>
                    <span class="text-sm font-semibold text-slate-700 cat-title-text">${escapeHtml(catName)}</span>
                `;
                catTitleArea.addEventListener('click', () => toggleExpand(`c-${domainName}-${catName}`));

                // Cat Actions
                const catActions = document.createElement('div');
                catActions.className = "flex items-center gap-1 opacity-0 group-hover/cat:opacity-100 transition-opacity";

                const cBtnAdd = createActionButton(ICONS.plus, 'text-slate-500', '솔루션 추가');
                cBtnAdd.onclick = (e) => { e.stopPropagation(); showAddSolutionInput(domainName, catName); };

                const cBtnEdit = createActionButton(ICONS.edit, 'text-blue-500', '이름 수정');
                cBtnEdit.onclick = (e) => { e.stopPropagation(); showEditCategoryInput(domainName, catName, catHeader); };

                const cBtnDel = createActionButton(ICONS.trash, 'text-red-500', '삭제');
                cBtnDel.onclick = (e) => { e.stopPropagation(); deleteCategory(domainName, catName); };

                catActions.append(cBtnAdd, cBtnEdit, cBtnDel);
                
                catHeader.appendChild(catTitleArea);
                catHeader.appendChild(catActions);
                catEl.appendChild(catHeader);

                // Solutions List
                if (isCatExpanded) {
                    const solContainer = document.createElement('div');
                    solContainer.className = "pl-9 pr-2 pb-2 space-y-1";
                    solContainer.dataset.solutionContent = `${domainName}-${catName}`; // Target for appending inputs

                    solutions.forEach((sol, idx) => {
                        const solEl = document.createElement('div');
                        solEl.className = "flex items-center justify-between group/sol py-1.5 px-2 bg-white border border-slate-100 rounded shadow-sm hover:border-blue-200 transition-colors";
                        
                        const solContent = document.createElement('div');
                        solContent.className = "flex items-center gap-2 text-sm text-slate-600 w-full overflow-hidden mr-2";
                        solContent.innerHTML = `
                            <span class="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                            <span class="truncate font-medium">${escapeHtml(sol.name)}</span>
                            <span class="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-mono shrink-0 ml-auto border border-slate-200">${sol.share}%</span>
                        `;

                        const solActions = document.createElement('div');
                        solActions.className = "flex items-center opacity-0 group-hover/sol:opacity-100 transition-opacity shrink-0";
                        
                        const sBtnEdit = createActionButton(ICONS.edit, 'text-blue-400', '수정');
                        sBtnEdit.onclick = () => showEditSolutionInput(domainName, catName, idx, sol, solEl);
                        
                        const sBtnDel = createActionButton(ICONS.trash, 'text-red-400', '삭제');
                        sBtnDel.onclick = () => deleteSolution(domainName, catName, idx);

                        solActions.append(sBtnEdit, sBtnDel);
                        
                        solEl.appendChild(solContent);
                        solEl.appendChild(solActions);
                        solContainer.appendChild(solEl);
                    });

                    catEl.appendChild(solContainer);
                }
                catContainer.appendChild(catEl);
            });
            domainEl.appendChild(catContainer);
        }
        container.appendChild(domainEl);
    });
    
    // Restore scroll
    container.scrollTop = scrollTop;
}

// --- Inline Input Logic ---

function showAddCategoryInput(domainName) {
    // 1. Ensure domain is expanded
    if (!expandedState.has(`d-${domainName}`)) {
        expandedState.add(`d-${domainName}`);
        render(store.getData());
    }

    // 2. Find the container
    const contentBox = document.querySelector(`[data-domain-content="${domainName}"]`);
    if (!contentBox) return;

    // 3. Remove existing temp inputs
    removeTempInputs();

    // 4. Create Input Row
    const row = document.createElement('div');
    row.className = "temp-input-row flex items-center gap-2 p-2 pl-4 bg-white border border-blue-300 rounded-md shadow-sm animate-in fade-in zoom-in-95 duration-200";
    
    const input = document.createElement('input');
    input.type = "text";
    input.className = "flex-1 text-sm border-none outline-none bg-transparent placeholder-slate-400 font-medium";
    input.placeholder = "중분류 이름 입력...";
    
    // Buttons
    const btnSave = createMiniButton(ICONS.check, "text-green-600 hover:bg-green-50");
    const btnCancel = createMiniButton(ICONS.x, "text-red-500 hover:bg-red-50");

    const save = () => {
        const val = input.value.trim();
        if (val) {
            if (store.addCategory(domainName, val)) {
                // Success
            } else {
                alert("이미 존재하는 이름입니다.");
            }
        }
    };

    const cancel = () => {
        row.remove();
    };

    btnSave.onclick = save;
    btnCancel.onclick = cancel;

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') save();
        if (e.key === 'Escape') cancel();
    });

    row.append(input, btnSave, btnCancel);
    contentBox.appendChild(row);
    input.focus();
}

function showAddSolutionInput(domainName, categoryName) {
    // 1. Ensure category is expanded
    const key = `c-${domainName}-${categoryName}`;
    if (!expandedState.has(key)) {
        expandedState.add(key);
        render(store.getData());
    }

    // 2. Find container
    const contentBox = document.querySelector(`[data-solution-content="${domainName}-${categoryName}"]`);
    if (!contentBox) return;

    removeTempInputs();

    // 3. Create Input Row
    const row = document.createElement('div');
    row.className = "temp-input-row flex items-center gap-2 py-1.5 px-2 bg-blue-50/50 border border-blue-300 rounded-md shadow-sm";
    
    // Name Input
    const nameInput = document.createElement('input');
    nameInput.type = "text";
    nameInput.className = "flex-1 text-sm border border-slate-300 rounded px-2 py-1 focus:border-blue-500 outline-none";
    nameInput.placeholder = "솔루션명";

    // Share Input
    const shareInput = document.createElement('input');
    shareInput.type = "number";
    shareInput.className = "w-16 text-sm border border-slate-300 rounded px-2 py-1 focus:border-blue-500 outline-none text-right";
    shareInput.placeholder = "%";
    shareInput.value = "10";

    const btnSave = createMiniButton(ICONS.check, "text-green-600 hover:bg-green-50");
    const btnCancel = createMiniButton(ICONS.x, "text-red-500 hover:bg-red-50");

    const save = () => {
        const name = nameInput.value.trim();
        const share = parseFloat(shareInput.value);

        if (!name) {
            nameInput.focus();
            return;
        }
        if (isNaN(share) || share < 0) {
            alert("유효한 숫자를 입력하세요.");
            shareInput.focus();
            return;
        }

        if (store.addSolution(domainName, categoryName, name, share)) {
            // Success
        } else {
            alert("이미 존재하는 솔루션입니다.");
        }
    };

    btnSave.onclick = save;
    btnCancel.onclick = () => row.remove();

    const onEnter = (e) => {
        if (e.key === 'Enter') save();
        if (e.key === 'Escape') row.remove();
    };

    nameInput.addEventListener('keydown', onEnter);
    shareInput.addEventListener('keydown', onEnter);

    row.append(nameInput, shareInput, btnSave, btnCancel);
    contentBox.appendChild(row);
    nameInput.focus();
}

// Edit Mode - Inline Replacement
function showEditCategoryInput(domain, oldName, headerEl) {
    const titleEl = headerEl.querySelector('.cat-title-text');
    const originalText = titleEl.innerText;
    
    // Replace title with input
    titleEl.innerHTML = '';
    
    const input = document.createElement('input');
    input.value = originalText;
    input.className = "text-sm font-semibold text-slate-700 bg-white border border-blue-400 rounded px-1 outline-none w-full";
    input.onclick = (e) => e.stopPropagation(); // Prevent toggle expand
    
    const save = () => {
        const newVal = input.value.trim();
        if (newVal && newVal !== originalText) {
             store.renameCategory(domain, originalText, newVal);
        } else {
            // Revert
            titleEl.innerText = originalText;
        }
    };

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            save();
            e.stopPropagation(); // Prevent toggle
        }
        if (e.key === 'Escape') {
            titleEl.innerText = originalText;
            e.stopPropagation();
        }
    });

    input.addEventListener('blur', save);

    titleEl.appendChild(input);
    input.focus();
}

function showEditDomainInput(domain, headerEl) {
    const titleEl = headerEl.querySelector('.domain-title-text');
    const originalText = titleEl.innerText;
    
    titleEl.innerHTML = '';
    const input = document.createElement('input');
    input.value = originalText;
    input.className = "font-bold text-slate-800 text-sm bg-white border border-blue-400 rounded px-1 outline-none w-full";
    input.onclick = (e) => e.stopPropagation();

    const save = () => {
        const newVal = input.value.trim();
        if (newVal && newVal !== originalText) {
             store.renameDomain(originalText, newVal);
        } else {
            titleEl.innerText = originalText;
        }
    };

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') save();
        if (e.key === 'Escape') titleEl.innerText = originalText;
    });
    input.addEventListener('blur', save);

    titleEl.appendChild(input);
    input.focus();
}

function showEditSolutionInput(domain, category, index, solData, rowEl) {
    // Replace entire row content
    rowEl.innerHTML = '';
    rowEl.className = "flex items-center gap-2 py-1.5 px-2 bg-blue-50 border border-blue-300 rounded shadow-sm";

    const nameInput = document.createElement('input');
    nameInput.value = solData.name;
    nameInput.className = "flex-1 text-sm border border-slate-300 rounded px-2 py-1 focus:border-blue-500 outline-none";

    const shareInput = document.createElement('input');
    shareInput.value = solData.share;
    shareInput.type = "number";
    shareInput.className = "w-16 text-sm border border-slate-300 rounded px-2 py-1 focus:border-blue-500 outline-none text-right";

    const btnSave = createMiniButton(ICONS.check, "text-green-600 hover:bg-green-50");
    const btnCancel = createMiniButton(ICONS.x, "text-red-500 hover:bg-red-50");

    const save = () => {
        const newName = nameInput.value.trim();
        const newShare = parseFloat(shareInput.value);

        if (newName && !isNaN(newShare) && newShare >= 0) {
            store.updateSolution(domain, category, index, newName, newShare);
        } else {
            // If invalid, revert by re-rendering via store (or we could just cancel)
            render(store.getData());
        }
    };

    btnSave.onclick = save;
    btnCancel.onclick = () => render(store.getData()); // Revert

    const onEnter = (e) => {
        if (e.key === 'Enter') save();
        if (e.key === 'Escape') render(store.getData());
    };

    nameInput.addEventListener('keydown', onEnter);
    shareInput.addEventListener('keydown', onEnter);

    rowEl.append(nameInput, shareInput, btnSave, btnCancel);
    nameInput.focus();
}

// --- Utils ---

function removeTempInputs() {
    document.querySelectorAll('.temp-input-row').forEach(el => el.remove());
}

function createActionButton(iconHtml, colorClass, title) {
    const btn = document.createElement('button');
    btn.innerHTML = iconHtml;
    btn.className = `p-1.5 hover:bg-slate-100 rounded-md transition-colors ${colorClass}`;
    btn.title = title;
    return btn;
}

function createMiniButton(iconHtml, colorClass) {
    const btn = document.createElement('button');
    btn.innerHTML = iconHtml;
    btn.className = `p-1 rounded transition-colors ${colorClass}`;
    return btn;
}

function toggleExpand(key) {
    if (expandedState.has(key)) {
        expandedState.delete(key);
    } else {
        expandedState.add(key);
    }
    render(store.getData());
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function deleteDomain(name) {
    if (confirm(`'${name}' 대분류를 정말 삭제하시겠습니까?`)) {
        store.deleteDomain(name);
    }
}

function deleteCategory(domain, name) {
    if (confirm(`'${name}' 중분류를 삭제하시겠습니까?`)) {
        store.deleteCategory(domain, name);
    }
}

function deleteSolution(domain, category, index) {
    if (confirm("이 솔루션을 삭제하시겠습니까?")) {
        store.deleteSolution(domain, category, index);
    }
}

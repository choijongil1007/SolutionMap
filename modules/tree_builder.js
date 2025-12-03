import { store } from './data_model.js';

// State to track which tree nodes are expanded
const expandedState = new Set();
let container = null;

// Icons as SVG strings
const ICONS = {
    chevronRight: `<svg class="w-4 h-4 text-slate-400 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg>`,
    chevronDown: `<svg class="w-4 h-4 text-slate-500 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>`,
    plus: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
    edit: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
    trash: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`
};

export function initTreeBuilder(elementId) {
    container = document.getElementById(elementId);
    
    // Bind global 'Add Domain' button
    const addDomainBtn = document.getElementById('btn-add-domain');
    if (addDomainBtn) {
        // Remove existing listener if any (clean re-init) to prevent duplicates
        const newBtn = addDomainBtn.cloneNode(true);
        addDomainBtn.parentNode.replaceChild(newBtn, addDomainBtn);
        newBtn.addEventListener('click', handleAddDomain);
    }

    // Subscribe to store
    store.subscribe((data) => {
        render(data);
    });
}

function handleAddDomain() {
    const name = prompt("새로운 대분류 이름을 입력하세요:");
    if (name && name.trim()) {
        const success = store.addDomain(name.trim());
        if (!success) alert("이미 존재하는 대분류입니다.");
        else expandedState.add(`d-${name.trim()}`);
    }
}

function render(data) {
    if (!container) return;
    
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
        
        // Domain Wrapper
        const domainEl = document.createElement('div');
        domainEl.className = "bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm transition-all hover:shadow-md";
        
        // Domain Header
        const header = document.createElement('div');
        header.className = `p-3 flex items-center justify-between cursor-pointer select-none transition-colors ${isExpanded ? 'bg-slate-50 border-b border-slate-100' : 'bg-white hover:bg-slate-50'}`;
        
        header.innerHTML = `
            <div class="flex items-center gap-2 flex-1">
                <span class="p-1 rounded-md hover:bg-slate-200 transition-colors">${isExpanded ? ICONS.chevronDown : ICONS.chevronRight}</span>
                <span class="font-bold text-slate-800 text-sm tracking-tight">${escapeHtml(domainName)}</span>
            </div>
            <div class="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <!-- Buttons injected via JS events -->
            </div>
        `;

        // Buttons Container
        const btnContainer = document.createElement('div');
        btnContainer.className = "flex items-center gap-1";
        
        // Button: Add Category
        const btnAdd = createActionButton(ICONS.plus, 'text-slate-600', '중분류 추가');
        btnAdd.onclick = (e) => { e.stopPropagation(); addCategory(domainName); };
        
        // Button: Edit Domain
        const btnEdit = createActionButton(ICONS.edit, 'text-blue-600', '이름 수정');
        btnEdit.onclick = (e) => { e.stopPropagation(); editDomain(domainName); };

        // Button: Delete Domain
        const btnDel = createActionButton(ICONS.trash, 'text-red-500', '삭제');
        btnDel.onclick = (e) => { e.stopPropagation(); deleteDomain(domainName); };

        btnContainer.append(btnAdd, btnEdit, btnDel);
        
        // Add buttons to header (replacing placeholder)
        const headerRight = header.querySelector('div:last-child');
        headerRight.className = "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"; 
        header.classList.add('group'); // Enable hover effect
        headerRight.appendChild(btnContainer);

        // Click to toggle expand
        header.firstElementChild.addEventListener('click', () => toggleExpand(`d-${domainName}`));

        domainEl.appendChild(header);

        // Domain Body (Categories)
        if (isExpanded) {
            const catContainer = document.createElement('div');
            catContainer.className = "p-2 bg-slate-50/50 space-y-1";
            
            const catKeys = Object.keys(categories);
            if (catKeys.length === 0) {
                catContainer.innerHTML = `<div class="text-xs text-slate-400 pl-9 py-2 italic">중분류를 추가해주세요.</div>`;
            }

            catKeys.forEach(catName => {
                const solutions = categories[catName];
                const isCatExpanded = expandedState.has(`c-${domainName}-${catName}`);

                const catEl = document.createElement('div');
                catEl.className = "rounded-md border border-transparent hover:border-slate-200 hover:bg-white transition-all";
                
                // Category Header
                const catHeader = document.createElement('div');
                catHeader.className = "flex items-center justify-between py-1.5 px-2 group/cat cursor-pointer select-none";
                
                catHeader.innerHTML = `
                    <div class="flex items-center gap-2 flex-1 pl-2">
                        <span class="text-slate-400">${isCatExpanded ? ICONS.chevronDown : ICONS.chevronRight}</span>
                        <span class="text-sm font-semibold text-slate-700">${escapeHtml(catName)}</span>
                    </div>
                    <div class="flex items-center gap-1 opacity-0 group-hover/cat:opacity-100 transition-opacity">
                    </div>
                `;

                // Category Buttons
                const catBtnContainer = document.createElement('div');
                catBtnContainer.className = "flex items-center gap-1";

                const cBtnAdd = createActionButton(ICONS.plus, 'text-slate-500', '솔루션 추가');
                cBtnAdd.onclick = (e) => { e.stopPropagation(); addSolution(domainName, catName); };

                const cBtnEdit = createActionButton(ICONS.edit, 'text-blue-500', '이름 수정');
                cBtnEdit.onclick = (e) => { e.stopPropagation(); editCategory(domainName, catName); };

                const cBtnDel = createActionButton(ICONS.trash, 'text-red-500', '삭제');
                cBtnDel.onclick = (e) => { e.stopPropagation(); deleteCategory(domainName, catName); };

                catBtnContainer.append(cBtnAdd, cBtnEdit, cBtnDel);
                catHeader.lastElementChild.appendChild(catBtnContainer);
                catHeader.firstElementChild.addEventListener('click', () => toggleExpand(`c-${domainName}-${catName}`));

                catEl.appendChild(catHeader);

                // Solutions List
                if (isCatExpanded) {
                    const solContainer = document.createElement('div');
                    solContainer.className = "pl-9 pr-2 pb-2 space-y-1";
                    
                    if (solutions.length === 0) {
                        solContainer.innerHTML = `<div class="text-xs text-slate-300 italic py-1">솔루션이 없습니다.</div>`;
                    }

                    solutions.forEach((sol, idx) => {
                        const solEl = document.createElement('div');
                        solEl.className = "flex items-center justify-between group/sol py-1.5 px-2 bg-white border border-slate-100 rounded shadow-sm hover:border-blue-200 transition-colors";
                        
                        solEl.innerHTML = `
                             <div class="flex items-center gap-2 text-sm text-slate-600 w-full overflow-hidden">
                                <span class="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                                <span class="truncate font-medium">${escapeHtml(sol.name)}</span>
                                <span class="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-mono shrink-0 ml-auto mr-2 border border-slate-200">${sol.share}%</span>
                            </div>
                            <div class="flex items-center gap-1 opacity-0 group-hover/sol:opacity-100 transition-opacity shrink-0">
                            </div>
                        `;

                        // Solution Buttons
                        const sBtnContainer = document.createElement('div');
                        sBtnContainer.className = "flex items-center";
                        
                        const sBtnEdit = createActionButton(ICONS.edit, 'text-blue-400', '수정');
                        sBtnEdit.onclick = () => editSolution(domainName, catName, idx, sol.name, sol.share);
                        
                        const sBtnDel = createActionButton(ICONS.trash, 'text-red-400', '삭제');
                        sBtnDel.onclick = () => deleteSolution(domainName, catName, idx);

                        sBtnContainer.append(sBtnEdit, sBtnDel);
                        solEl.lastElementChild.appendChild(sBtnContainer);

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
}

// --- Helper Functions ---

function createActionButton(iconHtml, colorClass, title) {
    const btn = document.createElement('button');
    btn.innerHTML = iconHtml;
    btn.className = `p-1.5 hover:bg-slate-100 rounded-md transition-colors ${colorClass}`;
    btn.title = title;
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

// --- Action Handlers ---

function addCategory(domain) {
    const name = prompt("새로운 중분류 이름을 입력하세요:");
    if (name && name.trim()) {
        if (!store.addCategory(domain, name.trim())) {
            alert("이미 존재하는 중분류입니다.");
        } else {
            expandedState.add(`d-${domain}`);
        }
    }
}

function editDomain(oldName) {
    const newName = prompt("대분류 이름을 수정하세요:", oldName);
    if (newName && newName.trim() && newName.trim() !== oldName) {
        if (!store.renameDomain(oldName, newName.trim())) {
            alert("이미 존재하는 이름입니다.");
        } else {
            // Update expanded state key
            if (expandedState.has(`d-${oldName}`)) {
                expandedState.delete(`d-${oldName}`);
                expandedState.add(`d-${newName.trim()}`);
            }
        }
    }
}

function deleteDomain(name) {
    if (confirm(`'${name}' 대분류를 정말 삭제하시겠습니까?\n하위 항목이 모두 삭제됩니다.`)) {
        store.deleteDomain(name);
    }
}

function editCategory(domain, oldName) {
    const newName = prompt("중분류 이름을 수정하세요:", oldName);
    if (newName && newName.trim() && newName.trim() !== oldName) {
        if (!store.renameCategory(domain, oldName, newName.trim())) {
            alert("이미 존재하는 이름입니다.");
        }
    }
}

function deleteCategory(domain, name) {
    if (confirm(`'${name}' 중분류를 삭제하시겠습니까?`)) {
        store.deleteCategory(domain, name);
    }
}

function addSolution(domain, category) {
    const name = prompt("새로운 솔루션 이름을 입력하세요:");
    if (!name || !name.trim()) return;
    
    const shareStr = prompt("점유율(%)을 입력하세요 (숫자만):", "10");
    const share = parseFloat(shareStr);
    
    if (isNaN(share) || share < 0) {
        alert("유효한 숫자를 입력해주세요.");
        return;
    }

    if (!store.addSolution(domain, category, name.trim(), share)) {
        alert("이미 존재하는 솔루션 이름입니다.");
    } else {
        expandedState.add(`c-${domain}-${category}`);
    }
}

function editSolution(domain, category, index, oldName, oldShare) {
    const newName = prompt("솔루션 이름을 수정하세요:", oldName);
    if (!newName || !newName.trim()) return;

    const newShareStr = prompt("점유율(%)을 수정하세요:", oldShare);
    const newShare = parseFloat(newShareStr);

    if (isNaN(newShare) || newShare < 0) {
        alert("유효한 숫자를 입력해주세요.");
        return;
    }

    if (!store.updateSolution(domain, category, index, newName.trim(), newShare)) {
        alert("이미 존재하는 솔루션 이름입니다.");
    }
}

function deleteSolution(domain, category, index) {
    if (confirm("이 솔루션을 삭제하시겠습니까?")) {
        store.deleteSolution(domain, category, index);
    }
}
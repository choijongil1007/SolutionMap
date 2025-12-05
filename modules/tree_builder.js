
import { store } from './data_model.js';
import { showWarningModal, showConfirmModal } from '../utils/modal.js';

// State to track which tree nodes are expanded
const expandedState = new Set();
let container = null;

// Modal Elements State
let currentDomainForModal = null;
let currentCategoryForModal = null;
let currentSolutionIndexForModal = null; // null for add, number for edit

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
        newBtn.addEventListener('click', showAddDomainInput);
    }

    // Initialize Solution Modal Events
    setupSolutionModal();

    store.subscribe((data) => {
        render(data);
    });
}

function render(data) {
    if (!container) return;
    
    // Save current scroll position
    const scrollTop = container.scrollTop;

    container.innerHTML = '';
    const domainKeys = Object.keys(data);

    if (domainKeys.length === 0) {
        // Only show empty message if no temp inputs exist
        if (document.querySelectorAll('.temp-input-row').length === 0) {
             container.innerHTML = `
                <div id="empty-msg" class="flex flex-col items-center justify-center h-48 text-slate-400">
                    <p class="text-sm font-medium">데이터가 없습니다</p>
                    <p class="text-xs mt-1 text-slate-400">'대분류 추가' 버튼을 눌러 시작하세요.</p>
                </div>`;
        }
    }

    domainKeys.forEach(domainName => {
        const categories = data[domainName];
        const isExpanded = expandedState.has(`d-${domainName}`);
        
        // 1. Domain Wrapper
        const domainEl = document.createElement('div');
        domainEl.className = "bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm transition-all mb-3 card-hover-effect";
        domainEl.dataset.domainName = domainName;
        
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
            catContainer.className = "p-2 bg-slate-50/30 space-y-1.5";
            catContainer.dataset.domainContent = domainName;

            const catKeys = Object.keys(categories);
            
            // Existing Categories
            catKeys.forEach(catName => {
                const solutions = categories[catName];
                const isCatExpanded = expandedState.has(`c-${domainName}-${catName}`);

                const catEl = document.createElement('div');
                catEl.className = "rounded-lg border border-transparent hover:border-slate-200 hover:bg-white transition-all";
                catEl.dataset.catName = catName;

                // Category Header
                const catHeader = document.createElement('div');
                catHeader.className = "flex items-center justify-between py-1.5 px-2 group/cat cursor-pointer select-none";
                
                // Cat Title
                const catTitleArea = document.createElement('div');
                catTitleArea.className = "flex items-center gap-2 flex-1 pl-1";
                catTitleArea.innerHTML = `
                    <span class="text-slate-400 scale-90">${isCatExpanded ? ICONS.chevronDown : ICONS.chevronRight}</span>
                    <span class="text-sm font-semibold text-slate-700 cat-title-text">${escapeHtml(catName)}</span>
                `;
                catTitleArea.addEventListener('click', () => toggleExpand(`c-${domainName}-${catName}`));

                // Cat Actions
                const catActions = document.createElement('div');
                catActions.className = "flex items-center gap-1 opacity-0 group-hover/cat:opacity-100 transition-opacity";

                const cBtnAdd = createActionButton(ICONS.plus, 'text-slate-500', '솔루션 추가');
                cBtnAdd.onclick = (e) => { 
                    e.stopPropagation(); 
                    // Replace inline input with Modal call
                    openSolutionModal(domainName, catName); 
                };

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
                    solContainer.className = "pl-8 pr-1 pb-2 space-y-1";
                    solContainer.dataset.solutionContent = `${domainName}-${catName}`;

                    solutions.forEach((sol, idx) => {
                        const solEl = document.createElement('div');
                        solEl.className = "flex items-center justify-between group/sol py-2 px-3 bg-white border border-slate-100 rounded-lg shadow-sm hover:border-blue-300 transition-colors";
                        
                        const solContent = document.createElement('div');
                        solContent.className = "flex items-center gap-2 text-sm text-slate-600 w-full overflow-hidden mr-2";
                        solContent.innerHTML = `
                            <span class="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                            <span class="truncate font-medium text-slate-700">${escapeHtml(sol.name)}</span>
                            <span class="text-[10px] bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full font-mono shrink-0 ml-auto border border-slate-200">${sol.share}%</span>
                        `;

                        const solActions = document.createElement('div');
                        solActions.className = "flex items-center opacity-0 group-hover/sol:opacity-100 transition-opacity shrink-0";
                        
                        const sBtnEdit = createActionButton(ICONS.edit, 'text-blue-400', '수정');
                        sBtnEdit.onclick = () => openSolutionModal(domainName, catName, sol, idx);
                        
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

// --- Solution Modal Logic ---

function setupSolutionModal() {
    const modal = document.getElementById('solution-modal');
    const cancelBtn = document.getElementById('solution-modal-cancel');
    const saveBtn = document.getElementById('solution-modal-save');
    const analyzeBtn = document.getElementById('btn-analyze-painpoints');
    const backdrop = document.getElementById('solution-modal-backdrop');

    cancelBtn.addEventListener('click', closeSolutionModal);
    backdrop.addEventListener('click', closeSolutionModal); // Close on backdrop click
    saveBtn.addEventListener('click', saveSolutionFromModal);
    analyzeBtn.addEventListener('click', fetchPainPoints);
}

function openSolutionModal(domainName, categoryName, existingSolution = null, index = null) {
    currentDomainForModal = domainName;
    currentCategoryForModal = categoryName;
    currentSolutionIndexForModal = index;

    const modal = document.getElementById('solution-modal');
    const backdrop = document.getElementById('solution-modal-backdrop');
    const panel = document.getElementById('solution-modal-panel');
    const title = document.getElementById('solution-modal-title');

    // Inputs
    const mInput = document.getElementById('sol-manufacturer');
    const nInput = document.getElementById('sol-name');
    const sInput = document.getElementById('sol-share');
    const noteInput = document.getElementById('sol-note');
    const listContainer = document.getElementById('painpoint-list');

    // Reset Inputs
    mInput.value = '';
    nInput.value = '';
    sInput.value = '10';
    noteInput.value = '';
    listContainer.innerHTML = '<p class="text-xs text-gray-500 text-center py-4">제조사와 제품명을 입력 후 \'AI 분석\' 버튼을 눌러주세요.</p>';

    if (existingSolution) {
        title.textContent = '솔루션 수정';
        mInput.value = existingSolution.manufacturer || '';
        nInput.value = existingSolution.name || '';
        sInput.value = existingSolution.share || 10;
        noteInput.value = existingSolution.note || '';
        
        // Render existing pain points if any
        if (existingSolution.painPoints && existingSolution.painPoints.length > 0) {
            renderPainPoints(existingSolution.painPoints, true); // All checked
        }
    } else {
        title.textContent = '솔루션 추가';
    }

    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        backdrop.classList.remove('opacity-0');
        panel.classList.remove('opacity-0', 'scale-95');
        panel.classList.add('opacity-100', 'scale-100');
    });
    
    if(!existingSolution) {
        mInput.focus();
    }
}

function closeSolutionModal() {
    const modal = document.getElementById('solution-modal');
    const backdrop = document.getElementById('solution-modal-backdrop');
    const panel = document.getElementById('solution-modal-panel');

    backdrop.classList.add('opacity-0');
    panel.classList.remove('opacity-100', 'scale-100');
    panel.classList.add('opacity-0', 'scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 200);

    // Reset state
    currentDomainForModal = null;
    currentCategoryForModal = null;
    currentSolutionIndexForModal = null;
}

async function fetchPainPoints() {
    const manufacturer = document.getElementById('sol-manufacturer').value.trim();
    const product = document.getElementById('sol-name').value.trim();
    const listContainer = document.getElementById('painpoint-list');
    const loader = document.getElementById('painpoint-loading');

    if (!manufacturer || !product) {
        showWarningModal("제조사와 제품명을 모두 입력해주세요.");
        return;
    }

    // UI Loading State
    listContainer.innerHTML = '';
    loader.classList.remove('hidden');

    try {
        const prompt = `List 5 to 8 common customer pain points for the software product "${manufacturer} ${product}" in Korean. Provide the answer as a plain text list, one item per line. Do not use numbering or markdown.`;
        
        const GAS_URL = "https://script.google.com/macros/s/AKfycbzcdRKb5yBKr5bu9uvGt28KTQqUkPsAR80GwbURPzFeOmaRY2_i1lA4Kk_GsuNpBZuVRA/exec";
        
        // Switch to POST using URLSearchParams for "Simple Request" (No CORS preflight)
        const response = await fetch(GAS_URL, {
            method: 'POST',
            body: new URLSearchParams({
                'q': prompt,
                'prompt': prompt
            })
        });

        if (!response.ok) throw new Error(`API Request Failed: ${response.status}`);
        
        const responseText = await response.text();
        let rawContent = responseText;

        // Try to parse as JSON (Gemini API format) in case GAS returns full JSON response
        try {
            const json = JSON.parse(responseText);
            if (json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts) {
                // Extract the actual text content from Gemini JSON structure
                rawContent = json.candidates[0].content.parts[0].text;
            }
        } catch (e) {
            // Not valid JSON or different structure, treat as plain text
        }
        
        // Parse: Split by newlines, filter empty or short lines
        const painPoints = rawContent.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => line.replace(/^[-*•\d\.]+\s*/, '')); // Remove bullets/numbers

        if (painPoints.length === 0) {
             listContainer.innerHTML = '<p class="text-xs text-red-400 text-center py-4">결과를 가져올 수 없습니다. 직접 입력해주세요.</p>';
        } else {
             renderPainPoints(painPoints, false);
        }

    } catch (error) {
        console.error("PainPoint Fetch Error:", error);
        let msg = "분석 중 오류가 발생했습니다.";
        // Handle the specific error message the user reported
        if (error.message && error.message.includes("message port closed")) {
            msg = "브라우저 연결 오류입니다. 다시 시도해주세요.";
        }
        listContainer.innerHTML = `<p class="text-xs text-red-400 text-center py-4">${msg}</p>`;
    } finally {
        loader.classList.add('hidden');
    }
}

function renderPainPoints(points, preChecked = false) {
    const listContainer = document.getElementById('painpoint-list');
    listContainer.innerHTML = '';

    points.forEach((point) => {
        const div = document.createElement('div');
        
        // 초기 상태 설정
        const isSelected = preChecked;

        // Dark Theme Styles
        // Unselected: Dark background, Gray border, Gray text
        const unselectedClass = "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500 hover:bg-gray-700";
        // Selected: Blue tint background, Blue border, Blue/White text
        const selectedClass = "border-blue-500 bg-blue-900/30 text-blue-100 shadow-sm ring-1 ring-blue-500/30";

        const baseClass = "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 select-none group mb-2";

        // 상태 적용
        div.className = `${baseClass} ${isSelected ? selectedClass : unselectedClass}`;
        div.dataset.value = point;
        div.dataset.selected = isSelected ? "true" : "false";

        // 아이콘 (체크 표시)
        const icon = document.createElement('div');
        const iconSelected = "border-blue-500 bg-blue-500 text-white";
        const iconUnselected = "border-gray-600 bg-gray-800 text-transparent group-hover:border-gray-500";
        
        icon.className = `w-5 h-5 mt-0.5 rounded-full border flex items-center justify-center transition-colors shrink-0 ${isSelected ? iconSelected : iconUnselected}`;
        icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

        // 텍스트
        const text = document.createElement('span');
        text.className = "text-sm flex-1 leading-relaxed font-medium";
        text.textContent = point;

        // 클릭 이벤트 핸들러
        div.onclick = () => {
            const currentSelected = div.dataset.selected === "true";
            const newSelected = !currentSelected;
            
            div.dataset.selected = newSelected ? "true" : "false";
            
            if (newSelected) {
                div.className = `${baseClass} ${selectedClass}`;
                icon.className = `w-5 h-5 mt-0.5 rounded-full border flex items-center justify-center transition-colors shrink-0 ${iconSelected}`;
            } else {
                div.className = `${baseClass} ${unselectedClass}`;
                icon.className = `w-5 h-5 mt-0.5 rounded-full border flex items-center justify-center transition-colors shrink-0 ${iconUnselected}`;
            }
        };

        div.appendChild(icon);
        div.appendChild(text);
        listContainer.appendChild(div);
    });
}

function saveSolutionFromModal() {
    const mInput = document.getElementById('sol-manufacturer');
    const nInput = document.getElementById('sol-name');
    const sInput = document.getElementById('sol-share');
    const noteInput = document.getElementById('sol-note');
    const listContainer = document.getElementById('painpoint-list');

    const manufacturer = mInput.value.trim();
    const name = nInput.value.trim();
    const share = parseFloat(sInput.value);
    const note = noteInput.value.trim();

    // Collect checked pain points
    const checkedPainPoints = [];
    listContainer.querySelectorAll('div[data-selected="true"]').forEach(div => {
        checkedPainPoints.push(div.dataset.value);
    });

    if (!name) {
        showWarningModal("제품명을 입력해주세요.");
        return;
    }
    if (isNaN(share) || share < 0) {
        showWarningModal("유효한 점유율(%)을 입력해주세요.");
        return;
    }

    let result;
    if (currentSolutionIndexForModal !== null) {
        // Edit
        result = store.updateSolution(
            currentDomainForModal,
            currentCategoryForModal,
            currentSolutionIndexForModal,
            name,
            share,
            manufacturer,
            checkedPainPoints,
            note
        );
    } else {
        // Add
        result = store.addSolution(
            currentDomainForModal,
            currentCategoryForModal,
            name,
            share,
            manufacturer,
            checkedPainPoints,
            note
        );
    }

    if (result === 'SUCCESS') {
        closeSolutionModal();
    } else if (result === 'OVERFLOW') {
        showWarningModal("솔루션 점유율의 합계는 100%를 초과할 수 없습니다.");
    } else if (result === 'DUPLICATE') {
        showWarningModal("이미 존재하는 솔루션 이름입니다.");
    } else {
        showWarningModal("저장에 실패했습니다.");
    }
}

// --- Inline Input Logic (Only Domain/Category remain inline) ---

function showAddDomainInput() {
    if (!container) return;
    removeTempInputs();

    // Remove empty msg if present
    const emptyMsg = document.getElementById('empty-msg');
    if (emptyMsg) emptyMsg.remove();

    // Create a row that mimics a Domain Header
    const row = document.createElement('div');
    row.className = "temp-input-row bg-white border border-blue-400 rounded-xl p-3 flex items-center gap-2 mb-3 shadow-sm input-slide-down";

    const input = document.createElement('input');
    input.type = "text";
    input.className = "input-premium flex-1";
    input.placeholder = "새 대분류 이름...";
    
    const btnSave = createMiniButton(ICONS.check, "text-green-600 hover:bg-green-50");
    const btnCancel = createMiniButton(ICONS.x, "text-red-500 hover:bg-red-50");

    const save = () => {
        const val = input.value.trim();
        if (val) {
            if (store.addDomain(val)) {
                expandedState.add(`d-${val}`); // Auto expand
                // Force re-render to ensure UI reflects expanded state immediately
                render(store.getData());
            } else {
                showWarningModal("이미 존재하는 대분류입니다.");
                input.focus();
            }
        }
    };

    const cancel = () => {
        row.remove();
        if (Object.keys(store.getData()).length === 0) {
            render(store.getData());
        }
    };

    btnSave.onclick = save;
    btnCancel.onclick = cancel;

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') save();
        if (e.key === 'Escape') cancel();
    });

    row.append(input, btnSave, btnCancel);
    container.appendChild(row);
    input.focus();
    
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

function showAddCategoryInput(domainName) {
    if (!expandedState.has(`d-${domainName}`)) {
        expandedState.add(`d-${domainName}`);
        render(store.getData());
    }

    // Try to find the container safely
    const safeName = CSS.escape(domainName);
    let contentBox = document.querySelector(`[data-domain-content="${safeName}"]`);

    // If not found, force a re-render and try again (mitigates sync issues)
    if (!contentBox) {
        render(store.getData());
        contentBox = document.querySelector(`[data-domain-content="${safeName}"]`);
    }

    // Fallback: Manually iterate if selector fails
    if (!contentBox) {
        const allBoxes = document.querySelectorAll('[data-domain-content]');
        for (let box of allBoxes) {
            if (box.dataset.domainContent === domainName) {
                contentBox = box;
                break;
            }
        }
    }

    if (!contentBox) {
        console.error("Content box not found for domain:", domainName);
        return;
    }

    removeTempInputs();

    const row = document.createElement('div');
    row.className = "temp-input-row flex items-center gap-2 p-2 pl-4 bg-white border border-blue-300 rounded-lg shadow-sm input-slide-down";
    
    const input = document.createElement('input');
    input.type = "text";
    input.className = "input-premium flex-1";
    input.placeholder = "새 중분류 이름...";
    
    const btnSave = createMiniButton(ICONS.check, "text-green-600 hover:bg-green-50");
    const btnCancel = createMiniButton(ICONS.x, "text-red-500 hover:bg-red-50");

    const save = () => {
        const val = input.value.trim();
        if (val) {
            if (store.addCategory(domainName, val)) {
                // Success
            } else {
                showWarningModal("이미 존재하는 이름입니다.");
            }
        }
    };

    const cancel = () => row.remove();

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

function showEditCategoryInput(domain, oldName, headerEl) {
    const titleEl = headerEl.querySelector('.cat-title-text');
    const originalText = titleEl.innerText;
    
    titleEl.innerHTML = '';
    
    const input = document.createElement('input');
    input.value = originalText;
    input.className = "input-premium !py-0.5 !h-6 text-xs";
    input.onclick = (e) => e.stopPropagation();
    
    const save = () => {
        const newVal = input.value.trim();
        if (newVal && newVal !== originalText) {
             store.renameCategory(domain, originalText, newVal);
        } else {
            titleEl.innerText = originalText;
        }
    };

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            save();
            e.stopPropagation();
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
    input.className = "input-premium !py-0.5 !h-7 text-sm font-bold";
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
    btn.className = `p-1.5 rounded-md transition-colors ${colorClass}`;
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
    showConfirmModal(`'${name}' 대분류를 정말 삭제하시겠습니까?`, () => {
        store.deleteDomain(name);
    });
}

function deleteCategory(domain, name) {
    showConfirmModal(`'${name}' 중분류를 삭제하시겠습니까?`, () => {
        store.deleteCategory(domain, name);
    });
}

function deleteSolution(domain, category, index) {
    showConfirmModal("이 솔루션을 삭제하시겠습니까?", () => {
        store.deleteSolution(domain, category, index);
    });
}



import { store } from './data_model.js';
import { showWarningModal } from '../utils/modal.js';

let insightContainer = null;

// GAS Proxy URL provided
const GAS_URL = "https://script.google.com/macros/s/AKfycbzcdRKb5yBKr5bu9uvGt28KTQqUkPsAR80GwbURPzFeOmaRY2_i1lA4Kk_GsuNpBZuVRA/exec";

// Modal State
const saveModal = {
    el: document.getElementById('modal-save-report'),
    bg: document.getElementById('modal-save-report-bg'),
    panel: document.getElementById('modal-save-report-panel'),
    input: document.getElementById('input-report-name'),
    btnConfirm: document.getElementById('btn-confirm-save-report'),
    btnCancel: document.getElementById('btn-cancel-save-report')
};

// Initialize the module for Strategy View
export function initStrategyRenderer(containerId) {
    insightContainer = document.getElementById(containerId);
    if (!insightContainer) return;

    // Render Initial UI
    renderUI();

    // Setup Save Modal Events
    setupSaveModal();
}

function renderUI() {
    insightContainer.innerHTML = `
        <div class="flex flex-col h-full gap-6">
            <!-- Input Section -->
            <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h3 class="text-lg font-bold text-slate-800 mb-4">경쟁 분석 파라미터</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-sm font-semibold text-slate-600 mb-1.5">자사 제품 (필수)</label>
                        <input type="text" id="insight-our-product" class="input-premium w-full" placeholder="예: Atlassian Jira">
                        <p class="text-xs text-slate-400 mt-1">분석의 기준이 될 자사 솔루션을 입력하세요.</p>
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-slate-600 mb-1.5">경쟁사 제품 (필수)</label>
                        <input type="text" id="insight-competitor" class="input-premium w-full" placeholder="예: ServiceNow ITOM">
                        <p class="text-xs text-slate-400 mt-1">비교 분석할 경쟁 제품을 입력하세요.</p>
                    </div>
                </div>
                <div class="flex justify-end">
                    <button id="btn-generate-insight" class="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all text-sm font-bold shadow-md shadow-indigo-500/20 active:scale-95">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                        AI 경쟁 분석 실행
                    </button>
                </div>
            </div>

            <!-- Result Section -->
            <div class="flex-1 flex flex-col min-h-[400px] border border-slate-100 rounded-xl bg-white shadow-inner overflow-hidden relative" id="insight-result-container">
                <div class="absolute inset-0 overflow-y-auto p-8" id="insight-scroll-area">
                    <div id="insight-placeholder" class="flex flex-col items-center justify-center h-full text-slate-400">
                        <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
                        </div>
                        <p class="font-medium text-slate-500">분석 결과가 여기에 표시됩니다</p>
                    </div>
                    
                    <div id="insight-content" class="hidden report-content pb-20"></div>
                </div>

                <div id="insight-loading" class="hidden absolute inset-0 bg-white/90 flex flex-col items-center justify-center z-10">
                    <div class="spinner border-indigo-600 border-t-transparent w-10 h-10 mb-3"></div>
                    <p class="text-indigo-600 font-bold animate-pulse">Gemini가 아키텍처 호환성 및 경쟁 우위를 분석 중입니다...</p>
                </div>

                <!-- Save Button Overlay -->
                <div id="insight-action-bar" class="hidden absolute bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-sm border-t border-slate-200 flex justify-end">
                    <button id="btn-save-as-report" class="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-lg font-bold text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                        보고서로 저장
                    </button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('btn-generate-insight').addEventListener('click', generateInsight);
    document.getElementById('btn-save-as-report').addEventListener('click', openSaveReportModal);
}

// --- Save Report Logic ---

function setupSaveModal() {
    saveModal.btnCancel.onclick = closeSaveReportModal;
    saveModal.btnConfirm.onclick = () => {
        const title = saveModal.input.value.trim();
        const content = document.getElementById('insight-content').innerHTML;
        const customer = store.getCurrentCustomer();
        
        if (title && content && customer) {
            store.addReport(customer.id, title, content);
            showWarningModal("보고서가 저장되었습니다.");
            closeSaveReportModal();
        }
    };
}

function openSaveReportModal() {
    const ourProduct = document.getElementById('insight-our-product').value.trim();
    const competitor = document.getElementById('insight-competitor').value.trim();
    
    saveModal.input.value = `${ourProduct} vs ${competitor} 경쟁분석`;
    
    saveModal.el.classList.remove('hidden');
    requestAnimationFrame(() => {
        saveModal.bg.classList.remove('opacity-0');
        saveModal.panel.classList.remove('scale-95', 'opacity-0');
        saveModal.panel.classList.add('scale-100', 'opacity-100');
    });
    saveModal.input.focus();
}

function closeSaveReportModal() {
    saveModal.bg.classList.add('opacity-0');
    saveModal.panel.classList.add('scale-95', 'opacity-0');
    setTimeout(() => saveModal.el.classList.add('hidden'), 200);
}

// --- Analysis Logic ---

async function generateInsight() {
    const competitor = document.getElementById('insight-competitor').value.trim();
    const ourProduct = document.getElementById('insight-our-product').value.trim();
    const resultArea = document.getElementById('insight-content');
    const placeholder = document.getElementById('insight-placeholder');
    const loading = document.getElementById('insight-loading');
    const actionBar = document.getElementById('insight-action-bar');

    if (!competitor || !ourProduct) {
        showWarningModal("자사 제품과 경쟁사 제품명을 모두 입력해주세요.");
        return;
    }

    // UI Loading State
    placeholder.classList.add('hidden');
    resultArea.classList.add('hidden');
    actionBar.classList.add('hidden');
    loading.classList.remove('hidden');
    resultArea.innerHTML = '';

    const currentMapContext = store.getSolutionContextString();
    
    const mapData = store.getData();
    const categoriesSet = new Set();
    Object.values(mapData).forEach(domainCats => {
        Object.keys(domainCats).forEach(cat => categoriesSet.add(cat));
    });
    const categoryListArray = Array.from(categoriesSet);
    const categoryListString = categoryListArray.length > 0 
        ? categoryListArray.join(', ') 
        : "주요 시스템(DB, API, 보안 등)";

    // Prompt (Same as before)
    let prompt = `
You are an expert Solution Architect.
Perform a detailed competitive analysis comparing "**${ourProduct}**" (Our Product) and "**${competitor}**" (Competitor Product) within the context of the customer's current environment.

**Customer's Current Architecture:**
${currentMapContext}

**Reference Categories for Analysis:**
${categoryListString}

**Requirements:**
- Output specifically in **Korean**.
- **Important**: In the HTML sections, **DO NOT** use Markdown bold syntax (like \`**text**\`). Use \`<b>\` tags or CSS classes instead.
- **Important**: Font sizes for HTML content must be \`text-base\`.

**Report Structure:**

1.  **## 1. 요약**
    - Brief executive summary favoring Our Product.

2.  **## 2. 아키텍처 통합성**
    - **Format**: HTML Block.
    - **Layout**: Vertical Stack (\`flex flex-col gap-6\`).
    - **Card 1 (${ourProduct})**: Blue theme (\`bg-blue-50/50 border-blue-200\`).
    - **Card 2 (${competitor})**: Slate theme (\`bg-slate-50/50 border-slate-200\`).
    - **Content Logic**: Bulleted list (\`<ul class="list-disc pl-5 space-y-1 text-base text-slate-700">\`).
    - **CRITICAL**: The list items MUST correspond to the **Reference Categories** listed above (e.g., "Integration with [Category Name]").
    - **Sub-section: 통합 편의성 요약**
        - Create an HTML Table **immediately after the cards**.
        - Style: \`w-full mt-6 text-base border-collapse text-center table-fixed\`.
        - Title: \`<h4 class="text-lg font-bold text-slate-700 mb-3 text-center">통합 편의성 비교</h4>\`
        - Headers: [구분 | ${ourProduct} | ${competitor}].
        - Rows: **Generate a row for each category in [${categoryListString}]**.
        - Cell Values: **O** (Good), **△** (Fair), **X** (Poor). Center align.

3.  **## 3. 상세 비교표**
    - **Format**: Markdown Table.
    - Columns: [구분 | ${ourProduct} (자사) | ${competitor} (경쟁사) | 비고].
    - Rows: 연동성, 기능 적합성, 성능, 리스크.

4.  **## 4. 핵심 차별화 요소**
    - **Format**: HTML Block.
    - **Layout**: Vertical Stack.
    - Create 3 Cards.
    - Card Style: \`border border-indigo-100 bg-white shadow-sm rounded-xl p-5 hover:shadow-md transition-all\`.
    - Title Style: \`text-indigo-600 font-bold mb-2 text-base\`.
    - Text Style: \`text-base text-slate-700 leading-relaxed\`.
`;

    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({
                'q': prompt,
                'prompt': prompt
            })
        });

        if (!response.ok) {
            throw new Error(`API Request Failed: ${response.status}`);
        }

        const responseText = await response.text();
        let markdownText = responseText;

        try {
            const json = JSON.parse(responseText);
            if (json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts) {
                markdownText = json.candidates[0].content.parts[0].text;
            } else if (json.error) {
                throw new Error(json.error.message || "API Error");
            }
        } catch (e) {
            // Ignore
        }

        if (window.marked) {
            resultArea.innerHTML = window.marked.parse(markdownText);
        } else {
            resultArea.innerText = markdownText;
        }

        loading.classList.add('hidden');
        resultArea.classList.remove('hidden');
        actionBar.classList.remove('hidden');

    } catch (error) {
        console.error("Gemini Error:", error);
        loading.classList.add('hidden');
        resultArea.innerHTML = `
            <div class="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <h4 class="font-bold mb-1">분석 중 오류가 발생했습니다.</h4>
                <p class="text-sm">${error.message}</p>
            </div>
        `;
        resultArea.classList.remove('hidden');
    }
}
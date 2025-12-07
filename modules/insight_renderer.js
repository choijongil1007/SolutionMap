

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
        <div class="flex flex-col gap-6 w-full max-w-full overflow-hidden">
            <!-- Input Section -->
            <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h3 class="text-lg font-bold text-slate-800 mb-4">경쟁 분석 설정</h3>
                
                <!-- Products -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                        <label class="block text-sm font-semibold text-slate-600 mb-1.5">자사 제품 (필수)</label>
                        <input type="text" id="insight-our-product" class="input-premium w-full" placeholder="예: Atlassian Jira">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-slate-600 mb-1.5">경쟁사 제품 (필수)</label>
                        <input type="text" id="insight-competitor" class="input-premium w-full" placeholder="예: ServiceNow ITOM">
                    </div>
                </div>

                <!-- Key Requirements -->
                <div class="border-t border-slate-100 pt-5 mb-6">
                    <div class="flex justify-between items-center mb-2">
                        <label class="block text-sm font-bold text-slate-800">핵심 고객 요구사항</label>
                        <button id="btn-add-req" class="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-700 font-bold bg-blue-50 border border-blue-100 px-2.5 py-1.5 rounded-lg transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            추가
                        </button>
                    </div>
                    <p class="text-xs text-slate-400 mb-3">고객이 중요하게 생각하는 기능이나 요건을 입력하세요.</p>
                    <div id="req-input-container" class="space-y-2.5">
                        <!-- Inputs injected by JS -->
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
            <div class="flex flex-col min-h-[400px] border border-slate-100 rounded-xl bg-white shadow-inner relative w-full overflow-hidden" id="insight-result-container">
                
                <!-- Content Area: Static position to flow naturally. Added padding bottom for the action bar -->
                <div class="p-8 pb-24 w-full overflow-x-hidden" id="insight-scroll-area">
                    <div id="insight-placeholder" class="flex flex-col items-center justify-center py-20 text-slate-400">
                        <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
                        </div>
                        <p class="font-medium text-slate-500">분석 결과가 여기에 표시됩니다</p>
                    </div>
                    
                    <div id="insight-content" class="hidden report-content w-full"></div>
                </div>

                <!-- Loading Overlay: Absolute to cover the container -->
                <div id="insight-loading" class="hidden absolute inset-0 bg-white/95 flex flex-col items-center justify-center z-20 rounded-xl">
                    <div class="spinner border-indigo-600 border-t-transparent w-10 h-10 mb-3"></div>
                    <p class="text-indigo-600 font-bold animate-pulse">고객 요구사항 기반 경쟁 분석 중...</p>
                </div>

                <!-- Save Button Overlay: Absolute bottom -->
                <div id="insight-action-bar" class="hidden absolute bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-sm border-t border-slate-200 flex justify-end z-10 rounded-b-xl">
                    <button id="btn-save-as-report" class="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-lg font-bold text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                        보고서로 저장
                    </button>
                </div>
            </div>
        </div>
    `;

    // Initial Inputs (3 items)
    addRequirementInput("요구사항 1 (예: 기존 사내 SSO 시스템 연동 필수)");
    addRequirementInput("요구사항 2 (예: 모바일 앱 지원)");
    addRequirementInput("요구사항 3");

    // Event Listeners
    document.getElementById('btn-add-req').addEventListener('click', () => {
        const count = document.querySelectorAll('.req-input').length + 1;
        addRequirementInput(`요구사항 ${count}`);
    });

    document.getElementById('btn-generate-insight').addEventListener('click', generateInsight);
    document.getElementById('btn-save-as-report').addEventListener('click', openSaveReportModal);
}

function addRequirementInput(placeholderText) {
    const container = document.getElementById('req-input-container');
    const inputWrapper = document.createElement('div');
    inputWrapper.className = "flex items-center gap-2";
    
    const input = document.createElement('input');
    input.type = "text";
    input.className = "input-premium w-full req-input";
    input.placeholder = placeholderText || "추가 요구사항";
    
    // Delete button (only for 4th item onwards or just allow deleting any)
    const btnDel = document.createElement('button');
    btnDel.className = "p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors";
    btnDel.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    btnDel.onclick = () => {
        inputWrapper.remove();
    };

    inputWrapper.appendChild(input);
    inputWrapper.appendChild(btnDel);
    container.appendChild(inputWrapper);
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
    
    // Get Requirements (Dynamic)
    const reqInputs = document.querySelectorAll('.req-input');
    const requirements = Array.from(reqInputs).map(input => input.value.trim()).filter(val => val !== "");
    
    const requirementsString = requirements.length > 0 
        ? requirements.map((r, i) => `${i+1}. ${r}`).join('\n') 
        : "None specified.";

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

    // Prompt - UPDATED STRUCTURE
    let prompt = `
You are an expert Solution Architect.
Perform a detailed competitive analysis comparing "**${ourProduct}**" (Our Product) and "**${competitor}**" (Competitor Product) within the context of the customer's current environment.

**Analysis Context (CRITICAL):**
All analysis must be strictly based on compatibility and integration with the solutions **CURRENTLY REGISTERED** in the Customer's Current Architecture provided below. 
For example, if 'RHEL' is registered in the OS area of the architecture, you must compare how well ${ourProduct} and ${competitor} integrate specifically with RHEL.
**IF A CATEGORY IS NOT PRESENT IN THE SOLUTION MAP, DO NOT INVENT DATA.** State that integration analysis is not applicable due to missing context.

**Customer's Current Architecture:**
${currentMapContext}

**Reference Categories for Analysis:**
${categoryListString}

**Key Customer Requirements (TOP PRIORITY):**
${requirementsString}

**Requirements:**
- Output specifically in **Korean**.
- **Tone**: Concise, professional. Use short noun-ending phrases.
- **Formatting**:
    - **NO MARKDOWN BOLD**: Do NOT use \`**\` characters. Use HTML \`<b>\` tags for emphasis.
    - **NO CODE BLOCKS**: Do NOT wrap HTML in \`\`\`html ... \`\`\`.
    - **Headers**: Use Markdown (\`## Title\`) for the 5 main sections.
    - **Spacing**: Ensure a blank line separates the Markdown header from the HTML content below it.
    - **Width Safety**: Ensure all container divs use \`w-full\`.

**Report Structure (5 Sections):**

1.  **## 1. 요약**
    - Brief executive summary favoring Our Product. Mention overall fit with the customer's environment.

2.  **## 2. 핵심 요구사항 만족도**
    (Leave a blank line here)
    **HTML Content Only**:
    - Create a comparison table.
    - **CRITICAL**: Wrap the table in a container to prevent overflow: \`<div class="w-full overflow-x-auto">\` ... \`</div>\`.
    - **Columns**: 구분 (Requirement), ${ourProduct} (O/△/X), ${competitor} (O/△/X), 비고 (Remark).
    - Use symbols: ⭕ (Satisfied), ⚠️ (Partial), ❌ (Not Satisfied).
    - Bold the symbols using \`<b>\`.
    - **Remark Column Formatting (STRICT)**:
        - **FORBIDDEN**: Do NOT use semicolons (;).
        - **REQUIRED**: Use \`<br>• \` (bullet) to separate multiple points.
    - Table Style: \`<table class="w-full text-left border-collapse border border-slate-200 rounded-lg overflow-hidden mb-10 min-w-[500px]">\`
    - Header Style: \`bg-slate-50 border-b border-slate-200 font-bold text-center\`
    - Row Style: \`border-b border-slate-100 hover:bg-slate-50/50\`
    - Cell Style: \`p-3 border-r border-slate-200 last:border-r-0 align-top break-words\`

3.  **## 3. 고객 환경과의 통합성**
    (Leave a blank line here)
    **HTML Content Only**:
    Wrap in \`<div class="mb-10 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">\`:
    
    - **Left Column (${ourProduct})**: 
        \`<div class="border border-blue-200 bg-blue-50/30 rounded-xl overflow-hidden shadow-sm">\`
        - Header: \`<div class="bg-blue-100/50 px-3 py-1.5 border-b border-blue-200"><h3 class="font-bold text-blue-800 text-sm truncate">${ourProduct} (자사)</h3></div>\`
        - Body: \`<div class="p-4 space-y-2">\`
            - Integration Items:
              \`<div class="flex items-start gap-2 p-2.5 bg-white rounded-lg border border-blue-100 shadow-sm">\`
                - Icon: \`<div class="shrink-0 mt-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold">✓</div>\`
                - Text: \`<div><div class="font-bold text-slate-700 text-xs mb-0.5">[Target Solution] 연동</div><div class="text-xs text-slate-600 leading-snug">[Benefit]</div></div>\`
              \`</div>\`
        \`</div>\`
    
    - **Right Column (${competitor})**: 
        \`<div class="border border-slate-200 bg-slate-50/30 rounded-xl overflow-hidden shadow-sm">\`
        - Header: \`<div class="bg-slate-100/50 px-3 py-1.5 border-b border-slate-200"><h3 class="font-bold text-slate-700 text-sm truncate">${competitor} (경쟁사)</h3></div>\`
        - Body: \`<div class="p-4 space-y-2">\`
            - Integration Items:
              \`<div class="flex items-start gap-2 p-2.5 bg-white rounded-lg border border-slate-200 shadow-sm">\`
                - Icon: \`<div class="shrink-0 mt-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">-</div>\`
                - Text: \`<div><div class="font-bold text-slate-700 text-xs mb-0.5">[Target Solution] 연동</div><div class="text-xs text-slate-600 leading-snug">[Desc]</div></div>\`
              \`</div>\`
        \`</div>\`

4.  **## 4. 핵심 메시지**
    (Leave a blank line here)
    **HTML Content Only**:
    - Wrap in \`<div class="mb-10 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">\`
    - Card Style: \`<div class="border border-indigo-100 bg-indigo-50/30 p-4 rounded-xl">\`
    - Title: \`<div class="text-indigo-700 font-bold mb-2 text-base">Key Message #</div>\`
    - Text: \`<div class="text-slate-700 text-xs leading-relaxed">...</div>\`

5.  **## 5. 대응 방안**
    (Leave a blank line here)
    **HTML Content Only**:
    - Wrap in \`<div class="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">\`
    - **Card 1: 강점 강화 (Reinforce Strengths)**
       - Style: \`<div class="border border-blue-200 bg-blue-50/30 p-5 rounded-xl">\`
       - Header: \`<div class="font-bold text-blue-800 text-base mb-3 border-b border-blue-200 pb-2">강점 강화</div>\`
       - Content: Messages to emphasize where Our Product wins. Use \`<ul class="list-disc pl-4 text-sm text-slate-700 space-y-2">\`.
    - **Card 2: 약점 보강 (Address Weaknesses)**
       - Style: \`<div class="border border-red-200 bg-red-50/30 p-5 rounded-xl">\`
       - Header: \`<div class="font-bold text-red-800 text-base mb-3 border-b border-red-200 pb-2">약점 보강</div>\`
       - Content: Activities, workarounds, or counter-messages to address gaps. Use \`<ul class="list-disc pl-4 text-sm text-slate-700 space-y-2">\`.
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

        // Improved Error Handling Logic
        try {
            const json = JSON.parse(responseText);
            
            // 1. Check for API Error explicitly
            if (json.error) {
                const code = json.error.code;
                const msg = json.error.message;
                // Propagate to outer catch with structure
                throw new Error(JSON.stringify({ code, message: msg }));
            }

            // 2. Check for successful content
            if (json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts) {
                markdownText = json.candidates[0].content.parts[0].text;
            } 
        } catch (e) {
            // If it's the specific error we threw above, re-throw it to outer catch
            try {
                const errObj = JSON.parse(e.message);
                if (errObj && errObj.code) {
                    throw e; 
                }
            } catch (inner) {
                // Not our JSON error, so it might be just a text parsing error (which is fine, we use responseText)
            }
        }

        // --- PRE-PROCESSING FIX ---
        // 1. Remove markdown code fences (```html, ```)
        // Ensure we handle case insensitivity and optional text after backticks
        markdownText = markdownText.replace(/```[a-zA-Z]*\n?/g, "").replace(/```/g, "");

        // 2. Remove indentation for HTML lines (prevents marked.js from treating them as code blocks)
        // Only strip spaces at start of lines that look like HTML tags
        markdownText = markdownText.replace(/^[ \t]+(?=<)/gm, "");
        markdownText = markdownText.replace(/^[ \t]+(?=<\/)/gm, "");

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
        
        let errorMessage = error.message;
        let errorTitle = "분석 중 오류가 발생했습니다.";

        // Handle JSON error message from inner try/catch
        try {
            const errObj = JSON.parse(error.message);
            
            // Handle 503 Overloaded or 'overloaded' message string
            if (errObj.code === 503 || errObj.status === 'UNAVAILABLE' || (typeof errObj.message === 'string' && errObj.message.includes('overloaded'))) {
                errorTitle = "AI 서비스 과부하";
                errorMessage = "현재 사용자가 많아 AI 모델 응답이 지연되고 있습니다. 잠시 후(약 30초) 다시 버튼을 눌러주세요.";
            } else if (errObj.message) {
                errorMessage = errObj.message;
            }
        } catch(e) {
            // fallback to raw message
        }

        resultArea.innerHTML = `
            <div class="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <h4 class="font-bold mb-1">${errorTitle}</h4>
                <p class="text-sm">${errorMessage}</p>
            </div>
        `;
        resultArea.classList.remove('hidden');
    }
}
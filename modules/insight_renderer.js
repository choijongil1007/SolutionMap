

import { store } from './data_model.js';

let container = null;
let tabMap = null;
let tabInsight = null;
let treemapContainer = null;
let insightContainer = null;
let emptyStateEl = null;

// GAS Proxy URL provided
const GAS_URL = "https://script.google.com/macros/s/AKfycbzcdRKb5yBKr5bu9uvGt28KTQqUkPsAR80GwbURPzFeOmaRY2_i1lA4Kk_GsuNpBZuVRA/exec";

// Initialize the module
export function initInsightRenderer(containerId, tabMapId, tabInsightId, treemapId, emptyStateId) {
    insightContainer = document.getElementById(containerId);
    tabMap = document.getElementById(tabMapId);
    tabInsight = document.getElementById(tabInsightId);
    treemapContainer = document.getElementById(treemapId);
    emptyStateEl = document.getElementById(emptyStateId);

    if (!insightContainer || !tabMap || !tabInsight) return;

    // Render Initial UI for Insight Tab
    renderUI();

    // Tab Events
    tabMap.addEventListener('click', () => switchTab('map'));
    tabInsight.addEventListener('click', () => switchTab('insight'));
}

function switchTab(mode) {
    if (mode === 'map') {
        // Tab Styles
        tabMap.classList.replace('border-transparent', 'border-blue-600');
        tabMap.classList.replace('text-slate-500', 'text-blue-600');
        
        tabInsight.classList.replace('border-blue-600', 'border-transparent');
        tabInsight.classList.replace('text-blue-600', 'text-slate-500');

        // Content Visibility
        insightContainer.classList.add('hidden');
        treemapContainer.classList.remove('hidden');
        
        // Handle Empty State Visibility
        const hasData = Object.keys(store.getData()).length > 0;
        if (!hasData) {
            emptyStateEl.classList.remove('hidden');
        } else {
            emptyStateEl.classList.add('hidden');
        }

    } else {
        // Tab Styles
        tabInsight.classList.replace('border-transparent', 'border-blue-600');
        tabInsight.classList.replace('text-slate-500', 'text-blue-600');
        
        tabMap.classList.replace('border-blue-600', 'border-transparent');
        tabMap.classList.replace('text-blue-600', 'text-slate-500');

        // Content Visibility
        treemapContainer.classList.add('hidden');
        emptyStateEl.classList.add('hidden'); // Always hide empty state in Insight view
        insightContainer.classList.remove('hidden');
    }
}

function renderUI() {
    insightContainer.innerHTML = `
        <div class="flex flex-col h-full gap-6">
            <!-- Input Section -->
            <div class="bg-slate-50 border border-slate-200 rounded-xl p-6">
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
            <div class="flex-1 min-h-[400px] border border-slate-100 rounded-xl p-8 overflow-y-auto bg-white relative shadow-inner" id="insight-result-area">
                <div id="insight-placeholder" class="flex flex-col items-center justify-center h-full text-slate-400">
                    <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
                    </div>
                    <p class="font-medium text-slate-500">분석 결과가 여기에 표시됩니다</p>
                    <p class="text-sm mt-1">자사 및 경쟁사 제품명을 모두 입력하고 분석 버튼을 눌러주세요.</p>
                </div>
                <div id="insight-loading" class="hidden absolute inset-0 bg-white/90 flex flex-col items-center justify-center z-10">
                    <div class="spinner border-indigo-600 border-t-transparent w-10 h-10 mb-3"></div>
                    <p class="text-indigo-600 font-bold animate-pulse">Gemini가 아키텍처 호환성 및 경쟁 우위를 분석 중입니다...</p>
                </div>
                <!-- Added 'report-content' class for custom styling -->
                <div id="insight-content" class="hidden report-content"></div>
            </div>
        </div>
    `;

    document.getElementById('btn-generate-insight').addEventListener('click', generateInsight);
}

async function generateInsight() {
    const competitor = document.getElementById('insight-competitor').value.trim();
    const ourProduct = document.getElementById('insight-our-product').value.trim();
    const resultArea = document.getElementById('insight-content');
    const placeholder = document.getElementById('insight-placeholder');
    const loading = document.getElementById('insight-loading');

    if (!competitor || !ourProduct) {
        alert("자사 제품과 경쟁사 제품명을 모두 입력해주세요.");
        return;
    }

    // UI Loading State
    placeholder.classList.add('hidden');
    resultArea.classList.add('hidden');
    loading.classList.remove('hidden');
    resultArea.innerHTML = '';

    const currentMapContext = store.getSolutionContextString();
    
    // Extract actual categories from the store to use as criteria
    const mapData = store.getData();
    const categoriesSet = new Set();
    Object.values(mapData).forEach(domainCats => {
        Object.keys(domainCats).forEach(cat => categoriesSet.add(cat));
    });
    // Fallback if no categories exist yet
    const categoryListArray = Array.from(categoriesSet);
    const categoryListString = categoryListArray.length > 0 
        ? categoryListArray.join(', ') 
        : "주요 시스템(DB, API, 보안 등)";

    // Construct Prompt
    let prompt = `
You are an expert Solution Architect.
Perform a detailed competitive analysis comparing "**${ourProduct}**" (Our Product) and "**${competitor}**" (Competitor Product) within the context of the customer's current environment.

**Customer's Current Architecture:**
${currentMapContext}

**Reference Categories for Analysis:**
${categoryListString}

**Requirements:**
- Output specifically in **Korean**.
- **Important**: In the HTML sections, **DO NOT** use Markdown bold syntax (like \`**text**\`). Use \`<b>\` tags or CSS classes instead to prevent rendering errors.
- **Important**: Font sizes for HTML content must be \`text-base\` (not small).

**Report Structure:**

1.  **## 1. 요약**
    - Brief executive summary favoring Our Product.

2.  **## 2. 아키텍처 통합성**
    - **Format**: HTML Block (Tailwind CSS).
    - **Layout**: Vertical Stack (\`flex flex-col gap-6\`).
    - **Card 1 (${ourProduct})**: Blue theme (\`bg-blue-50/50 border-blue-200\`).
    - **Card 2 (${competitor})**: Slate theme (\`bg-slate-50/50 border-slate-200\`).
    - **Content Logic**: Inside each card, provide a bulleted list (\`<ul class="list-disc pl-5 space-y-1 text-base text-slate-700">\`).
    - **CRITICAL**: The list items MUST correspond to the **Reference Categories** listed above (e.g., "Integration with [Category Name]"). Explain how the product integrates with each category found in the customer's map.
    - **Sub-section: 통합 편의성 요약 (Integration Convenience)**
        - Create an HTML Table **immediately after the cards**.
        - Style: \`w-full mt-6 text-base border-collapse text-center table-fixed\`.
        - Title before table: \`<h4 class="text-lg font-bold text-slate-700 mb-3 text-center">통합 편의성 비교</h4>\`
        - Headers: [구분 | ${ourProduct} | ${competitor}]. Add \`bg-slate-100 font-bold p-2\` to headers.
        - Rows: **Generate a row for each category in [${categoryListString}]**.
        - Cell Values: Use ONLY these symbols: **O** (Good), **△** (Fair), **X** (Poor). Center align all cells.

3.  **## 3. 상세 비교표**
    - **Format**: Markdown Table.
    - Columns: [구분 | ${ourProduct} (자사) | ${competitor} (경쟁사) | 비고].
    - Rows: 연동성, 기능 적합성, 성능, 리스크.
    - Keep content concise.

4.  **## 4. 핵심 차별화 요소**
    - **Format**: HTML Block.
    - **Layout**: Vertical Stack (\`flex flex-col gap-4\`).
    - Create 3 Cards highlighting why Our Product wins.
    - Card Style: \`border border-indigo-100 bg-white shadow-sm rounded-xl p-5 hover:shadow-md transition-all\`.
    - Title Style: \`text-indigo-600 font-bold mb-2 text-base\`.
    - Text Style: \`text-base text-slate-700 leading-relaxed\`.
    - **Do NOT** use "POINT 1" labels. Just the title and description.
    - **Do NOT** use markdown \`**\` bolding.

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
            // Ignore JSON parse error, treat as text
        }

        if (window.marked) {
            resultArea.innerHTML = window.marked.parse(markdownText);
        } else {
            resultArea.innerText = markdownText;
        }

        loading.classList.add('hidden');
        resultArea.classList.remove('hidden');

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
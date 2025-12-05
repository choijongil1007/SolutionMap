

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
        tabMap.classList.remove('font-medium');
        tabMap.classList.add('font-bold');

        tabInsight.classList.replace('border-blue-600', 'border-transparent');
        tabInsight.classList.replace('text-blue-600', 'text-slate-500');
        tabInsight.classList.remove('font-bold');
        tabInsight.classList.add('font-medium');

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
        tabInsight.classList.remove('font-medium');
        tabInsight.classList.add('font-bold');

        tabMap.classList.replace('border-blue-600', 'border-transparent');
        tabMap.classList.replace('text-blue-600', 'text-slate-500');
        tabMap.classList.remove('font-bold');
        tabMap.classList.add('font-medium');

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
    
    // Construct Prompt
    let prompt = `
You are an expert Solution Architect and Pre-sales Technology Consultant.
Perform a detailed competitive analysis comparing two products within the specific context of the customer's current environment.

**Context: Customer's Current Solution Architecture (Installed Base):**
${currentMapContext}

**Products to Compare:**
1. **Our Product (My Company):** ${ourProduct}
2. **Competitor Product:** ${competitor}

**Objective:**
Compare "Our Product" and "Competitor Product" specifically regarding how they fit into the customer's current architecture. 
Provide a **concise**, visually appealing, and persuasive report that highlights why "Our Product" is better.
**Reduce the total output length by 20% compared to a standard verbose report. Be direct and impactful.**

**Report Structure & Formatting Requirements:**

1.  **## 1. 요약**
    - Very brief overview (2-3 sentences) and strategic recommendation.
    - Use Markdown H2 (##).

2.  **## 2. 아키텍처 통합성**
    - **CRITICAL**: Do NOT use plain text paragraphs. Do NOT use markdown bold syntax (like \`**text**\`) inside the HTML cards, as it breaks rendering. Use \`<b>\` tags or plain text inside HTML.
    - **Output this section strictly as HTML** using standard Tailwind CSS classes.
    - Layout: **Vertical Stack** (One card below another).
    - Container: \`<div class="flex flex-col gap-6 w-full">\`
    - **Card 1 (Top)**: Analysis for **${ourProduct}**. Style: \`border border-blue-200 bg-blue-50/50 rounded-xl p-5 w-full\`.
    - **Card 2 (Bottom)**: Analysis for **${competitor}**. Style: \`border border-slate-200 bg-slate-50/50 rounded-xl p-5 w-full\`.
    - Inside each card:
        - Title: \`<h4 class="font-bold mb-3 text-lg text-slate-800">Title</h4>\`
        - Content: Use an unordered list for points: \`<ul class="list-disc pl-5 space-y-1 text-sm text-slate-700"><li>Point 1</li><li>Point 2</li></ul>\`.
    - **Sub-section: 통합 편의성 비교 (Integration Convenience)**
        - Immediately after the cards, insert a small HTML table (not markdown) summarizing integration.
        - Style: \`w-full mt-4 text-sm text-center border-collapse\`. Headers: [구분 | ${ourProduct} | ${competitor}].
        - Rows: DB 연동, API 유연성, 보안 규정 준수.
        - Values: Use symbols strictly: 🟢 (High/Good), 🟡 (Medium), 🔴 (Low/Bad).
        - Add a title before the table: \`<h4 class="text-md font-bold text-slate-700 mt-6 mb-2">통합 편의성 비교</h4>\`

3.  **## 3. 상세 비교표**
    - Standard Markdown Table.
    - Columns: [구분 | ${ourProduct} (자사) | ${competitor} (경쟁사) | 비고].
    - Rows: **연동성, 기능 적합성, 성능, 리스크** (Use strictly these Korean terms).
    - **Constraint**: Keep text in cells **extremely concise** (short phrases) to prevent the table from becoming too tall vertically. Minimize row height.

4.  **## 4. 핵심 차별화 요소**
    - **CRITICAL**: Do NOT use plain text or bullet points. Do NOT use markdown bold syntax inside HTML.
    - **Output this section strictly as HTML** using Tailwind CSS classes.
    - Layout: **Vertical Stack** (One card below another).
    - Container: \`<div class="flex flex-col gap-4 w-full">\`
    - Each card represents a key selling point (Winning Point).
    - Card Style: \`border border-indigo-100 bg-white shadow-sm rounded-xl p-4 hover:shadow-md transition-shadow w-full\`.
    - Inside Card:
      - **DO NOT** use text like "POINT 1".
      - Title: \`<div class="text-indigo-600 font-bold mb-1 text-sm uppercase tracking-wide">Key Benefit Title</div>\`
      - Content: Brief description.

**Strict Output Rules:**
- **Language**: Korean (한국어) ONLY.
- **Format**: Mixed Markdown and embedded HTML (for cards).
- **Table**: Use short separator lines (e.g., \`|---|---|---|---|\`). **DO NOT** use excessive dashes. **DO NOT** use double pipes (\`||\`).
- **Tone**: Professional, objective, yet persuasive for 'Our Product'.
`;

    try {
        // Switch to POST with JSON body (text/plain) to avoid GAS CORS preflight and form-data echoing issues
        const response = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({
                'q': prompt,
                'prompt': prompt
            })
            // Do NOT set Content-Type header; let browser default to text/plain
        });

        if (!response.ok) {
            throw new Error(`API Request Failed: ${response.status}`);
        }

        const responseText = await response.text();
        let markdownText = responseText;

        try {
            const json = JSON.parse(responseText);
            
            // Check if response is valid JSON but just an echo of input (common GAS error)
            if (json.q && !json.candidates) {
                throw new Error("GAS Script echoed request. Please check server script.");
            }

            if (json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts) {
                markdownText = json.candidates[0].content.parts[0].text;
            } else if (json.error) {
                throw new Error(json.error.message || "API Error");
            }
        } catch (e) {
            // If JSON parse fails, check if the response looks like URL-encoded query parameters
            if (responseText.startsWith('q=') || responseText.includes('%0A')) {
                throw new Error("Server returned raw request body. The GAS script may not support POST requests correctly.");
            }
            // Otherwise, treat as raw text (maybe the script returned raw markdown)
        }

        // Render Markdown
        if (window.marked) {
            // Configure marked to allow HTML
            // Note: marked usually allows HTML by default, but ensuring it's not sanitized if specific config used
            resultArea.innerHTML = window.marked.parse(markdownText);
        } else {
            resultArea.innerText = markdownText;
        }

        loading.classList.add('hidden');
        resultArea.classList.remove('hidden');

    } catch (error) {
        console.error("Gemini Error:", error);
        loading.classList.add('hidden');
        
        let errorMsg = error.message;
        if (errorMsg.includes("Unexpected token")) errorMsg = "응답 형식이 올바르지 않습니다.";

        resultArea.innerHTML = `
            <div class="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <h4 class="font-bold mb-1">분석 중 오류가 발생했습니다.</h4>
                <p class="text-sm">서버 응답을 처리할 수 없습니다.</p>
                <p class="text-xs mt-2 text-red-500 font-mono bg-white p-2 rounded border border-red-100">${errorMsg}</p>
            </div>
        `;
        resultArea.classList.remove('hidden');
    }
}
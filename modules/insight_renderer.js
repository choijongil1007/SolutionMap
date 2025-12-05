


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
                        <label class="block text-sm font-semibold text-slate-600 mb-1.5">경쟁사 제품 (필수)</label>
                        <input type="text" id="insight-competitor" class="input-premium w-full" placeholder="예: ServiceNow ITOM">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-slate-600 mb-1.5">자사 제품 (선택)</label>
                        <input type="text" id="insight-our-product" class="input-premium w-full" placeholder="예: Atlassian Jira">
                    </div>
                </div>
                <div class="flex justify-end">
                    <button id="btn-generate-insight" class="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all text-sm font-bold shadow-md shadow-indigo-500/20 active:scale-95">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                        AI 분석 리포트 생성
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
                    <p class="text-sm mt-1">제품명을 입력하고 분석 버튼을 눌러주세요.</p>
                </div>
                <div id="insight-loading" class="hidden absolute inset-0 bg-white/90 flex flex-col items-center justify-center z-10">
                    <div class="spinner border-indigo-600 border-t-transparent w-10 h-10 mb-3"></div>
                    <p class="text-indigo-600 font-bold animate-pulse">Gemini가 분석 보고서를 작성 중입니다...</p>
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

    if (!competitor) {
        alert("경쟁사 제품명을 입력해주세요.");
        return;
    }

    // UI Loading State
    placeholder.classList.add('hidden');
    resultArea.classList.add('hidden');
    loading.classList.remove('hidden');
    resultArea.innerHTML = '';

    const currentMapContext = store.getSolutionContextString();

    try {
        let prompt = `
You are an expert Solution Architect and Technology Consultant.
I need a professional, structured Competitive Analysis Report based on the context below.

**Context: Current Solution Architecture (Existing Tech Stack):**
${currentMapContext}

**Analysis Target:**
`;

        if (ourProduct) {
            prompt += `Compare the competitor product "**${competitor}**" against our product "**${ourProduct}**".`;
        } else {
            prompt += `Analyze the competitor product "**${competitor}**" focusing on its integration risks and weaknesses relative to the current architecture.`;
        }

        prompt += `

**Strict Output Requirements:**
1.  **Language**: **Korean (한국어)**. The entire response, including table contents, headers, and descriptions, MUST be in Korean. Technical terms can remain in English if they are standard industry terms, but provide context in Korean.
2.  **Formatting**: Valid Markdown.
3.  **Table Formatting**:
    - Use a standard Markdown table.
    - **DO NOT** use excessive dashes for the separator line. Use short separators like \`| --- | --- |\`.
    - Ensure there is a blank line before and after the table.
    - Ensure the table syntax is correct (no double pipes \`||\` or missing pipes).
4.  **Structure**:
    - **Executive Summary** (요약): 2-3 sentences.
    - **Compatibility Assessment** (호환성 평가): High/Medium/Low with reason.
    - **Comparison Table** (비교표): Columns should be [항목, 기존/자사, 경쟁사, 비교/설명]. Content MUST be in Korean.
    - **Key Analysis** (주요 분석): Bullet points.

**Generate the report now in Korean.**
`;

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

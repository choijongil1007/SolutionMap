

import { store } from './data_model.js';
import { GoogleGenAI } from "@google/genai";

let container = null;
let tabMap = null;
let tabInsight = null;
let treemapContainer = null;
let insightContainer = null;
let emptyStateEl = null;

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
            <div class="flex-1 min-h-[400px] border border-slate-100 rounded-xl p-8 overflow-y-auto bg-white relative" id="insight-result-area">
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
                <div id="insight-content" class="hidden prose prose-slate max-w-none prose-headings:text-slate-800 prose-p:text-slate-600 prose-li:text-slate-600 prose-strong:text-indigo-700"></div>
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
        const apiKey = process.env.API_KEY; // Using env variable as per strict instructions
        if (!apiKey) {
           throw new Error("API Key is missing. Please configure process.env.API_KEY in index.html.");
        }

        const ai = new GoogleGenAI({ apiKey: apiKey });
        
        let prompt = `
You are an expert Solution Architect and Technology Consultant.
I need a competitive analysis report based on the following context.

**Current Solution Architecture (My Existing Tech Stack):**
${currentMapContext}

**Analysis Task:**
`;

        if (ourProduct) {
            prompt += `Compare the competitor product "${competitor}" against our product "${ourProduct}". 
            Focus specifically on which product serves the "Current Solution Architecture" better in terms of integration, compatibility, and ecosystem synergy.`;
        } else {
            prompt += `Analyze the competitor product "${competitor}". 
            Identify its potential weaknesses, limitations, or verification points specifically regarding its integration with the "Current Solution Architecture" listed above.
            Find points where this competitor product might struggle to connect or exchange data with the existing solutions.`;
        }

        prompt += `

**Output Format:**
Provide the response in structured Markdown (headings, bullet points, bold text). 
Do not include any introductory fluff. Start directly with the Report Title.
Language: Korean.
`;

        // Upgraded to gemini-3-pro-preview for complex reasoning tasks (Architecture analysis)
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
        });

        const markdownText = response.text;

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
        
        // Show friendly error with raw details if dev
        resultArea.innerHTML = `
            <div class="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <h4 class="font-bold mb-1">분석 중 오류가 발생했습니다.</h4>
                <p class="text-sm">API 설정을 확인하거나 잠시 후 다시 시도해주세요.</p>
                <p class="text-xs mt-2 text-red-500 font-mono">${error.message}</p>
            </div>
        `;
        resultArea.classList.remove('hidden');
    }
}
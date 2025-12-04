

import { loadData, saveData } from './utils/localstorage.js';
import { store } from './modules/data_model.js';
import { initTreeBuilder } from './modules/tree_builder.js';
import { initTreemap } from './modules/treemap_renderer.js';
import { showConfirmModal, showWarningModal } from './utils/modal.js';

// DOM Elements
const views = {
    home: document.getElementById('view-home'),
    editor: document.getElementById('view-editor')
};
const mapListContainer = document.getElementById('map-list-container');
const homeEmptyState = document.getElementById('home-empty-state');
const mapTitleInput = document.getElementById('map-title-input');

// Modal Elements
const createModal = document.getElementById('create-modal');
const createModalBackdrop = document.getElementById('create-modal-backdrop');
const createModalPanel = document.getElementById('create-modal-panel');
const createInput = document.getElementById('new-map-title');

document.addEventListener('DOMContentLoaded', () => {
    console.log("Solution Map App initialized (v4).");

    // 1. Initialize Components
    initTreeBuilder('tree-container');
    initTreemap('treemap-container');

    // 2. Load Data from Storage
    const initialData = loadData();
    store.init(initialData);

    // 3. Listeners
    store.subscribeList(renderHomeList); // Update Home when list changes
    
    // Auto-save whenever *anything* changes (content or list)
    const handleAutoSave = () => saveData(store.getFullState());
    store.subscribe(handleAutoSave);
    store.subscribeList(handleAutoSave);

    // 4. Setup Interactions
    setupHomeActions();
    setupEditorActions();
    setupCreateModal();

    // 5. Initial Render
    showHome();
});

// --- View Switching ---

function showHome() {
    views.editor.classList.add('hidden');
    views.home.classList.remove('hidden');
    renderHomeList({ maps: store.getMaps() });
}

function showEditor(mapId) {
    // 1. Switch View First (Ensure container is visible for renderer dimensions)
    views.home.classList.add('hidden');
    views.editor.classList.remove('hidden');
    
    // 2. Select Map (Triggers subscribers -> Render)
    store.selectMap(mapId);
    
    // 3. Update Title Input
    const map = store.getCurrentMap();
    if (map) {
        mapTitleInput.value = map.title;
    }
}

// --- Home Screen Logic ---

function renderHomeList({ maps }) {
    mapListContainer.innerHTML = '';

    if (maps.length === 0) {
        homeEmptyState.classList.remove('hidden');
        mapListContainer.classList.add('hidden');
        return;
    }

    homeEmptyState.classList.add('hidden');
    mapListContainer.classList.remove('hidden');

    maps.forEach(map => {
        const card = document.createElement('div');
        card.className = "bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-blue-300 transition-all group relative card-hover-effect flex flex-col h-40";
        
        // Korean Date Format
        const dateStr = new Date(map.updatedAt).toLocaleDateString('ko-KR', {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        // Calculate stats
        const domainCount = Object.keys(map.content || {}).length;
        
        card.innerHTML = `
            <div class="flex-1 cursor-pointer" onclick="this.closest('.group').dispatchEvent(new CustomEvent('open-map'))">
                <h3 class="font-bold text-lg text-slate-800 mb-1 line-clamp-1 group-hover:text-blue-600 transition-colors">${escapeHtml(map.title)}</h3>
                <p class="text-xs text-slate-400 font-medium mb-4">${dateStr}</p>
                <div class="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 inline-block px-2 py-1 rounded-md border border-slate-100">
                    <span class="font-bold text-slate-700">${domainCount}</span>개 대분류
                </div>
            </div>
            
            <div class="flex items-center justify-end gap-2 mt-auto pt-3 border-t border-slate-50">
                <button class="btn-edit text-slate-400 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded-lg transition-colors" title="수정">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button class="btn-delete text-slate-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-colors" title="삭제">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </div>
        `;

        // Event Listeners
        card.addEventListener('open-map', () => showEditor(map.id));
        
        card.querySelector('.btn-edit').addEventListener('click', (e) => {
            e.stopPropagation();
            showEditor(map.id);
        });

        card.querySelector('.btn-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            showConfirmModal(`'${map.title}' 맵을 정말 삭제하시겠습니까?`, () => {
                store.deleteMap(map.id);
            });
        });

        mapListContainer.appendChild(card);
    });
}

function setupHomeActions() {
    const createBtn = document.getElementById('btn-create-map');
    createBtn.addEventListener('click', openCreateModal);
}

// --- Create Modal Logic ---

function openCreateModal() {
    createInput.value = '';
    createModal.classList.remove('hidden');
    requestAnimationFrame(() => {
        createModalBackdrop.classList.remove('opacity-0');
        createModalPanel.classList.remove('opacity-0', 'scale-95');
        createModalPanel.classList.add('opacity-100', 'scale-100');
    });
    createInput.focus();
}

function closeCreateModal() {
    createModalBackdrop.classList.add('opacity-0');
    createModalPanel.classList.remove('opacity-100', 'scale-100');
    createModalPanel.classList.add('opacity-0', 'scale-95');
    setTimeout(() => {
        createModal.classList.add('hidden');
    }, 200);
}

function setupCreateModal() {
    const cancelBtn = document.getElementById('create-modal-cancel');
    const confirmBtn = document.getElementById('create-modal-confirm');

    cancelBtn.addEventListener('click', closeCreateModal);
    
    const handleCreate = () => {
        const title = createInput.value.trim();
        if (!title) {
            createInput.focus();
            return;
        }
        const newId = store.createMap(title);
        closeCreateModal();
        showEditor(newId);
    };

    confirmBtn.addEventListener('click', handleCreate);
    createInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleCreate();
        if (e.key === 'Escape') closeCreateModal();
    });
}

// --- Editor Actions ---

function setupEditorActions() {
    // Back Button
    document.getElementById('btn-back').addEventListener('click', () => {
        showHome();
    });

    // Title Input
    mapTitleInput.addEventListener('change', (e) => {
        const val = e.target.value.trim();
        if (val) {
            store.updateCurrentMapTitle(val);
        } else {
            // Revert if empty
            const map = store.getCurrentMap();
            if (map) e.target.value = map.title;
        }
    });

    // Manual Save Button
    const saveBtn = document.getElementById('btn-manual-save');
    const toast = document.getElementById('save-toast');
    
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            store.saveCurrentMap(); // Updates timestamp
            saveData(store.getFullState()); // Persist to storage
            
            // Show Feedback
            if (toast) {
                toast.classList.remove('hidden');
                toast.classList.add('toast-visible');
                setTimeout(() => {
                    toast.classList.remove('toast-visible');
                    toast.classList.add('hidden');
                }, 2500);
            }
        });
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
import { loadData, saveData } from './utils/localstorage.js';
import { store } from './modules/data_model.js';
import { initTreeBuilder } from './modules/tree_builder.js';
import { initTreemap } from './modules/treemap_renderer.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("Solution Map App initialized.");

    // 1. Initialize Components
    initTreeBuilder('tree-container');
    initTreemap('treemap-container');

    // 2. Load Data from Storage
    const initialData = loadData();
    
    // 3. Populate Store (triggers initial renders)
    store.init(initialData);

    // 4. Setup Auto-save Listener
    store.subscribe((data) => {
        saveData(data);
    });

    // 5. Setup Header Actions
    setupActions();
});

function setupActions() {
    // Save Action
    const saveBtn = document.getElementById('btn-manual-save');
    const toast = document.getElementById('save-toast');
    
    if (saveBtn && toast) {
        saveBtn.addEventListener('click', () => {
            saveData(store.getData());
            
            // Show Feedback
            toast.classList.remove('hidden');
            toast.classList.add('toast-visible');
            
            // Reset after animation
            setTimeout(() => {
                toast.classList.remove('toast-visible');
                toast.classList.add('hidden');
            }, 2500);
        });
    }

    // Reset Action
    const resetBtn = document.getElementById('btn-reset');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm("정말로 모든 데이터를 삭제하고 초기화하시겠습니까?")) {
                store.resetData();
            }
        });
    }
}
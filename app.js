

import { store } from './modules/data_model.js';
import { initTreeBuilder } from './modules/tree_builder.js';
import { initTreemap } from './modules/treemap_renderer.js';
import { initStrategyRenderer } from './modules/insight_renderer.js';
import { showConfirmModal, showWarningModal } from './utils/modal.js';
import { db } from './utils/firebase.js';
import { collection, getDocs, doc, setDoc, addDoc } from "firebase/firestore";

// --- Router State ---
const ROUTES = {
    HOME: 'view-home',
    WORKSPACE: 'view-workspace',
    EDITOR: 'view-editor',
    MAP_DETAIL: 'view-map-detail',
    REPORT_DETAIL: 'view-report-detail',
    STRATEGY: 'view-strategy'
};

let currentRoute = null;

// --- DOM References ---
const views = {};
Object.values(ROUTES).forEach(id => views[id] = document.getElementById(id));

// Modals
const modals = {
    customer: {
        el: document.getElementById('modal-customer'),
        bg: document.getElementById('modal-customer-bg'),
        panel: document.getElementById('modal-customer-panel'),
        input: document.getElementById('input-customer-name'),
        btnSave: document.getElementById('btn-save-customer'),
        btnCancel: document.getElementById('btn-cancel-customer')
    },
    saveMap: {
        el: document.getElementById('modal-save-map'),
        bg: document.getElementById('modal-save-map-bg'),
        panel: document.getElementById('modal-save-map-panel'),
        input: document.getElementById('input-map-name'),
        btnConfirm: document.getElementById('btn-confirm-save-map'),
        btnCancel: document.getElementById('btn-cancel-save-map')
    }
};

// --- Initialization ---

document.addEventListener('DOMContentLoaded', async () => {
    // Show Loading
    const loader = document.getElementById('app-loading');
    if(loader) loader.classList.remove('hidden');

    // 1. Init Store (Firestore Listeners)
    await store.init();

    // 2. Init Components
    initTreeBuilder('tree-container');
    initTreemap('treemap-container');
    initTreemap('detail-treemap-area'); 
    initStrategyRenderer('strategy-container');

    // 3. Setup Global Events
    setupGlobalEvents();

    // 4. Reactive UI Updates
    // This connects the Firestore data stream to the main views (Home/Workspace)
    store.subscribe(() => {
        if (currentRoute === ROUTES.HOME) {
            renderHome();
        } else if (currentRoute === ROUTES.WORKSPACE) {
            const currentCus = store.getCurrentCustomer();
            if (currentCus) {
                renderWorkspace(currentCus.id);
            }
        }
    });

    if(loader) loader.classList.add('hidden');

    // 5. Start at Home
    navigateTo(ROUTES.HOME);
});

// --- Navigation / Routing ---

function navigateTo(route, params = {}) {
    currentRoute = route; // Update current route state

    // Hide all views
    Object.values(views).forEach(el => {
        if(el) el.classList.add('hidden');
    });
    
    // Show target view
    const target = views[route];
    if (target) {
        target.classList.remove('hidden');
        
        // View-specific initialization
        switch(route) {
            case ROUTES.HOME:
                renderHome();
                break;
            case ROUTES.WORKSPACE:
                if (params.customerId) renderWorkspace(params.customerId);
                break;
            case ROUTES.EDITOR:
                // Handle draft vs existing
                if (params.mapId) {
                     renderEditor(params.mapId);
                } else {
                     // If no mapId, assume Draft is already init via store.initDraftMap
                     renderEditor(null);
                }
                break;
            case ROUTES.MAP_DETAIL:
                if (params.mapId) {
                    requestAnimationFrame(() => renderMapDetail(params.mapId));
                }
                break;
            case ROUTES.REPORT_DETAIL:
                if (params.reportId) renderReportDetail(params.reportId);
                break;
            case ROUTES.STRATEGY:
                if (params.mapId) {
                    renderStrategy(params.mapId);
                }
                break;
        }
    }
}

// --- View Logics ---

function renderHome() {
    const listEl = document.getElementById('customer-list');
    const emptyEl = document.getElementById('home-empty');
    const customers = store.getCustomers();

    listEl.innerHTML = '';
    
    if (customers.length === 0) {
        emptyEl.classList.remove('hidden');
        return;
    }
    emptyEl.classList.add('hidden');

    customers.forEach(c => {
        const mapCount = store.getMapsByCustomer(c.id).length;
        const reportCount = store.getReportsByCustomer(c.id).length;
        
        const card = document.createElement('div');
        card.className = "bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer group";
        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div class="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    ${c.name.charAt(0).toUpperCase()}
                </div>
                <button class="btn-delete-customer p-2 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg transition-colors" title="삭제">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                </button>
            </div>
            <h3 class="text-xl font-bold text-slate-900 mb-1">${c.name}</h3>
            <p class="text-sm text-slate-500 mb-6">등록일: ${new Date(c.createdAt).toLocaleDateString()}</p>
            <div class="flex gap-4">
                <div class="flex-1 bg-slate-50 rounded-lg p-3 text-center">
                    <div class="text-lg font-bold text-slate-800">${mapCount}</div>
                    <div class="text-xs text-slate-500">Maps</div>
                </div>
                <div class="flex-1 bg-slate-50 rounded-lg p-3 text-center">
                    <div class="text-lg font-bold text-slate-800">${reportCount}</div>
                    <div class="text-xs text-slate-500">Reports</div>
                </div>
            </div>
        `;
        
        // Navigate to Workspace
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.btn-delete-customer')) {
                store.setCurrentCustomer(c.id);
                navigateTo(ROUTES.WORKSPACE, { customerId: c.id });
            }
        });

        // Delete Action
        card.querySelector('.btn-delete-customer').addEventListener('click', (e) => {
            e.stopPropagation();
            showConfirmModal(`'${c.name}' 고객과 관련된 모든 맵과 보고서가 삭제됩니다. 계속하시겠습니까?`, () => {
                store.deleteCustomer(c.id);
            });
        });

        listEl.appendChild(card);
    });
}

function renderWorkspace(customerId) {
    const customer = store.getCurrentCustomer();
    if (!customer) {
        // Data might not be loaded yet, wait for subscription update
        return;
    }

    document.getElementById('ws-customer-name').textContent = customer.name;
    
    // Render Maps
    const maps = store.getMapsByCustomer(customerId);
    const mapList = document.getElementById('ws-map-list');
    const mapEmpty = document.getElementById('ws-map-empty');
    
    mapList.innerHTML = '';
    if (maps.length === 0) {
        mapEmpty.classList.remove('hidden');
    } else {
        mapEmpty.classList.add('hidden');
        maps.forEach(map => {
            const el = document.createElement('div');
            // Modified: removed hover:border-blue-400, added hover:shadow-xl hover:-translate-y-1
            el.className = "bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer";
            el.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                    </div>
                    <div>
                        <h4 class="font-bold text-slate-800">${map.title}</h4>
                        <p class="text-xs text-slate-400">${new Date(map.updatedAt).toLocaleDateString()}</p>
                    </div>
                </div>
                <button class="btn-del-map p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded" title="삭제">
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                </button>
            `;
            el.onclick = (e) => {
                if(!e.target.closest('.btn-del-map')) {
                    navigateTo(ROUTES.MAP_DETAIL, { mapId: map.id });
                }
            };
            
            el.querySelector('.btn-del-map').onclick = (e) => {
                e.stopPropagation();
                showConfirmModal("이 솔루션 맵을 삭제하시겠습니까?", () => {
                    store.deleteMap(map.id);
                });
            };

            mapList.appendChild(el);
        });
    }

    // Render Reports
    const reports = store.getReportsByCustomer(customerId);
    const repList = document.getElementById('ws-report-list');
    const repEmpty = document.getElementById('ws-report-empty');

    repList.innerHTML = '';
    if (reports.length === 0) {
        repEmpty.classList.remove('hidden');
    } else {
        repEmpty.classList.add('hidden');
        reports.forEach(rep => {
            const el = document.createElement('div');
            // Modified: removed hover:border-indigo-400, added hover:shadow-xl hover:-translate-y-1
            el.className = "bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer";
            el.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    </div>
                    <div>
                        <h4 class="font-bold text-slate-800">${rep.title}</h4>
                        <p class="text-xs text-slate-400">${new Date(rep.createdAt).toLocaleDateString()}</p>
                    </div>
                </div>
                <button class="btn-del-rep p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded" title="삭제">
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                </button>
            `;
            
            el.onclick = (e) => {
                if(!e.target.closest('.btn-del-rep')) {
                    navigateTo(ROUTES.REPORT_DETAIL, { reportId: rep.id });
                }
            };
            
            el.querySelector('.btn-del-rep').onclick = (e) => {
                e.stopPropagation();
                showConfirmModal("이 보고서를 삭제하시겠습니까?", () => {
                    store.deleteReport(rep.id);
                });
            };

            repList.appendChild(el);
        });
    }
}

function renderEditor(mapId) {
    if (mapId) {
        store.setCurrentMap(mapId);
    } 
    // If mapId is null, store.getCurrentMap() will return draftMap which is set by initDraftMap

    const map = store.getCurrentMap();
    if (map) {
        document.getElementById('editor-map-title').textContent = map.title;
    }
}

function renderMapDetail(mapId) {
    store.setCurrentMap(mapId);
    const map = store.getCurrentMap();
    if(map) {
        document.getElementById('detail-map-title').textContent = map.title;
        store.notify(); 
    }
}

function renderReportDetail(reportId) {
    store.setCurrentReport(reportId);
    const report = store.getCurrentReport();
    if(report) {
        document.getElementById('report-title').textContent = report.title;
        document.getElementById('report-content-body').innerHTML = report.contentHTML;
    }
}

function renderStrategy(mapId) {
    store.setCurrentMap(mapId);
}

// --- Global Events Setup ---

function setupGlobalEvents() {
    // 1. Home Actions
    document.getElementById('btn-new-customer').onclick = openCustomerModal;
    
    // 2. Workspace Actions
    document.getElementById('ws-btn-back').onclick = () => navigateTo(ROUTES.HOME);
    
    // Changed: Don't create DB entry immediately. Use Draft.
    document.getElementById('ws-btn-create-map').onclick = async () => {
        const customer = store.getCurrentCustomer();
        if(customer) {
            store.initDraftMap(customer.id);
            navigateTo(ROUTES.EDITOR); // No mapId param
        }
    };

    // 3. Editor Actions
    document.getElementById('editor-btn-back').onclick = () => {
        const customer = store.getCurrentCustomer();
        navigateTo(ROUTES.WORKSPACE, { customerId: customer?.id });
    };
    
    const btnGotoMap = document.getElementById('editor-btn-goto-map');
    if(btnGotoMap) {
        btnGotoMap.onclick = () => {
            const map = store.getCurrentMap();
            // If it's a draft (no id), we cannot go to map detail
            if(map && map.id) {
                navigateTo(ROUTES.MAP_DETAIL, { mapId: map.id });
            } else {
                showWarningModal("저장되지 않은 맵입니다. 먼저 저장해주세요.");
            }
        };
    }
    
    document.getElementById('btn-manual-save').onclick = openSaveMapModal;

    // 4. Map Detail Actions
    document.getElementById('detail-btn-back').onclick = () => {
        const customer = store.getCurrentCustomer();
        navigateTo(ROUTES.WORKSPACE, { customerId: customer?.id });
    };
    document.getElementById('detail-btn-edit').onclick = () => {
        const map = store.getCurrentMap();
        if(map) navigateTo(ROUTES.EDITOR, { mapId: map.id });
    };
    document.getElementById('detail-btn-strategy').onclick = () => {
        const map = store.getCurrentMap();
        if(map) navigateTo(ROUTES.STRATEGY, { mapId: map.id });
    };
    const btnDetailWorkspace = document.getElementById('detail-btn-workspace');
    if(btnDetailWorkspace) {
        btnDetailWorkspace.onclick = () => {
            const customer = store.getCurrentCustomer();
            navigateTo(ROUTES.WORKSPACE, { customerId: customer?.id });
        };
    }

    // 5. Report Detail Actions
    document.getElementById('report-btn-back').onclick = () => {
        const customer = store.getCurrentCustomer();
        navigateTo(ROUTES.WORKSPACE, { customerId: customer?.id });
    };
    document.getElementById('report-btn-export').onclick = () => {
        window.print();
    };
    
    // New: Go to Workspace from Report Detail
    const btnReportWorkspace = document.getElementById('report-btn-workspace');
    if (btnReportWorkspace) {
        btnReportWorkspace.onclick = () => {
            const customer = store.getCurrentCustomer();
            navigateTo(ROUTES.WORKSPACE, { customerId: customer?.id });
        };
    }

    // 6. Strategy Maker Actions
    document.getElementById('strategy-btn-back').onclick = () => {
        const map = store.getCurrentMap();
        if(map) navigateTo(ROUTES.MAP_DETAIL, { mapId: map.id });
    };

    const btnStrategyMap = document.getElementById('strategy-btn-goto-map');
    if(btnStrategyMap) {
        btnStrategyMap.onclick = () => {
            const map = store.getCurrentMap();
            if(map) navigateTo(ROUTES.MAP_DETAIL, { mapId: map.id });
        };
    }

    // 7. Modal Events
    setupModalEvents();
}

function setupModalEvents() {
    // Customer Modal
    modals.customer.btnCancel.onclick = closeCustomerModal;
    
    const saveCustomer = async () => {
        const name = modals.customer.input.value.trim();
        if(name) {
            await store.addCustomer(name);
            closeCustomerModal();
            // renderHome handled by snapshot
        }
    };

    modals.customer.btnSave.onclick = saveCustomer;

    modals.customer.input.addEventListener('keydown', (e) => {
        if(e.key === 'Enter') {
            e.preventDefault(); 
            modals.customer.btnSave.click();
        }
    });

    // Save Map Modal
    modals.saveMap.btnCancel.onclick = closeSaveMapModal;
    
    modals.saveMap.btnConfirm.onclick = async () => {
        const name = modals.saveMap.input.value.trim();
        if(name) {
            const map = store.getCurrentMap();
            if(map) {
                // Check if it's existing or draft
                if (map.id) {
                    // Update existing
                    await store.updateMapTitle(map.id, name);
                    showToast();
                    document.getElementById('editor-map-title').textContent = name;
                    closeSaveMapModal();
                } else {
                    // Save draft to DB
                    try {
                        const newId = await store.saveDraftToFirestore(name);
                        showToast();
                        document.getElementById('editor-map-title').textContent = name;
                        closeSaveMapModal();
                        // Navigate to avoid URL/state mismatch issues
                        navigateTo(ROUTES.EDITOR, { mapId: newId });
                    } catch (e) {
                        showWarningModal("저장 중 오류가 발생했습니다.");
                    }
                }
            }
        }
    };
}

function showToast() {
    const toast = document.getElementById('save-toast');
    toast.classList.remove('hidden');
    toast.classList.add('toast-visible');
    setTimeout(() => toast.classList.add('hidden'), 2500);
}

// --- Modal Logic ---

function openCustomerModal() {
    modals.customer.input.value = '';
    modals.customer.el.classList.remove('hidden');
    requestAnimationFrame(() => {
        modals.customer.bg.classList.remove('opacity-0');
        modals.customer.panel.classList.remove('scale-95', 'opacity-0');
        modals.customer.panel.classList.add('scale-100', 'opacity-100');
    });
    modals.customer.input.focus();
}

function closeCustomerModal() {
    modals.customer.bg.classList.add('opacity-0');
    modals.customer.panel.classList.add('scale-95', 'opacity-0');
    setTimeout(() => modals.customer.el.classList.add('hidden'), 200);
}

function openSaveMapModal() {
    const map = store.getCurrentMap();
    if (!map) return;
    
    // VALIDATION: Check if map content is empty
    const mapData = map.content || {};
    if (Object.keys(mapData).length === 0) {
        showWarningModal("데이터를 입력해주세요. 빈 맵은 저장할 수 없습니다.");
        return;
    }

    const customer = store.getCurrentCustomer();
    
    let suggestedName = map.title;
    if (map.title === "새 솔루션 맵" && customer) {
        const domains = Object.keys(mapData);
        const mainCategory = domains.length > 0 ? domains[0] : "General";
        suggestedName = `${customer.name}_${mainCategory}_SolutionMap`;
    }

    modals.saveMap.input.value = suggestedName;
    modals.saveMap.el.classList.remove('hidden');
    requestAnimationFrame(() => {
        modals.saveMap.bg.classList.remove('opacity-0');
        modals.saveMap.panel.classList.remove('scale-95', 'opacity-0');
        modals.saveMap.panel.classList.add('scale-100', 'opacity-100');
    });
    modals.saveMap.input.focus();
}

function closeSaveMapModal() {
    modals.saveMap.bg.classList.add('opacity-0');
    modals.saveMap.panel.classList.add('scale-95', 'opacity-0');
    setTimeout(() => modals.saveMap.el.classList.add('hidden'), 200);
}
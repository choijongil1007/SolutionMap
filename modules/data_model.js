

/**
 * DataModelStore
 * Manages the application state (list of maps + current active map) and notifies listeners.
 */
class DataModelStore {
    constructor() {
        this.state = {
            maps: [], // Array of { id, title, updatedAt, content: {} }
            currentMapId: null
        };
        // Listeners for active map content changes (Tree/Map renderers)
        this.contentListeners = [];
        // Listeners for map list changes (Home screen)
        this.listListeners = [];
    }

    init(initialData) {
        if (initialData && Array.isArray(initialData.maps)) {
            this.state.maps = initialData.maps;
        } else {
            this.state.maps = [];
        }
        this.notifyList();
    }

    // --- State Accessors ---

    getMaps() {
        // Sort by updatedAt desc
        return [...this.state.maps].sort((a, b) => b.updatedAt - a.updatedAt);
    }

    getCurrentMap() {
        return this.state.maps.find(m => m.id === this.state.currentMapId);
    }

    // Returns just the 'content' object for the active map (for tree/treemap renderers)
    getData() {
        const current = this.getCurrentMap();
        return current ? current.content : {};
    }

    /**
     * Returns a flat text representation of the current solution map.
     * Used for providing context to the AI model.
     */
    getSolutionContextString() {
        const data = this.getData();
        const lines = [];
        
        Object.entries(data).forEach(([domain, categories]) => {
            Object.entries(categories).forEach(([category, solutions]) => {
                solutions.forEach(sol => {
                    const mf = sol.manufacturer ? `[${sol.manufacturer}] ` : '';
                    lines.push(`- ${domain} > ${category}: ${mf}${sol.name}`);
                });
            });
        });

        if (lines.length === 0) return "No solutions defined in the current architecture.";
        return lines.join('\n');
    }

    // --- Subscription ---

    subscribe(listener) {
        this.contentListeners.push(listener);
    }

    subscribeList(listener) {
        this.listListeners.push(listener);
    }

    notify() {
        // Notify components watching the Active Map's content
        const data = this.getData();
        this.contentListeners.forEach(listener => listener(data));
    }

    notifyList() {
        // Notify components watching the Map List (Home Screen)
        const maps = this.getMaps();
        this.listListeners.forEach(listener => listener({ maps }));
    }

    getFullState() {
        return { maps: this.state.maps };
    }

    // --- Map Management Actions ---

    createMap(title) {
        const newMap = {
            id: crypto.randomUUID(),
            title: title || "Untitled Map",
            updatedAt: Date.now(),
            content: {} 
        };
        this.state.maps.push(newMap);
        this.state.currentMapId = newMap.id;
        
        this.notifyList();
        this.notify();
        return newMap.id;
    }

    selectMap(id) {
        const map = this.state.maps.find(m => m.id === id);
        if (map) {
            this.state.currentMapId = id;
            this.notify();
        }
    }

    deleteMap(id) {
        this.state.maps = this.state.maps.filter(m => m.id !== id);
        if (this.state.currentMapId === id) {
            this.state.currentMapId = null;
        }
        this.notifyList();
    }

    updateCurrentMapTitle(newTitle) {
        const map = this.getCurrentMap();
        if (map) {
            map.title = newTitle;
            map.updatedAt = Date.now();
            this.notifyList();
        }
    }

    saveCurrentMap() {
        const map = this.getCurrentMap();
        if (map) {
            map.updatedAt = Date.now();
            this.notifyList();
            return this.getFullState(); // Return full state for LocalStorage
        }
        return null;
    }

    // --- Content Manipulation Actions (Operates on Current Map) ---

    _touch() {
        const map = this.getCurrentMap();
        if (map) map.updatedAt = Date.now();
    }

    resetData() {
        const map = this.getCurrentMap();
        if (map) {
            map.content = {};
            this._touch();
            this.notify();
        }
    }

    addDomain(name) {
        const map = this.getCurrentMap();
        if (!map) return false;
        
        if (!name || map.content[name]) return false;
        map.content[name] = {};
        this._touch();
        this.notify();
        return true;
    }

    renameDomain(oldName, newName) {
        const map = this.getCurrentMap();
        if (!map) return false;

        if (!newName || oldName === newName) return true;
        if (map.content[newName]) return false; 
        
        const content = map.content[oldName];
        delete map.content[oldName];
        map.content[newName] = content;
        this._touch();
        this.notify();
        return true;
    }

    deleteDomain(name) {
        const map = this.getCurrentMap();
        if (map) {
            delete map.content[name];
            this._touch();
            this.notify();
        }
    }

    addCategory(domain, name) {
        const map = this.getCurrentMap();
        if (!map) return false;

        if (!name || !map.content[domain]) return false;
        if (map.content[domain][name]) return false;
        
        map.content[domain][name] = [];
        this._touch();
        this.notify();
        return true;
    }

    renameCategory(domain, oldName, newName) {
        const map = this.getCurrentMap();
        if (!map) return false;

        if (!newName || oldName === newName) return true;
        if (map.content[domain][newName]) return false;

        const content = map.content[domain][oldName];
        delete map.content[domain][oldName];
        map.content[domain][newName] = content;
        this._touch();
        this.notify();
        return true;
    }

    deleteCategory(domain, name) {
        const map = this.getCurrentMap();
        if (map && map.content[domain]) {
            delete map.content[domain][name];
            this._touch();
            this.notify();
        }
    }

    addSolution(domain, category, name, share, manufacturer = "", painPoints = [], note = "") {
        const map = this.getCurrentMap();
        if (!map) return 'ERROR';
        if (!map.content[domain] || !map.content[domain][category]) return 'INVALID_TARGET';
        
        const solutions = map.content[domain][category];
        
        if (solutions.some(s => s.name === name)) return 'DUPLICATE';

        const currentTotal = solutions.reduce((sum, s) => sum + s.share, 0);
        if (currentTotal + share > 100) return 'OVERFLOW';

        solutions.push({ 
            name, 
            share,
            manufacturer: manufacturer || "",
            painPoints: painPoints || [],
            note: note || ""
        });
        
        this._touch();
        this.notify();
        return 'SUCCESS';
    }

    updateSolution(domain, category, index, newName, newShare, newManufacturer, newPainPoints, newNote) {
        const map = this.getCurrentMap();
        if (!map) return 'ERROR';

        if (!map.content[domain] || !map.content[domain][category]) return 'INVALID_TARGET';
        const solutions = map.content[domain][category];
        
        if (!solutions[index]) return 'INVALID_INDEX';

        if (solutions[index].name !== newName && solutions.some((s, i) => i !== index && s.name === newName)) {
            return 'DUPLICATE';
        }

        const otherShares = solutions.reduce((sum, s, i) => i === index ? sum : sum + s.share, 0);
        if (otherShares + newShare > 100) return 'OVERFLOW';

        // Merge existing fields with updates if not provided (optional safety, though UI provides all)
        const existing = solutions[index];
        solutions[index] = { 
            name: newName, 
            share: newShare,
            manufacturer: newManufacturer !== undefined ? newManufacturer : existing.manufacturer,
            painPoints: newPainPoints !== undefined ? newPainPoints : existing.painPoints,
            note: newNote !== undefined ? newNote : existing.note
        };
        
        this._touch();
        this.notify();
        return 'SUCCESS';
    }

    deleteSolution(domain, category, index) {
        const map = this.getCurrentMap();
        if (map && map.content[domain] && map.content[domain][category]) {
            map.content[domain][category].splice(index, 1);
            this._touch();
            this.notify();
        }
    }
}

export const store = new DataModelStore();
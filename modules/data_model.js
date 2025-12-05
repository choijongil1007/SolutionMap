

/**
 * DataModelStore
 * Manages the application state: Customers, Maps, Reports
 */
class DataModelStore {
    constructor() {
        this.state = {
            customers: [], // { id, name, createdAt }
            maps: [],      // { id, customerId, title, updatedAt, content: {} }
            reports: [],   // { id, customerId, title, createdAt, contentHTML, type }
            
            // Current Context
            currentCustomerId: null,
            currentMapId: null,
            currentReportId: null
        };
        
        this.listeners = [];
    }

    init(initialData) {
        if (initialData) {
            this.state.customers = Array.isArray(initialData.customers) ? initialData.customers : [];
            this.state.maps = Array.isArray(initialData.maps) ? initialData.maps : [];
            this.state.reports = Array.isArray(initialData.reports) ? initialData.reports : [];
        }
        
        // Migration for legacy data (maps without customerId)
        // Assign them to a "General" customer if they exist
        const orphanedMaps = this.state.maps.filter(m => !m.customerId);
        if (orphanedMaps.length > 0) {
            let defaultCustomer = this.state.customers.find(c => c.name === "General");
            if (!defaultCustomer) {
                defaultCustomer = { id: crypto.randomUUID(), name: "General", createdAt: Date.now() };
                this.state.customers.push(defaultCustomer);
            }
            orphanedMaps.forEach(m => m.customerId = defaultCustomer.id);
        }

        this.notify();
    }

    // --- Accessors ---

    getCustomers() {
        return [...this.state.customers].sort((a, b) => b.createdAt - a.createdAt);
    }

    getCurrentCustomer() {
        return this.state.customers.find(c => c.id === this.state.currentCustomerId);
    }

    getMapsByCustomer(customerId) {
        return this.state.maps
            .filter(m => m.customerId === customerId)
            .sort((a, b) => b.updatedAt - a.updatedAt);
    }

    getReportsByCustomer(customerId) {
        return this.state.reports
            .filter(r => r.customerId === customerId)
            .sort((a, b) => b.createdAt - a.createdAt);
    }

    getCurrentMap() {
        return this.state.maps.find(m => m.id === this.state.currentMapId);
    }

    getCurrentReport() {
        return this.state.reports.find(r => r.id === this.state.currentReportId);
    }

    getData() {
        const map = this.getCurrentMap();
        return map ? map.content : {};
    }

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

        if (lines.length === 0) return "No solutions defined.";
        return lines.join('\n');
    }

    getFullState() {
        return {
            customers: this.state.customers,
            maps: this.state.maps,
            reports: this.state.reports
        };
    }

    // --- Actions ---

    subscribe(listener) {
        this.listeners.push(listener);
    }

    notify() {
        this.listeners.forEach(listener => listener(this.getFullState()));
    }

    _touch() {
        const map = this.getCurrentMap();
        if (map) map.updatedAt = Date.now();
    }

    // Customer Actions
    addCustomer(name) {
        const newCustomer = {
            id: crypto.randomUUID(),
            name: name,
            createdAt: Date.now()
        };
        this.state.customers.push(newCustomer);
        this.notify();
        return newCustomer.id;
    }

    deleteCustomer(id) {
        this.state.customers = this.state.customers.filter(c => c.id !== id);
        this.state.maps = this.state.maps.filter(m => m.customerId !== id);
        this.state.reports = this.state.reports.filter(r => r.customerId !== id);
        this.notify();
    }

    setCurrentCustomer(id) {
        this.state.currentCustomerId = id;
        this.notify();
    }

    // Map Actions
    createMap(customerId, title) {
        const newMap = {
            id: crypto.randomUUID(),
            customerId: customerId,
            title: title || "새 솔루션 맵",
            updatedAt: Date.now(),
            content: {}
        };
        this.state.maps.push(newMap);
        this.state.currentMapId = newMap.id;
        this.notify();
        return newMap.id;
    }

    setCurrentMap(id) {
        this.state.currentMapId = id;
        this.notify(); // Triggers renderers
    }

    updateMapTitle(id, newTitle) {
        const map = this.state.maps.find(m => m.id === id);
        if (map) {
            map.title = newTitle;
            map.updatedAt = Date.now();
            this.notify();
        }
    }

    deleteMap(id) {
        this.state.maps = this.state.maps.filter(m => m.id !== id);
        if (this.state.currentMapId === id) this.state.currentMapId = null;
        this.notify();
    }

    // Report Actions
    addReport(customerId, title, contentHTML, type = 'competitive_insight') {
        const newReport = {
            id: crypto.randomUUID(),
            customerId: customerId,
            title: title,
            contentHTML: contentHTML,
            type: type,
            createdAt: Date.now()
        };
        this.state.reports.push(newReport);
        this.notify();
        return newReport.id;
    }

    deleteReport(id) {
        this.state.reports = this.state.reports.filter(r => r.id !== id);
        this.notify();
    }

    setCurrentReport(id) {
        this.state.currentReportId = id;
        this.notify();
    }

    // --- Editor Actions (Operate on currentMap) ---

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

    addSolution(domain, category, name, share, manufacturer, painPoints, note) {
        const map = this.getCurrentMap();
        if (!map) return 'ERROR';
        const solutions = map.content[domain]?.[category];
        if (!solutions) return 'INVALID_TARGET';
        
        if (solutions.some(s => s.name === name)) return 'DUPLICATE';
        const total = solutions.reduce((sum, s) => sum + s.share, 0);
        if (total + share > 100) return 'OVERFLOW';

        solutions.push({ name, share, manufacturer, painPoints, note });
        this._touch();
        this.notify();
        return 'SUCCESS';
    }

    updateSolution(domain, category, index, name, share, manufacturer, painPoints, note) {
        const map = this.getCurrentMap();
        if (!map) return 'ERROR';
        const solutions = map.content[domain]?.[category];
        if (!solutions || !solutions[index]) return 'INVALID_INDEX';

        if (solutions[index].name !== name && solutions.some(s => s.name === name)) return 'DUPLICATE';
        
        const otherSum = solutions.reduce((sum, s, i) => i === index ? sum : sum + s.share, 0);
        if (otherSum + share > 100) return 'OVERFLOW';

        solutions[index] = { name, share, manufacturer, painPoints, note };
        this._touch();
        this.notify();
        return 'SUCCESS';
    }

    deleteSolution(domain, category, index) {
        const map = this.getCurrentMap();
        if (map?.content[domain]?.[category]) {
            map.content[domain][category].splice(index, 1);
            this._touch();
            this.notify();
        }
    }
}

export const store = new DataModelStore();

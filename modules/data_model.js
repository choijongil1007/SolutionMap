/**
 * DataModelStore
 * Manages the application state and notifies listeners of changes.
 */
class DataModelStore {
    constructor() {
        this.data = {};
        this.listeners = [];
    }

    init(initialData) {
        this.data = initialData;
        this.notify();
    }

    getData() {
        return this.data;
    }

    subscribe(listener) {
        this.listeners.push(listener);
    }

    notify() {
        this.listeners.forEach(listener => listener(this.data));
    }

    // --- Actions ---

    resetData() {
        this.data = {};
        this.notify();
    }

    addDomain(name) {
        if (!name || this.data[name]) return false;
        this.data[name] = {};
        this.notify();
        return true;
    }

    renameDomain(oldName, newName) {
        if (!newName || oldName === newName) return true;
        if (this.data[newName]) return false; // Duplicate
        
        const content = this.data[oldName];
        delete this.data[oldName];
        this.data[newName] = content;
        this.notify();
        return true;
    }

    deleteDomain(name) {
        delete this.data[name];
        this.notify();
    }

    addCategory(domain, name) {
        if (!name || !this.data[domain]) return false;
        if (this.data[domain][name]) return false;
        
        this.data[domain][name] = [];
        this.notify();
        return true;
    }

    renameCategory(domain, oldName, newName) {
        if (!newName || oldName === newName) return true;
        if (this.data[domain][newName]) return false;

        const content = this.data[domain][oldName];
        delete this.data[domain][oldName];
        this.data[domain][newName] = content;
        this.notify();
        return true;
    }

    deleteCategory(domain, name) {
        if (this.data[domain]) {
            delete this.data[domain][name];
            this.notify();
        }
    }

    addSolution(domain, category, name, share) {
        if (!this.data[domain] || !this.data[domain][category]) return false;
        const solutions = this.data[domain][category];
        
        // Ensure name uniqueness within category
        if (solutions.some(s => s.name === name)) return false;

        solutions.push({ name, share });
        this.notify();
        return true;
    }

    updateSolution(domain, category, index, newName, newShare) {
        if (!this.data[domain] || !this.data[domain][category]) return false;
        const solutions = this.data[domain][category];
        
        if (!solutions[index]) return false;

        // Check duplicate name only if name changed
        if (solutions[index].name !== newName && solutions.some((s, i) => i !== index && s.name === newName)) {
            return false;
        }

        solutions[index] = { name: newName, share: newShare };
        this.notify();
        return true;
    }

    deleteSolution(domain, category, index) {
        if (this.data[domain] && this.data[domain][category]) {
            this.data[domain][category].splice(index, 1);
            this.notify();
        }
    }
}

export const store = new DataModelStore();
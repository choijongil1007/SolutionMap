import { db } from '../utils/firebase.js';
import { 
    collection, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    onSnapshot, 
    query, 
    orderBy,
    setDoc,
    serverTimestamp
} from "firebase/firestore";

/**
 * DataModelStore
 * Manages the application state synced with Firestore
 */
class DataModelStore {
    constructor() {
        this.state = {
            customers: [], 
            maps: [],      
            reports: [],   
            
            // Current Context (Local Only)
            currentCustomerId: null,
            currentMapId: null,
            currentReportId: null
        };
        
        this.listeners = [];
        this.unsubscribes = [];
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;

        // Subscribe to Customers
        const qCust = query(collection(db, "customers"), orderBy("createdAt", "desc"));
        const unsubCust = onSnapshot(qCust, (snapshot) => {
            this.state.customers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.notify();
        });

        // Subscribe to Maps
        const qMaps = query(collection(db, "maps"), orderBy("updatedAt", "desc"));
        const unsubMaps = onSnapshot(qMaps, (snapshot) => {
            this.state.maps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.notify();
        });

        // Subscribe to Reports
        const qReps = query(collection(db, "reports"), orderBy("createdAt", "desc"));
        const unsubReps = onSnapshot(qReps, (snapshot) => {
            this.state.reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.notify();
        });

        this.unsubscribes.push(unsubCust, unsubMaps, unsubReps);
        this.initialized = true;
    }

    // --- Accessors ---

    getCustomers() {
        return this.state.customers;
    }

    getCurrentCustomer() {
        return this.state.customers.find(c => c.id === this.state.currentCustomerId);
    }

    getMapsByCustomer(customerId) {
        return this.state.maps.filter(m => m.customerId === customerId);
    }

    getReportsByCustomer(customerId) {
        return this.state.reports.filter(r => r.customerId === customerId);
    }

    getCurrentMap() {
        return this.state.maps.find(m => m.id === this.state.currentMapId);
    }

    getCurrentReport() {
        return this.state.reports.find(r => r.id === this.state.currentReportId);
    }

    getData() {
        const map = this.getCurrentMap();
        return map ? (map.content || {}) : {};
    }

    getSolutionContextString() {
        const data = this.getData();
        const lines = [];
        
        Object.entries(data).forEach(([domain, categories]) => {
            if (typeof categories !== 'object' || Array.isArray(categories)) return;

            Object.entries(categories).forEach(([category, solutions]) => {
                if (!Array.isArray(solutions)) return;
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
        // Only for debug or local backup, not used for persistence anymore
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

    // Customer Actions
    async addCustomer(name) {
        try {
            const docRef = await addDoc(collection(db, "customers"), {
                name: name,
                createdAt: Date.now()
            });
            return docRef.id;
        } catch (e) {
            console.error("Error adding customer: ", e);
        }
    }

    async deleteCustomer(id) {
        try {
            // Delete customer doc
            await deleteDoc(doc(db, "customers", id));
            
            // Delete related maps (In a real backend this should be a cloud function, here client-side)
            const mapIds = this.state.maps.filter(m => m.customerId === id).map(m => m.id);
            mapIds.forEach(mid => deleteDoc(doc(db, "maps", mid)));

            // Delete related reports
            const repIds = this.state.reports.filter(r => r.customerId === id).map(r => r.id);
            repIds.forEach(rid => deleteDoc(doc(db, "reports", rid)));
            
            if (this.state.currentCustomerId === id) this.state.currentCustomerId = null;
        } catch (e) {
            console.error("Error deleting customer: ", e);
        }
    }

    setCurrentCustomer(id) {
        this.state.currentCustomerId = id;
        this.notify();
    }

    // Map Actions
    async createMap(customerId, title) {
        try {
            const docRef = await addDoc(collection(db, "maps"), {
                customerId: customerId,
                title: title || "새 솔루션 맵",
                updatedAt: Date.now(),
                content: {}
            });
            this.state.currentMapId = docRef.id;
            this.notify();
            return docRef.id;
        } catch (e) {
            console.error("Error creating map: ", e);
        }
    }

    setCurrentMap(id) {
        this.state.currentMapId = id;
        this.notify();
    }

    async updateMapTitle(id, newTitle) {
        const mapRef = doc(db, "maps", id);
        await updateDoc(mapRef, {
            title: newTitle,
            updatedAt: Date.now()
        });
    }

    async deleteMap(id) {
        await deleteDoc(doc(db, "maps", id));
        if (this.state.currentMapId === id) this.state.currentMapId = null;
    }

    // Report Actions
    async addReport(customerId, title, contentHTML, type = 'competitive_insight') {
        const docRef = await addDoc(collection(db, "reports"), {
            customerId: customerId,
            title: title,
            contentHTML: contentHTML,
            type: type,
            createdAt: Date.now()
        });
        return docRef.id;
    }

    async deleteReport(id) {
        await deleteDoc(doc(db, "reports", id));
    }

    setCurrentReport(id) {
        this.state.currentReportId = id;
        this.notify();
    }

    // --- Editor Actions (Operate on currentMap) ---
    // These methods modify content locally and then push the update to Firestore

    _getCloneContent() {
        const map = this.getCurrentMap();
        if (!map) return null;
        // Deep clone content to modify
        return JSON.parse(JSON.stringify(map.content || {}));
    }

    async _saveContent(newContent) {
        const map = this.getCurrentMap();
        if (!map) return;
        const mapRef = doc(db, "maps", map.id);
        await updateDoc(mapRef, {
            content: newContent,
            updatedAt: Date.now()
        });
    }

    addDomain(name) {
        const content = this._getCloneContent();
        if (!content) return false;
        if (!name || content[name]) return false;
        
        content[name] = {};
        
        // Optimistic update
        const map = this.getCurrentMap();
        map.content = content; 
        this.notify();

        this._saveContent(content);
        return true;
    }

    renameDomain(oldName, newName) {
        const content = this._getCloneContent();
        if (!content) return false;
        if (!newName || oldName === newName) return true;
        if (content[newName]) return false; 
        
        content[newName] = content[oldName];
        delete content[oldName];
        
        const map = this.getCurrentMap();
        map.content = content;
        this.notify();

        this._saveContent(content);
        return true;
    }

    deleteDomain(name) {
        const content = this._getCloneContent();
        if (content) {
            delete content[name];
            
            const map = this.getCurrentMap();
            map.content = content;
            this.notify();

            this._saveContent(content);
        }
    }

    addCategory(domain, name) {
        const content = this._getCloneContent();
        if (!content) return false;
        if (!name || !content[domain]) return false;
        if (content[domain][name]) return false;
        
        content[domain][name] = [];
        
        const map = this.getCurrentMap();
        map.content = content;
        this.notify();

        this._saveContent(content);
        return true;
    }

    renameCategory(domain, oldName, newName) {
        const content = this._getCloneContent();
        if (!content) return false;
        if (!newName || oldName === newName) return true;
        if (content[domain][newName]) return false;

        content[domain][newName] = content[domain][oldName];
        delete content[domain][oldName];

        const map = this.getCurrentMap();
        map.content = content;
        this.notify();

        this._saveContent(content);
        return true;
    }

    deleteCategory(domain, name) {
        const content = this._getCloneContent();
        if (content && content[domain]) {
            delete content[domain][name];
            
            const map = this.getCurrentMap();
            map.content = content;
            this.notify();

            this._saveContent(content);
        }
    }

    addSolution(domain, category, name, share, manufacturer, painPoints, note) {
        const content = this._getCloneContent();
        if (!content) return 'ERROR';
        const solutions = content[domain]?.[category];
        if (!solutions) return 'INVALID_TARGET';
        
        if (solutions.some(s => s.name === name)) return 'DUPLICATE';
        const total = solutions.reduce((sum, s) => sum + s.share, 0);
        if (total + share > 100) return 'OVERFLOW';

        solutions.push({ name, share, manufacturer, painPoints, note });
        
        const map = this.getCurrentMap();
        map.content = content;
        this.notify();

        this._saveContent(content);
        return 'SUCCESS';
    }

    updateSolution(domain, category, index, name, share, manufacturer, painPoints, note) {
        const content = this._getCloneContent();
        if (!content) return 'ERROR';
        const solutions = content[domain]?.[category];
        if (!solutions || !solutions[index]) return 'INVALID_INDEX';

        if (solutions[index].name !== name && solutions.some(s => s.name === name)) return 'DUPLICATE';
        
        const otherSum = solutions.reduce((sum, s, i) => i === index ? sum : sum + s.share, 0);
        if (otherSum + share > 100) return 'OVERFLOW';

        solutions[index] = { name, share, manufacturer, painPoints, note };
        
        const map = this.getCurrentMap();
        map.content = content;
        this.notify();

        this._saveContent(content);
        return 'SUCCESS';
    }

    deleteSolution(domain, category, index) {
        const content = this._getCloneContent();
        if (content?.content?.[domain]?.[category] || content?.[domain]?.[category]) {
            content[domain][category].splice(index, 1);
            
            const map = this.getCurrentMap();
            map.content = content;
            this.notify();

            this._saveContent(content);
        }
    }
}

export const store = new DataModelStore();
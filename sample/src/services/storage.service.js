/**
 * Secure Storage Service
 * Handles secure storage of sensitive data
 */
class StorageService {
    memory = {};
    strategy = 'session';
    /**
     * Set storage strategy
     */
    setStrategy(strategy) {
        if (['memory', 'session', 'local'].includes(strategy)) {
            this.strategy = strategy;
        }
    }
    /**
     * Get item from storage
     */
    get(key) {
        switch (this.strategy) {
            case 'memory':
                return this.memory[key] || null;
            case 'session':
                return sessionStorage.getItem(key);
            case 'local':
                return localStorage.getItem(key);
            default:
                return null;
        }
    }
    /**
     * Set item in storage
     */
    set(key, value) {
        switch (this.strategy) {
            case 'memory':
                this.memory[key] = value;
                break;
            case 'session':
                sessionStorage.setItem(key, value);
                break;
            case 'local':
                localStorage.setItem(key, value);
                break;
        }
    }
    /**
     * Remove item from storage
     */
    remove(key) {
        switch (this.strategy) {
            case 'memory':
                delete this.memory[key];
                break;
            case 'session':
                sessionStorage.removeItem(key);
                break;
            case 'local':
                localStorage.removeItem(key);
                break;
        }
    }
    /**
     * Clear all storage
     */
    clear() {
        this.memory = {};
        sessionStorage.clear();
        localStorage.clear();
    }
    /**
     * Check if key exists
     */
    has(key) {
        return this.get(key) !== null;
    }
}
export default new StorageService();

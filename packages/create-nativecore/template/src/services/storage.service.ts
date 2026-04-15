/**
 * Secure Storage Service
 * Handles secure storage of sensitive data
 */

type StorageStrategy = 'memory' | 'session' | 'local';

class StorageService {
    private memory: Record<string, string> = {};
    private strategy: StorageStrategy = 'session';
    
    /**
     * Set storage strategy
     */
    setStrategy(strategy: StorageStrategy): void {
        if (['memory', 'session', 'local'].includes(strategy)) {
            this.strategy = strategy;
        }
    }
    
    /**
     * Get item from storage
     */
    get(key: string): string | null {
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
    set(key: string, value: string): void {
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
    remove(key: string): void {
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
    clear(): void {
        this.memory = {};
        sessionStorage.clear();
        localStorage.clear();
    }
    
    /**
     * Check if key exists
     */
    has(key: string): boolean {
        return this.get(key) !== null;
    }
}

export default new StorageService();

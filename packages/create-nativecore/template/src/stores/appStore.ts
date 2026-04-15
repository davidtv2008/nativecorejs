/**
 * Global Application Store
 * Manages global application state
 */
import { useState } from '../core/state.js';
import type { State } from '../core/state.js';

export interface User {
    id: string | number;
    email: string;
    name?: string;
    [key: string]: any;
}

class AppStore {
    user: State<User | null>;
    isLoading: State<boolean>;
    error: State<string | null>;
    count: State<number>;
    
    constructor() {
        this.user = useState<User | null>(null);
        this.isLoading = useState<boolean>(false);
        this.error = useState<string | null>(null);
        this.count = useState<number>(0);
    }
    
    setUser(user: User | null): void {
        this.user.value = user;
    }
    
    setLoading(loading: boolean): void {
        this.isLoading.value = loading;
    }
    
    setError(error: string | null): void {
        this.error.value = error;
    }
    
    clearError(): void {
        this.error.value = null;
    }
    
    incrementCount(amount: number = 1): void {
        this.count.value += amount;
    }
    
    decrementCount(amount: number = 1): void {
        this.count.value -= amount;
    }
    
    resetCount(): void {
        this.count.value = 0;
    }
}

export const store = new AppStore();

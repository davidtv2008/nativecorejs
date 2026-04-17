/**
 * UI State Store
 * Manages UI-specific state
 */
import { useState } from '@core/state.js';
import type { State } from '@core/state.js';

class UIStore {
    sidebarOpen: State<boolean>;
    theme: State<'light' | 'dark'>;
    notifications: State<any[]>;
    
    constructor() {
        this.sidebarOpen = useState<boolean>(false);
        this.theme = useState<'light' | 'dark'>('light');
        this.notifications = useState<any[]>([]);
    }
    
    toggleSidebar(): void {
        this.sidebarOpen.value = !this.sidebarOpen.value;
    }
    
    setTheme(theme: 'light' | 'dark'): void {
        this.theme.value = theme;
    }
    
    addNotification(notification: any): void {
        this.notifications.value = [...this.notifications.value, notification];
    }
    
    removeNotification(id: string): void {
        this.notifications.value = this.notifications.value.filter(n => n.id !== id);
    }
}

export const uiStore = new UIStore();



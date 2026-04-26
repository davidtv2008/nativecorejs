/**
 * UI State Store
 *
 * Module-level singleton — initialized once on first import and shared by every
 * controller, component, or utility that imports it.
 *
 * Sidebar collapsed state is persisted to localStorage here so that no other
 * file needs to touch localStorage directly — the store is the single source of truth.
 */
import { useState } from '@core/state.js';
import { pausePageCleanupCollection, resumePageCleanupCollection } from '@core/pageCleanupRegistry.js';
import type { State } from '@core/state.js';


// ─── Types ────────────────────────────────────────────────────────────────────

export type Theme = 'light' | 'dark';

export type Notification = {
    id:      string;
    message: string;
    type:    'info' | 'success' | 'warning' | 'error';
};


// ─── Module-level state (survives navigation) ─────────────────────────────────
//
// Wrapped in pause/resume so PageCleanupRegistry never tears these down
// when the router navigates to a new page.

pausePageCleanupCollection();

const _sidebarCollapsed = useState<boolean>(
    localStorage.getItem('sidebar-collapsed') === 'true',
);

const _theme = useState<Theme>(
    (localStorage.getItem('theme') as Theme) ?? 'light',
);

const _notifications = useState<Notification[]>([]);

resumePageCleanupCollection();


// ─── Store ────────────────────────────────────────────────────────────────────

class UIStore {

    /** Whether the sidebar is collapsed. Persisted across page refreshes. */
    readonly sidebarCollapsed: State<boolean> = _sidebarCollapsed;

    /** Active colour theme. Persisted across page refreshes. */
    readonly theme: State<Theme> = _theme;

    /** In-app notification queue. */
    readonly notifications: State<Notification[]> = _notifications;


    // ── Sidebar ───────────────────────────────────────────────────────────────

    toggleSidebarCollapsed(): void {
        this.sidebarCollapsed.value = !this.sidebarCollapsed.value;
        localStorage.setItem('sidebar-collapsed', String(this.sidebarCollapsed.value));
    }

    setSidebarCollapsed(collapsed: boolean): void {
        this.sidebarCollapsed.value = collapsed;
        localStorage.setItem('sidebar-collapsed', String(collapsed));
    }


    // ── Theme ─────────────────────────────────────────────────────────────────

    setTheme(value: Theme): void {
        this.theme.value = value;
        localStorage.setItem('theme', value);
        document.documentElement.setAttribute('data-theme', value);
    }


    // ── Notifications ─────────────────────────────────────────────────────────

    addNotification(notification: Notification): void {
        this.notifications.value = [...this.notifications.value, notification];
    }

    removeNotification(id: string): void {
        this.notifications.value = this.notifications.value.filter(n => n.id !== id);
    }

}

export const uiStore = new UIStore();

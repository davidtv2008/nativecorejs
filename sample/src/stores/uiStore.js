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
// ─── Module-level state (survives navigation) ─────────────────────────────────
//
// Wrapped in pause/resume so PageCleanupRegistry never tears these down
// when the router navigates to a new page.
pausePageCleanupCollection();
const _sidebarCollapsed = useState(localStorage.getItem('sidebar-collapsed') === 'true');
const _theme = useState(localStorage.getItem('theme') ?? 'light');
const _notifications = useState([]);
resumePageCleanupCollection();
// ─── Store ────────────────────────────────────────────────────────────────────
class UIStore {
    /** Whether the sidebar is collapsed. Persisted across page refreshes. */
    sidebarCollapsed = _sidebarCollapsed;
    /** Active colour theme. Persisted across page refreshes. */
    theme = _theme;
    /** In-app notification queue. */
    notifications = _notifications;
    // ── Sidebar ───────────────────────────────────────────────────────────────
    toggleSidebarCollapsed() {
        this.sidebarCollapsed.value = !this.sidebarCollapsed.value;
        localStorage.setItem('sidebar-collapsed', String(this.sidebarCollapsed.value));
    }
    setSidebarCollapsed(collapsed) {
        this.sidebarCollapsed.value = collapsed;
        localStorage.setItem('sidebar-collapsed', String(collapsed));
    }
    // ── Theme ─────────────────────────────────────────────────────────────────
    setTheme(value) {
        this.theme.value = value;
        localStorage.setItem('theme', value);
        document.documentElement.setAttribute('data-theme', value);
    }
    // ── Notifications ─────────────────────────────────────────────────────────
    addNotification(notification) {
        this.notifications.value = [...this.notifications.value, notification];
    }
    removeNotification(id) {
        this.notifications.value = this.notifications.value.filter(n => n.id !== id);
    }
}
export const uiStore = new UIStore();

/**
 * Sidebar bridge
 *
 * Keeps the #app grid class in sync with uiStore.sidebarCollapsed so that
 * the CSS Grid layout can adjust the sidebar column width without needing
 * to query the component directly.
 *
 * uiStore is the single source of truth — no localStorage reads here.
 * effect() auto-runs on every state change, no manual watch/unwatch needed.
 */
import { effect } from '@core/state.js';
import { pausePageCleanupCollection, resumePageCleanupCollection } from '@core/pageCleanupRegistry.js';
import { dom } from '@core-utils/dom.js';
import { uiStore } from '@stores/uiStore.js';


export function initSidebar() {

    const app = dom.$<HTMLElement>('#app');
    if (!app) return;

    // This effect must survive every navigation — wrap in pause/resume so the
    // router's flushPageCleanups() never disposes it.
    pausePageCleanupCollection();

    effect(() => {
        app.classList.toggle('sidebar-collapsed', uiStore.sidebarCollapsed.value);
    });

    resumePageCleanupCollection();

}

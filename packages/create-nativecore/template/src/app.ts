/**
 * Main Application Entry Point
 *
 * Boot order:
 *   1. Verify any existing JWT session with the server (keeps users logged in on refresh)
 *   2. Lazy-load Web Components registered in components/registry.ts
 *   3. Expose a frozen router API on window for use inside component templates
 *   4. Register the auth middleware (redirects unauthenticated users away from protected routes)
 *   5. Register all routes from routes/routes.ts
 *   6. Start the router (begins listening for navigation events and renders the first view)
 *   7. Initialize sidebar state
 *   8. Load dev tools (localhost only — never ships to production)
 *
 * Keep this file minimal. Business logic belongs in controllers and services.
 * Routes belong in routes/routes.ts. Components belong in components/registry.ts.
 */
import router from '@core/router.js';
import auth from '@services/auth.service.js';
import type { User } from '@services/auth.service.js';
import api from '@services/api.service.js';
import { createMiddleware } from '@core/createMiddleware.js';
import { authMiddleware } from '@middleware/auth.middleware.js';
import { registerRoutes, protectedRoutes } from '@routes/routes.js';
import { initSidebar } from '@utils/sidebar.js';
import { initLazyComponents } from '@core/lazyComponents.js';
import { dom } from '@core-utils/dom.js';
import { pausePageCleanupCollection, resumePageCleanupCollection } from '@core/pageCleanupRegistry.js';
import '@components/registry.js'; // side-effect import: registers all lazy components

function isLocalhost(): boolean {
    const hostname = window.location.hostname;
    return hostname === 'localhost' || 
        hostname === '127.0.0.1' || 
        hostname.startsWith('192.168.') ||
        hostname.endsWith('.local');
}

/**
 * Sync sidebar visibility with the current auth state and route.
 * The sidebar is only shown when the user is authenticated AND on a protected route.
 * Called after every navigation and after auth state changes.
 */
function updateSidebarVisibility() {
    const isAuthenticated = auth.isAuthenticated();
    const currentPath = window.location.pathname;
    const isProtectedRoute = protectedRoutes.some(route => currentPath.startsWith(route));
    const app = dom.$('#app');

    if (isAuthenticated && isProtectedRoute) {
        document.body.classList.add('sidebar-enabled');
        app?.classList.remove('no-sidebar');
    } else {
        document.body.classList.remove('sidebar-enabled');
        app?.classList.add('no-sidebar');
    }
}

/**
 * On page load, check whether a stored JWT token is still valid by hitting /auth/verify.
 * If the token is expired or the server rejects it, the user is logged out silently.
 * This prevents a page refresh from dropping a valid session.
 */
async function verifyExistingSession(): Promise<void> {
    if (!auth.getToken()) {
        return; // no token stored — nothing to verify
    }

    try {
        const response = await api.get<{ authenticated: boolean; user?: User }>('/auth/verify');
        if (!response?.authenticated || !response.user) {
            auth.logout();
            return;
        }

        auth.setUser(response.user);
    } catch {
        // Network error or 401 — clear the stale session
        auth.logout();
    }
}

async function init(){
    await verifyExistingSession();

    // Register and prepare lazy-loaded Web Components before the first route renders
    await initLazyComponents();
    
    // Expose a minimal, frozen router API on window so components can navigate
    // without importing the router directly. Frozen to prevent runtime tampering.
    Object.defineProperty(window, 'router', {
        value: Object.freeze({
            navigate: router.navigate.bind(router),
            replace: router.replace.bind(router),
            back: router.back.bind(router),
            getCurrentRoute: router.getCurrentRoute.bind(router),
        }),
        writable: false,
        configurable: false,
    });
    
    // @middleware — registered middleware (auto-updated by make:middleware)
    router.use(createMiddleware('auth', authMiddleware));

    // Register all app routes (defined in routes/routes.ts)
    registerRoutes(router);

    // Start the router: match the current URL and render the first view.
    // Pause collection so that any effects or trackers created during app-level
    // bootstrap (before the first page controller runs) are never flushed by
    // subsequent navigations.
    pausePageCleanupCollection();
    router.start();
    resumePageCleanupCollection();
    
    initSidebar();
    
    // When auth state changes (login / logout), update sidebar and redirect if needed.
    // The 'auth-change' event is dispatched by auth.service.ts.
    window.addEventListener('auth-change', () => {
        const isAuth = auth.isAuthenticated();
        if (!isAuth) {
            router.replace('/login');
            document.body.classList.remove('sidebar-enabled');
            const app = dom.$('#app');
            app?.classList.remove('sidebar-collapsed');
            app?.classList.add('no-sidebar');
            // Reset sidebar collapse state so the next login starts fresh
            localStorage.removeItem('sidebar-collapsed');
            const sidebar = dom.$('#appSidebar');
            sidebar?.removeAttribute('collapsed');
            dom.$('.app-layout')?.classList.remove('sidebar-collapsed');
        } else {
            updateSidebarVisibility();
        }
    });
    
    // After each navigation the router dispatches 'pageloaded' — re-sync sidebar visibility
    window.addEventListener('pageloaded', () => {
        updateSidebarVisibility();
    });
    
    initDevTools();
}

/**
 * Load HMR and the component inspector dev tools.
 * SECURITY: guarded by isLocalhost() — these modules are never loaded in production.
 * The build script also strips the entire .nativecore/ import block from the production bundle.
 */
function initDevTools(): void {
    if (!isLocalhost()) {
        return;
    }
    
    Promise.all([
        import('@dev/hmr.js'),
        import('@dev/denc-tools.js'),
        import('@dev/devOverlay.js'),
    ])
        .then(([, , { initDevOverlay }]) => {
            console.warn('[NativeCore] Dev tools loaded');
            (window as any).__NATIVECORE_DEV__ = true;
            initDevOverlay();
        })
        .catch(() => {
            // Dev tools not available - that's fine in production
        });
}

init();




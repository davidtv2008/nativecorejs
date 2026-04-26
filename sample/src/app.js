/**
 * Main Application Entry Point
 *
 * Boot order:
 *   1. Verify any existing JWT session with the server (keeps users logged in on refresh)
 *   2. Lazy-load Web Components registered in components/registry.js
 *   3. Expose a frozen router API on window for use inside component templates
 *   4. Register the auth middleware (redirects unauthenticated users away from protected routes)
 *   5. Register all routes from routes/routes.js
 *   6. Start the router (begins listening for navigation events and renders the first view)
 *   7. Initialize sidebar state
 *   8. Load dev tools (localhost only — never ships to production)
 *
 * Keep this file minimal. Business logic belongs in controllers and services.
 * Routes belong in routes/routes.js. Components belong in components/registry.js.
 */
import router from '@core/router.js';
import auth from '@services/auth.service.js';
import api from '@services/api.service.js';
import { createMiddleware } from '@core/createMiddleware.js';
import { authMiddleware } from '@middleware/auth.middleware.js';
import { registerRoutes } from '@routes/routes.js';
import { initSidebar } from '@utils/sidebar.js';
import { initLazyComponents } from '@core/lazyComponents.js';
import { dom } from '@core-utils/dom.js';
import { pausePageCleanupCollection, resumePageCleanupCollection } from '@core/pageCleanupRegistry.js';
import '@components/registry.js';

function isLocalhost() {
    const hostname = window.location.hostname;
    return hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.') ||
        hostname.endsWith('.local');
}

function updateSidebarVisibility() {
    const isAuthenticated = auth.isAuthenticated();
    const currentPath = window.location.pathname;
    const authProtectedPaths = router.getPathsForMiddleware('auth');
    const isProtectedRoute = authProtectedPaths.some(route => currentPath.startsWith(route));
    const app = dom.$('#app');

    if (isAuthenticated && isProtectedRoute) {
        document.body.classList.add('sidebar-enabled');
        app?.classList.remove('no-sidebar');
    } else {
        document.body.classList.remove('sidebar-enabled');
        app?.classList.add('no-sidebar');
    }
}

async function verifyExistingSession() {
    if (!auth.getToken()) {
        return;
    }

    try {
        const response = await api.get('/auth/verify');
        if (!response?.authenticated || !response.user) {
            auth.logout();
            return;
        }

        auth.setUser(response.user);
    } catch {
        auth.logout();
    }
}

async function init() {
    await verifyExistingSession();
    await initLazyComponents();

    // Expose router globally for components (frozen to prevent XSS manipulation)
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
    registerRoutes(router);

    pausePageCleanupCollection();
    router.start();
    resumePageCleanupCollection();

    initSidebar();

    window.addEventListener('auth-change', () => {
        const isAuth = auth.isAuthenticated();
        if (!isAuth) {
            router.replace('/login');
            document.body.classList.remove('sidebar-enabled');
            dom.$('#app')?.classList.add('no-sidebar');
        } else {
            updateSidebarVisibility();
        }
    });

    window.addEventListener('pageloaded', () => {
        updateSidebarVisibility();
    });

    initDevTools();
}

function initDevTools() {
    if (!isLocalhost()) {
        return;
    }

    Promise.all([
        import('@dev/hmr.js'),
        import('@dev/denc-tools.js'),
        import('@dev/devOverlay.js'),
    ])
        .then(([, , { initDevOverlay }]) => {
            window.__NATIVECORE_DEV__ = true;
            initDevOverlay();
        })
        .catch(() => {
            // Dev tools not available.
        });
}

init();

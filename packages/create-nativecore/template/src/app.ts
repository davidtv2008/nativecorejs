/**
 * Main Application Entry Point
 *
 * Boot order:
 *   1. Lazy-load Web Components registered in components/registry.ts
 *   2. Expose a frozen router API on window for use inside component templates
 *   3. Register middleware (add your own via make:middleware — none ship by default)
 *   4. Register all routes from routes/routes.ts
 *   5. Start the router (begins listening for navigation events and renders the first view)
 *   6. Initialize sidebar helpers (no-op until shell chrome is opted in)
 *   7. Load dev tools (localhost only — never ships to production)
 *
 * Keep this file minimal. Business logic belongs in controllers and services.
 * Routes belong in routes/routes.ts. Components belong in components/registry.ts.
 *
 * Auth is intentionally not included. Add your own middleware with
 * `npm run make:middleware` and register it with createMiddleware() before
 * protecting route groups in routes/routes.ts.
 */
import router from '@core/router.js';
import { registerRoutes } from '@routes/routes.js';
import { initSidebar } from '@utils/sidebar.js';
import { initLazyComponents } from '@core/lazyComponents.js';
import { dom } from '@core-utils/dom.js';
import { pausePageCleanupCollection, resumePageCleanupCollection } from '@core/pageCleanupRegistry.js';
import '@components/registry.js'; // side-effect import: registers all lazy components

function isLocalhost(): boolean {
    // Never treat Capacitor's WebView as localhost — it uses https://localhost as its
    // internal origin but is a production native app, not a dev server.
    if ((window as any).Capacitor?.isNativePlatform?.()) return false;
    const hostname = window.location.hostname;
    return hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.') ||
        hostname.endsWith('.local');
}

/**
 * Sync sidebar visibility with the current route.
 * Skipped while the default minimal shell is active (no chrome in the DOM).
 * When you opt into app-header / app-sidebar / app-footer, switch #app to
 * class="no-sidebar" and this helper will show the sidebar on protected paths.
 */
function updateSidebarVisibility() {
    const app = dom.$('#app');
    if (!app || app.classList.contains('minimal-shell')) {
        return;
    }

    const currentPath = window.location.pathname;
    const protectedPaths = router.getPathsForMiddleware('auth');
    const isProtectedRoute = protectedPaths.some(route => currentPath.startsWith(route));

    if (isProtectedRoute) {
        document.body.classList.add('sidebar-enabled');
        app.classList.remove('no-sidebar');
    } else {
        document.body.classList.remove('sidebar-enabled');
        app.classList.add('no-sidebar');
    }
}

async function init() {
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

    // @middleware — register middleware here (auto-updated by make:middleware)
    // Example:
    //   import { createMiddleware } from '@core/createMiddleware.js';
    //   import { authMiddleware } from '@middleware/auth.middleware.js';
    //   router.use(createMiddleware('auth', authMiddleware));

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

    // After each navigation the router dispatches 'pageloaded' — re-sync sidebar visibility
    window.addEventListener('pageloaded', () => {
        updateSidebarVisibility();
    });

    initDevTools();
}

/**
 * Load HMR and the component inspector dev tools.
 * SECURITY: localhost only — never in production, Capacitor, SSG, or automation
 * (Puppeteer sets navigator.webdriver; SSG also sets window.__NATIVECORE_SSG__).
 * Production deployment preparation excludes .nativecore/dev from _deploy.
 */
function initDevTools(): void {
    if (
        !isLocalhost() ||
        Boolean(navigator.webdriver) ||
        (window as any).__NATIVECORE_SSG__ === true
    ) {
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
        .catch((err) => {
            // Dev tools not available in production builds; log in local so failures are visible.
            console.error('[NativeCore] Dev tools failed to load:', err);
        });
}

init();

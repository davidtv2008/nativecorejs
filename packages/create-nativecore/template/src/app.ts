/**
 * Main Application Entry Point
 */
import router from '@core/router.js';
import auth from './services/auth.service.js';
import type { User } from './services/auth.service.js';
import api from './services/api.service.js';
import { authMiddleware } from './middleware/auth.middleware.js';
import { registerRoutes, protectedRoutes } from './routes/routes.js';
import { initSidebar } from './utils/sidebar.js';
import { initLazyComponents } from '@core/lazyComponents.js';
import { dom } from '@core-utils/dom.js';
import './components/registry.js';

function isLocalhost(): boolean {
    const hostname = window.location.hostname;
    return hostname === 'localhost' || 
        hostname === '127.0.0.1' || 
        hostname.startsWith('192.168.') ||
        hostname.endsWith('.local');
}

function updateSidebarVisibility() {
    const isAuthenticated = auth.isAuthenticated();
    const currentPath = window.location.pathname;
    const isProtectedRoute = protectedRoutes.some(route => currentPath.startsWith(route));
    const app = dom.$('#app');

    // Show sidebar only when authenticated AND on a protected route
    if (isAuthenticated && isProtectedRoute) {
        document.body.classList.add('sidebar-enabled');
        app?.classList.remove('no-sidebar');
    } else {
        document.body.classList.remove('sidebar-enabled');
        app?.classList.add('no-sidebar');
    }
}

async function verifyExistingSession(): Promise<void> {
    if (!auth.getToken()) {
        return;
    }

    try {
        const response = await api.get<{ authenticated: boolean; user?: User }>('/auth/verify');
        if (!response?.authenticated || !response.user) {
            auth.logout();
            return;
        }

        auth.setUser(response.user);
    } catch {
        auth.logout();
    }
}

async function init(){
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
    
    router.use(authMiddleware);
    registerRoutes(router);
    router.start();
    
    initSidebar();
    
    // Update sidebar on auth changes
    window.addEventListener('auth-change', () => {
        const isAuth = auth.isAuthenticated();
        if (!isAuth) {
            router.replace('/login');
            document.body.classList.remove('sidebar-enabled');
            const app = dom.$('#app');
            app?.classList.remove('sidebar-collapsed');
            app?.classList.add('no-sidebar');
            // Reset sidebar to expanded so next login starts fresh
            localStorage.removeItem('sidebar-collapsed');
            const sidebar = dom.$('#appSidebar');
            sidebar?.removeAttribute('collapsed');
            dom.$('.app-layout')?.classList.remove('sidebar-collapsed');
        } else {
            updateSidebarVisibility();
        }
    });
    
    // Update sidebar on navigation
    window.addEventListener('pageloaded', () => {
        updateSidebarVisibility();
    });
    
    // Initialize Dev Tools (ONLY in development - localhost)
    initDevTools();
}

/**
 * Initialize Dev Tools
 * SECURITY: Only loads on localhost, completely excluded from production builds
 */
function initDevTools(): void {
    if (!isLocalhost()) {
        return; // SECURITY: Never load dev tools on production
    }
    
    // Load HMR and dev tools (both TypeScript modules now)
    Promise.all([
        import('../.nativecore/hmr.js'),
        import('../.nativecore/denc-tools.js')
    ])
        .then(() => {
            console.warn('[NativeCore] Dev tools loaded');
            (window as any).__NATIVECORE_DEV__ = true;
        })
        .catch(() => {
            // Dev tools not available - that's fine in production
        });
}

init();




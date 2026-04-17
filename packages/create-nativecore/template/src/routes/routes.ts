/**
 * Route Configuration
 */
import { bustCache } from '../utils/cacheBuster.js';
import type { ControllerFunction } from '../core/router.js';

function lazyController(controllerName: string, controllerPath: string): ControllerFunction {
    return async (...args: any[]) => {
        const module = await import(bustCache(controllerPath));
        return module[controllerName](...args);
    };
}

export function registerRoutes(router: any): void {
    router
        // Static marketing pages — cache for 5 min, serve stale instantly while refreshing in background
        .register('/', 'src/views/public/home.html', lazyController('homeController', '../controllers/home.controller.js'))
        .cache({ ttl: 300, revalidate: true })

        // Auth page — never cache (always fresh)
        .register('/login', 'src/views/public/login.html', lazyController('loginController', '../controllers/login.controller.js'))

        // Protected pages — short cache, revalidate in background
        .register('/dashboard', 'src/views/protected/dashboard.html', lazyController('dashboardController', '../controllers/dashboard.controller.js'))
        .cache({ ttl: 30, revalidate: true });
}

export const protectedRoutes = ['/dashboard'];

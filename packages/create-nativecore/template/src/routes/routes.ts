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
        .cache({ ttl: 300, revalidate: true })        .cache({ ttl: 600, revalidate: true })
        .register('/docs', 'src/views/public/docs.html', lazyController('docsController', '../controllers/docs.controller.js'))
        .cache({ ttl: 300 })

        // Auth page — never cache (always fresh)
        .register('/login', 'src/views/public/login.html', lazyController('loginController', '../controllers/login.controller.js'))

        // Component library — cache for 2 min, block on stale (content changes rarely but must be accurate)
        .register('/components', 'src/views/public/components.html', lazyController('componentsController', '../controllers/components.controller.js'))
        .cache({ ttl: 120 })

        // Protected pages — short cache, revalidate in background
        .register('/dashboard', 'src/views/protected/dashboard.html', lazyController('dashboardController', '../controllers/dashboard.controller.js'))
        .cache({ ttl: 30, revalidate: true })
        .register('/under-construction', 'src/views/protected/under-construction.html')
        .register('/user/:id', 'src/views/protected/user-detail.html', lazyController('userDetailController', '../controllers/user-detail.controller.js'))
        .cache({ ttl: 60, revalidate: true })

        .register('/testpage', 'src/views/public/testpage.html', lazyController('testpageController', '../controllers/testpage.controller.js'))}

export const protectedRoutes = ['/dashboard', '/user', '/under-construction'];

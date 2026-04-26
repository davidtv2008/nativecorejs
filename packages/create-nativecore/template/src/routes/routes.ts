/**
 * Route Configuration
 */
import { createLazyController } from '@core/lazyController.js';
import type { Router } from '@core/router.js';

const lazyController = createLazyController(import.meta.url);

export function registerRoutes(r: Router): void {
    // @group:public
    r.group({}, (r) => {
        r.register('/', 'src/views/public/home.html', lazyController('homeController', '../controllers/home.controller.js'))
         .cache({ ttl: 300, revalidate: true });

        r.register('/login', 'src/views/public/login.html', lazyController('loginController', '../controllers/login.controller.js'));
    });

    // @group:protected
    r.group({ middleware: ['auth'] }, (r) => {
        r.register('/dashboard', 'src/views/protected/dashboard.html', lazyController('dashboardController', '../controllers/dashboard.controller.js'))
         .cache({ ttl: 30, revalidate: true });
    });
}

/**
 * Paths that use the `auth` middleware — always read via the router after
 * `registerRoutes(router)` (for example in app shell / sidebar logic):
 *   router.getPathsForMiddleware('auth')
 */


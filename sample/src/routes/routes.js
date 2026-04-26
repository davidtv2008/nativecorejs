/**
 * Route Configuration
 */
import { createLazyController } from '@core/lazyController.js';
import router from '@core/router.js';

const lazyController = createLazyController(import.meta.url);

export function registerRoutes(router) {
    // @group:public
    router.group({}, (router) => {
        router.register('/', 'src/views/public/home.html', lazyController('homeController', '../controllers/home.controller.js'))
         .cache({ ttl: 300, revalidate: true });
        router.register('/login', 'src/views/public/login.html', lazyController('loginController', '../controllers/login.controller.js'))
        .cache({ ttl: 300, revalidate: true });
    });

    // @group:protected
    router.group({ middleware: ['auth'] }, (router) => {
        router.register('/dashboard', 'src/views/protected/dashboard.html', lazyController('dashboardController', '../controllers/dashboard.controller.js'))
         .cache({ ttl: 30, revalidate: true });
    });
}

/**
 * Paths that use the `auth` middleware — read at runtime after registerRoutes():
 *   router.getPathsForMiddleware('auth')
 */

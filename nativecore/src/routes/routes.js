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
        router.register('/login', 'src/views/public/login.html', lazyController('loginController', '../controllers/login.controller.js'));
        router.register('/docs', 'src/views/public/docs.html', lazyController('docsController', '../controllers/docs.controller.js'));
    });

    // @group:protected
    router.group({ middleware: ['auth'] }, (router) => {
        router.register('/dashboard', 'src/views/protected/dashboard.html', lazyController('dashboardController', '../controllers/dashboard.controller.js'))
         .cache({ ttl: 30, revalidate: true });
    });
}

export function getProtectedRoutes() {
    return router.getPathsForMiddleware('auth');
}

//export const protectedRoutes = router.getPathsForMiddleware('auth');

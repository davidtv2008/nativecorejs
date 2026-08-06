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
    });

    // Protected routes — start with no middleware tags; after npm run make:middleware,
    // change middleware: [] to e.g. middleware: ['auth'] and register it in app.ts.
    // @group:protected
    r.group({ middleware: [] }, (r) => {
        // npm run make:view (answer protected) inserts routes here
    });
}

/**
 * Paths that use a middleware tag — read at runtime after registerRoutes():
 *   router.getPathsForMiddleware('auth')
 */

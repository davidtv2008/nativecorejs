/**
 * createMiddleware
 *
 * Wraps a MiddlewareFunction so it only runs when the navigated route carries
 * a specific middleware tag. Routes acquire tags via router.group({ middleware: [...] }).
 *
 * This keeps each middleware function focused on its own logic — it doesn't need
 * to know which routes it applies to. The tag declaration in routes.ts is the
 * single source of truth.
 *
 * Usage in app.ts:
 *   import { createMiddleware } from '@core/createMiddleware.js';
 *   router.use(createMiddleware('auth', authMiddleware));
 *   router.use(createMiddleware('verified', emailVerifiedMiddleware));
 */
import router from './router.js';
import type { MiddlewareFunction, RouteMatch } from './router.js';

export function createMiddleware(tag: string, fn: MiddlewareFunction): MiddlewareFunction {
    return (route: RouteMatch, state?: any): Promise<boolean> | boolean => {
        const tags = router.getTagsForPath(route.path);
        if (!tags.includes(tag)) return true;
        return fn(route, state);
    };
}

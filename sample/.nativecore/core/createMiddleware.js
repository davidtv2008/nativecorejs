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
export function createMiddleware(tag, fn) {
    return (route, state) => {
        const tags = router.getTagsForPath(route.path);
        if (!tags.includes(tag))
            return true;
        return fn(route, state);
    };
}

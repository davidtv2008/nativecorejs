/**
 * Authentication Middleware
 * Enforces access control for routes tagged with the 'auth' middleware group.
 *
 * This function is wrapped by createMiddleware('auth', ...) in app.ts, so it
 * only runs when the navigated route carries the 'auth' tag. No need to
 * consult protectedRoutes manually — the tag is the source of truth.
 */
import auth from '../services/auth.service.js';
import router from '@core/router.js';
import type { RouteMatch } from '@core/router.js';

export async function authMiddleware(_route: RouteMatch): Promise<boolean> {
    const isAuthenticated = auth.isAuthenticated();

    if (!isAuthenticated) {
        router.replace('/login');
        return false;
    }

    return true;
}


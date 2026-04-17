/**
 * Authentication Middleware
 * Enforces access control for protected routes in the single-shell SPA
 */
import auth from '../services/auth.service.js';
import router from '@core/router.js';
import { protectedRoutes } from '../routes/routes.js';
import type { RouteMatch } from '@core/router.js';

export async function authMiddleware(route: RouteMatch): Promise<boolean> {
    const isProtected = protectedRoutes.some(path => route.path.startsWith(path));
    const isAuthenticated = auth.isAuthenticated();
    
    // Protected route accessed without authentication
    // Redirect to login page
    if (isProtected && !isAuthenticated) {
        router.replace('/login');
        return false;
    }
    
    // Note: Shell switching is now handled by the router before middleware runs
    return true;
}



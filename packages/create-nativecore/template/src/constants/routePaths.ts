/**
 * Application Routes
 */

export const ROUTES = {
    HOME: '/',
    ABOUT: '/about',
    LOGIN: '/login',
    
    DASHBOARD: '/dashboard',
    USER_DETAIL: '/users/:id',
    PROFILE: '/profile',
} as const;

export default ROUTES;

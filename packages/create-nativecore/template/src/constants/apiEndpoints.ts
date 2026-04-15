/**
 * API Endpoint Constants
 */

export const API_ENDPOINTS = {
    AUTH: {
        LOGIN: '/auth/login',
        LOGOUT: '/auth/logout',
        REFRESH: '/auth/refresh',
        VERIFY: '/auth/verify',
    },
    
    DASHBOARD: {
        STATS: '/dashboard/stats',
        ACTIVITY: '/dashboard/activity',
    },
    
    USERS: {
        LIST: '/users',
        DETAIL: (id: string | number) => `/users/${id}`,
        CREATE: '/users',
        UPDATE: (id: string | number) => `/users/${id}`,
        DELETE: (id: string | number) => `/users/${id}`,
    },
} as const;

export default API_ENDPOINTS;

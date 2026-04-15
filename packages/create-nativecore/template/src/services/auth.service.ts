/**
 * Authentication Service
 * Handles JWT token management and user authentication
 */
import storage from './storage.service.js';

// Types
export interface User {
    id: string | number;
    email: string;
    name?: string;
    [key: string]: any;
}

export interface TokenPayload {
    exp?: number;
    [key: string]: any;
}

type AuthEvent = 'login' | 'logout';
type AuthCallback = (event: AuthEvent) => void;

class AuthService {
    private readonly TOKEN_KEY = 'access_token';
    private readonly REFRESH_TOKEN_KEY = 'refresh_token';
    private readonly USER_KEY = 'user_data';
    private listeners: AuthCallback[] = [];
    
    constructor() {
        storage.setStrategy('session');
    }
    
    /**
     * Set authentication tokens
     */
    setTokens(accessToken: string, refreshToken: string | null = null): void {
        if (!accessToken || accessToken === 'undefined') {
            console.error('Cannot set undefined token');
            return;
        }
        storage.set(this.TOKEN_KEY, accessToken);
        if (refreshToken && refreshToken !== 'undefined') {
            storage.set(this.REFRESH_TOKEN_KEY, refreshToken);
        }
        this.notifyListeners('login');
        window.dispatchEvent(new CustomEvent('auth-change'));
    }
    
    /**
     * Get access token
     */
    getToken(): string | null {
        const token = storage.get(this.TOKEN_KEY);
        if (!token || token === 'undefined' || token === 'null') {
            return null;
        }
        return token;
    }
    
    /**
     * Get refresh token
     */
    getRefreshToken(): string | null {
        return storage.get(this.REFRESH_TOKEN_KEY);
    }
    
    /**
     * Set user data
     */
    setUser(user: User): void {
        storage.set(this.USER_KEY, JSON.stringify(user));
    }
    
    /**
     * Get user data
     */
    getUser(): User | null {
        const userData = storage.get(this.USER_KEY);
        if (!userData || userData === 'undefined' || userData === 'null') {
            return null;
        }
        try {
            return JSON.parse(userData);
        } catch (error) {
            console.error('Error parsing user data:', error);
            return null;
        }
    }
    
    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean {
        const token = this.getToken();
        if (!token) return false;

        if (this.isTokenExpired(token)) {
            this.logout();
            return false;
        }

        return true;
    }
    
    /**
     * Check if JWT token is expired
     */
    isTokenExpired(token: string): boolean {
        try {
            const payload = this.decodeToken(token);
            if (!payload.exp) return false;
            
            const currentTime = Date.now() / 1000;
            return payload.exp < currentTime;
        } catch {
            return true;
        }
    }
    
    /**
     * Decode JWT token
     */
    decodeToken(token: string): TokenPayload {
        try {
            const base64Url = token.split('.')[1];
            if (!base64Url) {
                throw new Error('Invalid token');
            }

            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const paddedBase64 = base64.padEnd(base64.length + ((4 - base64.length % 4) % 4), '=');
            const jsonPayload = atob(paddedBase64);
            return JSON.parse(jsonPayload);
        } catch {
            throw new Error('Invalid token');
        }
    }
    
    /**
     * Logout user
     */
    logout(): void {
        storage.remove(this.TOKEN_KEY);
        storage.remove(this.REFRESH_TOKEN_KEY);
        storage.remove(this.USER_KEY);
        this.notifyListeners('logout');
        window.dispatchEvent(new CustomEvent('auth-change'));
    }
    
    /**
     * Subscribe to auth state changes
     */
    subscribe(callback: AuthCallback): () => void {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }
    
    /**
     * Notify listeners
     */
    private notifyListeners(event: AuthEvent): void {
        this.listeners.forEach(callback => callback(event));
    }
    
    /**
     * Get authorization header
     */
    getAuthHeader(): Record<string, string> {
        const token = this.getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }
}

export default new AuthService();

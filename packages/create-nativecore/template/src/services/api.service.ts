/**
 * API Service
 * Reusable service for making backend API calls
 */
import auth from './auth.service.js';

type QueryPrimitive = string | number | boolean | null;
type QueryKeyValue = QueryPrimitive | QueryKeyObject | QueryKeyValue[];
type QueryKeyObject = { [key: string]: QueryKeyValue | undefined };

export type ApiQueryKey = readonly QueryKeyValue[];

export interface ApiCacheOptions {
    ttl: number;
    revalidate?: boolean;
    params?: Record<string, string | number | boolean | null | undefined>;
    forceRefresh?: boolean;
    cacheKey?: string;
    queryKey?: ApiQueryKey;
    tags?: string[];
}

interface CacheEntry<T = unknown> {
    data: T;
    cachedAt: number;
    ttl: number;
    queryKey?: ApiQueryKey;
    tags: string[];
}

class ApiService {
    private baseURL = this.resolveBaseURL();
    private defaultHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    private responseCache = new Map<string, CacheEntry>();
    private inFlightRequests = new Map<string, Promise<unknown>>();
    private queryKeyIndex = new Map<string, Set<string>>();
    private tagIndex = new Map<string, Set<string>>();

    constructor() {
        auth.subscribe(event => {
            if (event === 'logout') {
                this.clearCache();
            }
        });
    }

    private resolveBaseURL(): string {
        if (typeof window === 'undefined') {
            return '/api';
        }

        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.endsWith('.local')) {
            return '/api';
        }

        return 'https://api.nativecorejs.com';
    }

    private isAbsoluteURL(endpoint: string): boolean {
        return /^https?:\/\//i.test(endpoint);
    }
    
    /**
     * Set base URL
     */
    setBaseURL(url: string): void {
        this.baseURL = url;
    }

    clearCache(): void {
        this.responseCache.clear();
        this.inFlightRequests.clear();
        this.queryKeyIndex.clear();
        this.tagIndex.clear();
    }

    invalidateCache(match: string | RegExp): void {
        for (const key of Array.from(this.responseCache.keys())) {
            const shouldDelete = typeof match === 'string'
                ? key.includes(match)
                : match.test(key);

            if (shouldDelete) {
                this.deleteCacheEntry(key);
            }
        }
    }

    invalidateQuery(queryKey: ApiQueryKey, options: { exact?: boolean } = {}): void {
        const target = this.serializeQueryKey(queryKey);

        for (const [serializedQueryKey, cacheKeys] of this.queryKeyIndex.entries()) {
            const matches = options.exact
                ? serializedQueryKey === target
                : serializedQueryKey === target || serializedQueryKey.startsWith(`${target}|`);

            if (!matches) {
                continue;
            }

            for (const cacheKey of Array.from(cacheKeys)) {
                this.deleteCacheEntry(cacheKey);
            }
        }
    }

    invalidateTags(tags: string | string[]): void {
        const tagList = Array.isArray(tags) ? tags : [tags];

        for (const tag of tagList) {
            const cacheKeys = this.tagIndex.get(tag);
            if (!cacheKeys) {
                continue;
            }

            for (const cacheKey of Array.from(cacheKeys)) {
                this.deleteCacheEntry(cacheKey);
            }
        }
    }
    
    /**
     * Make HTTP request
     */
    async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const url = this.isAbsoluteURL(endpoint) ? endpoint : `${this.baseURL}${endpoint}`;
        
        const config: RequestInit = {
            ...options,
            headers: {
                ...this.defaultHeaders,
                ...auth.getAuthHeader(),
                ...options.headers,
            } as HeadersInit,
        };
        
        try {
            const response = await fetch(url, config);
            
            const data = await this.parseResponse(response);
            
            if (!response.ok) {
                // Don't logout on 401 for login endpoint - it's just invalid credentials
                if (response.status === 401 && !endpoint.includes('/auth/login')) {
                    auth.logout();
                    window.dispatchEvent(new CustomEvent('unauthorized'));
                    throw new Error('Unauthorized - please login again');
                }
                
                // Try to get error message from response (supports both 'error' and 'message' fields)
                const errorMessage = (data as any).error || (data as any).message || `HTTP ${response.status}`;
                throw new Error(errorMessage);
            }
            
            return data as T;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
    
    /**
     * Parse response
     */
    private async parseResponse(response: Response): Promise<any> {
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }
        
        return await response.text();
    }
    
    /**
     * GET request
     */
    async get<T = any>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        
        return this.request<T>(url, { method: 'GET' });
    }

    async getCached<T = any>(endpoint: string, options: ApiCacheOptions): Promise<T> {
        const cacheKey = this.buildCacheKey(endpoint, options);
        const cached = this.responseCache.get(cacheKey) as CacheEntry<T> | undefined;
        const now = Date.now();
        const ttlMs = Math.max(options.ttl, 0) * 1000;
        const isFresh = !!cached && ttlMs > 0 && (now - cached.cachedAt) < ttlMs;
        const isStale = !!cached && ttlMs > 0 && !isFresh;

        if (!options.forceRefresh) {
            if (isFresh && cached) {
                return cached.data;
            }

            if (isStale && cached && options.revalidate) {
                this.refreshCachedRequest<T>(cacheKey, endpoint, options);
                return cached.data;
            }
        }

        if (!options.forceRefresh) {
            const inFlight = this.inFlightRequests.get(cacheKey) as Promise<T> | undefined;
            if (inFlight) {
                return inFlight;
            }
        }

        const requestPromise = this.get<T>(endpoint, options.params ?? {})
            .then(data => {
                this.setCacheEntry(cacheKey, {
                    data,
                    cachedAt: Date.now(),
                    ttl: options.ttl,
                    queryKey: options.queryKey,
                    tags: options.tags ?? [],
                });
                this.inFlightRequests.delete(cacheKey);
                return data;
            })
            .catch(error => {
                this.inFlightRequests.delete(cacheKey);
                throw error;
            });

        this.inFlightRequests.set(cacheKey, requestPromise as Promise<unknown>);
        return requestPromise;
    }
    
    /**
     * POST request
     */
    async post<T = any>(endpoint: string, body: any = {}): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }
    
    /**
     * PUT request
     */
    async put<T = any>(endpoint: string, body: any = {}): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }
    
    /**
     * PATCH request
     */
    async patch<T = any>(endpoint: string, body: any = {}): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(body),
        });
    }
    
    /**
     * DELETE request
     */
    async delete<T = any>(endpoint: string): Promise<T> {
        return this.request<T>(endpoint, { method: 'DELETE' });
    }

    private buildCacheKey(endpoint: string, options: ApiCacheOptions): string {
        if (options.queryKey) {
            return `q:${this.serializeQueryKey(options.queryKey)}`;
        }

        if (options.cacheKey) {
            return options.cacheKey;
        }

        const queryString = new URLSearchParams(
            Object.entries(options.params ?? {}).reduce<Record<string, string>>((accumulator, [key, value]) => {
                if (value !== undefined && value !== null) {
                    accumulator[key] = String(value);
                }
                return accumulator;
            }, {})
        ).toString();

        return queryString ? `${endpoint}?${queryString}` : endpoint;
    }

    private refreshCachedRequest<T>(cacheKey: string, endpoint: string, options: ApiCacheOptions): void {
        if (this.inFlightRequests.has(cacheKey)) {
            return;
        }

        const refreshPromise = this.get<T>(endpoint, options.params ?? {})
            .then(data => {
                this.setCacheEntry(cacheKey, {
                    data,
                    cachedAt: Date.now(),
                    ttl: options.ttl,
                    queryKey: options.queryKey,
                    tags: options.tags ?? [],
                });
                this.inFlightRequests.delete(cacheKey);
                return data;
            })
            .catch(() => {
                this.inFlightRequests.delete(cacheKey);
                return undefined;
            });

        this.inFlightRequests.set(cacheKey, refreshPromise as Promise<unknown>);
    }

    private setCacheEntry<T>(cacheKey: string, entry: CacheEntry<T>): void {
        this.deleteCacheEntry(cacheKey);
        this.responseCache.set(cacheKey, entry);

        if (entry.queryKey) {
            const serializedQueryKey = this.serializeQueryKey(entry.queryKey);
            const existingKeys = this.queryKeyIndex.get(serializedQueryKey) ?? new Set<string>();
            existingKeys.add(cacheKey);
            this.queryKeyIndex.set(serializedQueryKey, existingKeys);
        }

        for (const tag of entry.tags) {
            const existingKeys = this.tagIndex.get(tag) ?? new Set<string>();
            existingKeys.add(cacheKey);
            this.tagIndex.set(tag, existingKeys);
        }
    }

    private deleteCacheEntry(cacheKey: string): void {
        const existingEntry = this.responseCache.get(cacheKey);

        this.responseCache.delete(cacheKey);
        this.inFlightRequests.delete(cacheKey);

        if (!existingEntry) {
            return;
        }

        if (existingEntry.queryKey) {
            const serializedQueryKey = this.serializeQueryKey(existingEntry.queryKey);
            const existingKeys = this.queryKeyIndex.get(serializedQueryKey);
            if (existingKeys) {
                existingKeys.delete(cacheKey);
                if (existingKeys.size === 0) {
                    this.queryKeyIndex.delete(serializedQueryKey);
                }
            }
        }

        for (const tag of existingEntry.tags) {
            const existingKeys = this.tagIndex.get(tag);
            if (existingKeys) {
                existingKeys.delete(cacheKey);
                if (existingKeys.size === 0) {
                    this.tagIndex.delete(tag);
                }
            }
        }
    }

    private serializeQueryKey(queryKey: ApiQueryKey): string {
        return queryKey.map(part => this.stableSerialize(part)).join('|');
    }

    private stableSerialize(value: QueryKeyValue | undefined): string {
        if (value === undefined) {
            return 'undefined';
        }

        if (value === null) {
            return 'null';
        }

        if (Array.isArray(value)) {
            return `[${value.map(item => this.stableSerialize(item)).join(',')}]`;
        }

        if (typeof value === 'object') {
            const sortedKeys = Object.keys(value).sort();
            return `{${sortedKeys.map(key => `${key}:${this.stableSerialize(value[key])}`).join(',')}}`;
        }

        return JSON.stringify(value);
    }
}

export default new ApiService();

/**
 * API Service
 * Reusable service for making backend API calls
 */
import auth from './auth.service.js';
class ApiService {
    baseURL = this.resolveBaseURL();
    defaultHeaders = {
        'Content-Type': 'application/json',
    };
    responseCache = new Map();
    inFlightRequests = new Map();
    queryKeyIndex = new Map();
    tagIndex = new Map();
    isRefreshing = false;
    refreshQueue = [];
    constructor() {
        auth.subscribe(event => {
            if (event === 'logout') {
                this.clearCache();
            }
        });
    }
    resolveBaseURL() {
        if (typeof window === 'undefined') {
            return '/api';
        }
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.endsWith('.local')) {
            return '/api';
        }
        return '/api';
    }
    isAbsoluteURL(endpoint) {
        return /^https?:\/\//i.test(endpoint);
    }
    /**
     * Set base URL
     */
    setBaseURL(url) {
        this.baseURL = url;
    }
    clearCache() {
        this.responseCache.clear();
        this.inFlightRequests.clear();
        this.queryKeyIndex.clear();
        this.tagIndex.clear();
    }
    invalidateCache(match) {
        for (const key of Array.from(this.responseCache.keys())) {
            const shouldDelete = typeof match === 'string'
                ? key.includes(match)
                : match.test(key);
            if (shouldDelete) {
                this.deleteCacheEntry(key);
            }
        }
    }
    invalidateQuery(queryKey, options = {}) {
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
    invalidateTags(tags) {
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
     * Attempt to refresh the access token using the stored refresh token.
     * Queues concurrent requests that arrive during an in-flight refresh.
     */
    async attemptTokenRefresh() {
        const refreshToken = auth.getRefreshToken();
        if (!refreshToken)
            return null;
        if (this.isRefreshing) {
            return new Promise(resolve => {
                this.refreshQueue.push(resolve);
            });
        }
        this.isRefreshing = true;
        try {
            const response = await fetch(`${this.baseURL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: refreshToken }),
            });
            if (!response.ok) {
                this.refreshQueue.forEach(cb => cb(null));
                this.refreshQueue = [];
                return null;
            }
            const data = await response.json();
            const newToken = data.access_token;
            if (!newToken) {
                this.refreshQueue.forEach(cb => cb(null));
                this.refreshQueue = [];
                return null;
            }
            auth.setTokens(newToken, data.refresh_token ?? null);
            this.refreshQueue.forEach(cb => cb(newToken));
            this.refreshQueue = [];
            return newToken;
        }
        catch {
            this.refreshQueue.forEach(cb => cb(null));
            this.refreshQueue = [];
            return null;
        }
        finally {
            this.isRefreshing = false;
        }
    }
    /**
     * Make HTTP request
     */
    async request(endpoint, options = {}) {
        const url = this.isAbsoluteURL(endpoint) ? endpoint : `${this.baseURL}${endpoint}`;
        const buildHeaders = () => ({
            ...this.defaultHeaders,
            ...auth.getAuthHeader(),
            ...options.headers,
        });
        const config = { ...options, headers: buildHeaders() };
        try {
            const response = await fetch(url, config);
            const data = await this.parseResponse(response);
            if (!response.ok) {
                const isAuthEndpoint = endpoint.includes('/auth/login') || endpoint.includes('/auth/refresh');
                if (response.status === 401 && !isAuthEndpoint) {
                    const newToken = await this.attemptTokenRefresh();
                    if (newToken) {
                        // Retry the original request with the fresh token
                        const retryConfig = { ...options, headers: buildHeaders() };
                        const retryResponse = await fetch(url, retryConfig);
                        const retryData = await this.parseResponse(retryResponse);
                        if (!retryResponse.ok) {
                            auth.logout();
                            window.dispatchEvent(new CustomEvent('unauthorized'));
                            throw new Error('Unauthorized - please login again');
                        }
                        return retryData;
                    }
                    auth.logout();
                    window.dispatchEvent(new CustomEvent('unauthorized'));
                    throw new Error('Unauthorized - please login again');
                }
                const errorMessage = data.error || data.message || `HTTP ${response.status}`;
                throw new Error(errorMessage);
            }
            return data;
        }
        catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
    /**
     * Parse response
     */
    async parseResponse(response) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }
        return await response.text();
    }
    /**
     * GET request
     */
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.request(url, { method: 'GET' });
    }
    async getCached(endpoint, options) {
        const cacheKey = this.buildCacheKey(endpoint, options);
        const cached = this.responseCache.get(cacheKey);
        const now = Date.now();
        const ttlMs = Math.max(options.ttl, 0) * 1000;
        const isFresh = !!cached && ttlMs > 0 && (now - cached.cachedAt) < ttlMs;
        const isStale = !!cached && ttlMs > 0 && !isFresh;
        if (!options.forceRefresh) {
            if (isFresh && cached) {
                return cached.data;
            }
            if (isStale && cached && options.revalidate) {
                this.refreshCachedRequest(cacheKey, endpoint, options);
                return cached.data;
            }
        }
        if (!options.forceRefresh) {
            const inFlight = this.inFlightRequests.get(cacheKey);
            if (inFlight) {
                return inFlight;
            }
        }
        const requestPromise = this.get(endpoint, options.params ?? {})
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
        this.inFlightRequests.set(cacheKey, requestPromise);
        return requestPromise;
    }
    /**
     * POST request
     */
    async post(endpoint, body = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }
    /**
     * PUT request
     */
    async put(endpoint, body = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }
    /**
     * PATCH request
     */
    async patch(endpoint, body = {}) {
        return this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(body),
        });
    }
    /**
     * DELETE request
     */
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
    buildCacheKey(endpoint, options) {
        if (options.queryKey) {
            return `q:${this.serializeQueryKey(options.queryKey)}`;
        }
        if (options.cacheKey) {
            return options.cacheKey;
        }
        const queryString = new URLSearchParams(Object.entries(options.params ?? {}).reduce((accumulator, [key, value]) => {
            if (value !== undefined && value !== null) {
                accumulator[key] = String(value);
            }
            return accumulator;
        }, {})).toString();
        return queryString ? `${endpoint}?${queryString}` : endpoint;
    }
    refreshCachedRequest(cacheKey, endpoint, options) {
        if (this.inFlightRequests.has(cacheKey)) {
            return;
        }
        const refreshPromise = this.get(endpoint, options.params ?? {})
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
        this.inFlightRequests.set(cacheKey, refreshPromise);
    }
    setCacheEntry(cacheKey, entry) {
        this.deleteCacheEntry(cacheKey);
        this.responseCache.set(cacheKey, entry);
        if (entry.queryKey) {
            const serializedQueryKey = this.serializeQueryKey(entry.queryKey);
            const existingKeys = this.queryKeyIndex.get(serializedQueryKey) ?? new Set();
            existingKeys.add(cacheKey);
            this.queryKeyIndex.set(serializedQueryKey, existingKeys);
        }
        for (const tag of entry.tags) {
            const existingKeys = this.tagIndex.get(tag) ?? new Set();
            existingKeys.add(cacheKey);
            this.tagIndex.set(tag, existingKeys);
        }
    }
    deleteCacheEntry(cacheKey) {
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
    serializeQueryKey(queryKey) {
        return queryKey.map(part => this.stableSerialize(part)).join('|');
    }
    stableSerialize(value) {
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

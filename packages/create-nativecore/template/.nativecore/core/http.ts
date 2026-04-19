/**
 * HTTP Client
 * Enhanced wrapper around fetch with interceptors, retries, and better error handling
 */
import errorHandler from './errorHandler.js';

// Types
export interface HttpConfig extends RequestInit {
    headers?: Record<string, string>;
    params?: Record<string, string>;
    data?: any;
    /** Number of times to retry a failed request (default: 0). */
    retries?: number;
    /** Backoff strategy between retries (default: none). */
    backoff?: 'exponential' | 'linear';
    /** Base delay in ms for the first retry (default: 200). */
    retryDelay?: number;
}

export type RequestInterceptor = (config: HttpConfig) => HttpConfig | Promise<HttpConfig>;
export type ResponseInterceptor = (response: Response) => Response | Promise<Response>;

class HttpClient {
    private baseURL: string = '';
    private defaultHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    private timeout: number = 30000;
    private requestInterceptors: RequestInterceptor[] = [];
    private responseInterceptors: ResponseInterceptor[] = [];
    
    /**
     * Set base URL
     */
    setBaseURL(url: string): this {
        this.baseURL = url;
        return this;
    }
    
    /**
     * Set timeout
     */
    setTimeout(ms: number): this {
        this.timeout = ms;
        return this;
    }
    
    /**
     * Add request interceptor
     */
    addRequestInterceptor(interceptor: RequestInterceptor): this {
        this.requestInterceptors.push(interceptor);
        return this;
    }
    
    /**
     * Add response interceptor
     */
    addResponseInterceptor(interceptor: ResponseInterceptor): this {
        this.responseInterceptors.push(interceptor);
        return this;
    }
    
    /**
     * Make HTTP request
     */
    async request<T = any>(endpoint: string, options: HttpConfig = {}): Promise<T> {
        const url = this.buildURL(endpoint);
        const maxRetries = options.retries ?? 0;
        const backoff = options.backoff;
        const retryDelay = options.retryDelay ?? 200;
        
        let config: HttpConfig = {
            ...options,
            headers: {
                ...this.defaultHeaders,
                ...options.headers,
            },
        };
        
        // Apply request interceptors
        for (const interceptor of this.requestInterceptors) {
            config = await interceptor(config);
        }

        let lastError: unknown;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            if (attempt > 0) {
                const delay = backoff === 'exponential'
                    ? retryDelay * Math.pow(2, attempt - 1)
                    : backoff === 'linear'
                        ? retryDelay * attempt
                        : retryDelay;
                await new Promise<void>(resolve => setTimeout(resolve, delay));
            }
            try {
                const response = await this.fetchWithTimeout(url, config, this.timeout);
            
                // Apply response interceptors
                let processedResponse = response;
                for (const interceptor of this.responseInterceptors) {
                    processedResponse = await interceptor(processedResponse);
                }
            
                const data = await processedResponse.json();
            
                if (!processedResponse.ok) {
                    throw new Error(data.message || `HTTP ${processedResponse.status}`);
                }
            
                return data;
            } catch (error) {
                lastError = error;
                // Do not retry on the last attempt
                if (attempt === maxRetries) {
                    errorHandler.handleError(error as Error, { endpoint, method: config.method });
                    throw error;
                }
            }
        }
        // Should never reach here, but TypeScript needs this
        throw lastError;
    }
    
    /**
     * GET request
     */
    async get<T = any>(endpoint: string, config: HttpConfig = {}): Promise<T> {
        return this.request<T>(endpoint, { ...config, method: 'GET' });
    }
    
    /**
     * POST request
     */
    async post<T = any>(endpoint: string, data?: any, config: HttpConfig = {}): Promise<T> {
        return this.request<T>(endpoint, {
            ...config,
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
    
    /**
     * PUT request
     */
    async put<T = any>(endpoint: string, data?: any, config: HttpConfig = {}): Promise<T> {
        return this.request<T>(endpoint, {
            ...config,
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }
    
    /**
     * DELETE request
     */
    async delete<T = any>(endpoint: string, config: HttpConfig = {}): Promise<T> {
        return this.request<T>(endpoint, { ...config, method: 'DELETE' });
    }
    
    /**
     * PATCH request
     */
    async patch<T = any>(endpoint: string, data?: any, config: HttpConfig = {}): Promise<T> {
        return this.request<T>(endpoint, {
            ...config,
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }
    
    /**
     * Build full URL
     */
    private buildURL(endpoint: string): string {
        if (endpoint.startsWith('http')) return endpoint;
        return `${this.baseURL}${endpoint}`;
    }
    
    /**
     * Fetch with timeout
     */
    private fetchWithTimeout(url: string, config: HttpConfig, timeout: number): Promise<Response> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Request timeout after ${timeout}ms`));
            }, timeout);
            
            fetch(url, config as RequestInit)
                .then(resolve)
                .catch(reject)
                .finally(() => clearTimeout(timer));
        });
    }
}

const http = new HttpClient();
export default http;

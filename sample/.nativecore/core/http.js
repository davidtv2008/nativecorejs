/**
 * HTTP Client
 * Enhanced wrapper around fetch with interceptors, retries, and better error handling
 */
import errorHandler from './errorHandler.js';
class HttpClient {
    baseURL = '';
    defaultHeaders = {
        'Content-Type': 'application/json',
    };
    timeout = 30000;
    requestInterceptors = [];
    responseInterceptors = [];
    /**
     * Set base URL
     */
    setBaseURL(url) {
        this.baseURL = url;
        return this;
    }
    /**
     * Set timeout
     */
    setTimeout(ms) {
        this.timeout = ms;
        return this;
    }
    /**
     * Add request interceptor
     */
    addRequestInterceptor(interceptor) {
        this.requestInterceptors.push(interceptor);
        return this;
    }
    /**
     * Add response interceptor
     */
    addResponseInterceptor(interceptor) {
        this.responseInterceptors.push(interceptor);
        return this;
    }
    /**
     * Make HTTP request
     */
    async request(endpoint, options = {}) {
        const url = this.buildURL(endpoint);
        const maxRetries = options.retries ?? 0;
        const backoff = options.backoff;
        const retryDelay = options.retryDelay ?? 200;
        let config = {
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
        let lastError;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            if (attempt > 0) {
                const delay = backoff === 'exponential'
                    ? retryDelay * Math.pow(2, attempt - 1)
                    : backoff === 'linear'
                        ? retryDelay * attempt
                        : retryDelay;
                await new Promise(resolve => setTimeout(resolve, delay));
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
            }
            catch (error) {
                lastError = error;
                // Do not retry on the last attempt
                if (attempt === maxRetries) {
                    errorHandler.handleError(error, { endpoint, method: config.method });
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
    async get(endpoint, config = {}) {
        return this.request(endpoint, { ...config, method: 'GET' });
    }
    /**
     * POST request
     */
    async post(endpoint, data, config = {}) {
        return this.request(endpoint, {
            ...config,
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
    /**
     * PUT request
     */
    async put(endpoint, data, config = {}) {
        return this.request(endpoint, {
            ...config,
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }
    /**
     * DELETE request
     */
    async delete(endpoint, config = {}) {
        return this.request(endpoint, { ...config, method: 'DELETE' });
    }
    /**
     * PATCH request
     */
    async patch(endpoint, data, config = {}) {
        return this.request(endpoint, {
            ...config,
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }
    /**
     * Build full URL
     */
    buildURL(endpoint) {
        if (endpoint.startsWith('http'))
            return endpoint;
        return `${this.baseURL}${endpoint}`;
    }
    /**
     * Fetch with timeout
     */
    fetchWithTimeout(url, config, timeout) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Request timeout after ${timeout}ms`));
            }, timeout);
            fetch(url, config)
                .then(resolve)
                .catch(reject)
                .finally(() => clearTimeout(timer));
        });
    }
}
const http = new HttpClient();
export default http;

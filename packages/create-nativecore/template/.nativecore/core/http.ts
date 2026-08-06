/**
 * NativeCoreJS HTTP client.
 *
 * A lightweight `fetch` wrapper providing:
 *   - Base URL & default headers
 *   - Per-request timeout via `AbortController`
 *   - Automatic retries with linear / exponential backoff
 *   - In-flight request deduplication for safe (GET) requests
 *   - Request / response interceptors
 *   - `Result`-style helpers (`.safe*`) that never throw
 *
 * The client is published as part of the `nativecorejs` package so that
 * applications which depend on the framework directly (without scaffolding
 * via `create-nativecore`) get the same primitives.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type Backoff = 'linear' | 'exponential' | 'none';

export interface HttpRequestConfig extends Omit<RequestInit, 'method' | 'body' | 'signal'> {
    method?: HttpMethod;
    headers?: Record<string, string>;
    /** Query-string parameters appended to the URL. `null`/`undefined` values are skipped. */
    params?: Record<string, string | number | boolean | null | undefined>;
    /** Body payload. Plain objects are JSON-serialized; `FormData`, `Blob`, strings pass through untouched. */
    body?: unknown;
    /** Override the client default timeout (milliseconds). `0` disables the timeout. */
    timeout?: number;
    /** Number of retry attempts after the initial request fails (default: 0). */
    retries?: number;
    /** Backoff strategy between retries (default: `'exponential'`). */
    backoff?: Backoff;
    /** Base delay in ms used by the backoff strategy (default: 200). */
    retryDelay?: number;
    /** Predicate determining whether a thrown error / non-OK response should be retried. */
    shouldRetry?: (error: HttpError, attempt: number) => boolean;
    /** Caller-supplied AbortSignal. The client wires it into the timeout signal. */
    signal?: AbortSignal;
    /** When true, deduplicate identical in-flight requests (default: true for GET / HEAD). */
    dedupe?: boolean;
}

export type RequestInterceptor = (config: HttpRequestConfig & { url: string }) => (HttpRequestConfig & { url: string }) | Promise<HttpRequestConfig & { url: string }>;
export type ResponseInterceptor = (response: Response) => Response | Promise<Response>;

export interface HttpResult<T> {
    data: T | null;
    error: HttpError | null;
}

export class HttpError extends Error {
    public readonly status: number;
    public readonly response?: Response;
    public readonly cause?: unknown;

    constructor(message: string, status: number, options: { response?: Response; cause?: unknown } = {}) {
        super(message);
        this.name = 'HttpError';
        this.status = status;
        this.response = options.response;
        this.cause = options.cause;
    }
}

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY_DELAY = 200;

function isPlainBody(body: unknown): boolean {
    if (body == null) return false;
    if (typeof body === 'string') return false;
    if (body instanceof FormData) return false;
    if (typeof Blob !== 'undefined' && body instanceof Blob) return false;
    if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) return false;
    if (typeof ArrayBuffer !== 'undefined' && (body instanceof ArrayBuffer || ArrayBuffer.isView(body as ArrayBufferView))) return false;
    return typeof body === 'object';
}

function buildQueryString(params?: HttpRequestConfig['params']): string {
    if (!params) return '';
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null) continue;
        search.append(key, String(value));
    }
    const result = search.toString();
    return result ? `?${result}` : '';
}

function combineSignals(signals: Array<AbortSignal | undefined>): AbortSignal | undefined {
    const real = signals.filter((s): s is AbortSignal => !!s);
    if (real.length === 0) return undefined;
    if (real.length === 1) return real[0];

    const controller = new AbortController();
    for (const sig of real) {
        if (sig.aborted) {
            controller.abort(sig.reason);
            break;
        }
        sig.addEventListener('abort', () => controller.abort(sig.reason), { once: true });
    }
    return controller.signal;
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(new HttpError('Aborted', 0, { cause: signal.reason }));
            return;
        }
        const timer = setTimeout(() => {
            signal?.removeEventListener('abort', onAbort);
            resolve();
        }, ms);
        const onAbort = () => {
            clearTimeout(timer);
            reject(new HttpError('Aborted', 0, { cause: signal?.reason }));
        };
        signal?.addEventListener('abort', onAbort, { once: true });
    });
}

function defaultShouldRetry(error: HttpError): boolean {
    if (error.status === 0) return true; // network failure / timeout
    if (error.status === 408 || error.status === 425 || error.status === 429) return true;
    if (error.status >= 500 && error.status < 600) return true;
    return false;
}

export class HttpClient {
    private baseURL = '';
    private defaultHeaders: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
    private defaultTimeout: number = DEFAULT_TIMEOUT;
    private requestInterceptors: RequestInterceptor[] = [];
    private responseInterceptors: ResponseInterceptor[] = [];
    private inflight: Map<string, Promise<unknown>> = new Map();

    setBaseURL(url: string): this { this.baseURL = url.replace(/\/+$/, ''); return this; }
    setTimeout(ms: number): this { this.defaultTimeout = Math.max(0, ms); return this; }
    setHeader(name: string, value: string): this { this.defaultHeaders[name] = value; return this; }
    removeHeader(name: string): this { delete this.defaultHeaders[name]; return this; }

    addRequestInterceptor(fn: RequestInterceptor): this { this.requestInterceptors.push(fn); return this; }
    addResponseInterceptor(fn: ResponseInterceptor): this { this.responseInterceptors.push(fn); return this; }

    async request<T = unknown>(endpoint: string, config: HttpRequestConfig = {}): Promise<T> {
        const method = (config.method ?? 'GET').toUpperCase() as HttpMethod;
        const isSafe = method === 'GET' || method === 'HEAD';
        const dedupe = config.dedupe ?? isSafe;
        const url = this.buildURL(endpoint, config.params);

        let resolved: HttpRequestConfig & { url: string } = { ...config, method, url };
        for (const interceptor of this.requestInterceptors) {
            resolved = await interceptor(resolved);
        }

        const dedupeKey = dedupe ? `${method} ${resolved.url}` : null;
        if (dedupeKey) {
            const pending = this.inflight.get(dedupeKey);
            if (pending) return pending as Promise<T>;
        }

        const exec = this.execute<T>(resolved);

        if (dedupeKey) {
            this.inflight.set(dedupeKey, exec);
            // Attach cleanup but swallow the rejection on this branch — the
            // original `exec` promise still surfaces it to the caller.
            exec
                .finally(() => {
                    if (this.inflight.get(dedupeKey) === exec) this.inflight.delete(dedupeKey);
                })
                .catch(() => { /* handled by caller via returned `exec` */ });
        }

        return exec;
    }

    async get<T = unknown>(endpoint: string, config: HttpRequestConfig = {}): Promise<T> {
        return this.request<T>(endpoint, { ...config, method: 'GET' });
    }

    async post<T = unknown>(endpoint: string, body?: unknown, config: HttpRequestConfig = {}): Promise<T> {
        return this.request<T>(endpoint, { ...config, method: 'POST', body });
    }

    async put<T = unknown>(endpoint: string, body?: unknown, config: HttpRequestConfig = {}): Promise<T> {
        return this.request<T>(endpoint, { ...config, method: 'PUT', body });
    }

    async patch<T = unknown>(endpoint: string, body?: unknown, config: HttpRequestConfig = {}): Promise<T> {
        return this.request<T>(endpoint, { ...config, method: 'PATCH', body });
    }

    async delete<T = unknown>(endpoint: string, config: HttpRequestConfig = {}): Promise<T> {
        return this.request<T>(endpoint, { ...config, method: 'DELETE' });
    }

    /** `Result`-style wrapper: never throws. Returns `{ data, error }`. */
    async safeRequest<T = unknown>(endpoint: string, config: HttpRequestConfig = {}): Promise<HttpResult<T>> {
        try {
            const data = await this.request<T>(endpoint, config);
            return { data, error: null };
        } catch (err) {
            return { data: null, error: err instanceof HttpError ? err : new HttpError(String((err as Error)?.message ?? err), 0, { cause: err }) };
        }
    }

    safeGet<T = unknown>(endpoint: string, config: HttpRequestConfig = {}): Promise<HttpResult<T>> {
        return this.safeRequest<T>(endpoint, { ...config, method: 'GET' });
    }
    safePost<T = unknown>(endpoint: string, body?: unknown, config: HttpRequestConfig = {}): Promise<HttpResult<T>> {
        return this.safeRequest<T>(endpoint, { ...config, method: 'POST', body });
    }
    safePut<T = unknown>(endpoint: string, body?: unknown, config: HttpRequestConfig = {}): Promise<HttpResult<T>> {
        return this.safeRequest<T>(endpoint, { ...config, method: 'PUT', body });
    }
    safePatch<T = unknown>(endpoint: string, body?: unknown, config: HttpRequestConfig = {}): Promise<HttpResult<T>> {
        return this.safeRequest<T>(endpoint, { ...config, method: 'PATCH', body });
    }
    safeDelete<T = unknown>(endpoint: string, config: HttpRequestConfig = {}): Promise<HttpResult<T>> {
        return this.safeRequest<T>(endpoint, { ...config, method: 'DELETE' });
    }

    private async execute<T>(resolved: HttpRequestConfig & { url: string }): Promise<T> {
        const maxAttempts = Math.max(0, resolved.retries ?? 0) + 1;
        const backoff: Backoff = resolved.backoff ?? 'exponential';
        const baseDelay = resolved.retryDelay ?? DEFAULT_RETRY_DELAY;
        const shouldRetry = resolved.shouldRetry ?? defaultShouldRetry;

        let lastError: HttpError | null = null;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            if (attempt > 1) {
                const wait = backoff === 'exponential'
                    ? baseDelay * Math.pow(2, attempt - 2)
                    : backoff === 'linear'
                        ? baseDelay * (attempt - 1)
                        : baseDelay;
                await delay(wait, resolved.signal);
            }

            try {
                return await this.dispatch<T>(resolved);
            } catch (err) {
                const httpError = err instanceof HttpError
                    ? err
                    : new HttpError(String((err as Error)?.message ?? err), 0, { cause: err });
                lastError = httpError;

                if (attempt === maxAttempts) break;
                if (!shouldRetry(httpError, attempt)) break;
                if (resolved.signal?.aborted) break;
            }
        }

        throw lastError ?? new HttpError('Unknown HTTP failure', 0);
    }

    private async dispatch<T>(resolved: HttpRequestConfig & { url: string }): Promise<T> {
        const timeout = resolved.timeout ?? this.defaultTimeout;
        const timeoutCtrl = timeout > 0 ? new AbortController() : undefined;
        const timer = timeoutCtrl
            ? setTimeout(() => timeoutCtrl.abort(new HttpError(`Request timeout after ${timeout}ms`, 0)), timeout)
            : null;

        const headers: Record<string, string> = { ...this.defaultHeaders, ...(resolved.headers ?? {}) };
        let body: BodyInit | undefined;
        if (resolved.body !== undefined && resolved.body !== null) {
            if (isPlainBody(resolved.body)) {
                body = JSON.stringify(resolved.body);
            } else {
                body = resolved.body as BodyInit;
                if (body instanceof FormData) {
                    delete headers['Content-Type'];
                }
            }
        }

        const init: RequestInit = {
            ...resolved,
            method: resolved.method,
            headers,
            body,
            signal: combineSignals([resolved.signal, timeoutCtrl?.signal]),
        };
        delete (init as Record<string, unknown>).params;
        delete (init as Record<string, unknown>).timeout;
        delete (init as Record<string, unknown>).retries;
        delete (init as Record<string, unknown>).backoff;
        delete (init as Record<string, unknown>).retryDelay;
        delete (init as Record<string, unknown>).shouldRetry;
        delete (init as Record<string, unknown>).dedupe;
        delete (init as Record<string, unknown>).url;

        let response: Response;
        try {
            response = await fetch(resolved.url, init);
        } catch (err) {
            if (timer) clearTimeout(timer);
            if (timeoutCtrl?.signal.aborted) {
                throw new HttpError(`Request timeout after ${timeout}ms`, 0, { cause: err });
            }
            throw new HttpError((err as Error)?.message ?? 'Network error', 0, { cause: err });
        }
        if (timer) clearTimeout(timer);

        for (const interceptor of this.responseInterceptors) {
            response = await interceptor(response);
        }

        if (!response.ok) {
            const errBody = await this.parseBody(response).catch(() => undefined);
            const message = (errBody && typeof errBody === 'object' && 'message' in errBody && typeof (errBody as { message?: unknown }).message === 'string')
                ? (errBody as { message: string }).message
                : `HTTP ${response.status}`;
            throw new HttpError(message, response.status, { response });
        }

        return await this.parseBody(response) as T;
    }

    private async parseBody(response: Response): Promise<unknown> {
        if (response.status === 204 || response.status === 205) return null;
        const contentType = response.headers.get('content-type') ?? '';
        if (contentType.includes('application/json')) return await response.json();
        if (contentType.startsWith('text/')) return await response.text();
        return await response.blob();
    }

    private buildURL(endpoint: string, params?: HttpRequestConfig['params']): string {
        const isAbsolute = /^https?:\/\//i.test(endpoint);
        const base = isAbsolute ? endpoint : `${this.baseURL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
        return `${base}${buildQueryString(params)}`;
    }
}

export const http = new HttpClient();
export default http;

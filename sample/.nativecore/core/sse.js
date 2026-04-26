/**
 * Server-Sent Events (SSE) client
 *
 * Wraps the browser {@link EventSource} API with route-aware cleanup via
 * {@link registerPageCleanup} so connections are closed on navigation.
 *
 * **Limits:** `EventSource` uses GET only and does not support custom request
 * headers. Use cookies (`withCredentials: true`) or query parameters for auth.
 *
 * Auto-reconnect:
 *   The native `EventSource` already retries silently on network errors,
 *   but it never gives up and never tells the caller. This client adds a
 *   bounded reconnection strategy:
 *     - `reconnect.maxRetries` (default 5) caps the number of attempts
 *     - `reconnect.baseDelay` and `reconnect.maxDelay` define an
 *       exponential backoff schedule
 *     - `onReconnect` and `onReconnectFailed` let callers respond
 *   Reconnects are skipped when `signal` has been aborted or the caller
 *   already invoked `disconnect()`.
 */
import { registerPageCleanup } from './pageCleanupRegistry.js';
const DEFAULT_RECONNECT = {
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 30_000,
};
/**
 * Opens an SSE connection, registers page cleanup, and returns `disconnect()`.
 */
export function connectSSE(url, handlers, options = {}) {
    const { parseJson = false, signal, reconnect, ...eventSourceInit } = options;
    if (signal?.aborted) {
        return () => { };
    }
    const reconnectConfig = reconnect === false
        ? null
        : { ...DEFAULT_RECONNECT, ...(reconnect ?? {}) };
    let closed = false;
    let attempt = 0;
    let reconnectTimer = null;
    let es = null;
    let namedListeners = [];
    const parseJsonPayload = (raw) => {
        try {
            return JSON.parse(raw);
        }
        catch (err) {
            console.error('[SSE] JSON parse error:', err);
            return undefined;
        }
    };
    const cleanupCurrentConnection = () => {
        if (!es)
            return;
        for (const { type, fn } of namedListeners) {
            es.removeEventListener(type, fn);
        }
        namedListeners = [];
        es.close();
        es = null;
    };
    const open = () => {
        if (closed)
            return;
        try {
            es = new EventSource(url, eventSourceInit);
        }
        catch (e) {
            console.error('[SSE] EventSource constructor failed:', e);
            scheduleReconnect();
            return;
        }
        es.onopen = () => {
            if (attempt > 0) {
                handlers.onReconnect?.(attempt);
            }
            attempt = 0;
            handlers.onOpen?.();
        };
        es.onmessage = (ev) => {
            if (parseJson) {
                const parsed = parseJsonPayload(ev.data);
                if (parsed === undefined)
                    return;
                if (handlers.onJsonMessage) {
                    handlers.onJsonMessage(parsed, ev);
                }
                else {
                    handlers.onMessage?.(ev.data, ev);
                }
                return;
            }
            handlers.onMessage?.(ev.data, ev);
        };
        es.onerror = (ev) => {
            handlers.onError?.(ev);
            // EventSource transitions to CLOSED only on fatal errors. When it
            // does, we take over reconnection (with a retry cap).
            if (es?.readyState === EventSource.CLOSED) {
                cleanupCurrentConnection();
                scheduleReconnect(ev);
            }
        };
        const eventNames = new Set([
            ...Object.keys(handlers.events ?? {}),
            ...Object.keys(handlers.eventsJson ?? {})
        ]);
        for (const eventName of eventNames) {
            const strFn = handlers.events?.[eventName];
            const jsonFn = parseJson ? handlers.eventsJson?.[eventName] : undefined;
            if (!strFn && !jsonFn)
                continue;
            const listener = (ev) => {
                const me = ev;
                if (jsonFn) {
                    const parsed = parseJsonPayload(me.data);
                    if (parsed === undefined)
                        return;
                    jsonFn(parsed, me);
                }
                else if (strFn) {
                    strFn(me.data, me);
                }
            };
            es.addEventListener(eventName, listener);
            namedListeners.push({ type: eventName, fn: listener });
        }
    };
    const scheduleReconnect = (lastEvent) => {
        if (closed || !reconnectConfig)
            return;
        if (attempt >= reconnectConfig.maxRetries) {
            handlers.onReconnectFailed?.(lastEvent);
            close();
            return;
        }
        attempt += 1;
        const exponential = reconnectConfig.baseDelay * Math.pow(2, attempt - 1);
        const delay = Math.min(exponential, reconnectConfig.maxDelay);
        reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            open();
        }, delay);
    };
    const close = () => {
        if (closed)
            return;
        closed = true;
        signal?.removeEventListener('abort', onAbort);
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
        cleanupCurrentConnection();
    };
    function onAbort() { close(); }
    if (signal)
        signal.addEventListener('abort', onAbort, { once: true });
    registerPageCleanup(close);
    open();
    return close;
}

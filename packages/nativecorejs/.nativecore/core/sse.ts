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

export interface SSEReconnectOptions {
    /** Maximum number of reconnect attempts before giving up. Default: 5. Use `Infinity` to disable the cap. */
    maxRetries?: number;
    /** Base delay in ms for the first reconnect. Default: 1000. */
    baseDelay?: number;
    /** Upper bound on the computed delay in ms. Default: 30_000. */
    maxDelay?: number;
}

export interface SSEConnectOptions extends EventSourceInit {
    /** When true, parses `data` with `JSON.parse` for default and named JSON handlers. Parse failures are logged and skipped. */
    parseJson?: boolean;
    /** When aborted, the connection is closed (same as calling `disconnect()`). */
    signal?: AbortSignal;
    /** Reconnection strategy. Set to `false` to opt out of the bounded reconnect loop. */
    reconnect?: SSEReconnectOptions | false;
}

export interface SSEHandlers {
    onOpen?: () => void;
    /** Fires for default `message` events (no `event:` field). */
    onMessage?: (data: string, ev: MessageEvent) => void;
    /** When `parseJson` is true, receives parsed JSON for default messages. If omitted, `onMessage` receives the raw string. */
    onJsonMessage?: (data: unknown, ev: MessageEvent) => void;
    onError?: (ev: Event) => void;
    /** Handlers for named SSE events (`event: name` in the stream). */
    events?: Record<string, (data: string, ev: MessageEvent) => void>;
    /** When `parseJson` is true, handlers for named events receiving parsed JSON (takes precedence over `events` for that name). */
    eventsJson?: Record<string, (data: unknown, ev: MessageEvent) => void>;
    /** Called once per successful reconnect (after the initial open) with the attempt number that succeeded. */
    onReconnect?: (attempt: number) => void;
    /** Called when reconnection has been exhausted (`maxRetries` reached). */
    onReconnectFailed?: (lastEvent?: Event) => void;
}

const DEFAULT_RECONNECT: Required<SSEReconnectOptions> = {
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 30_000,
};

/**
 * Opens an SSE connection, registers page cleanup, and returns `disconnect()`.
 */
export function connectSSE(
    url: string,
    handlers: SSEHandlers,
    options: SSEConnectOptions = {}
): () => void {
    const { parseJson = false, signal, reconnect, ...eventSourceInit } = options;

    if (signal?.aborted) {
        return () => {};
    }

    const reconnectConfig: Required<SSEReconnectOptions> | null = reconnect === false
        ? null
        : { ...DEFAULT_RECONNECT, ...(reconnect ?? {}) };

    let closed = false;
    let attempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let es: EventSource | null = null;
    let namedListeners: Array<{ type: string; fn: (ev: Event) => void }> = [];

    const parseJsonPayload = (raw: string): unknown | undefined => {
        try {
            return JSON.parse(raw) as unknown;
        } catch (err) {
            console.error('[SSE] JSON parse error:', err);
            return undefined;
        }
    };

    const cleanupCurrentConnection = (): void => {
        if (!es) return;
        for (const { type, fn } of namedListeners) {
            es.removeEventListener(type, fn);
        }
        namedListeners = [];
        es.close();
        es = null;
    };

    const open = (): void => {
        if (closed) return;

        try {
            es = new EventSource(url, eventSourceInit);
        } catch (e) {
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

        es.onmessage = (ev: MessageEvent) => {
            if (parseJson) {
                const parsed = parseJsonPayload(ev.data);
                if (parsed === undefined) return;
                if (handlers.onJsonMessage) {
                    handlers.onJsonMessage(parsed, ev);
                } else {
                    handlers.onMessage?.(ev.data, ev);
                }
                return;
            }
            handlers.onMessage?.(ev.data, ev);
        };

        es.onerror = (ev: Event) => {
            handlers.onError?.(ev);
            // EventSource transitions to CLOSED only on fatal errors. When it
            // does, we take over reconnection (with a retry cap).
            if (es?.readyState === EventSource.CLOSED) {
                cleanupCurrentConnection();
                scheduleReconnect(ev);
            }
        };

        const eventNames = new Set<string>([
            ...Object.keys(handlers.events ?? {}),
            ...Object.keys(handlers.eventsJson ?? {})
        ]);

        for (const eventName of eventNames) {
            const strFn = handlers.events?.[eventName];
            const jsonFn = parseJson ? handlers.eventsJson?.[eventName] : undefined;
            if (!strFn && !jsonFn) continue;

            const listener = (ev: Event) => {
                const me = ev as MessageEvent;
                if (jsonFn) {
                    const parsed = parseJsonPayload(me.data);
                    if (parsed === undefined) return;
                    jsonFn(parsed, me);
                } else if (strFn) {
                    strFn(me.data, me);
                }
            };
            es.addEventListener(eventName, listener);
            namedListeners.push({ type: eventName, fn: listener });
        }
    };

    const scheduleReconnect = (lastEvent?: Event): void => {
        if (closed || !reconnectConfig) return;
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

    const close = (): void => {
        if (closed) return;
        closed = true;
        signal?.removeEventListener('abort', onAbort);
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
        cleanupCurrentConnection();
    };

    function onAbort(): void { close(); }
    if (signal) signal.addEventListener('abort', onAbort, { once: true });

    registerPageCleanup(close);
    open();

    return close;
}

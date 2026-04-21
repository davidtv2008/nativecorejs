/**
 * Server-Sent Events (SSE) client
 *
 * Wraps the browser {@link EventSource} API with route-aware cleanup via
 * {@link registerPageCleanup} so connections are closed on navigation.
 *
 * **Limits:** `EventSource` uses GET only and does not support custom request
 * headers. Use cookies (`withCredentials: true`) or query parameters for auth.
 */
import { registerPageCleanup } from './pageCleanupRegistry.js';

export interface SSEConnectOptions extends EventSourceInit {
    /** When true, parses `data` with `JSON.parse` for default and named JSON handlers. Parse failures are logged and skipped. */
    parseJson?: boolean;
    /** When aborted, the connection is closed (same as calling `disconnect()`). */
    signal?: AbortSignal;
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
}

/**
 * Opens an SSE connection, registers page cleanup, and returns `disconnect()`.
 */
export function connectSSE(
    url: string,
    handlers: SSEHandlers,
    options: SSEConnectOptions = {}
): () => void {
    const { parseJson = false, signal, ...eventSourceInit } = options;

    if (signal?.aborted) {
        return () => {};
    }

    let es: EventSource;
    try {
        es = new EventSource(url, eventSourceInit);
    } catch (e) {
        console.error('[SSE] EventSource constructor failed:', e);
        return () => {};
    }

    const namedListeners: Array<{ type: string; fn: (ev: Event) => void }> = [];

    const parseJsonPayload = (raw: string): unknown | undefined => {
        try {
            return JSON.parse(raw) as unknown;
        } catch (err) {
            console.error('[SSE] JSON parse error:', err);
            return undefined;
        }
    };

    es.onopen = () => {
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
    };

    const eventNames = new Set<string>([
        ...Object.keys(handlers.events ?? {}),
        ...Object.keys(handlers.eventsJson ?? {})
    ]);

    for (const eventName of eventNames) {
        const strFn = handlers.events?.[eventName];
        const jsonFn = parseJson ? handlers.eventsJson?.[eventName] : undefined;

        if (!strFn && !jsonFn) {
            continue;
        }

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

    let closed = false;
    const close = (): void => {
        if (closed) return;
        closed = true;
        signal?.removeEventListener('abort', onAbort);
        for (const { type, fn } of namedListeners) {
            es.removeEventListener(type, fn);
        }
        es.close();
    };

    function onAbort(): void {
        close();
    }

    if (signal) {
        signal.addEventListener('abort', onAbort, { once: true });
    }

    registerPageCleanup(close);

    return close;
}

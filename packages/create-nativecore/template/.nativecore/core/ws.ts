/**
 * WebSocket client for NativeCoreJS.
 *
 * Thin wrapper around the browser `WebSocket` API that adds:
 *   - Route-aware cleanup via {@link registerPageCleanup}
 *   - Bounded exponential-backoff auto-reconnect with a retry cap
 *   - Optional JSON message parsing / stringification
 *   - Outbound message queueing while the socket is opening or
 *     reconnecting, flushed once `OPEN` fires again
 *   - Heartbeat ping support (configurable interval + payload)
 *   - An `AbortSignal` that cleanly tears down the connection
 *
 * Returns a controller object rather than the raw `WebSocket` so the
 * same instance survives across reconnects and queueing stays
 * transparent to callers.
 */
import { registerPageCleanup } from './pageCleanupRegistry.js';

export interface WSReconnectOptions {
    /** Maximum reconnect attempts. Default 5. Use `Infinity` to disable. */
    maxRetries?: number;
    /** Base delay in ms for the first reconnect. Default 1000. */
    baseDelay?: number;
    /** Upper bound on computed delay. Default 30_000. */
    maxDelay?: number;
}

export interface WSHeartbeat {
    /** Interval in ms between pings. */
    interval: number;
    /** Payload sent on each tick. Defaults to the string `"ping"`. Objects are JSON-stringified when `parseJson` is true. */
    message?: unknown;
}

export interface WSConnectOptions {
    /** Subprotocol(s) passed to the `WebSocket` constructor. */
    protocols?: string | string[];
    /** When true, JSON.parse inbound text frames and JSON.stringify non-string sends. Default false. */
    parseJson?: boolean;
    /** Reconnection strategy. Set to `false` to disable reconnection. */
    reconnect?: WSReconnectOptions | false;
    /** When set, sends a heartbeat at the given interval to keep the connection alive. */
    heartbeat?: WSHeartbeat;
    /** When aborted, the socket is closed and reconnects are cancelled. */
    signal?: AbortSignal;
}

export interface WSHandlers {
    onOpen?: (ev: Event) => void;
    onClose?: (ev: CloseEvent) => void;
    onError?: (ev: Event) => void;
    /** Fires for raw text/binary messages when `parseJson` is false. */
    onMessage?: (data: string | ArrayBuffer | Blob, ev: MessageEvent) => void;
    /** Fires with the parsed payload when `parseJson` is true. Parse failures are logged and skipped. */
    onJsonMessage?: (data: unknown, ev: MessageEvent) => void;
    /** Called once per successful reconnect with the attempt number that succeeded. */
    onReconnect?: (attempt: number) => void;
    /** Called when reconnection has been exhausted (`maxRetries` reached). */
    onReconnectFailed?: (lastEvent?: Event | CloseEvent) => void;
}

export interface WSController {
    /** Sends a message. Strings / binaries go through as-is. Plain values are JSON-stringified when `parseJson` is true. Queued while the socket isn't OPEN. */
    send(data: unknown): void;
    /** Explicitly close the connection. Does not trigger reconnection. */
    close(code?: number, reason?: string): void;
    /** Current ready-state. Mirrors the underlying WebSocket.readyState. */
    readonly readyState: number;
    /** True when the underlying socket is OPEN. */
    readonly isOpen: boolean;
}

const DEFAULT_RECONNECT: Required<WSReconnectOptions> = {
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 30_000,
};

function isBinary(data: unknown): boolean {
    if (data instanceof ArrayBuffer) return true;
    if (typeof Blob !== 'undefined' && data instanceof Blob) return true;
    if (ArrayBuffer.isView(data as ArrayBufferView)) return true;
    return false;
}

/**
 * Opens a WebSocket connection, registers page cleanup, and returns a
 * controller. The returned object is stable across reconnects.
 */
export function connectWebSocket(
    url: string,
    handlers: WSHandlers,
    options: WSConnectOptions = {}
): WSController {
    const { protocols, parseJson = false, reconnect, heartbeat, signal } = options;
    const reconnectConfig: Required<WSReconnectOptions> | null = reconnect === false
        ? null
        : { ...DEFAULT_RECONNECT, ...(reconnect ?? {}) };

    let ws: WebSocket | null = null;
    let closed = false;
    let intentionallyClosed = false;
    let attempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    const outbox: unknown[] = [];

    const serializeOutbound = (payload: unknown): string | ArrayBufferLike | Blob | ArrayBufferView => {
        if (typeof payload === 'string' || isBinary(payload)) {
            return payload as string | ArrayBufferLike | Blob | ArrayBufferView;
        }
        if (parseJson) return JSON.stringify(payload);
        return String(payload);
    };

    const flushOutbox = (): void => {
        while (outbox.length && ws && ws.readyState === WebSocket.OPEN) {
            const next = outbox.shift();
            try {
                ws.send(serializeOutbound(next));
            } catch (err) {
                console.error('[ws] send failed:', err);
                outbox.unshift(next);
                return;
            }
        }
    };

    const startHeartbeat = (): void => {
        if (!heartbeat || heartbeatTimer) return;
        heartbeatTimer = setInterval(() => {
            const payload = heartbeat.message ?? 'ping';
            if (ws?.readyState === WebSocket.OPEN) {
                try { ws.send(serializeOutbound(payload)); } catch { /* next tick will retry */ }
            }
        }, heartbeat.interval);
    };

    const stopHeartbeat = (): void => {
        if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
            heartbeatTimer = null;
        }
    };

    const scheduleReconnect = (lastEvent?: Event | CloseEvent): void => {
        if (closed || intentionallyClosed || !reconnectConfig) return;
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

    const open = (): void => {
        if (closed) return;

        try {
            ws = protocols !== undefined ? new WebSocket(url, protocols) : new WebSocket(url);
        } catch (e) {
            console.error('[ws] WebSocket constructor failed:', e);
            scheduleReconnect();
            return;
        }

        ws.onopen = ev => {
            if (attempt > 0) handlers.onReconnect?.(attempt);
            attempt = 0;
            flushOutbox();
            startHeartbeat();
            handlers.onOpen?.(ev);
        };

        ws.onmessage = ev => {
            if (parseJson && typeof ev.data === 'string') {
                try {
                    const parsed = JSON.parse(ev.data);
                    handlers.onJsonMessage?.(parsed, ev);
                } catch (err) {
                    console.error('[ws] JSON parse error:', err);
                }
                return;
            }
            handlers.onMessage?.(ev.data, ev);
        };

        ws.onerror = ev => {
            handlers.onError?.(ev);
        };

        ws.onclose = ev => {
            stopHeartbeat();
            handlers.onClose?.(ev);
            ws = null;
            if (intentionallyClosed || closed) return;
            scheduleReconnect(ev);
        };
    };

    const close = (code?: number, reason?: string): void => {
        if (closed) return;
        closed = true;
        intentionallyClosed = true;
        signal?.removeEventListener('abort', onAbort);
        if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
        stopHeartbeat();
        try { ws?.close(code, reason); } catch { /* ignore */ }
        ws = null;
    };

    function onAbort(): void { close(); }
    if (signal) {
        if (signal.aborted) {
            return { send: () => {}, close: () => {}, readyState: WebSocket.CLOSED, isOpen: false };
        }
        signal.addEventListener('abort', onAbort, { once: true });
    }

    registerPageCleanup(close);
    open();

    return {
        send(data: unknown): void {
            if (closed) return;
            if (ws && ws.readyState === WebSocket.OPEN) {
                try { ws.send(serializeOutbound(data)); return; }
                catch (err) { console.error('[ws] send failed:', err); }
            }
            outbox.push(data);
        },
        close,
        get readyState(): number { return ws?.readyState ?? WebSocket.CLOSED; },
        get isOpen(): boolean { return ws?.readyState === WebSocket.OPEN; },
    };
}

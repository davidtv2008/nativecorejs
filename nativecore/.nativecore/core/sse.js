import { registerPageCleanup } from "./pageCleanupRegistry.js";
const DEFAULT_RECONNECT = {
  maxRetries: 5,
  baseDelay: 1e3,
  maxDelay: 3e4
};
function connectSSE(url, handlers, options = {}) {
  const { parseJson = false, signal, reconnect, ...eventSourceInit } = options;
  if (signal?.aborted) {
    return () => {
    };
  }
  const reconnectConfig = reconnect === false ? null : { ...DEFAULT_RECONNECT, ...reconnect ?? {} };
  let closed = false;
  let attempt = 0;
  let reconnectTimer = null;
  let es = null;
  let namedListeners = [];
  const parseJsonPayload = (raw) => {
    try {
      return JSON.parse(raw);
    } catch (err) {
      console.error("[SSE] JSON parse error:", err);
      return void 0;
    }
  };
  const cleanupCurrentConnection = () => {
    if (!es) return;
    for (const { type, fn } of namedListeners) {
      es.removeEventListener(type, fn);
    }
    namedListeners = [];
    es.close();
    es = null;
  };
  const open = () => {
    if (closed) return;
    try {
      es = new EventSource(url, eventSourceInit);
    } catch (e) {
      console.error("[SSE] EventSource constructor failed:", e);
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
        if (parsed === void 0) return;
        if (handlers.onJsonMessage) {
          handlers.onJsonMessage(parsed, ev);
        } else {
          handlers.onMessage?.(ev.data, ev);
        }
        return;
      }
      handlers.onMessage?.(ev.data, ev);
    };
    es.onerror = (ev) => {
      handlers.onError?.(ev);
      if (es?.readyState === EventSource.CLOSED) {
        cleanupCurrentConnection();
        scheduleReconnect(ev);
      }
    };
    const eventNames = /* @__PURE__ */ new Set([
      ...Object.keys(handlers.events ?? {}),
      ...Object.keys(handlers.eventsJson ?? {})
    ]);
    for (const eventName of eventNames) {
      const strFn = handlers.events?.[eventName];
      const jsonFn = parseJson ? handlers.eventsJson?.[eventName] : void 0;
      if (!strFn && !jsonFn) continue;
      const listener = (ev) => {
        const me = ev;
        if (jsonFn) {
          const parsed = parseJsonPayload(me.data);
          if (parsed === void 0) return;
          jsonFn(parsed, me);
        } else if (strFn) {
          strFn(me.data, me);
        }
      };
      es.addEventListener(eventName, listener);
      namedListeners.push({ type: eventName, fn: listener });
    }
  };
  const scheduleReconnect = (lastEvent) => {
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
  const close = () => {
    if (closed) return;
    closed = true;
    signal?.removeEventListener("abort", onAbort);
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    cleanupCurrentConnection();
  };
  function onAbort() {
    close();
  }
  if (signal) signal.addEventListener("abort", onAbort, { once: true });
  registerPageCleanup(close);
  open();
  return close;
}
export {
  connectSSE
};

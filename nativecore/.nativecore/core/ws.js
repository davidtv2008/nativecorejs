import { registerPageCleanup } from "./pageCleanupRegistry.js";
const DEFAULT_RECONNECT = {
  maxRetries: 5,
  baseDelay: 1e3,
  maxDelay: 3e4
};
function isBinary(data) {
  if (data instanceof ArrayBuffer) return true;
  if (typeof Blob !== "undefined" && data instanceof Blob) return true;
  if (ArrayBuffer.isView(data)) return true;
  return false;
}
function connectWebSocket(url, handlers, options = {}) {
  const { protocols, parseJson = false, reconnect, heartbeat, signal } = options;
  const reconnectConfig = reconnect === false ? null : { ...DEFAULT_RECONNECT, ...reconnect ?? {} };
  let ws = null;
  let closed = false;
  let intentionallyClosed = false;
  let attempt = 0;
  let reconnectTimer = null;
  let heartbeatTimer = null;
  const outbox = [];
  const serializeOutbound = (payload) => {
    if (typeof payload === "string" || isBinary(payload)) {
      return payload;
    }
    if (parseJson) return JSON.stringify(payload);
    return String(payload);
  };
  const flushOutbox = () => {
    while (outbox.length && ws && ws.readyState === WebSocket.OPEN) {
      const next = outbox.shift();
      try {
        ws.send(serializeOutbound(next));
      } catch (err) {
        console.error("[ws] send failed:", err);
        outbox.unshift(next);
        return;
      }
    }
  };
  const startHeartbeat = () => {
    if (!heartbeat || heartbeatTimer) return;
    heartbeatTimer = setInterval(() => {
      const payload = heartbeat.message ?? "ping";
      if (ws?.readyState === WebSocket.OPEN) {
        try {
          ws.send(serializeOutbound(payload));
        } catch {
        }
      }
    }, heartbeat.interval);
  };
  const stopHeartbeat = () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  };
  const scheduleReconnect = (lastEvent) => {
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
  const open = () => {
    if (closed) return;
    try {
      ws = protocols !== void 0 ? new WebSocket(url, protocols) : new WebSocket(url);
    } catch (e) {
      console.error("[ws] WebSocket constructor failed:", e);
      scheduleReconnect();
      return;
    }
    ws.onopen = (ev) => {
      if (attempt > 0) handlers.onReconnect?.(attempt);
      attempt = 0;
      flushOutbox();
      startHeartbeat();
      handlers.onOpen?.(ev);
    };
    ws.onmessage = (ev) => {
      if (parseJson && typeof ev.data === "string") {
        try {
          const parsed = JSON.parse(ev.data);
          handlers.onJsonMessage?.(parsed, ev);
        } catch (err) {
          console.error("[ws] JSON parse error:", err);
        }
        return;
      }
      handlers.onMessage?.(ev.data, ev);
    };
    ws.onerror = (ev) => {
      handlers.onError?.(ev);
    };
    ws.onclose = (ev) => {
      stopHeartbeat();
      handlers.onClose?.(ev);
      ws = null;
      if (intentionallyClosed || closed) return;
      scheduleReconnect(ev);
    };
  };
  const close = (code, reason) => {
    if (closed) return;
    closed = true;
    intentionallyClosed = true;
    signal?.removeEventListener("abort", onAbort);
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    stopHeartbeat();
    try {
      ws?.close(code, reason);
    } catch {
    }
    ws = null;
  };
  function onAbort() {
    close();
  }
  if (signal) {
    if (signal.aborted) {
      return { send: () => {
      }, close: () => {
      }, readyState: WebSocket.CLOSED, isOpen: false };
    }
    signal.addEventListener("abort", onAbort, { once: true });
  }
  registerPageCleanup(close);
  open();
  return {
    send(data) {
      if (closed) return;
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(serializeOutbound(data));
          return;
        } catch (err) {
          console.error("[ws] send failed:", err);
        }
      }
      outbox.push(data);
    },
    close,
    get readyState() {
      return ws?.readyState ?? WebSocket.CLOSED;
    },
    get isOpen() {
      return ws?.readyState === WebSocket.OPEN;
    }
  };
}
export {
  connectWebSocket
};

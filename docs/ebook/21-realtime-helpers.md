# Chapter 21 — Realtime Helpers

Optional WebSocket and SSE helpers vendored in `.nativecore/core`.

These are **connection helpers**, not a full realtime app stack. Deskflow does
not require them — use when you have a server that speaks WS/SSE.

## WebSocket — `connectWebSocket`

```js
import { connectWebSocket } from '@core/ws.js';

const socket = connectWebSocket(
    'wss://example.com/deskflow',
    {
        onOpen: () => console.log('open'),
        onJsonMessage: (data) => console.log(data), // when parseJson: true
        // onMessage: (data, ev) => {}               // raw text/binary when parseJson false
        onClose: () => {},
        onError: () => {},
        onReconnect: (attempt) => {},
        onReconnectFailed: () => {},
    },
    {
        parseJson: true,
        reconnect: { maxRetries: 5, baseDelay: 1000, maxDelay: 30_000 },
        // reconnect: false to disable
        heartbeat: { interval: 15000, message: 'ping' },
        // signal: abortSignal
    }
);

socket.send({ type: 'hello' });
socket.close();
```

Returns a controller: `send`, `close`, `readyState`, `isOpen`.
Registers page cleanup so navigation tears the socket down.

## SSE — `connectSSE`

```js
import { connectSSE } from '@core/sse.js';

const disconnect = connectSSE(
    '/api/events',
    {
        onOpen: () => {},
        onMessage: (data, ev) => {},      // default `message` events (string)
        onJsonMessage: (data, ev) => {},  // when parseJson: true
        onError: () => {},
        events: { notify: (data, ev) => {} },
        eventsJson: { notify: (data, ev) => {} },
        onReconnect: (attempt) => {},
        onReconnectFailed: () => {},
    },
    {
        parseJson: true,
        reconnect: { maxRetries: 5, baseDelay: 1000, maxDelay: 30_000 },
    }
);

disconnect();
```

Returns a `disconnect()` function. Also registers page cleanup.

## Apply to Deskflow (optional)

> **Feature:** Only if you have an events endpoint — show a live “desk ping”.

Skip this chapter’s feature work if you do not. Prefer completing production
chapters first.

## Verify

- [ ] Connect / disconnect without leaking listeners after navigation
- [ ] You read `ws.ts` / `sse.ts` for handler names before inventing APIs

## Next

[Chapter 22 — Capacitor](./22-capacitor.md)

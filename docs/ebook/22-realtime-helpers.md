# Chapter 22 — Realtime Helpers

Most Deskflow features work fine with request/response. But some features —
live notifications, presence indicators, collaborative edits — need a
persistent connection that pushes data to the browser. NativeCoreJS ships two
thin wrappers for exactly that: `connectWebSocket` and `connectSSE`.

These are **connection helpers**, not a full realtime stack. They handle the
repetitive work (reconnection with exponential backoff, heartbeats, page
cleanup on navigation) and get out of the way. You still need a server that
speaks WebSocket or SSE.

This chapter is optional for a standard Deskflow build. Skip the lab if you
do not have a compatible server endpoint. Read the mental model and common
mistakes regardless — they explain patterns that matter even in request/response
apps.

---

## Mental model (30 seconds)

```
connectWebSocket(url, handlers, options)
  → opens a browser WebSocket
  → queues outbound messages while reconnecting
  → calls registerPageCleanup() → closes on navigation
  → returns { send, close, readyState, isOpen }

connectSSE(url, handlers, options)
  → opens a browser EventSource
  → adds a capped retry strategy on top of the native silent retry
  → calls registerPageCleanup() → closes on navigation
  → returns disconnect()
```

Both helpers live in `.nativecore/core/`:

| Module | Import alias |
|--------|-------------|
| `ws.ts` | `@core/ws.js` |
| `sse.ts` | `@core/sse.js` |

---

## WebSocket — `connectWebSocket`

### Minimal example

```js
import { connectWebSocket } from '@core/ws.js';

const socket = connectWebSocket(
    'wss://api.example.com/deskflow',
    {
        onOpen: () => console.log('connected'),
        onClose: () => console.log('closed'),
        onError: (ev) => console.error('error', ev),
        onJsonMessage: (data) => {
            // data is the parsed JSON object
            console.log('received', data);
        },
    },
    {
        parseJson: true,
    }
);
```

### Full options

```js
const socket = connectWebSocket(
    'wss://api.example.com/events',
    {
        onOpen: (ev) => {},
        onClose: (ev) => {},
        onError: (ev) => {},
        onJsonMessage: (data, ev) => {},   // when parseJson: true
        onMessage: (data, ev) => {},       // raw text/binary when parseJson: false
        onReconnect: (attempt) => {},      // called after a successful reconnect
        onReconnectFailed: (lastEvent) => {}, // called when maxRetries is exhausted
    },
    {
        protocols: [],                     // WebSocket subprotocols (optional)
        parseJson: true,                   // JSON.parse inbound; JSON.stringify outbound
        reconnect: {
            maxRetries: 5,                 // default: 5
            baseDelay: 1000,               // ms before first retry, default: 1000
            maxDelay: 30_000,              // upper bound on delay, default: 30000
        },
        // reconnect: false               // disable auto-reconnect entirely
        heartbeat: {
            interval: 15_000,             // ms between pings
            message: 'ping',              // payload (string or any object if parseJson)
        },
        signal: abortController.signal,   // cancel from outside
    }
);

// Use the returned controller:
socket.send({ type: 'subscribe', channel: 'tasks' });
socket.close();
console.log(socket.readyState);          // mirrors WebSocket.readyState
console.log(socket.isOpen);             // true when readyState === OPEN
```

### Send behavior

`send()` never throws when the socket is not yet open. If the socket is
opening or reconnecting, the message is queued and flushed once the connection
reaches `OPEN`. If the socket is intentionally closed, `send()` is a no-op.

### Page cleanup

`connectWebSocket` calls `registerPageCleanup(close)` internally. When the
router navigates away from the current route, the socket is closed and reconnects
are cancelled. You do not need to call `socket.close()` from the controller's
cleanup function — but you can if you want to close earlier (for example, when
the user logs out).

---

## SSE — `connectSSE`

Server-Sent Events are simpler than WebSockets: the server pushes; the client
only reads. Use SSE for one-directional updates (notifications, live counters,
task updates from a background job).

### Minimal example

```js
import { connectSSE } from '@core/sse.js';

const disconnect = connectSSE(
    '/api/events',
    {
        onOpen: () => console.log('SSE connected'),
        onMessage: (data, ev) => {
            console.log('message:', data);
        },
        onError: (ev) => console.error('SSE error', ev),
    }
);

// disconnect() closes the EventSource and cancels reconnects
```

### Named events and JSON

```js
const disconnect = connectSSE(
    '/api/events',
    {
        onJsonMessage: (data, ev) => {
            // fires for default 'message' events when parseJson: true
        },
        events: {
            notify: (data, ev) => {
                // fires for `event: notify` lines in the stream (raw string)
            },
        },
        eventsJson: {
            notify: (data, ev) => {
                // fires for `event: notify` when parseJson: true; takes precedence over events
            },
        },
        onReconnect: (attempt) => {},
        onReconnectFailed: (lastEvent) => {},
    },
    {
        parseJson: true,
        withCredentials: true,               // pass cookies to the SSE endpoint
        reconnect: {
            maxRetries: 5,
            baseDelay: 1000,
            maxDelay: 30_000,
        },
        signal: abortController.signal,
    }
);
```

### SSE limitations

`EventSource` uses GET-only requests and cannot send custom headers. Authenticate
via cookies (`withCredentials: true`) or query parameters. If you need
bidirectional communication or custom headers, use WebSocket instead.

---

## Lab — Add a live desk ping to Deskflow (optional)

Skip this lab if you do not have a server endpoint. Come back when you do.

### What you need on the server

An SSE endpoint at `/api/events` that sends:

```
event: desk-ping
data: {"message":"still here","at":1234567890}

```

### In the controller

In `tasks.controller.js` (or `.ts`), add inside `onMount`:

```js
import { connectSSE } from '@core/sse.js';

// Inside onMount():
const disconnect = connectSSE(
    '/api/events',
    {
        eventsJson: {
            'desk-ping': (data) => {
                console.log('desk ping:', data.message);
                // update a ref: this.pingEl.textContent = data.message;
            },
        },
    },
    { parseJson: true }
);

// Optionally register additional cleanup (the helper already calls
// registerPageCleanup internally, so this is only needed if you want
// to close the stream before navigation):
// return () => { disconnect(); ctrl.destroy(); };
```

### Verify

Navigate to `/tasks`, then to another route. Open the Network tab in DevTools:
the SSE connection should close when you leave `/tasks`. Navigate back — it
should reopen.

---

## Using WebSocket in a controller

```js
import { CoreController } from '@core/controller.js';
import { connectWebSocket } from '@core/ws.js';

export class LiveTasksController extends CoreController {
    onMount() {
        this.assertRefs('statusEl');
        this.status = this.state('connecting...');
        this.bind(this.status, this.statusEl);

        this.socket = connectWebSocket(
            'wss://api.example.com/deskflow',
            {
                onOpen: () => { this.status.value = 'live'; },
                onClose: () => { this.status.value = 'offline'; },
                onJsonMessage: (data) => {
                    if (data.type === 'task-update') {
                        this.handleTaskUpdate(data.payload);
                    }
                },
            },
            { parseJson: true }
        );
    }

    handleTaskUpdate(task) {
        // update your store or re-render the list
    }
}

export function liveTasksController(_params, _state, _loaderData, rootElement) {
    const ctrl = new LiveTasksController(rootElement);
    return () => ctrl.destroy();
}
```

The socket closes automatically on navigation. The cleanup function returned by
the factory only needs to call `ctrl.destroy()` — `destroy()` tears down
`this.on` listeners; the socket teardown was registered separately via
`registerPageCleanup`.

---

## Challenge — Bronze

- [ ] Read `ws.ts` and `sse.ts` source files; note the `registerPageCleanup` call at the bottom of each
- [ ] List the handler names available in `WSHandlers` and `SSEHandlers`
- [ ] Identify the default values for `maxRetries`, `baseDelay`, and `maxDelay`

## Challenge — Silver

- [ ] Add a WebSocket connection to the `/tasks` controller that logs every
  message to the console; verify it closes on navigation (Network tab)
- [ ] Replace the connection with SSE and observe the difference in Network tab

## Challenge — Gold

- [ ] Build a `live-indicator` component that accepts a `status` attribute
  (`"connecting"` / `"live"` / `"offline"`) and renders a colored dot
- [ ] Drive it from a `connectWebSocket` `onOpen` / `onClose` callbacks in the
  tasks controller
- [ ] Write a Vitest test that mounts `live-indicator` with each status value
  and asserts the correct CSS class or text

---

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Inventing handler names | Read `ws.ts` / `sse.ts` source before coding; the exact names are `onOpen`, `onJsonMessage`, etc. |
| Using `onJsonMessage` with `parseJson: false` | Set `parseJson: true`; otherwise `onMessage` receives raw strings |
| Expecting `send()` to throw when disconnected | Messages are queued; errors are logged internally |
| Forgetting `eventsJson` takes precedence over `events` | When both are set for the same event name and `parseJson: true`, only `eventsJson` handler fires |
| Adding a manual `disconnect` call to the factory cleanup | Not wrong, but redundant — `registerPageCleanup` already handles it on navigation |
| Using SSE for bidirectional communication | SSE is read-only; use WebSocket when you need to send data |

---

## Verify

- [ ] You read `ws.ts` and `sse.ts` and can name all handler keys from memory
- [ ] Any connection you open closes cleanly when the route changes (check Network tab)
- [ ] `parseJson: true` is set when using `onJsonMessage` or `eventsJson`

---

## What's next

- [Chapter 23 — Capacitor](./23-capacitor.md) — optional native packaging for
  Android and iOS

If you do not need native mobile packaging, you can skip Chapter 23 and move
directly to [Chapter 24 — i18n helper](./24-i18n-helper.md).

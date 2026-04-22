# Chapter 25 — Real-Time Features and WebSockets

> **What you'll build in this chapter:** Build DevHub's `/notifications` route with a controller-owned WebSocket connection, reactive message rendering using `effect()`, and an exponential-backoff reconnect strategy — verified to leave no orphaned connections after navigation.

Real-time features are where reactive architecture and lifecycle discipline converge. When a user expects instant feedback from a live data source — a chat thread, a dashboard counter, a collaborative document — you need a pattern that opens a connection cleanly, reacts to incoming data, and closes the connection without leaking memory when the user navigates away.

NativeCoreJS is well-suited for real-time work because controllers own a clear lifecycle: they run when a route opens and return a cleanup function that runs when the route closes. This is the exact contract a WebSocket connection needs.

The framework ships two primitives for this chapter:

- **`connectSSE`** — for one-way server→client streams (notifications, metrics, progress events). Bounded reconnect, JSON parsing, and page cleanup built in.
- **`connectWebSocket`** — for two-way channels (chat, collaboration, live cursors). Adds heartbeat support, an outbound message queue that survives reconnects, and an `AbortSignal`-friendly controller.

Both helpers register themselves with the page-cleanup registry, so they close automatically on route change even if you forget to call `close()` yourself.

---

## The Controller as Connection Owner

The controller should open the real-time connection, update reactive state from incoming messages, and close the connection in the returned cleanup function. Nothing else needs to manage the socket lifecycle.

```
Route enters → Controller runs → WebSocket opens
                 ↓
           Messages arrive → state.value = [...messages, newMsg]
                 ↓
           Reactive effect updates the DOM
                 ↓
Route exits → Cleanup runs → socket.close()
```

---

## WebSocket Cleanup Is Mandatory

In a real-time controller, the cleanup function must:

1. Close the socket — `socket.close()`
2. Stop all reactive effects — call each disposer in `disposers`
3. Remove delegated event listeners — `events.cleanup()`

Skip any of these and the socket stays open in the background, receiving messages, keeping state alive, and potentially crashing the next route's controller when both try to write to the same DOM nodes.

---

## Building a Chat Thread Controller

The following example wires a WebSocket to a chat thread view with message rendering, form submission, and full cleanup.

### View HTML (`src/views/protected/chat-thread.html`)

```html
<div data-view="chat-thread">
    <ul id="message-list" data-hook="message-list"></ul>
    <div data-hook="connection-status" class="status"></div>
    <form data-hook="message-form" id="message-form">
        <input
            data-hook="message-input"
            id="message-input"
            type="text"
            placeholder="Type a message…"
            autocomplete="off"
        />
        <nc-button type="submit" variant="primary">Send</nc-button>
    </form>
</div>
```

### Controller (`src/controllers/chat-thread.controller.ts`)

```typescript
import { dom }         from '@core-utils/dom.js';
import { trackEvents } from '@core-utils/events.js';
import { useState, effect } from '@core/state.js';
import { connectWebSocket } from 'nativecorejs';
import router           from '@core/router.js';

interface ChatMessage {
    id:     string;
    author: string;
    body:   string;
}

export async function chatThreadController(params: { threadId: string }): Promise<() => void> {
    // -- Setup ---------------------------------------------------------------
    const events    = trackEvents();
    const disposers: Array<() => void> = [];

    // -- DOM refs ------------------------------------------------------------
    const scope      = dom.view('chat-thread');
    const list       = scope.hook('message-list');
    const statusEl   = scope.hook('connection-status');
    const form       = scope.form('message-form');
    const input      = scope.input('message-input');

    // -- State ---------------------------------------------------------------
    const messages   = useState<ChatMessage[]>([]);
    const connected  = useState(false);

    // -- WebSocket -----------------------------------------------------------
    // `connectWebSocket` ships from `nativecorejs`.  It gives you bounded
    // auto-reconnect, an outbound message queue that survives reconnects,
    // optional JSON parsing, and route-aware cleanup out of the box.
    const protocol  = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socketUrl = `${protocol}//${location.host}/chat/${params.threadId}`;

    const socket = connectWebSocket(socketUrl, {
        onOpen:    () => { connected.value = true; },
        onClose:   () => { connected.value = false; },
        onJsonMessage: (msg: unknown) => {
            const chatMsg = msg as ChatMessage;
            messages.value = [...messages.value, chatMsg];
        },
        onError:   () => {
            if (statusEl) statusEl.textContent = 'Connection error — please refresh.';
        },
        onReconnectFailed: () => {
            if (statusEl) statusEl.textContent = 'Disconnected — please refresh.';
        },
    }, {
        parseJson: true,
        reconnect: { maxRetries: 5, baseDelay: 1_000, maxDelay: 15_000 },
        heartbeat: { interval: 30_000, message: { type: 'ping' } },
    });

    // -- Reactive bindings ---------------------------------------------------
    disposers.push(
        effect(() => {
            if (!list) return;
            list.innerHTML = messages.value
                .map(m => `
                    <li class="message">
                        <strong class="message__author"></strong>
                        <span class="message__body"></span>
                    </li>
                `).join('');

            // Use textContent after rendering to avoid XSS
            const items = list.querySelectorAll('.message');
            messages.value.forEach((m, i) => {
                const el = items[i];
                if (!el) return;
                (el.querySelector('.message__author') as HTMLElement).textContent = m.author;
                (el.querySelector('.message__body') as HTMLElement).textContent   = m.body;
            });

            // Scroll to the latest message
            list.scrollTop = list.scrollHeight;
        }),

        effect(() => {
            if (!statusEl) return;
            statusEl.textContent = connected.value ? 'Connected' : 'Reconnecting…';
            statusEl.setAttribute('data-connected', String(connected.value));
        })
    );

    // -- Events --------------------------------------------------------------
    events.on(form, 'submit', (e: Event) => {
        e.preventDefault();
        if (!input || !input.value.trim()) return;

        if (socket.readyState === WebSocket.OPEN) {
            socket.send({ body: input.value.trim() });
        }
        input.value = '';
    });

    // -- Cleanup -------------------------------------------------------------
    return () => {
        socket.close();
        disposers.forEach(d => d());
        events.cleanup();
    };
}
```

---

## Optimistic Updates

For a smoother feel, add the user's own message to `messages.value` immediately — before the server echoes it back:

```typescript
events.on(form, 'submit', (e: Event) => {
    e.preventDefault();
    const body = input?.value.trim() ?? '';
    if (!body) return;

    // Optimistic: show it immediately with a temp ID
    const optimistic: ChatMessage = {
        id:     `pending-${Date.now()}`,
        author: 'You',
        body,
    };
    messages.value = [...messages.value, optimistic];

    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ body }));
    }
    if (input) input.value = '';
});
```

When the server echoes back the real message, the list will contain a duplicate. Deduplicate by ID in the `message` handler, or reconcile by replacing the `pending-*` entry.

---

## Reconnect on Unexpected Close

Production WebSocket connections drop. Implement a simple exponential backoff reconnect:

```typescript
let reconnectDelay = 1000;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let isCleaning = false;

socket.addEventListener('close', () => {
    connected.value = false;
    if (isCleaning) return; // do not reconnect if we closed intentionally

    reconnectTimer = setTimeout(() => {
        reconnectDelay = Math.min(reconnectDelay * 2, 30_000);
        // In a real implementation, recreate the socket here.
        // For simplicity, navigate to the same route to restart the controller.
        router.navigate(location.pathname);
    }, reconnectDelay);
});

// In the cleanup function:
return () => {
    isCleaning = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    socket.close();
    disposers.forEach(d => d());
    events.cleanup();
};
```

---

## Pattern Summary

| Concern | Approach |
|---|---|
| Connection lifecycle | Open in controller; close in cleanup |
| Incoming data | Update `useState` array; effect re-renders |
| Sending messages | Call `socket.send()` from event handler |
| Optimistic UI | Append to state before the server confirms |
| Connection status | Separate `useState<boolean>` + effect |
| XSS safety | Set `.textContent` — never `innerHTML` with message bodies |
| Reconnect | Track intentional-close flag; use backoff timer |

---

## Done Criteria

- [ ] Navigating to `/notifications` opens a WebSocket connection.
- [ ] Incoming messages are appended to the notifications list reactively without a full re-render.
- [ ] Navigating away from `/notifications` closes the WebSocket (verify in DevTools Network → WS).
- [ ] The reconnect strategy retries with exponential backoff after a disconnect.

---

**Back:** [Chapter 24 — CLI Mastery and the Generator Workflow](./24-cli-and-generators.md)  
**Next:** [Chapter 26 — Internationalization (i18n)](./26-internationalization.md)

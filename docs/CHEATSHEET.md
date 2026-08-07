# NativeCoreJS Cheat Sheet

Single-page reference for create-nativecore apps (vendored `.nativecore/`).
Verified against the current template — see [ebook](./ebook/README.md) for narrative.

**Defaults:** JavaScript scaffold · auth is BYO · prefer `CoreController` / `CoreComponent`.

---

## Reactive state

```js
import { useState, computed, effect, batch } from '@core/state.js';

const count = useState(0);
count.value;                    // read
count.value = 5;                // write
count.set(prev => prev + 1);    // updater
count.watch(v => console.log(v));

const doubled = computed(() => count.value * 2);
const stop = effect(() => { console.log(doubled.value); });
stop(); // dispose

batch(() => { count.value = 10; /* more writes */ });
```

On controllers/components prefer instance APIs: `this.state`, `this.signal`,
`this.compute` / `this.memo`, `this.effect` (auto-cleaned on destroy/unmount).

---

## Controllers (canonical)

```js
import { CoreController } from '@core/controller.js';

export class TasksController extends CoreController {
    onMount() {
        this.assertRefs('titleEl', 'addBtn');
        this.title = this.state('Tasks');
        this.bind(this.title, this.titleEl);
        this.on(this.addBtn, 'click', () => { this.title.value = 'Clicked'; });
    }
}

export function tasksController(_params, _state, _loaderData, rootElement) {
    const ctrl = new TasksController(rootElement);
    return () => ctrl.destroy();
}
```

`lazyController('tasksController', '…')` must match the **function** export name.
Router passes `(params, state, loaderData)` only — `rootElement` is usually
undefined; `CoreController` falls back to `[data-view]`.

Optional functional style: `trackEvents()` from `@core-utils/events.js`.

---

## Routing

```js
import { createLazyController } from '@core/lazyController.js';

const lazyController = createLazyController(import.meta.url);

export function registerRoutes(r) {
    r.group({}, (r) => {
        r.register('/', 'src/views/public/home.html',
            lazyController('homeController', '../controllers/home.controller.js'))
         .cache({ ttl: 300, revalidate: true });

        r.register('/tasks/:id', 'src/views/public/task-detail.html',
            lazyController('taskDetailController', '../controllers/task-detail.controller.js'), {
                loader: async (params, signal) => {
                    const res = await fetch(`/api/tasks/${params.id}`, { signal });
                    return res.json();
                },
            });
    });

    // Attach your own tags after make:middleware — none ship by default
    r.group({ middleware: ['session'] }, (r) => {
        r.register('/settings', 'src/views/protected/settings.html',
            lazyController('settingsController', '../controllers/settings.controller.js'));
    });
}
```

Params: `:id`, `:id?`, `*` → `params.wildcard`.

```js
import { createMiddleware } from '@core/createMiddleware.js';
import { sessionMiddleware } from '@middleware/session.middleware.js';

router.use(createMiddleware('session', sessionMiddleware));
registerRoutes(router);
router.start();
```

```js
export async function sessionMiddleware(route, state) {
    if (!sessionStorage.getItem('deskflowSession')) {
        window.router.navigate('/?signin=1');
        return false;
    }
    return true;
}
```

**`window.router` (frozen):** `navigate`, `replace`, `back`, `getCurrentRoute`.

Full router (import): also `prefetch`, `bustCache`, `getTagsForPath`,
`getPathsForMiddleware`, `getCacheSnapshot`.

There is **no** shipped `auth.service` / login page.

---

## Components

```js
import { CoreComponent, defineComponent } from '@core/component.js';
import { html } from '@core-utils/templates.js';

export class TaskCard extends CoreComponent {
    static useShadowDOM = true;
    static observedAttributes = ['title'];

    template() {
        return html`
            <h3 ref="titleEl"></h3>
            <nc-button ref="actionBtn">Go</nc-button>
            <slot></slot>
        `;
    }

    onMount() {
        this.titleState = this.state(this.getAttribute('title') ?? '');
        this.bind(this.titleState, this.titleEl);
        this.on(this.actionBtn, 'click', () => {
            this.emit('task-card-action', { title: this.titleState.value });
        });
    }

    _handleAttributeUpdate(name, val) {
        if (name === 'title' && this.titleState) this.titleState.value = val ?? '';
    }
}

defineComponent('task-card', TaskCard);
```

- Extend **`CoreComponent`** and register with **`defineComponent`**.
- `this.on(target, type, handler)` — first arg is an EventTarget.
- Bind to refs: `this.bind(state, this.titleEl)` (element required; no string prop overload).
- Emit with **`this.emit`** (no `emitEvent` shim).

### `this.bind` overloads

```js
this.bind(state, el);                 // textContent
this.bind(state, el, 'href');         // attribute
this.bind(state, el, '?disabled');    // boolean attribute
this.bind(state, el, '.active');      // class toggle
this.bind(state, el, 'innerHTML');    // innerHTML
```

No `bindAttr` / `bindClass` / `bindStyle` / `bindAll` / `model` on CoreComponent.

---

## Binding model

Wires helpers are removed. Prefer `ref` + `this.bind` + `this.on` on
`CoreController` / `CoreComponent`.

---

## Stores

```bash
npm.cmd run make:store -- task
```

```js
import { taskItems, taskCount, loadTasks, addTask } from '@stores/task.store.js';

await loadTasks();
taskItems.value;
addTask({ id: '1', title: 'Ship' });
```

Shipped examples: `appStore` (export **`appStore`**), `uiStore`
(`sidebarCollapsed`, `theme`, `notifications`).

---

## API service

```js
import api from '@services/api.service.js';

// Localhost default baseURL is /api
await api.get('/tasks');
await api.post('/tasks', body);
await api.getCached('/tasks', { ttl: 60, tags: ['tasks'], revalidate: true }); // ttl = seconds
api.invalidateTags(['tasks']);
```

Also: `storage.service`, `logger.service`. No auth service.

---

## Events helpers

```js
import { trackEvents, on } from '@core-utils/events.js';

const events = trackEvents();
events.on(window, 'resize', handler);
events.delegate('#list', 'click', '.row', (e, target) => { /* … */ });
// auto-cleaned on navigation

const off = on(button, 'click', handler);
off();
```

---

## Built-in `nc-*` events (scaffold)

Names below are what components **`emit(...)`** today — always confirm in source
if unsure. Many use short names (`open` / `close`), not `nc-*-open`.

| Component | Events |
|-----------|--------|
| `nc-modal` / `nc-drawer` / `nc-popover` | `open`, `close` |
| `nc-alert` / `nc-chip` | `dismiss` |
| `nc-accordion` / `nc-collapsible` | `toggle` |
| `nc-tabs` | `nc-tab-change` |
| `nc-table` | `sort`, `row-click` |
| `nc-menu` | `nc-menu-select`, `nc-menu-body-change` |
| `nc-copy-button` | `copy`, `error` |
| `nc-pagination` / `nc-stepper` / `nc-bottom-nav` | `change` |
| Form inputs (`nc-input`, `nc-select`, …) | `input`, `change` (+ `clear` on input) |

`nc-button` uses the native **`click`** event (no custom `nc-button-click`).

---

## Slots

```html
<slot></slot>
<slot name="header"></slot>

<my-card>
    <h2 slot="header">Title</h2>
    <p>Default slot</p>
</my-card>
```

---

## Package-only APIs

Not vendored into create-nativecore core — import from the **`nativecorejs`**
npm package when you use that surface:

```js
import { trapFocus, announce, roving } from 'nativecorejs/a11y';
import { useForm } from 'nativecorejs';
import { registerPlugin } from 'nativecorejs';
```

Scaffold apps normally use `@testing/index.js`, not `nativecorejs/testing`.

---

## CLI

```bash
# Windows: prefer npm.cmd so flags after -- survive
npm.cmd run make:component -- task-card --defaults
npm.cmd run make:component -- task-card --defaults --with-tests
npm.cmd run make:core-component -- widget --defaults
npm.cmd run make:view -- tasks --defaults
npm.cmd run make:view -- settings --protected --defaults
npm.cmd run make:view -- task-detail --route /tasks/:id --defaults
npm.cmd run make:controller -- tasks
npm.cmd run make:store -- task
npm.cmd run make:middleware -- session
npm.cmd run remove:component -- task-card
npm.cmd run remove:core-component -- widget
npm.cmd run remove:view -- tasks --yes
```

---

## Build / test

```bash
npm run dev           # compile watch + server + HMR (port 3000)
npm run build         # production client pipeline
npm run build:ssg     # pre-render static public routes → _deploy/
npm run build:full    # build + build:ssg
npm test              # Vitest
npm run lint
```

SSG skips dynamic (`:param` / `*`) routes and protected paths: either
`export const protectedRoutes = […]` (legacy) or static routes inside
`r.group({ middleware: […] }, …)` when the middleware array is non-empty
(see ebook Ch. 21).

Ship the `_deploy/` folder to a static host — see [DEPLOY.md](./DEPLOY.md).

---

## Scaffolding

```bash
npx create-nativecore@latest my-app --defaults   # JS
npx create-nativecore@latest my-app --ts          # TypeScript
```

Full walkthrough: [QUICK_START.md](./QUICK_START.md) · [ebook](./ebook/README.md).

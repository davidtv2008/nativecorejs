# NativeCoreJS Cheat Sheet

Single-page reference for create-nativecore apps (vendored `.nativecore/`).
Verified against the current template — see [ebook](./ebook/README.md) for narrative.

**Defaults:** JavaScript scaffold · auth is BYO · prefer `CoreController` / `CoreComponent`.

---

## Reactive state

```js
import { useState, computed, effect, batch, untrack, peek } from '@core/state.js';
import { persistState } from '@core-utils/persist.js';
import { debounce } from '@core-utils/timing.js';

const count = useState(0);
count.value;                    // read
count.value = 5;                // write
count.set(prev => prev + 1);    // updater
count.watch(v => console.log(v));

const doubled = computed(() => count.value * 2);
const stop = effect(() => { console.log(doubled.value); });
stop(); // dispose

batch(() => { count.value = 10; /* more writes */ });

effect(() => {
    console.log(count.value, untrack(() => doubled.value));
    console.log(peek(doubled));
});

const theme = persistState('theme', 'light'); // localStorage by default
const search = debounce((q) => console.log(q), 300);
search.cancel();
```

On controllers/components prefer instance APIs: `this.state`, `this.signal`,
`this.compute` / `this.memo`, `this.effect` (auto-cleaned on destroy/unmount).
`this.state` is the same `State<T>` as `useState` (`.set`, `.watch`, `batch`).

```js
import { reconcile } from '@core-utils/reconcile.js';
import { createContext, provide, inject } from '@core/context.js';
import { resource } from '@core/resource.js';

reconcile(listEl, items, item => item.id, item => {
    const li = document.createElement('li');
    li.textContent = item.label;
    return li;
}, (el, item) => { el.textContent = item.label; });

const Theme = createContext('theme');
const stopProvide = provide(this.el, Theme, theme);
const current = inject(childEl, Theme);
const stopInject = inject(childEl, Theme, value => { /* ... */ });

const users = resource(async (id, signal) => {
    const res = await fetch(`/api/users/${id}`, { signal });
    return res.json();
}, { source: userId });
```

```js
import { useForm, useFieldArray } from '@core/form.js';
import { required, email } from '@core/validators.js';
import { clickOutside, mediaQuery, observe } from '@core-utils/observe.js';
import { portal } from '@core-utils/portal.js';

const form = useForm({
    initialValues: { email: '' },
    rules: { email: [required(), email()] },
    asyncRules: {
        email: [async (value) => value === 'taken@x.com' ? 'Already taken' : null],
    },
});
form.bindField('email', this.emailInput);
const ok = await form.handleSubmit(async (values) => { /* … */ })();

const rows = useFieldArray([{ label: '' }]);
rows.append({ label: 'New' });

const stopOutside = clickOutside(this.popoverEl, () => this.close());
const mq = mediaQuery('(min-width: 768px)');
mq.matches.value; // State<boolean>
const stopObserve = observe(this.boxEl, {
    resize: (entry) => { /* … */ },
    intersect: (entry) => { /* … */ },
});
const restore = portal(this.modalEl, document.body);
```

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

        r.register('/app', 'src/views/layouts/app.html',
            lazyController('appLayoutController', '../controllers/app-layout.controller.js'));

        r.register('/app/settings', 'src/views/layouts/settings.html',
            lazyController('settingsLayoutController', '../controllers/settings-layout.controller.js'),
            { layout: '/app' });

        r.register('/tasks/:id', 'src/views/public/task-detail.html',
            lazyController('taskDetailController', '../controllers/task-detail.controller.js'), {
                layout: '/app',
                title: (match) => `Task ${match.params.id}`,
                meta: { description: 'Task detail' },
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
| `nc-animation` | `start`, `finish`, `cancel` |

`nc-button` uses the native **`click`** event (no custom `nc-button-click`).

### `nc-animation` (path-picking)

`<nc-animation>` is not a CSS-only wrapper. You pick a **preset name**; the
component picks the cheapest execution path for that preset:

| Path | When | What runs |
|------|------|-----------|
| CSS compositor | Continuous loops (`spin`, `ping`, `float`, `glow`) | `@keyframes` on the slotted node — compositor / GPU, no JS after start |
| WAAPI | Enter / exit / attention (`fade-in`, `slide-up`, `pulse`, …) | Web Animations API via `gpu-animation.ts` — `transform` + `opacity` stay GPU-friendly |
| Canvas | Particle presets (`confetti`, `sparkles`, `firework`, …) | Full-viewport canvas2d overlay (CPU draw). WebGL exists in `gpu-animation.ts` for generic particles; named presets use canvas2d so each effect can have its own spawn/update |

Triggers: `mount` (default), `visible` (IntersectionObserver), `hover`, `click`, `manual` (`el.play()`).

```html
<nc-animation name="fade-in" trigger="visible">
    <nc-card>Reveals on scroll</nc-card>
</nc-animation>

<nc-animation name="pulse" trigger="hover" iterations="infinite">
    <nc-button>Hover me</nc-button>
</nc-animation>
```

Do not pick GPU vs CSS yourself — change `name`. Use `no-gpu-hint` only on
tiny nodes where `will-change` would waste layers.

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
import { lockBodyScroll } from '@core-utils/a11y.js';
import { trapFocus, announce, roving, lockBodyScroll as lockScroll } from 'nativecorejs/a11y';
import { onError, handleError } from 'nativecorejs';
import { registerPlugin } from 'nativecorejs';
```

`useForm` / `useFieldArray` / validators are vendored (`@core/form.js`,
`@core/validators.js`). `lockBodyScroll` is vendored. `trapFocus` / `announce` /
`roving` stay package-only.

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

## DOM helper

```js
import { dom } from '@core-utils/dom.js';

const btn = dom.create('button', { type: 'button', class: 'take' }, 'Take');

const frame = dom.create('iframe', {
    attrs: { title: 'Preview', allowfullscreen: '' },
    props: { src: url, allowFullscreen: true },
});

const toc = dom.create('ft-ovcc-toc', { props: { chapters, details } });
dom.setProps(toc, { chapters: nextChapters });
dom.removeAttrs(btn, 'disabled');
```

Flat maps are HTML attributes (`setAttribute`). Objects, arrays, and IDL booleans belong in `props`. Do not attach listeners in `create()` — use `this.on()`.

---

## Testing helpers

```js
import { mountComponent, mountController, navigateAndWait, waitFor, fireEvent } from '@testing/index.js';

const { element, cleanup } = mountComponent('task-card', { title: 'Hi' });
const page = mountController('<h1 ref="titleEl">Hi</h1>', homeController);
await navigateAndWait(router, '/tasks'); // waits for pageloaded or nativecore:route-error
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

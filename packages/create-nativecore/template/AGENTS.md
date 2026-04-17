# NativeCore Framework — Agent Context

This file provides context for AI agents (Claude, OpenAI Codex, etc.) working in this codebase.
Read this before writing any code. Also read `.context/ai-context.md` for full API reference.

## What This Project Is

NativeCore is a zero-dependency TypeScript SPA framework. It uses native Web Components with
Shadow DOM, a custom History API router, reactive signals (useState/computed), lazy loading,
JWT auth with a dual-shell architecture, and Puppeteer-based bot pre-rendering for SEO.
There is no JSX, no virtual DOM, no React, no Vue. Everything is TypeScript + native APIs.

## Critical Rules

1. NEVER use emojis in code, console.logs, comments, or documentation
2. ALWAYS add `.js` extension to imports (TypeScript compiles to JS; ES modules require it)
3. NEVER import controllers at top level — use `lazyController()` in `config/routes.ts`
4. ALWAYS return a cleanup function from controllers
5. ALWAYS use `trackEvents()` + `trackSubscriptions()` in controllers — never raw addEventListener
6. ALWAYS call `computed.dispose()` in `onUnmount`
7. ALWAYS set `static useShadowDOM = true` on UI components
8. NEVER add logic to `app.ts` — routes go in `config/routes.ts`

## Key File Locations

| What                       | Where                                      |
|----------------------------|--------------------------------------------|
| Route definitions          | `src/config/routes.ts`                     |
| Component registry         | `src/components/registry.ts`               |
| Controller exports         | `src/controllers/index.ts`                 |
| Base Component class       | `.nativecore/core/component.ts`                    |
| State primitives           | `.nativecore/core/state.ts`                        |
| Router                     | `.nativecore/core/router.ts`                       |
| Event/subscription helpers | `.nativecore/utils/events.ts`                      |
| DOM helpers                | `.nativecore/utils/dom.ts`                         |
| Global store               | `src/stores/appStore.ts`                   |
| UI store                   | `src/stores/uiStore.ts`                    |
| Auth service               | `src/services/auth.service.ts`             |
| API service                | `src/services/api.service.ts`              |

## Component Pattern

```typescript
import { Component, defineComponent } from '@core/component.js';
import { useState, computed } from '@core/state.js';
import type { State, ComputedState } from '@core/state.js';

export class MyWidget extends Component {
    static useShadowDOM = true;

    count: State<number>;
    doubled: ComputedState<number>;
    private _unwatchCount?: () => void;

    constructor() {
        super();
        this.count = useState(0);
        this.doubled = computed(() => this.count.value * 2);
    }

    template() {
        return `
            <style>.widget { padding: 1rem; }</style>
            <div class="widget">
                <span id="val">${this.count.value}</span>
                <button class="inc-btn">+</button>
            </div>
        `;
    }

    onMount() {
        this.shadowRoot.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).matches('.inc-btn')) {
                this.count.value++;
            }
        });
        this._unwatchCount = this.count.watch(val => {
            this.shadowRoot.querySelector('#val')!.textContent = String(val);
        });
    }

    onUnmount() {
        this._unwatchCount?.();
        this.doubled.dispose();
    }
}

defineComponent('my-widget', MyWidget);
```

## Controller Pattern

```typescript
import { trackEvents, trackSubscriptions } from '@core-utils/events.js';
import api from '@services/api.service.js';
import { store } from '@stores/appStore.js';

export async function myController(params: Record<string, string> = {}): Promise<() => void> {
    const events = trackEvents();
    const subs = trackSubscriptions();

    const data = await api.get('/endpoint');

    document.getElementById('root')!.innerHTML = `
        <h1>Page</h1>
        <button id="save-btn">Save</button>
    `;

    events.onClick('#save-btn', handleSave);
    subs.watch(store.isLoading.watch(v => toggleSpinner(v)));

    return () => {
        events.cleanup();
        subs.cleanup();
    };

    function handleSave() {}
    function toggleSpinner(v: boolean) {}
}
```

## Adding a New Feature

### New component:
```bash
npm run make:component <kebab-case-name>
```
Creates `src/components/ui/<name>.ts` and auto-registers in `src/components/registry.ts`.

### New view + controller + route:
```bash
npm run make:view <kebab-case-name>
```
Prompts for protected/public and whether to create a controller. Auto-updates `routes.ts`.

### New protected route manually:
1. Create view HTML in `src/views/pages/protected/`
2. Create controller in `src/controllers/`
3. Export controller from `src/controllers/index.ts`
4. Register route in `src/config/routes.ts` with `lazyController()`
5. Add path to `protectedRoutes` export in `routes.ts`

## Path Aliases

```typescript
@core/        → .nativecore/core/
@components/  → src/components/
@services/    → src/services/
@utils/       → src/utils/
@stores/      → src/stores/
@middleware/  → src/middleware/
@config/      → src/config/
@types/       → src/types/
```

Always include `.js` extension even when using aliases.

## State API Quick Reference

```typescript
// useState
const x = useState(0);
x.value = 5;
x.set(prev => prev + 1);
const unsub = x.watch(val => {});   // call unsub() to stop watching

// computed
const y = computed(() => x.value * 2);
y.value;          // read-only
y.watch(cb);      // subscribe to changes
y.dispose();      // MUST call to prevent memory leak

// stores
store.user.value
store.isLoading.value
store.setUser(user)
store.setLoading(true)
store.setError('msg')
store.clearError()

uiStore.sidebarOpen.value
uiStore.toggleSidebar()
uiStore.setTheme('dark')
uiStore.addNotification({ id, message, type })
uiStore.removeNotification(id)
```

## Common Mistakes to Avoid

- Using `import MyController from './my.controller.js'` — use `lazyController()` instead
- Using `document.querySelector` inside a component — use `this.shadowRoot.querySelector` or `this.$()`
- Forgetting to call `computed.dispose()` in `onUnmount` — causes memory leaks
- Not returning cleanup from a controller — old listeners accumulate across navigations
- Writing `import { X } from '@core/component'` without `.js` — module not found at runtime
- Adding a component to `registry.ts` with wrong path prefix — all UI components use `'./ui/'`



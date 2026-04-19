# Chapter 28 — Migration Guide

Migration work succeeds when teams preserve their intent while changing their tools. The hardest part is rarely syntax. It is learning which abstractions were essential, which were incidental, and which can become simpler once you move closer to the platform.

NativeCoreJS rewards explicit architecture. If you come from a framework that hides everything behind a large runtime, the main adjustment is accepting that markup can stay markup, routes can stay explicit, services can stay simple, cleanup should be visible, and browser primitives are a feature — not a fallback.

---

## From React

### Mental Model Mapping

| React concept | NativeCoreJS equivalent |
|---|---|
| `useState(v)` hook | `useState(v)` — same name, same purpose, but a class property or module-level variable rather than a hook |
| `useEffect(() => {}, [deps])` | `effect(() => { })` — auto-tracks dependencies; return a cleanup function or push to `disposers[]` |
| `useMemo(() => derived, [deps])` | `computed(() => derived)` — same auto-tracking, dispose with `.dispose()` |
| Props | HTML attributes (`static observedAttributes`) or slots |
| Context / Provider | A module-level store: `export const taskStore = useState(...)` |
| Component file (JSX) | `Component` subclass with `template()` returning an HTML string |
| React Router `<Route>` | `router.register('/path', 'view.html', lazyController(...))` |
| `useNavigate()` | `import router from '@core/router.js'; router.navigate('/path')` |
| `useParams()` | `params` argument to the controller function |
| `useCallback` | Plain function reference (no memoization needed; no re-render cycle) |
| `React.memo` | Not needed — DOM patching is fine-grained; there is no render tree to short-circuit |
| `forwardRef` | `this.emitEvent()` + custom event listener |
| Cleanup in `useEffect` return | Return value of `effect()`, or explicit `onUnmount()` in components |

### Translating a React Component

**React:**
```tsx
import { useState, useEffect } from 'react';

function Counter() {
    const [count, setCount] = useState(0);

    useEffect(() => {
        document.title = `Count: ${count}`;
    }, [count]);

    return (
        <div>
            <p>{count}</p>
            <button onClick={() => setCount(c => c + 1)}>Increment</button>
        </div>
    );
}
```

**NativeCoreJS:**
```typescript
import { Component, defineComponent } from '@core/component.js';
import { useState, effect }          from '@core/state.js';

class CounterCard extends Component {
    static useShadowDOM = true;

    private count = useState(0);
    private _disposers: Array<() => void> = [];

    template(): string {
        return `
            <div>
                <p id="count"></p>
                <button id="btn-inc">Increment</button>
            </div>
        `;
    }

    onMount(): void {
        this._disposers.push(
            effect(() => {
                const el = this.$('#count');
                if (el) el.textContent = String(this.count.value);
                document.title = `Count: ${this.count.value}`;
            })
        );

        this.on('click', '#btn-inc', () => {
            this.count.value += 1;
        });
    }

    onUnmount(): void {
        this._disposers.forEach(d => d());
    }
}

defineComponent('counter-card', CounterCard);
```

**Key differences:**
- State lives on the class, not inside a function — it persists across re-renders because there are no re-renders, only targeted DOM patches
- `effect()` tracks dependencies automatically — no dependency array needed
- Event listeners go through `this.on()` (auto-cleaned) or `this.bind()` — no synthetic event system
- Cleanup is explicit in `onUnmount()` rather than hidden inside `useEffect`

---

## From Vue

### Mental Model Mapping

| Vue concept | NativeCoreJS equivalent |
|---|---|
| `ref(v)` / `reactive({})` | `useState(v)` |
| `computed(() => derived)` | `computed(() => derived)` — same concept |
| `watch(source, fn)` | `effect(() => { ... source.value ... })` — reads tracked automatically |
| `onMounted(() => {})` | `onMount(): void { ... }` |
| `onUnmounted(() => {})` | `onUnmount(): void { ... }` |
| `<template>` single-file component | `template(): string { return \`...\`; }` |
| `<style scoped>` | Shadow DOM + `<style>` block inside `template()` |
| `<slot>` / `<slot name="x">` | `<slot>` / `<slot name="x">` in the template — identical Web Component syntax |
| `v-bind:attr` | `this.bindAttr(state, '#el', 'attr')` or `el.setAttribute(...)` in an effect |
| `v-on:click` | `this.on('click', '#el', handler)` |
| `defineEmits` | `this.emitEvent('event-name', detail)` |
| `defineProps` | `static observedAttributes = ['prop-name']` |
| Vue Router `<RouterView>` | The router outlet is `#app` in `index.html`; the router manages it |
| `router.push('/path')` | `router.navigate('/path')` |
| Pinia / Vuex store | Module-level `useState()` exports |

### What Vue Calls "Single-File Components"

Vue collocates template, script, and styles in a `.vue` file. In NativeCoreJS, these three concerns split across the following layers:

- **Template** → `template(): string` in the component class
- **Script** → the class body (state, lifecycle methods, computed, effects)
- **Styles** → `<style>` block inside the template string (encapsulated by Shadow DOM), or a global stylesheet

This is not a limitation — it is an architecture choice. The component file remains a single TypeScript file; styles simply live inside the template string rather than in a separate block.

---

## From Vanilla JavaScript

If you are coming from vanilla JS, NativeCoreJS should feel like structure rather than a foreign language. You still work with:

- DOM APIs (`querySelector`, `addEventListener`, `setAttribute`)
- Browser events and `CustomEvent`
- `fetch` and `async/await`
- CSS and media queries
- Web Components and `customElements.define()`

The framework's main additions are:

| What vanilla lacks | NativeCoreJS gives you |
|---|---|
| No reactive state | `useState()`, `computed()`, `effect()` |
| Manual DOM updates everywhere | `bind()`, `bindAttr()`, `bindAll()` for targeted patches |
| Ad-hoc route handling | A declarative router with lazy loading and guards |
| Repeated cleanup boilerplate | `trackEvents().cleanup()`, `disposers[]`, auto-disposed bindings |
| No component conventions | `Component` base class, generators, registry |
| Scattered `fetch` calls | `api.service` with caching, invalidation, and error handling |

### Moving an Existing Module

Take a vanilla JS module and migrate it incrementally:

1. **Wrap the DOM manipulation in a `Component`** — move the `querySelector` calls into `onMount()` and convert raw `addEventListener` to `this.on()`
2. **Replace manual DOM updates with `bind()`** — anywhere you write `el.textContent = value`, create a `useState(value)` and use `this.bind(state, '#el')` instead
3. **Replace `fetch` with `api.get`** — gain error handling, caching, and TypeScript response typing
4. **Move the page logic into a controller** — the part of your code that coordinates data fetching and event handling belongs in a controller, not in a component

### The Most Important Mental Shift

Explicit is better than magic. When something goes wrong in a React or Vue app, the debugging path often goes through framework internals. In NativeCoreJS the debugging path goes through:

1. The route registration in `routes.ts`
2. The controller function
3. The component class

These are all plain TypeScript — no transpilation tricks, no hidden runtime, no decorator magic. What you read is what runs.

---

## Migration Strategy for Teams

A safe migration from an existing codebase:

1. **Stabilise route structure first** — map existing pages to NativeCoreJS routes before touching any component
2. **Isolate service boundaries early** — move API calls into `api.service` before refactoring components
3. **Migrate leaf components first** — start with the smallest, most isolated UI pieces (buttons, badges, cards)
4. **Introduce reactive state where it simplifies** — replace complex DOM mutation code with `useState()` + `bind()`
5. **Add stores for shared state last** — only introduce a shared store when two or more controllers or components need the same data
6. **Document each recurring pattern as you go** — every migration produces patterns; writing them down makes the next screen faster

---

**Back:** [Chapter 27 — Troubleshooting Guide](./27-troubleshooting.md)  
**Next:** [Chapter 30 — Framework API Quick Reference](./30-framework-api-quick-reference.md)

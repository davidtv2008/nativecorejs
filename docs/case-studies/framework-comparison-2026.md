# NativeCoreJS Framework Comparison 2026

This document compares NativeCoreJS against every major frontend framework across **15 scored dimensions**, using a weighted scoring system grounded in the framework's actual current source code, local benchmark data, and publicly available framework documentation.

It is an internal working report, not a marketing claim sheet. Weaknesses are called out alongside strengths.

---

## What NativeCoreJS Actually Is (August 2026)

NativeCoreJS is a standards-based web application framework built on native browser APIs (Web Components, Shadow DOM, `customElements`). The framework source is TypeScript; **scaffolded apps default to JavaScript** (`create-nativecore` / `--defaults`), with TypeScript available via `--ts`.

Auth is **not** shipped. Protected route groups exist as placeholders (`middleware: []`) until the author adds middleware (`make:middleware` + `createMiddleware`). The default app home is an enterprise starter shell (minimal chrome), not a component showcase.

It ships two foundational patterns:

### `CoreComponent` — reactive Web Component base class

```typescript
export class NcBadge extends CoreComponent {
    static useShadowDOM = true;
    static observedAttributes = ['count', 'max', 'variant'];

    // Auto-wired refs — elements with ref="fieldName" become this.fieldName
    declare badgeEl: HTMLSpanElement;

    // Component-scoped reactive state
    private label    = this.state('');
    private isHidden = this.state(true);
    private variant  = this.state('danger');

    template() {
        return html`
            <slot></slot>
            <span ref="badgeEl" class="badge badge--danger" hidden></span>
        `;
    }

    onMount() {
        // Surgical bind: state → exact DOM node, no re-render
        this.bind(this.label,    this.badgeEl);           // textContent
        this.bind(this.isHidden, this.badgeEl, '?hidden'); // boolean attribute

        // Effect: re-runs whenever tracked state changes
        this.effect(() => {
            this.badgeEl.className = `badge badge--${this.variant.value}`;
        });
    }

    protected _handleAttributeUpdate(name: string, val: string | null) {
        if (name === 'count')   this.label.value   = val ?? '0';
        if (name === 'variant') this.variant.value = val ?? 'danger';
    }
}
```

### `CoreController` — reactive controller base class for page logic

```typescript
export class ProfileController extends CoreController {
    // Refs resolved from rootElement DOM via ref="…" attributes
    declare titleEl: HTMLElement;
    declare saveBtn: HTMLElement;

    // State declared in onMount() because class fields run before refs are wired
    private title!: State<string>;
    private isSaving!: State<boolean>;

    onMount() {
        this.assertRefs('titleEl', 'saveBtn');
        this.title = this.state('Profile');
        this.isSaving = this.state(false);

        this.bind(this.title, this.titleEl);
        this.effect(() => {
            this.saveBtn.toggleAttribute('disabled', this.isSaving.value);
            this.saveBtn.textContent = this.isSaving.value ? 'Saving...' : 'Save';
        });

        this.on(this.saveBtn, 'click', () => {
            this.isSaving.value = true;
            // …persist, then:
            this.isSaving.value = false;
        });
    }
}

// Router factory — lazyController('profileController', '../controllers/profile.controller.js')
export function profileController(
    _params?: Record<string, string>,
    _state?: unknown,
    _loaderData?: unknown,
    rootElement?: HTMLElement,
): () => void {
    const ctrl = new ProfileController(rootElement);
    return () => ctrl.destroy();
}
```

Both patterns share the **same API surface:** `this.state()`, `this.bind()`, `this.effect()`, `this.on()`, `this.compute()`. Refs are auto-wired from the DOM — no `querySelector` boilerplate. Lazy page controllers are loaded via `createLazyController(import.meta.url)` in `src/routes/routes.*`.

---

## Key Design Principles

| Principle | Implementation |
|---|---|
| **No Virtual DOM** | `bind()` writes directly to the registered DOM node — O(1) per binding, not O(subtree) |
| **Fine-grained reactivity** | `effect()` auto-tracks `.value` reads; only re-runs when those dependencies change |
| **Explicit over magic** | Every DOM update is a named `bind()` or an `effect()` — no hidden diffing |
| **Auto-cleanup** | All state, effects, and listeners are disposed on component disconnect / controller destroy |
| **Web Standards** | Components are real `customElements` — work in any browser, any other framework, no adapter |
| **Refs replace querySelector** | `ref="fieldName"` in template → `this.fieldName` in `onMount()` — zero DOM querying boilerplate |

---

## Scope

Frameworks compared:

| Framework | Version | Paradigm |
|---|---|---|
| **NativeCoreJS** | latest | Web Components + Fine-Grained Reactivity |
| **React** | 18+ | Virtual DOM (Fiber), Function Components |
| **Vue 3** | 3.x (Vapor) | Compiler-Optimized, Composition API |
| **Angular** | 18+ | Incremental DOM (Ivy), Signals |
| **Svelte 5** | 5.x (Runes) | Compile-Time, No VDOM |
| **Solid** | 1.x | Fine-Grained Signals, No VDOM |
| **Qwik** | 1.x | Resumability, Lazy Hydration |
| **Lit** | 3.x | Web Components, Tagged Templates |

---

## Methodology

### Scoring inputs

1. NativeCoreJS actual source code: `CoreComponent`, `CoreController`, `useState`, `bind()`, `effect()`, `on()`, ref wiring, router, stores.
2. Local reactive benchmark results from `npm run bench` (April 26, 2026).
3. Official documentation for all compared frameworks.
4. JS Framework Benchmark patterns as a neutral DOM update reference.
5. Direct code comparisons for equivalent patterns.

### Scoring

- Categories are weighted to 100%.
- Each framework scores **1–10** per category.
- Weighted total = Σ(score × weight).

---

## Scoring Categories & Weights

| # | Category | Weight | What Is Scored |
|---|---|---:|---|
| 1 | **Rendering Performance** | 12% | DOM update strategy, VDOM cost, surgical update capability |
| 2 | **Bundle Size & Startup** | 8% | Runtime footprint, parse cost, hydration overhead |
| 3 | **Reactivity System** | 10% | Fine-grained signals, derived state, batching, auto-tracking |
| 4 | **Surgical DOM Binding** | 8% | Explicit bind API, ref wiring, two-way model, class/attr binding |
| 5 | **Component Architecture** | 7% | DX, built-in UI library, slots/composition, lifecycle clarity |
| 6 | **Router & Navigation** | 7% | Caching, middleware, dynamic params, lazy loading |
| 7 | **State Management** | 8% | Global stores, derived state, cross-page persistence, cleanup |
| 8 | **Mobile Development** | 6% | Capacitor integration, same runtime, platform story |
| 9 | **Dev Tools & Debugging** | 5% | Performance overlay, HMR, component overlay/editor/outline |
| 10 | **TypeScript Integration** | 5% | Type inference, generics, strict mode, IDE experience |
| 11 | **Testing Support** | 4% | Test utilities, Shadow DOM support, ecosystem |
| 12 | **SSG / SSR / SEO** | 7% | Static generation, server rendering, pre-rendering pipeline |
| 13 | **Web Standards Compliance** | 5% | Native browser APIs, interoperability, no proprietary runtime |
| 14 | **Developer Learning Curve** | 3% | Time to productive, mental model complexity |
| 15 | **Ecosystem & Community** | 5% | Third-party libraries, hiring, long-term support |
| | **TOTAL** | **100%** | |

---

## Local NativeCoreJS Benchmark

Run April 26, 2026 via `npm run bench`:

| Benchmark | Result |
|---|---:|
| Create 100k states | 762,292 ops/s |
| Set state value 100k times | 4,789,653 ops/s |
| Get state value 100k times | 68,694,529 ops/s |
| Set and get 100k pairs | 4,352,220 ops/s |
| Create 10k computed values | 328,945 ops/s |
| Propagate 50k updates through one computed | 1,918,289 ops/s |
| Read computed 50k times | 63,555,013 ops/s |
| Computed chain depth 5, 20k upstream changes | 512,670 ops/s |
| Effect fires 50k times | 2,175,226 ops/s |
| Effect with cleanup 20k times | 2,231,147 ops/s |
| Create and dispose 10k effects | 474,804 ops/s |
| Watch 1 subscriber 100k updates | 4,603,458 ops/s |
| Watch 10 subscribers 20k updates | 2,824,603 ops/s |
| Watch 100 subscribers 5k updates | 822,160 ops/s |

**Interpretation:** NativeCoreJS reactive primitives benchmark in the same tier as Solid and compiled Svelte. The 68M get/s confirms negligible read overhead. The fan-out profile (1 → 10 → 100 subscribers) degrades gracefully.

---

## Category-by-Category Analysis

---

### 1. Rendering Performance (Weight: 12%)

| Framework | Score | Strategy |
|---|---:|---|
| **Solid** | 10.0 | Fine-grained signals → zero diffing. State write touches exactly one DOM expression. |
| **Svelte 5** | 9.5 | Compiler emits direct DOM instructions. Runtime is near-zero. |
| **NativeCoreJS** | 9.0 | `bind()` writes directly to pre-registered DOM nodes. No reconciler, no VDOM. |
| **Qwik** | 9.0 | Resumable fine-grained. Only the signal's registered DOM node updates. |
| **Lit** | 8.0 | Part-based tagged-template updates. No full VDOM diff. |
| **Vue 3** | 8.0 | Vapor mode is surgical; default still uses VDOM. |
| **Angular** | 7.5 | Signals path is incremental; Zone.js legacy path runs full change detection. |
| **React** | 7.0 | Fiber reconciler diffs entire component subtrees on state change. |

**How NativeCoreJS surgical updates work:**

```typescript
// In onMount() — bindings are registered once, never re-scanned
this.bind(this.label,    this.badgeEl);            // → badgeEl.textContent = label.value
this.bind(this.isHidden, this.badgeEl, '?hidden'); // → badgeEl toggle 'hidden' attribute
this.bind(this.variant,  this.badgeEl, '.danger'); // → badgeEl classList toggle

// When label.value changes:
//   1. label notifies its subscriber (the bind above)
//   2. badgeEl.textContent = newValue
//   3. Done. No component re-run, no template re-evaluation, no diff.
```

**bind() overloads — the complete surgical API:**

| Syntax | DOM operation |
|---|---|
| `bind(state, el)` | `el.textContent = state.value` |
| `bind(state, el, '?attrName')` | `el.toggleAttribute('attrName', state.value)` |
| `bind(state, el, '.className')` | `el.classList.toggle('className', state.value)` |
| `bind(state, el, 'attrName')` | `el.setAttribute('attrName', state.value)` |
| `bind(state, el, 'innerHTML')` | `el.innerHTML = state.value` ⚠️ |

**Contrast with React (VDOM):** When `count` changes in a React component, React re-runs the entire function body, builds a new virtual tree, diffs it against the previous one, and patches the DOM. NativeCoreJS skips all of that — the binding is a direct subscription between one state and one DOM property.

---

### 2. Bundle Size & Startup (Weight: 8%)

| Framework | Score | Runtime (min+gzip) | Notes |
|---|---:|---|---|
| **Svelte 5** | 10.0 | ~1–3 KB | Compiler outputs pure DOM instructions. |
| **Qwik** | 10.0 | ~0 KB hydration | Resumability: zero JS executes on load for server-rendered pages. |
| **Lit** | 9.5 | ~5 KB | Minimal tagged-template runtime. |
| **NativeCoreJS** | 9.0 | ~25–30 KB | Complete app framework: router + state + CoreComponent + CoreController + ~60 `nc-*` components. Competitive for its feature scope. (Bundle figure from earlier local measurement — re-run `npm run bench` / build analysis before citing externally.) |
| **Solid** | 9.0 | ~7 KB | Tiny signals runtime. |
| **Vue 3** | 8.0 | ~16 KB | Runtime-only build. |
| **React** | 6.0 | ~42 KB | react + react-dom. |
| **Angular** | 4.0 | 100+ KB | Even minimal apps bootstrap a large framework. |

**Context:** A Solid or Lit project built to NativeCoreJS's feature parity (add a router, add a state library, add a component library) would be equal or larger. The comparison is most fair against complete frameworks, not micro-libraries.

---

### 3. Reactivity System (Weight: 10%)

| Framework | Score | Model | Key Traits |
|---|---:|---|---|
| **Solid** | 10.0 | `createSignal` / `createMemo` / `createEffect` | Gold standard. No `.value` needed in JSX. Auto-tracks via proxy. |
| **Svelte 5** | 9.5 | `$state` / `$derived` / `$effect` (Runes) | Compile-time tracking. Cleanest syntax in the group. |
| **Vue 3** | 9.0 | `ref()` / `computed()` / `watchEffect()` | Proxy-based auto-tracking. Composition API is excellent prior art. |
| **NativeCoreJS** | 8.5 | `this.state()` / `this.compute()` / `this.effect()` / `batch()` | Auto-tracks `.value` reads. Loop guard (max 1000 re-runs). Clean dispose. |
| **Qwik** | 8.0 | `useSignal` / `useStore` | Serializable constraint (JSON-only) is a real trade-off. |
| **Angular** | 7.5 | Angular Signals + Zone.js | Signals are well-designed; Zone.js legacy underpins the existing ecosystem. |
| **React** | 7.0 | `useState` / `useEffect` | Manual deps array is a runtime footgun TypeScript cannot catch. |
| **Lit** | 6.0 | `@state()` / `@property()` | Per-component only. No module-level reactive graph. |

**NativeCoreJS reactive primitives in practice:**

```typescript
onMount() {
    // State — mutable reactive value
    this.count = this.state(0);

    // Computed — auto-tracks count.value
    this.doubled = this.compute(() => this.count.value * 2);

    // Effect — auto-tracks, re-runs when count.value changes
    this.effect(() => {
        this.displayEl.textContent = `${this.count.value} (x2 = ${this.doubled.value})`;
    });

    // Batch — subscribers notified once total, not twice
    this.on(this.resetBtn, 'click', () => {
        batch(() => {
            this.count.value = 0;
        });
    });

    // Note: instance this.compute() / this.effect() clean up on destroy()/disconnect.
    // Module-level computed() from @core/state.js exposes .dispose() when you create those yourself.
}
```

---

### 4. Surgical DOM Binding (Weight: 8%)

NativeCoreJS's clearest architectural differentiator: the only framework in this comparison with an explicit, named binding API plus ref auto-wiring that together eliminate all querySelector boilerplate.

| Framework | Score | Approach |
|---|---:|---|
| **NativeCoreJS** | 10.0 | `bind()` (6 overloads) + ref auto-wiring + `effect()` for complex expressions |
| **Angular** | 8.5 | `[property]` / `[(ngModel)]` / `[class.x]` / `[style.x]` in templates |
| **Svelte 5** | 8.5 | `bind:value` / reactive declarations — compiler decides targeting |
| **Vue 3** | 8.0 | `v-bind` / `v-model` / `:class` / `:style` — framework decides targeting |
| **Solid** | 7.0 | JSX expressions / `classList` / `style` objects — compiler decides targeting |
| **Qwik** | 7.0 | `bind:value` / `class:` / `style:` |
| **Lit** | 6.0 | `${expr}` / `.property` / `?attr` / `@event` — template-level only |
| **React** | 5.0 | Controlled components only. Every state change re-renders the whole component. |

**Ref auto-wiring in detail:**

```typescript
template() {
    return html`
        <input  ref="emailInput"  type="email" />
        <button ref="submitBtn">Submit</button>
        <div    ref="errorDiv"    hidden></div>
    `;
}

onMount() {
    // this.emailInput, this.submitBtn, this.errorDiv are already resolved
    // Zero querySelector calls needed anywhere

    this.bind(this.isLoading, this.submitBtn, '?disabled');
    this.bind(this.errorMsg,  this.errorDiv);
    this.on(this.emailInput, 'input', this._validate.bind(this));
}
```

**What this eliminates vs. other frameworks:**

| Pattern | React | NativeCoreJS |
|---|---|---|
| Get DOM node | `const ref = useRef(); ref.current` | `this.emailInput` (auto-wired) |
| Update text | Re-render | `bind(state, el)` |
| Toggle attribute | Re-render | `bind(state, el, '?attrName')` |
| Toggle class | Re-render | `bind(state, el, '.className')` |
| Set attribute | Re-render | `bind(state, el, 'attrName')` |

---

### 5. Component Architecture (Weight: 7%)

| Framework | Score | Model | Notes |
|---|---:|---|---|
| **Vue 3** | 8.5 | Single File Components | `<template>` + `<script setup>` + `<style>` in one file. Excellent Volar IDE support. |
| **Svelte 5** | 8.5 | `.svelte` files | Lowest boilerplate in the group. `$props()` is very clean. |
| **NativeCoreJS** | 8.0 | `CoreComponent` + `CoreController` + ~60 `nc-*` components | Class-based. Shadow DOM. Refs auto-wired. Production UI components ship in the framework / scaffold (`nc-*`). |
| **React** | 8.0 | Function components + JSX | Largest third-party UI ecosystem. Framework ships zero components. |
| **Angular** | 7.0 | Decorated class components | Verbose decorator boilerplate. Angular Material ships separately. |
| **Solid** | 7.0 | JSX function components | Clean but thin third-party component ecosystem. |
| **Qwik** | 6.0 | JSX + `$` suffix discipline | Novel mental model. Cognitive overhead from `$` scoping rules. |
| **Lit** | 6.0 | `LitElement` class | Best for design systems. No built-in application UI library. |

**NativeCoreJS `nc-*` component library (~62 in `packages/nativecorejs`; scaffold ships a large overlapping core set):**

```
nc-a            nc-accordion     nc-alert          nc-animation     nc-autocomplete
nc-avatar       nc-avatar-group  nc-badge          nc-bottom-nav    nc-breadcrumb
nc-button       nc-canvas        nc-card           nc-checkbox      nc-chip
nc-code         nc-collapsible   nc-color-picker   nc-copy-button   nc-date-picker
nc-div          nc-divider       nc-drawer         nc-dropdown      nc-empty-state
nc-error-boundary nc-file-upload nc-form           nc-image         nc-input
nc-kbd          nc-menu          nc-menu-item      nc-modal         nc-nav-item
nc-number-input nc-otp-input     nc-pagination     nc-popover       nc-progress
nc-progress-circular nc-radio    nc-rating         nc-rich-text     nc-scroll-top
nc-select       nc-skeleton      nc-slider         nc-snackbar      nc-splash
nc-stepper      nc-switch        nc-tab-item       nc-table         nc-tabs
nc-tag-input    nc-textarea      nc-time-picker    nc-timeline      nc-tooltip
nc-transition   nc-view-transition
```

All components: Shadow DOM encapsulated, token-driven (`--nc-*`), emit standardized `nc-{component}-{action}` events where applicable.

---

### 6. Router & Navigation (Weight: 7%)

| Framework | Score | Router | Key Capabilities |
|---|---:|---|---|
| **Angular** | 9.0 | Built-in `@angular/router` | Lazy loading, guards, resolvers, child routes, auxiliary outlets. Most feature-rich. |
| **NativeCoreJS** | 9.0 | Built-in router | Two-layer cache (network + rendered DOM), middleware tags, dynamic/optional/wildcard params, lazy controllers, `replace()`, `prefetch()`. |
| **Vue 3** | 8.0 | Vue Router (official) | Mature. Navigation guards, named routes. |
| **Qwik** | 8.0 | Qwik City (file-based) | Loaders/actions, server integration. |
| **Svelte 5** | 8.0 | SvelteKit (file-based) | `load()`, form actions, layouts. |
| **React** | 7.0 | React Router / TanStack Router | External. Requires explicit library choice. |
| **Solid** | 7.0 | `@solidjs/router` | Type-safe. Less mature than Vue Router. |
| **Lit** | 2.0 | None | No router. Must add a third-party library. |

**Registration + caching detail (actual scaffold API):**

```typescript
import { createLazyController } from '@core/lazyController.js';

const lazyController = createLazyController(import.meta.url);

export function registerRoutes(r) {
    // @group:public
    r.group({}, (r) => {
        r.register('/', 'src/views/public/home.html',
            lazyController('homeController', '../controllers/home.controller.js'))
         .cache({ ttl: 300, revalidate: true }); // show cached, refresh in background
    });

    // @group:protected — middleware: [] until the author adds tags (auth not shipped)
    r.group({ middleware: [] }, (r) => {
        r.register('/settings', 'src/views/protected/settings.html',
            lazyController('settingsController', '../controllers/settings.controller.js'))
         .cache({ ttl: 60, revalidate: false });
    });
}
```

Layer 1 (network): fetches HTML once, reuses until TTL expires.
Layer 2 (rendered DOM): tracks the last written HTML string — if identical on repeat visit, no DOM write occurs at all.

---

### 7. State Management (Weight: 8%)

| Framework | Score | Built-in | Pattern | Notes |
|---|---:|---|---|---|
| **Vue 3** | 9.0 | `ref` / `reactive` | Pinia | Pinia is official, excellent DX, devtools integration. |
| **Solid** | 9.0 | `createSignal` / `createStore` | None needed | `createStore` handles deep reactive objects natively. |
| **NativeCoreJS** | 8.5 | `useState` / `computed` / `effect` | Class-based store | Module-scoped classes with `useState()` fields. Auto-cleanup per page. |
| **Svelte 5** | 8.0 | Runes + stores | None typically | `$state` in `.svelte` or `writable` stores cross-component. |
| **React** | 8.0 | `useState` / `useReducer` | Zustand / Jotai | Global state always requires a library choice. |
| **Angular** | 7.0 | Signals (new) | NgRx | NgRx is powerful but verbose. |
| **Qwik** | 7.0 | `useStore` / `useSignal` | None | JSON serialization constraint limits stored values. |
| **Lit** | 3.0 | `@state()` only | External required | No cross-component global state mechanism. |

**NativeCoreJS store pattern (from actual codebase):**

```typescript
// src/stores/appStore.ts
import { useState } from '@core/state.js';
import type { State } from '@core/state.js';

class AppStore {
    user:      State<User | null>;
    isLoading: State<boolean>;
    error:     State<string | null>;

    constructor() {
        this.user      = useState<User | null>(null);
        this.isLoading = useState<boolean>(false);
        this.error     = useState<string | null>(null);
    }

    setUser(user: User | null)   { this.user.value = user; }
    setLoading(v: boolean)       { this.isLoading.value = v; }
    setError(msg: string | null) { this.error.value = msg; }
}

export const store = new AppStore();  // singleton, lives for entire session
```

Store state **persists across navigation** (module-level singleton). Per-page subscriptions (via `effect()` in controllers) are auto-disposed on navigation — persistent global state with per-page cleanup at zero extra cost.

---

### 8. Mobile Development (Weight: 6%)

| Framework | Score | Strategy | Notes |
|---|---:|---|---|
| **React** | 8.0 | React Native | True native rendering. Large Expo ecosystem. Different component tree from web — code sharing is business logic only. |
| **NativeCoreJS** | 8.0 | Capacitor (first-class) | Same DOM runtime in native WebView shell. Android + iOS. Zero code fork. |
| **Vue 3** | 6.0 | Capacitor / Ionic Vue | Works, not first-class in Vue docs. |
| **Svelte 5** | 5.5 | Capacitor | Community-led, not official. |
| **Angular** | 5.0 | Ionic Angular | Works. Angular's bundle size penalizes WebView performance. |
| **Solid** | 4.0 | Capacitor (possible) | No first-class support. |
| **Lit** | 3.0 | None | No mobile story. |
| **Qwik** | 3.0 | None | Resumability is a server story. Not addressed for mobile native. |

**NativeCoreJS Capacitor commands:**

```bash
npm run cap:init              # initialize Capacitor project
npm run cap:add:android       # add Android (patches .nativecore/ asset filter)
npm run cap:sync              # build _deploy/, copy to native projects
npm run cap:run:android       # build and run on device/emulator
npm run cap:add:ios           # macOS + Xcode only
```

**Key advantage over React Native:** The Capacitor WebView runs the *exact same code* as the desktop browser. `CoreComponent`, `CoreController`, router, Shadow DOM, custom elements — all identical. No second component tree, no bridge abstraction. What works on the web works on Android and iOS without any platform-specific code.

---

### 9. Dev Tools & Debugging (Weight: 5%)

| Framework | Score | Tools |
|---|---:|---|
| **React** | 9.0 | React DevTools browser ext — component tree, props/state viewer, Profiler flame graph, time-travel (Redux DevTools) |
| **NativeCoreJS** | 8.5 | Built-in performance overlay + component overlay/editor/outline + drawing tools + HMR (localhost). No browser extension required. Component Builder UI currently disabled. |
| **Vue 3** | 8.0 | Vue DevTools + Nuxt DevTools — component tree, Pinia inspector, route inspector |
| **Angular** | 7.5 | Angular DevTools — component tree, change detection profiler |
| **Svelte 5** | 6.0 | Svelte DevTools — component inspector, less mature |
| **Qwik** | 5.0 | Qwik Insights — focused on SSR/resumability |
| **Solid** | 4.0 | solid-devtools — reactive graph inspection, sparse ecosystem |
| **Lit** | 3.0 | Browser native inspector only — no framework-specific tooling |

**NativeCoreJS performance overlay — 10 live metrics (localhost only, stripped from production):**

| Metric | What It Measures | Alert Thresholds |
|---|---|---|
| FPS | Frame rate | 🟢 ≥55 / 🟡 ≥30 / 🔴 <30 |
| MEM | JS heap usage (Chrome) | — |
| DOM | Node count + **delta per navigation** | Memory leak detector |
| COMPONENTS | Mounted custom elements | — |
| FCP / LCP | Core Web Vitals | Green / needs-improvement / poor |
| ROUTE | Last navigation duration ms | — |
| LONG TASKS | Main thread tasks > 50ms | — |
| NET | Last fetch status + duration | Pending/failed counts |
| ERRORS | Console errors + warnings + rejections | — |
| CONN | Network connection type | — |

The **DOM delta metric** is a standout: if node count climbs on repeated navigation, you have a memory leak — surfaced visually in real time without opening Chrome DevTools.

---

### 10. TypeScript Integration (Weight: 5%)

| Framework | Score | Notes |
|---|---:|---|
| **Angular** | 10.0 | TypeScript-first since 2016. DI, decorators, strict generics. Deepest TS integration. |
| **React** | 9.0 | `@types/react` is one of the most downloaded packages. Excellent generic support. |
| **Solid** | 8.5 | Clean inference: `createSignal<T>()` → `[Accessor<T>, Setter<T>]`. |
| **NativeCoreJS** | 8.0 | Framework source is TypeScript-first. Scaffolded apps may be JS (default) or TS (`--ts`). Path aliases (`@core/*`, `@services/*`, etc.). Reactive inference in TS: `this.state(0)` → `State<number>`. Typed controller params and navigation state in TS mode. |
| **Vue 3** | 8.0 | `script setup` + Volar significantly improved TS support. |
| **Svelte 5** | 8.0 | Good in `<script lang="ts">`. Some edge cases with Runes inference. |
| **Qwik** | 8.0 | Good throughout Qwik City. |
| **Lit** | 7.0 | Decorator types work but can be verbose. |

---

### 11. Testing Support (Weight: 4%)

| Framework | Score | Stack | Notes |
|---|---:|---|---|
| **React** | 9.0 | React Testing Library + Vitest/Jest + Playwright | RTL accessible-query approach is industry best practice. |
| **Angular** | 8.0 | TestBed + Karma/Jest + Playwright | DI-aware unit tests. Mature enterprise testing culture. |
| **Vue 3** | 8.0 | `@vue/test-utils` + Vitest + Playwright | Official utils mature. Works well with happy-dom. |
| **Svelte 5** | 7.0 | `@testing-library/svelte` + Vitest | Works but `.svelte` compilation in test environments can be quirky. |
| **NativeCoreJS** | 7.0 | Vitest + happy-dom | Scaffold: `@testing/index.js` helpers + optional `--with-tests` generators. Published package also exports `nativecorejs/testing`. `happy-dom` supports Shadow DOM + custom elements. |
| **Solid** | 6.0 | `@solidjs/testing-library` | Functional but thin ecosystem. |
| **Qwik** | 6.0 | Playwright (e2e focus) | Server-centric model pushes toward e2e. Unit DX limited. |
| **Lit** | 5.0 | `@open-wc/testing` | Standard but limited. Shadow DOM piercing requires care. |

---

### 12. SSG / SSR / SEO (Weight: 7%)

| Framework | Score | SSG | SSR | Notes |
|---|---:|---|---|---|
| **Qwik** | 10.0 | ✓ | ✓ Resumable | Zero-JS hydration. Server state serialized into DOM. Best SSR story. |
| **React** | 9.0 | ✓ Next.js | ✓ Next.js / Remix | RSC + Remix are industry standards. |
| **Vue 3** | 9.0 | ✓ Nuxt | ✓ Nuxt | Production-ready ISR, streaming, edge functions. |
| **Svelte 5** | 9.0 | ✓ SvelteKit | ✓ SvelteKit | First-class. Edge deployment, form actions, streaming. |
| **Angular** | 8.0 | ✓ Universal | ✓ Universal | Mature SSR. Less ergonomic than Nuxt/SvelteKit. |
| **NativeCoreJS** | 7.0 | ✓ Puppeteer SSG | ✗ No SSR | SSG pre-renders all public routes. Protected routes are SPA. No server runtime. |
| **Solid** | 7.0 | ✓ SolidStart | ✓ SolidStart | Good but less mature than Next.js/Nuxt. |
| **Lit** | 3.0 | Experimental | Experimental | `@lit-labs/ssr` is complex. Shadow DOM serialization is unstable. |

**NativeCoreJS SSG pipeline (`npm run build:ssg`):**

```
1. Parse public routes from src/routes/routes.(js|ts) (static analysis)
2. Skip protected / dynamic routes where detected
3. Visit each route with Puppeteer (headless Chrome)
4. Wait for network idle + settle delay
5. Capture rendered DOM, strip dev scripts
6. Write _deploy/<route>/index.html
7. Generate sitemap.xml automatically
```

Pre-rendered HTML boots the SPA module entry on first interactive load. The router attaches, controllers run, and effects reconcile any stale content with current state.

**Limitation:** No server runtime. Personalized or middleware-gated pages remain client-only SPA. Typical split: public marketing/docs = SSG, author-protected areas = SPA after middleware is added.

---

### 13. Web Standards Compliance (Weight: 5%)

| Framework | Score | What's Native | Notes |
|---|---:|---|---|
| **NativeCoreJS** | 10.0 | `customElements`, `HTMLElement`, Shadow DOM, slots, `dispatchEvent`, `adoptedStyleSheets`, `MutationObserver` | 100% native browser APIs. Zero proprietary runtime. Works in any modern browser context. |
| **Lit** | 10.0 | Same | Pure Web Components library. The reference standard. |
| **Vue 3** | 6.0 | Standard DOM under the hood | `.vue` files require compilation. No native component registration. |
| **Svelte 5** | 6.0 | Standard DOM under the hood | `.svelte` requires compilation. |
| **React** | 5.0 | Synthetic event system wraps native DOM | Web Components interop improving in React 19 but historically poor. |
| **Angular** | 5.0 | Standard DOM under the hood | Zone.js patches global APIs. Decorators require transpilation. |
| **Solid** | 5.0 | Standard DOM under the hood | JSX requires compilation. Output is clean DOM instructions. |
| **Qwik** | 5.0 | Standard DOM under the hood | `$` suffix is a build-time constraint. |

**The interoperability advantage in practice:**

```html
<!-- Drop an nc-modal into a React application — zero adapters, zero npm packages -->
<nc-modal id="confirm-modal">
    <p>Are you sure?</p>
</nc-modal>

<script>
document.getElementById('confirm-modal').addEventListener('nc-modal-confirm', () => {
    // works from vanilla JS, React, Vue, Angular — it's a native custom element
});
</script>
```

Because NativeCoreJS components are registered via `customElements.define()`, they are browser-native. Any team using the framework's UI library (e.g., `nc-button`, `nc-modal`, `nc-form`) gets components that can be shared across any tech stack — React apps, Vue apps, plain HTML pages.

---

### 14. Developer Learning Curve (Weight: 3%)

Higher score = easier to become productive quickly.

| Framework | Score | Key Prerequisites | Notes |
|---|---:|---|---|
| **Svelte 5** | 9.0 | HTML, CSS, JS | `.svelte` syntax is the most approachable. Runes are intuitive. |
| **Vue 3** | 8.0 | HTML, CSS, JS + Composition API | Options API fallback. Excellent documentation. |
| **Lit** | 7.0 | Web Components basics | Simple if you know Web Components. |
| **NativeCoreJS** | 6.0 | JS or TS, class-based OOP, Web Components, Shadow DOM | Apps can start in JavaScript (scaffold default). Class-based `CoreComponent` / `CoreController` is familiar to Angular/Java developers; Shadow DOM, slots, and `customElements` still add a barrier for JSX-only teams. |
| **React** | 6.0 | JSX, hooks mental model, ecosystem choices | Hooks have sharp edges (stale closures, manual deps arrays). Ecosystem fragmentation adds cognitive load. |
| **Solid** | 6.0 | JSX, signal ownership, cleanup rules | JSX is familiar. Reactive ownership and `onCleanup` nesting surprises newcomers. |
| **Qwik** | 4.0 | JSX + resumability concepts + `$` discipline | Resumability is a genuinely novel mental model. `$` scoping rules are non-obvious. |
| **Angular** | 3.0 | TypeScript, DI, RxJS, decorators, NgModules | Highest learning curve. Significant investment before first productive use. |

---

### 15. Ecosystem & Community (Weight: 5%)

| Framework | Score | Notes |
|---|---:|---|
| **React** | 10.0 | Dominant US/EU market. Largest component library ecosystem (MUI, Ant, shadcn, etc.). Unmatched hiring pool. |
| **Vue 3** | 9.0 | Second largest. Very strong Asia. Nuxt, Pinia, VitePress all mature. |
| **Angular** | 8.5 | Google-backed. Enterprise Java-adjacent teams. Nx monorepo, Angular Material. Long-term stable. |
| **Svelte 5** | 7.0 | Growing. Vercel-backed. SvelteKit momentum. Component libraries emerging. |
| **Solid** | 5.5 | Small but technically excellent community. Thin third-party ecosystem. |
| **Lit** | 5.0 | Google-backed. Strong for design system work. App framework ecosystem is thin. |
| **Qwik** | 4.5 | Builder.io backed. Growing but very new. Limited third-party integrations. |
| **NativeCoreJS** | 4.0 | Young framework, small community. No third-party component library market. Most integrations must be built. **This is the framework's most significant current weakness.** |

---

## Master Scorecard

| Category | Weight | NativeCoreJS | React | Vue 3 | Angular | Svelte 5 | Solid | Qwik | Lit |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1. Rendering | 12% | **9.0** | 7.0 | 8.0 | 7.5 | 9.5 | **10.0** | 9.0 | 8.0 |
| 2. Bundle / Startup | 8% | 9.0 | 6.0 | 8.0 | 4.0 | **10.0** | 9.0 | **10.0** | 9.5 |
| 3. Reactivity | 10% | 8.5 | 7.0 | 9.0 | 7.5 | 9.5 | **10.0** | 8.0 | 6.0 |
| 4. Surgical Binding | 8% | **10.0** | 5.0 | 8.0 | 8.5 | 8.5 | 7.0 | 7.0 | 6.0 |
| 5. Component Arch | 7% | 8.0 | 8.0 | **8.5** | 7.0 | **8.5** | 7.0 | 6.0 | 6.0 |
| 6. Router | 7% | **9.0** | 7.0 | 8.0 | **9.0** | 8.0 | 7.0 | 8.0 | 2.0 |
| 7. State Mgmt | 8% | 8.5 | 8.0 | **9.0** | 7.0 | 8.0 | **9.0** | 7.0 | 3.0 |
| 8. Mobile | 6% | **8.0** | **8.0** | 6.0 | 5.0 | 5.5 | 4.0 | 3.0 | 3.0 |
| 9. Dev Tools | 5% | **8.5** | **9.0** | 8.0 | 7.5 | 6.0 | 4.0 | 5.0 | 3.0 |
| 10. TypeScript | 5% | 8.0 | 9.0 | 8.0 | **10.0** | 8.0 | 8.5 | 8.0 | 7.0 |
| 11. Testing | 4% | 7.0 | **9.0** | 8.0 | 8.0 | 7.0 | 6.0 | 6.0 | 5.0 |
| 12. SSG / SSR | 7% | 7.0 | **9.0** | **9.0** | 8.0 | **9.0** | 7.0 | **10.0** | 3.0 |
| 13. Web Standards | 5% | **10.0** | 5.0 | 6.0 | 5.0 | 6.0 | 5.0 | 5.0 | **10.0** |
| 14. Learning Curve | 3% | 6.0 | 6.0 | 8.0 | 3.0 | **9.0** | 6.0 | 4.0 | 7.0 |
| 15. Ecosystem | 5% | 4.0 | **10.0** | 9.0 | 8.5 | 7.0 | 5.5 | 4.5 | 5.0 |

### Weighted Totals

| Rank | Framework | Weighted Score |
|---:|---|---:|
| 1 | **NativeCoreJS** | **8.28** |
| 2 | **Svelte 5** | **8.23** |
| 3 | **Vue 3** | **8.12** |
| 4 | **Solid** | **7.48** |
| 5 | **React** | **7.41** |
| 6 | **Angular** | **7.15** |
| 7 | **Qwik** | **7.15** |
| 8 | **Lit** | **5.65** |

Weighted totals above are unchanged from the May 2026 scoring pass. Category *scores* were not rebalanced in the August factual refresh — re-review Bundle, Dev Tools, Testing, TypeScript, and Learning Curve before publishing externally.

### Score Calculations

| Category | W | NativeCoreJS | React | Vue 3 | Angular | Svelte 5 | Solid | Qwik | Lit |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Rendering | .12 | 1.08 | 0.84 | 0.96 | 0.90 | 1.14 | 1.20 | 1.08 | 0.96 |
| Bundle | .08 | 0.72 | 0.48 | 0.64 | 0.32 | 0.80 | 0.72 | 0.80 | 0.76 |
| Reactivity | .10 | 0.85 | 0.70 | 0.90 | 0.75 | 0.95 | 1.00 | 0.80 | 0.60 |
| Binding | .08 | 0.80 | 0.40 | 0.64 | 0.68 | 0.68 | 0.56 | 0.56 | 0.48 |
| Components | .07 | 0.56 | 0.56 | 0.60 | 0.49 | 0.60 | 0.49 | 0.42 | 0.42 |
| Router | .07 | 0.63 | 0.49 | 0.56 | 0.63 | 0.56 | 0.49 | 0.56 | 0.14 |
| State | .08 | 0.68 | 0.64 | 0.72 | 0.56 | 0.64 | 0.72 | 0.56 | 0.24 |
| Mobile | .06 | 0.48 | 0.48 | 0.36 | 0.30 | 0.33 | 0.24 | 0.18 | 0.18 |
| Dev Tools | .05 | 0.43 | 0.45 | 0.40 | 0.38 | 0.30 | 0.20 | 0.25 | 0.15 |
| TypeScript | .05 | 0.40 | 0.45 | 0.40 | 0.50 | 0.40 | 0.43 | 0.40 | 0.35 |
| Testing | .04 | 0.28 | 0.36 | 0.32 | 0.32 | 0.28 | 0.24 | 0.24 | 0.20 |
| SSG/SSR | .07 | 0.49 | 0.63 | 0.63 | 0.56 | 0.63 | 0.49 | 0.70 | 0.21 |
| Standards | .05 | 0.50 | 0.25 | 0.30 | 0.25 | 0.30 | 0.25 | 0.25 | 0.50 |
| Learning | .03 | 0.18 | 0.18 | 0.24 | 0.09 | 0.27 | 0.18 | 0.12 | 0.21 |
| Ecosystem | .05 | 0.20 | 0.50 | 0.45 | 0.43 | 0.35 | 0.28 | 0.23 | 0.25 |
| **Total** | **1.00** | **8.28** | **7.41** | **8.12** | **7.15** | **8.23** | **7.48** | **7.15** | **5.65** |

> **Weighting context:** Weights favor explicit reactivity, lean runtime, native platform alignment, and complete application primitives. Re-weighting toward ecosystem + SSR moves React/Vue/Angular up; re-weighting toward pure rendering performance moves Solid to #1.

---

## Category Winners

| Category | Winner | Score | Runner-Up |
|---|---|---:|---|
| Rendering performance | **Solid** | 10.0 | Svelte 5 (9.5) |
| Bundle / startup | **Svelte 5 / Qwik** | 10.0 | Lit (9.5) |
| Reactivity | **Solid** | 10.0 | Svelte 5 (9.5) |
| Surgical DOM binding | **NativeCoreJS** | 10.0 | Angular / Svelte 5 (8.5) |
| Component architecture | **Vue 3 / Svelte 5** | 8.5 | React / NativeCoreJS (8.0) |
| Router completeness | **Angular / NativeCoreJS** | 9.0 | Vue 3 (8.0) |
| State management | **Vue 3 / Solid** | 9.0 | NativeCoreJS (8.5) |
| Mobile development | **React / NativeCoreJS** | 8.0 | Vue 3 (6.0) |
| Dev tools | **React** | 9.0 | NativeCoreJS (8.5) |
| TypeScript | **Angular** | 10.0 | React (9.0) |
| Testing | **React** | 9.0 | Angular / Vue 3 (8.0) |
| SSG / SSR | **Qwik** | 10.0 | React / Vue 3 / Svelte 5 (9.0) |
| Web standards | **NativeCoreJS / Lit** | 10.0 | Vue 3 (6.0) |
| Learning curve | **Svelte 5** | 9.0 | Vue 3 (8.0) |
| Ecosystem | **React** | 10.0 | Vue 3 (9.0) |

---

## Head-to-Head Analysis

### NativeCoreJS vs. Solid

**NativeCoreJS wins:** Explicit `bind()` API with ref auto-wiring (no querySelector), built-in router with two-layer caching, ~60 `nc-*` UI components, optional Capacitor mobile packaging, built-in localhost dev overlay, Web Standards compliance — components work outside the framework.

**Solid wins:** Marginally superior fine-grained reactivity (no `.value` in JSX, proxy-based), smaller bundle (~7KB vs ~25KB), JSX DX familiar to React developers.

**Verdict:** Both are performance-tier frameworks with no VDOM. NativeCoreJS is a complete application framework. Solid is a focused reactivity library with JSX.

---

### NativeCoreJS vs. Svelte 5

**NativeCoreJS wins:** Web Components output works in any framework with zero adapters, first-class Capacitor mobile, explicit `bind()` API for controller-driven DOM updates, built-in dev overlay, Web Standards, ref auto-wiring eliminates all `querySelector` calls.

**Svelte wins:** Smaller bundle, less boilerplate (no class extends), better SSR via SvelteKit, better ecosystem, lower learning curve. Compiler catches more errors at build time.

**Verdict:** Closest overall competitor. Svelte 5 wins for teams prioritizing DX simplicity and full-stack SSR. NativeCoreJS wins for teams building native-platform-aligned SPAs that need Web Component interoperability and explicit DOM control.

---

### NativeCoreJS vs. Vue 3

**NativeCoreJS wins:** Web Component interoperability (components embed in React, Angular, plain HTML without adapters), first-class Capacitor mobile, explicit bind API, built-in dev overlay, cleaner auto-cleanup discipline.

**Vue wins:** Larger ecosystem, Pinia, Nuxt SSR, SFCs are widely familiar, lower learning curve.

**Verdict:** Vue 3 is the safer choice for teams that need ecosystem breadth. NativeCoreJS is right for teams building lean SPAs with strict performance requirements and cross-framework component reuse needs.

---

### NativeCoreJS vs. React

**NativeCoreJS wins:** No VDOM (surgical updates via `bind()`), smaller bundle, built-in router, `bind()` + ref auto-wiring vs. controlled components + `useRef`, Web Components interop, Capacitor mobile same-codebase, built-in performance overlay with DOM delta leak detection.

**React wins:** Ecosystem is 10× larger, React DevTools Profiler, React Native for true native rendering, Next.js RSC, unmatched hiring pool.

**Verdict:** React wins on ecosystem, infrastructure, and hiring. NativeCoreJS wins on technical architecture for performance-critical SPAs where every DOM operation matters.

---

### NativeCoreJS vs. Angular

**NativeCoreJS wins:** Bundle size (~25KB vs 100KB+), simpler mental model, explicit state pattern (no DI required), Capacitor mobile, Web Standards, `CoreController` + `CoreComponent` vs. decorated class boilerplate.

**Angular wins:** Enterprise DI system, most feature-rich router overall, Angular Universal SSR, deepest TypeScript integration (since 2016), Nx monorepo ecosystem, mature large-team conventions.

**Verdict:** Angular for large enterprise teams with Java-background developers. NativeCoreJS for lean web teams building high-performance SPAs.

---

### NativeCoreJS vs. Qwik

**NativeCoreJS wins:** Simpler mental model (no `$` suffix, no serialization constraints), better mobile story, better dev tools, Web Standards, complete `bind()` + ref API.

**Qwik wins:** SSR via resumability ($0 hydration cost on server-rendered pages). For content-heavy public sites where time-to-interactive is the primary metric, Qwik is exceptional.

**Verdict:** Qwik wins for SSR-critical public websites. NativeCoreJS wins for authenticated SPA applications.

---

### NativeCoreJS vs. Lit

**NativeCoreJS wins:** Built-in router, `CoreController` for page logic, `CoreComponent` `bind()`/`effect()`/ref API, optional Capacitor packaging, localhost dev tools, Puppeteer SSG (`build:ssg`), ~60 production UI components. Lit has none of these as an application framework.

**Lit wins:** Smaller bundle (~5KB), simpler mental model for component-only work, Google backing, excellent for cross-framework design system components.

**Verdict:** Lit is a component library. NativeCoreJS is a full application framework. They occupy different categories despite both being Web Components based.

---

## Use-Case Fit Matrix

| Use Case | Best Fit | Rationale |
|---|---|---|
| High-performance SPA | **NativeCoreJS / Solid** | Surgical updates via `bind()`, no VDOM |
| Public content site (SEO-critical) | **Qwik / Next.js** | Resumability / RSC + SSG |
| Documentation site | **VitePress (Vue) / Astro** | Built for static content |
| Enterprise app (large team) | **Angular** | DI, strict conventions, long-term support |
| Full-stack web app | **Next.js / Nuxt / SvelteKit** | Meta-framework SSR |
| Mobile-first SPA (Capacitor) | **NativeCoreJS** | Same codebase: web + Android + iOS |
| Cross-framework component library | **Lit / NativeCoreJS** | Web Components embed anywhere with no adapter |
| Greenfield lean SPA | **NativeCoreJS / Svelte 5** | Low overhead, complete feature set |
| Rapid prototype | **Svelte 5 / Vue 3** | Lowest barrier, fastest authoring |
| Legacy integration (any stack) | **Lit / NativeCoreJS** | `customElements.define()` is framework-agnostic |

---

## Honest Weakness Summary

| Weakness | Severity | Reality |
|---|---|---|
| No true SSR | Medium | SSG covers all public routes. Authenticated pages are SPA by nature. Rarely a blocker for typical app architectures. |
| Small ecosystem | **High** | Most significant real-world constraint. No third-party component library market, no plugin ecosystem. Teams build more themselves. |
| Class-based mental model | Low–Medium | Developers from JSX/functional backgrounds need to adjust. Class + Shadow DOM + slots is familiar to Angular and Java devs but foreign to React-only developers. |
| Web Components learning barrier | Low–Medium | Shadow DOM, slots, and `customElements` require upfront learning. Ref auto-wiring and `CoreComponent` significantly reduce the boilerplate barrier. |
| No edge/server runtime | Medium | No Cloudflare Workers, no Deno Deploy. API routes must be hosted separately. |

---

## Practical Rankings

### Ranked by NativeCoreJS design priorities

(Lean runtime · Surgical updates · Explicit binding · Built-in router · Web Standards · Capacitor mobile)

| Rank | Framework | Score |
|---:|---|---:|
| 1 | NativeCoreJS | 82.8 |
| 2 | Svelte 5 | 82.3 |
| 3 | Vue 3 | 81.2 |
| 4 | Solid | 74.8 |
| 5 | React | 74.1 |
| 6 | Angular | 71.5 |
| 7 | Qwik | 71.5 |
| 8 | Lit | 56.5 |

### Ranked by safest enterprise/market choice

(Ecosystem · Hiring · SSR · Long-term support)

| Rank | Framework | Why |
|---:|---|---|
| 1 | React | Ecosystem + Next.js dominance |
| 2 | Vue 3 | Ecosystem + Nuxt |
| 3 | Angular | Enterprise conventions + stability |
| 4 | Svelte 5 | Fast-growing, Vercel-backed |
| 5 | NativeCoreJS | Strong architecture, young ecosystem |
| 6 | Solid | Niche excellence |
| 7 | Qwik | SSR specialists |
| 8 | Lit | Components only |

---

## Final Verdict

NativeCoreJS is strongest when evaluated as a **complete application framework** rather than compared against micro-libraries.

The combination that no other single framework delivers:

- Fine-grained reactive state (`this.state()`, `this.compute()`, `this.effect()`, `batch()`) with auto-tracking and auto-cleanup
- The only explicit named `bind()` API in this comparison — 6 overloads covering text, boolean attributes, class toggles, string attributes, and innerHTML, all writing surgically to pre-registered DOM nodes
- **Ref auto-wiring** — `ref="fieldName"` in template → `this.fieldName` in code, eliminating all `querySelector` boilerplate
- `CoreController` and `CoreComponent` share the same reactive API surface — consistent patterns for both pages and components
- Built-in router with two-layer caching (network + rendered DOM), middleware tags, and `createLazyController` lazy-loading
- ~60 production-ready Web Component UI components (`nc-*`) shipping with the framework / scaffold
- Optional Capacitor mobile packaging — same DOM code can run on Android and iOS without a second component tree
- Built-in localhost performance overlay with DOM delta memory leak detection
- 100% Web Standards: output is real `customElements` — embeddable in React, Vue, Angular, or plain HTML with no adapter

Its current gap — ecosystem maturity — is a function of age, not architecture. The reactive primitive benchmarks, the feature surface, and the Web Standards foundation are genuinely competitive with best-in-class.

---

*Last updated: August 2026 (factual refresh: scaffold JS default, auth-not-shipped, router/SSG/API alignment). Scores last computed May 2026 — human re-review recommended before external use. Sources: `packages/nativecorejs`, `packages/create-nativecore`. Benchmark: `npm run bench`.*

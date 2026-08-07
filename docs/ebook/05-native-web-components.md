# Chapter 05 — Native Web Components

Before you generate `task-card`, pause on the platform NativeCoreJS is built on.
This chapter is concept-first: what browser custom elements are, why they exist,
how they differ from virtual DOM components (React and friends), and where the
performance story actually comes from. The next chapter turns that knowledge into
a working Deskflow component.

You do not write Deskflow code here. You leave with a mental model you will reuse
for the rest of the book.

---

## Mental model

```
Browser platform          Framework layer (React, Vue, …)       NativeCoreJS
─────────────────         ───────────────────────────────       ────────────
Custom Elements     vs    Virtual component tree          →    Custom Elements
Shadow DOM                Diff + reconcile                      Shadow DOM
Real DOM nodes            Synthetic render pass                 Real DOM + signals
HTML as the API           JSX / templates compile to VDOM       HTML tags + html``
```

A **native Web Component** is a custom HTML element the browser understands:
`<task-card>`, `<nc-button>`, `<my-widget>`. It is not a framework invention.
It is a W3C platform feature (Custom Elements + often Shadow DOM + HTML templates).

NativeCoreJS does not invent a parallel component model. It wraps the platform
with ergonomics: `CoreComponent`, signals, lazy registries, and generators.

---

## Why Web Components exist

For years, every framework invented its own component format. React components
were functions or classes that returned JSX. Vue had SFCs. Angular had
decorators and templates. None of those tags were valid HTML outside that
framework’s runtime.

The platform gap was real:

| Problem | Platform answer |
|---------|-----------------|
| Reusable UI that works in any page | Custom Elements (`customElements.define`) |
| Style and DOM encapsulation | Shadow DOM |
| Markup reuse without a build step | `<template>` / slots |
| Interop across teams and stacks | Elements are just DOM — any script can use them |

Web Components let the **browser** own the component lifecycle. Frameworks can
still sit on top (Lit, Stencil, NativeCoreJS), but the unit of reuse is an
HTML tag, not a proprietary module graph.

That is why NativeCoreJS can ship UI as `<nc-*>` tags you drop into plain HTML
views — the same views the router swaps into `#main-content`.

---

## How they work (browser lifecycle)

A custom element is a class that extends `HTMLElement` (or `CoreComponent`,
which extends that chain for you).

```js
class HelloBadge extends HTMLElement {
    connectedCallback() {
        this.textContent = 'Hello';
    }
}

customElements.define('hello-badge', HelloBadge);
```

```html
<hello-badge></hello-badge>
```

Important platform rules:

1. **Tag names need a hyphen** — `task-card` is valid; `taskcard` is not.
2. **`connectedCallback` / `disconnectedCallback`** — mount and cleanup when the
   element joins or leaves the document.
3. **`observedAttributes` + `attributeChangedCallback`** — react to HTML attributes.
4. **Shadow DOM (optional but default in NativeCoreJS)** — a private DOM tree
   attached with `attachShadow({ mode: 'open' })`. Styles inside do not leak out;
   most page CSS does not leak in (except inherited properties like `color` /
   `font`).

NativeCoreJS maps that to a familiar shape:

| Platform | `CoreComponent` |
|----------|-----------------|
| `connectedCallback` | `onMount()` |
| `disconnectedCallback` | cleanup via `destroy` / disconnect |
| attributes | `static observedAttributes` |
| shadow root + markup | `static useShadowDOM = true` + `template()` |
| events crossing the shadow boundary | `this.emit(...)` (`bubbles` + `composed`) |

You will practice that API in [Chapter 06](./06-first-component.md). Here, remember
only this: **the browser upgrades the tag; NativeCoreJS does not invent a fake DOM.**

---

## Virtual DOM components (React and peers)

A React (or Vue, etc.) component is a **description** of UI. On each update the
library builds a lightweight tree (the virtual DOM), diffs it against the previous
tree, and patches the real DOM.

```
State change
    → re-run component function(s)
    → produce new VDOM tree
    → diff old VDOM vs new VDOM
    → apply minimal DOM operations
```

That model is powerful:

- One mental model for “UI = function of state”
- Huge ecosystem and tooling
- Predictable declarative updates

It also has costs baked into the design:

- A **runtime** must ship (reconciler, scheduler, synthetic event system, …)
- Updates are **framework-mediated** — your code rarely touches DOM nodes directly
- Components are **not** HTML elements until the framework mounts them
- Sharing a React component with a Vue app (or a static CMS page) means wrapping,
  iframes, or microfrontends — not dropping a tag

Vue, Svelte, Solid, and others change the formula (compilers, signals, fine-grained
updates), but they still own a **component abstraction** that is not the browser’s
element model. Interop still goes through that runtime.

---

## Side-by-side

| | Native Web Components | VDOM components (e.g. React) |
|--|----------------------|------------------------------|
| Unit of reuse | HTML custom element | Framework component |
| Runs without that framework? | Yes — once defined | No — needs the runtime |
| Styling boundary | Shadow DOM (optional) | Conventions / CSS-in-JS / modules |
| Composition | Slots | `children` / props / render props |
| Updates | You (or signals) patch real DOM | Diff VDOM → patch real DOM |
| Server / SEO story | HTML is already elements; SSG paints real tags | Often SSR + hydrate a VDOM tree |
| Learning surface | DOM, attributes, events | Framework APIs + ecosystem |

NativeCoreJS chooses the left column, then adds signals and a router so you are
not stuck writing raw `innerHTML` for every screen.

---

## Where the performance gain comes from

Be precise. Web Components are not magic faster pixels. The gains show up in
**work avoided** and **runtime weight**.

### 1. No reconcile pass for the component tree

In a VDOM app, a state change often re-executes a subtree of component functions,
allocates a new virtual tree, and diffs it. Even “cheap” diffs cost CPU and
produce garbage for the GC.

In NativeCoreJS, a signal update typically:

1. Runs the effects / binds that subscribe to that signal
2. Writes to the specific DOM nodes those binds own

There is no framework-wide “re-render this screen as a tree.” Surgical updates
are the default model — the same idea Solid popularized, applied to real DOM
nodes behind custom elements.

### 2. Smaller production surface

A React app ships React + ReactDOM (or a meta-framework’s runtime) on every page.
NativeCoreJS production builds vendor `.nativecore/` with **zero npm runtime
dependencies** for the framework layer. Less JS to download, parse, and compile
on first load — especially visible on mid-range phones and poor networks.

### 3. HTML views stay HTML

Deskflow pages are `.html` files the router injects. Custom elements upgrade in
place. You are not paying a compile step to turn JSX into
`createElement` calls for every view, and the browser’s HTML parser does what it
already optimized for decades.

### 4. Encapsulation without style recalculation surprises

Shadow DOM keeps component CSS local. You avoid many global-stylesheet fights
that force oversized CSS or costly specificity wars. (You still use tokens —
Chapter 15 — so the app feels one design system.)

### 5. Honest limits

Web Components do **not** automatically win every benchmark:

- A naive component that rebuilds a huge list with `innerHTML` on every click
  will be slow in any model
- First paint still depends on your bundle, fonts, and SSG strategy
- Poorly written shadow trees or too many custom elements can cost layout

Performance is a **budget**: less framework work per update + less JS on the wire
+ update only what changed. NativeCoreJS is aimed at that budget. The live
[Performance](/performance) page on the docs site shows surgical updates versus
coarse re-renders when you want numbers in a browser.

---

## How NativeCoreJS sits on the platform

```
Your tag in a view:     <task-card title="Ship it"></task-card>
                              │
                              ▼
Lazy registry           loads ./ui/task-card.js when the tag appears
                              │
                              ▼
CoreComponent           Shadow root + template() + refs + state/bind/on/emit
                              │
                              ▼
Browser                 real nodes, real events, real accessibility tree
```

Contrast with a typical React path:

```
JSX  →  function Component  →  VDOM  →  reconciler  →  DOM
```

Both can build great apps. Deskflow chooses the platform path so your components
remain **tags** — usable from HTML, from other components, and from plain DOM APIs
(`document.createElement('task-card')`) without importing a framework renderer.

---

## Apply to Deskflow (read-only)

> **Feature:** None yet — this chapter is the map. Deskflow’s first custom tag
> is built next.

While you read, open DevTools on any page that uses an `nc-*` control (the
scaffold home page or the docs site Components catalog). In the Elements panel
you should see real custom element nodes, often with a `#shadow-root`. That is
the platform, not a framework fake tree.

### Challenge — Bronze

- [ ] In DevTools, find one `nc-*` element and expand its shadow root
- [ ] Note one attribute and one event you recognize from HTML

### Challenge — Silver

- [ ] Explain in one paragraph (to yourself or a note) why `<task-card>` can live
  in a plain HTML view without JSX
- [ ] List two costs a VDOM reconciler pays that a signal→DOM bind can skip

### Challenge — Gold

- [ ] Skim [Appendix A — Framework comparison](./A-framework-comparison.md) (it
  points at the full case study). Write down one strength and one weakness of
  the Web Components approach that the case study calls out honestly

---

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Thinking NativeCoreJS components are “like React but smaller” | They are custom elements + signals, not a VDOM subset |
| Expecting JSX or a virtual tree | Templates are `html\`...\`` strings into real DOM |
| Skipping Shadow DOM mentally | Default UI components use `static useShadowDOM = true` — slots and `composed` events matter |
| Claiming “Web Components are always faster” | Gains come from less runtime and surgical updates; bad list code is still bad |
| Using a tag without a hyphen | Custom element names must include `-` |

---

## Verify

- [ ] You can explain custom elements vs VDOM components in two sentences
- [ ] You know why tags need a hyphen and what Shadow DOM buys you
- [ ] You can name three places NativeCoreJS avoids VDOM work
- [ ] You are ready to generate `task-card` without treating it like a React SFC

---

## What’s next

- [Chapter 06 — First component](./06-first-component.md) — `make:component`,
  rewrite the stub, emit events into a controller  
- [Chapter 15 — Styling and tokens](./15-styling-and-tokens.md) — Shadow DOM CSS
  and `--nc-*` tokens  
- [Appendix A — Framework comparison](./A-framework-comparison.md) — scored
  comparison notes

You now know **what** you are building on. Next you build one.

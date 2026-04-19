# Chapter 37 — Using NativeCoreJS Components in Other Frameworks

One of NativeCoreJS's core architectural decisions is that every component you build is a real **Web Component** — a standards-compliant Custom Element registered on the browser's element registry via `customElements.define()`. This is not an implementation detail. It is the foundation.

The practical consequence: any `nc-*` built-in or custom component you write in NativeCoreJS can be used unchanged in React, Vue 3, Svelte, Angular, plain HTML — or any other environment that runs in a browser. No wrappers, no adapters, no build plugins required.

This chapter walks through a single "Hello World" component built once in NativeCoreJS and then consumed in every major framework.

---

## The Component We'll Build

We'll create `<nc-greeting>` — a small component that:

- Accepts a `name` attribute (the person to greet).
- Accepts a `variant` attribute (`formal` | `casual`, default `casual`).
- Displays a greeting that reacts when either attribute changes.
- Emits an `nc-greeting-clicked` custom event when the user clicks the greeting.

This exercises the full interoperability surface: attributes, attribute changes, events, and Shadow DOM styling.

---

## Building the Component

### Install

```bash
npm install nativecorejs
# or, if inside a NativeCoreJS workspace project:
# the runtime is already available as a local package
```

### The component file

```typescript
// nc-greeting.ts
import { Component, defineComponent, escapeHTML } from 'nativecorejs';

class NcGreeting extends Component {
    static useShadowDOM = true;
    static get observedAttributes() { return ['name', 'variant']; }

    template(): string {
        const name = escapeHTML(this.getAttribute('name') ?? 'World');
        const variant = this.getAttribute('variant') ?? 'casual';
        const text = variant === 'formal'
            ? `Good day, ${name}.`
            : `Hey, ${name}! 👋`;
        return `
            <style>
                :host { display: inline-block; cursor: pointer; }
                .greeting {
                    font-family: system-ui, sans-serif;
                    padding: 0.5rem 1rem;
                    border-radius: 6px;
                    background: var(--greeting-bg, #e0f2fe);
                    color: var(--greeting-color, #0369a1);
                    font-size: 1rem;
                    transition: background 0.15s;
                }
                .greeting:hover { background: var(--greeting-bg-hover, #bae6fd); }
            </style>
            <div class="greeting">${text}</div>
        `;
    }

    onMount(): void {
        this.on('click', '.greeting', () => {
            this.emitEvent('nc-greeting-clicked', {
                name: this.getAttribute('name') ?? 'World',
                variant: this.getAttribute('variant') ?? 'casual',
            });
        });
    }

    onAttributeChange(name: string): void {
        if (name === 'name' || name === 'variant') {
            this.render();
        }
    }
}

defineComponent('nc-greeting', NcGreeting);
```

### Build it as a standalone script

To share the component across frameworks, build it into a self-contained ES module:

```bash
# Using esbuild (add as a devDependency if not already present)
npx esbuild nc-greeting.ts \
  --bundle \
  --format=esm \
  --outfile=dist/nc-greeting.js \
  --external:nativecorejs
```

> **Tip:** If your consumer apps install `nativecorejs` themselves (e.g. your design system exports components as a package with `nativecorejs` as a peer dependency), use `--external:nativecorejs`. If you want a fully self-contained single file with no external deps, drop the `--external` flag.

The result is `dist/nc-greeting.js` — one file, zero framework dependencies at runtime, ready to `<script type="module">` import or npm-install.

---

## Using `<nc-greeting>` in Plain HTML

No build step, no framework:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <title>Greeting Demo</title>
</head>
<body>
    <nc-greeting name="Alice"></nc-greeting>
    <nc-greeting name="Professor Oak" variant="formal"></nc-greeting>

    <script type="module">
        import './dist/nc-greeting.js'; // registers the element

        document.querySelector('nc-greeting').addEventListener('nc-greeting-clicked', e => {
            console.log('Clicked:', e.detail);
        });
    </script>
</body>
</html>
```

That's it. The browser sees `<nc-greeting>` as a valid element, upgrades it when the script loads, and renders with Shadow DOM encapsulation.

### Changing attributes after mount

```javascript
const el = document.querySelector('nc-greeting');
el.setAttribute('name', 'Bob');       // re-renders automatically
el.setAttribute('variant', 'formal'); // re-renders automatically
```

---

## Using `<nc-greeting>` in React 19+

React 19 added first-class Web Component support. Custom events, properties, and refs all work natively.

```tsx
// App.tsx
import './nc-greeting.js'; // registers the custom element once

export default function App() {
    function handleGreetingClick(e: Event) {
        const detail = (e as CustomEvent).detail;
        console.log('Clicked:', detail.name, detail.variant);
    }

    return (
        <div>
            {/* Attributes — just HTML attributes */}
            <nc-greeting name="Alice"></nc-greeting>
            <nc-greeting name="Professor Oak" variant="formal"></nc-greeting>

            {/* Custom events — React 19+ maps onNcGreetingClicked automatically */}
            <nc-greeting
                name="Bob"
                onNcGreetingClicked={handleGreetingClick}
            ></nc-greeting>
        </div>
    );
}
```

**React 18 and earlier** — custom events require an explicit `addEventListener` via a ref because React's synthetic event system does not know about custom event names:

```tsx
import { useRef, useEffect } from 'react';
import './nc-greeting.js';

export default function App() {
    const greetingRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const el = greetingRef.current;
        const handler = (e: Event) => console.log((e as CustomEvent).detail);
        el?.addEventListener('nc-greeting-clicked', handler);
        return () => el?.removeEventListener('nc-greeting-clicked', handler);
    }, []);

    return (
        <nc-greeting ref={greetingRef} name="Alice"></nc-greeting>
    );
}
```

### TypeScript declarations (React 18)

Add a declaration file so TypeScript knows `<nc-greeting>` is a valid JSX element:

```typescript
// nc-greeting.d.ts
declare namespace JSX {
    interface IntrinsicElements {
        'nc-greeting': React.DetailedHTMLProps<
            React.HTMLAttributes<HTMLElement> & {
                name?: string;
                variant?: 'formal' | 'casual';
            },
            HTMLElement
        >;
    }
}
```

---

## Using `<nc-greeting>` in Vue 3

Vue 3 treats any element whose name contains a hyphen as a Custom Element automatically — no extra configuration needed.

```vue
<!-- App.vue -->
<script setup lang="ts">
import './nc-greeting.js'; // registers the element

function handleClick(e: CustomEvent) {
    console.log('Clicked:', e.detail.name, e.detail.variant);
}
</script>

<template>
    <nc-greeting name="Alice" />
    <nc-greeting name="Professor Oak" variant="formal" />

    <!-- Custom events: use @nc-greeting-clicked (kebab-case) -->
    <nc-greeting
        name="Bob"
        @nc-greeting-clicked="handleClick"
    />
</template>
```

### Passing reactive data as attributes

```vue
<script setup lang="ts">
import { ref } from 'vue';
import './nc-greeting.js';

const currentName = ref('Alice');
</script>

<template>
    <input v-model="currentName" placeholder="Enter name" />
    <nc-greeting :name="currentName" variant="casual" />
</template>
```

Vue's `:name` binding calls `setAttribute('name', value)` whenever `currentName` changes, and NativeCoreJS's `attributeChangedCallback` re-renders the component automatically.

### TypeScript declarations (Vue 3)

```typescript
// nc-greeting.d.ts
declare module '@vue/runtime-dom' {
    interface IntrinsicElements {
        'nc-greeting': {
            name?: string;
            variant?: 'formal' | 'casual';
            'onNc-greeting-clicked'?: (e: CustomEvent) => void;
        };
    }
}
```

---

## Using `<nc-greeting>` in Svelte

```svelte
<!-- App.svelte -->
<script lang="ts">
    import './nc-greeting.js'; // registers the element

    let currentName = 'Alice';

    function handleClick(e: CustomEvent) {
        console.log('Clicked:', e.detail);
        currentName = 'Clicked!';
    }
</script>

<input bind:value={currentName} placeholder="Enter name" />

<!-- Svelte uses on:eventname for custom events -->
<nc-greeting
    name={currentName}
    variant="casual"
    on:nc-greeting-clicked={handleClick}
/>

<nc-greeting name="Professor Oak" variant="formal" />
```

Svelte's `bind:value` and `{}` attribute bindings work directly with Web Component attributes. Svelte automatically calls `setAttribute` for string attribute bindings.

---

## Using `<nc-greeting>` in Angular

Angular requires you to add `CUSTOM_ELEMENTS_SCHEMA` to tell the template compiler not to error on unknown element names.

```typescript
// app.module.ts
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';

@NgModule({
    declarations: [AppComponent],
    imports: [BrowserModule],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],  // <-- required
    bootstrap: [AppComponent],
})
export class AppModule {}
```

```typescript
// app.component.ts
import { Component, OnInit } from '@angular/core';
import './nc-greeting.js'; // registers the element

@Component({
    selector: 'app-root',
    template: `
        <nc-greeting
            [attr.name]="currentName"
            [attr.variant]="variant"
            (nc-greeting-clicked)="onGreetingClicked($event)">
        </nc-greeting>

        <input [(ngModel)]="currentName" placeholder="Enter name" />
    `,
})
export class AppComponent implements OnInit {
    currentName = 'Alice';
    variant = 'casual';

    onGreetingClicked(e: CustomEvent): void {
        console.log('Clicked:', e.detail);
    }

    ngOnInit(): void {
        // Angular's event binding via (eventName) works for Custom Events
        // that bubble to the host element.
    }
}
```

> **Key detail:** Use `[attr.name]="value"` (attribute binding) rather than `[name]="value"` (property binding) for Custom Elements in Angular. Property bindings attempt to set a JavaScript property directly, while attribute bindings call `setAttribute()`, which triggers `attributeChangedCallback` in the component.

---

## Packaging Your Components for Distribution

If you want to share components as an npm package (e.g. your company's design system), the recommended structure is:

```
my-components/
├── src/
│   ├── nc-greeting.ts
│   ├── nc-stat-card.ts
│   └── index.ts        ← re-exports all components (calls defineComponent)
├── dist/
│   └── index.js        ← built output
└── package.json
```

```json
{
  "name": "my-components",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "peerDependencies": {
    "nativecorejs": ">=0.1.0"
  }
}
```

In `src/index.ts`:

```typescript
export { NcGreeting } from './nc-greeting.js';
export { NcStatCard } from './nc-stat-card.js';
// Importing this file registers all components via side-effects
```

Consumers install once:

```bash
npm install my-components nativecorejs
```

And import once per app entry point:

```typescript
import 'my-components'; // all components are now registered globally
```

From that point, any framework can use `<nc-greeting>`, `<nc-stat-card>`, etc. in its templates.

---

## Summary: Framework Compatibility at a Glance

| Feature | Plain HTML | React 19+ | React 18 | Vue 3 | Svelte | Angular |
|---|---|---|---|---|---|---|
| Render component | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Attribute bindings | ✅ | ✅ | ✅ | ✅ (`:attr`) | ✅ (`{attr}`) | ✅ (`[attr.x]`) |
| Reactive attribute updates | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Listen to custom events | ✅ | ✅ (native) | ✅ (ref) | ✅ (`@event`) | ✅ (`on:event`) | ✅ (`(event)`) |
| Shadow DOM styling | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| CSS custom properties | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| SSR/hydration | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ |
| TypeScript types | ✅ | `.d.ts` | `.d.ts` | `.d.ts` | inferred | inferred |

> **SSR note:** Declarative Shadow DOM (DSD) is the emerging standard for SSR-compatible Web Components. Browsers support it, but framework SSR pipelines (Next.js, Nuxt, SvelteKit) are still adding full DSD serialization support. For now, Web Components render correctly after hydration on the client even if the SSR pass produces a placeholder.

---

## What This Means for Your Architecture

Because NativeCoreJS components are real Web Components, you can:

- **Publish a design system** once and use it across a React app, a Vue admin panel, and a NativeCoreJS SPA — all from the same npm package.
- **Migrate incrementally** — add NativeCoreJS components to a React or Vue app one component at a time without rewriting existing pages.
- **Future-proof your components** — when your team eventually moves to the next framework, your components move with you.
- **Run components anywhere a browser runs** — email client webviews, Electron, Capacitor, browser extensions, Storybook.

---

**Back:** [Chapter 36 — Framework Comparison](./36-framework-comparison.md)  
**Next:** [Ebook Index](./README.md)

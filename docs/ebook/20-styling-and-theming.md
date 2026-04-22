# Chapter 20 — Styling, Theming, and CSS Custom Properties

> **What you'll build in this chapter:** Create ShopBoard's CSS design-token system in `tokens.css`, make all components consume them via custom properties, add a dark mode toggle — completing Project 2.

One of the first surprises developers encounter with Web Components is that their carefully crafted global stylesheet suddenly has no effect inside a component. Shadow DOM's style encapsulation is a feature, not a bug — but it means you need a deliberate system for sharing design decisions across component boundaries. In this chapter you will build that system for Taskflow using CSS custom properties as design tokens, establish a dark mode strategy, and learn when each styling tool applies.

---

## 19.1 How Shadow DOM Encapsulates Styles

When a component uses `static useShadowDOM = true`, the browser creates an isolated shadow root. CSS rules defined *outside* that root — in `src/styles/main.css`, inline `<style>` tags in `index.html`, or any linked stylesheet — cannot reach elements inside the shadow root.

Conversely, styles defined *inside* the shadow root's `<style>` block cannot bleed out and accidentally override global rules. This is why two `<task-card>` components can each have their own `.title` class without any collision.

Three things *do* cross the shadow boundary:

| Mechanism | Direction | Use case |
|-----------|-----------|----------|
| CSS custom properties | Outside → inside | Design tokens, theming |
| `::part()` | Outside → specific element | One-off overrides |
| Inherited properties (`color`, `font-family`, etc.) | Outside → inside | Base typography |

---

## 19.2 CSS Custom Properties as Design Tokens

A CSS custom property (a variable prefixed with `--`) defined on `:root` is visible *everywhere* — including inside shadow roots. This makes them the ideal vehicle for design tokens.

Create `src/styles/tokens.css`:

```css
/* src/styles/tokens.css */
:root {
    /* ── Colors ───────────────────────────────── */
    --primary:            #2563eb;   /* Taskflow blue */
    --primary-hover:      #1d4ed8;
    --danger:             #dc2626;
    --success:            #16a34a;
    --warning:            #d97706;

    /* ── Semantic text ────────────────────────── */
    --text-primary:       #111827;
    --text-secondary:     #6b7280;
    --text-inverse:       #ffffff;

    /* ── Semantic backgrounds ─────────────────── */
    --background:         #ffffff;
    --background-secondary: #f9fafb;
    --background-tertiary:  #f3f4f6;

    /* ── Borders ──────────────────────────────── */
    --border:             #e5e7eb;
    --border-focus:       #2563eb;

    /* ── Spacing scale ────────────────────────── */
    --spacing-xs:   0.25rem;   /*  4px */
    --spacing-sm:   0.5rem;    /*  8px */
    --spacing-md:   1rem;      /* 16px */
    --spacing-lg:   1.5rem;    /* 24px */
    --spacing-xl:   2rem;      /* 32px */

    /* ── Radius ───────────────────────────────── */
    --radius-sm:    0.25rem;
    --radius-md:    0.5rem;
    --radius-lg:    1rem;

    /* ── Shadows ──────────────────────────────── */
    --shadow-sm:    0 1px 2px rgba(0,0,0,0.05);
    --shadow-md:    0 4px 6px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.06);

    /* ── Transitions ──────────────────────────── */
    --transition-fast:   150ms ease;
    --transition-normal: 250ms ease;
}
```

Import it first in `src/styles/main.css`:

```css
@import './tokens.css';
```

---

## 19.3 Using Tokens Inside Component Templates

Because custom properties pierce shadow boundaries, every component can consume the token system without any extra setup:

```typescript
template(): string {
    return `
      <style>
        :host {
            display: block;
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-sm);
            background: var(--background);
            padding: var(--spacing-md);
            transition: box-shadow var(--transition-fast);
        }
        :host(:hover) {
            box-shadow: var(--shadow-md);
        }
        .title {
            color: var(--text-primary);
            font-weight: 600;
        }
        .meta {
            color: var(--text-secondary);
            font-size: 0.875rem;
        }
        .badge {
            background: var(--primary);
            color: var(--text-inverse);
            border-radius: var(--radius-sm);
            padding: var(--spacing-xs) var(--spacing-sm);
        }
      </style>
      <div class="title" data-hook="title"></div>
      <div class="meta"  data-hook="meta"></div>
    `;
}
```

Every time a token value changes (e.g., when the user switches to dark mode), *all* components that reference it update automatically — no JavaScript required.

---

## 19.4 Dark Mode

The recommended approach is a `data-theme` attribute on the `<html>` element, combined with a `prefers-color-scheme` media query fallback.

Append to `tokens.css`:

```css
/* System dark mode fallback */
@media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
        --primary:            #3b82f6;
        --primary-hover:      #2563eb;
        --text-primary:       #f9fafb;
        --text-secondary:     #9ca3af;
        --background:         #111827;
        --background-secondary: #1f2937;
        --background-tertiary:  #374151;
        --border:             #374151;
    }
}

/* Explicit dark theme (toggled via JS) */
:root[data-theme="dark"] {
    --primary:            #3b82f6;
    --primary-hover:      #2563eb;
    --text-primary:       #f9fafb;
    --text-secondary:     #9ca3af;
    --background:         #111827;
    --background-secondary: #1f2937;
    --background-tertiary:  #374151;
    --border:             #374151;
}
```

Generate a toggle component:

```bash
npm run make:component theme-toggle
```

```typescript
class ThemeToggle extends Component {
    static useShadowDOM = true;

    template(): string {
        return `
          <style>
            button { cursor: pointer; background: none; border: 1px solid var(--border); border-radius: var(--radius-md); padding: var(--spacing-xs) var(--spacing-sm); color: var(--text-primary); }
          </style>
          <button data-hook="toggle" aria-label="Toggle dark mode">🌙</button>
        `;
    }

    onMount(): void {
        this.on('click', '[data-hook="toggle"]', () => {
            const root = document.documentElement;
            const isDark = root.getAttribute('data-theme') === 'dark';
            root.setAttribute('data-theme', isDark ? 'light' : 'dark');
            const btn = this.$('[data-hook="toggle"]');
            if (btn) btn.textContent = isDark ? '🌙' : '☀️';
        });
    }
}
defineComponent('theme-toggle', ThemeToggle);
```

---

## 19.5 `::part()` Deep Dive

`::part()` lets external CSS target a specific element inside a shadow root — as long as the component author has explicitly marked it with a `part` attribute:

```typescript
// Inside task-list template
`<div class="list-header" part="header"> … </div>`
`<div class="list-body"   part="body">   … </div>`
`<div class="list-footer" part="footer"> … </div>`
```

External CSS can now do:

```css
/* src/styles/overrides.css */
task-list::part(header) {
    background: var(--primary);
    color: var(--text-inverse);
    font-weight: 700;
    padding: var(--spacing-md);
}

task-list::part(body) {
    background: var(--background-secondary);
}
```

Combine `::part()` with custom properties to give consumers *two* layers of control: tokens for global brand values, `::part()` for component-specific structural overrides.

> **Tip:** Only expose parts you intend consumers to style. Over-exposing parts can make it hard to refactor the component internals later.

---

## 19.6 `::slotted()` vs External CSS

| Tool | Targets | Direction |
|------|---------|-----------|
| `::slotted(selector)` | Light DOM children projected into a slot | From *inside* the shadow root |
| External CSS (normal selectors) | Light DOM elements directly | From *outside* the shadow root |
| `::part(name)` | Specific shadow DOM elements | From *outside* the shadow root |

Use `::slotted()` to apply consistent spacing or borders to whatever children are projected into a slot (e.g., `::slotted(task-card) { margin-bottom: 0.5rem; }`). Use external CSS for styling light DOM elements that are not projected. Use `::part()` to reach into a shadow root for structural overrides.

---

## 19.7 Scoped vs Global Styles

| What belongs in component `<style>` | What belongs in `src/styles/` |
|-------------------------------------|-------------------------------|
| Layout of the component's own shadow DOM | Design tokens (`tokens.css`) |
| Component-specific colours/typography | Global resets / base typography |
| `:host` display/sizing rules | Utility classes used in light DOM |
| Hover/focus states for shadow elements | `::part()` overrides for components |

Keep component styles inside the shadow template. Keep tokens and global resets in `src/styles/`. Never paste a global stylesheet path into a component's `<style>` block — that defeats encapsulation and increases load weight for every instance.

---

## 19.8 Building the Taskflow Brand

Override `--primary` and `--primary-hover` once in `tokens.css` to change every button, badge, and focus ring across the entire app simultaneously:

```css
:root {
    /* Taskflow brand blue — update once, changes everywhere */
    --primary:       #2563eb;   /* Tailwind blue-600 */
    --primary-hover: #1d4ed8;   /* Tailwind blue-700 */
}
```

> All `<task-card>` badges, the `<task-list>` count pill, `<nc-input>` focus rings, and the `<theme-toggle>` border will immediately reflect this brand color — including inside every shadow root, because custom properties cross shadow boundaries.

---

## 19.9 Component-Level Style Isolation

Two `<task-card>` instances can visually differ without class name collisions. For example, overdue tasks can show a red border:

```typescript
// In TaskCard
attributeChangedCallback(name: string, _old: string, value: string) {
    if (name === 'overdue') {
        this.style.setProperty('--card-border-color', value === 'true' ? 'var(--danger)' : 'var(--border)');
    }
}
```

Inside the shadow `<style>`:

```css
:host {
    border: 2px solid var(--card-border-color, var(--border));
}
```

Each instance owns its own `--card-border-color` scoped to the host element. No `.task-card--overdue` class needed, no global selector specificity wars.

---

## 19.10 The Generated `<style>` Block

`npm run make:component` scaffolds a `<style>` block inside the shadow template. **Always customize it — never remove it.** The block is where you establish `:host` sizing, spacing, and typography. Removing it means the component falls back to browser defaults, which vary by browser and often produce broken layouts.

---

## Done Criteria

- [ ] `src/styles/tokens.css` defines the complete ShopBoard design token set.
- [ ] All custom components and `nc-*` components consume tokens via CSS custom properties (no hardcoded color values).
- [ ] Dark mode toggles correctly via `document.documentElement.setAttribute('data-theme', 'dark')`.
- [ ] ShopBoard is live at a public URL with a working cart, wishlist, and dark-mode toggle.

### Checkpoint Commit

```bash
git add .
git commit -m "✅ Project 2 complete: ShopBoard — e-commerce dashboard deployed"
git tag project-2-complete
```

---

**Back:** [Chapter 19 — Component Composition and Slots](./19-slots-and-composition.md)  
**Next:** [Chapter 21 — TypeScript Patterns in NativeCoreJS](./21-typescript-patterns.md)

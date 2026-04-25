# Chapter 27 — Mobile Patterns

> **What you'll build in this chapter:** Add a hamburger-triggered `<nc-drawer>` and a fixed `<nc-bottom-nav>` to DevHub, apply safe area insets, verify 44×44px tap targets — then deploy to complete Project 3.

Mobile quality is where vague frontend claims stop mattering. Users do not care what framework powers the app if tap targets are cramped, drawers feel awkward, and forms break when the keyboard opens. NativeCoreJS works well for mobile-oriented SPA work, but mobile quality comes from layout discipline and interaction design — not framework features alone.

---

## Mobile Priorities

Before touching any framework API, validate these fundamentals:

| Priority | Check |
|---|---|
| **Tap targets** | Every interactive element is at least 44×44px |
| **Touch feedback** | Buttons and links have a `:active` state visible at 60fps |
| **Overlay behaviour** | Modals and drawers trap focus; background does not scroll |
| **Form behaviour** | Inputs scroll into view when the keyboard opens; labels are visible |
| **Typography** | Body text is at least 16px; no horizontal scroll on narrow screens |
| **Navigation** | Primary destinations reachable with one thumb, no hover-only menus |

---

## The Mobile Components

NativeCoreJS ships three components that cover most mobile navigation needs:

| Component | Use for |
|---|---|
| `<nc-drawer>` | Off-canvas navigation panel, opened by a hamburger or gesture |
| `<nc-bottom-nav>` + `<nc-bottom-nav-item>` | Primary destination tab bar fixed to the viewport bottom |
| `<nc-modal>` | Full-screen overlays, confirmation dialogs, detail drawers |
| `<nc-scroll-top>` | Floating "back to top" button that appears after scrolling |

---

## Pattern — Drawer + Bottom Nav Shell

A practical mobile layout combines a drawer for deeper navigation and a bottom nav for the primary four or five destinations.

### View HTML (`src/views/public/index.html`)

```html
<div data-view="app-shell">

    <!-- Mobile-only header -->
    <header class="mobile-header" role="banner">
        <button id="btn-open-nav" aria-label="Open navigation menu" aria-expanded="false">
            <nc-icon name="menu"></nc-icon>
        </button>
        <h1 class="app-title">Taskflow</h1>
    </header>

    <!-- Off-canvas drawer -->
    <nc-drawer id="mobile-drawer" label="Main Navigation">
        <nav slot="content" aria-label="Main navigation">
            <a href="/dashboard">Dashboard</a>
            <a href="/tasks">Tasks</a>
            <a href="/projects">Projects</a>
            <a href="/settings">Settings</a>
        </nav>
    </nc-drawer>

    <!-- Main content area -->
    <main id="main-content" role="main">
        <!-- Route views render here -->
    </main>

    <!-- Bottom navigation (visible on narrow screens) -->
    <nc-bottom-nav aria-label="Primary navigation">
        <nc-bottom-nav-item href="/dashboard" icon="home">Home</nc-bottom-nav-item>
        <nc-bottom-nav-item href="/tasks"     icon="check-square">Tasks</nc-bottom-nav-item>
        <nc-bottom-nav-item href="/projects"  icon="folder">Projects</nc-bottom-nav-item>
        <nc-bottom-nav-item href="/settings"  icon="settings">Settings</nc-bottom-nav-item>
    </nc-bottom-nav>

</div>
```

### Controller (`src/controllers/app-shell.controller.js`)

```javascript
import { dom }         from '@core-utils/dom.js';
import { trackEvents } from '@core-utils/events.js';

export async function appShellController() => void> {
    const events  = trackEvents();
    const scope   = dom.view('app-shell');
    const drawer  = scope.$('#mobile-drawer');
    const openBtn = scope.$('#btn-open-nav');

    // Open drawer on hamburger click
    events.on(openBtn, 'click', () => {
        if (!drawer) return;
        drawer.setAttribute('open', '');
        openBtn?.setAttribute('aria-expanded', 'true');
    });

    // Reset aria-expanded when drawer closes
    events.on(drawer, 'nc-drawer-close', () => {
        openBtn?.setAttribute('aria-expanded', 'false');
    });

    return () => {
        events.cleanup();
    };
}
```

---

## Hiding Desktop Navigation on Mobile

Use CSS media queries to show the bottom nav only on narrow screens and hide it on desktop:

```css
/* In your global stylesheet or app-shell component */

nc-bottom-nav {
    display: none; /* hidden by default */
}

@media (max-width: 768px) {
    nc-bottom-nav  { display: flex; }
    .desktop-sidebar { display: none; }
    .mobile-header { display: flex; }
}

@media (min-width: 769px) {
    .mobile-header { display: none; }
    nc-drawer      { display: none; }
}
```

---

## Form Behaviour on Mobile

When the software keyboard opens, it can push the viewport up and hide form labels or submit buttons. Follow these rules:

1. **Put `<label>` above `<input>`**, never beside it — they collapse on narrow screens
2. **Add `autocomplete` attributes** to reduce typing friction (`autocomplete="email"`, `autocomplete="current-password"`)
3. **Set `inputmode`** to guide the mobile keyboard: `inputmode="email"`, `inputmode="numeric"`, `inputmode="tel"`
4. **Add `enterkeyhint`** to label the keyboard's return key: `enterkeyhint="next"` on non-final fields, `enterkeyhint="done"` on the last

```html
<nc-input
    id="email"
    label="Email"
    type="email"
    autocomplete="email"
    inputmode="email"
    enterkeyhint="next"
></nc-input>

<nc-input
    id="password"
    label="Password"
    type="password"
    autocomplete="current-password"
    enterkeyhint="done"
></nc-input>
```

---

## Mobile Testing Rule

**Never assume desktop responsive emulation is enough.** Emulation in Chrome DevTools resizes the viewport, but it does not replicate:

- real touch event latency
- software keyboard viewport resize behaviour
- system font scaling
- safe area insets on notched devices

Always verify important public pages and core workflows at real narrow widths on a physical device or a full device simulator (Xcode Simulator, Android Emulator) before marking mobile work done.

---

## Viewport Meta Tag

Ensure your HTML shells include this meta tag exactly — missing or incorrect viewport settings break every mobile layout:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

---

## Safe Area Insets (Notched Devices)

On iPhones with a notch or dynamic island, and on Android phones with gesture navigation, the OS reserves areas of the screen. Account for them with CSS environment variables:

```css
nc-bottom-nav {
    padding-bottom: env(safe-area-inset-bottom, 0px);
}

.mobile-header {
    padding-top: env(safe-area-inset-top, 0px);
}
```

---

## Done Criteria

- [ ] `<nc-drawer>` opens from the hamburger button and closes on backdrop click or Escape.
- [ ] `<nc-bottom-nav>` shows the four primary DevHub destinations fixed at the viewport bottom.
- [ ] Safe area insets are applied via `env(safe-area-inset-*)` to the header and bottom nav.
- [ ] All tap targets are ≥ 44×44px (verify with DevTools ruler tool).
- [ ] DevHub is live at a public URL and `npm test` still passes.

### Checkpoint Commit

```bash
git add .
git commit -m "✅ Project 3 complete: DevHub — portfolio app deployed with a11y, tests, and i18n"
git tag project-3-complete
```

---

**Back:** [Chapter 26 — Internationalization (i18n)](./26-internationalization.md)  
**Next:** [Chapter 28 — Troubleshooting Guide](./28-troubleshooting.md)
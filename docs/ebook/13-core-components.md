# Chapter 13 — Core Components

Built-in `nc-*` tags are batteries for Deskflow polish. Your **app** components
(`task-card`, …) stay first-class; `nc-*` fill in buttons, overlays, and feedback
so you are not reinventing them.

Live catalog: [nativecorejs.com/components](https://nativecorejs.com/components)
(or `/components` on a local showcase). Source of truth in an app:

- `src/components/core/nc-*.js|ts`
- `src/components/frameworkRegistry.*`

---

## How to learn any `nc-*` (2 minutes)

1. Open the file for that tag
2. Read `observedAttributes` / `attributeOptions`
3. Search for `this.emit(` — those are the public events
4. Prefer **attributes + events** over poking internal DOM

`nc-button` is special: use the native **`click`** event (no `nc-button-click`).

---

## Recipe 1 — Primary actions with `nc-button`

```html
<nc-button ref="addBtn" variant="primary">Add task</nc-button>
<nc-button ref="cancelBtn" variant="ghost">Cancel</nc-button>
```

```js
this.on(this.addBtn, 'click', () => this.addTask());
```

Useful attributes: `variant`, `size`, `disabled`, `loading`.

---

## Recipe 2 — Toast feedback with `nc-snackbar`

In the view (once per page is enough):

```html
<nc-snackbar ref="snackEl"></nc-snackbar>
```

Prefer the static helper (finds the first `<nc-snackbar>` in the document):

```js
import { NcSnackbar } from '@components/core/nc-snackbar.js';

this.on(this.addBtn, 'click', () => {
    this.addTask();
    NcSnackbar.show({ message: 'Task added', variant: 'success' });
});
```

Put one `<nc-snackbar></nc-snackbar>` in `index.html` (or the page) so
`NcSnackbar.show` has a host element.

---

## Recipe 3 — Open count badge

```html
<h1>
    Tasks
    <nc-badge ref="badgeEl">0</nc-badge>
</h1>
```

```js
this.openCount = this.compute(
    () => this.tasks.value.filter((t) => !t.done).length
);
this.bind(this.openCount, this.badgeEl);
```

---

## Recipe 4 — Confirm delete with `nc-modal`

```html
<nc-modal ref="confirmModal">
    <span slot="header">Delete task?</span>
    <p>This cannot be undone.</p>
    <div slot="footer">
        <nc-button ref="cancelDeleteBtn" variant="ghost">Cancel</nc-button>
        <nc-button ref="confirmDeleteBtn" variant="danger">Delete</nc-button>
    </div>
</nc-modal>
```

```js
this.on(this.cancelDeleteBtn, 'click', () => {
    this.confirmModal.removeAttribute('open');
});
this.on(this.confirmDeleteBtn, 'click', () => {
    this.deletePending();
    this.confirmModal.removeAttribute('open');
});

// Somewhere when user asks to delete:
this.pendingDeleteId = id;
this.confirmModal.setAttribute('open', '');
```

Modal / drawer set `open` as a boolean attribute. They emit `open` / `close`
if you need to react.

---

## Recipe 5 — Filters in a `nc-drawer`

```html
<nc-button ref="filterBtn" variant="outline">Filters</nc-button>
<nc-drawer ref="filterDrawer" placement="right" size="320px">
    <span slot="header">Filters</span>
    <label><input ref="showDoneEl" type="checkbox" checked /> Show done</label>
</nc-drawer>
```

```js
this.on(this.filterBtn, 'click', () => {
    this.filterDrawer.setAttribute('open', '');
});
```

---

## Recipe 6 — `nc-animation` (picks GPU, CSS, or canvas)

`<nc-animation>` is a special core component: you name a **preset**, and it
selects the cheapest engine for that motion. You do not choose “GPU vs CPU”
yourself.

```
name="fade-in"  →  WAAPI (Web Animations API)  →  GPU transform + opacity
name="spin"     →  CSS @keyframes              →  compositor thread, no JS
name="confetti" →  canvas2d overlay            →  CPU draw (custom particles)
```

### Why the path matters

Browsers promote `transform` and `opacity` to the compositor. Animating those
on the GPU avoids layout and paint on every frame. A looping `spin` does not
need JavaScript at all — CSS keyframes stay on the compositor. Enter/exit
and attention presets need per-run control (`delay`, `iterations`, `pause()`),
so they use the Web Animations API through `gpu-animation.ts` (still
GPU-friendly: `translate3d` / `scale3d` / opacity, plus `will-change` unless
you set `no-gpu-hint`). Particle presets (`confetti`, `firework`, `electricity`,
…) cannot be a CSS keyframe; they run a full-viewport canvas overlay. Generic
WebGL particles exist in `gpu-animation.ts`; the named presets use canvas2d
so each effect can have its own spawn and update.

| Path | Presets | Engine |
|------|---------|--------|
| CSS | `spin`, `ping`, `float`, `glow` | `@keyframes` on the slotted node |
| WAAPI | `fade-in`, `fade-out`, `slide-up` / `down` / `left` / `right`, `scale-in` / `out`, `zoom-in` / `out`, `flip-x` / `y`, `pulse`, `shake`, `bounce`, `rubber-band`, `swing`, `jello`, `tada`, `heartbeat` | Web Animations API |
| Particle | `confetti`, `sparkles`, `bubbles`, `snow`, `firework`, `electricity`, `fire`, `explosion`, `ripple` | canvas2d overlay |

Triggers: `mount` (default), `visible` (IntersectionObserver + `threshold`),
`hover`, `click`, `manual` (`el.play()`). Events: `start`, `finish` (not on
infinite), `cancel`. Methods: `play()`, `pause()` (WAAPI only), `cancel()`.

```html
<nc-animation name="fade-in" trigger="visible" delay="150">
    <nc-card>Scroll into view</nc-card>
</nc-animation>

<nc-animation name="pulse" trigger="hover" iterations="infinite">
    <nc-button>Hover me</nc-button>
</nc-animation>

<nc-animation name="confetti" trigger="click">
    <nc-button variant="success">Celebrate</nc-button>
</nc-animation>
```

Particle extras: `origin-x` / `origin-y` / `target-x` / `target-y` (0–1 or
`top` / `bottom` / `left` / `right` / `center`), `count`, `spread`.

---

## Categories cheat sheet

| Category | Examples |
|----------|----------|
| Inputs | `nc-input`, `nc-textarea`, `nc-select`, `nc-checkbox`, `nc-switch` |
| Actions | `nc-button`, `nc-copy-button` |
| Feedback | `nc-alert`, `nc-snackbar`, `nc-badge`, `nc-progress` |
| Overlays | `nc-modal`, `nc-drawer`, `nc-popover`, `nc-tooltip` |
| Navigation | `nc-tabs`, `nc-breadcrumb`, `nc-pagination` |
| Data | `nc-table`, `nc-timeline`, `nc-code` |
| Motion | `nc-animation` (CSS / WAAPI / canvas — path picked per preset) |

Shell chrome (opt-in): `app-header`, `app-sidebar`, `app-footer`.

Keep your own UI under `src/components/ui/` via `make:component`. Pull newer
framework tags into an existing app with `npm run sync:components` when available.

---

## Challenges

**Bronze** — Add `nc-snackbar` and toast when a task is added.

**Silver** — Show open count in `nc-badge`; keep it in sync when toggling done.

**Gold** — Confirm deletes with `nc-modal` before removing from the array.

---

## Verify

- [ ] No “unknown custom element” warnings for tags you use
- [ ] Tags resolve via `frameworkRegistry` (built-ins) or `appRegistry` (yours)
- [ ] You did not copy-paste APIs you did not confirm in source

## Next

[Chapter 14 — Slots and composition](./14-slots-and-composition.md)

# Chapter 18 — Dev Tools

NativeCoreJS ships a localhost-only dev layer that sits on top of your running
app without touching production code. You interact with it through a **DEV MODE**
pill in the corner of the browser window. This chapter explains what each piece
does, how to use the overlay to profile Deskflow, and — importantly — what is
deliberately left off by default.

This chapter is an exercise, not a build chapter. You will:

1. Confirm the DEV MODE pill appears when `npm run dev` is running
2. Profile the `/tasks` route with the overlay open
3. Understand the Component outline and router cache tabs
4. Read the source comment that explains why Component Builder is disabled

---

## Mental model (30 seconds)

```
npm run dev
  ↓
watch-compile.mjs  →  compiles src/ to dist/   (hot-module source)
server.js          →  serves index.html + dist/
/.nativecore/hmr.js  →  injected in dev; WebSocket that reloads changed files
/dist/.nativecore/denc-tools.js  →  DEV MODE pill + overlays

Production build strips every denc / HMR artifact automatically.
```

The dev tools are authored under `.nativecore/dev/`:

| File | Purpose |
|------|---------|
| `denc-tools.ts` | Root initializer; creates the DEV MODE button |
| `component-overlay.ts` | Hover-outline on custom elements |
| `outline-panel.ts` | Side panel listing components in the current view |
| `component-editor.ts` | Edit-in-browser panel triggered by the gear icon |
| `drawing-overlay.ts` | Freehand annotation layer |
| `component-builder.ts` | Experimental drag-build UI (disabled, see below) |

You never import these files yourself. The dev server injects them automatically
and the production build ignores them entirely.

---

## Lab — Activate DEV MODE

Start (or keep running) your Deskflow dev server:

```bash
npm.cmd run dev
```

Open `http://localhost:8000` in your browser. Look for a small pill or button
near one of the corners labeled **DEV MODE**. Click it.

The overlay expands to show tabs. Exact labels evolve as the tooling matures —
treat the live overlay as the source of truth, not this chapter. At the time of
writing, you will typically see:

| Tab / Section | What it shows |
|---------------|---------------|
| Routes | Current route, matched params, middleware tags |
| Cache | Router HTML cache entries and their TTL countdown |
| Components | Registered custom elements visible in this render |
| Performance | Navigation and render timing for recent route changes |

### Reading the Cache tab

After you navigate home → `/tasks` → back → `/tasks` again, open the Cache tab.
If you added `.cache({ ttl: 30 })` to the `/tasks` route in Chapter 15, you
should see a cache entry with a remaining TTL. If you navigate while the overlay
is open you can watch it decrement.

The two router helpers the overlay calls internally are also public:

```js
// You can call these from the browser console while dev is running:
window.router.getCacheSnapshot();    // { [path]: { html, expires, etag? } }
window.router.getRouteDebugInfo();   // route table with middleware and controller status
```

---

## Lab — Component outline

With DEV MODE on, hover over a `task-card` element on the `/tasks` page. A
gear icon should appear. Clicking the gear opens the **component editor panel**
for that element.

The outline panel lists every custom element visible in the current DOM subtree.
Clicking an item in the outline focuses the gear editor on that component.

These tools are read-only from the framework's perspective — they do not write
to your source files. The gear editor is a live attribute inspector for the
current page session.

### Challenge — Bronze

- [ ] DEV MODE pill appears on `localhost:8000`
- [ ] Click through at least two tabs and read what is shown for `/tasks`
- [ ] Hover over `task-card` and observe the gear icon
- [ ] Navigate home → tasks → detail; check the Cache row before and after

---

## HMR — Hot Module Replacement

`watch-compile.mjs` watches `src/` and recompiles changed files. The injected
`hmr.js` opens a WebSocket to the dev server and reloads the changed module
without a full page reload when possible.

### Practical rules

- Keep `npm run dev` running in a dedicated terminal — stopping it kills both
  the compiler and the HMR WebSocket.
- Changes to view `.html` files trigger a soft reload of the current route.
- Changes to controller or component `.js` / `.ts` files trigger a module
  reload; if the router cannot hot-swap the module, it does a full page reload.
- Changes to `app.ts` / `app.js` always trigger a full page reload.

**Windows only:** Stopping `npm run dev` with Ctrl-C sometimes leaves orphaned
`esbuild` or `watch-compile` child processes. If you see "port 8000 already in
use" after restarting, kill those processes via Task Manager or:

```bash
npx kill-port 8000
```

---

## Component Builder — experimental and off by default

Open `.nativecore/dev/denc-tools.ts` and find this line near the top:

```ts
const COMPONENT_BUILDER_ENABLED = false;
```

The comment above it reads:

> EXPERIMENTAL — Component Builder is disabled by default and not part of the
> day-one curriculum. Flip to true only for local experiments.
> Do not delete component-builder*.files — they remain for a future revisit.

All the builder source files remain in the tree. Setting the flag to `true`
enables a drag-and-drop component scaffolding UI. It is **not required** for
Deskflow or for any chapter in this ebook. Do not enable it for learning
purposes — it will not be covered in exercises, and it may produce stubs that
do not match the generator-driven patterns this ebook teaches.

If you are curious, read `component-builder.ts` and
`component-builder-codegen.mjs` as source study. Flip the flag back to `false`
before committing.

### Challenge — Silver

- [ ] Open `denc-tools.ts`, confirm `COMPONENT_BUILDER_ENABLED = false`
- [ ] Confirm there is no Build button visible in the DEV MODE overlay
- [ ] Read the component-builder.ts first 30 lines for context; close the file

---

## Production safety

Run a production build and confirm the dev layer is absent:

```bash
npm.cmd run build
```

Serve `_deploy/` (or `dist/` if you inspect before SSG):

```bash
npx serve _deploy
```

Open the app. The DEV MODE pill must not appear. If it does, the strip step
(`strip-dev-blocks.mjs`) has not run correctly — check that `npm run build`
completed without errors, not just `npm run build:client`.

### Challenge — Gold

- [ ] `npm run build` completes without errors
- [ ] Search the `_deploy/` output for the string `nc-denc-control` — it must
  not appear
- [ ] Navigate to `/tasks` in the production build and confirm client-side
  routing still works (the JS hydrates the static HTML)

---

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Expecting DEV MODE in a production build | It is stripped; use `npm run dev` for the overlay |
| Enabling Component Builder for day-to-day work | Keep `COMPONENT_BUILDER_ENABLED = false` |
| Stopping `npm run dev` mid-edit on Windows | Kill orphaned `esbuild` processes before restarting |
| Panicking when HMR triggers a full reload | That is expected for `app.*` changes |
| Importing dev-tool modules in your own code | These are injected by the dev server; never import them |

---

## Verify

- [ ] DEV MODE pill appears on `localhost:8000` and does not appear after `npm run build`
- [ ] Overlay expands without console errors
- [ ] You confirmed `COMPONENT_BUILDER_ENABLED = false` in `denc-tools.ts`
- [ ] You watched a cache entry appear in the Cache tab after navigating to a cached route

---

## What's next

- [Chapter 19 — TypeScript mode](./19-typescript-mode.md) — scaffolding and
  converting Deskflow with `--ts`

Milestone M7 is complete: Deskflow has tests and you can profile it with the
overlay. The next two chapters cover TypeScript and then getting the app out
the door.

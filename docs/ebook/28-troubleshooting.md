# Chapter 27 — Troubleshooting Guide

NativeCoreJS bugs are usually localised to one of four places: route registration, component registration, cleanup boundaries, or import paths. This chapter organises the most common failures by symptom so you can reach the cause faster.

---

## Routing Problems

### Symptom: The page is blank / view does not load

1. Check the registered path in `routes.ts` — does it exactly match the URL you navigated to?
2. Check the HTML file path — does the file exist at `src/views/…/<name>.html`?
3. Check the lazy controller export name — does the string passed to `lazyController()` match the exported function name?
4. Check the `protectedRoutes` array — if the route is supposed to be public, make sure it is not accidentally listed as protected.
5. Open the browser console — a 404 on the HTML fetch or a module import error will appear there.

### Symptom: Auth redirect loops

1. Confirm the login route itself is **not** in `protectedRoutes`.
2. Confirm `auth.isAuthenticated()` returns `true` after a successful login (check `localStorage` / `sessionStorage` for the token key).
3. Confirm the auth middleware calls `next()` for unprotected routes rather than always redirecting.

### Symptom: Back button navigates to the wrong page

- If you used `router.navigate()` inside a guard, replace it with `router.replace()`. `navigate()` pushes a new history entry; `replace()` swaps it. An auth redirect that pushes means the back button goes back to the protected page, triggering the redirect again.

### Symptom: Query string params are `undefined` in the controller

- Query string values live on `params.query`, not `params` directly:
  ```typescript
  // URL: /tasks?sort=due-date&filter=mine
  const sort   = params.query?.sort;   // "due-date"
  const filter = params.query?.filter; // "mine"
  ```

---

## Component Problems

### Symptom: Custom element renders as a plain `<div>` with no styles

1. Is the tag registered? Check `src/components/appRegistry.ts` for a matching `componentRegistry.register()` call.
2. Is `static useShadowDOM = true` set on the class?
3. Is there a typo in the tag name (kebab-case, not PascalCase in HTML)?
4. Run `npm run build` and check that the compiled JS file exists in `dist/components/`.

### Symptom: Component renders but attributes are ignored

1. Is the attribute name in `static observedAttributes`? The browser only calls `attributeChangedCallback` for declared attributes.
2. Is the attribute name an exact lowercase match? HTML attribute names are case-insensitive; always declare and read them in lowercase.
3. Did you check the attribute value in `onMount()` before `attributeChangedCallback` fires for initial values?

### Symptom: Component leaks memory / watchers fire after navigation

- You have a watcher, timer, or observer that is not being cleaned up in `onUnmount()`. Review the cleanup rules in Chapter 2:
  - State `.watch()` returns an unsubscribe function — call it in `onUnmount()`.
  - `computed()` values inside a **component** need `.dispose()` in `onUnmount()` (controller computeds are auto-disposed by the Page Cleanup Registry).
  - Manual `addEventListener` calls on `window` or `document` need matching `removeEventListener` calls.

> **Note:** Controllers do not suffer from leaked `effect()`, `computed()`, or `trackEvents()` subscriptions — the Page Cleanup Registry tears them all down on every navigation even if the controller returned no cleanup function. If you are seeing post-navigation callbacks, the leak is almost certainly inside a **component** (long-lived custom element) rather than a controller.

---

## Reactivity Problems

### Symptom: A `computed()` shows a stale value

1. Are you reading `computed.value` (not just `computed`)? The `.value` getter is what triggers the reactive read.
2. Was `.dispose()` called on the computed before you expected it to update? A disposed computed stops tracking.
3. Is the dependency a nested property? `computed(() => obj.nested.value)` does not track `obj.nested` — only `obj` or `obj.nested` if they are themselves `State<T>` instances. Restructure so computed reads `.value` directly from a `State<T>` object.

### Symptom: An `effect()` fires once but never again

1. Is the state it reads a `State<T>.value` inside the effect function? The effect tracks every `.value` read that happens synchronously during its first run.
2. Did you accidentally read `.value` before the `effect()` call (e.g. in a variable assignment outside the effect)? Only reads *inside* the effect function body are tracked.

### Symptom: Multiple effects are firing for one state change

- You may have registered the same effect more than once (e.g. on every route navigation because the effect registration is not cleaned up). Always push `effect()` return values into `disposers` and call them all in the cleanup function.

### Symptom: State change in one controller bleeds into the next

- You have a global store state that is not being reset on route exit. If the store should be per-route, declare the `useState()` inside the controller function rather than at module scope.

---

## Build Problems

### Symptom: `Cannot find module '…'` at runtime

1. Does the import path end in `.js`? The browser loads compiled `.js` files from `dist/`. Source imports must use `.js` even when the source file is `.ts`:
   ```typescript
   import { useState } from '@core/state.js'; // ✅
   import { useState } from '@core/state';    // ❌
   ```
2. Did you use a `@alias/` path that is not defined in `tsconfig.json`? Check `compilerOptions.paths`.
3. Did you run `npm run build` after adding a new file? New TypeScript files must be compiled before the browser can load them.

### Symptom: Changes are not reflected after saving

- The dev server uses HMR. If HMR is not picking up a change, try a hard browser refresh (`Cmd+Shift+R` / `Ctrl+Shift+R`).
- If you added a new component but it still shows as unknown, check that it was added to `registry.ts` and that `npm run build` has run.

### Symptom: Production build is larger than expected

1. Are any dev tools or `.nativecore/` imports leaking into the production build? Check `tsconfig.build.json` — it should exclude the `.nativecore/` directory.
2. Are you importing large third-party libraries at the top level of a controller? Move heavy imports inside the controller function body so they are code-split.

---

## The Diagnostic Checklist

Run this whenever you are stuck:

```
□ Check the browser console for errors — read them literally
□ Check the network tab for failing fetches (HTML views, JS modules, API calls)
□ Search for the tag/route/function name across the entire src/ directory
□ Check that the relevant .js extension is present on every import
□ Check that the component or route is registered exactly once
□ Check that the controller cleanup function runs (add a console.log to verify)
□ Run `npm run build` and check TypeScript diagnostics
□ If all else fails, git diff against the last working commit
```

---

**Back:** [Chapter 26 — Mobile Patterns](./26-mobile-patterns.md)  
**Next:** [Chapter 28 — Migration Guide](./28-migration-guide.md)

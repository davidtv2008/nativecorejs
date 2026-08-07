# Appendix B — Package vs Scaffold

NativeCoreJS has one canonical runtime and one scaffold. They are related but
distinct. Confusing them is the most common source of "I can't find this API"
questions.

---

## The canonical runtime: `nativecorejs` npm package

The npm package lives at `packages/nativecorejs/` in the monorepo. Its source
is in `.nativecore/core/` (and related subdirectories). The package's public
exports are defined in `packages/nativecorejs/src/index.ts`.

**This is what you publish.** Apps that want to consume NativeCoreJS without
the full scaffold can install `nativecorejs` directly.

---

## The scaffold: `create-nativecore`

The CLI (`npm create nativecore@latest my-app`) copies a template into a new
project directory. That template vendors the runtime into the app's own
`.nativecore/` folder so the **framework** has zero runtime production
dependencies.

That does **not** forbid npm in your app. Add charts, date libraries, icon
sets, or other Web Component packages with normal `npm install`. The scaffold
runs `sync-importmap` during `dev` / `compile` so bare imports resolve in the
browser (and CommonJS packages are often ESM-shimmed under
`.nativecore/esm-shims/`).

The vendor step runs manually (for contributors) via:

```bash
npm run vendor-core -w create-nativecore
# or: node packages/create-nativecore/scripts/vendor-core.mjs
```

This copies:

| Source (package) | Destination (template) | Notes |
|------------------|------------------------|-------|
| `core/` | `.nativecore/core/` | Router, CoreController, CoreComponent, state, lazyController, createMiddleware, http, ws, sse, i18n, … |
| `utils/` | `.nativecore/utils/` | templates, dom helpers. **Wires utils are removed** — use `ref`/`bind`/`on` |
| `testing/` | `.nativecore/testing/` | `mountComponent`, `waitFor`, `fireEvent` |

**Do not hand-edit vendored files** in `.nativecore/core/` or `.nativecore/utils/`
— either in the template or in your scaffolded app. Change the package source
and re-vendor.

---

## What the scaffold adds on top of the runtime

The template includes files that are **scaffold-owned** — not part of the
published package:

| Directory | What it contains |
|-----------|-----------------|
| `.nativecore/dev/` | HMR client, DEV MODE overlay, component outline, drawing overlay, experimental Component Builder |
| `.nativecore/scripts/` | `make:*` / `remove:*` generators, `compile`, `ssg.mjs`, `strip-dev-blocks.mjs`, `watch-compile.mjs` |
| `src/` | App tree: controllers, views, components, stores, services, middleware, routes |
| `server.js` | Local dev/prod server |
| `api/mockApi.js` | Optional mock API |

---

## What is in the package but NOT in the scaffold

These APIs are exported from `nativecorejs` but are **not** vendored into
scaffolded apps. When chapters in this ebook mention them, they are clearly
labeled **package-only**.

| API | Import | Notes |
|-----|--------|-------|
| `registerPlugin` / `unregisterPlugin` | `import { registerPlugin } from 'nativecorejs'` | Observability / lifecycle hooks |
| `useForm` | `import { useForm } from 'nativecorejs'` | Reactive form helpers |
| Validators | `import { required, email, … } from 'nativecorejs'` | Form validation rules |
| `nativecorejs/a11y` | `import { trapFocus, announce, roving } from 'nativecorejs/a11y'` | Used internally by `nc-modal` and `nc-drawer`; not re-exported from scaffold core |

If you need these in a scaffolded app, install `nativecorejs` as a dependency
and import from the package:

```bash
npm install nativecorejs
```

```js
import { useForm } from 'nativecorejs';
import { trapFocus } from 'nativecorejs/a11y';
```

---

## Decision tree for contributors

```
I want to change CoreController behavior
  → Edit packages/nativecorejs/.nativecore/core/controller.ts
  → npm run vendor-core -w create-nativecore
  → Test in the template

I want to change a generator (make:view)
  → Edit packages/create-nativecore/.nativecore/scripts/make-view.mjs
  → Test by running the generator in a fresh scaffold

I want to change the DEV MODE overlay
  → Edit packages/create-nativecore/template/.nativecore/dev/denc-tools.ts
  → This is scaffold-owned; no vendor step needed

I want to add a package-only API
  → Edit packages/nativecorejs/src/index.ts to export it
  → Document it as package-only in Chapter 26
  → Chapters should say: "install nativecorejs and import from the package"
```

---

## Why vendoring instead of a direct npm dependency?

Vendoring lets a scaffolded app be **self-contained for the framework**: no
required npm package for CoreController / router / signals at runtime, and no
framework version mismatch with a shared lockfile. Your **application**
dependencies (lodash, dayjs, chart libs, third-party Web Components, …) still
install and import like any modern ESM project — that is a feature, not a
contradiction. The trade-off is that updating the framework itself requires
re-vendoring and re-committing the `.nativecore/core/` files.

---

## Rule for chapter authors

- If an API lives in `.nativecore/core/` of a fresh scaffold, you can teach it
  without qualification.
- If an API requires installing the `nativecorejs` package separately, label it
  explicitly: **(package-only)** and show the install command.
- Never invent APIs. Verify against the source files before teaching.

---

[Back to Appendix A](./A-framework-comparison.md) | [Back to Chapter 26](./26-api-quick-reference.md)

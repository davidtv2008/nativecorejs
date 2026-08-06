# Migrate one route at a time

Adopt NativeCoreJS inside an existing app without a big-bang rewrite.

## Pattern

1. Scaffold or vendor `.nativecore` + one HTML shell outlet.
2. Register a single path with `r.register('/new-page', '…html', lazyController(…))`.
3. Keep the rest of the host app (React/Vue/etc.) on other URLs via the reverse proxy or host router.
4. Expand route-by-route; share APIs over HTTP, not by mixing virtual DOMs.

## Rules

- Controllers use `ref` + `this.bind` + `this.on` only (no wires utils).
- Prefer `CoreController` / `CoreComponent`.
- Auth stays on your existing backend; add `make:middleware` when a NativeCore route needs a guard.

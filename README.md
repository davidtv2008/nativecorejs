# nativecorejs

Monorepo for the NativeCore framework runtime and the official app scaffolder.

## Quick links

- **[Quick Start](./docs/QUICK_START.md)** — scaffold and run an app
- **[Cheat Sheet](./docs/CHEATSHEET.md)** — common APIs and patterns
- **[Ebook](./docs/ebook/README.md)** — Deskflow curriculum (learn by building)
- **[npm publishing](./docs/NPM_PUBLISHING.md)** — release flow for maintainers
- **[Contributing](./CONTRIBUTING.md)** — how to contribute

## Packages

| Package | Role |
|---------|------|
| `packages/nativecorejs` | Publishable runtime (`import … from 'nativecorejs'`) |
| `packages/create-nativecore` | CLI scaffolder (`npx create-nativecore`) |

Current version: **`2.0.11`**.

## Product shape (current)

- **JS is the scaffold default.** Pass `--ts` for TypeScript.
- Apps get a **vendored** `.nativecore/` runtime (not a hard dependency on the npm package).
- Starter ships a calm home page only — **no login, dashboard, or auth service**.
- Protected routing is supported via `router.group({ middleware })` + `make:middleware` (BYO auth).
- Component Builder is **experimental** and **disabled by default** (`COMPONENT_BUILDER_ENABLED = false`).
- Production static hosting: `npm run build` / `build:ssg` / `build:full` → `_deploy/`.

## Workflow

```bash
npm install

# Build the publishable runtime
npm run build -w nativecorejs

# Scaffold with the local CLI
npm run create:app -- my-app --defaults
# or: node packages/create-nativecore/bin/index.mjs my-app --defaults

# Publish checks / release (maintainers)
npm run publish:check
npm run publish:runtime
npm run publish:cli
```

Public install path for end users:

```bash
npx create-nativecore@latest my-app --defaults
cd my-app
npm run dev
```

## Smoke helpers

| Script | Purpose |
|--------|---------|
| `npm run create:sample` | Regenerate `sample-nativecore` with `--defaults` |
| `npm run verify:sample` | Install + compile the sample |
| `npm run smoke:sample` | Build runtime + create + verify sample |
| `npm run publish:check` | Build + dry-run pack both packages |

## Positioning

This repository is the **framework product**. A separate demo/marketing app may consume it; scaffolds are intended to be clean app shells, not the showcase site.

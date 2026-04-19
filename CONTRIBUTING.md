# Contributing to NativeCoreJS

Thank you for your interest in contributing! This document covers the contribution workflow, coding conventions, and the best ways to add value to the project.

---

## Contents

- [Code of Conduct](#code-of-conduct)
- [Repository Layout](#repository-layout)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Commit Conventions](#commit-conventions)
- [Pull Request Checklist](#pull-request-checklist)
- [Adding a Component](#adding-a-component)
- [Writing Plugins](#writing-plugins)
- [Documentation](#documentation)
- [Releasing](#releasing)

---

## Code of Conduct

All contributors are expected to be respectful, constructive, and inclusive. We follow the [Contributor Covenant](https://www.contributor-covenant.org/) v2.1. Harassment in any form will not be tolerated.

---

## Repository Layout

```
nativecorejs/
├── packages/
│   ├── nativecorejs/          ← framework runtime (published as `nativecorejs`)
│   │   ├── src/               ← TypeScript source
│   │   │   ├── components/    ← all nc-* custom elements
│   │   │   ├── a11y/          ← trapFocus, announce, roving
│   │   │   ├── testing/       ← mountComponent, waitFor, fireEvent
│   │   │   └── index.ts       ← public export surface
│   │   └── .nativecore/       ← router, state, reconciler, utilities
│   └── create-nativecore/     ← scaffolding CLI (published as `create-nativecore`)
│       ├── bin/index.mjs      ← CLI entry point
│       └── template/          ← full project template copied to new apps
├── docs/
│   ├── ebook/                 ← 35+ chapter ebook
│   ├── QUICK_START.md         ← 10-command getting-started guide
│   └── CHEATSHEET.md          ← single-page pattern reference
└── benchmarks/                ← performance benchmarks
```

---

## Development Setup

```bash
# Clone the repo
git clone https://github.com/davidtv2008/nativecorejs.git
cd nativecorejs

# Install workspace dependencies
npm install

# Build the runtime
npm run build

# Generate a sample app against the local workspace
npm run create:sample
```

To work on the runtime while testing changes in a sample app:

```bash
# In terminal 1 — watch-compile the runtime
cd packages/nativecorejs
# (run your local TypeScript watch command)

# In terminal 2 — run the sample app
cd sample-nativecore
npm run dev
```

---

## Making Changes

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```

2. **Make your changes.** Follow the conventions below.

3. **Run the checks** before committing:
   ```bash
   npm run smoke:sample        # build runtime + scaffold + compile sample
   cd packages/nativecorejs && npm test   # run unit tests
   ```

4. **Open a pull request** against `main`. Fill in the PR template.

---

## Commit Conventions

We use [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Use |
|---|---|
| `feat:` | New user-facing feature |
| `fix:` | Bug fix |
| `docs:` | Documentation only |
| `refactor:` | Code change that neither adds a feature nor fixes a bug |
| `test:` | Tests only |
| `chore:` | Build process, CI, dependencies |
| `perf:` | Performance improvement |

Examples:
```
feat: add registerPlugin() API and NCPlugin interface
fix(nc-modal): remove duplicate keydown listener on re-open
docs: add Chapter 34 — Building Plugins
```

---

## Pull Request Checklist

- [ ] The change is scoped: one feature, fix, or doc update per PR.
- [ ] All new public APIs are exported from `packages/nativecorejs/src/index.ts`.
- [ ] New runtime code has types — no `any` except where unavoidable, and justified with a comment.
- [ ] New components follow the [component conventions](#adding-a-component).
- [ ] `npm run smoke:sample` passes.
- [ ] Tests are added or updated if the change affects behaviour.
- [ ] Documentation is updated or added for user-facing changes.

---

## Adding a Component

All `nc-*` components live in `packages/nativecorejs/src/components/`. Follow these steps:

1. **Create the file**: `src/components/nc-<name>.ts`

2. **Use the established conventions:**
   - Extend `Component` (or `HTMLElement` for very simple cases).
   - Use `static useShadowDOM = true` for encapsulated components.
   - Declare `static get observedAttributes()` for every attribute you read.
   - Bind events in `onMount()` only — not `attributeChangedCallback()`.
   - Remove all global listeners in `onUnmount()`.
   - Use `escapeHTML()` for all user-supplied strings (backtick template strings; the `html` tagged template in the template package auto-escapes).
   - Expose `static attributeOptions = { variant: [...], size: [...] }` for enum-type attributes — this powers the dev-tools inspector.

3. **Register the component:**
   - Add the export to `src/components/index.ts`.
   - Add an entry to `src/components/builtinRegistry.ts`.

4. **Export from the package root:**
   - Add the named class export to `src/index.ts`.

5. **Write a test** in `src/__tests__/` using `mountComponent` and `waitFor`.

---

## Writing Plugins

Plugins extend the framework without modifying its core. They are registered via `registerPlugin()` before `router.start()`.

A plugin is a plain object conforming to the `NCPlugin` interface:

```typescript
import { registerPlugin, type NCPlugin } from 'nativecorejs';

const myPlugin: NCPlugin = {
    name: 'my-plugin',           // must be globally unique
    onInstall() {
        console.log('plugin installed');
        return () => console.log('plugin removed');
    },
    onNavigate({ path, params }) {
        // fires before controller runs
    },
    onNavigated({ path, params, match }) {
        // fires after pageloaded event
    },
};

registerPlugin(myPlugin);
```

If you are publishing a plugin as an npm package, use the naming convention `nativecorejs-plugin-<name>` (e.g. `nativecorejs-plugin-analytics`).

See [Chapter 34 — Building Plugins](./docs/ebook/34-building-plugins.md) for the full guide.

---

## Documentation

Documentation lives under `docs/`:

- **`docs/QUICK_START.md`** — 10-command getting-started guide. Update if the setup flow changes.
- **`docs/CHEATSHEET.md`** — single-page pattern reference. Update when APIs change.
- **`docs/ebook/`** — 35+ chapter deep-dive ebook. Each chapter is a standalone Markdown file.
- **`docs/case-studies/`** — real-world usage case studies. See `TEMPLATE.md` for the format.

When adding a new ebook chapter:
1. Create `docs/ebook/<number>-<kebab-title>.md`.
2. Add a Back/Next footer matching the style of existing chapters.
3. Add an entry to `docs/ebook/README.md` under the appropriate Part.
4. Update the previous chapter's Next link.

---

## Releasing

Only maintainers release. The process is documented in `docs/NPM_PUBLISHING.md`.

```bash
npm run publish:check      # dry-run both packages
npm run publish:runtime    # publish nativecorejs to npm
npm run publish:cli        # publish create-nativecore to npm
```

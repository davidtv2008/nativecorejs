# create-nativecore

Official CLI for scaffolding **NativeCoreJS** applications.

NativeCoreJS is a browser-native SPA framework: HTML views, `CoreController`,
reactive `signal` / `state`, `CoreComponent` Web Components, router, generators,
and a shipped `nc-*` UI library — without a virtual DOM.

This package is the **app generator**. It copies a full project template and
vendors the framework runtime under `.nativecore/`. New apps do **not** need a
runtime `nativecorejs` dependency (use that package only for library-style imports).

## Quick start

```bash
npx create-nativecore@latest my-app --defaults
cd my-app
npm run dev
```

TypeScript:

```bash
npx create-nativecore@latest my-app --ts
```

Open `http://localhost:8000`.

## What you get

| Area | Behavior |
|------|----------|
| Language | **JavaScript by default**; `--ts` for TypeScript |
| Shell | **Minimal HTML shell** (no header/footer/sidebar). Chrome components ship in the template for opt-in |
| Home | Calm enterprise starter page only — no login, dashboard, or marketing showcase routes |
| Framework | Vendored under `.nativecore/` (`core`, `utils`, `testing`, plus scaffold-owned `dev` / `scripts`) |
| UI | Full `nc-*` component set under `src/components/core/` |
| Tooling | HMR, Vitest, ESLint/HTMLHint, mock API helpers, `make:*` / `remove:*` generators |
| AI guidance | `.context/`, `.cursorrules`, `AGENTS.md`, `.github/copilot-instructions.md` |
| Auth | **Not shipped.** Router middleware / `make:middleware` / protected views stay available so you add your own model |
| Component Builder | Experimental and **disabled by default** |

### Canonical app APIs

Teach and use only:

- `ref` → `this.name` in controllers/components
- `this.signal` / `this.state` / `this.bind` / `this.on`
- `CoreController` + `CoreComponent` + `defineComponent`
- `r.register` / `r.group` / `createLazyController` / middleware tags
- `npm run make:view`, `make:component`, `make:store`, `make:middleware`, …
- `npm run build` / `npm run build:ssg`

Update an existing app later with:

```bash
npm run sync:core                 # .nativecore runtime (router/state/utils)
npm run sync:core -- <version>    # pin a published version
npm run sync:components           # additive src/components/core nc-* UI
npm run sync:components -- <version>
```

## Flags

| Flag | Description |
|------|-------------|
| `--defaults` | Skip prompts (JavaScript on, Capacitor off) |
| `--ts` / `--js` | Force TypeScript or JavaScript (JS is the default) |
| `--capacitor` / `--no-capacitor` | Include or exclude Capacitor packaging |
| `--out-dir <path>` | Output directory override |

## Auth is your responsibility

The scaffold keeps `group({ middleware: [...] })`, `make:middleware`, and
protected view generation. It does **not** ship a JWT login page, auth service,
or demo credentials. Add auth with your own best-practice model.

## Related packages

| Package | Role |
|---------|------|
| **`create-nativecore`** (this) | Scaffold CLI + template (vendors Core into apps) |
| [`nativecorejs`](https://www.npmjs.com/package/nativecorejs) | Publishable runtime for `import … from 'nativecorejs'` |

Monorepo / docs: [github.com/davidtv2008/nativecorejs](https://github.com/davidtv2008/nativecorejs)

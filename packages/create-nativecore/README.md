# create-nativecore

Official CLI for generating NativeCore applications.

## Goals

- scaffold a full NativeCore project with framework bulk, components, HMR, and dev tools
- ship a calm enterprise starter home page only — no login flow, dashboard, or component showcase
- use a minimal HTML shell by default (no header/footer/sidebar); chrome components remain available for opt-in
- leave protected-route APIs in place so users can add their own auth model

## Current starter behavior

- generates a JavaScript project by default; pass `--ts` for TypeScript
- uses npm for dependency installation by default
- scaffolds the full NativeCore-style source tree: `src/components`, `constants`, `core`, `dev`, `middleware`, `routes`, `services`, `stores`, `styles`, `types`, `utils`, and `views`
- includes `api/`, `scripts/`, test setup, lint config, HMR, and mock API helpers (no auth endpoints)
- includes reusable AI/context guidance files such as `.context/`, `.cursorrules`, `AGENTS.md`, and `.github/copilot-instructions.md`
- does not generate login, dashboard, or documentation marketing routes

## Usage

```bash
npx create-nativecore my-app --defaults
cd my-app
npm run dev
```

### Flags

| Flag | Description |
|------|-------------|
| `--defaults` | Skip prompts (JavaScript on, Capacitor off) |
| `--ts` / `--js` | Force TypeScript or JavaScript (JS is the default) |
| `--capacitor` / `--no-capacitor` | Include or exclude Capacitor packaging |
| `--out-dir <path>` | Output directory override |

## Auth is your responsibility

The scaffold keeps router middleware / `group({ middleware: [...] })` and `make:middleware` / `make:view` so you can build protected routes. It does **not** ship a JWT login page, auth service, or demo credentials. Add auth with your own best-practice model.

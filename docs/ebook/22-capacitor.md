# Chapter 22 — Capacitor

Optional native packaging. Not required for Deskflow on the web.

## Scaffold options

| Flag | Effect |
|------|--------|
| `--capacitor` | Include Capacitor deps + `cap:*` scripts + config |
| `--no-capacitor` / `--defaults` | Skip Capacitor packages |

Without Capacitor, scaffolds still expose:

```bash
npm run cap:init
```

which runs `npx cap init … --web-dir _deploy` so the web dir is correct.

## With Capacitor included

Typical scripts (exact set from scaffolder when `includeCapacitor` is true):

| Script | Purpose |
|--------|---------|
| `cap:sync` | `build:client` then `cap sync` |
| `cap:android` / `cap:ios` | Sync + open IDE |
| `cap:add:android` / `cap:add:ios` | Add platform |
| `cap:run:android` / `cap:run:ios` | Sync + run |

Config file: `capacitor.config.ts` or `capacitor.config.js` / `.cjs` depending on language mode.

## Localhost vs native WebView

`app` entry treats Capacitor’s WebView carefully: even if the origin looks like
localhost, **dev tools must not** treat a native build as the Node dev server.
Do not force-enable `__NATIVECORE_DEV__` in production native shells.

## Apply to Deskflow (optional)

> **Feature:** Package the web build for Android/iOS only if you need native.

1. Prefer scaffolding with `--capacitor`, or run `cap:init` later.
2. `npm run build:client` / `cap:sync` with platforms installed.
3. Open Android Studio / Xcode via the `cap:*` scripts.

## Verify

- [ ] `webDir` points at `_deploy` (or your chosen deploy folder)
- [ ] You are not relying on the DEV MODE pill inside the native shell

## Next

[Chapter 23 — i18n helper](./23-i18n-helper.md)

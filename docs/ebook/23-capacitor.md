# Chapter 23 — Capacitor

Deskflow is a Progressive Web App by default — it works in any browser and can
be installed as a PWA. If you need distribution through the App Store or Play
Store, Capacitor packages your existing web build into a native shell. Nothing
in your NativeCoreJS code changes; Capacitor wraps the `_deploy/` output.

This chapter is optional. Skip it if you are building a web-only product.

---

## Mental model (30 seconds)

```
npm run build:client         →  produces dist/ (the web bundle)
npx cap sync                 →  copies dist/ into the native project
npx cap open android         →  opens Android Studio
npx cap open ios             →  opens Xcode
```

The scaffold configures Capacitor's `webDir` to point at `_deploy/` (not
`dist/`). Run `build:client` — not just a TypeScript compile — before syncing
so the full client bundle is present.

---

## Scaffold options

| Flag at scaffold time | Effect |
|-----------------------|--------|
| `--capacitor` | Adds Capacitor dependencies and `cap:*` scripts to `package.json` |
| `--no-capacitor` or `--defaults` | Capacitor packages are not installed; `cap:init` is still available |

You can check whether your scaffold included Capacitor by looking at `package.json`:

```bash
# If these keys exist in scripts, Capacitor was included:
cap:sync, cap:android, cap:ios, cap:add:android, cap:add:ios, cap:run:android, cap:run:ios
```

Even without `--capacitor`, the scaffold exposes:

```bash
npm.cmd run cap:init
```

This runs `npx cap init … --web-dir _deploy` with the correct web directory
pre-filled.

---

## Scripts (when `--capacitor` is included)

| Script | What it does |
|--------|-------------|
| `cap:sync` | Runs `build:client` then `npx cap sync` |
| `cap:android` | `cap:sync` then `npx cap open android` |
| `cap:ios` | `cap:sync` then `npx cap open ios` |
| `cap:add:android` | `npx cap add android` |
| `cap:add:ios` | `npx cap add ios` |
| `cap:run:android` | `cap:sync` then `npx cap run android` |
| `cap:run:ios` | `cap:sync` then `npx cap run ios` |

The config file is `capacitor.config.ts` (TypeScript projects) or
`capacitor.config.js` / `capacitor.config.cjs` (JavaScript projects).

---

## Lab — Initialize Capacitor (if not already included)

If you scaffolded with `--defaults` and want to add Capacitor later:

### Step 1 — Install Capacitor

```bash
npm.cmd install @capacitor/core @capacitor/cli
```

### Step 2 — Initialize with the correct web directory

```bash
npm.cmd run cap:init
```

This is equivalent to:

```bash
npx cap init "Deskflow" "com.example.deskflow" --web-dir _deploy
```

A `capacitor.config.js` (or `.ts`) is created with `webDir: '_deploy'`.

### Step 3 — Add a platform

```bash
npx cap add android   # requires Android Studio
npx cap add ios       # macOS + Xcode only
```

### Step 4 — Build and sync

```bash
npm.cmd run build:client
npx cap sync
```

`build:client` compiles the app; `cap sync` copies the output and any installed
Capacitor plugins into the native project.

### Step 5 — Open the IDE

```bash
npx cap open android   # opens Android Studio
npx cap open ios       # opens Xcode
```

Build and run from the IDE as you would any native project.

---

## WebDir points at `_deploy`

The scaffold sets `webDir: '_deploy'`. This means:

- After `npm run build:client`, the compiled files are in `dist/`. They will
  not be picked up by Capacitor until you also copy or move them to `_deploy/`,
  or run the full `npm run build` / `npm run build:full` pipeline.
- The scripts `cap:sync` and `cap:android` / `cap:ios` call `build:client` for
  you, which compiles to `dist/`. If your `_deploy/` was populated by a
  previous `build:ssg` or `build:full`, the web assets there are what
  Capacitor uses.

For most Capacitor workflows:

```bash
npm.cmd run build        # compile + strip dev, populates dist/
npm.cmd run build:ssg    # optionally pre-render public routes into _deploy/
npx cap sync             # sync _deploy/ into native project
```

Or using the scaffold script if `--capacitor` was included:

```bash
npm.cmd run cap:android   # build:client + cap sync + open Android Studio
```

---

## Dev tools inside the native shell

The DEV MODE pill must **not** appear in a native Capacitor build. The
NativeCore runtime checks `__NATIVECORE_DEV__` which is `true` only when the
page is served by the Node dev server on localhost. Capacitor's WebView uses a
different origin (`capacitor://localhost` or a file URI) that the dev check
treats as production.

Do not manually set `__NATIVECORE_DEV__ = true` inside a Capacitor build.
The overlay is not designed to run without the dev server's companion endpoints.

---

## Challenge — Bronze

- [ ] Check `package.json` — does your Deskflow have `cap:*` scripts?
- [ ] Read `capacitor.config.ts` (or `.js`) and confirm `webDir` is `_deploy`
- [ ] Run `npx cap --version` to confirm Capacitor CLI is available

## Challenge — Silver

- [ ] Run the full `build → build:ssg → cap sync` pipeline
- [ ] Open the Android or iOS project in the IDE and build it
- [ ] Confirm the app loads and SPA navigation works inside the native shell

## Challenge — Gold

- [ ] Install a Capacitor plugin (e.g. `@capacitor/haptics`) and call it from
  a controller on iOS or Android
- [ ] Verify the same controller gracefully no-ops in the browser (where the
  plugin API is absent)

---

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Running `cap sync` before `build:client` | The web bundle is stale; sync copies whatever is in `_deploy/` |
| Expecting `webDir: 'dist'` | The scaffold sets `webDir: '_deploy'`; do not change this |
| Enabling DEV MODE inside the native shell | Check that `__NATIVECORE_DEV__` is not forced true in non-dev builds |
| Adding Capacitor plugins via `npm install` without `cap sync` | Plugins must be synced into the native project to take effect |
| Building on macOS for iOS without Xcode installed | Xcode is required; no workaround |

---

## Verify

- [ ] `capacitor.config.*` exists and `webDir` points at `_deploy`
- [ ] `npx cap sync` completes without errors after `npm run build:client`
- [ ] DEV MODE pill does not appear when the app runs inside the native shell

---

## What's next

- [Chapter 24 — i18n helper](./24-i18n-helper.md) — reactive locale switching
  and message catalogs

Milestone M9 is complete when you have a native build you can run on a
simulator or device. The next chapters cover internationalization and
troubleshooting.

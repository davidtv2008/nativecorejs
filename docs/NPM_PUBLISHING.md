# Publishing to npm

This monorepo publishes two packages:

| Package | Role |
|---------|------|
| [`nativecorejs`](../packages/nativecorejs) | Runtime library (`import … from 'nativecorejs'`) |
| [`create-nativecore`](../packages/create-nativecore) | Scaffolding CLI (`npx create-nativecore`) |

Current versions (keep them in sync when cutting a release): **`1.0.0-rc.13`**.

## How the packages relate

- **`create-nativecore` vendors** the framework into each app under `.nativecore/`.
  Generated apps do **not** install `nativecorejs` as a runtime dependency by
  default (only dev tooling).
- **`nativecorejs`** is for consumers who import the library directly
  (`nativecorejs`, `nativecorejs/a11y`, `nativecorejs/testing`, …), and for
  keeping a publishable runtime artifact aligned with the vendored sources.

Recommended publish order is still **runtime → CLI** so library consumers and
docs never see a CLI release that points at a missing runtime version. The CLI
package itself does not list `nativecorejs` as an npm dependency.

## First-time setup

1. Create an npm account at https://www.npmjs.com/signup if needed.
2. Verify your email on npm.
3. Log in on this machine:

```bash
npm login
npm whoami
```

## Pre-publish check

From the **repo root**:

```bash
npm run publish:check
```

This builds the runtime and dry-runs `npm pack` for both packages so you can
inspect tarball contents.

## Publish flow

From the repo root:

```bash
npm run publish:runtime   # npm publish packages/nativecorejs
npm run publish:cli       # npm publish packages/create-nativecore
```

Or both:

```bash
npm run publish:all
```

`nativecorejs` runs `prepublishOnly` → `build:full` (TypeScript + custom
elements manifest). `create-nativecore` publishes `bin/` + `template/` as-is
(no separate build step).

## Release checklist

1. Working tree clean (`git status`).
2. Bump versions in:
   - `packages/nativecorejs/package.json`
   - `packages/create-nativecore/package.json`
3. Commit the version bump.
4. `npm whoami`
5. `npm run publish:check`
6. `npm run publish:runtime`
7. Spot-check:

```bash
npm view nativecorejs version
```

8. `npm run publish:cli`
9. Spot-check scaffold:

```bash
npx create-nativecore@latest my-app --defaults
cd my-app && npm run dev
```

## Common errors

### `npm ERR! need auth`

```bash
npm login
```

### `403 Forbidden` / name taken / version exists

```bash
npm view nativecorejs versions --json
npm view create-nativecore versions --json
```

Bump the version, or confirm you own the package on npm.

### CLI works but `import 'nativecorejs'` fails for library users

Publish / bump **`nativecorejs`** first. Scaffold-only users who never import
the package are unaffected (they use vendored `.nativecore/`).

### Accidental publish of private monorepo root

The root `package.json` is `"private": true`. Always publish via
`publish:runtime` / `publish:cli` (or `npm publish` inside each package dir).

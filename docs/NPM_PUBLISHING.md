# Publishing To npm

This repo contains two publishable packages:

- `nativecorejs` - the runtime package
- `create-nativecore` - the scaffolding CLI

The expected release order is:

1. publish `nativecorejs`
2. publish `create-nativecore`

The CLI depends on the runtime existing on npm, so the runtime must be published first.

## First-time setup

1. Create an npm account at `https://www.npmjs.com/signup` if you do not already have one.
2. Verify your email in npm.
3. Log in on this machine:

```bash
npm login
```

4. Confirm the active npm identity:

```bash
npm whoami
```

## Pre-publish check

From the repo root, run:

```bash
npm run publish:check
```

This will:

- build the runtime
- preview the exact tarball contents for `nativecorejs`
- preview the exact tarball contents for `create-nativecore`

## Publish flow

From the repo root:

```bash
npm run publish:runtime
npm run publish:cli
```

Or publish both in sequence:

```bash
npm run publish:all
```

## Recommended first release checklist

1. Make sure `git status` is clean.
2. Run `npm whoami`.
3. Run `npm run publish:check`.
4. Publish the runtime with `npm run publish:runtime`.
5. Test installing it directly:

```bash
npm view nativecorejs version
```

6. Publish the CLI with `npm run publish:cli`.
7. Test the public initializer:

```bash
npx create-nativecore my-app
```

## Versioning

Both packages are currently at `0.1.0`.

When you make a new release:

1. bump the package versions you intend to publish
2. commit the version changes
3. run `npm run publish:check`
4. publish in runtime-then-CLI order

## Common first-time errors

### `npm ERR! need auth`

Run:

```bash
npm login
```

### `403 Forbidden - package already exists under another owner`

That package name is already taken, or you are trying to publish a version that already exists.

Check:

```bash
npm view nativecorejs versions --json
npm view create-nativecore versions --json
```

### CLI publish succeeds but `npx create-nativecore my-app` fails on install

That usually means `nativecorejs` was not published first, or the CLI version points at a runtime version that does not exist yet.
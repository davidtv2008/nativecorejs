# nativecorejs

Public monorepo for the NativeCore framework runtime and the official app installer.

## Packages

- `packages/nativecorejs` - framework runtime, primitives, components, utilities, and build helpers
- `packages/create-nativecore` - interactive CLI that scaffolds new NativeCore apps

## Positioning

This repository is the framework product.
The existing `nativecore` repository remains the fully built, deployable reference application and marketing/demo surface.

## Immediate goal

Split framework-grade code out of the demo app into `packages/nativecorejs`, then wire `create-nativecore` to generate clean app shells that depend on the published runtime instead of copying framework internals.

## Current workflow

- `npm install` installs workspace dependencies for the framework and CLI packages
- `npm run build` builds the `nativecorejs` runtime into `packages/nativecorejs/dist`
- `npx create-nativecore my-app` is expected to scaffold a TypeScript starter, run `npm install` automatically, and avoid demo docs routes entirely
- `npm run publish:check` builds the packages and previews both npm publish tarballs
- `npm run publish:runtime` publishes the `nativecorejs` runtime package to npm
- `npm run publish:cli` publishes the `create-nativecore` CLI package to npm
- `npm run create:sample` regenerates `sample-nativecore` against the local workspace package
- `npm run verify:sample` installs and compiles the generated `sample-nativecore` project
- `npm run smoke:sample` builds the runtime, regenerates a local sample starter, installs it, and compiles it in one step
- `npm run pack:runtime:dry` previews the files that would be published for `nativecorejs`
- `npm run verify:runtime:pack` builds the runtime and writes a publishable tarball into `.artifacts/`
- `npm run smoke:sample:packed` generates a sample app using the published dependency mode, installs the local tarball artifact, and compiles the sample against the packed runtime

The generated local sample uses a file dependency on `../packages/nativecorejs`, an import map for browser ESM resolution, and the framework base stylesheet from `node_modules/nativecorejs`.

## Extracted runtime status

The framework package already contains:

- router, component, state, lazy component registry, and helper utilities
- built-in component registration manifest for the reusable framework component set
- the extracted component library from `nativecore/src/components/core`, including navigation, forms, pickers, overlays, data display, and utility `nc-*` elements
- multi-element component modules such as accordion, bottom nav, form, stepper, and timeline

Components intentionally left in the app repo:

- `app-header`
- `app-sidebar`
- `app-footer`

## npm release

See `docs/NPM_PUBLISHING.md` for the first-time npm publish flow, login steps, dry-run validation, and publish order.

# create-nativecore

Official CLI for generating NativeCore applications.

## Goals

- prompt only for app-level starter decisions that actually vary
- generate app-level shells, routes, controllers, views, and styles
- keep framework internals inside the published `nativecorejs` package
- avoid shipping demo API code into new projects by default

## Current starter behavior

- always generates a TypeScript project
- installs `nativecorejs` as the framework dependency
- uses npm for dependency installation by default unless `--skip-install` is passed
- uses an import map so browser-loaded ESM can resolve `nativecorejs` without a bundler
- links the framework base stylesheet from `node_modules/nativecorejs/src/styles/base.css`
- registers built-in framework components during app bootstrap
- does not generate documentation routes or docs pages

## Local workspace mode

- pass `--local` to generate `"nativecorejs": "file:../packages/nativecorejs"`
- this is only supported from the `nativecorejs` monorepo root before publishing to npm
- generated local starters still expect the framework package to be built so `dist/` exists

## Install behavior

- `npx create-nativecore my-app` should scaffold the project and run `npm install` immediately by default
- use `--skip-install` when you only want files generated without dependency installation

## Planned templates

- landing plus app shell
- auth starter
- dashboard starter
- future deployment targets such as Cloudflare or Node

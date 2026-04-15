# create-nativecore

Official CLI for generating NativeCore applications.

## Goals

- prompt for common project setup decisions
- generate app-level shells, routes, controllers, views, and styles
- keep framework internals inside the published `nativecorejs` package
- avoid shipping demo API code into new projects by default

## Current starter behavior

- installs `nativecorejs` as the framework dependency
- uses an import map so browser-loaded ESM can resolve `nativecorejs` without a bundler
- links the framework base stylesheet from `node_modules/nativecorejs/src/styles/base.css`
- registers built-in framework components during app bootstrap

## Local workspace mode

- pass `--local` to generate `"nativecorejs": "file:../packages/nativecorejs"`
- this is intended for working inside the `nativecorejs` monorepo before publishing to npm
- generated local starters still expect the framework package to be built so `dist/` exists

## Planned templates

- landing plus app shell
- docs starter
- auth starter
- dashboard starter
- future deployment targets such as Cloudflare or Node

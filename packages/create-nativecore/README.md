# create-nativecore

Official CLI for generating NativeCore applications.

## Goals

- prompt only for app-level starter decisions that actually vary
- generate a full NativeCore project structure, not just a thin starter shell
- include dev tools, HMR, scripts, stores, services, middleware, mock API, tests, and source folders by default
- avoid shipping framework marketing/docs routes into new projects by default

## Current starter behavior

- always generates a TypeScript project
- uses npm for dependency installation by default unless `--skip-install` is passed
- scaffolds the full NativeCore-style source tree: `src/components`, `constants`, `core`, `dev`, `middleware`, `routes`, `services`, `stores`, `styles`, `types`, `utils`, and `views`
- includes `api/`, `scripts/`, test setup, lint config, HMR, and local mock authentication/data flow
- includes reusable AI/context guidance files such as `.context/`, `.cursorrules`, `AGENTS.md`, and `.github/copilot-instructions.md`
- does not generate documentation routes or docs pages

## Install behavior

- `npx create-nativecore my-app` should scaffold the project and run `npm install` immediately by default
- use `--skip-install` when you only want files generated without dependency installation

## Planned templates

- full app shell plus dashboard flow
- auth starter
- dashboard starter
- future deployment targets such as Cloudflare or Node

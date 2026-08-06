# Chapter 00 — Introduction

What NativeCoreJS is, what this ebook builds, and the accuracy rules that keep
examples honest.

## What NativeCoreJS is

NativeCoreJS is a **vanilla Web Components + SPA router** stack. Apps are
ordinary HTML views, ES modules, and custom elements — not a virtual DOM
framework. The usual way to start is:

```bash
npx create-nativecore@latest my-app --defaults
```

That copies a full scaffold: vendored `.nativecore/` runtime, generators
(`make:*` / `remove:*`), Vitest helpers, optional SSG, and a starter `src/` tree.

There is also a published **`nativecorejs`** npm package for library-style
imports. This book follows the **scaffold** (see
[A-package-vs-scaffold.md](./A-package-vs-scaffold.md)).

## What it is not

| Expectation | Reality in create-nativecore |
|-------------|------------------------------|
| React/Vue runtime | No — custom elements + controllers |
| Shipped JWT / login UI | **No** — protect routes with middleware you write |
| TypeScript-only | **JS is default**; `--ts` opts in |
| `build:bots` | Use **`build:ssg`** |
| Component Builder always on | **Disabled** in shipped denc-tools |

## Deskflow — one progressive app

You will build **Deskflow**, a small personal task desk:

- Public: home, tasks list, task detail
- Protected: settings (session middleware you implement)
- Shared: `task-card`, `task` store (`taskItems` / `loadTasks`), `api` / theme via `uiStore`

Each chapter adds one feature. Prefer generators over hand-wiring registries.

## Accuracy rules (read once)

1. Samples must match template source under `packages/create-nativecore/template`.
2. Prefer `npm.cmd run … -- <flags>` on Windows PowerShell.
3. Canonical bases: **`CoreController`**, **`CoreComponent`**.
4. Routes: **`r.register`** + **`createLazyController(import.meta.url)`**.
5. Label **package-only** APIs (`registerPlugin`, `useForm`, `nativecorejs/a11y`).
6. When unsure of a component method, open `src/components/core/<tag>.*` — do not invent.

## How to use this book

1. Scaffold Deskflow (Chapter 01).
2. Keep `npm run dev` running while you work.
3. Complete Part 1 before treating Part 2 as optional polish.
4. Use Chapter 24 when something breaks; Chapter 25 as a lookup table.

## Next

[Chapter 01 — Scaffold and tour](./01-scaffold-and-tour.md)

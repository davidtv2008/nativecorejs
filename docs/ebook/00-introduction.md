# Chapter 00 — Introduction

Welcome. This book teaches NativeCoreJS by building a real app from scratch.
Every chapter adds one working feature. By the end you will have a complete
single-page application with routing, reactive state, reusable components,
and your own middleware — built on nothing but browser standards.

## Mental model

NativeCoreJS is a **vanilla Web Components SPA framework**.
There is no virtual DOM. No JSX. No React, Vue, or Svelte.

Instead, you get:

- **Custom elements** rendered with Shadow DOM via `CoreComponent`
- **Page controllers** that own a view's logic via `CoreController`
- A **History API router** that swaps HTML views into `#main-content`
- **Reactive signals** built into every controller and component

The scaffold (`npx create-nativecore@latest`) vendors the entire runtime into
`.nativecore/` inside your project. You own the code — there is nothing to
upgrade except by choice.

## What it is not

A quick myth-busting table you will want to read now rather than discover later:

| Expectation | Reality |
|-------------|---------|
| Ships login / dashboard | No — auth is middleware you write |
| TypeScript only | JS is the default; `--ts` opts in |
| `build:bots` or `build:ssr` | Use `build:ssg` for static pre-rendering |
| `createStore` / `useSignal` APIs | Not in the scaffold — use `useState` from `@core/state.js` |
| Component Builder always on | Experimental, disabled by default — you will not need it |

## The app you will build: Deskflow

Every chapter builds on **Deskflow**, a personal task desk.
You will grow it incrementally:

| Chapter | Feature added |
|---------|---------------|
| 01 | Scaffold and dev server |
| 02 | `/tasks` and `/settings` routes |
| 03 | `TasksController` with refs and events |
| 04 | Reactive open-task counter |
| 05 | `task-card` component |
| 06 | Everything generated via CLI |

Deskflow is intentionally small so each concept stays visible.
You will not be wiring up a 300-file codebase before learning the basics.

## How to use this book

1. Start at Chapter 01 and scaffold Deskflow.
2. Keep `npm run dev` running in a terminal while you work.
3. Type every code sample — do not paste. The muscle memory matters.
4. When something breaks, check the Common Mistakes table in that chapter first.
5. Tackle Bronze challenges inline; leave Silver and Gold for after the chapter.

> **Windows PowerShell note:** When a generator flag like `--defaults` follows `--`,
> use `npm.cmd run` instead of `npm run`. This book uses `npm.cmd run` for every
> generator command.

## Accuracy rules

The samples in this book match the template source under
`packages/create-nativecore/template`. If you spot a discrepancy, the source wins.

- All imports use the `.js` extension, even in TypeScript files.
- `CoreController` and `CoreComponent` are the only base classes.
- Inside `registerRoutes(r)`, always call `r.register` — never `router.register`.

## Next

[Chapter 01 — Scaffold and tour](./01-scaffold-and-tour.md)

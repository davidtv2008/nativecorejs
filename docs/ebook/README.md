# NativeCoreJS: Building Modern SPAs on Native Browser Standards

This ebook is a hands-on guide to building production-ready single-page applications with NativeCoreJS — a framework built entirely on top of the web platform's own primitives: Web Components, the DOM, and native browser APIs. You will not find a virtual DOM here, nor JSX, nor a compilation step that transforms your code into something the browser cannot read natively. Every concept in this book maps directly to something the browser already understands.

Each chapter is practical and cumulative. You will build **Taskflow** — a personal task management web app — from an empty folder to a fully functional SPA with authentication, protected routing, a live task dashboard, project organization, and a polished UI. By the end, you will have internalized not just how NativeCoreJS works, but *why* it is designed the way it is.

---

## The Taskflow Project

Taskflow is a personal productivity app that lets users sign in, create projects, add tasks with priorities and due dates, and track their progress on a dashboard. It is complex enough to exercise every feature of the framework — routing, reactive state, controllers, components, services, authentication, caching, and testing — but focused enough that you can build it chapter by chapter without getting lost. Every new concept introduced in a chapter is immediately applied to Taskflow.

---

## Golden Rule: Always Use the Generators

Before creating any component, view, or controller file manually, check whether a `npm run make:*` command exists for it. The generators scaffold files that match the project conventions exactly and update `routes.ts`, `index.ts`, and `index.html` automatically.

```bash
npm run make:component <name>    # kebab-case, e.g. task-card
npm run make:view <path>         # interactive: view + optional controller
npm run make:controller <name>   # standalone controller
npm run make:store <name>        # global reactive store with actions
```

---

## Chapters

### Part 1 — Foundations

0. **[00 — Introduction](./00-introduction.md)**
   What NativeCoreJS is, its philosophy, how it compares to React/Vue/Svelte, and what you will build.

1. **[01 — Project Setup](./01-project-setup.md)**
   Scaffolding a new app with the CLI, understanding the generated file structure, path aliases, and the dev tools panel.

2. **[02 — First Component](./02-first-component.md)**
   The `Component` base class, Shadow DOM, `template()`, `onMount()`, `attributeChangedCallback()`, and building `<task-card>`.

3. **[03 — Reactive State](./03-reactive-state.md)**
   `useState()`, `computed()`, `useSignal()`, and building the `<task-stats>` component with live counters.

4. **[04 — The Bind API](./04-bind-api.md)**
   Fine-grained DOM patching with `bind()`, `bindAttr()`, `bindAll()`, and scoped event delegation with `on()`.

### Part 2 — Routing and Controllers

5. **[05 — Views and Routing](./05-views-and-routing.md)**
   HTML views, `routes.ts`, `router.register()`, `lazyController()`, protected routes, `data-*` conventions, and `npm run make:view`.

6. **[06 — Controllers](./06-controllers.md)**
   Controllers as async cleanup functions, `effect()`, `trackEvents()`, `disposers[]`, and `dom.data()`.

7. **[07 — Authentication](./07-authentication.md)**
   Auth flow, `auth.service`, protected routes, session persistence, the login view, and redirecting after sign-in.

8. **[08 — APIs and Async](./08-apis-and-async.md)**
   `api.service`, `getCached()`, `invalidateTags()`, loading states, error handling, and the projects controller.

9. **[09 — Forms and Validation](./09-forms-and-validation.md)**
   `<nc-input>`, `<nc-select>`, `<nc-switch>`, client-side validation, `<nc-modal>`, and the create-task form.

### Part 3 — Components and the UI Layer

10. **[10 — Core Components](./10-core-components.md)**
    Tour of all `nc-*` components: `<nc-button>`, `<nc-badge>`, `<nc-table>`, `<nc-modal>`, `<nc-tabs>`, `<nc-toast>`, and more.

11. **[11 — Advanced Patterns](./11-advanced-patterns.md)**
    Global stores, `composed: true` custom events, `patchState()`, debounced effects, and the `<project-filter>` component.

12. **[12 — Production](./12-production.md)**
    The `tsc` build pipeline, environment variables, SEO bot rendering, Netlify/Vercel deployment, PWA service worker, and performance tips.

### Part 4 — Advanced Routing

13. **[13 — Dynamic Routes, URL Parameters, and Wildcards](./13-dynamic-routes.md)**
    `:param`, `:param?`, `*` wildcards, `params` in controllers, the task-detail view at `/tasks/:id`, and custom 404 pages.

14. **[14 — Route Caching and Prefetching](./14-route-caching.md)**
    `.cache({ ttl, revalidate })` in depth, stale-while-revalidate, `router.prefetch()`, `router.bustCache()`, and a complete Taskflow caching strategy.

15. **[15 — API Data Caching and Invalidation](./15-api-caching.md)**
    `getCached()` options, `queryKey` strategies, tag-based invalidation, optimistic UI updates, and the Taskflow caching map.

16. **[16 — Router Middleware and Navigation Guards](./16-middleware.md)**
    `router.use()`, auth middleware, redirect patterns, `router.replace()` vs `navigate()`, and "save-on-navigate" guards.

### Part 5 — Application Architecture

17. **[17 — Global Stores and Cross-Route State](./17-global-stores.md)**
    Module-level `useState`, `taskStore`, `projectStore`, consuming stores in controllers, resetting on logout, and derived store values.

18. **[18 — Component Composition and Slots](./18-slots-and-composition.md)**
    Default and named slots, `::slotted()`, `::part()`, composing `<task-list>` and `<project-panel>`, and dynamic child rendering.

19. **[19 — Styling, Theming, and CSS Custom Properties](./19-styling-and-theming.md)**
    Design tokens, Shadow DOM encapsulation, dark mode, `::part()` theming, and scoped vs global styles.

### Part 6 — Quality and Mastery

20. **[20 — TypeScript Patterns in NativeCoreJS](./20-typescript-patterns.md)**
    Typed API responses, `ControllerFunction` type, typed custom events, generic stores, and path alias configuration.

21. **[21 — Accessibility and ARIA](./21-accessibility.md)**
    ARIA in shadow roots, `aria-live` regions, keyboard navigation, focus management, and accessibility testing.

22. **[22 — Testing with Vitest](./22-testing.md)**
    Unit testing state, testing controllers with happy-dom, component shadow DOM testing, mocking the router, and CI setup.

23. **[23 — CLI Mastery and the Generator Workflow](./23-cli-and-generators.md)**
    Deep dive into all `npm run make:*` generators, the complete Taskflow command history, remove commands, and the path forward.

### Part 7 — Real-World Scenarios

24. **[24 — Real-Time Features and WebSockets](./24-real-time-and-websockets.md)**
    Controller-owned WebSocket lifecycle, reactive message rendering, optimistic updates, reconnect patterns, and a complete chat thread example.

25. **[25 — Internationalization (i18n)](./25-internationalization.md)**
    Locale store, `t()` message lookup helper, `Intl`-based price/date/relative-time formatters, locale switcher, and component-level re-rendering on locale change.

26. **[26 — Mobile Patterns](./26-mobile-patterns.md)**
    `<nc-drawer>`, `<nc-bottom-nav>`, responsive shell layout, form behaviour with the software keyboard, safe area insets, and mobile testing strategy.

27. **[27 — Troubleshooting Guide](./27-troubleshooting.md)**
    Structured diagnostic checklists for routing failures, component registration issues, reactivity bugs, and build errors.

28. **[28 — Migration Guide](./28-migration-guide.md)**
    Mapping mental models from React, Vue, and vanilla JavaScript to NativeCoreJS with direct concept-to-concept tables and a side-by-side component migration example.

29. **[29 — Error Boundaries](./29-error-boundaries.md)**
    `<nc-error-boundary>`, fallback UI, `nc-error` event, `catchError()` for async errors, multiple boundaries, and monitoring integration.

30. **[30 — Framework API Quick Reference](./30-framework-api-quick-reference.md)**
    Fast lookup tables for framework APIs, signatures, one-line summaries, and links to full deep-dive chapters.

### Part 8 — Native Mobile Deployment

31. **[32 — Capacitor: Packaging for Android and iOS](./32-capacitor-mobile-deployment.md)**
    What Capacitor is, the full Android + iOS workflow, what you can build without a Mac, what requires macOS, Capacitor plugins, and a complete development cycle guide.

---

## How to Read This Book

- **Sequentially** is the recommended path. Each chapter builds on the last.
- **By topic** works if you already have NativeCoreJS experience. Jump to any chapter in Parts 4–6 independently.
- **Code-first** readers: each chapter contains complete, runnable code examples. Copy-paste them into your Taskflow project.

> **Tip:** All code samples use `npm run make:*` generators wherever applicable. If you see a new file being created, the first line will always be the generator command that creates it.

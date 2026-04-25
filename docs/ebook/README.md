# NativeCoreJS: Building Modern SPAs on Native Browser Standards

This ebook is a hands-on guide to building production-ready single-page applications with NativeCoreJS — a framework built entirely on top of the web platform's own standards: Web Components, the DOM, and native browser APIs. You will not find a virtual DOM here, nor JSX, nor a compilation step that transforms your code into something the browser cannot read natively. Every concept in this book maps directly to something the browser already understands.

Each chapter introduces a framework concept and immediately applies it to one of **five real projects** you build from scratch. By the time you finish the final chapter you will have shipped four fully deployed web applications and one bonus native mobile app.

---

## The Five-Project Path

Every chapter in this book has a designated project. Concepts are never introduced in isolation — each one produces a visible, testable feature by the end of the chapter. At the end of each project block there is a **Checkpoint** section that confirms the app is complete and deployable.

| # | Project | Chapters | What you build |
|---|---|---|---|
| 1 | **Taskflow** — Personal Task Manager | 00 – 13 | Auth, tasks, dashboard, modals, API, and production deployment |
| 2 | **ShopBoard** — E-commerce Dashboard | 14 – 20 | Dynamic routes, caching, cart store, slots, dark-mode theming |
| 3 | **DevHub** — Developer Portfolio & Feed | 21 – 27 | TypeScript types, accessibility, test suite, WebSocket feed, i18n, mobile shell |
| 4 | **EnterpriseKit** — Internal Tools Platform | 28 – 37 (excl. 32) | Plugins, SSG, feature-module architecture, published component library |
| ★ | **Taskflow Mobile** — Capacitor Bonus | 32 | Native Android + iOS packaging and store-ready release build |

> **Note:** Projects 2–4 each start with a fresh `npx create-nativecore` scaffold. Every concept you learned in previous projects carries forward — you are not starting from zero, you are building on proven patterns.

---

## Project Summaries

### Project 1 — Taskflow (Chapters 00 – 13)

A personal task management SPA. Users sign in, create projects, add tasks with priorities and due dates, and track progress on a live dashboard. Taskflow exercises every foundational feature of the framework: routing, reactive state, controllers, components, services, authentication, caching, and the complete production build pipeline.

**Final deliverable:** Taskflow deployed to Netlify, Vercel, or Cloudflare Pages.

### Project 2 — ShopBoard (Chapters 14 – 20)

An e-commerce analytics dashboard with a browsable product catalog, a cart, and a wishlist. ShopBoard exercises the advanced routing and architecture layer: dynamic routes, multi-level caching, navigation guards, cross-route global stores, component composition with slots, and a complete CSS design-token system with dark mode.

**Final deliverable:** ShopBoard deployed with a working cart and dark-mode theme.

### Project 3 — DevHub (Chapters 21 – 27)

A developer portfolio app with a live project feed and a blog. DevHub exercises quality, operability, and real-world UX: typed API responses and events, ARIA-annotated components, a full Vitest test suite, WebSocket live notifications, three-locale i18n, and a mobile-responsive shell with a bottom nav.

**Final deliverable:** DevHub deployed with full accessibility compliance and a passing test suite.

### Project 4 — EnterpriseKit (Chapters 28 – 37, excluding 32)

A modular internal tools platform. EnterpriseKit exercises enterprise-grade patterns: troubleshooting discipline, performance profiling with the dev overlay, migrating a legacy component, SSG pre-rendering for marketing pages, a plugin-based analytics system, feature-module organization, and a shared component library published to npm.

**Final deliverable:** EnterpriseKit deployed with pre-rendered public pages and a published npm package.

### ★ Bonus — Taskflow Mobile (Chapter 32)

The Taskflow app from Project 1 packaged as a native app using Capacitor. You add the native platforms, run in the Android Emulator, and produce a signed APK ready for Google Play. On macOS you also run in the iOS Simulator and produce an archive ready for App Store submission.

**Final deliverable:** A signed Android APK and (on macOS) a built iOS archive.

---

## Golden Rule: Always Use the Generators

Before creating any component, view, or controller file manually, check whether a `npm run make:*` command exists for it. The generators scaffold files that match the project conventions exactly and update `routes.js`, `index.js`, and `index.html` automatically.

```bash
npm run make:component <name>    # kebab-case, e.g. task-card
npm run make:view <path>         # interactive: view + optional controller
npm run make:controller <name>   # standalone controller
npm run make:store <name>        # global reactive store with actions
```

---

## Chapters

### Project 1 — Taskflow: Personal Task Manager

**Goal:** Ship a complete, authenticated, API-connected task management app.

#### Part 1 — Foundations

0. **[00 — Introduction](./00-introduction.md)**
   What NativeCoreJS is, its philosophy, how it compares to React/Vue/Svelte, and the five projects you will build.

1. **[01 — Project Setup](./01-project-setup.md)**
   Scaffold Taskflow with the CLI, understand the generated file structure, path aliases, and the dev tools panel.

2. **[02 — First Component](./02-first-component.md)**
   The `Component` base class, Shadow DOM, `template()`, `onMount()`, `attributeChangedCallback()`, and building `<task-card>`.

3. **[03 — Error Boundaries](./03-error-boundaries.md)**
   `<nc-error-boundary>`, root and nested boundaries, fallback UI, the `nc-error` event, and build-time mode swapping.

4. **[04 — Reactive State](./04-reactive-state.md)**
   `useState()`, `computed()`, `effect()`, `batch()`, and building the `<task-stats>` component with live counters.

5. **[05 — The Bind API](./05-bind-api.md)**
   Fine-grained DOM patching with `bind()`, `bindAttr()`, `bindClass()`, `bindStyle()`, declarative `wire*` bindings, and scoped event delegation with `on()`.

#### Part 2 — Routing and Controllers

6. **[06 — Views and Routing](./06-views-and-routing.md)**
   HTML views, `routes.js`, `router.register()`, `lazyController()`, protected routes, `data-*` conventions, and `npm run make:view`.

7. **[07 — Controllers](./07-controllers.md)**
   Controllers as async cleanup functions, wire-first bindings (`wire*`), `effect()`, `trackEvents()`, and `dom.view()`.

8. **[08 — Authentication](./08-authentication.md)**
   Auth flow, `auth.service`, protected routes, session persistence, the login view, and redirecting after sign-in.

9. **[09 — APIs and Async](./09-apis-and-async.md)**
   `api.service`, `getCached()`, `invalidateTags()`, loading states, error handling, and the tasks controller.

10. **[10 — Forms and Validation](./10-forms-and-validation.md)**
    `<nc-input>`, `<nc-select>`, `<nc-switch>`, client-side validation, `<nc-modal>`, and the create-task form.

#### Part 3 — Components and the UI Layer

11. **[11 — Core Components](./11-core-components.md)**
    Tour of all `nc-*` components: `<nc-button>`, `<nc-badge>`, `<nc-table>`, `<nc-modal>`, `<nc-tabs>`, `<nc-toast>`, and more.

12. **[12 — Advanced Patterns](./12-advanced-patterns.md)**
    Global stores, `composed: true` custom events, `patchState()`, debounced effects, and the `<project-filter>` component.

13. **[13 — Production](./13-production.md)**
    The `tsc` build pipeline, environment variables, SEO bot rendering, Netlify/Vercel deployment, PWA service worker, and performance tips.

> ✅ **Project 1 Checkpoint** — By the end of Chapter 13, Taskflow is live at a public URL.

---

### Project 2 — ShopBoard: E-commerce Analytics Dashboard

**Goal:** Build a product catalog, cart, and wishlist app that demonstrates advanced routing, caching, global stores, and a complete theming system.

#### Part 4 — Advanced Routing

14. **[14 — Dynamic Routes, URL Parameters, and Wildcards](./14-dynamic-routes.md)**
    `:param`, `:param?`, `*` wildcards, `params` in controllers, and the product-detail view at `/products/:id`.

15. **[15 — Route Caching and Prefetching](./15-route-caching.md)**
    `.cache({ ttl, revalidate })` in depth, stale-while-revalidate, `router.prefetch()`, `router.bustCache()`, and the ShopBoard caching strategy.

16. **[16 — API Data Caching and Invalidation](./16-api-caching.md)**
    `getCached()` options, `queryKey` strategies, tag-based invalidation, optimistic UI updates, and the ShopBoard caching map.

17. **[17 — Router Middleware and Navigation Guards](./17-middleware.md)**
    `router.use()`, cart auth guard, redirect patterns, `router.replace()` vs `navigate()`, and "save-on-navigate" checkout guards.

#### Part 5 — Application Architecture

18. **[18 — Global Stores and Cross-Route State](./18-global-stores.md)**
    Module-level `useState`, `cartStore`, `wishlistStore`, consuming stores in controllers, resetting on logout, and derived store values.

19. **[19 — Component Composition and Slots](./19-slots-and-composition.md)**
    Default and named slots, `::slotted()`, `::part()`, composing `<product-card>` and `<product-grid>`, and dynamic child rendering.

20. **[20 — Styling, Theming, and CSS Custom Properties](./20-styling-and-theming.md)**
    Design tokens, Shadow DOM encapsulation, dark mode, `::part()` theming, and scoped vs global styles.

> ✅ **Project 2 Checkpoint** — By the end of Chapter 20, ShopBoard is live with a working cart and dark-mode theme.

---

### Project 3 — DevHub: Developer Portfolio & Live Feed

**Goal:** Build a portfolio app with typed APIs, full accessibility, a Vitest test suite, WebSocket notifications, i18n, and a mobile-ready shell.

#### Part 6 — Quality and Mastery

21. **[21 — TypeScript Patterns in NativeCoreJS](./21-typescript-patterns.md)**
    JavaScript API response handling, controller contracts, custom events, reusable stores, and path alias configuration.

22. **[22 — Accessibility and ARIA](./22-accessibility.md)**
    ARIA in shadow roots, `aria-live` regions, keyboard navigation, focus management, and accessibility testing.

23. **[23 — Testing with Vitest](./23-testing.md)**
    Unit testing state, testing controllers with happy-dom, component shadow DOM testing, mocking the router, and CI setup.

24. **[24 — CLI Mastery and the Generator Workflow](./24-cli-and-generators.md)**
    Deep dive into all `npm run make:*` generators, the complete DevHub command history, remove commands, and the path forward.

#### Part 7 — Real-World Scenarios

25. **[25 — Real-Time Features and WebSockets](./25-real-time-and-websockets.md)**
    Controller-owned WebSocket lifecycle, reactive message rendering, optimistic updates, reconnect patterns, and a live notifications feed.

26. **[26 — Internationalization (i18n)](./26-internationalization.md)**
    Locale store, `t()` message lookup helper, `Intl`-based price/date/relative-time formatters, locale switcher, and component-level re-rendering on locale change.

27. **[27 — Mobile Patterns](./27-mobile-patterns.md)**
    `<nc-drawer>`, `<nc-bottom-nav>`, responsive shell layout, form behaviour with the software keyboard, safe area insets, and mobile testing strategy.

> ✅ **Project 3 Checkpoint** — By the end of Chapter 27, DevHub is live with accessibility compliance, a passing test suite, and a mobile-responsive shell.

---

### Project 4 — EnterpriseKit: Internal Tools Platform

**Goal:** Build a modular, plugin-powered internal tools platform with SSG pre-rendering, feature-module architecture, and a published shared component library.

#### Part 8 — Observability and Migration

28. **[28 — Troubleshooting Guide](./28-troubleshooting.md)**
    Structured diagnostic checklists for routing failures, component registration issues, reactivity bugs, and build errors — applied to EnterpriseKit.

29. **[29 — Dev Tools and the Performance Overlay](./29-dev-tools-and-performance-overlay.md)**
    The component inspector, HMR, and the live performance HUD — used to profile and optimize EnterpriseKit routes.

30. **[30 — Migration Guide](./30-migration-guide.md)**
    Mapping mental models from React, Vue, and vanilla JavaScript — used to migrate a legacy component into EnterpriseKit.

31. **[31 — Framework API Quick Reference](./31-framework-api-quick-reference.md)**
    Fast lookup tables for all framework APIs — use this as your reference while building EnterpriseKit.

#### Part 9 — SEO, Plugins, and Architecture

33. **[33 — SSG and Static Deployment](./33-ssg-and-deployment.md)**
    SSG vs SSR, `build:ssg` and `build:full`, deploying EnterpriseKit's marketing pages to Cloudflare Pages and S3 + CloudFront.

34. **[34 — Building Plugins](./34-building-plugins.md)**
    The `NCPlugin` interface, `registerPlugin()` / `unregisterPlugin()`, lifecycle hooks — analytics and feature-flag plugins for EnterpriseKit.

35. **[35 — Enterprise Architecture](./35-enterprise-architecture.md)**
    Feature-module layout, barrel exports, multi-level middleware, dependency injection — reorganizing EnterpriseKit for team scale.

36. **[36 — Framework Comparison](./36-framework-comparison.md)**
    Side-by-side comparison with React, Vue 3, Svelte, and Lit — used to write an Architecture Decision Record for EnterpriseKit.

37. **[37 — Using NativeCoreJS Components in Other Frameworks](./37-web-components-in-other-frameworks.md)**
    Build `<nc-greeting>` once, use it in React/Vue/Svelte/Angular — and publish the EnterpriseKit shared component library to npm.

> ✅ **Project 4 Checkpoint** — By the end of Chapter 37, EnterpriseKit is live with SSG pre-rendering and its component library is published.

---

### ★ Bonus — Taskflow Mobile: Native Android & iOS

**Goal:** Package the Taskflow app from Project 1 as a native mobile app using Capacitor and ship it to both platforms.

32. **[32 — Capacitor: Packaging for Android and iOS](./32-capacitor-mobile-deployment.md)**
    What Capacitor is, the full Android + iOS workflow, what you can build without a Mac, Capacitor plugins, and a complete development cycle guide. Produces a signed Android APK and an iOS build archive.

> 🚀 **Bonus Project Checkpoint** — By the end of Chapter 32, you have a signed Android APK and an iOS build workflow complete.

---

## How to Read This Book

- **Sequentially** is the recommended path. Each chapter builds on the last, and every project depends on knowing the concepts from the previous one.
- **By project** works if you want to skip ahead. Start any project at its first chapter — the project summary above tells you what prior knowledge is assumed.
- **By topic** works if you already have NativeCoreJS experience. Jump to any chapter in Parts 4–9 independently.
- **Code-first** readers: each chapter contains complete, runnable code examples that you apply directly to the active project.

> **Tip:** All code samples use `npm run make:*` generators wherever applicable. If you see a new file being created, the first line will always be the generator command that creates it.

---

## Governance

The following documents define how chapters are written and reviewed:

- **[Chapter Template](./governance/chapter-template.md)** — Reusable structure every chapter must follow.
- **[Contributor Checklist](./governance/contributor-checklist.md)** — Verify a chapter includes project work and completion criteria.
- **[Curriculum Matrix](./governance/curriculum-matrix.md)** — Chapter → concept → project feature → output, to prevent scope drift.
# Chapter 00 — Introduction

## What Is NativeCoreJS?

NativeCoreJS is a framework for building single-page applications on top of the web platform's own standards. It uses Web Components for encapsulation, the real DOM for rendering, native browser routing primitives for navigation, and TypeScript for type safety. There is no virtual DOM, no JSX transform, no proprietary template compilation step, and no runtime that abstracts the browser away from you.

The framework's central bet is that the browser is already a capable application runtime, and that most of the complexity in modern front-end toolchains exists to work around limitations that no longer apply to current browsers. Shadow DOM gives you style encapsulation. `customElements.define()` gives you reusable, lifecycle-aware components. `MutationObserver` and the `attributeChangedCallback` give you reactive attribute handling. NativeCoreJS provides the thin, coherent layer of conventions and utilities that makes these primitives ergonomic to compose into real applications.

## The Philosophy

**Native first.** Every output NativeCoreJS produces is valid, inspectable, runnable browser code. Open DevTools and you will see real custom elements in the DOM tree, real shadow roots, real event listeners. There is nothing to mentally translate.

**Fine-grained reactivity without a virtual DOM.** When a piece of state changes, NativeCoreJS updates exactly the DOM nodes that depend on it — not a component subtree, not a diff of a rendered string. The `bind()` API maps state directly to DOM nodes. The browser does the rest.

**Explicit data flow.** State lives in `useState()` containers. Dependencies between state values are declared with `computed()`. Side effects are declared with `effect()`. There are no surprises about when or why the UI updates: you can read the data flow top to bottom.

**Cleanup is a first-class concern.** Every reactive binding, every event listener, every controller is expected to clean up after itself. The framework automates cleanup for bindings registered through the component API. Controllers return a cleanup function. This discipline eliminates entire categories of memory leaks and stale-listener bugs.

**Convention over configuration.** The CLI generates views, controllers, and components with a consistent structure. The file layout is predictable. Import aliases are configured out of the box. You spend your time on application logic, not tooling decisions.

## How It Compares

This book is not a polemic against React, Vue, or Svelte — all are excellent frameworks with large ecosystems and good reasons to choose them. The comparison below is meant to orient you, not to persuade.

**React** uses a virtual DOM and JSX. Components re-render as functions; the reconciler decides what changes. NativeCoreJS has no reconciler. State changes patch specific DOM nodes.

**Vue 3** uses a Proxy-based reactivity system and a compiler-optimised virtual DOM. Its template syntax is close to HTML. NativeCoreJS templates are plain HTML strings — there is nothing to compile.

**Svelte** compiles components to vanilla JS at build time, eliminating the framework runtime. NativeCoreJS ships a small runtime but relies on the browser's own Web Components runtime, which is already present.

None of these frameworks is wrong. NativeCoreJS occupies a specific point in the design space: small runtime, no virtual DOM, maximum alignment with browser standards, and a strict cleanup discipline that makes long-lived SPAs reliable.

## What You Will Build: Five Projects

This book is structured around **five real projects** that you build from scratch and deploy. Every chapter introduces a framework concept and immediately applies it to the active project — no isolated exercises, no toy demos.

### Project 1 — Taskflow (Chapters 00 – 13)

A personal task management SPA with authentication, a live dashboard, and a full task CRUD interface. Taskflow is where you learn the fundamentals: components, reactive state, routing, controllers, auth, API data, forms, and the production build pipeline. By the end of Chapter 13 you will have a deployed app at a real public URL.

### Project 2 — ShopBoard (Chapters 14 – 20)

An e-commerce analytics dashboard with a product catalog, a cart, and a wishlist. ShopBoard is where you apply the advanced routing and architecture layer: dynamic routes, multi-level caching, navigation guards, cross-route global stores, component composition with slots, and a full CSS design-token system with dark mode.

### Project 3 — DevHub (Chapters 21 – 27)

A developer portfolio app with a live project feed, multilingual content, and a mobile-responsive shell. DevHub is where you apply quality and operability: TypeScript types, ARIA accessibility, a Vitest test suite, WebSocket notifications, i18n, and a mobile-first layout with a bottom nav and safe area insets.

### Project 4 — EnterpriseKit (Chapters 28 – 37)

A modular internal tools platform. EnterpriseKit is where you apply enterprise-grade patterns: plugin-based analytics, SSG pre-rendering for marketing pages, feature-module architecture, and a shared component library published to npm. This project also covers the troubleshooting discipline, dev-tools profiling, and migration from legacy frameworks.

### ★ Bonus — Taskflow Mobile (Chapter 32)

The Taskflow app from Project 1 packaged as a native app using Capacitor. You add the Android and iOS native projects, run in the Android Emulator, and produce a signed APK. On macOS you also complete the iOS build workflow and produce an App Store archive.

---

> **How the projects relate:** Each project starts with a fresh `npx create-nativecore` scaffold. Prior concepts carry forward — you are never starting from zero, you are building on patterns you have already shipped. The five projects together cover every framework API, every production concern, and the full spectrum of app complexity.

## Prerequisites

This book assumes:

- **TypeScript basics** — you are comfortable with types, interfaces, generics, and `async/await`. You do not need to be an expert; each TypeScript feature used is briefly explained.
- **HTML and CSS** — you can read and write HTML markup and understand CSS selectors and the box model.
- **Browser DevTools** — you know how to open the Elements panel, the Console, and the Network tab.
- **Node.js 20+** — installed on your machine. The framework CLI and dev server run on Node.
- **A package manager** — `npm` (used throughout this book), `pnpm`, or `yarn` all work.

You do not need prior experience with any other JavaScript framework. If you have used React or Vue, you will find the concepts familiar but the implementation refreshingly direct.

---

> **Tip:** All code samples in this book are available in the companion repository. Each chapter has a corresponding branch so you can check out the exact state of any project at any point.

---

## Apply This Chapter to All Five Projects

> **This is the overview chapter.** There is no code to write yet — but there is something specific to do before moving on.

Review the [Project Roadmap in the README](./README.md#the-five-project-path) and write down one sentence for each project describing what *you* personally want to build in it. The projects in this book are templates — you will follow the guided features, but you should already be thinking about how you might extend them.

### Done Criteria

- [ ] You have read the five project summaries and understand which chapters belong to each project.
- [ ] You have Node.js 20+ installed and `node --version` prints `v20.x.x` or higher.
- [ ] You have a code editor open and a terminal ready.
- [ ] You know which deployment target you will use for Project 1 (Netlify, Vercel, or Cloudflare Pages are all free).

---

**Back:** [Ebook Index](./README.md)  
**Next:** [Chapter 01 — Project Setup](./01-project-setup.md)

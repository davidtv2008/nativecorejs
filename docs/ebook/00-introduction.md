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

## What You Will Build: Taskflow

Throughout this book you will build **Taskflow**, a personal task management SPA. Here is what the finished app includes:

- **Authentication** — sign-in and sign-out with session persistence.
- **Projects** — create and switch between named projects.
- **Tasks** — add tasks with a title, description, priority, and due date. Mark them complete. Delete them.
- **Dashboard** — a live overview showing total tasks, completed tasks, overdue tasks, and a per-project summary.
- **Protected routing** — unauthenticated users are redirected to the login page; the router restores the intended destination after sign-in.

Each chapter introduces a new NativeCoreJS concept and immediately applies it to a real piece of Taskflow. By Chapter 12 the app is complete, tested, and ready to deploy.

## Prerequisites

This book assumes:

- **TypeScript basics** — you are comfortable with types, interfaces, generics, and `async/await`. You do not need to be an expert; each TypeScript feature used is briefly explained.
- **HTML and CSS** — you can read and write HTML markup and understand CSS selectors and the box model.
- **Browser DevTools** — you know how to open the Elements panel, the Console, and the Network tab.
- **Node.js 20+** — installed on your machine. The framework CLI and dev server run on Node.
- **A package manager** — `npm` (used throughout this book), `pnpm`, or `yarn` all work.

You do not need prior experience with any other JavaScript framework. If you have used React or Vue, you will find the concepts familiar but the implementation refreshingly direct.

---

> **Tip:** All code samples in this book are available in the companion repository. Each chapter has a corresponding branch so you can check out the exact state of Taskflow at any point.

---

**What's Next:** [Chapter 01 — Project Setup](./01-project-setup.md) — scaffold your first NativeCoreJS app and take a tour of the generated project structure.

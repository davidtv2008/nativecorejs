# NativeCoreJS: Building Modern SPAs on Native Browser Standards

This ebook is a hands-on guide to building production-ready single-page applications with NativeCoreJS — a framework built entirely on top of the web platform's own primitives: Web Components, the DOM, and native browser APIs. You will not find a virtual DOM here, nor JSX, nor a compilation step that transforms your code into something the browser can't read natively. Every concept in this book maps directly to something the browser already understands.

Each chapter is practical and cumulative. You will build **Taskflow** — a personal task management web app — from an empty folder to a fully functional SPA with authentication, protected routing, a live task dashboard, project organization, and a polished UI. By the end, you will have internalized not just how NativeCoreJS works, but *why* it is designed the way it is.

---

## The Taskflow Project

Taskflow is a personal productivity app that lets users sign in, create projects, add tasks with priorities and due dates, and track their progress on a dashboard. It is complex enough to exercise every feature of the framework — routing, reactive state, controllers, components, services, and authentication — but focused enough that you can build it chapter by chapter without getting lost. Every new concept introduced in a chapter is immediately applied to Taskflow.

---

## Chapters

0. **[00 — Introduction](./00-introduction.md)**
   What NativeCoreJS is, its philosophy, how it compares to other frameworks, and what you will build.

1. **[01 — Project Setup](./01-project-setup.md)**
   Scaffolding a new app with the CLI, understanding the generated file structure, and starting the dev server.

2. **[02 — First Component](./02-first-component.md)**
   The `Component` base class, Shadow DOM, `template()`, `onMount()`, `attributeChangedCallback()`, and building `<task-card>`.

3. **[03 — Reactive State](./03-reactive-state.md)**
   `useState()`, `computed()`, `useSignal()`, and building the `<task-stats>` component with live counters.

4. **[04 — The Bind API](./04-bind-api.md)**
   Fine-grained DOM patching with `bind()`, `bindAttr()`, `bindAll()`, and scoped event delegation with `on()`.

5. **[05 — Views and Routing](./05-views-and-routing.md)**
   HTML views, the `routes.ts` file, `router.register()`, `lazyController()`, protected routes, and `data-*` conventions.

6. **[06 — Controllers](./06-controllers.md)**
   Controllers as async cleanup functions, `effect()`, `trackEvents()`, `dom.data()`, and building `tasksController`.

7. **[07 — Services and the API Layer](./07-services.md)**
   The service layer pattern, `api.service.js`, `auth.service.js`, typed responses, error handling, and loading states.

8. **[08 — Authentication](./08-authentication.md)**
   Auth flow, protected routes, the auth service, session persistence, the login view, and redirecting after sign-in.

9. **[09 — Forms and Validation](./09-forms.md)**
   Handling forms in controllers, client-side validation, showing inline errors, and the new-task form in Taskflow.

10. **[10 — The Dashboard](./10-dashboard.md)**
    Composing multiple components, parallel data fetching, `computed()` aggregates, and the Taskflow dashboard view.

11. **[11 — Performance and Production](./11-performance.md)**
    Route caching, lazy controllers, code splitting, the `.nativecore/` inspector, and building for production.

12. **[12 — Testing](./12-testing.md)**
    Unit-testing state and controllers, component testing with the DOM, integration testing views, and CI setup.

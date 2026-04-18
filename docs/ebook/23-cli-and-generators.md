# Chapter 23 — CLI Mastery and the Generator Workflow

Every framework has a philosophy about how you create new files. In NativeCoreJS, the philosophy is simple: **you don't create them manually**. The `npm run make:*` generators exist so that every component, view, and controller in your project starts life in the correct location, with the correct imports, and with the correct structure. Consistency is enforced by tooling, not by convention documents that people forget to read.

This chapter is your complete reference for every generator, the conventions they enforce, and the precise workflow used to build Taskflow from Chapter 2 through Chapter 22.

---

## 23.1 The Philosophy: Generators First

When you create a file by hand, you have to remember:

- The correct directory path
- The correct import aliases
- The `defineComponent` call and its placement
- The `trackEvents` pattern for controllers
- The route registration syntax
- The controller index export

Miss any one of these and something breaks — often silently, because a missing export just means the route never registers.

The generators know all of this. Run them first, every time.

> **Rule of thumb:** If you find yourself manually creating a `.ts` or `.html` file anywhere in `src/`, stop and ask: is there a `make:*` command for this? There almost certainly is.

---

## 23.2 `npm run make:component` Deep Dive

```bash
npm run make:component <name>
```

**Requirements:**
- Name must be in **kebab-case** with at least one hyphen. This is a Web Components platform requirement — custom element names must contain a hyphen to distinguish them from standard HTML elements.
- Valid: `task-card`, `priority-badge`, `project-panel`, `task-list-item`
- Invalid: `taskcard`, `TaskCard`, `task_card`

**What it generates:**

```
src/components/
└── ui/
    └── task-card.ts
```

The generated `task-card.ts` file includes:

- `import { Component, defineComponent } from '@core/component.js'`
- `import { useState } from '@core/state.js'`
- `class TaskCard extends Component` with `static useShadowDOM = true`
- A shadow DOM `template()` with a `<style>` block and placeholder markup
- `onMount()` and `onUnmount()` stubs
- `defineComponent('task-card', TaskCard)` at the bottom — auto-registers the element globally

The generator also appends `componentRegistry.register('task-card', './ui/task-card.js')` to `src/components/appRegistry.ts` so the lazy loader can auto-import it when the tag appears in a view.

**Example:**

```bash
npm run make:component priority-badge
```

Generates `src/components/ui/priority-badge.ts`. Open it and customize the template, attributes, and handlers.

---

## 23.3 `npm run make:view` Deep Dive

```bash
npm run make:view <path>
```

The path supports nesting:

```bash
npm run make:view tasks              # src/views/protected/tasks.html
npm run make:view login              # src/views/public/login.html
npm run make:view tasks/detail       # src/views/protected/tasks/detail.html
npm run make:view tasks/new-task-form
```

**Interactive prompts:**

1. **Protected or public?** — Protected views require authentication (the router redirects unauthenticated users to the login route). Public views are accessible to everyone.
2. **Route path** — The URL path for this view. Supports:
   - Static: `/tasks`
   - Dynamic segment: `/tasks/:id`
   - Optional segment: `/tasks/:id?`
   - Wildcard: `/docs/*`
3. **Create a controller? (Y/N)** — If yes, generates `src/controllers/<flat-name>.controller.ts` alongside the view.

**What it generates and updates:**

| File | Action |
|------|--------|
| `src/views/{public\|protected}/<path>.html` | Created — view HTML stub |
| `src/controllers/<name>.controller.ts` | Created (if Y) — full controller pattern |
| `src/routes/routes.ts` | Updated — adds `.register()` call |
| `src/controllers/index.ts` | Updated — adds export for the controller |
| `index.html` nav | Updated (for simple top-level routes) |

The route registration added to `routes.ts` looks like:

```typescript
router.register('/tasks/:id', protectedRoutes, tasksDetailController);
```

You will never need to manually edit `routes.ts` for a new view.

---

## 23.4 `npm run make:controller` Deep Dive

```bash
npm run make:controller <name>
```

Use this when you need a standalone controller that was not generated as part of a `make:view` call — for example, if you initially said N to the controller prompt and later changed your mind, or if you need a shared controller used by multiple views.

**What it generates and updates:**

| File | Action |
|------|--------|
| `src/controllers/<name>.controller.ts` | Created — full pattern with `trackEvents`, `disposers[]`, and `effect()` stubs |
| `src/controllers/index.ts` | Updated — adds the export |

The generated controller always follows the canonical pattern:

```typescript
import { trackEvents } from '@core-utils/events.js';
import { effect } from '@core/state.js';

export async function nameController(params: Record<string, string> = {}): Promise<() => void> {
    const events = trackEvents();
    const disposers: Array<() => void> = [];

    disposers.push(effect(() => {
        // reactive DOM updates here
    }));

    events.onClick('[data-hook="some-button"]', () => {
        // handler
    });

    return () => {
        events.cleanup();
        disposers.forEach(d => d());
    };
}
```

---

## 23.5 The Generator Workflow for Building Taskflow

Every component, view, and controller in Taskflow was created with a generator. Here is the complete table:

| Chapter | Command | What it creates |
|---------|---------|-----------------|
| 02 | `npm run make:component task-card` | `TaskCard` component — the core display unit |
| 03 | `npm run make:component task-stats` | `TaskStats` component — summary counts |
| 05 | `npm run make:view tasks` | Tasks protected view + `tasksController` |
| 06 | `npm run make:controller tasks` | Tasks controller (if not created via make:view) |
| 07 | `npm run make:view login` | Login public view + `loginController` |
| 08 | `npm run make:view projects` | Projects protected view + `projectsController` |
| 09 | `npm run make:view tasks/new-task-form` | New task form view + `newTaskFormController` |
| 13 | `npm run make:view task-detail` | Task detail view + `taskDetailController` with `:id` route |
| 18 | `npm run make:component task-list` | `TaskList` composition component |
| 18 | `npm run make:component project-panel` | `ProjectPanel` nested composition component |

Run these commands in this order and you get a correctly scaffolded Taskflow project every time. The source code you write lives *inside* the generated files — the generators produce the skeleton; you fill in the logic.

---

## 23.6 The Scripts Directory

All generators live in `.nativecore/scripts/`. They are Node.js scripts that:

1. Validate the input (kebab-case check, duplicate check)
2. Read Handlebars templates from `.nativecore/templates/`
3. Write the output files
4. Patch `routes.ts` and `index.ts` using AST-aware string manipulation

If a generator produces incorrect output — wrong import path, wrong naming convention — fix the template in `.nativecore/templates/`. Never manually edit a generated file to work around a generator bug, because the next person who runs the generator gets the broken version.

> **Warning:** The `.nativecore/` directory is part of the framework. Do not modify it unless you are intentionally customizing the framework's scaffolding for your team's conventions. Commit any changes you make there so everyone on the team gets the same behavior.

---

## 23.7 Removing Files

Generators have complementary remove commands that undo everything the `make:*` commands did:

```bash
npm run remove:view tasks/new-task-form
# Removes the .html file, the .controller.ts file,
# removes the .register() call from routes.ts,
# removes the export from controllers/index.ts

npm run remove:component priority-badge
# Removes src/components/ui/priority-badge.ts and unregisters it
```

Always use `remove:*` rather than manually deleting files. A manual delete leaves orphaned route registrations and index exports that cause runtime errors.

---

## 23.8 Custom Naming Conventions

The generators enforce these conventions throughout the project:

| Artifact | Convention | Example |
|----------|-----------|---------|
| Component file name | kebab-case `.ts` | `task-card.ts` |
| Component class name | PascalCase | `TaskCard` |
| Component element name | kebab-case, min 1 hyphen | `task-card` |
| View path | kebab-case segments | `tasks/new-task-form` |
| Controller file name | kebab-case | `tasks.controller.ts` |
| Controller function name | camelCase | `tasksController` |
| Route path segments | kebab-case | `/new-task-form` |
| Param segments | camelCase | `/:taskId` |

Follow these religiously. The generators validate them and will reject invalid names with a helpful error message. Consistent naming means any developer can predict where any file lives without searching.

---

## 23.9 What `make:view` Does Under the Hood

Understanding the internals helps when debugging unexpected results:

1. **Writes the view HTML** to `src/views/{public|protected}/<path>.html` with a `data-view` attribute matching the view name.
2. **Writes the controller** to `src/controllers/<flat-name>.controller.ts` with the canonical `trackEvents` + `disposers` pattern.
3. **Patches `src/routes/routes.ts`** — finds the appropriate `registerRoutes()` function (public or protected), appends a `.register({ path, controller })` call.
4. **Patches `src/controllers/index.ts`** — appends `export { nameController } from './<flat-name>.controller.js'`.
5. **Patches `index.html`** — for simple top-level routes, appends a `<a>` link to the navigation bar.

The patching is done with regex-based string manipulation. The generators expect files to have the standard structure — avoid restructuring `routes.ts` or `controllers/index.ts` manually or the generators may fail to find the correct insertion point.

---

## Congratulations — You've Built Taskflow

You have reached the end of the NativeCoreJS ebook. Over 23 chapters you built **Taskflow** — a fully functional personal task management SPA — from a blank project template to a production-ready application with:

- **Custom components** (`task-card`, `task-stats`, `priority-badge`, `task-list`, `project-panel`) with shadow DOM encapsulation, typed attributes, and accessible markup
- **Reactive state** with `useState`, `computed`, and `effect` — all auto-disposed through the framework's lifecycle hooks
- **Controllers** following the `trackEvents` + `disposers` pattern, with typed params and clean cleanup functions
- **Authentication** with protected routes and the auth service
- **Full theming** via CSS custom properties and `::part()` — including a working dark mode
- **Comprehensive tests** using Vitest and happy-dom — unit tests, controller tests, component tests, and integration tests
- **CI** via GitHub Actions running `npm ci && npm test` on every push

### Where to Go Next

The ebook continues in **Part 7 — Real-World Scenarios**:

- **[Chapter 24 — Real-Time Features and WebSockets](./24-real-time-and-websockets.md)** — controller-owned socket lifecycle, message rendering, optimistic updates, and reconnect logic
- **[Chapter 25 — Internationalization (i18n)](./25-internationalization.md)** — locale store, `t()` helper, `Intl`-based formatters, and reactive locale switching
- **[Chapter 26 — Mobile Patterns](./26-mobile-patterns.md)** — `nc-drawer`, `nc-bottom-nav`, responsive shell layout, and mobile testing strategy
- **[Chapter 27 — Troubleshooting Guide](./27-troubleshooting.md)** — diagnostic checklists for routing, component, reactivity, and build failures
- **[Chapter 28 — Migration Guide](./28-migration-guide.md)** — mapping mental models from React, Vue, and vanilla JavaScript to NativeCoreJS

External resources:

- **[NativeCoreJS Documentation](https://nativecorejs.dev/docs)** — the full API reference
- **[Component Gallery](https://nativecorejs.dev/gallery)** — community-contributed components
- **[GitHub — davidtv2008/nativecorejs](https://github.com/davidtv2008/nativecorejs)** — open issues, review the roadmap, and consider contributing

The best way to deepen your understanding is to extend Taskflow: add a `<calendar-view>` component, build a drag-and-drop task board, or integrate a WebSocket for real-time updates (Chapter 24 walks you through exactly that). Every feature is an opportunity to practice the patterns in this book.

Happy building.

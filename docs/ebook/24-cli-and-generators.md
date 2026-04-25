# Chapter 24 — CLI Mastery and the Generator Workflow

> **What you'll build in this chapter:** Audit DevHub and confirm every file was generated with a `make:*` command — regenerating any manually created files — then document the complete generator history in `routes.js`.

Every framework has a philosophy about how you create new files. In NativeCoreJS, the philosophy is simple: **you don't create them manually**. The `npm run make:*` generators exist so that every component, view, and controller in your project starts life in the correct location, with the correct imports, and with the correct structure. Consistency is enforced by tooling, not by convention documents that people forget to read.

This chapter is your complete reference for every generator, the conventions they enforce, and the precise workflow used to build Taskflow from Chapter 02 through Chapter 23.

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
npm run make:component <name> -- --with-tests
```

**Requirements:**
- Name must be in **kebab-case** with at least one hyphen. This is a Web Components platform requirement — custom element names must contain a hyphen to distinguish them from standard HTML elements.
- Valid: `task-card`, `priority-badge`, `project-panel`, `task-list-item`
- Invalid: `taskcard`, `TaskCard`, `task_card`

**Flags:**

| Flag | Effect |
|---|---|
| *(none)* | Generates the component file only |
| `--with-tests` | Also generates `src/components/ui/__tests__/<name>.test.js` with starter tests using `mountComponent` and `waitFor` |

**What it generates:**

```
src/components/
└── ui/
    ├── task-card.js
    └── __tests__/
        └── task-card.test.js  (only with --with-tests)
```

The generated `task-card.js` file includes:

- `import { Component, defineComponent } from '@core/component.js'`
- `import { useState } from '@core/state.js'`
- `class TaskCard extends Component` with `static useShadowDOM = true`
- A shadow DOM `template()` with a `<style>` block and placeholder markup
- `onMount()` and `onUnmount()` stubs
- `defineComponent('task-card', TaskCard)` at the bottom — auto-registers the element globally

The generator also appends `componentRegistry.register('task-card', './ui/task-card.js')` to `src/components/appRegistry.js` so the lazy loader can auto-import it when the tag appears in a view.

**Example:**

```bash
npm run make:component priority-badge -- --with-tests
```

Generates `src/components/ui/priority-badge.js` and `src/components/ui/__tests__/priority-badge.test.js`. Open both and customize the template, attributes, handlers, and starter tests.

---

## 23.3 `npm run make:view` / `npm run make:page` Deep Dive

```bash
npm run make:view <path>
npm run make:page <path>   # alias — identical behaviour
```

`make:page` is a convenience alias for `make:view` for developers whose mental model maps to "pages" rather than "views". Both commands are identical.

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
3. **Create a controller? (Y/N)** — If yes, generates `src/controllers/<flat-name>.controller.js` alongside the view.

**What it generates and updates:**

| File | Action |
|------|--------|
| `src/views/{public\|protected}/<path>.html` | Created — view HTML stub |
| `src/controllers/<name>.controller.js` | Created (if Y) — full controller pattern |
| `src/routes/routes.js` | Updated — adds `.register()` call |
| `src/controllers/index.js` | Updated — adds export for the controller |
| `index.html` nav | Updated (for simple top-level routes) |

The route registration added to `routes.js` looks like:

```javascript
router.register('/tasks/:id', protectedRoutes, tasksDetailController);
```

You will never need to manually edit `routes.js` for a new view.

---

## 23.4 `npm run make:controller` Deep Dive

```bash
npm run make:controller <name>
```

Use this when you need a standalone controller that was not generated as part of a `make:view` call — for example, if you initially said N to the controller prompt and later changed your mind, or if you need a shared controller used by multiple views.

**What it generates and updates:**

| File | Action |
|------|--------|
| `src/controllers/<name>.controller.js` | Created — wire-first pattern (`wireContents`, `wireAttributes`, `wireInputs`, `wireClasses`, `wireStyles`) plus explicit event cleanup |
| `src/controllers/index.js` | Updated — adds the export |

The generated controller now follows the canonical wire-first pattern:

```javascript
import { trackEvents } from '@core-utils/events.js';
import { wireContents, wireAttributes, wireInputs, wireClasses, wireStyles } from '@core-utils/wires.js';

export async function nameController(params = {}) {
    const events = trackEvents();
    const { title } = wireContents();
    const { status } = wireAttributes();
    const { email } = wireInputs();
    const { active } = wireClasses();
    const { width } = wireStyles();

    events.onClick('[data-hook="some-button"]', () => {
        title.value = 'Updated';
        status.value = 'active';
        active.value = true;
        width.value = '75%';
    });

    return () => {
        // wire* and reactive primitives are auto-cleaned.
        // explicit cleanup kept for tracked events.
        events.cleanup();
    };
}
```

---

## 23.5 `npm run make:store` Deep Dive

```bash
npm run make:store <name>
```

Creates a **global reactive store** with typed state, a `computed` count, and three async actions (load, add, remove) pre-wired with `batch()` for atomic state updates and optimistic rollback on failure.

```bash
npm run make:store task
```

**What it generates and updates:**

| File | Action |
|------|--------|
| `src/stores/<name>.store.js` | Created — typed store with `useState`, `computed`, `batch`, and API actions |
| `src/stores/index.js` | Updated (or created) — adds the barrel export |

The generated store follows the canonical pattern:

```javascript
// src/stores/task.store.js
import { useState, computed, batch } from '@core/state.js';
import { pausePageCleanupCollection, resumePageCleanupCollection } from '@core/pageCleanupRegistry.js';

// Task shape: { id, ... }

pausePageCleanupCollection();
export const taskItems   = useState([]);
export const taskLoading = useState(false);
export const taskError   = useState(null);
resumePageCleanupCollection();

export const taskCount = computed(() => taskItems.value.length);

export async function loadTasks(force = false) {
    batch(() => { taskLoading.value = true; taskError.value = null; });
    try {
        const data = await api.getCached('/tasks', { ttl: 60_000, revalidate: !force });
        batch(() => { taskItems.value = data; taskLoading.value = false; });
    } catch (err) {
        batch(() => {
            taskError.value   = err instanceof Error ? err.message : 'Failed';
            taskLoading.value = false;
        });
    }
}
```

`pausePageCleanupCollection()` / `resumePageCleanupCollection()` prevent the router from tearing down module-level state on navigation. Without them, navigating away and back would reset all your store values.

---

## 23.6 The Generator Workflow for Building Taskflow

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
| 17 | `npm run make:store task` | `task.store.js` — global task state and actions |
| 17 | `npm run make:store project` | `project.store.js` — global project state and actions |
| 18 | `npm run make:component task-list` | `TaskList` composition component |
| 18 | `npm run make:component project-panel` | `ProjectPanel` nested composition component |

Run these commands in this order and you get a correctly scaffolded Taskflow project every time. The source code you write lives *inside* the generated files — the generators produce the skeleton; you fill in the logic.

---

## 23.7 The Scripts Directory

All generators live in `.nativecore/scripts/`. They are Node.js scripts that:

1. Validate the input (kebab-case check, duplicate check)
2. Read Handlebars templates from `.nativecore/templates/`
3. Write the output files
4. Patch `routes.js` and `index.js` using AST-aware string manipulation

If a generator produces incorrect output — wrong import path, wrong naming convention — fix the template in `.nativecore/templates/`. Never manually edit a generated file to work around a generator bug, because the next person who runs the generator gets the broken version.

> **Warning:** The `.nativecore/` directory is part of the framework. Do not modify it unless you are intentionally customizing the framework's scaffolding for your team's conventions. Commit any changes you make there so everyone on the team gets the same behavior.

---

## 23.8 Removing Files

Generators have complementary remove commands that undo everything the `make:*` commands did:

```bash
npm run remove:view tasks/new-task-form
# Removes the .html file, the .controller.js file,
# removes the .register() call from routes.js,
# removes the export from controllers/index.js

npm run remove:component priority-badge
# Removes src/components/ui/priority-badge.js and unregisters it
```

Always use `remove:*` rather than manually deleting files. A manual delete leaves orphaned route registrations and index exports that cause runtime errors.

---

## 23.9 Custom Naming Conventions

The generators enforce these conventions throughout the project:

| Artifact | Convention | Example |
|----------|-----------|---------|
| Component file name | kebab-case `.ts` | `task-card.js` |
| Component class name | PascalCase | `TaskCard` |
| Component element name | kebab-case, min 1 hyphen | `task-card` |
| View path | kebab-case segments | `tasks/new-task-form` |
| Controller file name | kebab-case | `tasks.controller.js` |
| Controller function name | camelCase | `tasksController` |
| Route path segments | kebab-case | `/new-task-form` |
| Param segments | camelCase | `/:taskId` |

Follow these religiously. The generators validate them and will reject invalid names with a helpful error message. Consistent naming means any developer can predict where any file lives without searching.

---

## 23.10 What `make:view` Does Under the Hood

Understanding the internals helps when debugging unexpected results:

1. **Writes the view HTML** to `src/views/{public|protected}/<path>.html` with a `data-view` attribute matching the view name.
2. **Writes the controller** to `src/controllers/<flat-name>.controller.js` with the canonical wire-first + explicit event cleanup pattern.
3. **Patches `src/routes/routes.js`** — finds the appropriate `registerRoutes()` function (public or protected), appends a `.register({ path, controller })` call.
4. **Patches `src/controllers/index.js`** — appends `export { nameController } from './<flat-name>.controller.js'`.
5. **Patches `index.html`** — for simple top-level routes, appends a `<a>` link to the navigation bar.

The patching is done with regex-based string manipulation. The generators expect files to have the standard structure — avoid restructuring `routes.js` or `controllers/index.js` manually or the generators may fail to find the correct insertion point.

---

## Congratulations — You've Built Taskflow

You have reached the end of the NativeCoreJS ebook. Over 23 chapters you built **Taskflow** — a fully functional personal task management SPA — from a blank project template to a production-ready application with:

- **Custom components** (`task-card`, `task-stats`, `priority-badge`, `task-list`, `project-panel`) with shadow DOM encapsulation, typed attributes, and accessible markup
- **Reactive state** with `useState`, `computed`, and `effect` — all auto-disposed through the framework's lifecycle hooks
- **Controllers** following the wire-first + explicit event cleanup pattern, with typed params and clean cleanup functions
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

The best way to deepen your understanding is to extend the projects in this book: add a `<calendar-view>` component to Taskflow, build a drag-and-drop product board for ShopBoard, or wire up additional WebSocket channels in DevHub. Every extension is an opportunity to practice the patterns you have learned.

---

## Done Criteria

- [ ] Every view in DevHub was created with `npm run make:view`.
- [ ] Every component in DevHub was created with `npm run make:component` (use `--with-tests` for all feature components).
- [ ] No manually created `.ts` component or controller files exist in `src/`.
- [ ] The complete `make:*` command history is documented in a comment block in `src/routes/routes.js`.

---

**Back:** [Chapter 23 — Testing with Vitest](./23-testing.md)  
**Next:** [Chapter 25 — Real-Time Features and WebSockets](./25-real-time-and-websockets.md)
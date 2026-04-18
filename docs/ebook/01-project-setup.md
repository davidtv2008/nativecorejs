# Chapter 01 — Project Setup

## Scaffolding with the CLI

NativeCoreJS ships a zero-config project scaffolder. Open a terminal, navigate to wherever you keep your projects, and run:

```bash
npm create nativecore@latest taskflow
```

The CLI will walk you through a short series of prompts:

```
✔ Project name: taskflow
✔ Include example components? No
✔ TypeScript? Yes
✔ CSS preprocessor: None (plain CSS)
✔ Package manager: npm
```

For Taskflow, answer as shown above. When the prompts complete, the CLI installs dependencies and prints:

```
✔ Project created in ./taskflow
  cd taskflow && npm run dev
```

---

## The Generated File Structure

Change into the new directory and open it in your editor:

```bash
cd taskflow
```

Here is what the scaffold produces:

```
taskflow/
├── .nativecore/              # Dev tooling panel and internal config
│   └── devtools.config.ts
├── src/
│   ├── components/           # Reusable Web Components
│   ├── controllers/          # Route controllers
│   ├── services/             # API and auth service modules
│   ├── routes/
│   │   └── routes.ts         # Central route registry
│   └── views/
│       ├── public/           # Views accessible without auth
│       └── protected/        # Views that require authentication
├── public/                   # Static assets (images, fonts)
├── index.html                # App shell
├── package.json
└── tsconfig.json
```

### `index.html` — The App Shell

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Taskflow</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/routes/routes.ts"></script>
  </body>
</html>
```

The `#app` div is the router outlet — the framework swaps view HTML in and out of this element as the user navigates. The single `<script>` tag boots the router.

### `src/routes/routes.ts`

```typescript
import { router } from '@core/router.js';
import { lazyController } from '@core/lazy.js';

router.register('/', 'src/views/public/home.html', lazyController(() =>
  import('../controllers/home.controller.ts')
));

router.start();
```

`router.register()` maps a URL path to an HTML view file and an optional controller. `lazyController()` wraps the dynamic import so the controller module is only loaded when the route is first visited. `router.start()` begins listening for navigation events.

### `tsconfig.json` — Path Aliases

```json
{
  "compilerOptions": {
    "paths": {
      "@core/*":       ["./node_modules/nativecorejs/core/*"],
      "@core-utils/*": ["./node_modules/nativecorejs/utils/*"],
      "@services/*":   ["./src/services/*"],
      "@components/*": ["./src/components/*"],
      "@controllers/*":["./src/controllers/*"]
    }
  }
}
```

These aliases mean you never write relative `../../` import paths. Every import in this book uses an alias.

---

## Starting the Dev Server

```bash
npm run dev
```

The terminal prints:

```
  NativeCoreJS dev server running
  ➜  Local:   http://localhost:5173/
  ➜  DevTools: http://localhost:5173/__devtools__
```

Open `http://localhost:5173/` in your browser. You will see the default home view — a placeholder page the scaffolder generated. Leave the dev server running; it supports Hot Module Replacement (HMR) and will reload changed modules without a full page refresh.

---

## The `.nativecore/` Dev Tools Panel

Visit `http://localhost:5173/__devtools__` (or click the floating badge the framework injects in development builds). The panel has two tabs:

**Component Inspector** — click any element in the panel's live DOM preview to see its shadow root contents, its current attribute values, and its registered bindings. Useful for debugging why a `bind()` is or isn't updating.

**HMR Log** — shows which modules were invalidated and re-executed on each file save. If a hot reload silently fails (rare), this tab tells you why.

> **Tip:** The dev tools panel is injected only when `NODE_ENV=development`. It is stripped from production builds automatically.

---

## Generating Files with the CLI

The CLI has three generator commands you will use throughout this book:

```bash
npm run make:component Name        # creates src/components/name/Name.ts
npm run make:view name             # interactive: creates view + optional controller
npm run make:controller name       # creates src/controllers/name.controller.ts
```

Each generator writes a file with the correct imports, boilerplate structure, and TypeScript types already in place. You will use these commands in every chapter rather than writing boilerplate by hand.

---

## Creating the Taskflow Project

Let's establish the file structure we will build into over the coming chapters. Run these commands now:

```bash
npm run make:view login
# ? Create a controller for this view? No
# ? Route path: /login
# ? Public or protected? public

npm run make:view tasks
# ? Create a controller for this view? Yes
# ? Route path: /tasks
# ? Public or protected? protected

npm run make:view dashboard
# ? Create a controller for this view? Yes
# ? Route path: /
# ? Public or protected? protected
```

The CLI updates `routes.ts` for you, adding each new route. Open `src/routes/routes.ts` now — it should look like this:

```typescript
import { router } from '@core/router.js';
import { lazyController } from '@core/lazy.js';

router.register('/login', 'src/views/public/login.html',
  lazyController(() => import('../controllers/login.controller.ts'))
);

router.register('/tasks', 'src/views/protected/tasks.html',
  lazyController(() => import('../controllers/tasks.controller.ts'))
).cache();

router.register('/', 'src/views/protected/dashboard.html',
  lazyController(() => import('../controllers/dashboard.controller.ts'))
).cache();

export const protectedRoutes = ['/tasks', '/'];

router.start();
```

Notice `.cache()` on the protected routes — this tells the router to keep the parsed view HTML in memory after the first load, avoiding a re-fetch on subsequent visits. We will revisit caching in Chapter 11.

---

> **Note:** The `protectedRoutes` array is the authoritative list of paths that require authentication. The router checks this list before mounting a view and redirects to `/login` if the user is not signed in. We will wire up the actual auth check in Chapter 08.

---

**What's Next:** [Chapter 02 — First Component](./02-first-component.md) — build the `<task-card>` Web Component using the `Component` base class, Shadow DOM, and `attributeChangedCallback`.

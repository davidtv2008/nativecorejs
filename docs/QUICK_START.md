# NativeCoreJS Quick Start

Go from zero to a running app in 10 commands.

---

## Prerequisites

- **Node.js 18+** (check: `node --version`)
- **npm 9+** (check: `npm --version`)

---

## 10 Commands

```bash
# 1. Scaffold a new app
npx create-nativecore my-app --defaults

# 2. Enter the project directory
cd my-app

# 3. Start the development server (auto-compiles TypeScript + HMR)
npm run dev

# 4. Open http://localhost:8000 in your browser
#    You'll see the home page. The dev overlay (bottom-right) shows FPS, memory,
#    route, DOM count, and network status.

# 5. Create your first component
npm run make:component task-card

# 6. Create a new view + controller (interactive)
npm run make:view /tasks

# 7. Create a global store
npm run make:store task

# 8. Run tests
npm test

# 9. Build for production
npm run build

# 10. Preview the production build locally (serves from _deploy/)
npx serve _deploy
```

---

## What You Get

| Directory | Purpose |
|---|---|
| `src/app.ts` | App entry point — init, router, middleware |
| `src/routes/routes.ts` | Route → view → controller mappings |
| `src/views/` | HTML view partials (loaded by the router) |
| `src/controllers/` | Async controller functions |
| `src/components/` | Custom elements (`Component` subclasses) |
| `src/stores/` | Global reactive stores |
| `src/services/` | API and auth service |
| `src/middleware/` | Router middleware (auth guards, etc.) |
| `.nativecore/` | Framework core — router, state, reconciler, dev tools |
| `api/` | Local mock API (runs inside the dev server) |

---

## Key Mental Models

**Components** are Web Components — real custom HTML elements.

```typescript
// src/components/ui/task-card.ts
class TaskCard extends Component {
    template() { return `<div class="card">${this.getAttribute('title')}</div>`; }
    onMount() { /* event listeners, reactive bindings */ }
    onUnmount() { /* cleanup */ }
}
defineComponent('task-card', TaskCard);
```

**State** is explicit and reactive.

```typescript
const [count, setCount] = useState(0);
effect(() => console.log('count is', count.value));
setCount(1); // logs "count is 1"
```

**Controllers** are async functions that return a cleanup function.

```typescript
export async function tasksController(): Promise<() => void> {
    const disposers: Array<() => void> = [];
    const tasks = useState<Task[]>([]);
    disposers.push(effect(() => renderList(tasks.value)));
    return () => disposers.forEach(d => d());
}
```

**Routing** is code-based, not file-based.

```typescript
router
    .register('/', 'src/views/public/home.html', lazyController(...))
    .register('/tasks', 'src/views/tasks.html', lazyController(...))
    .register('/tasks/:id', 'src/views/task-detail.html', lazyController(...));
```

---

## Deploying

```bash
npm run build:full    # build + SSG pre-render public routes
# Upload _deploy/ to Cloudflare Pages, Netlify, or S3+CloudFront
```

---

## Next Steps

- Read **[Chapter 00 — Introduction](./ebook/00-introduction.md)** to understand the philosophy.
- Work through **[Chapter 01 — Project Setup](./ebook/01-project-setup.md)** for a full tour of the generated files.
- Jump to **[CHEATSHEET.md](./CHEATSHEET.md)** for a single-page pattern reference.
- See **[docs/ebook/README.md](./ebook/README.md)** for the full chapter list.

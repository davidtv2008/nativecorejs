# Chapter 35 — Enterprise Architecture

This chapter covers patterns for scaling a NativeCoreJS application across multiple feature teams, large route counts, and long-term maintainability requirements.

---

## Application Structure at Scale

The default `create-nativecore` scaffold organises code by type (`controllers/`, `components/`, `stores/`). This works well for small teams. Once a project grows beyond ~10 routes or 3 teams, **feature-module organisation** scales better.

### Feature-Module Layout

```
src/
├── app.ts                              ← entry point
├── routes/
│   └── routes.ts                       ← central route registry
│
├── features/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.store.ts
│   │   ├── auth.service.ts
│   │   ├── components/
│   │   │   └── login-form.ts
│   │   └── views/
│   │       └── login.html
│   │
│   ├── tasks/
│   │   ├── tasks.controller.ts
│   │   ├── task-detail.controller.ts
│   │   ├── tasks.store.ts
│   │   ├── components/
│   │   │   ├── task-card.ts
│   │   │   └── task-list.ts
│   │   └── views/
│   │       ├── tasks.html
│   │       └── task-detail.html
│   │
│   └── dashboard/
│       ├── dashboard.controller.ts
│       ├── dashboard.store.ts
│       └── views/
│           └── dashboard.html
│
├── shared/
│   ├── components/                     ← components used by >1 feature
│   ├── stores/                         ← stores shared across features
│   └── services/                       ← shared API/auth services
│
└── styles/
```

Each feature owns its routes, controllers, views, components, and stores. Teams can work in parallel with minimal merge conflicts.

### Barrel Exports per Feature

Each feature directory exports a single `index.ts` that registers its components and re-exports its store:

```typescript
// src/features/tasks/index.ts
import { defineComponent } from 'nativecorejs';
import { TaskCard } from './components/task-card.js';
import { TaskList } from './components/task-list.js';

defineComponent('task-card', TaskCard);
defineComponent('task-list', TaskList);

export { taskStore } from './tasks.store.js';
```

```typescript
// src/app.ts — imports trigger registration
import './features/auth/index.js';
import './features/tasks/index.js';
import './features/dashboard/index.js';
```

---

## Route Organisation at Scale

`routes.ts` grows linearly with features. Keep it readable by grouping related routes and using a consistent `lazyController` helper:

```typescript
// src/routes/routes.ts
import { bustCache } from '@core-utils/cacheBuster.js';
import type { ControllerFunction } from '@core/router.js';

function lazy(name: string, path: string): ControllerFunction {
    return async (...args: any[]) => {
        const m = await import(bustCache(path));
        return m[name](...args);
    };
}

export function registerRoutes(router: any): void {
    // ── Public ─────────────────────────────────────────────────────────────
    router.register('/', 'src/features/home/views/home.html',
        lazy('homeController', '../features/home/home.controller.js'))
        .cache({ ttl: 300, revalidate: true });

    router.register('/pricing', 'src/features/marketing/views/pricing.html',
        lazy('pricingController', '../features/marketing/pricing.controller.js'))
        .cache({ ttl: 300, revalidate: true });

    // ── Auth ───────────────────────────────────────────────────────────────
    router.register('/login', 'src/features/auth/views/login.html',
        lazy('loginController', '../features/auth/auth.controller.js'));

    // ── Protected ──────────────────────────────────────────────────────────
    router.register('/dashboard', 'src/features/dashboard/views/dashboard.html',
        lazy('dashboardController', '../features/dashboard/dashboard.controller.js'))
        .cache({ ttl: 30, revalidate: true });

    router.register('/tasks', 'src/features/tasks/views/tasks.html',
        lazy('tasksController', '../features/tasks/tasks.controller.js'));

    router.register('/tasks/:id', 'src/features/tasks/views/task-detail.html',
        lazy('taskDetailController', '../features/tasks/task-detail.controller.js'));
}

export const protectedRoutes = ['/dashboard', '/tasks'];
```

---

## Shared Global Stores

Use `createStore` for state that crosses feature boundaries (user session, notification queue, UI preferences):

```typescript
// src/shared/stores/user.store.ts
import { createStore } from 'nativecorejs';

export interface UserState {
    user: User | null;
    role: 'admin' | 'member' | 'guest';
    preferences: UserPreferences;
}

export const userStore = createStore<UserState>('user', {
    user: null,
    role: 'guest',
    preferences: { theme: 'system', locale: 'en' }
});
```

Consuming in any controller:

```typescript
import { getStore } from 'nativecorejs';
import type { UserState } from '../shared/stores/user.store.js';

const user = getStore<UserState>('user');
const { role } = user.get();
```

All stores in `globalThis.__NC_STORES__` are visible in the dev-tools overlay.

---

## Multi-Level Middleware

Layer middleware to separate concerns cleanly:

```typescript
// src/app.ts
import { authMiddleware } from './middleware/auth.middleware.js';
import { auditLogMiddleware } from './middleware/audit-log.middleware.js';
import { maintenanceModeMiddleware } from './middleware/maintenance.middleware.js';

router.use(maintenanceModeMiddleware);  // runs first — can halt all navigation
router.use(authMiddleware);             // auth gate for protected routes
router.use(auditLogMiddleware);         // records navigations to server (non-blocking)
```

Each middleware returns `true` (continue) or `false` (block):

```typescript
// src/middleware/audit-log.middleware.ts
import type { MiddlewareFunction } from 'nativecorejs';
import api from '@services/api.service.js';

export const auditLogMiddleware: MiddlewareFunction = async (route) => {
    // Non-blocking — fire and forget
    api.post('/api/audit', { route: route.path, ts: Date.now() })
        .catch(() => { /* don't fail navigation if audit log is unavailable */ });
    return true;
};
```

---

## Dependency Injection via the Global Store

NativeCoreJS does not have a DI container. The global store serves this role for shared configuration objects:

```typescript
// Bootstrap once in app.ts
// ApiClient and EventBus are illustrative placeholders — implement or import
// them according to your project's needs (e.g. a fetch wrapper or an event emitter).
import { createStore } from 'nativecorejs';
import { ApiClient } from './services/api-client.js';
import { EventBus } from './services/event-bus.js';

createStore('services', {
    api: new ApiClient({ baseUrl: '/api' }),
    eventBus: new EventBus(),
});

// Use anywhere
const { api, eventBus } = getStore('services').get();
```

This pattern keeps service instances singletons, testable (you can swap implementations in test setup), and introspectable via dev-tools.

---

## Team-Level Theming

Large projects often have per-team or per-tenant theming. NativeCoreJS uses CSS custom properties exclusively, making runtime theme switching straightforward:

```typescript
// src/shared/utils/theme.ts
const THEME_STORE_KEY = 'nc-theme';

const themes: Record<string, Record<string, string>> = {
    default: {
        '--primary': '#0f766e',
        '--background': '#ffffff',
    },
    'team-red': {
        '--primary': '#dc2626',
        '--background': '#fef2f2',
    },
};

export function applyTheme(name: string): void {
    const vars = themes[name] ?? themes.default;
    const root = document.documentElement;
    Object.entries(vars).forEach(([key, value]) => root.style.setProperty(key, value));
    sessionStorage.setItem(THEME_STORE_KEY, name);
}

export function restoreTheme(): void {
    const saved = sessionStorage.getItem(THEME_STORE_KEY) ?? 'default';
    applyTheme(saved);
}
```

Call `restoreTheme()` in `app.ts` before `router.start()` to eliminate FOUC.

---

## Component Library as a Shared Package

When multiple NativeCoreJS applications share the same design system, extract your custom components into a separate npm workspace package:

```
packages/
├── nativecorejs/              ← framework runtime (upstream)
├── acme-components/           ← your design system layer
│   ├── src/
│   │   ├── acme-button.ts
│   │   ├── acme-data-table.ts
│   │   └── index.ts           ← re-exports all components
│   └── package.json           ← peerDep: nativecorejs
│
├── app-crm/                   ← app 1
└── app-portal/                ← app 2
```

Each app imports and registers from `acme-components`:

```typescript
// src/components/registry.ts
import 'acme-components'; // barrel export triggers defineComponent() calls
```

---

## Incremental Migration from React or Vue

If you are migrating an existing app one route at a time, you can embed NativeCoreJS components inside React or Vue and vice versa.

### NativeCoreJS component in a React app

Web Components are standard custom elements — React renders them like any HTML element:

```jsx
// React
import 'my-nativecore-app/dist/src/components/nc-button.js'; // registers the element

function MyReactPage() {
    return <nc-button variant="primary" onClick={handleClick}>Save</nc-button>;
}
```

Pass complex data as element properties (not attributes) from a React ref:

```jsx
const ref = useRef(null);
useEffect(() => { if (ref.current) ref.current.data = complexObject; }, []);
return <nc-data-table ref={ref} />;
```

### React component in a NativeCoreJS view

Wrap the React render call in a NativeCoreJS component:

```typescript
// src/components/adapters/react-widget.ts
import { Component, defineComponent } from 'nativecorejs';
import { createRoot } from 'react-dom/client';
import { ReactWidget } from '../../legacy/ReactWidget.jsx';

class ReactWidgetAdapter extends Component {
    private _root: ReturnType<typeof createRoot> | null = null;

    onMount(): void {
        this._root = createRoot(this);
        this._root.render(<ReactWidget />);
    }

    onUnmount(): void {
        this._root?.unmount();
        this._root = null;
    }
}

defineComponent('react-widget', ReactWidgetAdapter);
```

Usage in any NativeCoreJS view:

```html
<react-widget></react-widget>
```

---

## Audit Logging and Compliance

Enterprise applications often need an immutable audit trail. The cleanest approach is a dedicated plugin:

```typescript
// src/plugins/audit-trail.plugin.ts
import type { NCPlugin } from 'nativecorejs';

export const auditTrailPlugin: NCPlugin = {
    name: 'audit-trail',
    onNavigated({ path, params }) {
        navigator.sendBeacon('/api/audit', JSON.stringify({
            event: 'page_view',
            path,
            params,
            userId: getCurrentUserId(),
            ts: new Date().toISOString(),
        }));
    },
};
```

`navigator.sendBeacon` is fire-and-forget, non-blocking, and survives page unload — ideal for compliance logs.

---

## Testing in a Large Codebase

Organise tests by feature module, mirroring the source structure:

```
src/features/tasks/
├── tasks.controller.ts
├── tasks.store.ts
└── __tests__/
    ├── tasks.controller.test.ts
    └── tasks.store.test.ts
```

Use `pausePageCleanupCollection()` in long-lived test suites to prevent the cleanup registry from firing between test cases:

```typescript
import { pausePageCleanupCollection, resumePageCleanupCollection } from '@core/pageCleanupRegistry.js';

beforeAll(() => pausePageCleanupCollection());
afterAll(() => resumePageCleanupCollection());
```

---

**Back:** [Chapter 34 — Building Plugins](./34-building-plugins.md)  
**Next:** [Chapter 36 — Framework Comparison](./36-framework-comparison.md)

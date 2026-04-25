# Chapter 35 — Enterprise Architecture

> **What you'll build in this chapter:** Reorganize EnterpriseKit from a type-based layout into feature modules (`features/auth/`, `features/users/`, `features/reports/`), enforce cross-module boundaries, and move shared components into a barrel-exported `src/shared/` layer.

This chapter covers patterns for scaling a NativeCoreJS application across multiple feature teams, large route counts, and long-term maintainability requirements.

---

## Application Structure at Scale

The default `create-nativecore` scaffold organises code by type (`controllers/`, `components/`, `stores/`). This works well for small teams. Once a project grows beyond ~10 routes or 3 teams, **feature-module organisation** scales better.

### Feature-Module Layout

```
src/
├── app.js                              ← entry point
├── routes/
│   └── routes.js                       ← central route registry
│
├── features/
│   ├── auth/
│   │   ├── auth.controller.js
│   │   ├── auth.store.js
│   │   ├── auth.service.ts
│   │   ├── components/
│   │   │   └── login-form.ts
│   │   └── views/
│   │       └── login.html
│   │
│   ├── tasks/
│   │   ├── tasks.controller.js
│   │   ├── task-detail.controller.js
│   │   ├── tasks.store.js
│   │   ├── components/
│   │   │   ├── task-card.ts
│   │   │   └── task-list.ts
│   │   └── views/
│   │       ├── tasks.html
│   │       └── task-detail.html
│   │
│   └── dashboard/
│       ├── dashboard.controller.js
│       ├── dashboard.store.js
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

Each feature directory exports a single `index.js` that registers its components and re-exports its store:

```javascript
// src/features/tasks/index.js
import { defineComponent } from 'nativecorejs';
import { TaskCard } from './components/task-card.js';
import { TaskList } from './components/task-list.js';

defineComponent('task-card', TaskCard);
defineComponent('task-list', TaskList);

export { taskStore } from './tasks.store.js';
```

```javascript
// src/app.js — imports trigger registration
import './features/auth/index.js';
import './features/tasks/index.js';
import './features/dashboard/index.js';
```

---

## Route Organisation at Scale

`routes.js` grows linearly with features. Keep it readable by grouping related routes and using a consistent `lazyController` helper:

```javascript
// src/routes/routes.js
import { bustCache } from '@core-utils/cacheBuster.js';

function lazy(name, path) {
    return async (...args) => {
        const m = await import(bustCache(path));
        return m[name](...args);
    };
}

export function registerRoutes(router) {
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

Use module-level `useState` exports for state that crosses feature boundaries (user session, notification queue, UI preferences):

```javascript
// src/shared/stores/user.store.js
import { useState } from 'nativecorejs';

// UserState shape: { user, role, preferences }

export const userStore = useState({
    user: null,
    role: 'guest',
    preferences: { theme: 'system', locale: 'en' }
});
```

Consuming in any controller:

```javascript
import { userStore } from '../shared/stores/user.store.js';

const { role } = userStore.value;
```

---

## Multi-Level Middleware

Layer middleware to separate concerns cleanly:

```javascript
// src/app.js
import { authMiddleware } from './middleware/auth.middleware.js';
import { auditLogMiddleware } from './middleware/audit-log.middleware.js';
import { maintenanceModeMiddleware } from './middleware/maintenance.middleware.js';

router.use(maintenanceModeMiddleware);  // runs first — can halt all navigation
router.use(authMiddleware);             // auth gate for protected routes
router.use(auditLogMiddleware);         // records navigations to server (non-blocking)
```

Each middleware returns `true` (continue) or `false` (block):

```javascript
// src/middleware/audit-log.middleware.js
import api from '@services/api.service.js';

export const config = async (route) => {
    // Non-blocking — fire and forget
    api.post('/api/audit', { route: route.path, ts: Date.now() })
        .catch(() => { /* don't fail navigation if audit log is unavailable */ });
    return true;
};
```

---

## Dependency Injection via Exported Singletons

NativeCoreJS does not have a DI container. Exported module-level singletons serve this role for shared configuration objects:

```javascript
// src/services/services.js
// ApiClient and EventBus are illustrative placeholders — implement or import
// them according to your project's needs (e.g. a fetch wrapper or an event emitter).
import { ApiClient } from './api-client.js';
import { EventBus } from './event-bus.js';

export const api = new ApiClient({ baseUrl: '/api' });
export const eventBus = new EventBus();
```

Use anywhere:

```javascript
import { api, eventBus } from '../services/services.js';
```

This pattern keeps service instances as singletons via the module cache, testable (you can swap implementations in test setup), and straightforward to trace.

---

## Team-Level Theming

Large projects often have per-team or per-tenant theming. NativeCoreJS uses CSS custom properties exclusively, making runtime theme switching straightforward:

```javascript
// src/shared/utils/theme.js
const THEME_STORE_KEY = 'nc-theme';

const config = {
    default: {
        '--primary': '#0f766e',
        '--background': '#ffffff',
    },
    'team-red': {
        '--primary': '#dc2626',
        '--background': '#fef2f2',
    },
};

export function applyTheme(name) {
    const vars = themes[name] ?? themes.default;
    const root = document.documentElement;
    Object.entries(vars).forEach(([key, value]) => root.style.setProperty(key, value));
    sessionStorage.setItem(THEME_STORE_KEY, name);
}

export function restoreTheme() {
    const saved = sessionStorage.getItem(THEME_STORE_KEY) ?? 'default';
    applyTheme(saved);
}
```

Call `restoreTheme()` in `app.js` before `router.start()` to eliminate FOUC.

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
│   │   └── index.js           ← re-exports all components
│   └── package.json           ← peerDep: nativecorejs
│
├── app-crm/                   ← app 1
└── app-portal/                ← app 2
```

Each app imports and registers from `acme-components`:

```javascript
// src/components/registry.js
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

```javascript
// src/components/adapters/react-widget.js
import { Component, defineComponent } from 'nativecorejs';
import { createRoot } from 'react-dom/client';
import { ReactWidget } from '../../legacy/ReactWidget.jsx';

class ReactWidgetAdapter extends Component {
    private _root: ReturnType<typeof createRoot> | null = null;

    onMount() {
        this._root = createRoot(this);
        this._root.render(<ReactWidget />);
    }

    onUnmount() {
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

```javascript
// src/plugins/audit-trail.plugin.js

export const config = {
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
├── tasks.controller.js
├── tasks.store.js
└── __tests__/
    ├── tasks.controller.test.ts
    └── tasks.store.test.ts
```

Use `pausePageCleanupCollection()` in long-lived test suites to prevent the cleanup registry from firing between test cases:

```javascript
import { pausePageCleanupCollection, resumePageCleanupCollection } from '@core/pageCleanupRegistry.js';

beforeAll(() => pausePageCleanupCollection());
afterAll(() => resumePageCleanupCollection());
```

---

## Done Criteria

- [ ] `src/features/auth/`, `src/features/users/`, and `src/features/reports/` directories exist with their own controllers, stores, views, and components.
- [ ] Each feature has a local `routes.js` imported by the root `src/routes/routes.js`.
- [ ] Shared components live in `src/shared/components/` and are re-exported from an `index.js` barrel.
- [ ] No feature module file imports from another feature module (`features/auth` ↛ `features/users`).

---

**Back:** [Chapter 34 — Building Plugins](./34-building-plugins.md)  
**Next:** [Chapter 36 — Framework Comparison](./36-framework-comparison.md)
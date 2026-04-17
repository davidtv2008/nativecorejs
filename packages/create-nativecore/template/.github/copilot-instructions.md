# GitHub Copilot Instructions - NativeCore Framework

## CRITICAL: No Emojis
**NEVER use emojis in code, console.logs, comments, or documentation.**
- Use plain text only
- Examples: "Success" not "Success!" or checkmarks
- Console logs should be professional and emoji-free

## CRITICAL: Separation of Concerns in Views
**NEVER add `<style>` or `<script>` tags inside view HTML files** (`src/views/**/*.html`).
- HTML files contain **markup only** — no inline styles, no inline scripts
- CSS belongs in `src/styles/main.css` (app styles) or `src/styles/core.css` (layout)
- JS/TS logic belongs in the corresponding controller (`src/controllers/`)
- Shadow DOM component styles are the only exception — they live inside the component `.ts` file

## Framework Context
You're working with **NativeCore** (formerly nativeCore) - a modern reactive TypeScript SPA framework with:
- Web Components with Shadow DOM
- Lazy loading (controllers + components)
- Reactive signals (useState, computed)
- Custom router with middleware
- JWT auth with dual-shell architecture
- Bot-optimized SEO (pre-rendered HTML)
- Zero runtime dependencies

## Quick Reference

### Commands
- `npm run make:component <name>` - Generate component in ui/ folder
- `npm run make:view <name>` - Generate view (with prompts)
- `npm run remove:component <name>` - Remove component
- `npm run remove:view <name>` - Remove view
- `npm run compile` - Compile TypeScript with path alias resolution
- `npm run build` - Build for production (prompts for bot HTML)
- `npm run build:bots` - Generate bot-optimized HTML for SEO

### Naming
- Components: `kebab-case-required` (must have hyphen)
- Controllers: `camelCaseController`
- Views: `kebab-case.html`
- TypeScript files: `.ts` extension

### Critical Files
- `src/app.ts` - Entry point (keep minimal!)
- `src/config/routes.ts` - Route definitions
- `src/components/registry.ts` - Component registry
- `src/controllers/index.ts` - Controller exports
- `index.html` - Public shell (landing, login, etc.)
- `app.html` - Protected shell (dashboard, authenticated routes)

### Path Aliases (use sparingly)
```typescript
import { Component } from '@core/component.js';
import { useState } from '@core/state.js';
import api from '@services/api.service.js';
import { store } from '@stores/appStore.js';
```

Available aliases: `@core/`, `@components/`, `@services/`, `@utils/`, `@stores/`, `@middleware/`, `@types/`, `@config/`

### Lazy Loading Pattern

#### Controllers (routes.ts):
```typescript
.register('/path', 'views/pages/public/page.html', 
    lazyController('pageController', '../controllers/page.controller.js'))
```

#### Components (components/registry.ts):
```typescript
componentRegistry.register('my-component', './ui/my-component.js');
```
**Note:** All UI components are in `src/components/ui/` folder

## Code Generation Rules

### When creating components:
1. Use generator: `npm run make:component`
2. Must have hyphen in name
3. Extend `Component` class from `@core/component.js`
4. **MUST enable Shadow DOM:** `static useShadowDOM = true;`
5. Use `defineComponent()` to register
6. Auto-registered in `components/registry.ts` with `./ui/` prefix
7. Use event delegation on shadowRoot for reliability

### When creating views:
1. Use generator: `npm run make:view`
2. Prompts for protected/public
3. Prompts for controller
4. Auto-updates `routes.ts`
5. Auto-adds to protected routes if needed

### When creating controllers:
1. Export named function with "Controller" suffix
2. Export from `controllers/index.ts`
3. Use in routes with `lazyController()`
4. **Always return a cleanup function using `trackEvents` + `trackSubscriptions`**

## Cleanup Patterns

### Controller cleanup (ALWAYS do this)
Every controller that attaches events or watches state **must** return a cleanup function.
Use `trackEvents()` and `trackSubscriptions()` from `@utils/events.js`:

```typescript
import { trackEvents, trackSubscriptions } from '@utils/events.js';

export async function myPageController() {
    const events = trackEvents();
    const subs = trackSubscriptions();

    // Attach DOM events through trackEvents — all removed on cleanup
    events.onClick('#submit-btn', handleSubmit);
    events.delegate('#list', 'click', '.item', handleItemClick);

    // Watch reactive state through trackSubscriptions — all unsubscribed on cleanup
    subs.watch(store.isLoading.watch(loading => toggleSpinner(loading)));
    subs.watch(store.user.watch(user => renderUser(user)));

    return () => {
        events.cleanup();
        subs.cleanup();
    };
}
```

### Component state watcher cleanup
Store unsubscribe references in properties and call them in `onUnmount`:

```typescript
onMount() {
    this._unwatchCount = this.count.watch(val => {
        this.shadowRoot.querySelector('#count').textContent = val;
    });
}

onUnmount() {
    this._unwatchCount?.();
}
```

### computed() — dispose when done
`computed()` holds live subscriptions to all its dependency states. Call `.dispose()` when the
computed is no longer needed to prevent memory leaks:

```typescript
this.total = computed(() => this.subtotal.value + this.taxAmount.value);

onUnmount() {
    this.total.dispose();
}
```

## Architecture Guidelines

### Project Structure:
```
src/
├── components/
│   ├── core/              ← Layout components (app-header, app-sidebar)
│   ├── ui/                ← All nc-* reusable UI components
│   ├── registry.ts        ← Component lazy loading registry
│   └── preloadRegistry.ts ← Components to preload
├── controllers/           ← Route controllers
├── core/                  ← Framework core (router, component, signals)
├── services/              ← API, auth, logger services
├── stores/                ← Global state (appStore, uiStore)
├── utils/                 ← Helper functions
├── constants/             ← App constants (API endpoints, routes, etc.)
├── middleware/            ← Route middleware
├── config/                ← Configuration
│   └── routes.ts          ← Route definitions
├── types/                 ← TypeScript definitions
├── views/                 ← HTML view templates
│   ├── public/            ← Public routes
│   └── protected/         ← Protected routes
└── styles/                ← Global CSS
```

### File Placement:
- Controllers → `src/controllers/`
- UI Components → `src/components/ui/`
- Core Components → `src/components/core/`
- Views → `src/views/pages/public/` or `protected/`
- Middleware → `src/middleware/`
- Utilities → `src/utils/`
- Core framework → `src/core/` (don't modify)

### Imports:
- Never import controllers at top level
- Use `lazyController()` in routes
- Components registered, not imported
- Use path aliases: `@core/`, `@services/`, etc.
- Always add `.js` extension to imports

### State:
- Local: `useState()` from `@core/state.js`
- Global: `store` from `@stores/appStore.js`
- Both use `.value` and `.watch()`

### Auth:
- Check: `auth.isAuthenticated()`
- User: `auth.getUser()`
- Tokens in `sessionStorage`
- Protected routes in `protectedRoutes` array
- Two shells: `index.html` (public) and `app.html` (protected)

## Suggestions Priority

1. **Use generators first** - Don't manually create files
2. **Keep app.ts clean** - No routes, no logic
3. **Lazy load everything** - Except critical components
4. **Follow conventions** - Naming, structure, patterns
5. **Separation of concerns** - Controllers ≠ Components
6. **Enable Shadow DOM** - All UI components must have `static useShadowDOM = true`
7. **Don't over-engineer** - If a plain `div`, `section`, or `button` will do the job, use it. Custom components (`nc-*`) are for reusable, interactive, or stateful UI. Static layout boxes, page sections, and one-off containers should be plain HTML.

## Auto-complete Context

When suggesting:
- Route registration → Use `lazyController()`
- Component creation → Suggest `npm run make:component`
- View creation → Suggest `npm run make:view`
- State → Suggest signals pattern
- API calls → Use `api.service.ts`
- Auth → Use `auth.service.ts`

## Common Patterns

### Component with Shadow DOM (Required):
```typescript
import { Component, defineComponent } from '@core/component.js';
import { useState, computed } from '@core/state.js';

export class ShoppingCart extends Component {
    static useShadowDOM = true; // REQUIRED
    
    constructor() {
        super();
        this.items = useState([]);
        this.tax = useState(0.08);
        
        // Computed values automatically update when dependencies change
        this.subtotal = computed(() => 
            this.items.value.reduce((sum, item) => sum + item.price, 0)
        );
        this.taxAmount = computed(() => 
            this.subtotal.value * this.tax.value
        );
        this.total = computed(() => 
            this.subtotal.value + this.taxAmount.value
        );
    }
    
    template() {
        return `
            <style>
                .cart { padding: 1rem; }
            </style>
            <div class="cart">
                <div>Subtotal: $${this.subtotal.value.toFixed(2)}</div>
                <div>Tax: $${this.taxAmount.value.toFixed(2)}</div>
                <div>Total: $${this.total.value.toFixed(2)}</div>
            </div>
        `;
    }
    
    onMount() {
        // Watch computed values for side effects
        this.total.watch(val => {
            this.shadowRoot.querySelector('.total').textContent = `$${val.toFixed(2)}`;
        });
    }
}

defineComponent('shopping-cart', ShoppingCart);
```

### Component with Event Delegation (Recommended):
```typescript
import { Component, defineComponent } from '@core/component.js';
import { useState } from '@core/state.js';

export class MyComponent extends Component {
    static useShadowDOM = true; // REQUIRED
    
    constructor() {
        super();
        this.count = useState(0);
    }
    
    template() {
        return `
            <style>
                .container { padding: 1rem; }
                .button { padding: 0.5rem 1rem; }
            </style>
            <div class="container">
                <div id="count">${this.count.value}</div>
                <button class="increment-btn">Increment</button>
            </div>
        `;
    }
    
    onMount() {
        // Use event delegation on shadowRoot for reliability
        this.shadowRoot.addEventListener('click', (e) => {
            if (e.target.matches('.increment-btn')) {
                this.count.value++;
            }
        });
        
        // Watch state changes
        this.count.watch(val => {
            this.shadowRoot.querySelector('#count').textContent = val;
        });
    }
}

defineComponent('my-component', MyComponent);
```

### Controller with API:
```typescript
import { trackEvents, trackSubscriptions } from '@utils/events.js';
import api from '@services/api.service.js';

export async function myController() {
    const events = trackEvents();
    const subs = trackSubscriptions();

    const data = await api.get('/endpoint');
    // render logic
    events.onClick('#btn', handler);

    return () => {
        events.cleanup();
        subs.cleanup();
    };
}
```

### Protected Route:
```typescript
// In routes.ts
.register('/admin', 'views/pages/protected/admin.html',
    lazyController('adminController', '../controllers/admin.controller.js'))

// In protectedRoutes array
export const protectedRoutes = ['/dashboard', '/admin'];
```

Remember: This is vanilla JS with modern patterns. No JSX, no virtual DOM, just clean TypeScript + Web Components!

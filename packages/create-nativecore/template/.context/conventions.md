# NativeCore Framework Conventions

## When NOT to Create a Component

Custom `nc-*` components add overhead (Shadow DOM, lazy loading, JS bundle). Use plain HTML when:
- It is a static layout container (use `<div>`, `<section>`, `<article>`)
- It has no interactivity or reactive state
- It will only be used once on a single page
- A native element (`<button>`, `<a>`, `<input>`) already does the job

Reserve components for things that are **reusable**, **interactive**, or **stateful**.

Examples:
- Comparison card on home page → plain `<div class="comparison-card">`, not `<nc-card>`
- Page hero section → plain `<section class="hero">`, not `<nc-container>`
- A submit button used once → plain `<button>`, not `<nc-button>`
- A reusable data table used in 5 views → `<nc-table>` is appropriate

## File Naming

| Artifact         | Convention                      | Location                          |
|------------------|---------------------------------|-----------------------------------|
| UI Component     | kebab-case.ts (hyphen required) | `src/components/ui/`              |
| Core Component   | kebab-case.ts                   | `src/components/core/`            |
| Controller       | kebab-case.controller.ts        | `src/controllers/`                |
| View             | kebab-case.html                 | `src/views/public/` or `protected/` |
| Service          | kebab-case.service.ts           | `src/services/`                   |
| Utility          | camelCase.ts                    | `src/utils/`                      |
| Store            | camelCaseStore.ts               | `src/stores/`                     |

Examples:
- `user-card.ts` → compiled to `dist/components/ui/user-card.js`
- `dashboard.controller.ts` → compiled to `dist/controllers/dashboard.controller.js`
- Controller function: `export async function dashboardController() {}`

## Component Template

```typescript
import { Component, defineComponent } from '@core/component.js';
import { useState, computed } from '@core/state.js';
import type { State, ComputedState } from '@core/state.js';

export class MyComponent extends Component {
    static useShadowDOM = true; // REQUIRED on all UI components

    count: State<number>;
    doubled: ComputedState<number>;
    private _unwatchCount?: () => void;

    constructor() {
        super();
        this.count = useState(0);
        this.doubled = computed(() => this.count.value * 2);
    }

    template() {
        return `
            <style>
                .container { padding: 1rem; }
            </style>
            <div class="container">
                <span id="display">${this.count.value}</span>
                <button class="increment-btn">Increment</button>
            </div>
        `;
    }

    onMount() {
        // Event delegation on shadowRoot — reliable across re-renders
        this.shadowRoot.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).matches('.increment-btn')) {
                this.count.value++;
            }
        });

        // Store the unsubscribe so onUnmount can clean it up
        this._unwatchCount = this.count.watch(val => {
            this.shadowRoot.querySelector('#display')!.textContent = String(val);
        });
    }

    onUnmount() {
        this._unwatchCount?.();    // Unsubscribe state watcher
        this.doubled.dispose();    // Release computed's dependency subscriptions
    }
}

defineComponent('my-component', MyComponent);
```

## Controller Template

```typescript
import { trackEvents, trackSubscriptions } from '@utils/events.js';
import api from '@services/api.service.js';
import { store } from '@stores/appStore.js';

export async function myPageController(params: Record<string, string> = {}): Promise<() => void> {
    const events = trackEvents();
    const subs = trackSubscriptions();

    const data = await api.get('/endpoint');

    document.getElementById('container')!.innerHTML = `
        <h1>Title</h1>
        <ul id="list"></ul>
        <button id="action-btn">Action</button>
    `;

    // All DOM events through trackEvents
    events.onClick('#action-btn', handleAction);
    events.delegate('#list', 'click', '.list-item', handleItemClick);

    // All state watchers through trackSubscriptions
    subs.watch(store.isLoading.watch(loading => {
        document.getElementById('action-btn')!.toggleAttribute('disabled', loading);
    }));

    // Always return cleanup
    return () => {
        events.cleanup();
        subs.cleanup();
    };

    function handleAction() { /* logic */ }
    function handleItemClick(e: Event, target: Element) { /* logic */ }
}
```

## Import Conventions

```typescript
// Always include .js extension — ES module requirement
import { Component } from '@core/component.js';      // correct
import { Component } from '@core/component';          // wrong

// Type imports use 'import type'
import type { State, ComputedState } from '@core/state.js';
import type { User } from '@stores/appStore.js';

// Never import controllers at top level — use lazyController() in routes
// Never import component files — register them in components/registry.ts
```

## State Conventions

```typescript
// Local state (in components)
this.count = useState(0);
this.count.value++;                            // direct set
this.count.set(prev => prev + 1);              // functional update
const unsub = this.count.watch(val => {...}); // subscribe

// Computed — MUST .dispose() in onUnmount
this.total = computed(() => this.price.value * this.qty.value);

// Global state
import { store } from '@stores/appStore.js';
store.user.value = userData;
store.setLoading(true);
```

## Naming Patterns

```typescript
// Variables: camelCase
const userName = 'Alice';
const isLoading = true;

// Classes: PascalCase
class UserCard extends Component {}

// Constants: UPPER_SNAKE_CASE
const MAX_RETRIES = 3;

// Event handlers: handle prefix
function handleClick(e: Event) {}
function handleSubmit(e: SubmitEvent) {}

// Controllers: camelCase + Controller
export async function dashboardController() {}
```

## CSS Naming (inside Shadow DOM)

```css
/* Match the component name */
.user-card { }
.user-card__title { }
.user-card--highlighted { }

/* Use CSS custom properties from global scope */
.container {
    padding: var(--spacing-md);
    color: var(--text-primary);
    border: 1px solid var(--border);
}
```

## Route Conventions

```typescript
// Public route (no controller)
.register('/about', 'views/pages/public/about.html')

// Public route with controller
.register('/login', 'views/pages/public/login.html',
    lazyController('loginController', '../controllers/login.controller.js'))

// Protected route with dynamic param
.register('/user/:id', 'views/pages/protected/user-detail.html',
    lazyController('userDetailController', '../controllers/user-detail.controller.js'))

// Protected routes array
export const protectedRoutes = ['/dashboard', '/user'];
```

## API Conventions

```typescript
// api.service.ts wraps fetch with interceptors
await api.get('/endpoint');
await api.post('/endpoint', { body });
await api.put('/endpoint', { body });
await api.delete('/endpoint');

// Endpoint constants
import { API_ENDPOINTS } from '@constants/apiEndpoints.js';
await api.get(API_ENDPOINTS.USERS);
```

## Testing Conventions

- Unit tests in `tests/unit/`
- Files named `*.test.ts`
- Use Vitest: `npm test`
- Test pure utilities, formatters, validators
- Component tests use jsdom

## File Naming

### Components
- **Format**: `kebab-case.ts`
- **Must have hyphen** (Web Component requirement)
- **Location**: `src/components/ui/` for reusable components, `src/components/core/` for layout
- **Examples**: 
  - ✅ `user-card.ts` → `src/components/ui/user-card.ts`
  - ✅ `nc-button.ts` → `src/components/ui/nc-button.ts`
  - ✅ `app-header.ts` → `src/components/core/app-header.ts`
  - ❌ `usercard.ts` (no hyphen)
  - ❌ `UserCard.ts` (not kebab-case)
- **Compiled to**: `dist/components/ui/kebab-case.js`
- **Registered in**: `src/components/registry.ts` with `./ui/` prefix

### Controllers
- **Format**: `kebab-case.controller.ts`
- **Function name**: `camelCaseController`
- **Examples**:
  - File: `user-profile.controller.ts`
  - Export: `export async function userProfileController() { ... }`
- **Compiled to**: `dist/controllers/kebab-case.controller.js`

### Views
- **Format**: `kebab-case.html`
- **Location**: `src/views/public/` or `src/views/protected/`
- **Examples**: `user-profile.html`, `dashboard.html`
- **Not compiled**: Served as-is

### Services
- **Format**: `kebab-case.service.ts`
- **Export**: camelCase singleton
- **Examples**: 
  - File: `auth.service.ts`
  - Export: `export default new AuthService()`

### Utilities
- **Format**: `camelCase.ts`
- **Examples**: `formatters.ts`, `helpers.ts`, `validation.ts`

## Code Structure

### Component Template (TypeScript with Shadow DOM)
```typescript
/**
 * ComponentName Component
 * Brief description
 */
import { Component, defineComponent } from '@core/component.js';
import { useState, computed } from '@core/state.js';
import type { State } from '@core/state.js';

export class ComponentName extends Component {
    // REQUIRED: Enable Shadow DOM for style encapsulation
    static useShadowDOM = true;
    
    // Declare typed properties
    count: State<number>;
    doubled: State<number>;
    
    constructor() {
        super();
        // Initialize state
        this.count = useState(0);
        // Computed values
        this.doubled = computed(() => this.count.value * 2);
    }
    
    template() {
        return `
            <style>
                /* Scoped styles - won't leak out */
                .container { padding: 1rem; }
            </style>
            <div class="container">
                <div id="count">${this.count.value}</div>
                <div>Doubled: ${this.doubled.value}</div>
                <button class="increment-btn">+</button>
            </div>
        `;
    }
    
    onMount() {
        // Use event delegation on shadowRoot
        this.shadowRoot.addEventListener('click', (e) => {
            if (e.target.matches('.increment-btn')) {
                this.count.value++;
            }
        });
        
        // Watch state changes
        this.count.watch(val => {
            const el = this.shadowRoot.querySelector('#count');
            if (el) el.textContent = val;
        });
    }
}

defineComponent('component-name', ComponentName);
```

export class ComponentName extends Component {
    // Declare properties with types
    count: State<number>;
    
    constructor() {
        super();
        // Initialize state
        this.count = useState(0);
    }
    
    template() {
        return `
            <style>
                /* Shadow DOM scoped styles */
                .component-name {
                    padding: var(--spacing-md);
                }
            </style>
            <div class="component-name">
                <div>${this.count.value}</div>
            </div>
        `;
    }
    
    onMount() {
        // Use event delegation on shadowRoot
        this.shadowRoot.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).matches('.button')) {
                this.count.value++;
            }
        });
        
        // Watch state changes
        this.count.watch(val => {
            this.$('#display').textContent = val.toString();
        });
    }
}

defineComponent('component-name', ComponentName);
```

### Controller Template (TypeScript)
```typescript
/**
 * Page Controller
 * Description
 */
import auth from '../services/auth.service.js';
import api from '../services/api.service.js';

export async function pageController(params?: Record<string, string>): Promise<(() => void) | void> {
    const element = document.getElementById('element-id') as HTMLElement;
    
    // Load data
    try {
        const data = await api.get('/endpoint');
        
        // Render
        element.innerHTML = `...`;
        
        // Event listeners
        const button = document.getElementById('button-id') as HTMLButtonElement;
        const handleClick = () => {
            console.log('Clicked');
        };
        button?.addEventListener('click', handleClick);
        
        // Cleanup function
        return () => {
            button?.removeEventListener('click', handleClick);
        };
    } catch (error) {
        console.error('Error:', error);
        element.innerHTML = '<div>Error loading data</div>';
    }
}
```

### Service Template (TypeScript)
```typescript
/**
 * Service Name
 * Description
 */
class ServiceName {
    private data: string[] = [];
    
    constructor() {
        // Initialize
    }
    
    method(param: string): void {
        // Logic with type safety
        this.data.push(param);
    }
}

export default new ServiceName();
```

## Import Conventions

### Always use .js extension in imports
```typescript
// ✅ Correct - import with .js extension
import { Component } from '../core/component.js';
import api from '../services/api.service.js';

// ❌ Wrong - no extension
import { Component } from '../core/component';
import api from '../services/api.service';
```

**Why?** ES modules in browsers require extensions. TypeScript compiles `.ts` to `.js`, but imports stay as `.js`.

### Type Imports
```typescript
// Import types separately
import type { State, Computed } from '../core/state.js';
import type { User } from '../stores/appStore.js';
```

### Never Import (Lazy Loaded)
- ❌ Don't import controllers in routes.ts
- ❌ Don't import components in views
- ✅ Use `lazyController()` wrapper
- ✅ Use `componentRegistry.register()`

## TypeScript Conventions

### Type Annotations
```typescript
// Always type function parameters and returns
function calculate(a: number, b: number): number {
    return a + b;
}

// Type component properties
class MyComponent extends Component {
    count: State<number>;
    items: State<string[]>;
}
```

### Type Assertions
```typescript
// Use 'as' for DOM elements
const button = document.getElementById('btn') as HTMLButtonElement;
const input = this.$('input') as HTMLInputElement;

// Event targets
this.shadowRoot.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).matches('.button')) {
        // ...
    }
});
```

### Interfaces
```typescript
// Define interfaces for data structures
interface User {
    id: number;
    name: string;
    email: string;
}

// Use in state
const user: State<User | null> = useState(null);
```

## Naming Patterns

### Variables
```typescript
// camelCase for most
const userName: string = 'John';
const isLoading: boolean = true;
const userCount: number = 10;

// PascalCase for classes
class UserService {}
class Component {}

// UPPER_CASE for constants
const API_BASE_URL = 'http://...';
const MAX_RETRIES = 3;
```

### Functions
```javascript
// camelCase
function getUserData() {}
async function fetchData() {}

// Controllers: camelCase + "Controller"
export async function dashboardController() {}

// Event handlers: "handle" prefix
function handleClick() {}
function handleSubmit() {}
```

### CSS Classes
```javascript
// kebab-case matching component name
.user-card { }
.feature-card { }
.loading-spinner { }

// BEM for modifiers
.user-card--highlighted { }
.user-card__title { }
```

## Comment Conventions

### File Headers
```javascript
/**
 * Component/Service/Controller Name
 * Brief description of purpose
 * 
 * Additional context if needed
 */
```

### Function Documentation
```javascript
/**
 * Brief description
 * @param {Type} paramName - Description
 * @returns {Type} Description
 */
function myFunction(paramName) {}
```

### Section Comments
```javascript
// ========== Section Name ==========

// Initialize variables
const x = 10;

// Process data
data.map(x => x * 2);
```

## HTML Conventions

### Attributes
- Use `data-*` for custom attributes
- Use `id` for unique elements accessed by JS
- Use `class` for styling

```html
<div id="unique-element" class="my-component" data-user-id="123">
```

### Template Structure
```html
<div class="component-name">
    <header class="component-name__header">
        <!-- Header content -->
    </header>
    
    <main class="component-name__content">
        <!-- Main content -->
    </main>
    
    <footer class="component-name__footer">
        <!-- Footer content -->
    </footer>
</div>
```

## State Conventions

### Local State
```javascript
// In components
this.count = useState(0);
this.name = useState('');

// Access
this.count.value = 10;

// Watch
this.count.watch(val => {
    this.$('#display').textContent = val;
});
```

### Global State
```javascript
// In stores
import { useState } from '../core/state.js';

export const store = {
    user: useState(null),
    isLoading: useState(false)
};

// Usage
import { store } from '../stores/appStore.js';
store.user.value = userData;
```

## API Conventions

### Endpoints
```javascript
// In apiEndpoints.js
export const API_ENDPOINTS = {
    USERS: '/users',
    USER_DETAIL: (id) => `/users/${id}`,
    DASHBOARD: '/dashboard/stats'
};

// Usage
const data = await api.get(API_ENDPOINTS.USER_DETAIL(123));
```

### HTTP Methods
```javascript
// GET
await api.get('/endpoint');

// POST
await api.post('/endpoint', { data });

// PUT
await api.put('/endpoint', { data });

// DELETE
await api.delete('/endpoint');
```

## Error Handling

### Try-Catch Pattern
```javascript
try {
    const data = await api.get('/endpoint');
    // Success handling
} catch (error) {
    // Error already handled by errorHandler
    // Show user-friendly message
    element.innerHTML = `
        <div class="alert alert-error">
            Failed to load data: ${error.message}
        </div>
    `;
}
```

## Route Conventions

### Public Routes
```javascript
router
    .register('/', 'views/pages/public/home.html')
    .register('/about', 'views/pages/public/about.html');
```

### Protected Routes
```javascript
router
    .register('/dashboard', 'views/pages/protected/dashboard.html',
        lazyController('dashboardController', '../controllers/dashboard.controller.js'));

// Add to protected array
export const protectedRoutes = ['/dashboard'];
```

### Dynamic Routes
```javascript
router.register('/user/:id', 'views/pages/protected/user-detail.html',
    lazyController('userDetailController', '../controllers/user-detail.controller.js'));

// In controller
export async function userDetailController(params) {
    const userId = params.id; // From :id
}
```

## Testing Conventions

### Test Files
- **Location**: `tests/unit/`
- **Naming**: `*.test.js`
- **Example**: `formatters.test.js`

### Test Structure
```javascript
import { describe, it, expect } from 'vitest';

describe('Feature Name', () => {
    it('should do something', () => {
        expect(result).toBe(expected);
    });
});
```

## Commit Conventions

Recommended format:
```
feat: Add user profile view
fix: Correct lazy loading issue
docs: Update architecture guide
refactor: Simplify auth middleware
style: Format code with prettier
test: Add validation tests
chore: Update dependencies
```

## Directory Conventions

### Never Create Files In:
- ❌ `src/` root (except app.js)
- ❌ Random subdirectories

### Always Use Proper Folders:
- ✅ Components → `src/components/`
- ✅ Controllers → `src/controllers/`
- ✅ Services → `src/services/`
- ✅ Views → `src/views/pages/public/` or `protected/`
- ✅ Utils → `src/utils/`
- ✅ Core → `src/core/` (framework only)

## Generator Usage

### Always Use Generators
```bash
# Don't manually create
npm run make:component user-card
npm run make:view profile

# Don't manually delete
npm run remove:component user-card
npm run remove:view profile
```

### Manual Edits
Only edit these files manually:
- Styles (`src/styles/`)
- Tests (`tests/`)
- Documentation (`docs/`)
- Configuration (`package.json`, etc.)

Never manually edit:
- `components/index.js` (use generator)
- `controllers/index.js` (use generator)
- Route registrations (use generator)

# NativeCore: Modern Web Development on Web Standards

## A Hands-On Guide to Building Scalable SPAs

**By David Toledo**  
*NativeCore Framework Creator*

---

> **"The best way to learn a framework is to build something real with it."**
>
> This book follows the Big Nerd Ranch tradition of hands-on, project-based learning. You'll build real applications while learning modern web development concepts that work across all frameworks.

---

## Table of Contents

### Part I: Foundations
1. [Getting Started with NativeCore](#chapter-1-getting-started)
2. [Your First NativeCore Application](#chapter-2-first-app)
3. [Understanding Web Components](#chapter-3-web-components)
4. [Reactive State with Signals](#chapter-4-signals)

### Part II: Core Concepts
5. [Building Reusable Components](#chapter-5-components)
6. [Client-Side Routing](#chapter-6-routing)
7. [Forms and Validation](#chapter-7-forms)
8. [API Integration](#chapter-8-api)

### Part III: Real-World Applications
9. [Authentication System](#chapter-9-auth)
10. [Dashboard Application](#chapter-10-dashboard)
11. [E-commerce Store](#chapter-11-ecommerce)
12. [Real-Time Chat App](#chapter-12-chat)

### Part IV: Advanced Topics
13. [Performance Optimization](#chapter-13-performance)
14. [Testing Your Applications](#chapter-14-testing)
15. [Deployment and Production](#chapter-15-deployment)
16. [Building Component Libraries](#chapter-16-libraries)
17. [Server-Side Rendering](#chapter-17-ssr)
18. [Mobile Development](#chapter-18-mobile)
19. [Internationalization](#chapter-19-i18n)
20. [Accessibility](#chapter-20-a11y)

### Part V: Reference
21. [Component API Reference](#chapter-21-api)
22. [Best Practices Guide](#chapter-22-best-practices)
23. [Troubleshooting](#chapter-23-troubleshooting)
24. [Migration Guide](#chapter-24-migration)

---

## Preface

### Edition Note

This ebook has been updated to match the current NativeCore framework as of **April 2026**. The framework has grown substantially since the first draft of this book. NativeCore now includes:

- **60+ built-in core components**
- **TypeScript-first source with zero runtime production dependencies**
- **Signals-based reactive state**
- **Shadow DOM component encapsulation**
- **Lazy-loaded controllers and component registry**
- **Single-shell SPA routing with protected route gating**
- **Bot build tooling for SEO-oriented static output**
- **Developer generators for views, controllers, and components**
- **GPU-aware animation utilities and advanced UI primitives**

This edition has been fully refreshed around the current TypeScript-first framework. Treat the repository, the docs route, and the component demo page as the three living references that stay aligned with every release.

### Why NativeCore?

NativeCore exists to prove that modern frontend development does not require a heavy runtime, virtual DOM abstraction, or a dependency graph full of framework-specific conventions. It is a **standards-first SPA framework** built around the browser primitives that already exist:

- Custom elements
- Shadow DOM
- ES modules
- History API routing
- Native fetch
- TypeScript as a compile-time tool

That approach changes the tradeoffs. Instead of paying for a framework runtime forever, NativeCore pushes complexity into **authoring ergonomics** and **build-time tooling**, while keeping the shipped application lean.

The result is a framework that is:

- **Zero runtime dependencies** in production
- **TypeScript-first** with alias-based imports
- **Small at runtime** because features are built on native browser APIs
- **Component-oriented** without JSX or a virtual DOM
- **SEO-aware** through bot builds and pre-render strategies
- **Incrementally learnable** for any JavaScript developer
- **Framework-optional** because the code stays close to the platform
- **Loaded with batteries included**, from forms and navigation to animations and overlays

### Who This Book Is For

This book is for developers who want to build modern web applications without the complexity of traditional frameworks. Whether you're:

- A backend developer moving to frontend
- A React/Vue developer tired of build complexity
- A student learning web development
- A team lead choosing technology stacks
- An entrepreneur building MVPs quickly

You'll learn by **doing**. Each chapter includes hands-on projects that build real applications you can deploy.

### What You'll Learn

By the end of this book, you'll be able to:

- Build complete single-page applications with NativeCore's router and controller model
- Create encapsulated Web Components with Shadow DOM and reactive state
- Use the built-in component library as a foundation for product work
- Implement authentication, protected routes, and single-shell navigation
- Organize services, stores, controllers, and views cleanly
- Optimize loading, caching, and animation performance for production
- Test framework code and application code with repeatable workflows
- Plan distribution, documentation, and benchmarking for a real framework product

### Prerequisites

- Basic HTML, CSS, and JavaScript knowledge
- Familiarity with ES6+ features (arrow functions, promises, modules)
- A code editor (VS Code recommended)
- Node.js installed (for development tools)

### Book Structure

This book follows a **progressive learning path**:

**Part I** teaches the fundamentals through small examples  
**Part II** covers core concepts with focused projects  
**Part III** builds complete applications  
**Part IV** dives into advanced topics  
**Part V** serves as your reference guide  

Each chapter includes:
- **Code examples** you can follow along
- **Challenges** to test your understanding
- **Reference patterns** you can adapt to real projects
- **Migration notes** where current NativeCore differs from older framework habits

### Code Examples

The canonical reference implementation for this edition is the framework repository itself. The most reliable examples are:

- The shipped demo pages in the application
- The source under `src/components/core/`
- The routes, controllers, stores, and utilities in the main repo

When in doubt, treat the current framework repository as the source of truth over older example snippets.

### Getting Help

- **Documentation**: `https://NativeCore.dev`
- **Community**: `https://discord.gg/NativeCore`
- **Issues**: `https://github.com/NativeCore/framework/issues`


## Chapter 1: Getting Started with NativeCore

Welcome to NativeCore. In the current framework, a NativeCore app is a TypeScript SPA that compiles to standards-based JavaScript and ships without a framework runtime dependency. It uses:

- **Web Components** for UI primitives and reusable composition
- **Signals** for reactive state
- **Controllers** for page-level behavior and cleanup
- **A built-in router** for client-side navigation
- **Generators and scripts** to scaffold consistent project structure

### What is NativeCore?

NativeCore is a frontend framework built on the browser platform itself. It gives you an opinionated application structure without forcing you into a custom templating language or a virtual DOM layer.

At a high level, NativeCore provides:

- **Shadow DOM-based components** for encapsulated UI
- **Signals and computed values** for fine-grained reactivity
- **Lazy route controllers** for view-specific logic
- **Protected route gating inside a single-shell SPA** for authentication flows
- **Built-in UI primitives** out of the box
- **Bot-oriented production tooling** for SEO and pre-rendering

Unlike React or Vue, NativeCore does not ask you to learn JSX, hooks rules, or a proprietary render engine. The mental model is closer to the platform: HTML views, Web Components, modules, services, and explicit cleanup.

### Setting Up Your Environment

The current framework expects a standard modern frontend toolchain:

```bash
# Recommended
node --version   # Node.js 20+
npm --version
git --version
```

You also want:

- VS Code or another TypeScript-capable editor
- A modern Chromium-based browser for local testing
- Familiarity with ES modules, custom elements, and CSS variables

### Creating Your First Project

Today, the easiest way to start is from the framework repository or a starter built from it. The framework already includes the scripts you need to generate the application structure consistently.

```bash
# Clone the framework or your starter template
git clone <your-nativecore-starter-repo> my-nativecore-app
cd my-nativecore-app

# Install development dependencies
npm install

# Start the development environment
npm run dev
```

The current repo ships with these key authoring commands:

```bash
npm run dev
npm run compile
npm run build
npm run build:bots

npm run make:component my-widget
npm run make:view pricing
npm run make:controller pricing
```

The dedicated installer CLI is the product direction, but the repository generators remain the authoritative workflow pattern.

### Project Structure

The current NativeCore application layout looks like this:

```text
my-nativecore-app/
├── src/
│   ├── app.ts                  # Application entry point
│   ├── components/
│   │   ├── core/              # Built-in framework UI primitives
│   │   ├── ui/                # App-specific reusable components
│   │   ├── registry.ts        # Lazy component registration
│   │   └── preloadRegistry.ts # Components loaded immediately
│   ├── controllers/           # Page-level behavior + cleanup
│   ├── core/                  # Router, component base class, state, animation utils
│   ├── routes/                # Route registration
│   ├── services/              # Auth, API, storage, logger
│   ├── stores/                # Global reactive state
│   ├── styles/                # App and framework CSS tokens
│   ├── utils/                 # Helpers and framework utilities
│   └── views/
│       ├── public/            # Public HTML views
│       └── protected/         # Authenticated HTML views
├── docs/                      # Long-form documentation and ebook source
├── public/                    # Static assets
├── scripts/                   # Generators and build tooling
└── package.json
```

### Workflow Rules You Should Follow

Before you start building application features, internalize these NativeCore workflow rules:

1. **Use generators first.**
   When creating new views, components, or controllers, prefer the provided scripts instead of hand-rolling files.

```bash
npm run make:view pricing
npm run make:component pricing-card
npm run make:controller pricing
```

2. **Keep `app.ts` minimal.**
   The entry point should orchestrate startup, not accumulate feature logic.

3. **Use route controllers for page behavior.**
   DOM wiring, fetching, state subscriptions, and cleanup belong in controllers.

4. **Use shared utilities instead of ad hoc DOM code.**
   In controllers, prefer helpers like `dom`, `trackEvents()`, and `trackSubscriptions()` so behavior is consistent and cleanup is automatic.

5. **Prefer framework patterns over raw document-wide imperative code.**
   Inside components use `this.component` (pre-scoped to the component's own shadow root) or `this.$()` for direct queries; inside controllers prefer `dom.view()` plus tracked events. `this.component` provides the same `.hook()`, `.action()`, `.query()`, and `.view()` helpers as `dom.view()` — no need to repeat the tag name.

### Using `dom`, `trackEvents`, and `trackSubscriptions`

The framework already includes shared utilities to keep controller code predictable. A controller should usually look closer to this than to a pile of untracked `dom.` and `addEventListener()` calls:

```typescript
import { dom } from '@utils/dom.js';
import { trackEvents, trackSubscriptions } from '@utils/events.js';
import { store } from '@stores/appStore.js';

export async function pricingController(): Promise<() => void> {
    const events = trackEvents();
    const subs = trackSubscriptions();

    const root = dom.query('#pricing-root');
    if (!root) {
        return () => {
            events.cleanup();
            subs.cleanup();
        };
    }

    events.onClick('#open-pricing-modal', () => {
        dom.query('#pricing-modal')?.setAttribute('open', '');
    });

    subs.watch(store.isLoading.watch((loading) => {
        root.toggleAttribute('data-loading', loading);
    }));

    return () => {
        events.cleanup();
        subs.cleanup();
    };
}
```

This is the recommended style for the rest of the book, even where older examples still show more manual DOM access.


### Your First Component

The current framework conventions matter here:

- All UI components should use **Shadow DOM**
- All imports should include the **`.js`** extension
- Components live in `src/components/core/` or `src/components/ui/`

Create `src/components/ui/hello-world.ts`:

```typescript
import { Component, defineComponent } from '@core/component.js';

export class HelloWorld extends Component {
    static useShadowDOM = true;

    template() {
        return `
            <style>
                .hello {
                    font-size: 2rem;
                    color: var(--nc-primary, #2563eb);
                    text-align: center;
                    padding: 2rem;
                }
            </style>
            <div class="hello">
                Hello, NativeCore World!
            </div>
        `;
    }
}

defineComponent('hello-world', HelloWorld);
```

### Registering the Component

NativeCore uses a registry pattern for components. Add the component to `src/components/registry.ts` or preload it if it is foundational.

```typescript
import { componentRegistry } from '@core/lazyComponents.js';

componentRegistry.register('hello-world', './ui/hello-world.js');
```

### Setting Up the Application

Your `src/app.ts` should stay small. Route registration, component registration, and shell orchestration happen elsewhere.

The real application entry point looks closer to this:

```typescript
import router from './core/router.js';
import { registerRoutes } from './routes/routes.js';
import { initLazyComponents } from './core/lazyComponents.js';
import './components/registry.js';
import './components/preloadRegistry.js';

async function init() {
    await initLazyComponents();
    registerRoutes(router);
    router.start();
}

init();
```

### Creating the HTML Shell

NativeCore uses a single SPA shell. A simplified shell looks like this:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My NativeCore App</title>
</head>
<body>
    <div id="app">
        <main class="main-content">
            <div id="main-content" class="page"></div>
        </main>
    </div>

    <script type="module" src="/dist/app.js"></script>
</body>
</html>
```

### Running Your Application

The current framework already includes a development server and TypeScript build loop:

```bash
# Development mode with compiler + alias resolution + local server
npm run dev

# One-off compile
npm run compile

# Production build
npm run build
```

Open `http://localhost:8000` in your browser when using the shipped development server.

### What You Learned

In this chapter, you:

- Set up the current NativeCore development environment
- Learned the framework's project structure
- Created a standards-based Web Component with Shadow DOM
- Registered the component using the framework registry model
- Started the app using the real development workflow

### Challenge

Modify the `hello-world` component to:

1. Accept a `name` attribute and display a personalized greeting.
2. Add a local signal so a button can increment a visit counter.
3. Convert the component into a generated component using `npm run make:component hello-world-card` and compare the output with your manual implementation.

---

## Chapter 2: Your First NativeCore Application

Now that you understand the basics, let's build a complete application—a simple task manager. This will introduce you to NativeCore's core concepts: components, signals, and routing.

### Project Overview

We'll build a **Task Manager** application with:
- Add, edit, and delete tasks
- Mark tasks as complete
- Filter tasks by status
- Persistent storage (localStorage)

### Build It the NativeCore Way

The current framework encourages a generator-first workflow. For a task manager, create the page shell first, then wire it through a store and controller:

```bash
npm run make:view tasks
```

Add reusable components only if they will actually be reused. A task manager usually does **not** need three custom elements just to render one page. That is the wrong abstraction level for a first real app.

### Task Store

Use `useState()` for state and `computed()` for derived values:

```typescript
// src/stores/taskStore.ts
import { useState, computed } from '@core/state.js';

export interface Task {
    id: string;
    title: string;
    completed: boolean;
    createdAt: string;
}

export const tasks = useState<Task[]>([]);
export const filter = useState<'all' | 'active' | 'completed'>('all');

export const filteredTasks = computed(() => {
    switch (filter.value) {
        case 'active':
            return tasks.value.filter(task => !task.completed);
        case 'completed':
            return tasks.value.filter(task => task.completed);
        default:
            return tasks.value;
    }
});

export const taskStats = computed(() => {
    const all = tasks.value.length;
    const completed = tasks.value.filter(task => task.completed).length;
    return { all, completed, pending: all - completed };
});

export function addTask(title: string): void {
    const cleaned = title.trim();
    if (!cleaned) return;

    tasks.value = [
        ...tasks.value,
        {
            id: crypto.randomUUID(),
            title: cleaned,
            completed: false,
            createdAt: new Date().toISOString(),
        },
    ];
}

export function toggleTask(id: string): void {
    tasks.value = tasks.value.map(task =>
        task.id === id ? { ...task, completed: !task.completed } : task
    );
}

export function deleteTask(id: string): void {
    tasks.value = tasks.value.filter(task => task.id !== id);
}

export function setFilter(next: 'all' | 'active' | 'completed'): void {
    filter.value = next;
}
```

### Task Controller

The controller should use `dom`, `trackEvents()`, and `trackSubscriptions()` rather than raw scattered listeners:

```typescript
import { dom } from '@utils/dom.js';
import { trackEvents, trackSubscriptions } from '@utils/events.js';
import { addTask, deleteTask, filteredTasks, setFilter, taskStats, tasks, toggleTask } from '@stores/taskStore.js';

export async function tasksController(): Promise<() => void> {
    const events = trackEvents();
    const subs = trackSubscriptions();
    const root = dom.query('#tasks-root');

    if (!root) {
        return () => {
            events.cleanup();
            subs.cleanup();
        };
    }

    const render = () => {
        const stats = taskStats.value;
        root.innerHTML = `
            <section>
                <h1>Task Manager</h1>
                <form id="task-form">
                    <input id="task-title" placeholder="What needs to be done?" maxlength="100">
                    <button type="submit">Add Task</button>
                </form>
                <div>
                    <button data-filter="all">All (${stats.all})</button>
                    <button data-filter="active">Active (${stats.pending})</button>
                    <button data-filter="completed">Completed (${stats.completed})</button>
                </div>
                <div>
                    ${filteredTasks.value.map(task => `
                        <article>
                            <label>
                                <input type="checkbox" data-task-id="${task.id}" ${task.completed ? 'checked' : ''}>
                                <span>${task.title}</span>
                            </label>
                            <button type="button" data-delete-id="${task.id}">Delete</button>
                        </article>
                    `).join('')}
                </div>
            </section>
        `;
    };

    render();

    subs.watch(tasks.watch(render));
    subs.watch(filteredTasks.watch(render));
    subs.watch(taskStats.watch(render));

    events.delegate('#tasks-root', 'submit', '#task-form', (event) => {
        event.preventDefault();
        const input = dom.query<HTMLInputElement>('#task-title');
        if (!input) return;
        addTask(input.value);
        input.value = '';
        input.focus();
    });

    events.delegate('#tasks-root', 'click', '[data-filter]', (_event, target) => {
        const value = target.getAttribute('data-filter') as 'all' | 'active' | 'completed';
        setFilter(value);
    });

    events.delegate('#tasks-root', 'click', '[data-delete-id]', (_event, target) => {
        const id = target.getAttribute('data-delete-id');
        if (id) deleteTask(id);
    });

    events.delegate('#tasks-root', 'change', '[data-task-id]', (_event, target) => {
        const id = target.getAttribute('data-task-id');
        if (id) toggleTask(id);
    });

    return () => {
        events.cleanup();
        subs.cleanup();
    };
}
```

### Persistence

Keep persistence logic beside the store or in a dedicated storage service. Do not bury localStorage behavior inside a component template or route HTML.

### What You Learned

In current NativeCore, the lesson is:

- stores own domain state
- controllers own page behavior
- generators create the file structure
- utilities keep DOM/event code consistent

### Challenge

Extend the task manager with:

1. route-level filtering via query parameters
2. persisted tasks through a storage service
3. an empty state component for no tasks
4. a modal-based edit flow using framework components

---

## Chapter 3: Understanding Web Components

Web Components are the foundation of NativeCore's component system. In this chapter, you'll learn how they work and why they're powerful for building reusable UI elements.

### What Are Web Components?

Web Components are a set of web platform APIs that allow you to create reusable custom HTML elements:

1. **Custom Elements** - Define new HTML tags
2. **Shadow DOM** - Encapsulated styling and markup
3. **HTML Templates** - Reusable markup fragments

NativeCore builds on these standards to provide a React-like component experience.

### Start with the Platform, Then Use the Framework Abstraction

Understanding raw custom elements is useful, but in an actual NativeCore project you should almost always extend `Component` rather than coding from `HTMLElement` directly.

### Current NativeCore Component Pattern

```typescript
import { Component, defineComponent } from '@core/component.js';

export class NcBadgeNote extends Component {
    static useShadowDOM = true;

    static get observedAttributes() {
        return ['variant', 'label'];
    }

    template() {
        const variant = this.getAttribute('variant') ?? 'info';
        const label = this.getAttribute('label') ?? 'Note';

        return `
            <style>
                .note {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 0.75rem;
                    border-radius: 999px;
                    background: var(--nc-bg-secondary);
                    color: var(--nc-text);
                }

                .note.info { border: 1px solid var(--nc-border); }
                .note.success { border: 1px solid var(--nc-success); color: var(--nc-success); }
            </style>

            <span class="note ${variant}">
                <strong>${label}</strong>
                <slot></slot>
            </span>
        `;
    }
}

defineComponent('nc-badge-note', NcBadgeNote);
```

### Why the Framework Wrapper Matters

The `Component` base class gives you:

- `template()` for predictable rendering
- `onMount()` and `onUnmount()` lifecycle hooks
- `this.$()` and `this.$$()` for scoped queries
- automatic attribute-driven re-render behavior
- `defineComponent()` for safe registration

### Shadow DOM vs Light DOM

NativeCore components can use either Shadow DOM or Light DOM:

```typescript
// Shadow DOM (encapsulated)
export class ShadowButton extends Component {
    static useShadowDOM = true; // Default

    template() {
        return `
            <style>
                /* Styles are scoped to this component */
                .btn { color: blue; }
            </style>
            <button class="btn"><slot></slot></button>
        `;
    }
}

// Light DOM (styles can be inherited)
export class LightButton extends Component {
    static useShadowDOM = false;

    template() {
        return `<button class="btn"><slot></slot></button>`;
    }
}
```

### Component Lifecycle

NativeCore components follow a clear lifecycle:

```typescript
export class LifecycleDemo extends Component {
    constructor() {
        super();
        console.log('1. Constructor called');
        // Initialize state here
    }

    connectedCallback() {
        console.log('2. Component added to DOM');
        this.render();     // Render template
        this.onMount();    // Your setup code
    }

    disconnectedCallback() {
        console.log('3. Component removed from DOM');
        this.onUnmount();  // Your cleanup code
    }

    attributeChangedCallback(name, oldValue, newValue) {
        console.log('4. Attribute changed:', name, oldValue, '->', newValue);
        this.onAttributeChange(name, oldValue, newValue);
        this.render(); // Re-render on attribute change
    }

    // NativeCore-specific methods
    onMount() {
        console.log('5. NativeCore onMount called');
        // Setup event listeners, timers, etc.
    }

    onUnmount() {
        console.log('6. NativeCore onUnmount called');
        // Remove event listeners, clear timers, etc.
    }

    onAttributeChange(name, oldValue, newValue) {
        console.log('7. NativeCore onAttributeChange called');
        // React to attribute changes
    }
}
```

### Component Communication

Components communicate through:

1. **Attributes/Properties**
```typescript
// Parent component
<my-component title="Hello" count="5"></my-component>

// Child component
attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'count') {
        this.updateCount(parseInt(newValue));
    }
}
```

2. **Events**
```typescript
// Child component
this.emitEvent('value-changed', { value: newValue });

// Parent component
component.addEventListener('value-changed', (e) => {
    console.log('New value:', e.detail.value);
});
```

3. **Slots**
```typescript
// Component template
template() {
    return `
        <div class="card">
            <header><slot name="header"></slot></header>
            <main><slot></slot></main>
            <footer><slot name="footer"></slot></footer>
        </div>
    `;
}

// Usage
<my-card>
    <h2 slot="header">Card Title</h2>
    <p>Main content goes here</p>
    <div slot="footer">Footer content</div>
</my-card>
```

### Generator-First Component Creation

In a real NativeCore project, start with the generator:

```bash
npm run make:component dashboard-metric
```

Then adapt the generated component. That gives you the right file location, naming convention, and starter structure immediately.

### What You Learned

In this chapter, you learned:
- How Web Components work at the browser level
- NativeCore's component system extensions
- Shadow DOM vs Light DOM
- Component lifecycle methods
- Component communication patterns
- Building reusable component APIs

### Challenge

Create an `nc-inline-help` component that:
1. accepts `open` to show or hide
2. uses Shadow DOM
3. exposes a `variant` attribute
4. uses a default slot for content
5. is created from `npm run make:component` rather than a blank file

---

### Handling Custom Component Events

Often in your custom elements, you will want to emit application-specific actions for controllers or parents to listen to. The recommended standard is to dispatch `CustomEvent`s.

Example component dispatch:
```typescript
class CustomDropdown extends Component {
    static useShadowDOM = true;
    onSelect(item) {
        this.dispatchEvent(new CustomEvent("nc-change", {
            detail: { selected: item },
            bubbles: true,
            composed: true // allows it to cross the shadow boundaries
        }));
    }
}
```

Example controller capture using utilities:
```typescript
import { trackEvents } from '@core-utils/events.js';
// ...
const events = trackEvents();

// Use the generic 'events.on' for custom events and non-click interactions
events.on<CustomEvent<{ selected: string }>>('#dropdown', 'nc-change', (e) => {
    console.log("User selected:", e.detail.selected);
});
// ALWAYS remember the cleanup
return () => events.cleanup();
```


## Chapter 4: Reactive State with Signals

Signals are NativeCore's reactive state management system. They provide automatic UI updates when data changes, similar to React's useState but more powerful.

### What Are Signals?

Signals are reactive values that automatically update dependent computations and UI when their value changes:

```typescript
import { useState } from '@core/state.js';

// Create a signal
const count = useState(0);

// Read the value
console.log(count.value); // 0

// Update the value
count.value = 1; // Triggers reactivity
```

### Basic Signals

Let's start with basic signal usage:

```typescript
// src/components/ui/counter-demo.ts
import { Component, defineComponent } from '@core/component.js';
import { useState } from '@core/state.js';

export class CounterDemo extends Component {
    static useShadowDOM = true;

    // Component state
    count = useState(0);
    step = useState(1);

    template() {
        return `
            <style>
                .counter {
                    text-align: center;
                    padding: 2rem;
                }

                .count {
                    font-size: 3rem;
                    font-weight: bold;
                    color: #667eea;
                    margin: 1rem 0;
                }

                .controls {
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                    align-items: center;
                    margin: 1rem 0;
                }

                button {
                    padding: 0.5rem 1rem;
                    border: none;
                    border-radius: 4px;
                    background: #667eea;
                    color: white;
                    cursor: pointer;
                }

                button:hover {
                    background: #5568d3;
                }

                .step-input {
                    width: 60px;
                    padding: 0.5rem;
                    text-align: center;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                }
            </style>

            <div class="counter">
                <h3>Signal Counter</h3>
                <div class="count">${this.count.value}</div>

                <div class="controls">
                    <button class="decrement">-</button>
                    <input type="number" class="step-input" value="${this.step.value}" min="1" max="10">
                    <button class="increment">+</button>
                </div>

                <div>Step: ${this.step.value}</div>
            </div>
        `;
    }

    private _unwatchCount?: () => void;
    private _unwatchStep?: () => void;

    onMount() {
        const incrementBtn = this.$('.increment');
        const decrementBtn = this.$('.decrement');
        const stepInput = this.$('.step-input') as HTMLInputElement | null;

        this._unwatchCount = this.count.watch(() => this.render());
        this._unwatchStep = this.step.watch(() => this.render());

        incrementBtn?.addEventListener('click', () => {
            this.count.value += this.step.value;
        });

        decrementBtn?.addEventListener('click', () => {
            this.count.value -= this.step.value;
        });

        stepInput?.addEventListener('input', (e) => {
            const value = parseInt((e.target as HTMLInputElement).value, 10) || 1;
            this.step.value = Math.max(1, Math.min(10, value));
        });
    }

    onUnmount() {
        this._unwatchCount?.();
        this._unwatchStep?.();
    }
}

defineComponent('counter-demo', CounterDemo);
```

### Computed Signals

Computed signals automatically update when their dependencies change:

```typescript
import { useState, computed } from '@core/state.js';

// Basic signals
const firstName = useState('John');
const lastName = useState('Doe');

// Computed signal
const fullName = computed(() => {
    return `${firstName.value} ${lastName.value}`;
});

// Watch computed value
fullName.watch((name) => {
    console.log('Full name changed:', name);
});

// Update dependencies
firstName.value = 'Jane'; // fullName automatically updates to "Jane Doe"
```

### Side Effects in Current NativeCore

There is no separate `useState.effect()` helper in the current implementation. For side effects, use `watch()` and keep the unsubscribe function:

```typescript
const count = useState(0);

const unwatch = count.watch((value) => {
    document.title = `Count: ${value}`;
});

// later
unwatch();
```

### Signal-Based Todo List

Let's build a more complex example with computed values:

```typescript
// src/stores/advanced-todo-store.ts
import { useState, computed } from '@core/state.js';

export interface TodoItem {
    id: string;
    text: string;
    completed: boolean;
    priority: 'low' | 'medium' | 'high';
    createdAt: Date;
}

export const todos = useState<TodoItem[]>([]);
export const filter = useState<'all' | 'active' | 'completed'>('all');

// Computed values
export const filteredTodos = computed(() => {
    switch (filter.value) {
        case 'active':
            return todos.value.filter(todo => !todo.completed);
        case 'completed':
            return todos.value.filter(todo => todo.completed);
        default:
            return todos.value;
    }
});

export const stats = computed(() => {
    const all = todos.value.length;
    const completed = todos.value.filter(t => t.completed).length;
    const active = all - completed;
    const completionRate = all > 0 ? Math.round((completed / all) * 100) : 0;

    return { all, active, completed, completionRate };
});

export const priorityStats = computed(() => {
    return {
        high: todos.value.filter(t => t.priority === 'high').length,
        medium: todos.value.filter(t => t.priority === 'medium').length,
        low: todos.value.filter(t => t.priority === 'low').length,
    };
});

// Actions
export function addTodo(text: string, priority: 'low' | 'medium' | 'high' = 'medium') {
    const todo: TodoItem = {
        id: crypto.randomUUID(),
        text: text.trim(),
        completed: false,
        priority,
        createdAt: new Date()
    };
    todos.value = [...todos.value, todo];
}

export function toggleTodo(id: string) {
    todos.value = todos.value.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
}

export function deleteTodo(id: string) {
    todos.value = todos.value.filter(todo => todo.id !== id);
}

export function setFilter(newFilter: 'all' | 'active' | 'completed') {
    filter.value = newFilter;
}

export function clearCompleted() {
    todos.value = todos.value.filter(todo => !todo.completed);
}
```

### Advanced Todo Component

```typescript
// src/components/advanced-todo.ts
import { Component, defineComponent } from '@core/component.js';
import {
    filteredTodos,
    stats,
    priorityStats,
    filter,
    addTodo,
    toggleTodo,
    deleteTodo,
    setFilter,
    clearCompleted
} from '@stores/advanced-todo-store.js';

export class AdvancedTodo extends Component {
    static useShadowDOM = true;

    newTodoText = '';
    newTodoPriority: 'low' | 'medium' | 'high' = 'medium';

    template() {
        const todos = filteredTodos.value;
        const currentStats = stats.value;
        const priorities = priorityStats.value;
        const currentFilter = filter.value;

        return `
            <style>
                .todo-app {
                    max-width: 600px;
                    margin: 0 auto;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }

                .add-form {
                    display: flex;
                    gap: 0.5rem;
                    margin-bottom: 2rem;
                }

                .todo-input {
                    flex: 1;
                    padding: 0.75rem;
                    border: 2px solid #e0e0e0;
                    border-radius: 8px;
                    font-size: 1rem;
                }

                .priority-select {
                    padding: 0.75rem;
                    border: 2px solid #e0e0e0;
                    border-radius: 8px;
                    background: white;
                }

                .add-btn {
                    background: #667eea;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    padding: 0.75rem 1.5rem;
                    cursor: pointer;
                }

                .filters {
                    display: flex;
                    gap: 0.5rem;
                    margin-bottom: 1rem;
                }

                .filter-btn {
                    padding: 0.5rem 1rem;
                    border: 1px solid #e0e0e0;
                    background: white;
                    border-radius: 4px;
                    cursor: pointer;
                }

                .filter-btn.active {
                    background: #667eea;
                    color: white;
                    border-color: #667eea;
                }

                .stats {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                    padding: 1rem;
                    background: #f8f9fa;
                    border-radius: 8px;
                }

                .todo-item {
                    display: flex;
                    align-items: center;
                    padding: 1rem;
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                    margin-bottom: 0.5rem;
                    background: white;
                }

                .todo-item.completed .todo-text {
                    text-decoration: line-through;
                    color: #888;
                }

                .priority-high { border-left: 4px solid #ff4757; }
                .priority-medium { border-left: 4px solid #ffa726; }
                .priority-low { border-left: 4px solid #4caf50; }

                .checkbox {
                    margin-right: 1rem;
                }

                .todo-text {
                    flex: 1;
                }

                .delete-btn {
                    background: #ff4757;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    padding: 0.25rem 0.5rem;
                    cursor: pointer;
                    font-size: 0.8rem;
                }
            </style>

            <div class="todo-app">
                <form class="add-form">
                    <input
                        type="text"
                        class="todo-input"
                        placeholder="What needs to be done?"
                        maxlength="200"
                    >
                    <select class="priority-select">
                        <option value="low">Low Priority</option>
                        <option value="medium" selected>Medium Priority</option>
                        <option value="high">High Priority</option>
                    </select>
                    <button type="submit" class="add-btn">Add Todo</button>
                </form>

                <div class="filters">
                    <button class="filter-btn ${currentFilter === 'all' ? 'active' : ''}" data-filter="all">
                        All (${currentStats.all})
                    </button>
                    <button class="filter-btn ${currentFilter === 'active' ? 'active' : ''}" data-filter="active">
                        Active (${currentStats.active})
                    </button>
                    <button class="filter-btn ${currentFilter === 'completed' ? 'active' : ''}" data-filter="completed">
                        Completed (${currentStats.completed})
                    </button>
                </div>

                <div class="stats">
                    <div>
                        High: ${priorities.high} |
                        Medium: ${priorities.medium} |
                        Low: ${priorities.low}
                    </div>
                    <div>${currentStats.completionRate}% Complete</div>
                    ${currentStats.completed > 0 ? '<button class="delete-btn" style="margin-left: 1rem;">Clear Completed</button>' : ''}
                </div>

                <div class="todo-list">
                    ${todos.length === 0 ?
                        '<div style="text-align: center; padding: 3rem; color: #888; font-style: italic;">No todos match the current filter.</div>' :
                        todos.map(todo => `
                            <div class="todo-item priority-${todo.priority} ${todo.completed ? 'completed' : ''}">
                                <input
                                    type="checkbox"
                                    class="checkbox"
                                    ${todo.completed ? 'checked' : ''}
                                    data-todo-id="${todo.id}"
                                >
                                <span class="todo-text">${todo.text}</span>
                                <button class="delete-btn" data-todo-id="${todo.id}">×</button>
                            </div>
                        `).join('')
                    }
                </div>
            </div>
        `;
    }

    onMount() {
        // Watch signals for re-rendering
        filteredTodos.watch(() => this.render());
        stats.watch(() => this.render());
        priorityStats.watch(() => this.render());
        filter.watch(() => this.render());

        // Form submission
        const form = this.$('.add-form');
        const input = this.$('.todo-input') as HTMLInputElement;
        const select = this.$('.priority-select') as HTMLSelectElement;

        form?.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = input.value.trim();
            const priority = select.value as 'low' | 'medium' | 'high';

            if (text) {
                addTodo(text, priority);
                input.value = '';
                select.value = 'medium';
                input.focus();
            }
        });

        // Event delegation for dynamic elements
        this.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;

            if (target.matches('[data-filter]')) {
                const filterValue = target.getAttribute('data-filter') as 'all' | 'active' | 'completed';
                setFilter(filterValue);
            }

            if (target.matches('[data-todo-id]')) {
                const todoId = target.getAttribute('data-todo-id');
                if (target.classList.contains('delete-btn')) {
                    deleteTodo(todoId!);
                }
            }

            if (target.matches('.delete-btn') && !target.hasAttribute('data-todo-id')) {
                clearCompleted();
            }
        });

        this.addEventListener('change', (e) => {
            const target = e.target as HTMLElement;
            if (target.matches('.checkbox')) {
                const todoId = target.getAttribute('data-todo-id');
                if (todoId) toggleTodo(todoId);
            }
        });
    }
}

defineComponent('advanced-todo', AdvancedTodo);
```

### Signal Performance

Signals only notify when values actually change, and `computed()` should be treated as a live subscription graph that must be disposed when its lifetime ends.

```typescript
import { useState, computed } from '@core/state.js';

const subtotal = useState(120);
const tax = useState(0.08);
const total = computed(() => subtotal.value + subtotal.value * tax.value);

const unwatchTotal = total.watch((value) => {
    console.log('Total changed:', value);
});

// later
unwatchTotal();
total.dispose();
```

### What You Learned

In this chapter, you learned:
- How to create and use reactive signals
- Computed values that update automatically
- Effects for side effects
- Building complex UIs with reactive state
- Performance optimizations in signal-based systems

### Challenge

Create a shopping cart component that:
1. Uses signals for cart items and totals
2. Has computed values for subtotal, tax, and total
3. Supports adding/removing items
4. Persists cart to localStorage
5. Disposes its computed values correctly in `onUnmount()`

---


## Chapter 5: Building Reusable Components

Reusable components are where NativeCore starts to feel like a framework instead of a collection of utilities. The goal is not to turn every `<div>` into a custom element. The goal is to identify UI that benefits from encapsulation, attributes, lifecycle hooks, and reuse.

### Generator-First Workflow

The default workflow is:

```bash
npm run make:component customer-card
```

That gives you a correctly placed file, the expected naming convention, and a structure that already fits the framework. In day-to-day project work, that matters more than shaving a minute off the first file creation.

Use generators for three reasons:

1. they keep names and file placement consistent
2. they keep Shadow DOM and registration patterns aligned with the rest of the repo
3. they reduce the chance that docs and source drift apart

### The NativeCore Component Contract

A NativeCore component is a class that extends `Component` from `@core/component.js`.

The base class gives you:

- `template()` for returning markup
- `onMount()` for setup
- `onUnmount()` for cleanup
- `onAttributeChange()` for reacting to attribute changes
- `emitEvent()` for semantic custom events
- `$()` and `$$()` helpers for scoped DOM queries
- a DOM patching render path that updates existing nodes instead of replacing everything blindly

A typical modern component looks like this:

```typescript
import { Component, defineComponent } from '@core/component.js';
import { useState, computed } from '@core/state.js';
import type { State, ComputedState } from '@core/state.js';

export class CustomerCard extends Component {
    static useShadowDOM = true;

    name: State<string>;
    status: State<'active' | 'paused'>;
    badgeLabel: ComputedState<string>;
    private _unwatchName?: () => void;

    constructor() {
        super();
        this.name = useState(this.getAttribute('name') || 'Unknown customer');
        this.status = useState((this.getAttribute('status') as 'active' | 'paused') || 'active');
        this.badgeLabel = computed(() => this.status.value === 'active' ? 'Active' : 'Paused');
    }

    static get observedAttributes() {
        return ['name', 'status'];
    }

    template() {
        return `
            <style>
                .card { display: grid; gap: 0.5rem; }
                .badge { font-weight: 700; }
            </style>
            <article class="card">
                <h3 id="customer-name">${this.name.value}</h3>
                <span class="badge">${this.badgeLabel.value}</span>
                <button class="details-btn" type="button">View details</button>
            </article>
        `;
    }

    onMount() {
        this.shadowRoot?.addEventListener('click', this.handleClick);
        this._unwatchName = this.name.watch(value => {
            const heading = this.shadowRoot?.querySelector('#customer-name');
            if (heading) heading.textContent = value;
        });
    }

    onUnmount() {
        this.shadowRoot?.removeEventListener('click', this.handleClick);
        this._unwatchName?.();
        this.badgeLabel.dispose();
    }

    onAttributeChange(name: string, _oldValue: string | null, newValue: string | null) {
        if (name === 'name') this.name.value = newValue || 'Unknown customer';
        if (name === 'status') this.status.value = (newValue as 'active' | 'paused') || 'active';
    }

    private handleClick = (event: Event) => {
        const target = event.target as HTMLElement;
        if (target.matches('.details-btn')) {
            this.emitEvent('customer-details', {
                name: this.name.value,
                status: this.status.value,
            });
        }
    };
}

defineComponent('customer-card', CustomerCard);
```

### Lifecycle Order and What It Means

The current base class behavior is:

1. the constructor runs
2. Shadow DOM attaches if `static useShadowDOM = true`
3. `connectedCallback()` runs
4. `render()` patches the DOM from `template()`
5. `onMount()` runs
6. `attributeChangedCallback()` triggers `onAttributeChange()` and a re-render after mount
7. `disconnectedCallback()` runs `onUnmount()`

That order matters.

If you need DOM nodes, do not assume they exist in the constructor. Use `onMount()`.

If you create watchers, timers, observers, or computed values, clean them up in `onUnmount()`.

### Surgical, Fine-Grained UI Updates

One of the easiest parts of NativeCore to miss is that the base component does not throw away the entire DOM tree on every render. It patches existing nodes in place.

That gives you several benefits:

- focused inputs stay focused during updates
- text fields keep their in-progress value when possible
- stable elements survive state changes instead of being recreated
- updates are localized to the changed branches of the component tree

This is NativeCore's version of surgical UI work. You still think in templates, but the framework preserves the live DOM aggressively enough to keep interactions smooth.

In practice that means you should:

- prefer updating state over manually rewriting large DOM fragments
- keep `template()` deterministic for the current state
- let the patcher preserve focus and control state where it can
- avoid mixing big manual `innerHTML` rewrites with component-owned DOM

### Shadow DOM Versus Light DOM

For UI components, prefer Shadow DOM.

Use Shadow DOM when you want:

- style encapsulation
- internal structure that outside CSS cannot accidentally break
- reusable primitives that behave consistently across pages

Use light DOM only when you deliberately need:

- host page styles to flow directly into the component internals
- third-party DOM tooling that expects direct child access
- a wrapper component whose value comes mostly from semantics rather than encapsulation

The current framework guidance is simple: app-facing UI components should use Shadow DOM unless you have a real reason not to.

### Attributes, Properties, and Public API Design

A well-designed NativeCore component keeps its public API narrow.

Document at minimum:

- tag name
- observed attributes
- emitted events
- slots
- keyboard behavior
- accessibility notes

Good component APIs tend to follow these rules:

- attributes describe configuration, not implementation details
- event names describe intent, not DOM mechanics
- slots are used for compositional flexibility
- defaults are safe, accessible, and visually stable

### Events and Semantic Communication

Do not make parent routes reach deeply into component internals when a semantic event will do.

Prefer events like:

- `customer-details`
- `filter-change`
- `row-select`
- `dialog-confirm`

Avoid vague events like:

- `clicked`
- `changed-data`
- `action`

A semantic event contract makes components portable across views, controllers, and products.

### Cleanup Rules That Prevent Leaks

Every component author should memorize this checklist.

If you create any of the following, clean it up in `onUnmount()`:

- state watchers returned from `.watch()`
- computed values with `.dispose()`
- timers created with `setTimeout` or `setInterval`
- manual event listeners on `window`, `document`, or `shadowRoot`
- observers such as `ResizeObserver` or `IntersectionObserver`

If you do not clean them up, the component may appear to work in a demo while leaking memory during real navigation.

### Compose Before You Rebuild

The framework already ships a large set of primitives. In many cases the best custom component is a thin composition layer over shipped parts.

Start with built-ins like:

- `nc-button`
- `nc-input`
- `nc-select`
- `nc-checkbox`
- `nc-modal`
- `nc-table`
- `nc-card`
- `nc-alert`

If the framework already solves the hard part, your project component should solve the domain problem, not recreate the primitive.

### Designing Variant APIs

Variants are one of the most useful ways to keep a component flexible without making it messy. In NativeCore, a good `variant` attribute is a small, intentional public styling API, not an escape hatch for every visual difference.

Treat variants like this:

- `variant` should express a semantic or reusable visual mode such as `primary`, `secondary`, `success`, `danger`, `outline`, or `compact`
- the component should always have a stable default variant
- the variant list should stay short enough that maintainers can understand all options quickly
- if a styling difference is one-off and route-specific, prefer composition or a wrapper component over adding another global variant

A typical pattern looks like this:

```typescript
export class NcStatusPill extends Component {
    static useShadowDOM = true;

    static get observedAttributes() {
        return ['variant', 'label'];
    }

    template() {
        const variant = this.getAttribute('variant') ?? 'neutral';
        const label = this.getAttribute('label') ?? 'Status';

        return `
            <style>
                .pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.35rem;
                    padding: 0.45rem 0.75rem;
                    border-radius: 999px;
                    border: 1px solid transparent;
                    background: var(--nc-bg-secondary);
                    color: var(--nc-text);
                }

                .pill--neutral {
                    border-color: var(--nc-border);
                }

                .pill--success {
                    background: rgba(16, 185, 129, 0.1);
                    color: var(--nc-success);
                    border-color: rgba(16, 185, 129, 0.25);
                }

                .pill--danger {
                    background: rgba(239, 68, 68, 0.1);
                    color: var(--nc-danger);
                    border-color: rgba(239, 68, 68, 0.25);
                }
            </style>

            <span class="pill pill--${variant}">${label}</span>
        `;
    }
}
```

If you want to add a new variant to your own component, the clean process is:

1. add the new variant name to the component's documented API
2. update `observedAttributes()` if needed
3. set a clear fallback default when no variant is provided
4. add the new variant-specific styling in the component template or host styles
5. keep the variant behavior semantic and reusable, not page-specific

If your component is intended for framework-wide reuse, also expose variant choices clearly enough that tooling and future documentation can reflect them.

### Dev Mode Workflow

NativeCore's local development mode now includes component-level authoring helpers intended to speed up inspection and iteration without changing production behavior.

In development, you will see:

- a `DEV MODE` pill that toggles the component authoring affordances on and off
- tiny gear markers on custom components when dev mode is on
- an outline side panel for inspecting the page structure and storage state
- the component editor drawer for inspecting and editing component instances

This workflow is deliberately local-only. The dev tools should never be treated as a runtime production feature.

Use the workflow like this:

1. run the app locally
2. leave `DEV MODE` on when you want visual component editing affordances
3. click a component's gear marker to open the editor drawer
4. use the outline side tab when you need a broader view of structure or storage
5. toggle `DEV MODE` off when you want a clean view of the UI without authoring chrome

When creating your own components, dev mode is especially useful for checking whether:

- the component exposes the right attributes
- variants are named clearly and map to meaningful visual states
- default styling is stable before consumers start customizing it
- the instance behaves correctly inside real views, not only in isolated markup

Think of dev mode as a fast authoring aid, not as a substitute for clean component design. The best component APIs still need deliberate naming, defaults, cleanup, and documentation.

### Component Authoring Checklist

Before you call a component done, confirm that it:

1. uses the correct kebab-case tag name
2. opts into Shadow DOM when appropriate
3. has a small, documented public API
4. emits semantic events
5. cleans up watchers and listeners
6. works with keyboard interaction where needed
7. has sensible default styling and tokens
8. does not duplicate an existing framework primitive without reason

### What You Learned

In this chapter, you learned how NativeCore components are mounted, patched, cleaned up, and composed. More importantly, you learned that the framework's component model is not just about templating. It is about predictable lifecycle boundaries and fine-grained DOM preservation.

### Challenge

Create a `dashboard-filter` component that:

1. starts from `npm run make:component dashboard-filter`
2. uses Shadow DOM
3. exposes a narrow attribute API
4. emits a `filter-change` event
5. disposes every watcher or computed value it creates
6. composes built-in controls instead of re-implementing them

---

## Chapter 6: Client-Side Routing

Routing in NativeCore is explicit. You register paths, connect them to HTML views, and optionally lazy-load controllers. That directness is one of the framework's strengths.

### Where Routing Lives

Current routing is centered on:

- `src/routes/routes.ts`
- `src/core/router.ts`
- `src/middleware/auth.middleware.ts`
- `index.html`

Route registration typically looks like this:

```typescript
.register('/pricing', 'src/views/public/pricing.html', lazyController('pricingController', '../controllers/pricing.controller.js'))
```

### The Route Model

Each route can define:

- `htmlFile`
- an optional controller
- an optional cache policy
- an optional layout route

That means NativeCore routing is not just URL-to-view matching. It also controls how aggressively HTML is cached, whether shared layouts are reused, and whether controller code is loaded only when needed.

### Static Routes

Static routes are the simplest form:

```typescript
router.register('/docs', 'src/views/public/docs.html', lazyController('docsController', '../controllers/docs.controller.js'));
```

Use static routes for:

- marketing pages
- dashboards with fixed URLs
- docs landing pages
- authenticated screens with a stable path

### Dynamic URLs with Route Params

NativeCore supports dynamic segments with the `:param` pattern.

```typescript
router.register('/user/:id', 'src/views/protected/user-detail.html', lazyController('userDetailController', '../controllers/user-detail.controller.js'));
```

Inside the controller, the value arrives in `params`:

```typescript
export async function userDetailController(params: Record<string, string> = {}) {
    const userId = params.id;
}
```

Use dynamic segments when the path itself identifies the resource:

- `/user/42`
- `/product/abc-123`
- `/blog/nativecore-router`

### Optional Params

The current router also supports optional params with `:param?`.

```typescript
router.register('/reports/:year?', 'src/views/public/reports.html', lazyController('reportsController', '../controllers/reports.controller.js'));
```

That route matches both:

- `/reports`
- `/reports/2026`

Optional params are useful when:

- the route should have a natural default mode
- the URL should stay concise when the parameter is absent
- you want a single controller to handle summary and focused views

### Wildcard Routes

The router supports wildcard matching with `*`.

```typescript
router.register('/docs/*', 'src/views/public/docs.html', lazyController('docsController', '../controllers/docs.controller.js'));
```

The remaining path is exposed as `params.wildcard`.

This is useful for:

- docs hierarchies
- CMS-style content routing
- asset-like nested navigation under a shared route family
- fallback content explorers

### Nested URLs and Hierarchical Paths

NativeCore does not require a special nested route tree DSL to handle nested URLs. Multi-segment routes work as ordinary explicit paths.

Examples:

- `/dashboard/settings`
- `/dashboard/profile`
- `/docs/guides/routing`
- `/teams/:teamId/projects/:projectId`

Think of nested URLs as a path design problem, not as a framework ceremony problem.

If you want parent-child shared structure, use layout routes.

### Layout Routes

The router supports a `layout` option so related child routes can render inside a shared outlet.

```typescript
router.register('/dashboard', '/layout.html');
router.register('/dashboard/settings', '/settings.html', null, { layout: '/dashboard' });
router.register('/dashboard/profile', '/profile.html', null, { layout: '/dashboard' });
```

When you do this, the parent layout is fetched and rendered once, and child content flows into `#route-outlet`.

Use layout routes for:

- settings subsections
- account areas with persistent navigation
- documentation sections with stable sidebars
- dashboard families that share shell content below the main app shell

### Query Strings and Search Parameters

This is an important detail: the router matches the pathname, not query strings.

So patterns like these are your responsibility inside controllers or services:

- `/search?q=router`
- `/orders?page=2&status=open`
- `/docs?chapter=routing`

Use the browser API directly:

```typescript
const searchParams = new URLSearchParams(window.location.search);
const page = searchParams.get('page') || '1';
const status = searchParams.get('status') || 'open';
```

That approach is perfectly fine. Just document it clearly in your app so teams know the router is path-aware, not query-aware.

### History State

The router supports pushing and replacing history state during navigation.

Use history state for small, navigation-related client context such as:

- which tab should open after navigation
- whether the user came from a compact flow or full flow
- temporary UI context that should not be encoded into the visible URL

Do not use it as a substitute for durable application state.

### Public and Protected Routes

NativeCore uses one shell:

- `index.html` for all SPA routes

Protected route families are still tracked separately, but they now control auth checks and layout state instead of switching between different HTML entry points.

### Middleware and Route Guards

The router supports middleware through `router.use()`.

Middleware runs before the route loads and can block navigation.

Use middleware for:

- auth guards
- role checks
- redirect rules
- analytics hooks
- route-specific capability checks

A good rule is that middleware decides whether a route may proceed, while the controller handles what happens after the route is allowed.

### Route Caching

Each route can define a cache policy with:

- `ttl`
- `revalidate`

Use `ttl` when HTML for a route can safely stay warm for a while.

Use `revalidate: true` when you want stale-while-revalidate behavior: the user gets content immediately, and the framework refreshes it in the background.

This is a strong fit for:

- marketing pages
- docs pages
- semi-static dashboards
- slow content sources that benefit from optimistic navigation

### Route HTML Cache vs API Data Cache

This distinction matters:

- route cache policies in the router cache HTML loaded from view files
- they do not preserve controller instances
- they do not automatically cache backend responses

So when a user revisits a route, the HTML may come from cache, but the controller still runs again.

If the controller calls the backend directly, that request will happen again unless your service or store caches the data.

### Data Caching in the API Service

NativeCore now supports service-level data caching through `api.getCached()`.

Use it when you want:

- short-lived dashboard caches
- stale-while-revalidate reads for semi-live data
- deduped in-flight requests when multiple consumers ask for the same resource
- explicit invalidation after refresh actions or mutations

Example:

```typescript
const stats = await api.getCached('/dashboard/stats', {
    ttl: 30,
    revalidate: true,
    queryKey: ['dashboard', 'stats'],
    tags: ['dashboard'],
});
```

And if the user clicks a manual refresh button:

```typescript
api.invalidateQuery(['dashboard', 'stats'], { exact: true });
api.invalidateTags('dashboard');
const stats = await api.getCached('/dashboard/stats', {
    ttl: 30,
    revalidate: true,
    forceRefresh: true,
    queryKey: ['dashboard', 'stats'],
    tags: ['dashboard'],
});
```

### Structured Query Keys and Tags

NativeCore now supports two important cache concepts:

- `queryKey`: a structured identity for cached data
- `tags`: one or more invalidation groups

Use query keys when you want exact or family-level cache invalidation.

Example:

```typescript
queryKey: ['users', 'detail', userId]
```

Use tags when multiple cached resources should be invalidated together.

Example:

```typescript
tags: ['users', `user:${userId}`]
```

That gives you two useful invalidation styles:

- precise invalidation through `invalidateQuery()`
- broad invalidation through `invalidateTags()`

That is the recommended split:

- route cache for HTML navigation smoothness
- service/store cache for backend data freshness

### Prefetching

The router exposes `prefetch(path)`.

Use it when you know a likely next navigation, for example:

- hovering a primary CTA
- a visible next-step button in onboarding
- opening a docs table of contents where chapter switches are predictable

Prefetching is one of the cleanest performance wins in NativeCore because it works with the router's HTML cache instead of requiring a larger runtime abstraction.

### Controller Cleanup Still Matters

Routing is not just about matching URLs. It is about switching behavior safely.

Every controller must clean up:

- tracked DOM events
- store subscriptions
- watchers
- timers or observers

If it does not, repeated navigation creates duplicate behavior and stale page state.

### Routing Checklist

Before shipping a route, confirm:

1. the view path is correct
2. the controller export name matches the lazy loader
3. the route is in the correct shell family
4. protected prefixes are updated if needed
5. query string parsing is handled explicitly when needed
6. cleanup is returned from the controller
7. cache policy matches the route's freshness needs

---

### Dynamic and Nested Routing

NativeCoreJS provides an elegant mechanism for parametric and dynamic routes.

**Dynamic Route Patterns**:
Use colon prefixed parameters `:paramName` to catch variable routing logic. They are available inside the params argument passed to your controller.
```typescript
// in routes.ts
.register('/users/:id', 'views/pages/users.html',
    lazyController('userController', '../controllers/user.controller.js'))
```

```typescript
// in user.controller.ts
export async function userController(params: Record<string, string> = {}): Promise<() => void> {
    const userId = params.id; // Access the resolved dynamic segment

    const data = await api.getCached('/api/users/' + userId);
    // ...
}
```

Wildcards (`*`) can be used to catch broad swaths of routes, creating foundational "Nested Routing" where a controller manages its own sub-view state internally (e.g., rendering sub-tabs inside `/settings/*`).


## Chapter 7: Forms and Validation

Forms are where a lot of framework promises get tested. If your routing is elegant but your forms are brittle, users still feel the product as broken.

NativeCore gives you a strong baseline through components and utilities instead of a giant form runtime.

### Recommended Building Blocks

The current stack gives you these main pieces:

- `nc-form`
- `nc-input`
- `nc-textarea`
- `nc-select`
- `nc-checkbox`
- `nc-radio`
- `nc-switch`
- `nc-number-input`
- `nc-date-picker`
- `nc-time-picker`
- `nc-file-upload`
- `@utils/validation.js`
- `@utils/form.js`

### The `useForm()` Utility

One of the most important under-documented helpers in the repo is `useForm()`.

It gives you:

- reactive field state
- touched flags
- dirty flags
- computed validation errors
- overall validity and dirty status
- field binding helpers
- a submission wrapper

The current shape is:

```typescript
const form = useForm({
    initialValues: {
        email: '',
        password: '',
        remember: false,
    },
    rules: {
        email: [isRequired, isEmail],
        password: [isRequired],
    },
});
```

### What `useForm()` Tracks

It is worth being explicit here. `useForm()` tracks more than raw field values.

- `fields` tell you the current value of each field
- `touched` tells you whether the user has interacted with it
- `dirty` tells you whether the current value differs from the initial snapshot
- `errors` computes the current validation messages
- `isValid` gives you the aggregate validity state
- `isDirty` gives you the aggregate dirty state

That combination is enough for a large number of real products.

### Binding Real Inputs

`bindField()` connects a field to a native input, textarea, or select.

```typescript
const unbindEmail = form.bindField('email', '#email');
const unbindRemember = form.bindField('remember', '#remember');
```

The helper automatically chooses the right event type:

- `input` for text-like controls
- `change` for selects, checkboxes, and radios

If you use bindings in a controller, clean them up in the controller cleanup function.

### Submission Pattern

`submit()` wraps a handler and blocks submission when the form is invalid.

```typescript
const onSubmit = form.submit(async values => {
    await api.post('/auth/login', values);
    form.markAsPristine();
});
```

That wrapper:

1. prevents the default browser submit event
2. marks fields as touched
3. checks computed validity
4. runs your async or sync handler only when valid
5. resets dirty tracking after success

### Three Layers of Validation

Good NativeCore forms validate in three places.

#### 1. Native HTML constraints

Use browser-native hints first.

- `required`
- `type="email"`
- `min`
- `max`
- `pattern`

#### 2. Shared utility rules

Use `@utils/validation.js` for rules your app repeats across screens.

Examples:

- required fields
- email format
- password length
- business constraints such as allowed ranges or status transitions

#### 3. API validation

The server is the final authority.

Even when the UI validates well, the backend must still reject invalid or unauthorized input.

### Native Inputs Versus Framework Components

The framework ships styled input components, but `useForm()` currently binds directly to native form controls.

That means your project has two practical patterns:

1. use native form controls in the view for the simplest path
2. wrap framework components carefully so they expose and mirror native values consistently

When in doubt, choose the simpler path for critical business forms.

### Complex Forms

For larger forms, divide responsibility clearly.

Use the view for:

- semantic field structure
- labels and help text
- section grouping

Use the controller for:

- binding
- submission flow
- error rendering
- API coordination
- cleanup

Use services for:

- network requests
- shared payload formatting
- persistence or draft behavior

### Handling Server Errors

Treat server errors separately from field errors.

Field errors answer: "what is wrong with this specific input?"

Server errors answer: "the request could not be completed even though the form submitted."

Show them differently in the UI.

### Form Checklist

Before shipping a form, confirm that it:

1. has explicit labels
2. validates natively where possible
3. uses shared rules for repeated constraints
4. cleans up field bindings
5. distinguishes field errors from server errors
6. preserves user input on failed submission
7. uses a submit flow that prevents duplicate requests

---

## Chapter 8: API Integration

API integration is where framework discipline starts paying real dividends. A small app can survive with scattered network calls for a while, but a serious product needs transport logic that is predictable, testable, and easy to evolve.

NativeCore applications should centralize backend communication through services. That rule becomes more valuable as the codebase grows because it protects controllers from turning into a mix of DOM wiring, auth concerns, error parsing, and request shaping.

### The Current API Service

The shipped `api.service.ts` provides:

- `request()`
- `get()`
- `getCached()`
- `post()`
- `put()`
- `patch()`
- `delete()`
- `invalidateCache()`
- `invalidateQuery()`
- `invalidateTags()`
- `clearCache()`

It also:

- prepends a base URL
- attaches the auth header from `auth.service.ts`
- parses JSON and text responses
- handles unauthorized responses outside the login endpoint
- caches GET responses when you opt into `getCached()`
- dedupes in-flight GET requests for the same cache key
- indexes cached responses by structured query key and tag

### Why Services Matter

If controllers call `fetch()` directly everywhere, you eventually get:

- repeated header logic
- inconsistent error handling
- hidden auth assumptions
- duplicated query-string building
- harder testing

A single service layer gives you one place to update transport behavior.

### Query Parameters

The current API service supports params on `get()` calls.

```typescript
const users = await api.get('/users', {
    page: '2',
    status: 'active',
});
```

That is distinct from route query parsing.

Remember the split:

- router params describe URL path structure
- `window.location.search` describes client-side query state
- API service params describe backend query strings

Keeping those separate helps avoid a lot of confusion.

### When to Use `get()` vs `getCached()`

Use `get()` when:

- the data must always be fetched fresh
- the response is mutation-sensitive
- the endpoint is cheap and highly volatile

Use `getCached()` when:

- the data can tolerate a short stale window
- the user may revisit the route frequently
- the screen benefits from faster repeat navigation
- you want stale-while-revalidate behavior without putting transport logic in controllers

Prefer adding a `queryKey` whenever the cached resource is important enough to invalidate precisely later.

Add `tags` when a single mutation should fan out to multiple cached resources.

### Unauthorized Flow

When the API service receives a `401` outside the login endpoint, it:

1. logs the user out
2. dispatches an `unauthorized` event
3. throws an error

This is an example of NativeCore's explicit style. Auth problems are not hidden in a black box. The service makes the transition visible so the rest of the app can react.

### A Practical Controller Pattern

A healthy controller usually looks like this:

1. gather DOM references
2. set loading UI
3. call the service
4. render success or error states
5. wire events
6. return cleanup

```typescript
import api from '@services/api.service.js';
import { trackEvents, trackSubscriptions } from '@utils/events.js';
import { dom } from '@utils/dom.js';

export async function pricingController(): Promise<() => void> {
    const events = trackEvents();
    const subs = trackSubscriptions();
    const root = dom.query('#pricing-root');

    try {
        const plans = await api.get('/plans');
        if (root) {
            root.innerHTML = plans.map((plan: any) => `<li>${plan.name}</li>`).join('');
        }
    } catch (error) {
        if (root) {
            root.textContent = error instanceof Error ? error.message : 'Unknown error';
        }
    }

    return () => {
        events.cleanup();
        subs.cleanup();
    };
}
```

### API Design Guidelines for NativeCore Apps

Keep these rules close:

- controllers orchestrate, services transport
- services should not mutate route DOM
- normalize API errors before showing them
- keep auth token behavior centralized
- keep business-specific request shaping close to the domain service, not in generic route code

### Logging and Debugging

The repo also ships logger infrastructure. Use it to keep debugging and diagnostics consistent instead of scattering ad hoc console output across the app.

### What to Document in Every Service

When a service becomes a core part of the app, document:

- expected payloads
- returned data shape
- auth expectations
- error conditions
- retry or refresh behavior
- events it may dispatch

### Chapter Wrap-Up

The main lesson of this chapter is that API work should feel boring in the best possible way. When services own transport concerns and controllers own orchestration, the app becomes easier to reason about, easier to test, and much easier to maintain as endpoints grow.

---

## Chapter 9: Authentication System

Authentication is one of the fastest ways to expose whether a framework's architecture is genuinely clear or only convenient in demos. NativeCore leans into clarity here by making route protection, token storage, and auth events explicit.

NativeCore authentication is built around an explicit single-shell, token-based flow. That gives you a solid structure for real applications without pretending the framework can replace the security decisions your backend and platform still need to make.

### What the Auth Service Does

The current auth service manages:

- access token storage
- refresh token storage
- user data storage
- auth headers
- auth listeners
- basic JWT decoding
- logout cleanup

It defaults to session-based storage through `storage.service.ts`.

### Why Session Storage Matters

The current default favors session persistence instead of long-lived browser storage.

That choice is conservative and appropriate for many app flows because:

- sessions end with the browser tab or session
- it reduces the chance of stale long-lived credentials
- it keeps the storage strategy explicit and swappable

If your product needs another persistence model, treat that as an architectural decision, not a casual code tweak.

### The Single-Shell Auth Model

This framework now serves every SPA route from `index.html`.

That design keeps deployment simple while still allowing:

- public marketing and docs routes
- protected dashboard routes
- auth-aware layout changes like sidebar visibility
- explicit middleware-based access control

### Auth Events

The current implementation emits auth-related browser events such as:

- `auth-change`
- `unauthorized`

Use those events sparingly and intentionally. They are app-level coordination signals, not a substitute for good service and store design.

### Protected Routes

Protected route families are tracked separately so the app can enforce access control and toggle protected-only layout elements without leaving the SPA shell.

### Login Flow Checklist

A robust NativeCore login flow usually does this:

1. collect credentials from a form
2. post to the auth endpoint
3. persist access token and optional refresh token
4. persist user data
5. dispatch the auth change
6. navigate into the protected area
7. update protected-only UI like the sidebar

### Logout Flow Checklist

A robust logout flow should:

1. clear tokens
2. clear stored user data
3. notify listeners
4. emit `auth-change`
5. move the user back to a public route

### JWT Utilities

The current auth service can decode tokens and check expiry.

Treat that as a convenience, not as a full token lifecycle system. If your product needs silent refresh, refresh rotation, or multi-role claims enforcement, build those as explicit extensions and document them carefully.

### Security Notes

Do not overstate what the framework gives you out of the box.

NativeCore gives you a clean structure for auth. It does not magically solve:

- backend authorization
- token refresh policy
- CSRF strategy for non-token flows
- role-based access modeling
- session revocation

Those remain application or platform concerns.

### Real-World Example: Build a Login Flow That Enters the Protected Area

Suppose your `/login` view contains a form with `#login-form` and an error container with `#login-error`. The controller can keep the flow explicit and easy to debug.

```typescript
import api from '@services/api.service.js';
import auth from '@services/auth.service.js';
import { dom } from '@utils/dom.js';
import { trackEvents, trackSubscriptions } from '@utils/events.js';

export async function loginController(): Promise<() => void> {
    const events = trackEvents();
    const subs = trackSubscriptions();
    const form = dom.query<HTMLFormElement>('#login-form');
    const errorBox = dom.query('#login-error');

    if (!form) {
        return () => {
            events.cleanup();
            subs.cleanup();
        };
    }

    events.onSubmit('#login-form', async (event) => {
        event.preventDefault();
        if (errorBox) {
            errorBox.textContent = '';
        }

        const formData = new FormData(form);

        try {
            const response = await api.post('/auth/login', {
                email: String(formData.get('email') ?? ''),
                password: String(formData.get('password') ?? ''),
            });

            if (!response.accessToken) {
                throw new Error('Login response did not include an access token');
            }

            auth.setTokens(response.accessToken, response.refreshToken ?? null);
            auth.setUser(response.user);
            window.location.href = '/dashboard';
        } catch (error) {
            if (errorBox) {
                errorBox.textContent = error instanceof Error ? error.message : 'Login failed';
            }
        }
    });

    return () => {
        events.cleanup();
        subs.cleanup();
    };
}
```

This example makes the key auth responsibilities visible: credentials go through the API service, the auth service owns token and user persistence, and the controller decides what protected route comes next.

### What You Learned

- NativeCore auth stays understandable when API transport, token storage, and navigation are kept separate.
- `auth.setTokens()` and `auth.setUser()` should happen only after the backend confirms the login.
- Public-to-protected navigation is part of the auth flow, not an unrelated afterthought.

### Challenge

1. Extend the controller so it shows a loading state on the submit button during the request.
2. Add a logout button in a protected controller that calls `auth.logout()` and returns the user to `/login`.
3. Add a token-expiry guard that checks `auth.isTokenExpired(auth.getToken()!)` before rendering a protected page.

---

### Securing the Session, XSS, and Architecting the Auth Flow

By default, NativeCore provides a robust pattern leveraging **JWTs (JSON Web Tokens)** temporarily housed in `sessionStorage` or `localStorage`.
Because these tokens grant sweeping access, you must mitigate script injection (XSS):
- **Prevent XSS via DOM safety**: Avoid `innerHTML` when syncing user data into views. NativeCore enforces that you use `element.textContent`, standard `.setAttribute()`, or tagged templating that isolates executable scopes.
- Only ever use `element.innerHTML` on tightly-controlled, static templates your application exclusively generates.

**It is ultimately the developer's responsibility** to shape the authentication flow that best fits the product's threat model—whether that is HTTP-Only secure cookies handling auto-refreshes seamlessly behind the scenes (the most robust), or the out-of-the-box Token approach storing credentials into storage APIs.


## Chapter 10: Dashboard Application

Dashboards are where teams spend most of their time after the landing page and login flow are finished. They are also where architectural shortcuts become expensive, because dashboards accumulate filters, tables, charts, drawers, notifications, and navigation state very quickly.

The better mental model is to view a dashboard as a composition exercise across routes, shell UI, services, and shared state. NativeCore works well here because it keeps each of those responsibilities visible instead of hiding them inside one giant page abstraction.

### The Real Dashboard Stack

A production dashboard in NativeCore usually combines:

- protected route gating
- a sidebar or header layout
- route controllers for each screen
- shared app state or UI state
- component primitives for cards, tables, filters, and feedback
- API services for data loading

### The Current Repo Pattern

The current app bootstrap updates sidebar visibility based on:

- authentication state
- the current protected route prefix

That is a good example of the framework's style. A dashboard is not one giant page component. It is a shell plus route-specific behavior.

### Building a New Dashboard Screen

The workflow is typically:

1. create the view
2. create the controller
3. register the route
4. decide if it belongs in the protected route list
5. use built-in components for table, cards, filters, alerts, and drawers
6. coordinate data through services and stores

### Recommended Dashboard Patterns

Use controllers for:

- page bootstrapping
- filter event wiring
- store subscriptions
- page-specific rendering

Use components for:

- repeatable cards
- reusable filter bars
- tables and empty states
- dialogs and drawers

Use stores for:

- session-scoped shared UI state
- notifications
- user context
- global loading flags when they truly span screens

### Common Dashboard Mistakes

Avoid these:

- putting every dashboard concern into a single controller
- rebuilding component primitives the framework already ships
- mixing auth state, network requests, and DOM mutation into one utility module
- forgetting cleanup during rapid route changes

### Real-World Example: Add a Sales Summary Screen

A practical dashboard screen usually starts with a focused view and a controller that handles loading, filters, and rendering.

```html
<section class="dashboard-section">
    <header>
        <h1>Sales Summary</h1>
        <select id="range-filter">
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
        </select>
    </header>

    <div id="sales-grid"></div>
    <p id="sales-error" aria-live="polite"></p>
</section>
```

```typescript
import api from '@services/api.service.js';
import { dom } from '@utils/dom.js';
import { trackEvents, trackSubscriptions } from '@utils/events.js';

export async function salesDashboardController(): Promise<() => void> {
    const events = trackEvents();
    const subs = trackSubscriptions();
    const grid = dom.query('#sales-grid');
    const errorBox = dom.query('#sales-error');

    async function loadSummary(range = '7d') {
        if (!grid) return;
        grid.innerHTML = '<loading-spinner></loading-spinner>';
        if (errorBox) {
            errorBox.textContent = '';
        }

        try {
            const summary = await api.getCached('/dashboard/summary', {
                params: { range },
                ttl: 60,
                revalidate: true,
            });
            grid.innerHTML = `
                <nc-card>
                    <h2>Revenue</h2>
                    <p>$${summary.revenue}</p>
                </nc-card>
                <nc-card>
                    <h2>Orders</h2>
                    <p>${summary.orders}</p>
                </nc-card>
                <nc-card>
                    <h2>Conversion</h2>
                    <p>${summary.conversionRate}%</p>
                </nc-card>
            `;
        } catch (error) {
            grid.innerHTML = '';
            if (errorBox) {
                errorBox.textContent = error instanceof Error ? error.message : 'Failed to load dashboard';
            }
        }
    }

    await loadSummary();

    events.onChange('#range-filter', async (event) => {
        const value = (event.target as HTMLSelectElement).value;
        await loadSummary(value);
    });

    return () => {
        events.cleanup();
        subs.cleanup();
    };
}
```

This is the dashboard pattern you want to repeat: one view for structure, one controller for orchestration, and reusable components for presentation.

### What You Learned

- A dashboard screen is easiest to scale when loading, filters, and rendering stay local to one controller.
- Shared shell UI and route-specific data loading should stay separate concerns.
- Reusable cards, alerts, and tables help dashboards grow without duplicating layout code.

### Challenge

1. Add an empty state for the case where the API returns zero orders.
2. Move the metric-card HTML into a reusable component in `src/components/ui/`.
3. Register the new screen as a protected route and decide whether it needs a short cache policy.

---

## Chapter 11: E-commerce Store

Commerce is one of the best proving grounds for any SPA framework because it combines navigation, state, forms, performance, and trust. A storefront has to feel fast, stable, and clear at every step or users leave.

An e-commerce app is useful because it forces you to handle product detail routes, filters, carts, account pages, and rich reusable UI. That makes it an ideal lens for seeing how NativeCore handles real product complexity without abandoning standards-based architecture.

### Mapping Commerce Features to NativeCore

Use:

- route params for product or category detail pages
- query strings for filters and sorting
- stores for cart and session state
- components for cards, pagination, badges, ratings, and dialogs
- services for catalog, cart, checkout, and account APIs

### URL Design Matters

Examples:

- `/products/:slug`
- `/categories/:categorySlug`
- `/cart`
- `/checkout`
- `/orders/:orderId`
- `/search?q=keyboard&page=2`

This is exactly where dynamic URLs and query strings stop being academic and start shaping the actual product.

### Performance Guidance for Storefronts

Use caching and prefetching on routes that:

- are likely to be revisited
- are content-heavy but not personalized
- can tolerate brief stale windows

Use careful form handling on:

- checkout
- coupon application
- address entry
- account settings

### Component Composition for Commerce

A strong storefront often leans on:

- `nc-card`
- `nc-image`
- `nc-badge`
- `nc-rating`
- `nc-pagination`
- `nc-modal`
- `nc-drawer`
- `nc-button`
- `nc-input`

The lesson is not that NativeCore is specifically an e-commerce framework. The lesson is that a modern SPA framework must make these product patterns straightforward.

### Real-World Example: Build a Product Listing Page With URL-Driven Filters

A storefront page becomes practical as soon as the URL, the API request, and the add-to-cart action stay in sync.

```typescript
import api from '@services/api.service.js';
import { dom } from '@utils/dom.js';
import { trackEvents, trackSubscriptions } from '@utils/events.js';

export async function productsController(): Promise<() => void> {
    const events = trackEvents();
    const subs = trackSubscriptions();
    const grid = dom.query('#product-grid');

    type Product = {
        id: string;
        name: string;
        price: number;
    };

    async function renderProducts() {
        if (!grid) return;

        const params = new URLSearchParams(window.location.search);
        const category = params.get('category') ?? 'all';
        const page = params.get('page') ?? '1';

        const response = await api.get<{ items: Product[] }>('/products', { category, page });
        const cards = response.items.map((product) => {
            const card = document.createElement('nc-card');
            const title = document.createElement('h2');
            const price = document.createElement('p');
            const button = document.createElement('button');

            title.textContent = product.name;
            price.textContent = `$${product.price}`;
            button.className = 'add-to-cart';
            button.dataset.id = product.id;
            button.textContent = 'Add to cart';

            card.append(title, price, button);
            return card;
        });

        grid.replaceChildren(...cards);
    }

    await renderProducts();

    events.delegate('#product-grid', 'click', '.add-to-cart', async (_event, target) => {
        const productId = (target as HTMLElement).dataset.id;
        if (!productId) return;
        await api.post('/cart/items', { productId, quantity: 1 });
    });

    return () => {
        events.cleanup();
        subs.cleanup();
    };
}
```

Now the page is doing real storefront work: the URL controls the listing state, the backend receives matching query params, and each card can trigger a cart mutation.

### What You Learned

- Storefront pages get easier to maintain when filters live in the URL and request params mirror them.
- Event delegation is a good fit for product grids because card buttons are rendered dynamically.
- Commerce UX improves when browsing and cart mutations use separate, explicit flows.

### Challenge

1. Add a sort dropdown that writes `sort=price-asc` into the query string before reloading products.
2. Show an inline success message after a cart add completes.
3. Add pagination controls using `nc-pagination` and keep the current page in the URL.

---

## Chapter 12: Real-Time Chat App

Chat surfaces are unforgiving. When reactive updates lag, when subscriptions pile up, or when cleanup is skipped, users feel the problem immediately. That makes chat one of the best ways to understand why NativeCore's lifecycle rules matter.

Chat is a good stress test for reactive updates and lifecycle cleanup because it forces your code to stay responsive while handling constant change, rapid navigation, and long-lived connections.

### What a Chat App Exercises

A realistic chat flow pushes on:

- message list rendering
- optimistic updates
- connection lifecycle
- route changes between threads
- typing indicators and presence
- scrolling behavior
- notification state

### NativeCore Patterns That Help

Use signals and stores for:

- current thread state
- message arrays
- input draft text
- connection status

Use controllers for:

- joining and leaving channels
- wiring send actions
- unsubscribing from real-time sources on route exit

Use components for:

- message rows
- composer controls
- typing indicators
- thread lists

### Cleanup Is Non-Negotiable

Chat UIs are where leak-prone code reveals itself fast.

When leaving a chat route, always clean up:

- socket listeners
- intervals for polling or heartbeat logic
- subscriptions watching message state
- delegated DOM events

This is one of the clearest examples of why NativeCore insists on cleanup contracts.

### Real-World Example: Wire a Thread Controller to a WebSocket

A chat screen becomes real once you connect route lifecycle, message rendering, and socket cleanup.

```typescript
import { useState } from '@core/state.js';
import { dom } from '@utils/dom.js';
import { trackEvents, trackSubscriptions } from '@utils/events.js';

export async function chatThreadController(): Promise<() => void> {
    const events = trackEvents();
    const subs = trackSubscriptions();
    const messages = useState<Array<{ id: string; body: string; author: string }>>([]);
    const list = dom.query('#message-list');
    const form = dom.query<HTMLFormElement>('#message-form');
    const input = dom.query<HTMLInputElement>('#message-input');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const chatSocketUrl = `${protocol}//${window.location.host}/chat/support`;
    const socket = new WebSocket(chatSocketUrl);

    subs.watch(messages.watch((items) => {
        if (!list) return;
        list.innerHTML = items.map(message => `
            <li>
                <strong>${message.author}</strong>
                <span>${message.body}</span>
            </li>
        `).join('');
    }));

    socket.addEventListener('message', (event) => {
        try {
            const incoming = JSON.parse(event.data) as { id: string; body: string; author: string };
            messages.value = [...messages.value, incoming];
        } catch (error) {
            console.error('Received invalid chat payload', error);
        }
    });

    events.onSubmit('#message-form', (event) => {
        event.preventDefault();
        if (!form || !input || !input.value.trim()) return;

        socket.send(JSON.stringify({ body: input.value.trim() }));
        input.value = '';
    });

    return () => {
        socket.close();
        events.cleanup();
        subs.cleanup();
    };
}
```

This is the key lesson for real-time work in NativeCore: create the connection when the route enters, update state from socket events, and always shut the connection down when the route exits.

### What You Learned

- Real-time features fit NativeCore well when the controller owns the connection lifecycle.
- Signals make message list rendering straightforward without adding a framework-specific store layer too early.
- Cleanup is mandatory for sockets, not optional polish.

### Challenge

1. Add optimistic message rendering so a new message appears before the server echoes it back.
2. Track socket connection state and show a reconnect banner when the socket closes unexpectedly.
3. Support multiple threads by pulling a `threadId` from the route params and building the socket URL from it.

---

## Chapter 13: Performance Optimization

Performance is not a last-minute chapter in a real product. It is a running design choice that shows up in route loading, component boundaries, state modeling, and motion. NativeCore's architecture gives you several natural advantages, but those advantages still need to be used intentionally.

Performance in NativeCore comes from respecting the browser and loading only what you need. That sounds simple, but it is exactly the kind of discipline that keeps a framework fast as applications grow.

### The Main Performance Levers

The current framework gives you several strong levers:

- lazy route controllers
- lazy component loading through the registry
- a preload registry for first-paint essentials
- reactive state for targeted updates
- DOM patching that preserves focus and form state
- route HTML caching and prefetching
- GPU-oriented animation utilities

### Lazy Components Versus Preloaded Components

Use the preload registry only for components you know are needed immediately.

Examples from the current repo include:

- shell components
- loading spinner
- foundational navigation pieces
- splash and global feedback primitives

Everything else should justify its presence at first paint.

### Fine-Grained Updates Without a Virtual DOM Runtime

NativeCore gets a lot of mileage from a simple principle: most UI updates do not need full replacement.

Between signals, computed values, watchers, and the component patcher, the framework favors local change over page-wide churn.

That means performance work often looks like:

- modeling state clearly
- avoiding duplicate subscriptions
- avoiding giant `innerHTML` replacements in hot paths
- preserving component boundaries

### GPU-Friendly Motion

The repo includes GPU-aware animation utilities. Use them when you need motion, but remember the larger lesson: animation is part of performance, not separate from it.

Prefer transforms and opacity-driven animation paths over layout-heavy animation whenever possible.

### Caching Strategy

A route cache policy is a UX decision.

Ask:

- how stale may this content safely be?
- is instant navigation more important than perfect freshness?
- is the route mostly public content or highly personalized data?

Your answers should determine route cache choices, not habit.

### Benchmarking Rule

Never publish performance claims without reproducible runs.

Repeatable measurements matter more than screenshots, intuition, or one favorable local session.

### Real-World Example: Reduce First Paint Cost on a Heavy Reports Page

Imagine a reports page that uses a large chart component. The performance win comes from loading only what is needed immediately.

```typescript
// src/components/registry.ts
componentRegistry.register('reports-chart', './ui/reports-chart.js');

// src/routes/routes.ts
router
    .register('/reports', 'src/views/protected/reports.html', lazyController('reportsController', '../controllers/reports.controller.js'))
    .cache({ ttl: 60, revalidate: true });
```

```typescript
// src/controllers/reports.controller.ts
import api from '@services/api.service.js';
import { dom } from '@utils/dom.js';
import { trackEvents, trackSubscriptions } from '@utils/events.js';

export async function reportsController(): Promise<() => void> {
    const events = trackEvents();
    const subs = trackSubscriptions();
    const root = dom.query('#reports-root');
    type ReportSeriesPoint = {
        label: string;
        value: number;
    };

    if (root) {
        root.innerHTML = '<nc-skeleton></nc-skeleton>';
        const data = await api.get<{ series: ReportSeriesPoint[] }>('/reports/summary');
        const chart = document.createElement('reports-chart') as HTMLElement & { series?: ReportSeriesPoint[] };
        chart.series = data.series;
        root.replaceChildren(chart);
    }

    return () => {
        events.cleanup();
        subs.cleanup();
    };
}
```

The page now ships a small shell first, delays the heavy chart code until the route needs it, and caches the route briefly so repeat visits feel faster. In this example, `reports-chart` receives structured data through a property because complex arrays are safer to pass as objects than to serialize into HTML attributes.

### What You Learned

- Lazy route controllers and lazy components work best when you reserve preloading for truly universal UI.
- Fast-feeling pages often start with lightweight placeholders instead of big first-paint bundles.
- Route cache settings should follow UX needs, not guesswork.

### Challenge

1. Audit three existing components and decide whether they belong in `preloadRegistry.ts` or `registry.ts`.
2. Replace a large immediate render with `nc-skeleton` while data loads.
3. Measure the reports page before and after the change and record the specific improvement.

---

## Chapter 14: Testing Your Applications

A framework is only as trustworthy as the behaviors you can verify. Testing in NativeCore should feel practical, not ceremonial: you validate what users see, what routes do, and whether cleanup and state transitions behave the way the architecture promises.

Testing is where a framework proves whether its abstractions are understandable. If the framework is clear, your tests become easier to write because the seams between routes, services, components, and utilities are already visible.

### What the Current Repo Tests

The repository already includes unit coverage for:

- validation helpers
- router behavior
- component rendering and DOM patching
- computed state
- signals
- form utilities
- lazy component loading

That is a good map for your own applications.

### Recommended Testing Layers

#### Unit tests

Use unit tests for:

- pure utilities
- validators
- stores
- computed logic
- service helpers

#### Component tests

Use component tests for:

- initial render
- attribute-driven rerendering
- semantic event emission
- focus preservation during updates
- watcher cleanup when unmounted

#### Controller tests

Use controller-oriented tests for:

- DOM wiring
- API orchestration
- route param handling
- cleanup behavior

#### Route tests

Use router tests for:

- dynamic params
- optional params
- wildcard params
- layout route reuse
- prefetch behavior
- scroll restoration

### Testing Guidelines

Keep tests close to behavior, not framework mythology.

Test what the user or maintainer can observe:

- DOM output
- route transitions
- event emissions
- state changes
- cleanup side effects

### Practical Workflow

The repo exposes these validation commands:

```bash
npm run lint
npm run typecheck
npm run build:client
npm run test -- --run
npm run validate
```

Treat `npm run validate` as the main release gate, and use targeted test runs while iterating.

### Real-World Example: Test a Form Utility the Same Way the Repo Does

The repo already uses Vitest for unit tests, so follow that style when you add coverage for a new workflow.

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useForm } from '../../src/utils/form.js';
import { isRequired, isValidEmail } from '../../src/utils/validation.js';

describe('login form workflow', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('submits valid credentials and resets dirty tracking', async () => {
        const form = useForm({
            initialValues: {
                email: '',
                password: '',
            },
            rules: {
                email: [isRequired, isValidEmail],
                password: [isRequired],
            },
        });

        form.fields.email.value = 'dev@example.com';
        form.fields.password.value = 'N4tiveCore!Docs2026';
        form.dirty.email.value = true;
        form.dirty.password.value = true;

        const submitHandler = vi.fn(async () => {});
        const submitted = await form.submit(submitHandler)();

        expect(submitted).toBe(true);
        expect(submitHandler).toHaveBeenCalledWith({
            email: 'dev@example.com',
            password: 'N4tiveCore!Docs2026',
        });
        expect(form.isDirty.value).toBe(false);
    });
});
```

This test stays close to observable behavior: valid data, successful submission, and dirty-state reset.

### What You Learned

- NativeCore testing gets easier when you target utilities, controllers, and components at their natural seams.
- The repo’s Vitest patterns already give you a strong template for new tests.
- Good tests verify behavior users and maintainers can observe, not internal trivia.

### Challenge

1. Add a test that proves invalid email input prevents submission.
2. Write a component test that checks focus is preserved after a rerender.
3. Add a router test for a dynamic route such as `/user/:id` and assert the param is parsed correctly.

---

## Chapter 15: Deployment and Production

A framework feels mature when its production story is honest, repeatable, and operationally understandable. NativeCore's deployment path is strongest when you treat build output, shell behavior, and crawlability as first-class product concerns instead of afterthoughts.

NativeCore production deployment is centered on compiling clean TypeScript, producing browser-safe module output, and optionally generating bot-oriented static content. That gives you a practical path to shipping without pretending the framework already includes infrastructure it does not.

### Core Build Commands

```bash
npm run compile
npm run build:client
npm run build
npm run build:bots
```

### What the Pipeline Does

At a high level, the current scripts handle:

- TypeScript compilation
- alias resolution
- version injection
- production-oriented compilation and minification
- static asset preparation
- optional bot build generation
- removal of development-only code paths in production builds

### Production Checklist

Before deployment, confirm that:

1. `.js` extensions are correct in all imports
2. production compilation succeeds
3. bot output is generated for crawl-critical public routes if needed
4. protected routes still resolve correctly on hard refresh
5. the correct shell is served for public versus protected entry points
6. cache-busting or versioning is in place for shipped assets

### Hard Refreshes and Shell Boundaries

A production app must behave correctly when the user lands directly on:

- `/`
- `/docs`
- `/login`
- `/dashboard`
- `/user/42`

Do not treat SPA navigation success as enough. Hard-refresh correctness is part of real deployment quality.

### Bot Builds Are the SEO Story

For public, crawlable content, NativeCore currently leans on bot-oriented prerender output instead of a fully hydrated SSR runtime.

That is an important product truth. Document it honestly.

### Real-World Example: Deploy a Single-Shell SPA Correctly

A production deployment is not finished until your SPA routes resolve on hard refresh and your build output is verified.

```bash
npm run lint
npm run typecheck
npm run build:client
npm run build:bots
```

If you are deploying behind Nginx, the SPA rewrite can look like this:

```nginx
location / {
    try_files $uri /index.html;
}
```

That setup keeps all SPA routes on `index.html`, while auth middleware and route metadata decide which pages require authentication.

### What You Learned

- Deployment quality depends on correct SPA rewrites, not just successful client-side navigation.
- `npm run build:client` and `npm run build:bots` solve different production needs and should be used intentionally.
- Hard-refresh testing is part of release work, not an optional final glance.

### Challenge

1. Test `/`, `/docs`, `/login`, and `/dashboard` with hard refreshes in your staging environment.
2. Add a short deployment checklist to your project README so the shell rules are documented for future releases.
3. Verify that your bot build output contains crawlable HTML for at least one public page.

---

## Chapter 16: Building Component Libraries

A component library can either sharpen a product team's speed or quietly become another maintenance burden. NativeCore gives you a strong head start by shipping many primitives already, which means your library work should usually focus on domain language, not rebuilding the foundation.

NativeCore already ships a meaningful component foundation, so a project library should usually extend that foundation rather than replace it. That keeps your library more durable and your design system easier to explain.

### Library Strategy

A healthy library has three layers:

1. framework primitives shipped by NativeCore
2. product-wide reusable components for your domain
3. page-specific composition that should stay local and not become a library prematurely

### Registration and Loading

When you add a library component, decide whether it belongs in:

- the lazy registry
- the preload registry
- a private domain module not intended for broad reuse

Do not preload everything by default. Library sprawl can quietly erase the framework's loading advantages.

### Design Token Discipline

Keep visual choices tied to shared CSS variables and design tokens where possible.

This gives you:

- consistent theming
- easier future redesigns
- fewer one-off color and spacing forks

### Library Documentation

For every reusable component, document:

- why it exists
- when to use it instead of a built-in primitive
- its tag name, attributes, events, and slots
- accessibility expectations
- whether it should be preloaded or lazy-loaded

### Real-World Example: Create a Domain Component Instead of Repeating Price Markup

If several product screens repeat the same price, discount, and billing text, move that behavior into a reusable component.

```bash
npm run make:component product-price
```

```typescript
import { Component, defineComponent } from '@core/component.js';

export class ProductPrice extends Component {
    static useShadowDOM = true;

    template() {
        const amount = this.getAttribute('amount') ?? '0';
        const interval = this.getAttribute('interval') ?? 'month';

        return `
            <style>
                .price { font-weight: 700; font-size: 1.5rem; }
                .interval { color: var(--nc-text-muted, #64748b); }
            </style>
            <div>
                <span class="price">$${amount}</span>
                <span class="interval">/${interval}</span>
            </div>
        `;
    }
}

defineComponent('product-price', ProductPrice);
```

```typescript
componentRegistry.register('product-price', './ui/product-price.js');
```

Now pricing cards, checkout summaries, and plan comparison tables can all use one domain-specific component instead of repeating markup across views.

### What You Learned

- A strong library grows from repeated domain needs, not from wrapping every HTML element.
- The component generator gives you a consistent starting point for reusable UI.
- Registering a component lazily helps the library scale without front-loading every abstraction.

### Challenge

1. Extend `product-price` to support a `discount` attribute and render a struck-through original price.
2. Document the component’s attributes, events, and slots in your docs page.
3. Decide whether the component belongs in the preload registry or should stay lazy-loaded, and justify the choice.

---

## Chapter 17: Server-Side Rendering

This is one of the chapters where clear language matters more than ambitious language. Teams make major architecture decisions based on what a framework truly ships, so the documentation has to distinguish current capability from future possibility.

NativeCore's current production story is bot-oriented prerendering, not a full SSR plus hydration runtime. Saying that plainly makes the framework more trustworthy, not less.

### What NativeCore Does Today

Use `npm run build:bots` when you need static HTML for search bots or social crawlers on public content.

This works well for:

- landing pages
- docs pages
- public marketing content
- benchmark or feature pages you want indexed cleanly

### What NativeCore Does Not Currently Ship

Do not describe the current framework as providing:

- a full request-time SSR renderer
- hydration across server-rendered interactive islands
- a React- or Vue-style isomorphic runtime

That is not a weakness in the docs. It is simply the honest state of the framework.

### When Bot-Oriented Rendering Is Enough

For many framework sites and product marketing sites, bot output is the right tradeoff because it gives you crawlable HTML without forcing you into a heavier runtime architecture.

### Real-World Example: Make a Public Docs Route Crawlable

The framework’s current rendering story is practical when you treat bot output as a build step instead of pretending you have full SSR.

```typescript
router
    .register('/guides/performance', 'src/views/public/performance-guide.html', lazyController('performanceGuideController', '../controllers/performance-guide.controller.js'))
    .cache({ ttl: 300 });
```

```bash
npm run build:bots
```

After the bot build runs, inspect the generated output for the public guide page and confirm the HTML contains the content you want search engines to index.

This is a real workflow developers can use today: keep the route public, render meaningful HTML during the bot build, and verify the final generated page instead of describing unsupported hydration features.

### What You Learned

- NativeCore currently ships bot-oriented prerendering, not a request-time SSR runtime.
- Public docs and marketing pages are the best candidates for bot builds.
- Honest documentation about rendering capabilities is part of good engineering practice.

### Challenge

1. Add a new public route that should be crawlable and include it in your bot-build verification process.
2. Compare the generated HTML before and after the bot build for that route.
3. Write down which routes in your product truly need crawlable HTML and which can stay client-rendered only.

---

## Chapter 18: Mobile Development

Mobile quality is where vague frontend claims stop mattering. Users do not care what framework powers the app if the tap targets are cramped, drawers feel awkward, and forms break when the keyboard opens.

NativeCore works well for mobile-oriented SPA work when you remember that mobile quality is mostly about layout discipline and interaction design, not framework branding. The framework helps, but the product still has to be designed for hands, thumbs, and narrow screens.

### Mobile Priorities

Focus on:

- real narrow-width testing
- touch target size
- overlay behavior
- navigation patterns like drawers and bottom nav
- responsive spacing and typography
- keyboard and viewport behavior on forms

### Framework Features That Help

The current component set already includes pieces such as:

- `nc-bottom-nav`
- `nc-drawer`
- `nc-modal`
- `nc-tabs`
- `nc-scroll-top`

Use them to shorten the path to a strong mobile UI, but still test on real devices or real narrow browser widths.

### Mobile Testing Rule

Never assume desktop responsive emulation is enough. Verify important public pages and core workflows at real narrow widths before you call the work production-ready.

### Real-World Example: Build a Mobile Dashboard Navigation Pattern

A practical mobile layout often combines a drawer for deeper navigation and a bottom nav for primary destinations.

```html
<header class="mobile-header">
    <button id="open-nav">Menu</button>
    <h1>Workspace</h1>
</header>

<nc-drawer id="mobile-drawer">
    <nav>
        <a href="/dashboard">Dashboard</a>
        <a href="/projects">Projects</a>
        <a href="/settings">Settings</a>
    </nav>
</nc-drawer>

<nc-bottom-nav>
    <nc-bottom-nav-item href="/dashboard">Home</nc-bottom-nav-item>
    <nc-bottom-nav-item href="/projects">Projects</nc-bottom-nav-item>
    <nc-bottom-nav-item href="/settings">Settings</nc-bottom-nav-item>
</nc-bottom-nav>
```

```typescript
import { dom } from '@utils/dom.js';
import { trackEvents, trackSubscriptions } from '@utils/events.js';

export async function mobileShellController(): Promise<() => void> {
    const events = trackEvents();
    const subs = trackSubscriptions();
    const drawer = dom.query('#mobile-drawer');

    events.onClick('#open-nav', () => {
        drawer?.setAttribute('open', '');
    });

    return () => {
        events.cleanup();
        subs.cleanup();
    };
}
```

This gives you a concrete mobile pattern to build from: simple tap targets, clear primary navigation, and a controller that manages only the interaction glue.

### What You Learned

- Mobile quality comes from interaction design decisions that fit narrow screens and touch input.
- NativeCore’s shipped drawer and bottom-nav primitives can cover a large part of a mobile shell.
- Controllers should coordinate mobile interactions without burying responsive logic inside them.

### Challenge

1. Add a responsive rule that hides the bottom nav on desktop widths.
2. Verify the drawer and bottom nav both remain usable when the software keyboard opens on a mobile form page.
3. Test the layout on a real phone or browser device emulation and record the first three UX fixes you notice.

---

## Chapter 19: Internationalization

Internationalization is one of those topics that punishes wishful thinking. If you postpone it too long, layout, routing, formatting, and content design all become harder to untangle.

NativeCore does not force a heavy i18n abstraction on you. That is good, but it also means you must design your i18n approach deliberately so translation, formatting, and locale-aware behavior remain part of the architecture instead of an afterthought.

### A Practical NativeCore i18n Architecture

Use:

- a service for locale loading and message lookup
- a store for active locale state
- components and controllers that re-render from that state
- route and query patterns that make locale intent explicit when needed

### What to Keep Framework-Agnostic

Do not bury your translation strategy inside component internals alone.

A production i18n system usually also needs:

- pluralization rules
- interpolation
- date and number formatting
- fallback locales
- locale-aware routing decisions

The framework stays close to the platform here, which is a benefit. You can choose the right depth for your product.

### Real-World Example: Add a Locale Store and a Price Formatter

A practical i18n setup starts with locale state that controllers and components can react to directly.

```typescript
import { useState } from '@core/state.js';

export const locale = useState('en-US');

export function t(messages: Record<string, string>) {
    return messages[locale.value] ?? messages['en-US'] ?? '';
}

export function formatPrice(amount: number, currency = 'USD') {
    return new Intl.NumberFormat(locale.value, {
        style: 'currency',
        currency,
    }).format(amount);
}
```

```typescript
import { dom } from '@utils/dom.js';
import { trackEvents, trackSubscriptions } from '@utils/events.js';
import { locale, t, formatPrice } from '@stores/localeStore.js';

export async function pricingPageController(): Promise<() => void> {
    const events = trackEvents();
    const subs = trackSubscriptions();
    const title = dom.query('#pricing-title');
    const price = dom.query('#pricing-amount');

    subs.watch(locale.watch(() => {
        if (title) title.textContent = t({ 'en-US': 'Pricing', 'es-MX': 'Precios' });
        if (price) price.textContent = formatPrice(29);
    }));

    events.onChange('#locale-switcher', (event) => {
        locale.value = (event.target as HTMLSelectElement).value;
    });

    return () => {
        events.cleanup();
        subs.cleanup();
    };
}
```

Now the page can switch labels and currency formatting without hiding the locale model inside a component black box.

### What You Learned

- Locale should be explicit shared state so multiple screens can react consistently.
- `Intl` gives you a strong browser-native foundation for formatting.
- Good i18n architecture separates message lookup, locale state, and UI rendering.

### Challenge

1. Add a fallback locale when an unsupported locale is selected.
2. Expand the helper so dates use `Intl.DateTimeFormat` too.
3. Make the active locale part of the URL or persisted user preferences.

---

## Chapter 20: Accessibility

Accessibility is where craftsmanship becomes visible. The difference between a framework demo and a framework you can trust in production is often whether keyboard behavior, semantics, focus management, and status feedback were treated as essential from the beginning.

Accessibility in NativeCore is not optional polish. It is part of building correct components and views, and it belongs in every layer of the system rather than in a single final audit.

### Accessibility Responsibilities by Layer

#### Views

Views should provide:

- semantic structure
- headings in the right order
- landmark elements
- explicit labels
- button and link semantics that match intent

#### Components

Components should provide:

- keyboard support where interaction exists
- ARIA only when native semantics are not enough
- visible focus states
- sensible roles and state attributes

#### Controllers

Controllers should manage:

- focus transitions after navigation or dialog open
- announcing important async state where appropriate
- not breaking keyboard flows with careless DOM manipulation

### Shadow DOM Accessibility Notes

Shadow DOM is not an excuse to ignore accessibility. Test keyboard behavior, focus behavior, and assistive technology expectations for any complex component boundary.

### Accessibility Checklist

Before shipping a feature, confirm:

1. all interactive elements are keyboard reachable
2. labels and descriptions are explicit
3. focus order remains logical after dynamic updates
4. dialogs, drawers, and menus manage focus intentionally
5. status and error messaging is perceivable

### Real-World Example: Open a Modal and Return Focus Correctly

A good accessibility example is one developers can build and test immediately. Here is a simple modal workflow.

```html
<button id="open-help">Keyboard shortcuts</button>
<nc-modal id="help-modal">
    <h2 id="help-title">Keyboard shortcuts</h2>
    <p>Press <kbd>?</kbd> to reopen this dialog.</p>
    <button id="close-help">Close</button>
</nc-modal>
```

```typescript
import { dom } from '@utils/dom.js';
import { trackEvents, trackSubscriptions } from '@utils/events.js';

export async function helpModalController(): Promise<() => void> {
    const events = trackEvents();
    const subs = trackSubscriptions();
    const openButton = dom.query<HTMLButtonElement>('#open-help');
    const modal = dom.query('#help-modal');
    const closeButton = dom.query<HTMLButtonElement>('#close-help');

    events.onClick('#open-help', () => {
        modal?.setAttribute('open', '');
        closeButton?.focus();
    });

    events.onClick('#close-help', () => {
        modal?.removeAttribute('open');
        openButton?.focus();
    });

    return () => {
        events.cleanup();
        subs.cleanup();
    };
}
```

This example is accessible because the markup is semantic, the dialog has a meaningful heading, and focus moves to the right place when the dialog opens and closes.

### What You Learned

- Accessibility work belongs in views, components, and controllers together.
- Focus management is one of the fastest ways to turn a dynamic UI from frustrating into usable.
- Native semantics should come first, with ARIA added only when needed.

### Challenge

1. Add keyboard handling so pressing Escape closes the modal.
2. Verify the dialog works with keyboard-only navigation from open to close.
3. Audit one existing page for heading order, labels, and logical focus order.

---

## Chapter 21: Component API Reference

Reference chapters have a different job than teaching chapters. They are not here to persuade you. They are here to help you move quickly, confirm what exists, and make good choices without spelunking through the entire repo every time.

This chapter now acts as a practical inventory of the shipped component surface. The source of truth remains `src/components/registry.ts` and the component demo page, but this section tells you what exists and how to think about it.

### Shell and Global Components

- `app-header`
- `app-sidebar`
- `app-footer`
- `loading-spinner`
- `nc-scroll-top`
- `nc-snackbar`

### Navigation Components

- `nc-a`
- `nc-breadcrumb`
- `nc-pagination`
- `nc-tabs`
- `nc-tab-item`
- `nc-bottom-nav`
- `nc-bottom-nav-item`
- `nc-nav-item`

### Forms and Input Components

- `nc-form`
- `nc-field`
- `nc-input`
- `nc-textarea`
- `nc-select`
- `nc-checkbox`
- `nc-radio`
- `nc-switch`
- `nc-slider`
- `nc-number-input`
- `nc-otp-input`
- `nc-date-picker`
- `nc-time-picker`
- `nc-color-picker`
- `nc-file-upload`
- `nc-tag-input`
- `nc-autocomplete`

### Display and Feedback Components

- `nc-card`
- `nc-alert`
- `nc-badge`
- `nc-chip`
- `nc-avatar`
- `nc-avatar-group`
- `nc-empty-state`
- `nc-divider`
- `nc-code`
- `nc-kbd`
- `nc-image`
- `nc-skeleton`
- `nc-progress`
- `nc-progress-circular`
- `nc-rating`
- `nc-rich-text`
- `nc-copy-button`
- `nc-tooltip`
- `nc-timeline`
- `nc-timeline-item`
- `nc-stepper`
- `nc-step`
- `nc-splash`
- `nc-animation`
- `nc-collapsible`
- `nc-accordion`
- `nc-accordion-item`
- `nc-table`
- `nc-div`

### Overlays and Menu Components

- `nc-modal`
- `nc-drawer`
- `nc-dropdown`
- `nc-popover`
- `nc-menu`
- `nc-menu-item`

### How to Read This Inventory

For each component you adopt, confirm:

- its tag name
- its supported attributes
- the custom events it emits
- whether it expects slots or inline content
- whether it is already preloaded or lazy-loaded
- its keyboard and accessibility behavior

If you publish formal docs later, generate this section from source metadata so it stays in sync automatically.

### Real-World Example: Choose the Right Primitive for a Profile Card

Reference chapters become useful when they show how to pick components in a real UI instead of listing tags in isolation.

```html
<nc-card>
    <nc-avatar src="/public/images/dev.png" alt="Alicia Gomez"></nc-avatar>
    <h2>Alicia Gomez</h2>
    <nc-badge>Pro plan</nc-badge>
    <p>Frontend lead working on the design system.</p>
    <nc-button>View profile</nc-button>
</nc-card>
```

That single example already tells you something actionable about the inventory:

- `nc-card` provides the container
- `nc-avatar` handles identity visuals
- `nc-badge` communicates status
- `nc-button` gives you a standard action affordance

Use the reference chapter this way while building: start with the screen you need, then map each UI responsibility to an existing primitive before inventing a new one.

### What You Learned

- A component reference is most valuable when it shortens the path from idea to implementation.
- Real screens usually combine several primitives, not one tag at a time.
- The registry remains the source of truth, but examples make the inventory much easier to apply.

### Challenge

1. Build a settings card using only shipped primitives from this chapter.
2. Expand one component entry with the attributes, events, slots, and accessibility notes your team actually needs.
3. Compare your design with the component demo page at `/components` and list any missing documentation details.

---

## Chapter 22: Best Practices Guide

To keep the framework humming smoothly and team momentum high, rigorously observe these NativeCore conventions mapped from real-world applications in 2026.

### Controller Anatomy: The Master Structure

NativeCore controllers are incredibly powerful, yet they easily become cluttered. We instituted this exact vertical sectioning flow:
1. **Setup**: Call `trackEvents()` and `trackSubscriptions()`.
2. **DOM Refs**: Target interactive nodes using the heavily-typed shorthand `dom.$('#id')` or `data-view` scoping.
3. **State & Computeds**: Declare reactive variables `useState()`, derived strings, etc.
4. **Helpers**: Utility closures for things like `syncView()` or API fetching `loadData()`.
5. **Watchers**: Bind logic via `subs.watch(state.watch(...))`.
6. **On load**: Initial data loading, manual DOM syncs.
7. **Events**: Interaction capturing via DOM shorthands (`events.onClick`, `events.onSubmit`, `events.onKeydown` or the fully custom generic `events.on`).
8. **Cleanup**: Returning the cleanup callback that executes `events.cleanup()`, `subs.cleanup()` and `computed.dispose()`.

```typescript
export async function modernController(): Promise<() => void> {
    // -- Setup --
    const events = trackEvents();
    const subs   = trackSubscriptions();

    // -- DOM refs --
    const submitBtn = dom.$('#process-btn');

    // -- State & computed --
    const dataState = useState([]);

    // -- Helpers --
    const load = async () => { /* ... */ }

    // -- Watchers --
    subs.watch(dataState.watch(val => console.log('synced', val)));

    // -- On load --
    await load();

    // -- Events --
    events.onClick('#process-btn', () => { /* ... */ });
    events.onKeydown('#inputField', (e) => { /* ... */ });

    // -- Cleanup --
    return () => {
        events.cleanup();
        subs.cleanup();
    };
}
```

### Utilize NativeCore DOM Helpers

We've moved beyond verbose vanilla DOM queries:
- **Never use** `dom.$('#id') as HTMLElement`. Instead, use `dom.$<HTMLElement>('#id')` where generics are only needed if your element requires highly specific typings (e.g. `.hidden` or `<HTMLInputElement>`).
- If you're building a data structure inside a complex UI, explore `dom.within(shadowRoot, 'selector')` for safe DOM drilling avoiding global queries.

### Data Attributes and the `dom.view(...)` Scope

As your controllers grow, directly targeting globally unique `#ids` gets brittle and clutters your HTML. NativeCore champions a **Data Attribute Scoping Convention** powered by `dom.view(viewName)`.

By structuring your view around three data attributes, you can completely sidestep ID collisions and create a beautiful interface inside your controller.
- `[data-view="name"]` – Creates a query boundary around the page or block.
- `[data-hook="name"]` – Used for data-display nodes (text, inputs, sub-components).
- `[data-action="name"]` – Used for actionable elements (buttons, links).

#### View Example
```html
<main data-view="profile">
    <h1 data-hook="title">Loading...</h1>
    <form data-hook="editor-form">
        <input data-hook="email" type="email" />
        <button data-action="save">Save Settings</button>
    </form>
</main>
```

#### Controller Usage
In the controller, you instantiate the scope once with `dom.view('profile')` and then effortlessly retrieve elements using the strongly-typed helper methods:

```typescript
export async function profileController() {
    // Defines scope: document.querySelector('[data-view="profile"]')
    const view = dom.view('profile');

    // -- DOM refs --
    // Safely drills: [data-view="profile"] [data-hook="title"]
    const titleEl = view.hook('title');
    
    // Automatically typed as HTMLInputElement inside the profile boundary
    const emailField = view.input('email');
    
    // Automatically typed as HTMLFormElement
    const settingsForm = view.form('editor-form');
    
    // Grabs the custom selector string required for event delegation
    // returns: '[data-view="profile"] [data-action="save"]'
    const saveSelector = view.actionSelector('save');

    // ...

    // -- Events --
    events.onSubmit(settingsForm, handleSubmit);
    // Listen directly using the pre-built selector string!
    events.onClick(saveSelector, handleSave);
}
```

This strict architectural pattern separates your application logic from CSS classes (`.button-blue`), isolates queries inside their parent DOM shells, and dramatically cleans up controller file headers.

### Memory Integrity: Absolute Cleanup Discipline

JavaScript SPAs leak memory faster than you can write `new CustomEvent` if you're not diligent.
You must always `cleanup` DOM listeners via `trackEvents().cleanup()` and observable states via `trackSubscriptions().cleanup()`. Computed derivatives require `.dispose()` manually called at the tail of the function before exiting, stopping background cascading rendering logic off-screen.

## Chapter 23: Troubleshooting

Troubleshooting gets easier when the framework is explicit, and that is one of NativeCore's quiet advantages. Most failures tend to trace back to a small number of places: route registration, component registration, cleanup boundaries, import paths, or build configuration.

Most NativeCore problems are understandable once you know where to look. The goal of this chapter is not to replace debugging, but to shorten the path from symptom to likely cause.

### Routing Problems

If a route does not load, check:

1. the registered path
2. the HTML file path
3. the lazy controller export name
4. whether the route belongs in the protected prefix list
5. whether you expected query strings to behave like route params

### Component Problems

If a component does not behave correctly, check:

1. whether the tag is registered
2. whether the component is preloaded or lazy-loaded as expected
3. whether `static useShadowDOM` is set correctly
4. whether observed attributes are declared
5. whether cleanup is happening in `onUnmount()`

### Reactivity Problems

If reactive state seems stale or leaky, check:

1. whether you are reading `.value`
2. whether a computed value was disposed
3. whether multiple watchers were attached accidentally
4. whether a controller cleanup is missing
5. whether an effect or watcher is closing over stale DOM references

### Build Problems

If the build fails, check:

1. `.js` file extensions in imports
2. path alias usage
3. TypeScript diagnostics first
4. lint output next
5. whether production-only build scripts are removing a dev-only assumption

### Docs Rule

If you solve the same confusion twice, update the docs or generator output so the next person does not have to rediscover it.

### Real-World Example: Debug a Missing Component Registration

Suppose you add `<pricing-chart></pricing-chart>` to a view and nothing renders. A practical troubleshooting pass looks like this:

1. Confirm the tag name matches the component definition.
2. Check `src/components/registry.ts` for a matching registration.
3. Verify the import path ends in `.js`.
4. Run `npm run typecheck` and `npm run build:client` to catch module issues.

A correct registration should look like this:

```typescript
componentRegistry.register('pricing-chart', './ui/pricing-chart.js');
```

If the file exists but the path is wrong, the component will fail at runtime even though the HTML looks fine. This is exactly why NativeCore troubleshooting usually starts with explicit registration and import paths.

### What You Learned

- NativeCore bugs are often localized to route registration, component registration, cleanup, or import paths.
- Troubleshooting gets faster when you follow the same checklist every time.
- The best fix often includes a docs or generator improvement so the issue is less likely to repeat.

### Challenge

1. Reproduce a routing or component-registration mistake in a throwaway branch and debug it from the checklist.
2. Add one troubleshooting note to your team docs for a mistake you have already seen twice.
3. Create a short validation script or checklist that you run before opening a PR.

---

## Chapter 24: Migration Guide

Migration work succeeds when teams preserve their intent while changing their tools. The hardest part is rarely syntax. It is learning which abstractions were essential, which were incidental, and which can become simpler once you move closer to the platform.

Migrating to NativeCore goes more smoothly when you map mental models honestly instead of pretending every framework is the same. That honesty makes the transition easier to teach and much less frustrating to execute.

### From React

Map concepts like this:

- props become attributes, slots, and custom events
- hooks become lifecycle methods, watchers, and explicit services
- route files become explicit route registration
- memoized derived state becomes `computed()`
- effect cleanup becomes `onUnmount()` or a returned disposer from `effect()`

### From Vue

Map concepts like this:

- single-file component concerns split into view, component, controller, and style layers
- reactive refs and computed values map well to `useState()` and `computed()`
- router config becomes explicit route registration with lazy controllers
- template magic becomes plain HTML and template literals

### From Vanilla JavaScript

NativeCore should feel like structure, not like a foreign language.

You still work with:

- DOM APIs
- modules
- browser events
- custom elements
- fetch
- CSS

The framework mainly gives you conventions, helpers, reactive state, routing, and reusable primitives.

### Migration Strategy for Real Teams

A safe migration usually looks like this:

1. move one screen at a time
2. stabilize route structure first
3. isolate service boundaries early
4. migrate reusable primitives into components
5. introduce signals and stores where they simplify shared state
6. document each recurring pattern as you go

### The Most Important Mental Shift

NativeCore rewards explicit architecture.

If you come from a framework that hides everything behind a giant runtime, the main adjustment is accepting that:

- markup can stay markup
- routes can stay explicit
- services can stay simple
- cleanup should be visible
- browser primitives are a feature, not a fallback

### Real-World Example: Migrate a React Counter to a NativeCore Component

Take a tiny React-style counter and translate it into the NativeCore component model so the mental shift becomes concrete.

```typescript
import { Component, defineComponent } from '@core/component.js';
import { useState } from '@core/state.js';

export class CounterCard extends Component {
    static useShadowDOM = true;

    constructor() {
        super();
        this.count = useState(0);
        this._unwatchCount = undefined;
    }

    template() {
        return `
            <style>
                .count { font-size: 2rem; }
            </style>
            <div>
                <p class="count" id="count-value">${this.count.value}</p>
                <button class="increment-btn">Increment</button>
            </div>
        `;
    }

    onMount() {
        this.shadowRoot.addEventListener('click', (event) => {
            if ((event.target as HTMLElement).matches('.increment-btn')) {
                this.count.value += 1;
            }
        });

        this._unwatchCount = this.count.watch((value) => {
            this.shadowRoot.querySelector('#count-value')!.textContent = String(value);
        });
    }

    onUnmount() {
        this._unwatchCount?.();
    }
}

defineComponent('counter-card', CounterCard);
```

That example shows the migration mindset clearly: local state becomes `useState()`, rerender triggers are explicit, and cleanup is visible instead of hidden behind a hook runtime.

### What You Learned

- Migration becomes easier when you map one familiar feature into NativeCore’s explicit primitives.
- NativeCore components reward direct understanding of Web Components, local state, and lifecycle cleanup.
- The goal is not to mimic another framework perfectly; it is to preserve the useful behavior with a simpler runtime model.

### Challenge

1. Migrate one more familiar widget from your previous framework into a NativeCore component.
2. Rewrite one effect-based workflow as a controller cleanup or component `onUnmount()` flow.
3. Document the three biggest mental-model changes your team needs to learn during migration.

---

*This expanded ebook now covers the current NativeCore framework with deeper guidance on routing, fine-grained updates, component authoring, forms, auth, testing, deployment, and the shipped component surface area.*

---
## About the Author

**David Toledo** is the creator of NativeCore, a modern web framework that combines the best of React, Vue, and Svelte without the complexity. With over 10 years of web development experience, David has worked at startups and Fortune 500 companies, building everything from MVPs to enterprise applications.

When not coding, David enjoys teaching programming concepts and advocating for web standards.

Contact: davidtv2008@gmail.com

---

## Acknowledgments

This book was made possible by:
- The web standards community for creating Custom Elements and Shadow DOM
- The JavaScript community for inspiring modern patterns
- Early adopters who provided feedback on NativeCore
- My family for their patience during long coding sessions

---

*NativeCore: Modern Web Development on Web Standards*  
Copyright © 2026 David Toledo  
All rights reserved.

---

# Chapter 22 — Testing with Vitest

A NativeCoreJS application has four testable layers: state functions, stores, controllers, and components. Each layer has a distinct testing strategy. This chapter walks through all four using Vitest and happy-dom, the test environment the framework template ships with by default.

---

## 22.1 The Test Setup

The project template includes `vitest.config.ts` pre-configured with happy-dom:

```typescript
// vitest.config.ts (already in your project)
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'happy-dom',
        globals: true,
    },
});
```

happy-dom provides a fast, lightweight DOM implementation that supports custom elements, shadow roots, and `CustomEvent` — everything NativeCoreJS components need — without spinning up a full browser.

Run your tests:

```bash
npm test
```

Test files live in `tests/` and follow the naming convention `*.test.ts`. The recommended sub-directory structure is covered in §22.9.

---

## 22.2 Unit Testing State Functions

State functions are pure in their interface: you set `.value`, you read `.value`. They require no DOM and no mocking:

```typescript
// tests/state/computed.test.ts
import { describe, it, expect } from 'vitest';
import { useState, computed } from '@core/state.js';

describe('computed', () => {
    it('derives its value from useState', () => {
        const count   = useState(3);
        const doubled = computed(() => count.value * 2);

        expect(doubled.value).toBe(6);

        count.value = 5;
        expect(doubled.value).toBe(10);

        doubled.dispose();
    });

    it('updates when multiple dependencies change', () => {
        const first = useState('Ada');
        const last  = useState('Lovelace');
        const full  = computed(() => `${first.value} ${last.value}`);

        expect(full.value).toBe('Ada Lovelace');
        first.value = 'Grace';
        expect(full.value).toBe('Grace Lovelace');

        full.dispose();
    });
});
```

Always call `.dispose()` on computed states at the end of the test — this prevents subscription leaks that can cause later tests to behave unexpectedly.

---

## 22.3 Unit Testing a Store

Stores call `api` services. Mock the service at the module level so tests remain fast and deterministic:

```typescript
// tests/state/task-store.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import api from '@services/api.service.js';
import { taskStore } from '@stores/task.store.js';
import type { Task } from '../../src/types/index.js';

vi.mock('@services/api.service.js', () => ({
    default: { getCached: vi.fn() },
}));

const mockTasks: Task[] = [
    { id: '1', title: 'Write tests', status: 'in-progress', projectId: 'p1', priority: 'high' },
    { id: '2', title: 'Ship it',     status: 'todo',        projectId: 'p1', priority: 'medium' },
];

describe('taskStore', () => {
    beforeEach(() => {
        vi.mocked(api.getCached).mockResolvedValue(mockTasks);
        taskStore.items.value = [];   // reset between tests
    });

    it('loads tasks from the API', async () => {
        await taskStore.load();
        expect(taskStore.items.value).toHaveLength(2);
        expect(taskStore.items.value[0].title).toBe('Write tests');
    });

    it('sets loading to true while fetching, then false after', async () => {
        const loadPromise = taskStore.load();
        expect(taskStore.loading.value).toBe(true);
        await loadPromise;
        expect(taskStore.loading.value).toBe(false);
    });

    it('captures error message on failure', async () => {
        vi.mocked(api.getCached).mockRejectedValue(new Error('Network error'));
        await taskStore.load();
        expect(taskStore.error.value).toBe('Network error');
    });
});
```

`vi.mock()` is hoisted by Vitest to the top of the file, so the mock is in place before any imports run.

---

## 22.4 Testing a Controller

Controllers interact with the DOM. happy-dom provides `document`, so you can set up the HTML, run the controller, and assert against DOM state:

```typescript
// tests/controllers/tasks-controller.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import api from '@services/api.service.js';
import { tasksController } from '@controllers/index.js';
import type { Task } from '../../src/types/index.js';

vi.mock('@services/api.service.js', () => ({
    default: { getCached: vi.fn() },
}));

const mockTasks: Task[] = [
    { id: '1', title: 'Write docs', status: 'todo', projectId: 'p1', priority: 'low' },
];

describe('tasksController', () => {
    beforeEach(() => {
        vi.mocked(api.getCached).mockResolvedValue(mockTasks);
        document.body.innerHTML = `
          <div data-view="tasks">
            <span data-hook="count">-</span>
            <ul data-hook="task-list"></ul>
          </div>
        `;
    });

    it('renders the task count', async () => {
        const cleanup = await tasksController({});
        expect(document.querySelector('[data-hook="count"]')?.textContent).toBe('1');
        cleanup();
    });

    it('runs cleanup without throwing', async () => {
        const cleanup = await tasksController({});
        expect(() => cleanup()).not.toThrow();
    });

    it('removes DOM listeners after cleanup', async () => {
        const cleanup = await tasksController({});
        cleanup();
        // After cleanup, state updates should not touch the (now-removed) DOM
        expect(() => { /* no-op */ }).not.toThrow();
    });
});
```

Always call `cleanup()` at the end of each test. Controllers attach event listeners and reactive effects — leaking them between tests causes false failures.

---

## 22.5 Testing a Component

Testing components requires that they are registered as custom elements before you query them:

```typescript
// tests/components/task-card.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { defineComponent } from 'nativecorejs';
import { TaskCard } from '@components/task-card/TaskCard.js';

// Register once for the test file
defineComponent('task-card', TaskCard);

describe('TaskCard', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('renders the title in the shadow DOM', async () => {
        document.body.innerHTML = '<task-card title="Write tests"></task-card>';
        const card = document.querySelector('task-card') as TaskCard;

        // Wait for the custom element to upgrade
        await customElements.whenDefined('task-card');

        expect(card.shadowRoot?.querySelector('[data-hook="title"]')?.textContent)
            .toBe('Write tests');
    });

    it('updates title when attribute changes', async () => {
        document.body.innerHTML = '<task-card title="Original"></task-card>';
        const card = document.querySelector('task-card') as TaskCard;
        await customElements.whenDefined('task-card');

        card.setAttribute('title', 'Updated');
        expect(card.shadowRoot?.querySelector('[data-hook="title"]')?.textContent)
            .toBe('Updated');
    });

    it('reflects status in the badge', async () => {
        document.body.innerHTML = '<task-card title="T" status="done"></task-card>';
        const card = document.querySelector('task-card') as TaskCard;
        await customElements.whenDefined('task-card');

        const badge = card.shadowRoot?.querySelector('[data-hook="status"]');
        expect(badge?.textContent).toBe('done');
    });
});
```

> **Tip:** `customElements.whenDefined()` returns a promise that resolves as soon as the element upgrades. Always await it before querying the shadow root — querying too early may return `null` on slower machines.

---

## 22.6 Testing Events

Verify that components dispatch custom events with the correct detail payload:

```typescript
it('dispatches task-selected with the correct taskId', async () => {
    document.body.innerHTML = '<task-card title="T" task-id="abc-123" status="todo"></task-card>';
    const card = document.querySelector('task-card') as TaskCard;
    await customElements.whenDefined('task-card');

    let receivedId = '';
    document.addEventListener('task-selected', (e: Event) => {
        receivedId = (e as CustomEvent<{ taskId: string }>).detail.taskId;
    });

    card.click();
    expect(receivedId).toBe('abc-123');
});
```

Use `document.addEventListener` rather than `card.addEventListener` because `composed: true` events bubble through the shadow boundary and continue up to `document`.

---

## 22.7 Mocking the Router

When testing a controller that calls `router.navigate()`, mock the router module to prevent actual navigation:

```typescript
vi.mock('@core/router.js', () => ({
    default: { navigate: vi.fn() },
    router:  { navigate: vi.fn() },
}));

it('redirects to /tasks when id param is missing', async () => {
    const { router } = await import('@core/router.js');
    const cleanup = await taskDetailController({});   // no id
    expect(router.navigate).toHaveBeenCalledWith('/tasks');
    cleanup();
});
```

---

## 22.8 Integration Test Pattern

An integration test renders an entire view, runs its controller, and asserts the full DOM state — mimicking what the router does at runtime:

```typescript
// tests/views/tasks-view.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '@services/api.service.js';
import { tasksController } from '@controllers/index.js';

vi.mock('@services/api.service.js', () => ({ default: { getCached: vi.fn() } }));

// Inline the view HTML (or import it as a string if your build supports it)
const VIEW_HTML = `
  <section data-view="tasks">
    <header>
      <h1>Tasks</h1>
      <span data-hook="count">0</span>
    </header>
    <ul data-hook="task-list"></ul>
    <div aria-live="polite" data-hook="status-message"></div>
  </section>
`;

describe('Tasks view integration', () => {
    beforeEach(() => {
        vi.mocked(api.getCached).mockResolvedValue([
            { id: '1', title: 'Alpha', status: 'todo', projectId: 'p1', priority: 'low' },
            { id: '2', title: 'Beta',  status: 'done', projectId: 'p1', priority: 'high' },
        ]);
        document.body.innerHTML = VIEW_HTML;
    });

    it('shows the correct task count after load', async () => {
        const cleanup = await tasksController({});
        expect(document.querySelector('[data-hook="count"]')?.textContent).toBe('2');
        cleanup();
    });
});
```

---

## 22.9 Test File Organization

```
tests/
├── state/
│   ├── computed.test.ts
│   └── effect.test.ts
├── stores/
│   └── task-store.test.ts
├── controllers/
│   ├── tasks-controller.test.ts
│   └── task-detail-controller.test.ts
├── components/
│   ├── task-card.test.ts
│   ├── task-list.test.ts
│   └── priority-badge.test.ts
└── views/
    └── tasks-view.test.ts
```

Mirror the `src/` directory structure inside `tests/`. This makes it trivial to find the tests for any source file.

---

## 22.10 CI with GitHub Actions

Add a minimal workflow to run tests on every push and pull request:

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm test
```

`npm ci` installs exact versions from `package-lock.json`. `npm test` runs Vitest in non-watch mode. The workflow fails the PR check if any test fails, preventing regressions from reaching `main`.

---

## What's Next

Chapter 23 is **CLI Mastery and the Generator Workflow** — a complete reference for every `npm run make:*` command, the workflow table showing which commands built Taskflow chapter by chapter, and the rule that should govern every new file you create in a NativeCoreJS project.

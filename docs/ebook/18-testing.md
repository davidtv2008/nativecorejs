# Chapter 18 — Testing

Shipping code you cannot verify is a bet you will always lose eventually.
NativeCoreJS gives you a small, purpose-built test harness: Vitest as the
runner, `happy-dom` as the headless browser environment, and three helpers in
`@testing/index.js` that let you mount real custom elements without a browser
window.

This chapter is a lab. You will:

1. Run the existing scaffold tests to confirm your toolchain works
2. Generate a component with `--with-tests` and read what was created
3. Write a meaningful test for `task-card` — mount, inspect, and fire events
4. Understand the three helpers (`mountComponent`, `waitFor`, `fireEvent`) well
   enough to write tests for any component you build

---

## Mental model (30 seconds)

```
Vitest test file
  → import your component module  (triggers customElements.define)
  → mountComponent('task-card')   (creates element, appends to happy-dom body)
  → assert shadow / light DOM     (use element.shadowRoot or element.textContent)
  → fireEvent(element, 'toggle')  (dispatches a real CustomEvent)
  → waitFor(() => check)          (polls until the DOM settles)
  → cleanup()                     (removes from body — prevents cross-test bleed)
```

The helpers live in `.nativecore/testing/index.js` and are imported via the
`@testing/index.js` alias — **not** a published package path.

---

## Lab — Confirm the scaffold tests pass

Before writing new tests, verify the baseline.

**Windows (PowerShell / cmd):**

```bash
npm.cmd test -- --run
```

**macOS / Linux:**

```bash
npm test -- --run
```

`--run` exits after one pass instead of staying in watch mode. Green output
means Vitest, `happy-dom`, and the alias mappings all work on your machine.

### What the scaffold ships

The default scaffold includes a store test:

| File | What it tests |
|------|---------------|
| `tests/unit/store.test.ts` | `appStore` reactive state round-trip |

That file also demonstrates the import pattern: it imports from `@stores/…`
and calls `useState` / `effect` directly. It does not mount a custom element —
that is what this chapter adds.

### Challenge — Bronze

- [ ] `npm.cmd test -- --run` exits with no failures
- [ ] Identify the test file location: `tests/unit/`
- [ ] Open the file and read the first `it(…)` block before moving on

---

## Lab — Generate a component with tests

```bash
npm.cmd run make:component -- task-card --defaults --with-tests
```

If you already generated `task-card` in Chapter 06 without `--with-tests`, the
generator will still write the test file alongside the existing component.

### What appeared on disk

| Path | Role |
|------|------|
| `src/components/ui/task-card.js` (or `.ts`) | Component class (already exists) |
| `tests/unit/task-card.test.js` (or `.ts`) | Vitest spec the generator wrote |

Open `tests/unit/task-card.test.js`. The scaffold stub looks roughly like:

```js
import { mountComponent, waitFor, fireEvent } from '@testing/index.js';
import '../../src/components/ui/task-card.js';

describe('task-card', () => {
    it('mounts', () => {
        const { element, cleanup } = mountComponent('task-card');
        expect(element).toBeTruthy();
        cleanup();
    });
});
```

Two things to notice:

1. The component module is imported **before** `mountComponent` is called. That
   import triggers `customElements.define('task-card', TaskCard)` so the tag
   is registered in `happy-dom` before the element is created.

2. `cleanup()` is called at the end of every test. Without it, the element
   stays in `document.body` and can interfere with the next test.

---

## The three helpers

### `mountComponent(tag, attrs?)`

```js
const { element, cleanup } = mountComponent('task-card', {
    title: 'Write tests',
    done: '',          // attribute present = truthy boolean
});
```

- Creates `document.createElement(tag)`
- Sets each key as an attribute via `setAttribute`
- Appends the element to `document.body`
- Returns `{ element, cleanup }` — call `cleanup()` when the test is done

### `waitFor(predicate, timeoutMs?)`

```js
await waitFor(() => element.hasAttribute('done'));
```

Polls `predicate` every 10 ms until it returns truthy or the timeout (default
1000 ms) expires. Use it when a DOM change is async — for example, after
`fireEvent` triggers a state update that settles on the next microtask.

### `fireEvent(element, eventName, detail?)`

```js
fireEvent(element, 'task-card-toggle', { done: true });
```

Dispatches a `CustomEvent` with `bubbles: true` and `composed: true`. That
mirrors what `this.emit()` inside a `CoreComponent` produces, so you can test
round-trips: fire → wait → assert.

---

## Lab — Write a real `task-card` test

Replace the generated stub in `tests/unit/task-card.test.js` with:

```js
import { mountComponent, waitFor, fireEvent } from '@testing/index.js';
import '../../src/components/ui/task-card.js';

describe('task-card', () => {
    it('renders the title attribute', async () => {
        const { element, cleanup } = mountComponent('task-card', {
            title: 'Write tests',
        });

        // Shadow DOM holds the rendered output
        const shadow = element.shadowRoot;
        expect(shadow).not.toBeNull();

        // Wait for onMount to run and bind the state
        await waitFor(() => shadow.querySelector('[ref="titleEl"]')?.textContent?.trim() !== '');

        const titleEl = shadow.querySelector('[ref="titleEl"]');
        expect(titleEl.textContent.trim()).toBe('Write tests');

        cleanup();
    });

    it('emits task-card-toggle when Toggle is clicked', async () => {
        const { element, cleanup } = mountComponent('task-card', {
            title: 'Emit test',
        });

        let received = null;
        element.addEventListener('task-card-toggle', (e) => {
            received = e.detail;
        });

        const shadow = element.shadowRoot;
        await waitFor(() => shadow.querySelector('[ref="toggleBtn"]') !== null);

        // Simulate a click on the inner nc-button
        const btn = shadow.querySelector('[ref="toggleBtn"]');
        btn.click();

        await waitFor(() => received !== null);
        expect(received.done).toBe(true);

        cleanup();
    });

    it('cleanup removes element from DOM', () => {
        const { element, cleanup } = mountComponent('task-card');
        expect(document.body.contains(element)).toBe(true);
        cleanup();
        expect(document.body.contains(element)).toBe(false);
    });
});
```

Run the suite:

```bash
npm.cmd test -- --run
```

All three specs should be green.

### Piece by piece

| Part | Why |
|------|-----|
| Import the component module first | Registers the custom element before mount |
| `element.shadowRoot` | All `CoreComponent` templates live in shadow DOM |
| `waitFor(...)` before asserting | `onMount` and `bind` are synchronous but happen after `connectedCallback` resolves — a single `await` tick is usually enough; `waitFor` handles edge cases |
| `btn.click()` on the inner element | Fires a native `click` that `this.on(toggleBtn, 'click', fn)` inside the component handles |
| `element.addEventListener` before clicking | Registers the spy before the event fires |

---

## Viewing coverage

```bash
npm.cmd run test:coverage
```

Opens an HTML report in `coverage/`. Aim for the most critical paths (mount,
event round-trip, attribute updates) rather than 100% line coverage on
cosmetic CSS.

### Challenge — Silver

- [ ] Add a fourth test: set `done=""` as an attribute at mount time and assert
  that `titleEl` has the `.done` CSS class applied
- [ ] Run coverage and note which branches are uncovered

### Challenge — Gold

Without looking ahead:

- [ ] Write a test for `_handleAttributeUpdate`: mount the card, then call
  `element.setAttribute('title', 'Updated')` and use `waitFor` to assert
  `titleEl.textContent` reflects the new value
- [ ] Test that a second `mountComponent` call in the same file does not
  interfere with the first (confirm cleanup isolation)

---

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Forgetting to import the component module | `customElements.define` never runs; tag is unknown |
| Asserting without `await waitFor(...)` | `onMount` has not run yet; refs are null |
| Skipping `cleanup()` | Elements accumulate in `body`; later tests see stale DOM |
| Using `@testing/index` without the `.js` extension | ESM alias requires the full `@testing/index.js` |
| Looking inside `element.children` instead of `element.shadowRoot` | Shadow content lives in `shadowRoot` |
| Calling `fireEvent` before the element has mounted | Add `await waitFor(() => shadow.querySelector(ref) !== null)` first |

---

## Verify

- [ ] `npm.cmd test -- --run` exits 0
- [ ] At least one test mounts `task-card` and reads from `element.shadowRoot`
- [ ] At least one test fires an event and asserts `e.detail`
- [ ] Every test calls `cleanup()` before the function returns

---

## What's next

- [Chapter 19 — Dev tools](./19-dev-tools.md) — HMR, the DEV MODE overlay, and
  the experimental Component Builder

Writing tests now means you can refactor with confidence when later chapters
extend `task-card`. Keep the test file; add to it as you add features.

# Chapter 17 — Testing

Vitest + scaffold helpers under `@testing/index.js`.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm test` | Vitest |
| `npm run test:ui` | Vitest UI |
| `npm run test:coverage` | Coverage |

Environment: `happy-dom` (devDependency).

## Helpers (verified)

```js
import { mountComponent, waitFor, fireEvent } from '@testing/index.js';

const { element, cleanup } = mountComponent('task-card', {
    title: 'Write tests',
});

fireEvent(element, 'task-card-toggle', { done: true });
await waitFor(() => element.hasAttribute('done'));
cleanup();
```

- `mountComponent(tag, attrs?)` — creates element, sets attributes, appends to `document.body`
- `waitFor(predicate, timeoutMs?)` — polls until truthy (default 1000ms)
- `fireEvent(element, eventName, detail?)` — `CustomEvent` with `bubbles: true, composed: true`

## Generate with tests

```bash
npm.cmd run make:component -- task-card --defaults --with-tests
```

Creates a Vitest file that imports `@testing/index.js` **and** the component
module (`import '../task-card.js'`) so `customElements.define` runs before mount.

## Apply to Deskflow

> **Feature:** Cover `task-card` mount + toggle event.

1. Add or keep `--with-tests` output.
2. Assert initial render and that toggle emits / updates state as you designed.
3. Run `npm test -- --run`.

## Verify

- [ ] `npm test -- --run` exits 0
- [ ] Tests import `@testing/index.js`, not a nonexistent package path

## Next

[Chapter 18 — Dev tools](./18-dev-tools.md)

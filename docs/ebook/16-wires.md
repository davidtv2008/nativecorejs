# Chapter 16 — Wires

Optional declarative bindings. Controllers with `this.on` / `this.bind` remain
the primary Deskflow style from earlier chapters — wires are an alternative for
markup-driven panels.

## Import

```js
import {
    wireContents,
    wireInputs,
    wireAttributes,
    wireClasses,
    wireStyles,
    wireActions,
} from '@core-utils/wires.js';
```

## Attribute → behavior

| Utility | HTML | Direction |
|---------|------|-----------|
| `wireContents()` | `wire-content="key"` | state → `textContent` |
| `wireInputs()` | `wire-input="key"` | state ↔ input value |
| `wireAttributes()` | `wire-attribute="key:attr"` | state → attribute |
| `wireClasses()` | `wire-class="key:class"` | state → class toggle |
| `wireStyles()` | `wire-style="key:css-prop"` | state → style |
| `wireActions()` | `wire-action="name:eventType"` | returns `{ element, event }` |

Each utility defaults its scan root to `[data-view]` and registers cleanup with
`pageCleanupRegistry` (cleared on navigation).

## Minimal example

View:

```html
<div data-view="settings-wires">
    <p wire-content="status">Ready</p>
    <input wire-input="label" />
    <button wire-action="save:click">Save label</button>
</div>
```

Controller (CoreController style):

```js
import { wireContents, wireInputs, wireActions } from '@core-utils/wires.js';

onMount() {
    const contents = wireContents({ root: this.el });
    const inputs = wireInputs({ root: this.el });
    const { save } = wireActions({ root: this.el });

    this.on(save.element, save.event, () => {
        contents.status.value = `Saved: ${inputs.label.value}`;
    });
}
```

### Optional: `trackEvents`

`.nativecore/utils/events.ts` also exports `trackEvents()` for a functional
controller style:

```js
import { trackEvents } from '@core-utils/events.js';
import { wireActions } from '@core-utils/wires.js';

const events = trackEvents();
const { save } = wireActions();
events(save, () => { /* ... */ });
return events.cleanup; // also auto-registered with page cleanup
```

Prefer **one** style per controller — do not mix ad hoc listeners without cleanup.

## Apply to Deskflow

> **Feature:** One settings panel uses wires for a display-name field.

Keep the rest of Deskflow on `CoreController` refs. Use wires only where the
declarative attributes clarify the markup.

## Verify

- [ ] Editing the input updates bound state
- [ ] Navigate away and back — no duplicate listeners (cleanup ran)

## Next

[Chapter 17 — Testing](./17-testing.md)

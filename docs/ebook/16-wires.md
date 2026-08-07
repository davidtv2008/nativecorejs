# Chapter 16 — Wires (Legacy)

> **This chapter is a historical pointer only. Nothing here should be used in new code.**

## What "wires" were

Earlier versions of NativeCoreJS shipped helper functions in `@core-utils/wires.js`:

- `wireContents(el, signal)` — push signal text into an element
- `wireInputs(el, signal)` — two-way bind an `<input>` to a signal
- `wireActions(el, handlers)` — attach event handlers by convention

These helpers are **demoted**. They still exist in `@core-utils/wires.js` for backwards compatibility but are not part of the recommended teaching path and are not used in any chapter of this book.

## What to use instead

Every wire helper has a direct, clearer equivalent on `CoreController` and `CoreComponent`:

| Old wire | Current pattern |
|----------|----------------|
| `wireContents(el, signal)` | `this.bind(signal, el)` |
| `wireInputs(el, signal)` | `this.on(el, 'input', ...)` + `this.bind(signal, el)` |
| `wireActions(el, { click: fn })` | `this.on(el, 'click', fn)` |

The `ref` / `this.bind` / `this.on` trio is the idiomatic NativeCoreJS pattern. It is explicitly documented, auto-cleans on destroy, and makes data flow visible in the controller.

If you are reading old project code that uses `wireContents` or similar, migrate each call to its equivalent above. The migration is mechanical — one wire helper = one `this.bind` or `this.on` call.

## Where to learn the current pattern

- [Chapter 03 — Controllers](./03-controllers.md) — `this.on`, `this.bind`, `this.state`
- [Chapter 04 — Reactive State](./04-reactive-state.md) — signals, effects, computed
- [Chapter 05 — First Component](./05-first-component.md) — component version of the same APIs

---

## Next

[Chapter 17 — Testing](./17-testing.md)

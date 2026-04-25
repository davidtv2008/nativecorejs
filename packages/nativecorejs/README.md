# nativecorejs

This package now contains the extracted NativeCore runtime surface and the reusable built-in component library.

Current exports:

- router primitives
- component base class and custom element helper
- built-in framework component registry manifest
- extracted UI components from `nativecore/src/components/core`, including navigation, input, feedback, layout, picker, overlay, data-display, and utility `nc-*` elements
- multi-tag component modules such as accordion, bottom nav, form, stepper, and timeline
- state, computed, and effect primitives
- declarative wire utilities (`wireInputs`, `wireContents`, `wireAttributes`, `wireClasses`, `wireStyles`)
- lazy component registry
- cache-busting utilities
- controller event and subscription cleanup helpers
- component bind helpers (`bind`, `bindAttr`, `bindClass`, `bindStyle`, `wires`)
- base framework CSS at `nativecorejs/styles/base.css`

## Component event naming

All built-in `nc-*` components emit custom events using the `nc-{component}-{action}` convention:

```typescript
// overlay / navigation events
modal.addEventListener('nc-modal-open', () => { /* … */ });
drawer.addEventListener('nc-drawer-close', () => { /* … */ });
tabs.addEventListener('nc-tab-change', (e: CustomEvent<{ index: number }>) => { /* … */ });
table.addEventListener('nc-table-row-click', (e: CustomEvent<{ row: object; index: number }>) => { /* … */ });
```

Form-input elements (`nc-input`, `nc-select`, `nc-checkbox`, etc.) keep the standard `change` and `input` event names so they integrate naturally with `<nc-form>` and browser form patterns.

See the [full event reference in CHEATSHEET.md](../../docs/CHEATSHEET.md).

Not extracted yet:

- app-shell specific components: `app-header`, `app-sidebar`, and `app-footer`
- genericized services and build helpers
- app-shell specific CSS and demo layout components

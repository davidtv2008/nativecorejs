# Chapter 12 — Core Components

Practical tour of shipped `nc-*` components in the scaffold.

## Where they live

- Source: `src/components/core/nc-*.js|ts`
- Registration: `src/components/frameworkRegistry.*`
- Count: on the order of **~58** `nc-*` files in the create-nativecore template
  (the published `nativecorejs` package may include a few additional components)

## Categories (scaffold)

| Category | Examples |
|----------|----------|
| Inputs | `nc-input`, `nc-textarea`, `nc-select`, `nc-checkbox`, `nc-switch`, `nc-radio` |
| Buttons / actions | `nc-button`, `nc-copy-button` |
| Feedback | `nc-alert`, `nc-snackbar`, `nc-progress`, `nc-skeleton` |
| Overlays | `nc-modal`, `nc-drawer`, `nc-popover`, `nc-tooltip` |
| Navigation | `nc-tabs`, `nc-breadcrumb`, `nc-bottom-nav`, `nc-pagination` |
| Data | `nc-table`, `nc-timeline`, `nc-code` |
| Layout / media | `nc-card`, `nc-divider`, `nc-image`, `nc-avatar` |

Shell chrome (opt-in): `app-header`, `app-sidebar`, `app-footer`, `loading-spinner`.

## How to learn a component safely

1. Open `src/components/core/<tag>.js|ts`
2. Read `observedAttributes`, `attributeOptions`, events in `emit(...)`
3. Prefer attributes + events over guessing DOM properties

## Apply to Deskflow

> **Feature:** Polish tasks with badge + snackbar.

- Show open count in an `nc-badge` if it fits your markup
- Toast on create/delete via `nc-snackbar` **after confirming its API in source**

## Verify

- [ ] No unknown-element upgrades failing in console
- [ ] Components used are registered (frameworkRegistry / preload)

## Next

[Chapter 13 — Slots and composition](./13-slots-and-composition.md)

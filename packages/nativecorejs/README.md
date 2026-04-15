# nativecorejs

This package now contains the extracted NativeCore runtime surface and the reusable built-in component library.

Current exports:

- router primitives
- component base class and custom element helper
- built-in framework component registry manifest
- extracted UI components from `nativecore/src/components/core`, including navigation, input, feedback, layout, picker, overlay, data-display, and utility `nc-*` elements
- multi-tag component modules such as accordion, bottom nav, form, stepper, and timeline
- state, computed, and effect primitives
- lazy component registry
- cache-busting utilities
- controller event and subscription cleanup helpers
- base framework CSS at `nativecorejs/styles/base.css`

Not extracted yet:

- app-shell specific components: `app-header`, `app-sidebar`, and `app-footer`
- genericized services and build helpers
- app-shell specific CSS and demo layout components

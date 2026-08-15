# Chapter 24 — i18n Helper

Deskflow ships in one language. When you need a second, the framework provides
a reactive i18n primitive in `.nativecore/core/i18n.ts`. You supply the message
catalogs; the helper handles locale detection, persistence, interpolation, and
`Intl`-based formatting.

No locale files ship with the scaffold. This is intentional: your catalogs are
your data, not the framework's.

This chapter is optional for a single-language app. Read the mental model and
common mistakes regardless — the reactive `locale` state pattern applies broadly.

---

## Mental model (30 seconds)

```
I18n singleton constructed at import time
  → detects locale from localStorage → navigator.language → 'en'
  → wires persist (localStorage 'nc:locale') in the constructor

configureI18n({ messages, defaultLocale, fallbackLocale, persist })
  → merges catalogs via i18n.extend(messages)
  → applies fallbackLocale and persist on the existing singleton
  → defaultLocale is used when no stored nc:locale preference exists

t('tasks.title')           → looks up key in active locale → falls back to fallbackLocale
i18n.setLocale('es')       → updates the reactive i18n.locale State
i18n.locale is a State<string> from @core/state.js
  → watch it to re-render labels when the locale changes
```

The three exports you use day to day:

| Export | From | Purpose |
|--------|------|---------|
| `configureI18n` | `@core/i18n.js` | Seed messages at boot |
| `t` | `@core/i18n.js` | Translate a key |
| `i18n` | `@core/i18n.js` | Singleton instance — `setLocale`, `extend`, `formatDate`, … |

---

## Lab — Configure i18n at boot

Call `configureI18n` once, early in your app lifecycle. The right place is
`src/app.js` (or `app.ts`) before the router starts.

```js
import { configureI18n, i18n } from '@core/i18n.js';

// Seed catalogs — this is what configureI18n is for
configureI18n({
    defaultLocale: 'en',
    fallbackLocale: 'en',
    persist: true,
    messages: {
        en: {
            'app.title': 'Deskflow',
            'tasks.heading': 'Your Tasks',
            'tasks.open': '{count} open',
            'tasks.empty': 'Nothing here yet',
            'settings.heading': 'Settings',
            'settings.locale': 'Language',
        },
        es: {
            'app.title': 'Deskflow',
            'tasks.heading': 'Tus Tareas',
            'tasks.open': '{count} abiertas',
            'tasks.empty': 'Nada por ahora',
            'settings.heading': 'Configuracion',
            'settings.locale': 'Idioma',
        },
    },
});

// Switch locale explicitly when needed
// i18n.setLocale('es');
```

### What `configureI18n` does

Call it once at boot. Options apply to the existing singleton:

1. `messages` — merge catalogs via `i18n.extend`
2. `fallbackLocale` — used when a key is missing from the active locale
3. `persist` — enable or disable writing `nc:locale` to `localStorage`
4. `defaultLocale` — applied when no stored `nc:locale` exists; a stored
   preference wins

Use `i18n.setLocale(code)` for later locale switches.

---

## Translating strings with `t`

```js
import { t } from '@core/i18n.js';

t('tasks.heading');                // 'Your Tasks' (en) or 'Tus Tareas' (es)
t('tasks.open', { count: 3 });    // uses Intl.PluralRules — see below
t('missing.key');                 // returns 'missing.key' (key itself, not undefined)
```

Interpolation uses `{name}` placeholders only — no nested expressions.

When `params.count` is a finite number, `t` selects a plural form with
`Intl.PluralRules` for the active locale:

1. `key.{category}` — `one`, `other`, and any category the locale uses (`zero`, `few`, `many`, …)
2. `key.other`
3. `key`

```js
configureI18n({
    messages: {
        en: {
            'tasks.open.one': '{count} open task',
            'tasks.open.other': '{count} open tasks',
        },
        es: {
            'tasks.open.one': '{count} tarea abierta',
            'tasks.open.other': '{count} tareas abiertas',
        },
    },
});

t('tasks.open', { count: 1 }); // '1 open task'
t('tasks.open', { count: 3 }); // '3 open tasks'
```

If a key is missing in the active locale, `t` falls back to `fallbackLocale`.
If missing there too, the key string is returned as-is.

---

## Reacting to locale changes

`i18n.locale` is a reactive `State<string>` from `@core/state.js`. Use
`effect` or `this.effect` in a controller to re-translate strings when the
locale changes:

```js
import { i18n, t } from '@core/i18n.js';

// Inside a controller's onMount():
this.effect(() => {
    // runs once immediately, then again every time i18n.locale changes
    const _ = i18n.locale.value;   // subscribe by reading inside the effect
    this.headingEl.textContent = t('tasks.heading');
    this.countEl.textContent = t('tasks.open', { count: this.taskCount });
});
```

Or bind the locale state to a custom signal that drives a component:

```js
import { i18n, t } from '@core/i18n.js';
import { computed } from '@core/state.js';

const heading = computed(() => t('tasks.heading'));
this.bind(heading, this.headingEl);
```

`computed` re-evaluates whenever `i18n.locale` changes because `t` reads
`i18n.locale.value` internally.

---

## Switching locale

```js
import { i18n } from '@core/i18n.js';

// In a settings controller or a language-picker component:
i18n.setLocale('es');

// Read available locales:
i18n.listLocales();   // ['en', 'es']

// Check whether the active locale has a key:
i18n.has('tasks.heading');   // true
```

Persistence is wired in the `I18n` constructor (default on): `setLocale`
updates the reactive `locale` state, and the constructor's watcher writes
`nc:locale` to `localStorage` so a page reload preserves the choice.

---

## Extending catalogs at runtime

```js
import { i18n } from '@core/i18n.js';

// Merge new keys into existing locales:
i18n.extend({
    en: { 'profile.heading': 'Profile' },
    es: { 'profile.heading': 'Perfil' },
});
```

`extend` merges — it does not replace the existing messages for a locale.

---

## Namespace loading (lazy)

For large apps, keep per-feature catalogs out of the main bundle:

```js
import { i18n } from '@core/i18n.js';

// Register once (e.g. in the feature module or store):
i18n.registerNamespace('billing', async (locale) => {
    // Fetch or import the dict for this locale.
    // Return a flat dictionary; keys are stored as 'billing.<key>'
    const mod = await import(`./locales/billing.${locale}.js`);
    return mod.default;
});

// Load before rendering the billing route:
await i18n.loadNamespace('billing');

t('billing.invoice');    // 'Invoice' (en) after namespace is loaded
```

`loadNamespace` is idempotent: calling it twice for the same `(namespace,
locale)` pair resolves immediately on the second call.

---

## `Intl`-based formatting

The singleton exposes four formatting helpers that automatically use the active
locale:

```js
import { i18n } from '@core/i18n.js';

i18n.formatNumber(1_234_567.89);           // '1,234,567.89' (en) / '1.234.567,89' (es)
i18n.formatCurrency(19.99, 'USD');         // '$19.99' (en) / '19,99 US$' (es)
i18n.formatDate(new Date());              // '8/6/2026' (en) / '6/8/2026' (es)
i18n.formatRelative(Date.now() - 60_000); // '1 minute ago' (en) / 'hace 1 minuto' (es)
```

All four methods call `Intl.NumberFormat` / `Intl.DateTimeFormat` /
`Intl.RelativeTimeFormat` internally. Pass additional `Intl` options as the
last argument when needed:

```js
i18n.formatDate(new Date(), { dateStyle: 'long' });
i18n.formatNumber(0.75, { style: 'percent' });
```

---

## Lab — Settings language switcher

Add a basic locale toggle to the Deskflow settings page.

### In `settings.controller.js`

```js
import { CoreController } from '@core/controller.js';
import { i18n, t } from '@core/i18n.js';

export class SettingsController extends CoreController {
    onMount() {
        this.assertRefs('headingEl', 'enBtn', 'esBtn');

        // Reactive heading that updates when locale changes
        this.effect(() => {
            const _ = i18n.locale.value;
            this.headingEl.textContent = t('settings.heading');
        });

        this.on(this.enBtn, 'click', () => i18n.setLocale('en'));
        this.on(this.esBtn, 'click', () => i18n.setLocale('es'));
    }
}

export function settingsController(_params, _state, _loaderData, rootElement) {
    const ctrl = new SettingsController(rootElement);
    return () => ctrl.destroy();
}
```

### In `settings.html`

```html
<div data-view="settings">
    <h1 ref="headingEl"></h1>
    <button ref="enBtn">English</button>
    <button ref="esBtn">Español</button>
</div>
```

### Verify the feature

1. Open `/settings`
2. Click Español — the heading changes to "Configuracion"
3. Reload the page — the heading is still "Configuracion" (locale persisted via `nc:locale`)
4. Click English — heading reverts to "Settings"

---

## Challenge — Bronze

- [ ] `configureI18n` is called in `app.js` before the router starts
- [ ] `t('tasks.heading')` returns the correct string for both locales
- [ ] The settings page shows the correct heading after a locale switch

## Challenge — Silver

- [ ] Add a third locale (`fr`) with at least the `tasks.heading` key
- [ ] Show all three locale buttons in settings and verify switching between them
- [ ] Reload after switching to `fr` and confirm the locale persists

## Challenge — Gold

- [ ] Move the Spanish and French catalogs into separate lazy-loaded namespace
  files and use `i18n.registerNamespace` + `i18n.loadNamespace` to load them
  on demand when the user switches
- [ ] Write a Vitest test that calls `configureI18n`, calls `i18n.setLocale('es')`,
  and asserts `t('tasks.heading')` returns the Spanish string

---

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Shipping locale files inside `.nativecore/` | Put your catalogs in `src/locales/` or inline in `app.js`; never modify `.nativecore/` |
| Using `%s` or `{{name}}` interpolation | Only `{name}` is supported |
| Not calling `configureI18n` before the router renders | The first route may render with untranslated keys |
| Forgetting to read `i18n.locale.value` inside an `effect` | Reading the value is what subscribes; without it the effect does not re-run on locale change |
| Expecting ICU message syntax | Only `{name}` interpolation plus `key.one` / `key.other` when `count` is a number |

---

## Verify

- [ ] `configureI18n` is called once at boot
- [ ] Switching locale updates all bound strings without a page reload
- [ ] Reloading the page restores the last-chosen locale (constructor persist / `nc:locale`)

---

## What's next

- [Chapter 25 — Troubleshooting](./25-troubleshooting.md) — quick fixes for
  the most common NativeCoreJS problems

The i18n helper is the last feature chapter. Chapter 25 is a reference for
when things go wrong, and Chapter 26 is the full API quick reference.

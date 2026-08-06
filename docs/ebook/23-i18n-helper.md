# Chapter 23 — i18n Helper

Framework i18n primitives in `.nativecore/core/i18n.ts`. You supply catalogs.

## API (verified)

```js
import { configureI18n, i18n, t } from '@core/i18n.js';

configureI18n({
    defaultLocale: 'en',
    fallbackLocale: 'en',
    persist: true, // localStorage key `nc:locale`
    messages: {
        en: {
            'tasks.title': 'Tasks',
            'tasks.open': '{count} open',
        },
        es: {
            'tasks.title': 'Tareas',
            'tasks.open': '{count} abiertas',
        },
    },
});

t('tasks.title');
t('tasks.open', { count: 3 });

i18n.setLocale('es');
i18n.extend({ fr: { 'tasks.title': 'Tâches' } });

i18n.registerNamespace('settings', async (locale) => {
    // return flat dict; keys become settings.<key>
    return { heading: 'Settings' };
});
await i18n.loadNamespace('settings');

i18n.formatNumber(1234.5);
i18n.formatCurrency(19.99, 'USD');
i18n.formatDate(new Date());
i18n.formatRelative(Date.now() - 60_000);
```

`i18n.locale` is a reactive `State` from `@core/state.js` — watch it to re-render
labels when the locale changes.

## Accuracy notes

- No locale files ship with Deskflow by default — you add dictionaries.
- Interpolation uses `{name}` placeholders only.
- This is the scaffold/core helper. The npm package exports the same symbols
  from `nativecorejs` when you consume the package directly.

## Apply to Deskflow (optional)

> **Feature:** Settings can switch `en` / `es` for a few strings.

1. Call `configureI18n` once at boot (e.g. near `app.js` startup).
2. Bind headings via `t(...)` in controllers / effects when `i18n.locale` changes.
3. Persist is on by default (`nc:locale`).

## Verify

- [ ] Switching locale updates visible strings
- [ ] Reload keeps the chosen locale when `persist` is true

## Next

[Chapter 24 — Troubleshooting](./24-troubleshooting.md)

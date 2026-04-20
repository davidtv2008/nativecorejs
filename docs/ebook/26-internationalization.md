# Chapter 25 — Internationalization (i18n)

Internationalization is one of those topics that punishes wishful thinking. If you postpone it, layout, routing, formatting, and content design all become harder to untangle. NativeCoreJS does not force a heavy i18n abstraction on you — that is an advantage — but it means you must design your i18n approach deliberately so translation, formatting, and locale-aware behaviour are part of the architecture from the start.

---

## What a Practical i18n Architecture Needs

A production i18n system in a NativeCoreJS app typically involves:

- **A locale store** — shared reactive state that holds the active locale string
- **A message lookup function** — translates a key to a string in the active locale
- **Locale-aware formatters** — dates, numbers, currencies formatted with `Intl` APIs
- **A locale switcher** — a UI component or URL pattern that writes to the locale store
- **Controllers and components that react** — re-render or reformat when the locale changes

---

## Step 1 — The Locale Store

Create `src/stores/locale.store.ts`:

```typescript
import { useState } from '@core/state.js';

export type Locale = 'en-US' | 'es-MX' | 'fr-FR';

const STORAGE_KEY = 'app_locale';

function detectLocale(): Locale {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored) return stored;
    const browser = navigator.language.slice(0, 5) as Locale;
    const supported: Locale[] = ['en-US', 'es-MX', 'fr-FR'];
    return supported.includes(browser) ? browser : 'en-US';
}

export const locale = useState<Locale>(detectLocale());

// Persist changes
locale.watch(value => localStorage.setItem(STORAGE_KEY, value));
```

Every controller and component that needs locale-aware content imports `locale` from this store and subscribes with an `effect()`.

---

## Step 2 — The `t()` Message Lookup Helper

Create `src/utils/i18n.ts`:

```typescript
import { locale } from '@stores/locale.store.js';

type Messages = Partial<Record<import('@stores/locale.store.js').Locale, string>>;

/**
 * Returns the translation for the current locale, falling back to 'en-US'.
 */
export function t(messages: Messages): string {
    return messages[locale.value] ?? messages['en-US'] ?? '';
}

/**
 * Format a price using the current locale.
 */
export function formatPrice(amount: number, currency = 'USD'): string {
    return new Intl.NumberFormat(locale.value, {
        style:    'currency',
        currency,
    }).format(amount);
}

/**
 * Format a date using the current locale.
 */
export function formatLocalDate(
    date:   Date | string,
    style:  'short' | 'medium' | 'long' | 'full' = 'medium'
): string {
    const d = new Date(date);
    const options: Record<string, Intl.DateTimeFormatOptions> = {
        short:  { month: 'numeric', day: 'numeric', year: '2-digit' },
        medium: { month: 'short',   day: 'numeric', year: 'numeric' },
        long:   { month: 'long',    day: 'numeric', year: 'numeric' },
        full:   { weekday: 'long',  month: 'long',  day: 'numeric', year: 'numeric' },
    };
    return new Intl.DateTimeFormat(locale.value, options[style]).format(d);
}

/**
 * Format a relative time string ("2 hours ago") in the current locale.
 */
export function formatRelative(date: Date | string): string {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    const rtf = new Intl.RelativeTimeFormat(locale.value, { numeric: 'auto' });

    if (Math.abs(seconds) < 60)         return rtf.format(-seconds, 'second');
    if (Math.abs(seconds) < 3600)       return rtf.format(-Math.round(seconds / 60), 'minute');
    if (Math.abs(seconds) < 86400)      return rtf.format(-Math.round(seconds / 3600), 'hour');
    if (Math.abs(seconds) < 2592000)    return rtf.format(-Math.round(seconds / 86400), 'day');
    return rtf.format(-Math.round(seconds / 2592000), 'month');
}
```

The `Intl` APIs in `formatPrice`, `formatLocalDate`, and `formatRelative` already handle locale-specific formatting — all you need to do is pass the correct locale string.

---

## Step 3 — Reacting to Locale Changes in a Controller

```typescript
import { dom }         from '@core-utils/dom.js';
import { trackEvents } from '@core-utils/events.js';
import { effect }      from '@core/state.js';
import { locale }      from '@stores/locale.store.js';
import { t, formatPrice } from '@utils/i18n.js';

export async function pricingController(): Promise<() => void> {
    const events    = trackEvents();
    const disposers: Array<() => void> = [];

    const scope       = dom.data('pricing');
    const titleEl     = scope.hook('title');
    const priceEl     = scope.hook('price');
    const switcherEl  = scope.$<HTMLSelectElement>('#locale-switcher');

    // Re-render whenever locale changes
    disposers.push(
        effect(() => {
            if (titleEl) titleEl.textContent = t({
                'en-US': 'Pricing',
                'es-MX': 'Precios',
                'fr-FR': 'Tarifs',
            });
            if (priceEl) priceEl.textContent = formatPrice(29);
        })
    );

    events.on(switcherEl, 'change', (e: Event) => {
        locale.value = (e.target as HTMLSelectElement).value as any;
    });

    return () => {
        disposers.forEach(d => d());
        events.cleanup();
    };
}
```

The `effect()` runs immediately (populating the initial content) and re-runs every time `locale.value` changes — so switching the locale switcher instantly updates every translated string and formatted value on the page.

---

## Step 4 — Reacting to Locale Changes in a Component

```typescript
import { Component, defineComponent } from '@core/component.js';
import { t, formatPrice } from '@utils/i18n.js';
import { locale }         from '@stores/locale.store.js';

export class PricingCard extends Component {
    static useShadowDOM = true;

    private _unwatch?: () => void;

    template(): string {
        return `
            <div class="card">
                <h2 id="plan-title"></h2>
                <p id="plan-price"></p>
            </div>
        `;
    }

    onMount(): void {
        const render = () => {
            const titleEl = this.$('#plan-title');
            const priceEl = this.$('#plan-price');
            if (titleEl) titleEl.textContent = t({ 'en-US': 'Pro Plan', 'es-MX': 'Plan Pro', 'fr-FR': 'Plan Pro' });
            if (priceEl) priceEl.textContent  = formatPrice(Number(this.getAttribute('amount') ?? 29));
        };

        render(); // initial render
        this._unwatch = locale.watch(() => render()); // re-render on locale change
    }

    onUnmount(): void {
        this._unwatch?.();
    }
}

defineComponent('pricing-card', PricingCard);
```

---

## What to Keep Framework-Agnostic

Do not bury your translation logic inside a single component. A production i18n system also needs:

| Concern | Approach |
|---|---|
| Pluralization | `Intl.PluralRules` or a library like `intl-messageformat` |
| Interpolation | Template literals: `` t({...}).replace('{name}', user.name) `` |
| Fallback locales | Default to `'en-US'` in `t()` when no translation exists |
| Locale-aware routing | Add `?lang=es-MX` to the URL, or use `/:locale/...` route prefixes |
| Right-to-left layouts | CSS logical properties (`margin-inline-start`) instead of `margin-left` |

---

## Locale Switcher HTML

```html
<select id="locale-switcher" aria-label="Select language">
    <option value="en-US">English</option>
    <option value="es-MX">Español</option>
    <option value="fr-FR">Français</option>
</select>
```

Sync the selected option with the stored locale on controller mount:

```typescript
if (switcherEl) switcherEl.value = locale.value;
```

---

## Apply This Chapter to Project 3 — DevHub

> **Project:** DevHub — Developer Portfolio & Live Feed  
> **Feature:** Add `en-US`, `es-MX`, and `fr-FR` locale support with a locale switcher.

Create `src/stores/locale.store.ts` and `src/utils/i18n.ts` with translation keys for all DevHub UI strings. Add a locale switcher `<nc-select>` to the DevHub header. Format post timestamps with `Intl.DateTimeFormat` and view counts with `Intl.NumberFormat`. Verify that switching locale updates all displayed strings without a page reload.

### Done Criteria

- [ ] `src/stores/locale.store.ts` persists the active locale to `localStorage`.
- [ ] `t('home.hero.title')` returns the correct string in all three locales.
- [ ] Dates and numbers use `Intl.DateTimeFormat` and `Intl.NumberFormat` with the active locale.
- [ ] Switching locale in the header updates all translated strings reactively without a page reload.

---

**Back:** [Chapter 25 — Real-Time Features and WebSockets](./25-real-time-and-websockets.md)  
**Next:** [Chapter 27 — Mobile Patterns](./27-mobile-patterns.md)

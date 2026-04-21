/**
 * Lightweight reactive i18n primitives for NativeCoreJS.
 *
 * - A reactive `locale` state (auto-detected from `navigator.language`,
 *   persisted to `localStorage`).
 * - `defineMessages(...)` helpers for type-safe message dictionaries.
 * - `t(key, params)` lookup with `{name}` interpolation and a chosen
 *   fallback locale.
 * - Namespace loading: `registerNamespace()` for eager bundles,
 *   `loadNamespace()` for lazy, on-demand async loading.
 * - `formatNumber`, `formatCurrency`, `formatDate`, `formatRelative`
 *   wrappers around the `Intl` APIs that automatically pick up the
 *   current locale.
 */
import { useState, type State } from './state.js';

const STORAGE_KEY = 'nc:locale';

export type LocaleCode = string;
export type MessageDictionary = Record<string, string>;
export type MessagesByLocale = Record<LocaleCode, MessageDictionary>;
export type NamespaceLoader = (locale: LocaleCode) => Promise<MessageDictionary>;

export interface I18nOptions {
    /** Translation dictionaries keyed by locale code. */
    messages?: MessagesByLocale;
    /** Default locale when no preference is found. Defaults to `'en'`. */
    defaultLocale?: LocaleCode;
    /** Fallback when a key is missing from the active locale. Defaults to `defaultLocale`. */
    fallbackLocale?: LocaleCode;
    /** Persist the active locale to `localStorage`. Defaults to `true`. */
    persist?: boolean;
}

export class I18n {
    public readonly locale: State<LocaleCode>;
    private messages: MessagesByLocale;
    private fallbackLocale: LocaleCode;
    private namespaceLoaders: Map<string, NamespaceLoader> = new Map();
    private loadedNamespaces: Map<string, Set<LocaleCode>> = new Map();
    private inflightNamespaces: Map<string, Promise<void>> = new Map();

    constructor(options: I18nOptions = {}) {
        const defaultLocale = options.defaultLocale ?? 'en';
        this.fallbackLocale = options.fallbackLocale ?? defaultLocale;
        this.messages = options.messages ?? {};

        const initial = this.detectLocale(defaultLocale, options.persist ?? true);
        this.locale = useState<LocaleCode>(initial);

        if ((options.persist ?? true) && typeof localStorage !== 'undefined') {
            this.locale.watch(value => {
                try { localStorage.setItem(STORAGE_KEY, value); } catch { /* quota / private mode */ }
            });
        }
    }

    private detectLocale(defaultLocale: LocaleCode, persist: boolean): LocaleCode {
        if (persist && typeof localStorage !== 'undefined') {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) return stored;
            } catch { /* ignore */ }
        }
        if (typeof navigator !== 'undefined' && typeof navigator.language === 'string') {
            const match = this.findClosestLocale(navigator.language);
            if (match) return match;
        }
        return defaultLocale;
    }

    private findClosestLocale(candidate: LocaleCode): LocaleCode | null {
        const known = Object.keys(this.messages);
        if (known.length === 0) return null;
        if (known.includes(candidate)) return candidate;
        const short = candidate.split('-')[0];
        const match = known.find(k => k === short || k.split('-')[0] === short);
        return match ?? null;
    }

    /** Register or merge messages for one or more locales. */
    extend(messages: MessagesByLocale): void {
        for (const [locale, dict] of Object.entries(messages)) {
            this.messages[locale] = { ...(this.messages[locale] ?? {}), ...dict };
        }
    }

    /**
     * Register a loader for a namespace. The loader is invoked lazily by
     * {@link loadNamespace} and is expected to return a flat dictionary of
     * keys *without* the namespace prefix; the returned keys are folded
     * into the active dictionary as `"<namespace>.<key>"` so they don't
     * collide with other namespaces.
     */
    registerNamespace(namespace: string, loader: NamespaceLoader): void {
        this.namespaceLoaders.set(namespace, loader);
    }

    /**
     * Loads a namespace for the given locale (defaulting to the active
     * locale). Subsequent calls for the same `(namespace, locale)` pair
     * resolve immediately.
     */
    async loadNamespace(namespace: string, locale: LocaleCode = this.locale.value): Promise<void> {
        const loaded = this.loadedNamespaces.get(namespace);
        if (loaded?.has(locale)) return;

        const inflightKey = `${namespace}::${locale}`;
        const pending = this.inflightNamespaces.get(inflightKey);
        if (pending) return pending;

        const loader = this.namespaceLoaders.get(namespace);
        if (!loader) {
            throw new Error(`[i18n] No loader registered for namespace "${namespace}"`);
        }

        const task = (async () => {
            try {
                const dict = await loader(locale);
                const prefixed: MessageDictionary = {};
                for (const [key, value] of Object.entries(dict)) {
                    prefixed[`${namespace}.${key}`] = value;
                }
                this.messages[locale] = { ...(this.messages[locale] ?? {}), ...prefixed };
                const set = this.loadedNamespaces.get(namespace) ?? new Set<LocaleCode>();
                set.add(locale);
                this.loadedNamespaces.set(namespace, set);
            } finally {
                this.inflightNamespaces.delete(inflightKey);
            }
        })();

        this.inflightNamespaces.set(inflightKey, task);
        return task;
    }

    /** True when the namespace is loaded for the given (or active) locale. */
    isNamespaceLoaded(namespace: string, locale: LocaleCode = this.locale.value): boolean {
        return Boolean(this.loadedNamespaces.get(namespace)?.has(locale));
    }

    setLocale(locale: LocaleCode): void {
        this.locale.value = locale;
    }

    listLocales(): LocaleCode[] {
        return Object.keys(this.messages);
    }

    /** Translate a key, interpolating `{name}` placeholders from `params`. */
    t(key: string, params: Record<string, string | number> = {}): string {
        const active = this.locale.value;
        const message = this.messages[active]?.[key]
            ?? this.messages[this.fallbackLocale]?.[key]
            ?? key;
        return interpolate(message, params);
    }

    /** Returns true if the key is defined in the active locale. */
    has(key: string): boolean {
        return Boolean(this.messages[this.locale.value]?.[key]);
    }

    formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
        return new Intl.NumberFormat(this.locale.value, options).format(value);
    }

    formatCurrency(value: number, currency: string, options: Intl.NumberFormatOptions = {}): string {
        return new Intl.NumberFormat(this.locale.value, { style: 'currency', currency, ...options }).format(value);
    }

    formatDate(value: Date | string | number, options?: Intl.DateTimeFormatOptions): string {
        const date = value instanceof Date ? value : new Date(value);
        return new Intl.DateTimeFormat(this.locale.value, options).format(date);
    }

    formatRelative(value: Date | string | number, now: Date = new Date()): string {
        const target = value instanceof Date ? value : new Date(value);
        const diffMs = target.getTime() - now.getTime();
        const seconds = Math.round(diffMs / 1000);
        const rtf = new Intl.RelativeTimeFormat(this.locale.value, { numeric: 'auto' });

        const absSec = Math.abs(seconds);
        if (absSec < 60) return rtf.format(seconds, 'second');
        if (absSec < 3600) return rtf.format(Math.round(seconds / 60), 'minute');
        if (absSec < 86_400) return rtf.format(Math.round(seconds / 3600), 'hour');
        if (absSec < 2_592_000) return rtf.format(Math.round(seconds / 86_400), 'day');
        if (absSec < 31_536_000) return rtf.format(Math.round(seconds / 2_592_000), 'month');
        return rtf.format(Math.round(seconds / 31_536_000), 'year');
    }
}

function interpolate(message: string, params: Record<string, string | number>): string {
    return message.replace(/\{(\w+)\}/g, (full, name: string) =>
        Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : full
    );
}

/** Singleton i18n instance. Use `configureI18n()` to seed messages. */
export const i18n = new I18n();

/** Convenience binding to the singleton; always reads the latest locale. */
export const t = (key: string, params?: Record<string, string | number>): string => i18n.t(key, params);

export function configureI18n(options: I18nOptions): void {
    if (options.messages) i18n.extend(options.messages);
    if (options.defaultLocale && !i18n.locale.value) i18n.setLocale(options.defaultLocale);
}

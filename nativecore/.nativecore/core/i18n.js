import { useState } from "./state.js";
const STORAGE_KEY = "nc:locale";
class I18n {
  locale;
  messages;
  fallbackLocale;
  namespaceLoaders = /* @__PURE__ */ new Map();
  loadedNamespaces = /* @__PURE__ */ new Map();
  inflightNamespaces = /* @__PURE__ */ new Map();
  constructor(options = {}) {
    const defaultLocale = options.defaultLocale ?? "en";
    this.fallbackLocale = options.fallbackLocale ?? defaultLocale;
    this.messages = options.messages ?? {};
    const initial = this.detectLocale(defaultLocale, options.persist ?? true);
    this.locale = useState(initial);
    if ((options.persist ?? true) && typeof localStorage !== "undefined") {
      this.locale.watch((value) => {
        try {
          localStorage.setItem(STORAGE_KEY, value);
        } catch {
        }
      });
    }
  }
  detectLocale(defaultLocale, persist) {
    if (persist && typeof localStorage !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return stored;
      } catch {
      }
    }
    if (typeof navigator !== "undefined" && typeof navigator.language === "string") {
      const match = this.findClosestLocale(navigator.language);
      if (match) return match;
    }
    return defaultLocale;
  }
  findClosestLocale(candidate) {
    const known = Object.keys(this.messages);
    if (known.length === 0) return null;
    if (known.includes(candidate)) return candidate;
    const short = candidate.split("-")[0];
    const match = known.find((k) => k === short || k.split("-")[0] === short);
    return match ?? null;
  }
  /** Register or merge messages for one or more locales. */
  extend(messages) {
    for (const [locale, dict] of Object.entries(messages)) {
      this.messages[locale] = { ...this.messages[locale] ?? {}, ...dict };
    }
  }
  /**
   * Register a loader for a namespace. The loader is invoked lazily by
   * {@link loadNamespace} and is expected to return a flat dictionary of
   * keys *without* the namespace prefix; the returned keys are folded
   * into the active dictionary as `"<namespace>.<key>"` so they don't
   * collide with other namespaces.
   */
  registerNamespace(namespace, loader) {
    this.namespaceLoaders.set(namespace, loader);
  }
  /**
   * Loads a namespace for the given locale (defaulting to the active
   * locale). Subsequent calls for the same `(namespace, locale)` pair
   * resolve immediately.
   */
  async loadNamespace(namespace, locale = this.locale.value) {
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
        const prefixed = {};
        for (const [key, value] of Object.entries(dict)) {
          prefixed[`${namespace}.${key}`] = value;
        }
        this.messages[locale] = { ...this.messages[locale] ?? {}, ...prefixed };
        const set = this.loadedNamespaces.get(namespace) ?? /* @__PURE__ */ new Set();
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
  isNamespaceLoaded(namespace, locale = this.locale.value) {
    return Boolean(this.loadedNamespaces.get(namespace)?.has(locale));
  }
  setLocale(locale) {
    this.locale.value = locale;
  }
  listLocales() {
    return Object.keys(this.messages);
  }
  /** Translate a key, interpolating `{name}` placeholders from `params`. */
  t(key, params = {}) {
    const active = this.locale.value;
    const message = this.messages[active]?.[key] ?? this.messages[this.fallbackLocale]?.[key] ?? key;
    return interpolate(message, params);
  }
  /** Returns true if the key is defined in the active locale. */
  has(key) {
    return Boolean(this.messages[this.locale.value]?.[key]);
  }
  formatNumber(value, options) {
    return new Intl.NumberFormat(this.locale.value, options).format(value);
  }
  formatCurrency(value, currency, options = {}) {
    return new Intl.NumberFormat(this.locale.value, { style: "currency", currency, ...options }).format(value);
  }
  formatDate(value, options) {
    const date = value instanceof Date ? value : new Date(value);
    return new Intl.DateTimeFormat(this.locale.value, options).format(date);
  }
  formatRelative(value, now = /* @__PURE__ */ new Date()) {
    const target = value instanceof Date ? value : new Date(value);
    const diffMs = target.getTime() - now.getTime();
    const seconds = Math.round(diffMs / 1e3);
    const rtf = new Intl.RelativeTimeFormat(this.locale.value, { numeric: "auto" });
    const absSec = Math.abs(seconds);
    if (absSec < 60) return rtf.format(seconds, "second");
    if (absSec < 3600) return rtf.format(Math.round(seconds / 60), "minute");
    if (absSec < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
    if (absSec < 2592e3) return rtf.format(Math.round(seconds / 86400), "day");
    if (absSec < 31536e3) return rtf.format(Math.round(seconds / 2592e3), "month");
    return rtf.format(Math.round(seconds / 31536e3), "year");
  }
}
function interpolate(message, params) {
  return message.replace(
    /\{(\w+)\}/g,
    (full, name) => Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : full
  );
}
const i18n = new I18n();
const t = (key, params) => i18n.t(key, params);
function configureI18n(options) {
  if (options.messages) i18n.extend(options.messages);
  if (options.defaultLocale && !i18n.locale.value) i18n.setLocale(options.defaultLocale);
}
export {
  I18n,
  configureI18n,
  i18n,
  t
};

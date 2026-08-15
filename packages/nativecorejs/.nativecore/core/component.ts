import { computed, effect, useState, type ComputedState, type State } from './state.js';

export type { State };

export abstract class CoreComponent extends HTMLElement {
    static useShadowDOM: boolean = true;

    protected _unsubs = new Set<() => void>();
    private _hasSetup = false;
    private static _templateCache = new Map<string, HTMLTemplateElement>();

    [key: string]: any;

    constructor() {
        super();
        if ((this.constructor as typeof CoreComponent).useShadowDOM) {
            this.attachShadow({ mode: 'open' });
        }
    }

    private _setup(): void {
        if (this._hasSetup) return;
        this._hasSetup = true;

        const tag = this.tagName.toLowerCase();
        const styles = (this.constructor as any).styles;
        
        // --- FIXED STYLE LOGIC ---
        if (styles && this.shadowRoot) {
            // If it's a string (or our css helper), we check for adoptedStyleSheets support
            if (this.shadowRoot.adoptedStyleSheets && styles instanceof CSSStyleSheet) {
                this.shadowRoot.adoptedStyleSheets = [styles];
            } else {
                // Fallback: If it's just a string or support is missing, use a style tag
                const styleEl = document.createElement('style');
                // Extract the CSS text from the object or string
                styleEl.textContent = typeof styles === 'string' ? styles : styles.cssText || '';
                this.shadowRoot.appendChild(styleEl);
            }
        }
        // --- END STYLE LOGIC ---

        // Handle Template
        const root = this.shadowRoot ?? this;
        let tmpl = CoreComponent._templateCache.get(tag);
        if (!tmpl) {
            tmpl = document.createElement('template');
            tmpl.innerHTML = this.template();
            CoreComponent._templateCache.set(tag, tmpl);
        }
        root.appendChild(tmpl.content.cloneNode(true));

        this._bootstrap();

        if (this.onMount) this.onMount();
        if (this.events) this.events();
    }

    // --- REACTIVITY ---
    protected state<T>(val: T): State<T> {
        return useState(val);
    }

    /**
     * SolidJS-style signal — [getter, setter] tuple.
     *   const [count, setCount] = this.signal(0);
     *   count()           // read (tracks dependencies)
     *   setCount(1)       // write
     *   setCount(n => n + 1) // updater fn
     */
    protected signal<T>(val: T): [() => T, (newVal: T | ((prev: T) => T)) => void] {
        const s = this.state(val);
        return [
            () => s.value,
            (newVal) => {
                s.value = typeof newVal === 'function'
                    ? (newVal as (prev: T) => T)(s.value)
                    : newVal;
            }
        ];
    }

    /**
     * Derived read-only state — re-computes whenever any state read inside fn() changes.
     * React: useMemo  |  Solid: createMemo
     *   const double = this.compute(() => this.count.value * 2);
     *   double.value  // always fresh
     */
    protected compute<T>(fn: () => T): ComputedState<T> {
        const derived = computed(fn, { pageCleanup: false });
        this._unsubs.add(() => derived.dispose());
        return derived;
    }

    /** Alias for compute() — familiar to React developers (useMemo). */
    protected memo<T>(fn: () => T): ComputedState<T> {
        return this.compute(fn);
    }

    /**
     * Reactive side-effect — runs fn() immediately and re-runs whenever any
     * state read inside it changes. Auto-disposed on component disconnect.
     * React: useEffect  |  Solid: createEffect
     *   this.effect(() => { document.title = this.title.value; });
     */
    protected effect(fn: () => void | (() => void)): void {
        this._unsubs.add(effect(fn, { pageCleanup: false }));
    }

    // --- DOM HELPERS ---

    /** querySelector on shadowRoot (or host for light-DOM components). */
    protected $<T extends Element = HTMLElement>(selector: string): T | null {
        return (this.shadowRoot ?? this).querySelector<T>(selector);
    }

    /** querySelectorAll on shadowRoot (or host for light-DOM components). */
    protected $$<T extends Element = HTMLElement>(selector: string): NodeListOf<T> {
        return (this.shadowRoot ?? this).querySelectorAll<T>(selector);
    }

    protected bind(source: State<any> | ComputedState<any> | (() => any), el: Element, binding?: string): void {
        this.effect(() => {
            const v = typeof source === 'function' ? source() : source.value;

            if (!el || typeof (el as any).setAttribute !== 'function') {
                throw new Error(
                    `[${this.tagName?.toLowerCase?.() || 'component'}] bind() target is invalid. ` +
                    `Pass a ref element (this.fooEl), not a string prop name.`
                );
            }

            if (!binding) {
                el.textContent = String(v);
                return;
            }

            if (binding.startsWith('?')) {
                const attr = binding.slice(1);
                if (v) el.setAttribute(attr, '');
                else el.removeAttribute(attr);
                return;
            }

            if (binding.startsWith('.')) {
                const classes = binding.slice(1).split(/\s+\.?/).filter(Boolean);
                if (v) el.classList.add(...classes);
                else el.classList.remove(...classes);
                return;
            }

            if (binding === 'innerHTML') {
                (el as HTMLElement).innerHTML = String(v);
                return;
            }

            el.setAttribute(binding, String(v));
        });
    }

    // --- DOM HELPERS ---
    protected emit(name: string, detail: any = {}, options: EventInit = {}): boolean {
        const event = new CustomEvent(name, {
            detail,
            bubbles: true,
            composed: true,
            cancelable: true,
            ...options,
        });
        return this.dispatchEvent(event);
    }

    /** getAttribute shorthand; optional fallback when attribute is missing. */
    protected attr(name: string): string | null;
    protected attr(name: string, fallback: string): string;
    protected attr(name: string, fallback?: string): string | null {
        const value = this.getAttribute(name);
        if (fallback !== undefined) return value ?? fallback;
        return value;
    }

    /**
     * No-op kept for components that still call this.render() during migration.
     * Prefer refs + bind / _handleAttributeUpdate for updates.
     */
    protected render(): void {
        // no-op
    }

    /** Bind a listener on `this` (legacy 2-arg form). */
    protected on(type: string, handler: (ev: any) => void, options?: AddEventListenerOptions): void;
    /** Bind a listener on an explicit target (preferred). */
    protected on(
        target: EventTarget,
        type: string,
        handler: (ev: any) => void,
        options?: AddEventListenerOptions
    ): void;
    protected on(
        targetOrType: EventTarget | string,
        typeOrHandler: string | ((ev: any) => void),
        handlerOrOptions?: ((ev: any) => void) | AddEventListenerOptions,
        options?: AddEventListenerOptions
    ): void {
        if (typeof targetOrType === 'string') {
            const type = targetOrType;
            const handler = typeOrHandler as (ev: any) => void;
            const opts = handlerOrOptions as AddEventListenerOptions | undefined;
            this.addEventListener(type, handler, opts);
            this._unsubs.add(() => this.removeEventListener(type, handler, opts));
            return;
        }

        const target = targetOrType;
        const type = typeOrHandler as string;
        const handler = handlerOrOptions as (ev: any) => void;
        target.addEventListener(type, handler, options);
        this._unsubs.add(() => target.removeEventListener(type, handler, options));
    }

    private _bootstrap(): void {
        const tag = this.tagName.toLowerCase();
        const root = this.shadowRoot ?? this;

        root.querySelectorAll('[ref]').forEach(el => {
            const refName = (el as HTMLElement).getAttribute('ref')!;
            if (Object.prototype.hasOwnProperty.call(this, refName)) {
                const existing = (this as Record<string, unknown>)[refName];
                // Typed class fields (`closeBtn;`) initialize as own props with
                // value `undefined`. That is the normal ref pattern — only warn
                // when overwriting a real value (State, method, etc.).
                if (existing != null && !(existing instanceof Node)) {
                    console.warn(
                        `[${tag}] ref="${refName}" collides with an existing instance property. ` +
                        `Rename either the ref or the field to avoid overwriting reactive state.`
                    );
                }
            }
            this[refName] = el;
        });
    }

    protected get root(): ShadowRoot | this {
        return this.shadowRoot ?? this;
    }

    connectedCallback(): void {
        this._setup();
    }

    disconnectedCallback(): void {
        this._unsubs.forEach(un => un());
        if (this.onUnmount) this.onUnmount();
    }

    attributeChangedCallback(name: string, old: string, next: string): void {
        // Only run after setup has completed and the value actually changed
        if (!this._hasSetup || old === next) return;
        if (this._handleAttributeUpdate) this._handleAttributeUpdate(name, next);
    }

    abstract template(): string;
    protected _handleAttributeUpdate?(name: string, val: string | null): void;
    protected onMount?(): void;
    protected onUnmount?(): void;
    protected events?(): void;
}

/** Register a custom element once (no-op if the tag is already defined). */
export function defineComponent(tag: string, cls: CustomElementConstructor): void {
    if (!customElements.get(tag)) customElements.define(tag, cls);
}

export type ComponentConstructor = CustomElementConstructor;
export type ComponentState<T = unknown> = State<T>;

/** @deprecated Use CoreComponent — kept for older generated components. */
export { CoreComponent as Component };
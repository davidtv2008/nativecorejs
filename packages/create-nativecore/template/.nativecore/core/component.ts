/* eslint-disable @typescript-eslint/no-this-alias */
// Define locally to avoid extra file imports
export interface State<T> {
    value: T;
}

export abstract class CoreComponent extends HTMLElement {
    static useShadowDOM: boolean = true;

    protected _unsubs = new Set<() => void>();
    private _activeEffect: (() => void) | null = null;
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
        let _val = val;
        const subs = new Set<() => void>();
        
        // Capture the component instance in a closure-friendly way 
        // that won't trigger the "no-this-alias" warning
        const component = this; 

        return {
            get value(): T {
                if (component._activeEffect) {
                    subs.add(component._activeEffect);
                }
                return _val;
            },
            set value(newVal: T) {
                if (_val === newVal) return;
                _val = newVal;
                subs.forEach(fn => fn());
            }
        };
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
    protected compute<T>(fn: () => T): State<T> {
        const s = this.state<T>(undefined as any);
        let disposed = false;
        const runner = () => {
            if (disposed) return;
            this._activeEffect = runner;
            try { s.value = fn(); }
            finally { this._activeEffect = null; }
        };
        runner();
        this._unsubs.add(() => { disposed = true; });
        return s;
    }

    /** Alias for compute() — familiar to React developers (useMemo). */
    protected memo<T>(fn: () => T): State<T> {
        return this.compute(fn);
    }

    /**
     * Reactive side-effect — runs fn() immediately and re-runs whenever any
     * state read inside it changes. Auto-disposed on component disconnect.
     * React: useEffect  |  Solid: createEffect
     *   this.effect(() => { document.title = this.title.value; });
     */
    protected effect(fn: () => void): void {
        let disposed = false;
        const runner = () => {
            if (disposed) return;
            this._activeEffect = runner;
            try { fn(); }
            finally { this._activeEffect = null; }
        };
        runner();
        this._unsubs.add(() => { disposed = true; });
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

    protected bind(source: State<any>, elOrProp: Element | string, binding?: string): void {
        const runner = () => {
            this._activeEffect = runner;
            const v = source.value;
            this._activeEffect = null;

            // Overload 1: bind(state, 'propName') — old wire-target form, kept for compat
            if (typeof elOrProp === 'string') {
                this[elOrProp] = v;
                return;
            }

            const el = elOrProp;

            // Overload 2: bind(state, el) — no binding arg → textContent
            if (!binding) {
                el.textContent = String(v);
                return;
            }

            // Overload 3: bind(state, el, '?disabled') — boolean attribute
            if (binding.startsWith('?')) {
                const attr = binding.slice(1);
                if (v) el.setAttribute(attr, '');
                else el.removeAttribute(attr);
                return;
            }

            // Overload 4: bind(state, el, '.active .bold') — class toggle(s)
            if (binding.startsWith('.')) {
                const classes = binding.slice(1).split(/\s+\.?/).filter(Boolean);
                if (v) el.classList.add(...classes);
                else el.classList.remove(...classes);
                return;
            }

            // Overload 5: bind(state, el, 'innerHTML') — raw HTML
            if (binding === 'innerHTML') {
                (el as HTMLElement).innerHTML = String(v);
                return;
            }

            // Overload 6: bind(state, el, 'href') — string attribute
            el.setAttribute(binding, String(v));
        };

        runner();
    }

    // --- DOM HELPERS ---
    protected emit(name: string, detail: any = {}): boolean {
        const event = new CustomEvent(name, { 
            detail, bubbles: true, composed: true, cancelable: true 
        });
        return this.dispatchEvent(event);
    }

    protected on(target: EventTarget, type: string, handler: (ev: any) => void): void {
        target.addEventListener(type, handler);
        this._unsubs.add(() => target.removeEventListener(type, handler));
    }

    private _bootstrap(): void {
        const tag = this.tagName.toLowerCase();
        const root = this.shadowRoot ?? this;

        root.querySelectorAll('[ref]').forEach(el => {
            const refName = (el as HTMLElement).getAttribute('ref')!;
            if (Object.prototype.hasOwnProperty.call(this, refName)) {
                console.warn(
                    `[${tag}] ref="${refName}" collides with an existing instance property. ` +
                    `Rename either the ref or the field to avoid overwriting reactive state.`
                );
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

// ---------------------------------------------------------------------------
// Backward-compat shim — keeps un-migrated components compiling and running
// while they are converted to CoreComponent one by one.
// ---------------------------------------------------------------------------

/** @deprecated Extend CoreComponent directly. */
export abstract class Component extends CoreComponent {
    /** @deprecated Use this._hasSetup or onMount() instead. */
    protected _mounted = false;

    /** querySelector shorthand on shadowRoot (or host for light-DOM). */
    protected $<T extends Element = Element>(selector: string): T | null {
        return (this.shadowRoot ?? this).querySelector<T>(selector);
    }

    /** querySelectorAll shorthand on shadowRoot (or host for light-DOM). */
    protected $$<T extends Element = Element>(selector: string): NodeListOf<T> {
        return (this.shadowRoot ?? this).querySelectorAll<T>(selector);
    }

    /** getAttribute shorthand. */
    protected attr(name: string): string | null {
        return this.getAttribute(name);
    }

    /** @deprecated Use this.emit() instead. */
    protected emitEvent(name: string, detail: any = {}): boolean {
        return this.emit(name, detail);
    }

    /**
     * @deprecated Templates are now cached and stamped once on connect.
     * Calling render() is a no-op in the new CoreComponent architecture.
     * Migrate the component to use refs + state binding or _handleAttributeUpdate.
     */
    protected render(): void {
        // no-op — see CoreComponent._setup()
    }

    onMount() {
        this._mounted = true;
    }
}

/** @deprecated Use customElements.define() with a guard instead. */
export function defineComponent(tag: string, cls: CustomElementConstructor): void {
    if (!customElements.get(tag)) customElements.define(tag, cls);
}
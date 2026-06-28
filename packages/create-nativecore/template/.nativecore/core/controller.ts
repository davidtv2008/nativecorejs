import { html, TrustedHtml, escapeHtml } from '../utils/templates.js';

export interface State<T> {
    value: T;
}

export abstract class CoreController {
    public el: HTMLElement;
    protected _unsubs = new Set<() => void>();
    private _activeEffect: (() => void) | null = null;

    [key: string]: any;

    private _availableRefs(): string[] {
        return Array.from(this.el.querySelectorAll('[ref]'))
            .map(el => el.getAttribute('ref'))
            .filter((name): name is string => !!name);
    }

    private _contextLabel(): string {
        const view = this.el.getAttribute('data-view') || 'unknown-view';
        return `[${this.constructor.name} @ view="${view}"]`;
    }

    private _formatRefsHint(): string {
        const refs = this._availableRefs();
        return refs.length
            ? `Available refs: ${refs.map(r => `"${r}"`).join(', ')}`
            : 'Available refs: (none found in view markup)';
    }

    protected assertRefs(...refNames: string[]): void {
        const missing = refNames.filter(refName => !(this as any)[refName]);
        if (missing.length > 0) {
            throw new Error(
                `${this._contextLabel()} missing required ref${missing.length > 1 ? 's' : ''}: ` +
                `${missing.map(name => `"${name}"`).join(', ')}. ${this._formatRefsHint()}`
            );
        }
    }

    constructor(rootElement?: HTMLElement) {
        this.el = rootElement ?? (document.querySelector('[data-view]') as HTMLElement);
        if (!this.el) throw new Error('[CoreController] no root element found. Pass one explicitly or add [data-view] to the view.');
        this._bootstrap();
        if (this.onMount) this.onMount();
    }

    // --- REACTIVITY ENGINE ---

    protected state<T>(val: T): State<T> {
        let _val = val;
        const subs = new Set<() => void>();
        const self = this;
        return {
            get value(): T {
                if (self._activeEffect) subs.add(self._activeEffect);
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
     * state read inside it changes. Auto-disposed on destroy().
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

    // --- DOM BINDING ---

    /**
     * Reactive binding — mirrors CoreComponent.bind() exactly.
     *
     * Overloads:
     *   bind(state, '#selector')           → sets this[selector] = value (legacy prop binding)
     *   bind(state, el)                    → el.textContent = value
     *   bind(state, el, 'href')            → el.setAttribute('href', value)
     *   bind(state, el, '?disabled')       → boolean attribute toggle
     *   bind(state, el, '.active .bold')   → class toggle(s)
     *   bind(state, el, 'innerHTML')       → sets innerHTML
     */
    protected bind<T>(source: State<T>, elOrProp: Element | string, binding?: string): void {
        const runner = () => {
            this._activeEffect = runner;
            const v = source.value;
            this._activeEffect = null;

            // Legacy: bind(state, 'propName') — writes to this[propName]
            if (typeof elOrProp === 'string') {
                this[elOrProp] = v;
                return;
            }

            const el = elOrProp;
            const isValidElement = !!el && typeof (el as any).setAttribute === 'function';
            if (!isValidElement) {
                const bindTarget = binding ? `binding="${binding}"` : 'textContent binding';
                throw new Error(
                    `${this._contextLabel()} bind() target is undefined/invalid (${bindTarget}). ` +
                    `This usually means a missing ref in the view template. ${this._formatRefsHint()}`
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
        };

        runner();
    }

    // --- DOM HELPERS ---

    /** querySelector scoped to this.el (the view root). */
    protected $<T extends Element = HTMLElement>(selector: string): T | null {
        return this.el.querySelector<T>(selector);
    }

    /** querySelectorAll scoped to this.el. */
    protected $$<T extends Element = HTMLElement>(selector: string): NodeListOf<T> {
        return this.el.querySelectorAll<T>(selector);
    }

    // --- EVENTS ---

    protected on<K extends keyof HTMLElementEventMap>(
        target: EventTarget,
        type: K | string,
        handler: (ev: any) => void,
        options?: AddEventListenerOptions
    ): void {
        const isValidTarget = !!target && typeof (target as any).addEventListener === 'function';
        if (!isValidTarget) {
            throw new Error(
                `${this._contextLabel()} on() target is undefined/invalid for event "${String(type)}". ` +
                `This usually means a missing ref in the view template. ${this._formatRefsHint()}`
            );
        }
        target.addEventListener(type, handler, options);
        this._unsubs.add(() => target.removeEventListener(type, handler, options));
    }

    // --- BOOTSTRAPPER ---

    /**
     * Re-scan refs inside a container after dynamic innerHTML injection.
     * Only call after you've set innerHTML so new [ref] elements are wired
     * to this[refName] before your next bind() / effect() calls.
     *
     *   this.myBody.innerHTML = '<p ref="newp">hello</p>';
     *   this.rebind(this.myBody);   // → this.newp is now set
     */
    protected rebind(root: Element = this.el): void {
        root.querySelectorAll('[ref]').forEach(el => {
            const refName = (el as HTMLElement).getAttribute('ref');
            if (refName) (this as any)[refName] = el as HTMLElement;
        });
    }

    private _bootstrap(): void {
        // 1. Auto-populate refs — ref="name" → this.name = el
        this.el.querySelectorAll('[ref]').forEach(el => {
            const refName = el.getAttribute('ref');
            if (refName) this[refName] = el as HTMLElement;
        });

        // 2. Legacy wire="" bindings (backward compat)
        this.el.querySelectorAll('[wire]').forEach(el => {
            const wireAttr = el.getAttribute('wire');
            if (!wireAttr) return;

            wireAttr.split(';').forEach(inst => {
                const [type, propName] = inst.split(':').map(s => s.trim());

                Object.defineProperty(this, propName, {
                    configurable: true,
                    set: (val: any) => {
                        const target = el as any;
                        if (type === 'text') {
                            el.textContent = val;
                        } else if (type === 'class') {
                            typeof val === 'boolean'
                                ? el.classList.toggle(propName, val)
                                : el.className = val;
                        } else {
                            el.setAttribute(type, val);
                            if (type in target) target[type] = val;
                        }
                    }
                });
            });
        });

        if (this.events) this.events();
    }

    public destroy(): void {
        this._unsubs.forEach(unsub => unsub());
        this._unsubs.clear();
        if (this.onUnmount) this.onUnmount();
    }

    protected onMount?(): void;
    protected onUnmount?(): void;
    protected events?(): void;
}
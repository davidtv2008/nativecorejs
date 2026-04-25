/**
 * Base Component Class for Web Components
 * Extend this to create reusable custom HTML elements
 */

import { effect } from './state.js';
import type { State, ComputedState } from './state.js';
import dom from '../utils/dom.js';

// Types
export interface ComponentState {
    [key: string]: any;
}

export interface ComponentConstructor {
    useShadowDOM?: boolean;
    observedAttributes?: string[];
}

type RenderContainer = HTMLElement | ShadowRoot | Element | DocumentFragment;

type Readable<T = any> = State<T> | ComputedState<T>;

/**
 * Base Component class for creating Web Components
 */
export class Component extends HTMLElement {
    state: ComponentState;
    protected _mounted: boolean;
    private _bindings: Array<() => void> = [];
    static useShadowDOM?: boolean;
    static observedAttributes?: string[];
    
    constructor() {
        super();
        this.state = {};
        this._mounted = false;
        
        // Attach shadow root only if component opts-in via static property
        const constructor = this.constructor as typeof Component;
        if (constructor.useShadowDOM) {
            this.attachShadow({ mode: 'open' });
        }
    }
    
    /**
     * Called when component is added to DOM
     */
    connectedCallback(): void {
        try {
            this.render();
            this._mounted = true;
            this.onMount();
        } catch (error) {
            console.error(`Error rendering ${this.tagName.toLowerCase()}:`, error);
            this.dispatchEvent(new CustomEvent('nativecore:component-error', {
                bubbles: true,
                composed: true,
                detail: {
                    error,
                    component: this.tagName.toLowerCase(),
                    route: window.location.pathname,
                }
            }));
        }
    }
    
    /**
     * Called when component is removed from DOM
     */
    disconnectedCallback(): void {
        this._bindings.forEach(dispose => dispose());
        this._bindings.length = 0;
        this.onUnmount();
        this._mounted = false;
    }
    
    /**
     * Watch for attribute changes
     */
    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
        if (oldValue !== newValue && this._mounted) {
            this.onAttributeChange(name, oldValue, newValue);
            this.render();
        }
    }
    
    /**
     * Update component state and re-render
     */
    setState(newState: Partial<ComponentState>): void {
        this.state = { ...this.state, ...newState };
        if (this._mounted) {
            this.render();
        }
    }
    
    /**
     * Get component state
     */
    getState(): ComponentState {
        return { ...this.state };
    }
    
    /**
     * Update component state without triggering a full re-render.
     * Useful when relying on bind() for fine-grained DOM updates.
     */
    patchState(newState: Partial<ComponentState>): void {
        this.state = { ...this.state, ...newState };
    }

    /**
     * Bind a reactive state to a DOM element's property.
     * Creates an effect that automatically updates the targeted element
     * whenever the state changes — no full re-render needed.
     *
     * @param state   A reactive State or ComputedState to watch
     * @param selector  CSS selector string or an Element reference
     * @param property  DOM property to update (default: 'textContent')
     */
    bind<T>(state: Readable<T>, selector: string | Element, property: string = 'textContent'): void {
        const el = typeof selector === 'string' ? this.$(selector) : selector;
        if (!el) {
            console.warn(`[${this.tagName.toLowerCase()}] bind(): no element found for selector "${selector}"`);
            return;
        }
        const dispose = effect(() => {
            (el as any)[property] = String(state.value);
        });
        this._bindings.push(dispose);
    }

    /**
     * Bind a reactive state to a DOM element's attribute.
     *
     * @param state   A reactive State or ComputedState to watch
     * @param selector  CSS selector string or an Element reference
     * @param attributeName  HTML attribute to update
     */
    bindAttr<T>(state: Readable<T>, selector: string | Element, attributeName: string): void {
        const el = typeof selector === 'string' ? this.$(selector) : selector;
        if (!el) {
            console.warn(`[${this.tagName.toLowerCase()}] bindAttr(): no element found for selector "${selector}"`);
            return;
        }
        const dispose = effect(() => {
            el.setAttribute(attributeName, String(state.value));
        });
        this._bindings.push(dispose);
    }

    /**
     * Bind a reactive state to a CSS class toggle.
     *
     * Truthy state values add the class; falsy values remove it.
     */
    bindClass<T>(state: Readable<T>, selector: string | Element, className: string): void {
        const el = typeof selector === 'string' ? this.$(selector) : selector;
        if (!el) {
            console.warn(`[${this.tagName.toLowerCase()}] bindClass(): no element found for selector "${selector}"`);
            return;
        }
        const dispose = effect(() => {
            el.classList.toggle(className, Boolean(state.value));
        });
        this._bindings.push(dispose);
    }

    /**
     * Bind a reactive state to an inline style property.
     *
     * Empty/null/undefined values remove the style property.
     */
    bindStyle<T>(state: Readable<T>, selector: string | Element, styleName: string): void {
        const el = typeof selector === 'string' ? this.$(selector) : selector;
        if (!el) {
            console.warn(`[${this.tagName.toLowerCase()}] bindStyle(): no element found for selector "${selector}"`);
            return;
        }
        const dispose = effect(() => {
            const raw = state.value;
            if (raw === '' || raw === null || raw === undefined) {
                (el as HTMLElement).style.removeProperty(styleName);
                return;
            }
            (el as HTMLElement).style.setProperty(styleName, String(raw));
        });
        this._bindings.push(dispose);
    }

    /**
     * Batch-bind multiple selectors to reactive states.
     * Each key is a CSS selector; each value is the state to watch.
     * Updates textContent by default.
     *
     * Note: keys are CSS selectors, values are state objects —
     * the reverse of bind(state, selector) — to allow concise object literals.
     */
    bindAll(bindings: Record<string, Readable<any>>): void {
        for (const [selector, state] of Object.entries(bindings)) {
            this.bind(state, selector);
        }
    }

    /**
     * Two-way binding: keeps a writable State in sync with a form element.
     * State → DOM (read) is driven by a reactive effect; DOM → State (write) is
     * driven by an event listener. Both are auto-disposed on component unmount.
     *
     * @param state     A writable State<T> created with useState()
     * @param selector  CSS selector string or an Element reference
     * @param options   Optional overrides:
     *                    event — DOM event to listen for (default: 'change' for
     *                            checkboxes/radios, 'input' for everything else)
     *                    prop  — DOM property to read/write (default: 'checked' for
     *                            checkboxes/radios, 'value' for everything else)
     *
     * @example
     * // In onMount() — explicit selector
     * this.model(this.username, 'input[name="username"]');
     *
     * @example
     * // Checkbox — auto-detected; uses 'checked' + 'change'
     * this.model(this.agreed, 'input[type="checkbox"]');
     *
     * @example
     * // Custom event/prop override
     * this.model(this.rating, 'nc-rating', { event: 'nc-change', prop: 'value' });
     */
    model<T>(state: State<T>, selector: string | Element, options: { event?: string; prop?: string } = {}): void {
        const el = typeof selector === 'string' ? this.$(selector) : selector;
        if (!el) {
            console.warn(`[${this.tagName.toLowerCase()}] model(): no element found for selector "${selector}"`);
            return;
        }
        const isCheckable = el instanceof HTMLInputElement &&
            (el.type === 'checkbox' || el.type === 'radio');
        const eventName = options.event ?? (isCheckable ? 'change' : 'input');
        const propName  = options.prop  ?? (isCheckable ? 'checked' : 'value');

        // Read direction: state → DOM
        const readDispose = effect(() => {
            (el as any)[propName] = state.value;
        });
        this._bindings.push(readDispose);

        // Write direction: DOM → state
        const handler = (e: Event) => {
            state.value = (e.target as any)[propName] as T;
        };
        el.addEventListener(eventName, handler);
        this._bindings.push(() => el.removeEventListener(eventName, handler));
    }

    /**
     * Declarative two-way input binding. Scans the component for every
     * `[wire-input="propName"]` element and calls `model()` for each one,
     * resolving the attribute value as a property name on `this`.
     *
     * Matches the controller's `wireInputs()` API exactly — same attribute names,
     * same `overrides` option for non-standard elements.
     *
     * Call once from `onMount()`. The reconciler reuses DOM nodes on re-render so
     * the wired listeners remain valid — there is no need to call this again.
     *
     * @param options.overrides  Per-key event/prop overrides for non-standard elements.
     *
     * @example
     * // template
     * `<input wire-input="username" />
     *  <input wire-input="agreed" type="checkbox" />
     *  <nc-rating wire-input="rating"></nc-rating>`
     *
     * // class
     * username = useState('');
     * agreed   = useState(false);
     * rating   = useState(0);
     * onMount() {
     *     this.wireInputs({
     *         overrides: { rating: { event: 'nc-change', prop: 'value' } }
     *     });
     * }
     */
    wireInputs(options: { overrides?: Record<string, { event?: string; prop?: string }> } = {}): void {
        const root = this.shadowRoot ?? this;
        root.querySelectorAll<Element>('[wire-input]').forEach(el => {
            const stateName = el.getAttribute('wire-input')!;
            const stateRef = (this as any)[stateName];
            if (!stateRef || typeof stateRef.watch !== 'function' || typeof stateRef.set !== 'function') {
                console.warn(
                    `[${this.tagName.toLowerCase()}] wireInputs(): no writable State found for ` +
                    `wire-input="${stateName}". Make sure the property exists and was created with useState().`
                );
                return;
            }
            this.model(stateRef, el, options.overrides?.[stateName] ?? {});
        });
    }

    /**
     * Declarative one-way text binding. Scans the component for every
     * [wire-content="propName"] element and sets el.textContent = this[propName].value
     * whenever the state changes. Call once from onMount().
     *
     * @example
     * // template: <h1 wire-content="title">...</h1>
     * title = useState('Hello');
     * onMount() { this.wireContents(); }
     */
    wireContents(): void {
        const root = this.shadowRoot ?? this;
        root.querySelectorAll<Element>('[wire-content]').forEach(el => {
            const stateName = el.getAttribute('wire-content')!;
            const stateRef = (this as any)[stateName];
            if (!stateRef || typeof stateRef.watch !== 'function') {
                console.warn(
                    `[${this.tagName.toLowerCase()}] wireContents(): no State found for ` +
                    `wire-content="${stateName}". Make sure the property exists and was created with useState() or computed().`
                );
                return;
            }
            this.bind(stateRef, el);
        });
    }

    /**
     * Declarative one-way attribute binding. Scans the component for every
     * [wire-attribute="propName:attr-name"] element and calls
     * el.setAttribute(attr, this[propName].value) whenever the state changes.
     * Call once from onMount().
     *
     * @example
     * // template: <div wire-attribute="status:data-status"></div>
     * status = useState('active');
     * onMount() { this.wireAttributes(); }
     */
    wireAttributes(): void {
        const root = this.shadowRoot ?? this;
        root.querySelectorAll<Element>('[wire-attribute]').forEach(el => {
            const raw = el.getAttribute('wire-attribute')!;
            const colonIndex = raw.indexOf(':');
            if (colonIndex === -1) {
                console.warn(
                    `[${this.tagName.toLowerCase()}] wireAttributes(): invalid wire-attribute value "${raw}" — ` +
                    `expected format "propName:attribute-name" (e.g. "status:data-status")`
                );
                return;
            }
            const stateName = raw.slice(0, colonIndex).trim();
            const attrName  = raw.slice(colonIndex + 1).trim();
            const stateRef  = (this as any)[stateName];
            if (!stateRef || typeof stateRef.watch !== 'function') {
                console.warn(
                    `[${this.tagName.toLowerCase()}] wireAttributes(): no State found for ` +
                    `wire-attribute="${raw}". Make sure "${stateName}" exists and was created with useState() or computed().`
                );
                return;
            }
            this.bindAttr(stateRef, el, attrName);
        });
    }

    /**
     * Declarative one-way class binding. Scans the component for every
     * [wire-class="propName:class-name"] element and toggles class-name
     * based on this[propName].value truthiness.
     *
     * @example
     * // template: <button wire-class="isLoading:is-loading"></button>
     * isLoading = useState(false);
     * onMount() { this.wireClasses(); }
     */
    wireClasses(): void {
        const root = this.shadowRoot ?? this;
        root.querySelectorAll<Element>('[wire-class]').forEach(el => {
            const raw = el.getAttribute('wire-class')!;
            const colonIndex = raw.indexOf(':');
            if (colonIndex === -1) {
                console.warn(
                    `[${this.tagName.toLowerCase()}] wireClasses(): invalid wire-class value "${raw}" - ` +
                    `expected format "propName:class-name" (e.g. "isOpen:is-open")`
                );
                return;
            }
            const stateName = raw.slice(0, colonIndex).trim();
            const className = raw.slice(colonIndex + 1).trim();
            const stateRef = (this as any)[stateName];
            if (!stateRef || typeof stateRef.watch !== 'function') {
                console.warn(
                    `[${this.tagName.toLowerCase()}] wireClasses(): no State found for ` +
                    `wire-class="${raw}". Make sure "${stateName}" exists and was created with useState() or computed().`
                );
                return;
            }
            this.bindClass(stateRef, el, className);
        });
    }

    /**
     * Declarative one-way inline style binding. Scans the component for every
     * [wire-style="propName:css-property"] element and applies
     * style.setProperty(css-property, this[propName].value).
     *
     * @example
     * // template: <div wire-style="progressWidth:width"></div>
     * progressWidth = useState('50%');
     * onMount() { this.wireStyles(); }
     */
    wireStyles(): void {
        const root = this.shadowRoot ?? this;
        root.querySelectorAll<Element>('[wire-style]').forEach(el => {
            const raw = el.getAttribute('wire-style')!;
            const colonIndex = raw.indexOf(':');
            if (colonIndex === -1) {
                console.warn(
                    `[${this.tagName.toLowerCase()}] wireStyles(): invalid wire-style value "${raw}" - ` +
                    `expected format "propName:css-property" (e.g. "barWidth:width")`
                );
                return;
            }
            const stateName = raw.slice(0, colonIndex).trim();
            const styleName = raw.slice(colonIndex + 1).trim();
            const stateRef = (this as any)[stateName];
            if (!stateRef || typeof stateRef.watch !== 'function') {
                console.warn(
                    `[${this.tagName.toLowerCase()}] wireStyles(): no State found for ` +
                    `wire-style="${raw}". Make sure "${stateName}" exists and was created with useState() or computed().`
                );
                return;
            }
            this.bindStyle(stateRef, el, styleName);
        });
    }

    /**
     * Convenience shorthand: wire all declarative binding types in one call.
     * Equivalent to calling `wireInputs(options)`, `wireContents()`, and
     * `wireAttributes()`, `wireClasses()`, and `wireStyles()` in sequence.
     *
     * Call once from `onMount()`.
     *
     * @param options.overrides  Per-key event/prop overrides forwarded to wireInputs().
     *
     * @example
     * onMount() {
     *     this.wires();
     *     // or, with overrides for a custom element:
     *     this.wires({ overrides: { rating: { event: 'nc-change', prop: 'value' } } });
     * }
     */
    wires(options: { overrides?: Record<string, { event?: string; prop?: string }> } = {}): void {
        this.wireInputs(options);
        this.wireContents();
        this.wireAttributes();
        this.wireClasses();
        this.wireStyles();
    }

    /**
     * Render the component
     */
    render(): void {
        const html = this.template();
        const target = this.shadowRoot ?? this;
        patchHTML(target, html);
    }
    
    /**
     * Template method - Override to return HTML string
     */
    template(): string {
        return '';
    }
    
    /**
     * Lifecycle hook - called when component mounts
     */
    onMount(): void {
        // Override in child class
    }
    
    /**
     * Lifecycle hook - called when component unmounts
     */
    onUnmount(): void {
        // Override in child class
    }
    
    /**
     * Lifecycle hook - called when attributes change
     */
    onAttributeChange(_name: string, _oldValue: string | null, _newValue: string | null): void {
        // Override in child class
    }
    
    /**
     * Helper: Query selector within component's shadow DOM or light DOM
     */
    $<E extends Element = Element>(selector: string): E | null {
        return this.shadowRoot 
            ? this.shadowRoot.querySelector<E>(selector) 
            : this.querySelector<E>(selector);
    }
    
    /**
     * Helper: Query selector all within component's shadow DOM or light DOM
     */
    $$<E extends Element = Element>(selector: string): NodeListOf<E> {
        return this.shadowRoot 
            ? this.shadowRoot.querySelectorAll<E>(selector) 
            : this.querySelectorAll<E>(selector);
    }

    /**
     * Scoped accessor for [data-view] / [data-hook] / [data-action] elements
     * within this component's shadow root, pre-bound to this component's tag name.
     *
     * @example this.component.hook('title')              // [data-hook="title"]
     * @example this.component.action('primary')          // [data-action="primary"]
     * @example this.component.query('.badge')            // arbitrary selector
     * @example this.component.view('nested').hook('row') // re-scope to a nested [data-view]
     */
    get component() {
        return dom.view(this.tagName.toLowerCase(), this.shadowRoot ?? this);
    }

    /**
     * Helper: Add event listener with auto cleanup
     */
    on<K extends keyof HTMLElementEventMap>(
        event: K,
        handler: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any
    ): void;
    on<K extends keyof HTMLElementEventMap>(
        event: K,
        selector: string,
        handler: (this: Element, ev: HTMLElementEventMap[K]) => any
    ): void;
    on(
        event: string,
        handler: (this: HTMLElement, ev: Event) => any
    ): void;
    on(
        event: string,
        selector: string,
        handler: (this: Element, ev: Event) => any
    ): void;
    on<K extends keyof HTMLElementEventMap>(
        event: K | string,
        selectorOrHandler: string | ((this: HTMLElement, ev: any) => any),
        handler?: (this: Element, ev: any) => any
    ): void {
        if (typeof selectorOrHandler === 'function') {
            this.addEventListener(event, selectorOrHandler as EventListener);
        } else if (handler) {
            this.addEventListener(event, ((e: Event) => {
                const target = e.target as Element;
                if (target.matches(selectorOrHandler)) {
                    handler.call(target, e as any);
                }
            }) as EventListener);
        }
    }
    
    /**
     * Helper: Emit custom event
     */
    emitEvent<T = any>(
        eventName: string, 
        detail: T = {} as T,
        options: Partial<CustomEventInit<T>> = {}
    ): boolean {
        const event = new CustomEvent(eventName, {
            detail,
            bubbles: options.bubbles !== undefined ? options.bubbles : true,
            composed: options.composed !== undefined ? options.composed : true,
            cancelable: options.cancelable !== undefined ? options.cancelable : false
        });
        return this.dispatchEvent(event);
    }
    
    /**
     * Helper: Get attribute or default value
     */
    attr(name: string, defaultValue: string | null = null): string | null {
        return this.getAttribute(name) || defaultValue;
    }
    
    /**
     * Helper: Set attribute
     */
    setAttr(name: string, value: string): void {
        this.setAttribute(name, value);
    }
}

/**
 * Parse the latest template HTML into a fragment and reconcile it against the
 * existing DOM so stable nodes, focus state, and form control state survive updates.
 */
function patchHTML(target: HTMLElement | ShadowRoot, html: string): void {
    const range = document.createRange();
    range.selectNodeContents(target);
    const fragment = range.createContextualFragment(html);
    reconcileChildren(target, fragment);
}

/**
 * Reconcile child nodes. When all element children carry a `key=` attribute,
 * uses a key-map algorithm (reorder/reuse nodes by key) for O(n) diffing.
 * Falls back to positional reconciliation when keys are absent.
 */
function reconcileChildren(target: RenderContainer, source: RenderContainer): void {
    const currentNodes = Array.from(target.childNodes);
    const nextNodes = Array.from(source.childNodes);

    // Key-based reconciliation: active when EVERY element node in both
    // old and new sets carries a key= attribute.
    const currentElements = currentNodes.filter(n => n.nodeType === Node.ELEMENT_NODE) as Element[];
    const nextElements    = nextNodes.filter(n => n.nodeType === Node.ELEMENT_NODE) as Element[];
    const useKeys =
        nextElements.length > 0 &&
        nextElements.every(el => el.hasAttribute('key')) &&
        (currentElements.length === 0 || currentElements.every(el => el.hasAttribute('key')));

    if (useKeys) {
        reconcileByKey(target, currentElements, nextElements);
        return;
    }

    // --- positional fallback ---
    const maxLength = Math.max(currentNodes.length, nextNodes.length);

    for (let index = 0; index < maxLength; index++) {
        const currentNode = currentNodes[index];
        const nextNode = nextNodes[index];

        if (!currentNode && nextNode) {
            target.appendChild(nextNode);
            continue;
        }

        if (currentNode && !nextNode) {
            currentNode.remove();
            continue;
        }

        if (currentNode && nextNode) {
            reconcileNode(currentNode, nextNode);
        }
    }
}

/**
 * Key-based list reconciliation: reuse existing DOM nodes by their `key=`
 * attribute, moving them into the correct position rather than replacing them.
 * This is the algorithm React, Vue, and Svelte use for keyed lists — it
 * preserves component state and avoids unnecessary DOM creation.
 */
function reconcileByKey(target: RenderContainer, current: Element[], next: Element[]): void {
    // Build a map of key → existing element
    const keyMap = new Map<string, Element>();
    for (const el of current) {
        const k = el.getAttribute('key')!;
        keyMap.set(k, el);
    }

    // Remove elements whose keys are gone
    const nextKeys = new Set(next.map(el => el.getAttribute('key')!));
    for (const el of current) {
        if (!nextKeys.has(el.getAttribute('key')!)) {
            el.remove();
        }
    }

    // Insert / reorder into correct positions
    for (let i = 0; i < next.length; i++) {
        const nextEl = next[i];
        const key = nextEl.getAttribute('key')!;
        const existing = keyMap.get(key);

        if (existing) {
            // Patch attributes and children in place
            syncAttributes(existing, nextEl);
            syncFormControlState(existing, nextEl);
            reconcileChildren(existing, nextEl);

            // Move to correct position if needed
            const siblings = Array.from(target.childNodes);
            if (siblings[i] !== existing) {
                const refNode = siblings[i] ?? null;
                target.insertBefore(existing, refNode);
            }
        } else {
            // New key — insert at correct position
            const siblings = Array.from(target.childNodes);
            const refNode = siblings[i] ?? null;
            target.insertBefore(nextEl, refNode);
        }
    }
}

function reconcileNode(currentNode: Node, nextNode: Node): void {
    const parent = currentNode.parentNode;
    if (!parent) return;

    if (!canPatchNode(currentNode, nextNode)) {
        parent.replaceChild(nextNode, currentNode);
        return;
    }

    if (currentNode.nodeType === Node.TEXT_NODE || currentNode.nodeType === Node.COMMENT_NODE) {
        if (currentNode.textContent !== nextNode.textContent) {
            currentNode.textContent = nextNode.textContent;
        }
        return;
    }

    const currentElement = currentNode as Element;
    const nextElement = nextNode as Element;

    syncAttributes(currentElement, nextElement);
    syncFormControlState(currentElement, nextElement);
    reconcileChildren(currentElement, nextElement);
}

function canPatchNode(currentNode: Node, nextNode: Node): boolean {
    if (currentNode.nodeType !== nextNode.nodeType) {
        return false;
    }

    if (currentNode.nodeType !== Node.ELEMENT_NODE) {
        return true;
    }

    return (currentNode as Element).tagName === (nextNode as Element).tagName;
}

function syncAttributes(currentElement: Element, nextElement: Element): void {
    const currentAttributes = Array.from(currentElement.attributes);
    const nextAttributes = Array.from(nextElement.attributes);

    currentAttributes.forEach(attribute => {
        if (!nextElement.hasAttribute(attribute.name)) {
            currentElement.removeAttribute(attribute.name);
        }
    });

    nextAttributes.forEach(attribute => {
        if (currentElement.getAttribute(attribute.name) !== attribute.value) {
            currentElement.setAttribute(attribute.name, attribute.value);
        }
    });
}

/**
 * Preserve input values, checked state, and focus where possible while syncing template updates.
 */
function syncFormControlState(currentElement: Element, nextElement: Element): void {
    if (currentElement instanceof HTMLInputElement && nextElement instanceof HTMLInputElement) {
        syncInputElement(currentElement, nextElement);
        return;
    }

    if (currentElement instanceof HTMLTextAreaElement && nextElement instanceof HTMLTextAreaElement) {
        if (!isFocusedElement(currentElement) && currentElement.value !== nextElement.value) {
            currentElement.value = nextElement.value;
        }
        return;
    }

    if (currentElement instanceof HTMLSelectElement && nextElement instanceof HTMLSelectElement) {
        if (!isFocusedElement(currentElement) && currentElement.value !== nextElement.value) {
            currentElement.value = nextElement.value;
        }
    }
}

function syncInputElement(currentElement: HTMLInputElement, nextElement: HTMLInputElement): void {
    if (currentElement.type === 'checkbox' || currentElement.type === 'radio') {
        currentElement.checked = nextElement.checked;
    }

    if (!isFocusedElement(currentElement) && currentElement.value !== nextElement.value) {
        currentElement.value = nextElement.value;
    }
}

function isFocusedElement(element: Element): boolean {
    const root = element.getRootNode();

    if (root instanceof ShadowRoot) {
        return root.activeElement === element;
    }

    return element.ownerDocument?.activeElement === element;
}

/**
 * Helper function to define custom element
 */
export function defineComponent<T extends CustomElementConstructor>(
    tagName: string, 
    componentClass: T
): void {
    try {
        if (!customElements.get(tagName)) {
            customElements.define(tagName, componentClass);
        }
    } catch (error) {
        console.error(`Error defining ${tagName}:`, error);
    }
}

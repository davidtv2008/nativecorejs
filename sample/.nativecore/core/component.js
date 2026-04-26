/**
 * Base Component Class for Web Components
 * Extend this to create reusable custom HTML elements
 */
import { effect } from './state.js';
import dom from '../utils/dom.js';
import { pausePageCleanupCollection, resumePageCleanupCollection } from './pageCleanupRegistry.js';
/**
 * Base Component class for creating Web Components
 */
export class Component extends HTMLElement {
    state;
    _mounted;
    _bindings = [];
    static useShadowDOM;
    static observedAttributes;
    constructor() {
        super();
        this.state = {};
        this._mounted = false;
        // Attach shadow root only if component opts-in via static property
        const constructor = this.constructor;
        if (constructor.useShadowDOM) {
            this.attachShadow({ mode: 'open' });
        }
    }
    /**
     * Called when component is added to DOM
     */
    connectedCallback() {
        try {
            this.render();
            this._mounted = true;
            // Pause cleanup collection so that effects / computed states created
            // inside onMount() (via bindClass, wires, etc.) are never flushed by
            // the router's page cleanup. Web component teardown is handled by
            // disconnectedCallback via this._bindings — not the page registry.
            pausePageCleanupCollection();
            this.onMount();
            resumePageCleanupCollection();
        }
        catch (error) {
            resumePageCleanupCollection();
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
    disconnectedCallback() {
        this._bindings.forEach(dispose => dispose());
        this._bindings.length = 0;
        this.onUnmount();
        this._mounted = false;
    }
    /**
     * Watch for attribute changes
     */
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue && this._mounted) {
            this.onAttributeChange(name, oldValue, newValue);
            this.render();
        }
    }
    /**
     * Update component state and re-render
     */
    setState(newState) {
        this.state = { ...this.state, ...newState };
        if (this._mounted) {
            this.render();
        }
    }
    /**
     * Get component state
     */
    getState() {
        return { ...this.state };
    }
    /**
     * Update component state without triggering a full re-render.
     * Useful when relying on bind() for fine-grained DOM updates.
     */
    patchState(newState) {
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
    bind(state, selector, property = 'textContent') {
        const el = typeof selector === 'string' ? this.$(selector) : selector;
        if (!el) {
            console.warn(`[${this.tagName.toLowerCase()}] bind(): no element found for selector "${selector}"`);
            return;
        }
        const dispose = effect(() => {
            el[property] = String(state.value);
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
    bindAttr(state, selector, attributeName) {
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
    bindClass(state, selector, className) {
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
    bindStyle(state, selector, styleName) {
        const el = typeof selector === 'string' ? this.$(selector) : selector;
        if (!el) {
            console.warn(`[${this.tagName.toLowerCase()}] bindStyle(): no element found for selector "${selector}"`);
            return;
        }
        const dispose = effect(() => {
            const raw = state.value;
            if (raw === '' || raw === null || raw === undefined) {
                el.style.removeProperty(styleName);
                return;
            }
            el.style.setProperty(styleName, String(raw));
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
    bindAll(bindings) {
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
    model(state, selector, options = {}) {
        const el = typeof selector === 'string' ? this.$(selector) : selector;
        if (!el) {
            console.warn(`[${this.tagName.toLowerCase()}] model(): no element found for selector "${selector}"`);
            return;
        }
        const isCheckable = el instanceof HTMLInputElement &&
            (el.type === 'checkbox' || el.type === 'radio');
        const eventName = options.event ?? (isCheckable ? 'change' : 'input');
        const propName = options.prop ?? (isCheckable ? 'checked' : 'value');
        // Read direction: state → DOM
        const readDispose = effect(() => {
            el[propName] = state.value;
        });
        this._bindings.push(readDispose);
        // Write direction: DOM → state
        const handler = (e) => {
            state.value = e.target[propName];
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
    wireInputs(options = {}) {
        const root = this.shadowRoot ?? this;
        root.querySelectorAll('[wire-input]').forEach(el => {
            const stateName = el.getAttribute('wire-input');
            const stateRef = this[stateName];
            if (!stateRef || typeof stateRef.watch !== 'function' || typeof stateRef.set !== 'function') {
                console.warn(`[${this.tagName.toLowerCase()}] wireInputs(): no writable State found for ` +
                    `wire-input="${stateName}". Make sure the property exists and was created with useState().`);
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
    wireContents() {
        const root = this.shadowRoot ?? this;
        root.querySelectorAll('[wire-content]').forEach(el => {
            const stateName = el.getAttribute('wire-content');
            const stateRef = this[stateName];
            if (!stateRef || typeof stateRef.watch !== 'function') {
                console.warn(`[${this.tagName.toLowerCase()}] wireContents(): no State found for ` +
                    `wire-content="${stateName}". Make sure the property exists and was created with useState() or computed().`);
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
    wireAttributes() {
        const root = this.shadowRoot ?? this;
        root.querySelectorAll('[wire-attribute]').forEach(el => {
            const raw = el.getAttribute('wire-attribute');
            const colonIndex = raw.indexOf(':');
            if (colonIndex === -1) {
                console.warn(`[${this.tagName.toLowerCase()}] wireAttributes(): invalid wire-attribute value "${raw}" — ` +
                    `expected format "propName:attribute-name" (e.g. "status:data-status")`);
                return;
            }
            const stateName = raw.slice(0, colonIndex).trim();
            const attrName = raw.slice(colonIndex + 1).trim();
            const stateRef = this[stateName];
            if (!stateRef || typeof stateRef.watch !== 'function') {
                console.warn(`[${this.tagName.toLowerCase()}] wireAttributes(): no State found for ` +
                    `wire-attribute="${raw}". Make sure "${stateName}" exists and was created with useState() or computed().`);
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
    wireClasses() {
        const root = this.shadowRoot ?? this;
        root.querySelectorAll('[wire-class]').forEach(el => {
            const raw = el.getAttribute('wire-class');
            const colonIndex = raw.indexOf(':');
            if (colonIndex === -1) {
                console.warn(`[${this.tagName.toLowerCase()}] wireClasses(): invalid wire-class value "${raw}" - ` +
                    `expected format "propName:class-name" (e.g. "isOpen:is-open")`);
                return;
            }
            const stateName = raw.slice(0, colonIndex).trim();
            const className = raw.slice(colonIndex + 1).trim();
            const stateRef = this[stateName];
            if (!stateRef || typeof stateRef.watch !== 'function') {
                console.warn(`[${this.tagName.toLowerCase()}] wireClasses(): no State found for ` +
                    `wire-class="${raw}". Make sure "${stateName}" exists and was created with useState() or computed().`);
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
    wireStyles() {
        const root = this.shadowRoot ?? this;
        root.querySelectorAll('[wire-style]').forEach(el => {
            const raw = el.getAttribute('wire-style');
            const colonIndex = raw.indexOf(':');
            if (colonIndex === -1) {
                console.warn(`[${this.tagName.toLowerCase()}] wireStyles(): invalid wire-style value "${raw}" - ` +
                    `expected format "propName:css-property" (e.g. "barWidth:width")`);
                return;
            }
            const stateName = raw.slice(0, colonIndex).trim();
            const styleName = raw.slice(colonIndex + 1).trim();
            const stateRef = this[stateName];
            if (!stateRef || typeof stateRef.watch !== 'function') {
                console.warn(`[${this.tagName.toLowerCase()}] wireStyles(): no State found for ` +
                    `wire-style="${raw}". Make sure "${stateName}" exists and was created with useState() or computed().`);
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
    wires(options = {}) {
        this.wireInputs(options);
        this.wireContents();
        this.wireAttributes();
        this.wireClasses();
        this.wireStyles();
    }
    /**
     * Declarative event binding. Scans the component for every
     * [wire-action="name:eventType"] element and returns a map of named
     * WireAction objects. Pass each to this.on() to bind a handler with
     * automatic cleanup on component unmount.
     *
     * @example
     * // template: <button wire-action="savebtn:click">Save</button>
     * //           <nc-rating wire-action="rating:nc-change">…</nc-rating>
     *
     * onMount() {
     *     const { savebtn, rating } = this.wireActions();
     *     this.listen(savebtn, () => this.handleSave());
     *     this.listen(rating,  (e) => this.score.value = e.detail.value);
     * }
     */
    wireActions() {
        const root = this.shadowRoot ?? this;
        const actions = {};
        root.querySelectorAll('[wire-action]').forEach(el => {
            const raw = el.getAttribute('wire-action');
            const colonIndex = raw.indexOf(':');
            if (colonIndex === -1) {
                console.warn(`[${this.tagName.toLowerCase()}] wireActions(): invalid wire-action value "${raw}" — ` +
                    `expected format "name:eventType" (e.g. "savebtn:click")`);
                return;
            }
            const name = raw.slice(0, colonIndex).trim();
            const eventName = raw.slice(colonIndex + 1).trim();
            if (actions[name]) {
                console.warn(`[${this.tagName.toLowerCase()}] wireActions(): duplicate wire-action name "${name}" — ` +
                    `each name must be unique per component.`);
                return;
            }
            actions[name] = { element: el, event: eventName };
        });
        return actions;
    }
    listen(first, second, third) {
        if (first !== null &&
            typeof first === 'object' &&
            'element' in first &&
            'event' in first &&
            typeof second === 'function') {
            // WireAction path
            const { element, event } = first;
            element.addEventListener(event, second);
            this._bindings.push(() => element.removeEventListener(event, second));
        }
        else if (typeof second === 'string' && typeof third === 'function') {
            // Classic element / selector / Window path
            const el = typeof first === 'string' ? this.$(first) : first;
            if (!el) {
                console.warn(`[${this.tagName.toLowerCase()}] listen(): no element found for "${first}"`);
                return;
            }
            el.addEventListener(second, third);
            this._bindings.push(() => el.removeEventListener(second, third));
        }
        else {
            console.warn(`[${this.tagName.toLowerCase()}] listen(): unrecognised call signature.`);
        }
    }
    /** @deprecated Use this.listen(wireAction, handler) instead. */
    bindAction(action, handler) {
        this.listen(action, handler);
    }
    /**
     * Render the component
     */
    render() {
        const html = this.template();
        const target = this.shadowRoot ?? this;
        patchHTML(target, html);
    }
    /**
     * Template method - Override to return HTML string
     */
    template() {
        return '';
    }
    /**
     * Lifecycle hook - called when component mounts
     */
    onMount() {
        // Override in child class
    }
    /**
     * Lifecycle hook - called when component unmounts
     */
    onUnmount() {
        // Override in child class
    }
    /**
     * Lifecycle hook - called when attributes change
     */
    onAttributeChange(_name, _oldValue, _newValue) {
        // Override in child class
    }
    /**
     * Helper: Query selector within component's shadow DOM or light DOM
     */
    $(selector) {
        return this.shadowRoot
            ? this.shadowRoot.querySelector(selector)
            : this.querySelector(selector);
    }
    /**
     * Helper: Query selector all within component's shadow DOM or light DOM
     */
    $$(selector) {
        return this.shadowRoot
            ? this.shadowRoot.querySelectorAll(selector)
            : this.querySelectorAll(selector);
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
    on(event, selectorOrHandler, handler) {
        if (typeof selectorOrHandler === 'function') {
            this.addEventListener(event, selectorOrHandler);
        }
        else if (handler) {
            this.addEventListener(event, ((e) => {
                const target = e.target;
                if (target.matches(selectorOrHandler)) {
                    handler.call(target, e);
                }
            }));
        }
    }
    /**
     * Helper: Emit custom event
     */
    emitEvent(eventName, detail = {}, options = {}) {
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
    attr(name, defaultValue = null) {
        return this.getAttribute(name) || defaultValue;
    }
    /**
     * Helper: Set attribute
     */
    setAttr(name, value) {
        this.setAttribute(name, value);
    }
}
/**
 * Parse the latest template HTML into a fragment and reconcile it against the
 * existing DOM so stable nodes, focus state, and form control state survive updates.
 */
function patchHTML(target, html) {
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
function reconcileChildren(target, source) {
    const currentNodes = Array.from(target.childNodes);
    const nextNodes = Array.from(source.childNodes);
    // Key-based reconciliation: active when EVERY element node in both
    // old and new sets carries a key= attribute.
    const currentElements = currentNodes.filter(n => n.nodeType === Node.ELEMENT_NODE);
    const nextElements = nextNodes.filter(n => n.nodeType === Node.ELEMENT_NODE);
    const useKeys = nextElements.length > 0 &&
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
function reconcileByKey(target, current, next) {
    // Build a map of key → existing element
    const keyMap = new Map();
    for (const el of current) {
        const k = el.getAttribute('key');
        keyMap.set(k, el);
    }
    // Remove elements whose keys are gone
    const nextKeys = new Set(next.map(el => el.getAttribute('key')));
    for (const el of current) {
        if (!nextKeys.has(el.getAttribute('key'))) {
            el.remove();
        }
    }
    // Insert / reorder into correct positions
    for (let i = 0; i < next.length; i++) {
        const nextEl = next[i];
        const key = nextEl.getAttribute('key');
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
        }
        else {
            // New key — insert at correct position
            const siblings = Array.from(target.childNodes);
            const refNode = siblings[i] ?? null;
            target.insertBefore(nextEl, refNode);
        }
    }
}
function reconcileNode(currentNode, nextNode) {
    const parent = currentNode.parentNode;
    if (!parent)
        return;
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
    const currentElement = currentNode;
    const nextElement = nextNode;
    syncAttributes(currentElement, nextElement);
    syncFormControlState(currentElement, nextElement);
    reconcileChildren(currentElement, nextElement);
}
function canPatchNode(currentNode, nextNode) {
    if (currentNode.nodeType !== nextNode.nodeType) {
        return false;
    }
    if (currentNode.nodeType !== Node.ELEMENT_NODE) {
        return true;
    }
    return currentNode.tagName === nextNode.tagName;
}
function syncAttributes(currentElement, nextElement) {
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
function syncFormControlState(currentElement, nextElement) {
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
function syncInputElement(currentElement, nextElement) {
    if (currentElement.type === 'checkbox' || currentElement.type === 'radio') {
        currentElement.checked = nextElement.checked;
    }
    if (!isFocusedElement(currentElement) && currentElement.value !== nextElement.value) {
        currentElement.value = nextElement.value;
    }
}
function isFocusedElement(element) {
    const root = element.getRootNode();
    if (root instanceof ShadowRoot) {
        return root.activeElement === element;
    }
    return element.ownerDocument?.activeElement === element;
}
/**
 * Helper function to define custom element
 */
export function defineComponent(tagName, componentClass) {
    try {
        if (!customElements.get(tagName)) {
            customElements.define(tagName, componentClass);
        }
    }
    catch (error) {
        console.error(`Error defining ${tagName}:`, error);
    }
}

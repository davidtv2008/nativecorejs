/**
 * Base Component Class for Web Components
 * Extend this to create reusable custom HTML elements
 */

import { effect } from './state.js';
import type { State, ComputedState } from './state.js';

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
    shadowRoot!: ShadowRoot | null;
    
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
     * @param selector  CSS selector for the target element
     * @param property  DOM property to update (default: 'textContent')
     */
    bind<T>(state: Readable<T>, selector: string, property: string = 'textContent'): void {
        const el = this.$(selector);
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
     * @param selector  CSS selector for the target element
     * @param attributeName  HTML attribute to update
     */
    bindAttr<T>(state: Readable<T>, selector: string, attributeName: string): void {
        const el = this.$(selector);
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
    on<K extends keyof HTMLElementEventMap>(
        event: K,
        selectorOrHandler: string | ((this: HTMLElement, ev: HTMLElementEventMap[K]) => any),
        handler?: (this: Element, ev: HTMLElementEventMap[K]) => any
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
 * Reconcile child nodes by index and patch matching nodes in place when possible.
 */
function reconcileChildren(target: RenderContainer, source: RenderContainer): void {
    const currentNodes = Array.from(target.childNodes);
    const nextNodes = Array.from(source.childNodes);
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

import { effect } from './state.js';
import type { State, ComputedState } from './state.js';
import dom from '../utils/dom.js';

export interface ComponentState {
    [key: string]: any;
}

export interface ComponentConstructor {
    useShadowDOM?: boolean;
    observedAttributes?: string[];
}

type RenderContainer = HTMLElement | ShadowRoot | Element | DocumentFragment;

type Readable<T = any> = State<T> | ComputedState<T>;

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

        const constructor = this.constructor as typeof Component;
        if (constructor.useShadowDOM) {
            this.attachShadow({ mode: 'open' });
        }
    }

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

    disconnectedCallback(): void {
        this._bindings.forEach(dispose => dispose());
        this._bindings.length = 0;
        this.onUnmount();
        this._mounted = false;
    }

    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
        if (oldValue !== newValue && this._mounted) {
            this.onAttributeChange(name, oldValue, newValue);
            this.render();
        }
    }

    setState(newState: Partial<ComponentState>): void {
        this.state = { ...this.state, ...newState };
        if (this._mounted) {
            this.render();
        }
    }

    getState(): ComponentState {
        return { ...this.state };
    }

    patchState(newState: Partial<ComponentState>): void {
        this.state = { ...this.state, ...newState };
    }

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
     * Each key is a CSS selector; each value is the reactive state to watch.
     * Updates each element's textContent by default.
     *
     * Note: keys are CSS selectors, values are state objects —
     * the reverse of bind(state, selector) — to allow concise object literals.
     */
    bindAll(bindings: Record<string, Readable<any>>): void {
        for (const [selector, state] of Object.entries(bindings)) {
            this.bind(state, selector);
        }
    }

    render(): void {
        const html = this.template();
        const target = this.shadowRoot ?? this;
        patchHTML(target, html);
    }

    template(): string {
        return '';
    }

    onMount(): void {
    }

    onUnmount(): void {
    }

    onAttributeChange(_name: string, _oldValue: string | null, _newValue: string | null): void {
    }

    $<E extends Element = Element>(selector: string): E | null {
        return this.shadowRoot
            ? this.shadowRoot.querySelector<E>(selector)
            : this.querySelector<E>(selector);
    }

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

    attr(name: string, defaultValue: string | null = null): string | null {
        return this.getAttribute(name) || defaultValue;
    }

    setAttr(name: string, value: string): void {
        this.setAttribute(name, value);
    }
}

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

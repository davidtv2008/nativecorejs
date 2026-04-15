/**
 * DOM Utility Functions
 * Shorthand helpers for common DOM operations
 */

export const dom = {
    /**
     * Query single element (shorthand for document.querySelector)
     */
    query: <T extends Element = Element>(selector: string): T | null =>
        document.querySelector<T>(selector),

    /**
     * Query multiple elements (shorthand for document.querySelectorAll)
     */
    queryAll: <T extends Element = Element>(selector: string): NodeListOf<T> =>
        document.querySelectorAll<T>(selector),

    /**
     * Alias for query (similar to jQuery)
     */
    $: <T extends Element = Element>(selector: string): T | null =>
        document.querySelector<T>(selector),

    /**
     * Alias for queryAll (similar to jQuery)
     */
    $$: <T extends Element = Element>(selector: string): NodeListOf<T> =>
        document.querySelectorAll<T>(selector),

    /**
     * Query within a specific parent element (scoped query)
     * @example dom.within(shadowRoot, '.btn')
     * @example dom.within('#sidebar', 'a.active')
     */
    within: <T extends Element = Element>(
        parent: Element | ShadowRoot | string,
        selector: string
    ): T | null => {
        const el = typeof parent === 'string' ? document.querySelector(parent) : parent;
        return el ? el.querySelector<T>(selector) : null;
    },

    /**
     * Query all within a specific parent element (scoped query)
     */
    withinAll: <T extends Element = Element>(
        parent: Element | ShadowRoot | string,
        selector: string
    ): NodeListOf<T> | T[] => {
        const el = typeof parent === 'string' ? document.querySelector(parent) : parent;
        return el ? el.querySelectorAll<T>(selector) : ([] as T[]);
    },

    /**
     * Create an element with optional attributes and children
     * @example dom.create('button', { class: 'btn', type: 'button' }, 'Click me')
     * @example dom.create('div', { id: 'wrapper' }, childEl1, childEl2)
     */
    create: <K extends keyof HTMLElementTagNameMap>(
        tag: K,
        attrs?: Record<string, string> | null,
        ...children: Array<string | Node>
    ): HTMLElementTagNameMap[K] => {
        const el = document.createElement(tag);
        if (attrs) {
            for (const [key, val] of Object.entries(attrs)) {
                el.setAttribute(key, val);
            }
        }
        for (const child of children) {
            if (typeof child === 'string') {
                el.appendChild(document.createTextNode(child));
            } else {
                el.appendChild(child);
            }
        }
        return el;
    },

    /**
     * Add one or more CSS classes to an element
     */
    addClass: (el: Element | string | null, ...classes: string[]): void => {
        const target = typeof el === 'string' ? document.querySelector(el) : el;
        if (target) target.classList.add(...classes);
    },

    /**
     * Remove one or more CSS classes from an element
     */
    removeClass: (el: Element | string | null, ...classes: string[]): void => {
        const target = typeof el === 'string' ? document.querySelector(el) : el;
        if (target) target.classList.remove(...classes);
    },

    /**
     * Toggle a CSS class on an element
     */
    toggleClass: (el: Element | string | null, cls: string, force?: boolean): void => {
        const target = typeof el === 'string' ? document.querySelector(el) : el;
        if (target) target.classList.toggle(cls, force);
    },

    /**
     * Show an element (removes display:none inline style)
     */
    show: (el: Element | string | null): void => {
        const target = typeof el === 'string' ? document.querySelector(el) : el;
        if (target) (target as HTMLElement).style.removeProperty('display');
    },

    /**
     * Hide an element (sets display:none inline style)
     */
    hide: (el: Element | string | null): void => {
        const target = typeof el === 'string' ? document.querySelector(el) : el;
        if (target) (target as HTMLElement).style.display = 'none';
    },

    /**
     * Add event listener — returns an unsubscribe function for cleanup
     * @example const off = dom.listen('#btn', 'click', handler); off(); // removes listener
     */
    listen: (
        selectorOrElement: string | Element | null,
        eventName: string,
        handler: (event: any) => void,
        options?: boolean | AddEventListenerOptions
    ): () => void => {
        const element = typeof selectorOrElement === 'string'
            ? document.querySelector(selectorOrElement)
            : selectorOrElement;

        if (element) {
            element.addEventListener(eventName, handler as EventListener, options);
            return () => element.removeEventListener(eventName, handler as EventListener, options);
        }

        return () => {};
    }
};

// Expose to window for console debugging
if (typeof window !== 'undefined') {
    (window as any).dom = dom;
}

export default dom;

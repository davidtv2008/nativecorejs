/**
 * DOM Utility Functions
 * Shorthand helpers for common DOM operations
 */

type QueryRoot = Document | Element | ShadowRoot;

function resolveRoot(root?: Element | ShadowRoot | string | null): QueryRoot {
    if (!root) return document;
    if (typeof root === 'string') {
        return document.querySelector(root) ?? document;
    }
    return root;
}

function createDataScope(viewName: string, rootOverride?: Element | ShadowRoot | string | null) {
    const rootSelector = `[data-view="${viewName}"]`;

    const root = () => {
        if (rootOverride) {
            const resolvedRoot = resolveRoot(rootOverride);
            if (resolvedRoot instanceof Element || resolvedRoot instanceof ShadowRoot) {
                return resolvedRoot.querySelector<HTMLElement>(rootSelector);
            }
        }

        return document.querySelector<HTMLElement>(rootSelector);
    };

    const query = <T extends Element = HTMLElement>(selector: string): T | null =>
        root()?.querySelector<T>(selector) ?? null;

    const queryAll = <T extends Element = HTMLElement>(selector: string): NodeListOf<T> | T[] =>
        root()?.querySelectorAll<T>(selector) ?? ([] as T[]);

    const hookSelector = (name: string): string => `${rootSelector} [data-hook="${name}"]`;
    const actionSelector = (name: string): string => `${rootSelector} [data-action="${name}"]`;

    return {
        root,
        query,
        queryAll,
        hookSelector,
        actionSelector,
        hook: <T extends HTMLElement = HTMLElement>(name: string): T | null =>
            query<T>(`[data-hook="${name}"]`),
        action: <T extends HTMLElement = HTMLElement>(name: string): T | null =>
            query<T>(`[data-action="${name}"]`),
        text: (name: string): HTMLElement | null =>
            query<HTMLElement>(`[data-hook="${name}"]`),
        button: (name: string): HTMLButtonElement | null =>
            query<HTMLButtonElement>(`[data-action="${name}"]`),
        input: (name: string): HTMLInputElement | null =>
            query<HTMLInputElement>(`[data-hook="${name}"]`),
        form: (name: string): HTMLFormElement | null =>
            query<HTMLFormElement>(`[data-hook="${name}"]`),
        component: <T extends HTMLElement = HTMLElement>(name: string): T | null =>
            query<T>(`[data-hook="${name}"]`),
    };
}

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
    },

    /**
     * Create a scoped accessor for [data-view="..."] containers. Use in controllers
     * to scope queries to a specific view without leaking into other parts of the page.
     *
     * @example dom.view('tasks').hook('list')     // [data-hook="list"] inside [data-view="tasks"]
     * @example dom.view('tasks').action('add')    // [data-action="add"]
     * @example dom.view('tasks').query('.badge')  // arbitrary selector
     */
    view: (viewName: string, root?: Element | ShadowRoot | string | null) =>
        createDataScope(viewName, root)
};

// Expose to window for console debugging
if (typeof window !== 'undefined') {
    (window as any).dom = dom;
}

export default dom;

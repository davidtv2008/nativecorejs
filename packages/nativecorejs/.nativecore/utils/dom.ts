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
        /** Re-scope to a named [data-view] within the same shadow root. */
        view: (nestedViewName: string) => createDataScope(nestedViewName, rootOverride),
    };
}

export const dom = {
    query: <T extends Element = Element>(selector: string): T | null =>
        document.querySelector<T>(selector),

    queryAll: <T extends Element = Element>(selector: string): NodeListOf<T> =>
        document.querySelectorAll<T>(selector),

    $: <T extends Element = Element>(selector: string): T | null =>
        document.querySelector<T>(selector),

    $$: <T extends Element = Element>(selector: string): NodeListOf<T> =>
        document.querySelectorAll<T>(selector),

    within: <T extends Element = Element>(
        parent: Element | ShadowRoot | string,
        selector: string
    ): T | null => {
        const element = typeof parent === 'string' ? document.querySelector(parent) : parent;
        return element ? element.querySelector<T>(selector) : null;
    },

    withinAll: <T extends Element = Element>(
        parent: Element | ShadowRoot | string,
        selector: string
    ): NodeListOf<T> | T[] => {
        const element = typeof parent === 'string' ? document.querySelector(parent) : parent;
        return element ? element.querySelectorAll<T>(selector) : ([] as T[]);
    },

    create: <K extends keyof HTMLElementTagNameMap>(
        tag: K,
        attrs?: Record<string, string> | null,
        ...children: Array<string | Node>
    ): HTMLElementTagNameMap[K] => {
        const element = document.createElement(tag);
        if (attrs) {
            for (const [key, value] of Object.entries(attrs)) {
                element.setAttribute(key, value);
            }
        }
        for (const child of children) {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else {
                element.appendChild(child);
            }
        }
        return element;
    },

    addClass: (element: Element | string | null, ...classes: string[]): void => {
        const target = typeof element === 'string' ? document.querySelector(element) : element;
        if (target) target.classList.add(...classes);
    },

    removeClass: (element: Element | string | null, ...classes: string[]): void => {
        const target = typeof element === 'string' ? document.querySelector(element) : element;
        if (target) target.classList.remove(...classes);
    },

    toggleClass: (element: Element | string | null, className: string, force?: boolean): void => {
        const target = typeof element === 'string' ? document.querySelector(element) : element;
        if (target) target.classList.toggle(className, force);
    },

    show: (element: Element | string | null): void => {
        const target = typeof element === 'string' ? document.querySelector(element) : element;
        if (target) (target as HTMLElement).style.removeProperty('display');
    },

    hide: (element: Element | string | null): void => {
        const target = typeof element === 'string' ? document.querySelector(element) : element;
        if (target) (target as HTMLElement).style.display = 'none';
    },

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
     * to scope queries to a specific view, or in components via `this.component`.
     *
     * @example dom.view('tasks').hook('list')     // [data-hook="list"] inside [data-view="tasks"]
     * @example dom.view('tasks').action('add')    // [data-action="add"]
     * @example dom.view('tasks').query('.badge')  // arbitrary selector
     */
    view: (viewName: string, root?: Element | ShadowRoot | string | null) =>
        createDataScope(viewName, root),
};

if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'dom', {
        value: Object.freeze(dom),
        writable: false,
        configurable: false,
    });
}

export default dom;

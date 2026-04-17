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
    }
};

if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'dom', {
        value: Object.freeze(dom),
        writable: false,
        configurable: false,
    });
}

export default dom;

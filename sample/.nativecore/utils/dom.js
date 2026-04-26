/**
 * DOM Utility Functions
 * Shorthand helpers for common DOM operations
 */
function resolveRoot(root) {
    if (!root)
        return document;
    if (typeof root === 'string') {
        return document.querySelector(root) ?? document;
    }
    return root;
}
function createDataScope(viewName, rootOverride) {
    const rootSelector = `[data-view="${viewName}"]`;
    const root = () => {
        if (rootOverride) {
            const resolvedRoot = resolveRoot(rootOverride);
            if (resolvedRoot instanceof Element || resolvedRoot instanceof ShadowRoot) {
                return resolvedRoot.querySelector(rootSelector);
            }
        }
        return document.querySelector(rootSelector);
    };
    const query = (selector) => root()?.querySelector(selector) ?? null;
    const queryAll = (selector) => root()?.querySelectorAll(selector) ?? [];
    const hookSelector = (name) => `${rootSelector} [data-hook="${name}"]`;
    const actionSelector = (name) => `${rootSelector} [data-action="${name}"]`;
    return {
        root,
        query,
        queryAll,
        hookSelector,
        actionSelector,
        hook: (name) => query(`[data-hook="${name}"]`),
        action: (name) => query(`[data-action="${name}"]`),
        text: (name) => query(`[data-hook="${name}"]`),
        button: (name) => query(`[data-action="${name}"]`),
        input: (name) => query(`[data-hook="${name}"]`),
        form: (name) => query(`[data-hook="${name}"]`),
        component: (name) => query(`[data-hook="${name}"]`),
        /** Re-scope to a named [data-view] within the same shadow root. */
        view: (nestedViewName) => createDataScope(nestedViewName, rootOverride),
    };
}
export const dom = {
    /**
     * Query single element (shorthand for document.querySelector)
     */
    query: (selector) => document.querySelector(selector),
    /**
     * Query multiple elements (shorthand for document.querySelectorAll)
     */
    queryAll: (selector) => document.querySelectorAll(selector),
    /**
     * Alias for query (similar to jQuery)
     */
    $: (selector) => document.querySelector(selector),
    /**
     * Alias for queryAll (similar to jQuery)
     */
    $$: (selector) => document.querySelectorAll(selector),
    /**
     * Query within a specific parent element (scoped query)
     * @example dom.within(shadowRoot, '.btn')
     * @example dom.within('#sidebar', 'a.active')
     */
    within: (parent, selector) => {
        const el = typeof parent === 'string' ? document.querySelector(parent) : parent;
        return el ? el.querySelector(selector) : null;
    },
    /**
     * Query all within a specific parent element (scoped query)
     */
    withinAll: (parent, selector) => {
        const el = typeof parent === 'string' ? document.querySelector(parent) : parent;
        return el ? el.querySelectorAll(selector) : [];
    },
    /**
     * Create an element with optional attributes and children
     * @example dom.create('button', { class: 'btn', type: 'button' }, 'Click me')
     * @example dom.create('div', { id: 'wrapper' }, childEl1, childEl2)
     */
    create: (tag, attrs, ...children) => {
        const el = document.createElement(tag);
        if (attrs) {
            for (const [key, val] of Object.entries(attrs)) {
                el.setAttribute(key, val);
            }
        }
        for (const child of children) {
            if (typeof child === 'string') {
                el.appendChild(document.createTextNode(child));
            }
            else {
                el.appendChild(child);
            }
        }
        return el;
    },
    /**
     * Add one or more CSS classes to an element
     */
    addClass: (el, ...classes) => {
        const target = typeof el === 'string' ? document.querySelector(el) : el;
        if (target)
            target.classList.add(...classes);
    },
    /**
     * Remove one or more CSS classes from an element
     */
    removeClass: (el, ...classes) => {
        const target = typeof el === 'string' ? document.querySelector(el) : el;
        if (target)
            target.classList.remove(...classes);
    },
    /**
     * Toggle a CSS class on an element
     */
    toggleClass: (el, cls, force) => {
        const target = typeof el === 'string' ? document.querySelector(el) : el;
        if (target)
            target.classList.toggle(cls, force);
    },
    /**
     * Show an element (removes display:none inline style)
     */
    show: (el) => {
        const target = typeof el === 'string' ? document.querySelector(el) : el;
        if (target)
            target.style.removeProperty('display');
    },
    /**
     * Hide an element (sets display:none inline style)
     */
    hide: (el) => {
        const target = typeof el === 'string' ? document.querySelector(el) : el;
        if (target)
            target.style.display = 'none';
    },
    /**
     * Add event listener — returns an unsubscribe function for cleanup
     * @example const off = dom.listen('#btn', 'click', handler); off(); // removes listener
     */
    listen: (selectorOrElement, eventName, handler, options) => {
        const element = typeof selectorOrElement === 'string'
            ? document.querySelector(selectorOrElement)
            : selectorOrElement;
        if (element) {
            element.addEventListener(eventName, handler, options);
            return () => element.removeEventListener(eventName, handler, options);
        }
        return () => { };
    },
    /**
     * Create a scoped accessor for [data-view="..."] containers. Use in controllers
     * to scope queries to a specific view without leaking into other parts of the page.
     *
     * @example dom.view('tasks').hook('list')     // [data-hook="list"] inside [data-view="tasks"]
     * @example dom.view('tasks').action('add')    // [data-action="add"]
     * @example dom.view('tasks').query('.badge')  // arbitrary selector
     */
    view: (viewName, root) => createDataScope(viewName, root)
};
// Expose to window for console debugging
if (typeof window !== 'undefined') {
    window.dom = dom;
}
export default dom;

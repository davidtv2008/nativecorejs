type QueryRoot = Document | Element | ShadowRoot;

const SVG_NS = 'http://www.w3.org/2000/svg';

export type AttrValue = string | number | boolean | null | undefined;
export type AttrMap = Record<string, AttrValue>;
export type PropMap = Record<string, unknown>;
export type Child = Node | string | null | undefined | false;

export interface CreateOptions {
    ns?: string;
    attrs?: AttrMap | null;
    props?: PropMap | null;
    dataset?: Record<string, string | number | boolean>;
    class?: string;
    className?: string;
    children?: Child | Child[];
}

function resolveRoot(root?: Element | ShadowRoot | string | null): QueryRoot {
    if (!root) return document;
    if (typeof root === 'string') {
        return document.querySelector(root) ?? document;
    }
    return root;
}

function resolveElement(target: Element | string | null): Element | null {
    if (typeof target === 'string') return document.querySelector(target);
    return target;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return Boolean(
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        !(value instanceof Node)
    );
}

/**
 * Options bag vs flat attribute map. A map with a string `attrs` or `props`
 * value is treated as a legacy attribute map, not an options bag.
 */
function isCreateOptions(value: unknown): value is CreateOptions {
    if (!isPlainObject(value)) return false;
    const hasAttrs = Object.prototype.hasOwnProperty.call(value, 'attrs');
    const hasProps = Object.prototype.hasOwnProperty.call(value, 'props');
    const hasNs = Object.prototype.hasOwnProperty.call(value, 'ns');
    if (!hasAttrs && !hasProps && !hasNs) return false;
    if (hasAttrs && value.attrs != null && !isPlainObject(value.attrs)) return false;
    if (hasProps && value.props != null && !isPlainObject(value.props)) return false;
    if (hasNs && typeof value.ns !== 'string') return false;
    return true;
}

function resolveNamespace(ns?: string): string | null {
    if (!ns || ns === 'html') return null;
    if (ns === 'svg') return SVG_NS;
    return ns;
}

function applyClassName(element: Element, value: unknown): void {
    if (value == null || value === false) return;
    if (typeof value !== 'string') {
        throw new TypeError(`dom: class must be a string, got ${typeof value}`);
    }
    element.setAttribute('class', value);
}

function writeAttr(element: Element, name: string, value: AttrValue): void {
    if (name === 'class' || name === 'className') {
        applyClassName(element, value);
        return;
    }
    if (value == null || value === false) return;
    if (value === true) {
        element.setAttribute(name, '');
        return;
    }
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
            throw new TypeError(`dom: attribute "${name}" must be a finite number`);
        }
        element.setAttribute(name, String(value));
        return;
    }
    if (typeof value === 'string') {
        element.setAttribute(name, value);
        return;
    }
    throw new TypeError(`dom: attribute "${name}" must be a string, number, or boolean`);
}

function writeAttrs(element: Element, attrs: AttrMap): void {
    for (const [name, value] of Object.entries(attrs)) {
        writeAttr(element, name, value);
    }
}

function writeProps(element: Element, props: PropMap): void {
    const target = element as unknown as Record<string, unknown>;
    for (const [key, value] of Object.entries(props)) {
        if (value === undefined) continue;
        target[key] = value;
    }
}

function writeDataset(element: Element, dataset: Record<string, string | number | boolean>): void {
    const data = (element as HTMLElement).dataset;
    for (const [key, value] of Object.entries(dataset)) {
        if (value == null || value === false) continue;
        data[key] = value === true ? '' : String(value);
    }
}

function appendChild(parent: Node, child: Child): void {
    if (child == null || child === false) return;
    if (typeof child === 'string') {
        parent.appendChild(document.createTextNode(child));
        return;
    }
    if (child instanceof Node) {
        parent.appendChild(child);
        return;
    }
    throw new TypeError('dom: children must be strings, nodes, null, undefined, or false');
}

function flattenChildren(value: Child | Child[] | undefined): Child[] {
    if (value == null || value === false) return [];
    return Array.isArray(value) ? value : [value];
}

function appendChildren(parent: Node, children: Child[]): void {
    for (const child of children) {
        appendChild(parent, child);
    }
}

function applyOptions(element: Element, options: CreateOptions): void {
    const classValue = options.class ?? options.className;
    if (classValue != null) applyClassName(element, classValue);
    if (options.dataset) writeDataset(element, options.dataset);
    if (options.attrs) writeAttrs(element, options.attrs);
    if (options.props) writeProps(element, options.props);
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

function createElement(tag: string, ns?: string | null): HTMLElement | SVGElement {
    if (ns) return document.createElementNS(ns, tag) as SVGElement;
    return document.createElement(tag);
}

/**
 * Create an element.
 *
 * Flat attribute map (existing):
 *   `dom.create('button', { type: 'button', class: 'take' }, 'Take')`
 *
 * Options bag (attributes vs properties):
 *   `dom.create('iframe', { attrs: { title: 'Preview' }, props: { src, allowFullscreen: true } })`
 *
 * Do not attach listeners here. Use `this.on()` on the controller or component.
 */
function create<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    attrs?: AttrMap | CreateOptions | null,
    ...children: Child[]
): HTMLElementTagNameMap[K];
function create(
    tag: string,
    attrs?: AttrMap | CreateOptions | null,
    ...children: Child[]
): HTMLElement | SVGElement;
function create(
    tag: string,
    attrs?: AttrMap | CreateOptions | null,
    ...children: Child[]
): HTMLElement | SVGElement {
    const options = isCreateOptions(attrs) ? attrs : null;
    const element = createElement(tag, resolveNamespace(options?.ns));

    if (options) {
        applyOptions(element, options);
        appendChildren(element, [...flattenChildren(options.children), ...children]);
        return element;
    }

    if (attrs) writeAttrs(element, attrs as AttrMap);
    appendChildren(element, children);
    return element;
}

function setAttrs(target: Element | string | null, attrs: AttrMap): Element | null {
    const element = resolveElement(target);
    if (!element) return null;
    writeAttrs(element, attrs);
    return element;
}

function removeAttrs(target: Element | string | null, ...names: string[]): Element | null {
    const element = resolveElement(target);
    if (!element) return null;
    for (const name of names) element.removeAttribute(name);
    return element;
}

function setProps(target: Element | string | null, props: PropMap): Element | null {
    const element = resolveElement(target);
    if (!element) return null;
    writeProps(element, props);
    return element;
}

function assign(
    target: Element | string | null,
    options: Omit<CreateOptions, 'ns' | 'children'>
): Element | null {
    const element = resolveElement(target);
    if (!element) return null;
    applyOptions(element, options);
    return element;
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

    create,
    setAttrs,
    removeAttrs,
    setProps,
    assign,

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

/**
 * NativeCoreJS Test Utilities
 *
 * Lightweight helpers for unit-testing components in a jsdom environment.
 *
 * @example
 * import { mountComponent, waitFor, fireEvent } from 'nativecorejs/testing';
 *
 * const { element, cleanup } = mountComponent('nc-button', { label: 'Click me' });
 * await waitFor(() => element.shadowRoot !== null);
 * fireEvent(element, 'click');
 * cleanup();
 */

export interface MountResult<T extends HTMLElement = HTMLElement> {
    element: T;
    cleanup: () => void;
}

/**
 * Append a custom element to `document.body`, optionally setting attributes.
 * Returns the element and a `cleanup` function that removes it from the DOM.
 *
 * @param tagName  The custom-element tag name (e.g. 'nc-button')
 * @param attrs    Key/value pairs set as attributes on the element
 */
export function mountComponent<T extends HTMLElement = HTMLElement>(
    tagName: string,
    attrs: Record<string, string> = {}
): MountResult<T> {
    const element = document.createElement(tagName) as T;
    for (const [key, value] of Object.entries(attrs)) {
        element.setAttribute(key, value);
    }
    document.body.appendChild(element);
    return {
        element,
        cleanup: () => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        },
    };
}

/**
 * Poll `predicate` every 10 ms until it returns a truthy value or `timeout` ms
 * elapse. Uses `queueMicrotask`-safe polling so promise micro-tasks that mutate
 * the DOM are flushed between checks.
 *
 * @param predicate  Function to test on each tick
 * @param timeout    Max wait time in ms (default 1000)
 */
export function waitFor(predicate: () => boolean | unknown, timeout = 1000): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const start = Date.now();
        function check() {
            if (predicate()) {
                resolve();
                return;
            }
            if (Date.now() - start >= timeout) {
                reject(new Error(`waitFor timed out after ${timeout}ms`));
                return;
            }
            setTimeout(check, 10);
        }
        // Flush any pending microtasks first
        queueMicrotask(check);
    });
}

/**
 * Dispatch a `CustomEvent` on `element`.
 *
 * @param element    Target element
 * @param eventName  Event type string
 * @param detail     Optional detail payload
 */
export function fireEvent(
    element: EventTarget,
    eventName: string,
    detail?: unknown
): void {
    element.dispatchEvent(
        new CustomEvent(eventName, { bubbles: true, composed: true, detail })
    );
}

export interface MountControllerResult {
    root: HTMLElement;
    cleanup: () => void;
}

type ControllerFactory = (
    params: Record<string, string>,
    state?: unknown,
    loaderData?: unknown,
    rootElement?: HTMLElement
) => (() => void) | void | Promise<(() => void) | void>;

/**
 * Mount a controller against an HTML snippet. Appends a `[data-view]` root,
 * runs the factory, and returns a cleanup that destroys the controller and
 * removes the root.
 */
export function mountController(
    html: string,
    factory: ControllerFactory
): MountControllerResult {
    const root = document.createElement('div');
    root.setAttribute('data-view', 'test');
    root.innerHTML = html;
    document.body.appendChild(root);

    const result = factory({}, undefined, undefined, root);
    let destroy: (() => void) | void;
    if (typeof result === 'function') destroy = result;

    return {
        root,
        cleanup: () => {
            destroy?.();
            if (root.parentNode) root.parentNode.removeChild(root);
        },
    };
}

export interface NavigateWaitRouter {
    navigate(path: string, state?: unknown): void | Promise<void>;
}

/**
 * Navigate and wait for `pageloaded` or reject on `nativecore:route-error`.
 */
export function navigateAndWait(
    router: NavigateWaitRouter,
    path: string,
    timeout = 1000
): Promise<unknown> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            cleanup();
            reject(new Error(`navigateAndWait timed out after ${timeout}ms waiting for ${path}`));
        }, timeout);

        const onLoaded = (event: Event) => {
            cleanup();
            resolve((event as CustomEvent).detail);
        };
        const onError = (event: Event) => {
            cleanup();
            reject((event as CustomEvent).detail ?? new Error(`Route error navigating to ${path}`));
        };

        function cleanup() {
            clearTimeout(timer);
            window.removeEventListener('pageloaded', onLoaded);
            window.removeEventListener('nativecore:route-error', onError);
        }

        window.addEventListener('pageloaded', onLoaded, { once: true });
        window.addEventListener('nativecore:route-error', onError, { once: true });
        void router.navigate(path);
    });
}

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

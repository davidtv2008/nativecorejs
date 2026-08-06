/**
 * NativeCore test utilities (vendored into apps for JS/TS scaffolds).
 *
 * Prefer: import { mountComponent, waitFor, fireEvent } from '@testing/index.js';
 */

/**
 * Append a custom element to `document.body`, optionally setting attributes.
 * @param {string} tagName
 * @param {Record<string, string>} [attrs]
 */
export function mountComponent(tagName, attrs = {}) {
    const element = document.createElement(tagName);
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
 * Poll `predicate` until truthy or timeout.
 * @param {() => unknown} predicate
 * @param {number} [timeout]
 */
export function waitFor(predicate, timeout = 1000) {
    return new Promise((resolve, reject) => {
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
        queueMicrotask(check);
    });
}

/**
 * Dispatch a CustomEvent on `element`.
 * @param {EventTarget} element
 * @param {string} eventName
 * @param {unknown} [detail]
 */
export function fireEvent(element, eventName, detail) {
    element.dispatchEvent(
        new CustomEvent(eventName, { bubbles: true, composed: true, detail })
    );
}

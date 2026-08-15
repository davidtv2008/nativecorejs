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

/**
 * Mount a controller against an HTML snippet.
 * @param {string} html
 * @param {Function} factory
 */
export function mountController(html, factory) {
    const root = document.createElement('div');
    root.setAttribute('data-view', 'test');
    root.innerHTML = html;
    document.body.appendChild(root);
    const result = factory({}, undefined, undefined, root);
    let destroy = typeof result === 'function' ? result : undefined;
    return {
        root,
        cleanup: () => {
            destroy?.();
            if (root.parentNode) root.parentNode.removeChild(root);
        },
    };
}

/**
 * Navigate and wait for pageloaded / nativecore:route-error.
 * @param {{ navigate: (path: string) => unknown }} router
 * @param {string} path
 * @param {number} [timeout]
 */
export function navigateAndWait(router, path, timeout = 1000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            cleanup();
            reject(new Error(`navigateAndWait timed out after ${timeout}ms waiting for ${path}`));
        }, timeout);

        const onLoaded = (event) => {
            cleanup();
            resolve(event.detail);
        };
        const onError = (event) => {
            cleanup();
            reject(event.detail ?? new Error(`Route error navigating to ${path}`));
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

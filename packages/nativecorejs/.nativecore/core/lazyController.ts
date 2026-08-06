/**
 * createLazyController
 *
 * Factory that returns a lazyController helper bound to the caller's module URL.
 */
import { bustCache } from '../utils/cacheBuster.js';
import type { ControllerFunction } from '@core/router.js';

// Cache import() promises so repeated navigations to the same route never
// re-hit the network for an already-loaded controller module.
// Keyed by the bust-cached URL so HMR version bumps automatically produce
// a new key and trigger a fresh import.
const modulePromiseCache = new Map<string, Promise<any>>();

export function createLazyController(base: string) {
    return function lazyController(controllerName: string, controllerPath: string): ControllerFunction {
        return async (...args: any[]) => {
            const resolved = new URL(controllerPath, base).href;
            const bustedUrl = bustCache(resolved);
            let modulePromise = modulePromiseCache.get(bustedUrl);
            if (!modulePromise) {
                modulePromise = import(bustedUrl);
                modulePromiseCache.set(bustedUrl, modulePromise);
            }
            const module = await modulePromise;
            const exportedController = module[controllerName];
            const isClass = typeof exportedController === 'function' &&
                /^class\s/.test(Function.prototype.toString.call(exportedController));

            // If it's a class controller, instantiate it with the route root element.
            if (isClass) {
                const rootElement = document.getElementById('main-content');
                if (!rootElement) {
                    console.error('Controller root element (#main-content) not found');
                    return;
                }
                const instance = new exportedController(rootElement, ...args);
                return () => instance.destroy();
            }

            // Functional controller factory (recommended default).
            if (typeof exportedController === 'function') {
                return exportedController(...args);
            }

            throw new Error(`Controller export "${controllerName}" is not a function in ${resolved}`);
        };
    };
}

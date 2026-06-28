/**
 * createLazyController
 *
 * Factory that returns a lazyController helper bound to the caller's module URL.
 */
import { bustCache } from '../utils/cacheBuster.js';
import type { ControllerFunction } from '@core/router.js';

export function createLazyController(base: string) {
    return function lazyController(controllerName: string, controllerPath: string): ControllerFunction {
        return async (...args: any[]) => {
            const resolved = new URL(controllerPath, base).href;
            const module = await import(bustCache(resolved));
            const ControllerClass = module[controllerName];

            // If it's a class (constructor), instantiate it
            if (typeof ControllerClass === 'function' && ControllerClass.prototype) {
                const rootElement = document.getElementById('main-content');
                if (!rootElement) {
                    console.error('Controller root element (#main-content) not found');
                    return;
                }
                const instance = new ControllerClass(rootElement, ...args);
                return () => instance.destroy();
            }

            // Fallback for functional controllers
            return ControllerClass(...args);
        };
    };
}

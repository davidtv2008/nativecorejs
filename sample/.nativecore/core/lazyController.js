/**
 * createLazyController
 *
 * Factory that returns a lazyController helper bound to the caller's module URL.
 * Passing import.meta.url from routes.ts ensures dynamic import() paths are
 * resolved relative to routes.ts — not relative to this helper's location.
 *
 * Usage in routes.ts:
 *   import { createLazyController } from '@core/lazyController.js';
 *   const lazyController = createLazyController(import.meta.url);
 *   lazyController('tasksController', '../controllers/tasks.controller.js')
 */
import { bustCache } from '../utils/cacheBuster.js';
export function createLazyController(base) {
    return function lazyController(controllerName, controllerPath) {
        return async (...args) => {
            const resolved = new URL(controllerPath, base).href;
            const module = await import(bustCache(resolved));
            return module[controllerName](...args);
        };
    };
}

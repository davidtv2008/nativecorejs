import { bustCache } from "../utils/cacheBuster.js";
function createLazyController(base) {
  return function lazyController(controllerName, controllerPath) {
    return async (...args) => {
      const resolved = new URL(controllerPath, base).href;
      const module = await import(bustCache(resolved));
      return module[controllerName](...args);
    };
  };
}
export {
  createLazyController
};

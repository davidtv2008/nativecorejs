import { bustCache } from "../utils/cacheBuster.js";
function isValidModulePath(modulePath) {
  const normalized = modulePath.trim().toLowerCase();
  if (/^https?:\/\//i.test(normalized) || normalized.startsWith("//")) {
    return false;
  }
  if (/^(javascript|data|vbscript|blob):/i.test(normalized)) {
    return false;
  }
  if (normalized.includes("..")) {
    return false;
  }
  return true;
}
class ComponentRegistry {
  components = /* @__PURE__ */ new Map();
  loaded = /* @__PURE__ */ new Set();
  observer = null;
  /** Prefix prepended to relative `./` module paths. Configurable via {@link setBasePath}. */
  basePath = "/dist/src/components/";
  /**
   * Override the base path used to resolve relative `./component.js` module
   * specifiers. Defaults to `/dist/src/components/` for backwards
   * compatibility with the legacy build layout. Set to `''` to disable
   * rewriting and pass module paths through unchanged.
   */
  setBasePath(path) {
    this.basePath = path.endsWith("/") || path === "" ? path : `${path}/`;
  }
  register(tagName, modulePath) {
    if (!isValidModulePath(modulePath)) {
      console.error(`[ComponentRegistry] Blocked unsafe module path for <${tagName}>: ${modulePath}`);
      return;
    }
    this.components.set(tagName, modulePath);
  }
  async loadComponent(tagName) {
    if (this.loaded.has(tagName) || customElements.get(tagName)) {
      this.loaded.add(tagName);
      return;
    }
    const modulePath = this.components.get(tagName);
    if (!modulePath) {
      console.warn(`Component ${tagName} not registered`);
      return;
    }
    try {
      const absolutePath = modulePath.startsWith("./") ? `${this.basePath}${modulePath.slice(2)}` : modulePath;
      const finalPath = bustCache(absolutePath);
      await import(finalPath);
      this.loaded.add(tagName);
    } catch (error) {
      console.error(`Failed to load component ${tagName}:`, error);
    }
  }
  async scanAndLoad(root = document.body) {
    const promises = [];
    for (const tagName of this.components.keys()) {
      if (!this.loaded.has(tagName)) {
        const elements = root.querySelectorAll(tagName);
        if (elements.length > 0) {
          promises.push(this.loadComponent(tagName));
        }
      }
    }
    await Promise.all(promises);
  }
  startObserving() {
    if (this.observer) return;
    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.scanAndLoad(node);
            }
          });
        }
      }
    });
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  stopObserving() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}
const componentRegistry = new ComponentRegistry();
async function initLazyComponents() {
  await componentRegistry.scanAndLoad();
  componentRegistry.startObserving();
}
export {
  componentRegistry,
  initLazyComponents
};

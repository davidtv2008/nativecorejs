import { useState, effect } from "../core/state.js";
import { registerPageCleanup } from "../core/pageCleanupRegistry.js";
function wireAttributes(options = {}) {
  const resolvedRoot = options.root ?? document.querySelector("[data-view]");
  if (!resolvedRoot) {
    console.warn("[wireAttributes] no [data-view] element found \u2014 nothing to wire");
    return {};
  }
  const disposers = [];
  const attrs = {};
  resolvedRoot.querySelectorAll("[wire-attribute]").forEach((el) => {
    const raw = el.getAttribute("wire-attribute");
    const colonIndex = raw.indexOf(":");
    if (colonIndex === -1) {
      console.warn(
        `[wireAttributes] invalid wire-attribute value "${raw}" \u2014 expected format "stateKey:attribute-name" (e.g. "status:data-status")`
      );
      return;
    }
    const key = raw.slice(0, colonIndex).trim();
    const attrName = raw.slice(colonIndex + 1).trim();
    if (!attrs[key]) {
      attrs[key] = useState(el.getAttribute(attrName) ?? "");
    }
    const state = attrs[key];
    disposers.push(effect(() => {
      el.setAttribute(attrName, state.value);
    }));
  });
  registerPageCleanup(() => disposers.forEach((d) => d()));
  return attrs;
}
export {
  wireAttributes
};

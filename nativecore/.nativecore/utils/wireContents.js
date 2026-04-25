import { useState, effect } from "../core/state.js";
import { registerPageCleanup } from "../core/pageCleanupRegistry.js";
function wireContents(options = {}) {
  const resolvedRoot = options.root ?? document.querySelector("[data-view]");
  if (!resolvedRoot) {
    console.warn("[wireContents] no [data-view] element found \u2014 nothing to wire");
    return {};
  }
  const disposers = [];
  const bindings = {};
  resolvedRoot.querySelectorAll("[wire-content]").forEach((el) => {
    const key = el.getAttribute("wire-content");
    if (!bindings[key]) {
      bindings[key] = useState(el.textContent ?? "");
    }
    const state = bindings[key];
    disposers.push(effect(() => {
      el.textContent = state.value;
    }));
  });
  registerPageCleanup(() => disposers.forEach((d) => d()));
  return bindings;
}
export {
  wireContents
};

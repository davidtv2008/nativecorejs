import { useState, effect } from "../core/state.js";
import { registerPageCleanup } from "../core/pageCleanupRegistry.js";
function wireInputs(options = {}) {
  const resolvedRoot = options.root ?? document.querySelector("[data-view]");
  if (!resolvedRoot) {
    console.warn("[wireInputs] no [data-view] element found \u2014 nothing to wire");
    return {};
  }
  const disposers = [];
  const models = {};
  resolvedRoot.querySelectorAll("[wire-input]").forEach((el) => {
    const key = el.getAttribute("wire-input");
    const overrides = options.overrides?.[key] ?? {};
    const isCheckable = el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio");
    const isNumber = el instanceof HTMLInputElement && el.type === "number";
    if (!models[key]) {
      let initial;
      if (isCheckable) {
        initial = el.checked;
      } else if (isNumber) {
        initial = el.value ? Number(el.value) : 0;
      } else {
        initial = el.value ?? "";
      }
      models[key] = useState(initial);
    }
    const state = models[key];
    const eventName = overrides.event ?? (isCheckable ? "change" : "input");
    const propName = overrides.prop ?? (isCheckable ? "checked" : "value");
    disposers.push(effect(() => {
      el[propName] = state.value;
    }));
    const handler = (e) => {
      state.value = e.target[propName];
    };
    el.addEventListener(eventName, handler);
    disposers.push(() => el.removeEventListener(eventName, handler));
  });
  registerPageCleanup(() => disposers.forEach((d) => d()));
  return models;
}
export {
  wireInputs
};

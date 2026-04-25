import { registerPageCleanup } from "../core/pageCleanupRegistry.js";
function on(selectorOrElement, eventName, handler) {
  const elements = typeof selectorOrElement === "string" ? Array.from(document.querySelectorAll(selectorOrElement)) : selectorOrElement ? [selectorOrElement] : [];
  elements.forEach((el) => {
    el.addEventListener(eventName, handler);
  });
  return () => {
    elements.forEach((el) => {
      el.removeEventListener(eventName, handler);
    });
  };
}
function bindEvents(bindings) {
  const cleanups = [];
  for (const [eventName, handlers] of Object.entries(bindings)) {
    for (const [selector, handler] of Object.entries(handlers)) {
      cleanups.push(on(selector, eventName, handler));
    }
  }
  return () => {
    cleanups.forEach((cleanup) => cleanup());
  };
}
const onClick = (selectorOrElement, handler) => on(selectorOrElement, "click", handler);
const onChange = (selectorOrElement, handler) => on(selectorOrElement, "change", handler);
const onInput = (selectorOrElement, handler) => on(selectorOrElement, "input", handler);
const onSubmit = (selectorOrElement, handler) => on(selectorOrElement, "submit", handler);
const onKeydown = (selectorOrElement, handler) => on(selectorOrElement, "keydown", handler);
const onKeyup = (selectorOrElement, handler) => on(selectorOrElement, "keyup", handler);
const onFocus = (selectorOrElement, handler) => on(selectorOrElement, "focus", handler);
const onBlur = (selectorOrElement, handler) => on(selectorOrElement, "blur", handler);
const onFocusin = (selectorOrElement, handler) => on(selectorOrElement, "focusin", handler);
const onFocusout = (selectorOrElement, handler) => on(selectorOrElement, "focusout", handler);
const onScroll = (selectorOrElement, handler) => on(selectorOrElement, "scroll", handler);
const onMouseenter = (selectorOrElement, handler) => on(selectorOrElement, "mouseenter", handler);
const onMouseleave = (selectorOrElement, handler) => on(selectorOrElement, "mouseleave", handler);
const onDblclick = (selectorOrElement, handler) => on(selectorOrElement, "dblclick", handler);
function delegate(containerSelector, eventName, targetSelector, handler) {
  const container = document.querySelector(containerSelector);
  if (!container) return () => {
  };
  const delegateHandler = (event) => {
    const target = event.target.closest(targetSelector);
    if (target && container.contains(target)) {
      handler(event, target);
    }
  };
  container.addEventListener(eventName, delegateHandler);
  return () => {
    container.removeEventListener(eventName, delegateHandler);
  };
}
function trackEvents() {
  const cleanupFunctions = [];
  const tracker = {
    on(selectorOrElement, eventName, handler) {
      cleanupFunctions.push(on(selectorOrElement, eventName, handler));
    },
    /** Alias for on() */
    add(selectorOrElement, eventName, handler) {
      cleanupFunctions.push(on(selectorOrElement, eventName, handler));
    },
    onClick(selectorOrElement, handler) {
      cleanupFunctions.push(onClick(selectorOrElement, handler));
    },
    onChange(selectorOrElement, handler) {
      cleanupFunctions.push(onChange(selectorOrElement, handler));
    },
    onInput(selectorOrElement, handler) {
      cleanupFunctions.push(onInput(selectorOrElement, handler));
    },
    onSubmit(selectorOrElement, handler) {
      cleanupFunctions.push(onSubmit(selectorOrElement, handler));
    },
    onKeydown(selectorOrElement, handler) {
      cleanupFunctions.push(onKeydown(selectorOrElement, handler));
    },
    onKeyup(selectorOrElement, handler) {
      cleanupFunctions.push(onKeyup(selectorOrElement, handler));
    },
    onFocus(selectorOrElement, handler) {
      cleanupFunctions.push(onFocus(selectorOrElement, handler));
    },
    onBlur(selectorOrElement, handler) {
      cleanupFunctions.push(onBlur(selectorOrElement, handler));
    },
    onFocusin(selectorOrElement, handler) {
      cleanupFunctions.push(onFocusin(selectorOrElement, handler));
    },
    onFocusout(selectorOrElement, handler) {
      cleanupFunctions.push(onFocusout(selectorOrElement, handler));
    },
    onScroll(selectorOrElement, handler) {
      cleanupFunctions.push(onScroll(selectorOrElement, handler));
    },
    onMouseenter(selectorOrElement, handler) {
      cleanupFunctions.push(onMouseenter(selectorOrElement, handler));
    },
    onMouseleave(selectorOrElement, handler) {
      cleanupFunctions.push(onMouseleave(selectorOrElement, handler));
    },
    onDblclick(selectorOrElement, handler) {
      cleanupFunctions.push(onDblclick(selectorOrElement, handler));
    },
    delegate(containerSelector, eventName, targetSelector, handler) {
      cleanupFunctions.push(delegate(containerSelector, eventName, targetSelector, handler));
    },
    cleanup() {
      cleanupFunctions.forEach((cleanup) => cleanup());
      cleanupFunctions.length = 0;
    }
  };
  registerPageCleanup(() => tracker.cleanup());
  return tracker;
}
function trackSubscriptions() {
  const unsubscribers = [];
  return {
    /**
     * Register a state watcher unsubscribe function
     * Pass the return value of any .watch() call directly
     * @example subs.watch(myState.watch(val => doSomething(val)));
     */
    watch(unsubscribe) {
      unsubscribers.push(unsubscribe);
    },
    cleanup() {
      unsubscribers.forEach((fn) => fn());
      unsubscribers.length = 0;
    }
  };
}
export {
  bindEvents,
  delegate,
  on,
  onBlur,
  onChange,
  onClick,
  onDblclick,
  onFocus,
  onFocusin,
  onFocusout,
  onInput,
  onKeydown,
  onKeyup,
  onMouseenter,
  onMouseleave,
  onScroll,
  onSubmit,
  trackEvents,
  trackSubscriptions
};

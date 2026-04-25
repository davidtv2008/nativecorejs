import { registerPageCleanup } from "./pageCleanupRegistry.js";
let currentTracker = null;
const DEFAULT_EFFECT_MAX_RUNS_PER_FLUSH = 1e3;
const EFFECT_LOOP_GUARD_EVENT = "nativecore:effect-loop-guard";
let batchDepth = 0;
const pendingNotifications = /* @__PURE__ */ new Set();
let currentFlushId = 0;
let notificationDepth = 0;
function runNotificationFlush(fn) {
  const isRootFlush = notificationDepth === 0;
  if (isRootFlush) currentFlushId++;
  notificationDepth++;
  try {
    fn();
  } finally {
    notificationDepth--;
  }
}
function reportEffectLoopGuard(detail) {
  console.warn(
    `[NativeCore] effect loop guard tripped after ${detail.runs} runs in a single update cycle (threshold: ${detail.threshold}). Effect disposed.`
  );
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EFFECT_LOOP_GUARD_EVENT, {
      detail
    }));
  }
}
function batch(fn) {
  batchDepth++;
  try {
    fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) {
      const notifications = Array.from(pendingNotifications);
      pendingNotifications.clear();
      runNotificationFlush(() => {
        notifications.forEach((notify) => notify());
      });
    }
  }
}
const FORBIDDEN_KEYS = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
function sanitizeValue(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }
  const obj = value;
  let needsClean = false;
  for (const key of Object.keys(obj)) {
    if (FORBIDDEN_KEYS.has(key)) {
      needsClean = true;
      break;
    }
    if (typeof obj[key] === "object" && obj[key] !== null) {
      needsClean = true;
      break;
    }
  }
  if (!needsClean) return value;
  const clean = {};
  for (const key of Object.keys(obj)) {
    if (FORBIDDEN_KEYS.has(key)) continue;
    clean[key] = sanitizeValue(obj[key]);
  }
  return clean;
}
function createState(initialValue) {
  let currentValue = sanitizeValue(initialValue);
  const subscribers = /* @__PURE__ */ new Set();
  const state = {
    // Getter/setter for value property
    get value() {
      return currentValue;
    },
    set value(newValue) {
      const safe = sanitizeValue(newValue);
      if (Object.is(currentValue, safe)) return;
      currentValue = safe;
      notify();
    },
    // Set method (supports updater function like React)
    set(valueOrUpdater) {
      const rawValue = typeof valueOrUpdater === "function" ? valueOrUpdater(currentValue) : valueOrUpdater;
      const newValue = sanitizeValue(rawValue);
      if (Object.is(currentValue, newValue)) return;
      currentValue = newValue;
      notify();
    },
    // Watch for changes (like useEffect watching a dependency)
    watch(callback) {
      const wrappedCallback = () => callback(currentValue);
      subscribers.add(wrappedCallback);
      return () => subscribers.delete(wrappedCallback);
    }
  };
  function notify() {
    if (batchDepth > 0) {
      subscribers.forEach((fn) => pendingNotifications.add(fn));
    } else {
      runNotificationFlush(() => {
        subscribers.forEach((fn) => fn());
      });
    }
  }
  return state;
}
function useState(initialValue) {
  const state = createState(initialValue);
  const trackedState = {
    get value() {
      if (currentTracker) {
        currentTracker.accessed.add(state);
      }
      return state.value;
    },
    set value(newValue) {
      state.value = newValue;
    },
    set: state.set.bind(state),
    watch: state.watch.bind(state)
  };
  return trackedState;
}
function computed(computeFn) {
  const derivedState = createState(void 0);
  const trackedDeps = /* @__PURE__ */ new Set();
  const depUnsubscribers = /* @__PURE__ */ new Map();
  let isComputing = false;
  const tracker = {
    accessed: /* @__PURE__ */ new Set()
  };
  recompute();
  function recompute() {
    if (isComputing) return;
    isComputing = true;
    tracker.accessed.clear();
    currentTracker = tracker;
    try {
      const newValue = computeFn();
      derivedState.value = newValue;
    } finally {
      currentTracker = null;
      isComputing = false;
    }
    syncTrackedDependencies(trackedDeps, tracker.accessed, depUnsubscribers, recompute);
  }
  function dispose() {
    depUnsubscribers.forEach((unsub) => unsub());
    depUnsubscribers.clear();
    trackedDeps.clear();
  }
  const computedState = {
    get value() {
      if (currentTracker) {
        currentTracker.accessed.add(derivedState);
      }
      return derivedState.value;
    },
    watch: derivedState.watch.bind(derivedState),
    dispose,
    // Read-only, no setter
    set value(_) {
      console.warn("Computed values are read-only. Cannot set value directly.");
    }
  };
  registerPageCleanup(dispose);
  return computedState;
}
function effect(effectFn, options = {}) {
  const trackedDeps = /* @__PURE__ */ new Set();
  const depUnsubscribers = /* @__PURE__ */ new Map();
  const tracker = {
    accessed: /* @__PURE__ */ new Set()
  };
  let cleanup;
  let isRunning = false;
  let isDisposed = false;
  let lastFlushId = -1;
  let runsThisFlush = 0;
  const maxRunsPerFlush = options.maxRunsPerFlush ?? DEFAULT_EFFECT_MAX_RUNS_PER_FLUSH;
  const disposer = () => {
    if (isDisposed) return;
    isDisposed = true;
    if (typeof cleanup === "function") {
      cleanup();
    }
    depUnsubscribers.forEach((unsub) => unsub());
    depUnsubscribers.clear();
    trackedDeps.clear();
  };
  runEffect();
  registerPageCleanup(disposer);
  return disposer;
  function runEffect() {
    if (isDisposed || isRunning) return;
    const flushId = currentFlushId;
    if (flushId !== lastFlushId) {
      lastFlushId = flushId;
      runsThisFlush = 0;
    }
    runsThisFlush++;
    if (maxRunsPerFlush > 0 && runsThisFlush > maxRunsPerFlush) {
      reportEffectLoopGuard({
        threshold: maxRunsPerFlush,
        runs: runsThisFlush,
        ts: Date.now()
      });
      disposer();
      return;
    }
    isRunning = true;
    tracker.accessed.clear();
    currentTracker = tracker;
    try {
      if (typeof cleanup === "function") {
        cleanup();
      }
      cleanup = effectFn();
    } finally {
      currentTracker = null;
      isRunning = false;
    }
    syncTrackedDependencies(trackedDeps, tracker.accessed, depUnsubscribers, runEffect);
  }
}
function syncTrackedDependencies(trackedDeps, nextDeps, depUnsubscribers, onDependencyChange) {
  trackedDeps.forEach((dep) => {
    if (!nextDeps.has(dep)) {
      depUnsubscribers.get(dep)?.();
      depUnsubscribers.delete(dep);
      trackedDeps.delete(dep);
    }
  });
  nextDeps.forEach((dep) => {
    if (!trackedDeps.has(dep)) {
      trackedDeps.add(dep);
      depUnsubscribers.set(dep, dep.watch(() => onDependencyChange()));
    }
  });
}
export {
  batch,
  computed,
  effect,
  useState
};

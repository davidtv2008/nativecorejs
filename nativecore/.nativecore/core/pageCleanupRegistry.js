const cleanups = [];
let paused = false;
function registerPageCleanup(fn) {
  if (!paused) {
    cleanups.push(fn);
  }
}
function flushPageCleanups() {
  for (const fn of cleanups) {
    try {
      fn();
    } catch (e) {
      console.error("[PageCleanupRegistry] cleanup error:", e);
    }
  }
  cleanups.length = 0;
}
function pausePageCleanupCollection() {
  paused = true;
}
function resumePageCleanupCollection() {
  paused = false;
}
export {
  flushPageCleanups,
  pausePageCleanupCollection,
  registerPageCleanup,
  resumePageCleanupCollection
};

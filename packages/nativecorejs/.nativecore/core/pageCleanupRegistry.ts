/**
 * Page Cleanup Registry
 *
 * A lightweight singleton that collects teardown callbacks from reactive
 * primitives (effect, computed) and event trackers (trackEvents) created
 * during a controller's lifecycle.  The router flushes the registry on
 * every navigation so that leaked subscriptions and listeners are always
 * cleaned up, even when a controller forgets to return a cleanup function.
 *
 * Usage inside framework primitives (not user-facing):
 *   registerPageCleanup(disposer);
 *
 * Usage inside the router (before rendering the next page):
 *   flushPageCleanups();
 *
 * Usage inside app-level bootstrap code that must survive navigations:
 *   pausePageCleanupCollection();
 *   // … create long-lived effects/trackers here …
 *   resumePageCleanupCollection();
 */

type CleanupFn = () => void;

const cleanups: CleanupFn[] = [];
let paused = false;

/**
 * Register a cleanup function to be called on the next page flush.
 * Called automatically by effect(), computed(), and trackEvents().
 */
export function registerPageCleanup(fn: CleanupFn): void {
    if (!paused) {
        cleanups.push(fn);
    }
}

/**
 * Call every registered cleanup function and then empty the registry.
 * Called by the router before mounting the next route's controller.
 */
export function flushPageCleanups(): void {
    for (const fn of cleanups) {
        try { fn(); } catch (e) { console.error('[PageCleanupRegistry] cleanup error:', e); }
    }
    cleanups.length = 0;
}

/**
 * Stop collecting new cleanups.  Use this to protect app-level primitives
 * (e.g. created in app.ts) that must survive across all navigations.
 */
export function pausePageCleanupCollection(): void {
    paused = true;
}

/**
 * Resume collecting cleanups for the current (or next) page controller.
 */
export function resumePageCleanupCollection(): void {
    paused = false;
}

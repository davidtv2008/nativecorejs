/**
 * NativeCoreJS Plugin API
 *
 * A plugin is a plain object that provides optional lifecycle hooks. Plugins are
 * installed once, globally, before `router.start()` is called. All hooks receive
 * the minimum information they need and may return a cleanup function.
 *
 * @example
 * ```typescript
 * import { registerPlugin } from 'nativecorejs';
 *
 * registerPlugin({
 *     name: 'my-analytics',
 *     onNavigate({ path, params }) {
 *         analytics.page(path, params);
 *     },
 * });
 * ```
 */

import router, { type RouteMatch } from '../.nativecore/core/router.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NCPluginNavigateContext {
    /** The matched route path pattern, e.g. `/tasks/:id`. */
    path: string;
    /** Extracted URL parameters, e.g. `{ id: '42' }`. */
    params: Record<string, string>;
    /** The full matched route config. */
    match: RouteMatch;
}

export interface NCPlugin {
    /**
     * Unique plugin identifier used for debugging and deduplication.
     * Attempting to register two plugins with the same name throws.
     */
    name: string;

    /**
     * Called once, immediately after `registerPlugin()` is invoked.
     * Use for one-time initialisation (e.g. injecting DOM nodes, setting globals).
     *
     * @returns An optional cleanup function that will be called if the plugin is
     *   ever unregistered (see `unregisterPlugin()`).
     */
    onInstall?: () => (() => void) | void;

    /**
     * Called on every navigation, immediately *before* the page controller runs.
     * Analogous to a router middleware but read-only — it cannot cancel navigation.
     */
    onNavigate?: (ctx: NCPluginNavigateContext) => void;

    /**
     * Called on every navigation, immediately *after* the page controller has
     * run and the `pageloaded` event has fired.
     */
    onNavigated?: (ctx: NCPluginNavigateContext) => void;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

// Keyed by plugin name for O(1) deduplication lookup.
const _plugins = new Map<string, { plugin: NCPlugin; cleanup: (() => void) | undefined }>();

/**
 * Returns an array of the currently registered plugin names.
 * Useful for devtools and diagnostic logging.
 */
export function listPlugins(): string[] {
    return Array.from(_plugins.keys());
}

// ─── Internal navigation bridge ───────────────────────────────────────────────

// We attach *once* to the router's native events, not once-per-plugin, so that
// plugin registration order never affects listener count.
let _bridgeInstalled = false;

function ensureBridgeInstalled(): void {
    if (_bridgeInstalled) return;
    _bridgeInstalled = true;

    // Before controller: nc-route-loading fires before the controller runs.
    window.addEventListener('nc-route-loading', (e: Event) => {
        const detail = (e as CustomEvent<{ path: string; params: Record<string, string> }>).detail;
        const match = router.getCurrentRoute();
        if (!match) return;
        const ctx: NCPluginNavigateContext = { path: detail.path, params: detail.params, match };
        for (const { plugin } of _plugins.values()) {
            try { plugin.onNavigate?.(ctx); } catch (err) { console.warn(`[NCPlugin:${plugin.name}] onNavigate error`, err); }
        }
    });

    // After controller: pageloaded fires after the controller and DOM updates.
    window.addEventListener('pageloaded', (e: Event) => {
        const match = (e as CustomEvent<RouteMatch>).detail;
        if (!match) return;
        const ctx: NCPluginNavigateContext = { path: match.path, params: match.params, match };
        for (const { plugin } of _plugins.values()) {
            try { plugin.onNavigated?.(ctx); } catch (err) { console.warn(`[NCPlugin:${plugin.name}] onNavigated error`, err); }
        }
    });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Register a NativeCoreJS plugin.
 *
 * Call this before `router.start()` — typically at the top of `app.ts`.
 * Plugins with no lifecycle hooks are accepted and recorded (they may still
 * be useful for introspection / devtools).
 *
 * @throws {Error} If a plugin with the same name is already registered.
 */
export function registerPlugin(plugin: NCPlugin): void {
    if (_plugins.has(plugin.name)) {
        throw new Error(`NCPlugin "${plugin.name}" is already registered. Use a unique name.`);
    }

    ensureBridgeInstalled();

    let cleanup: (() => void) | undefined;
    if (plugin.onInstall) {
        const result = plugin.onInstall();
        cleanup = typeof result === 'function' ? result : undefined;
    }

    _plugins.set(plugin.name, { plugin, cleanup });
}

/**
 * Remove a previously registered plugin and run its cleanup function.
 * Silently no-ops if the plugin is not registered.
 */
export function unregisterPlugin(name: string): void {
    const entry = _plugins.get(name);
    if (!entry) return;
    try { entry.cleanup?.(); } catch (err) { console.warn(`[NCPlugin:${name}] cleanup error`, err); }
    _plugins.delete(name);
}

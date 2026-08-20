/**
 * SPA Router - Handles navigation without page reloads
 * Uses History API to manage URLs dynamically
 */

import { bustCache } from '../utils/cacheBuster.js';
import { flushPageCleanups } from '../core/pageCleanupRegistry.js';

// Types
export interface CachePolicy {
    /** Seconds before the cached HTML is considered stale. Routes without an explicit policy default to 300 s. */
    ttl: number;
    /**
     * When true, serve stale HTML instantly while refreshing in the background.
     * When false (default), block navigation until fresh HTML is fetched.
     */
    revalidate?: boolean;
}

export interface RouteConfig {
    htmlFile: string;
    controller?: ControllerFunction | null;
    loader?: (params: Record<string, string>, signal: AbortSignal) => Promise<unknown>;
    cachePolicy?: CachePolicy;
    /**
     * Path of another registered route used as a layout shell.
     * That route may also set `layout`, forming an outer-to-inner chain.
     * Each layout HTML file must contain `#route-outlet` (or `[data-route-outlet]`).
     */
    layout?: string;
    /** Disable page enter/exit animation for this route. */
    disableTransition?: boolean;
    /** Document title after a successful navigation. */
    title?: string | ((match: RouteMatch) => string);
    /** `<meta name>` tags to set or create after a successful navigation. */
    meta?: Record<string, string> | ((match: RouteMatch) => Record<string, string>);
}

/** Dispatched on `window` when a route fails to load. Listen for a custom error UI. */
export const ROUTE_ERROR_EVENT = 'nativecore:route-error';

/** Safety cap for `layout` → `layout` walks (cycles throw before this). */
const MAX_LAYOUT_DEPTH = 8;

export interface RouteMatch {
    /** Registered route pattern (e.g. `/courses/:slug`). */
    path: string;
    /** Browser path that matched this route (e.g. `/courses/brt`). */
    requestPath?: string;
    params: Record<string, string>;
    config: RouteConfig;
}

export type ControllerFunction = (
    params: Record<string, string>,
    state?: any,
    loaderData?: unknown,
    rootElement?: HTMLElement
) => Promise<(() => void) | void> | (() => void) | void;
export type MiddlewareFunction = (route: RouteMatch, state?: any) => Promise<boolean> | boolean;

interface CacheEntry {
    html: string;
    cachedAt: number;
    ttl: number;
}

interface RouterCacheSnapshotEntry {
    file: string;
    ageMs: number;
    ttlSec: number;
    fresh: boolean;
    stale: boolean;
}

interface RouterCacheSnapshot {
    total: number;
    fresh: number;
    stale: number;
    entries: RouterCacheSnapshotEntry[];
}

interface RouteDebugEntry {
    path: string;
    htmlFile: string;
    hasCachePolicy: boolean;
    ttlSec: number;
    revalidate: boolean;
    cacheStatus: 'uncached' | 'fresh' | 'stale' | 'no-policy';
    ageMs: number;
    hasLayout: boolean;
    layoutDepth: number;
    hasLoader: boolean;
}

interface RouteDebugInfo {
    total: number;
    cached: number;
    currentPath: string | null;
    routes: RouteDebugEntry[];
}

export class Router {
    private routes: Record<string, RouteConfig> = {};
    private currentRoute: RouteMatch | null = null;
    private middlewares: MiddlewareFunction[] = [];
    private htmlCache: Map<string, CacheEntry> = new Map();
    /**
     * Tracks the last file + HTML string written to each content container.
     * Keyed by the target element so layout outlets and main-content are
     * tracked independently. Skip innerHTML only when BOTH the file AND the
     * HTML string match what is already in that specific container.
     */
    private renderedHtmlCache: WeakMap<Element, { file: string; html: string }> = new WeakMap();
    private pageScripts: Record<string, { cleanup?: () => void }> = {};
    private navigationController: AbortController | null = null;
    private isNavigating = false;
    private renderedLayoutChain: string[] = [];
    private layoutScripts: Record<string, { cleanup?: () => void }> = {};
    private layoutRoots = new Map<string, HTMLElement>();
    private _groupMiddlewares: string[] = [];
    private _groupPrefix: string = '';
    private _routeMiddlewares: Map<string, string[]> = new Map();
    
    constructor() {
        // Expose the singleton instance so dev overlays can introspect cache state.
        (globalThis as Record<string, unknown>).__NC_ROUTER__ = this;

        if ('scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }

        // Listen for browser back/forward buttons
        window.addEventListener('popstate', (e: PopStateEvent) => {
            // Abort any in-flight navigation so the guard in handleRoute doesn't
            // silently drop this popstate (back/forward) navigation.
            if (this.navigationController) {
                this.navigationController.abort();
            }
            this.isNavigating = false;
            this.navigationController = new AbortController();
            this.handleRoute(window.location.pathname, e.state);
        });
        
        // Intercept all link clicks for SPA navigation
        document.addEventListener('click', (e: MouseEvent) => {
            // e.composedPath() walks through shadow DOM boundaries before retargeting,
            // so clicks inside Shadow DOM components are handled correctly.
            const path = e.composedPath() as HTMLElement[];
            const link = path.find(el => el.tagName === 'A') as HTMLAnchorElement | undefined;
            
            // Check if it's a link
            if (link && link.tagName === 'A') {
                // If a component (e.g. nc-a) already handled this click and called
                // e.preventDefault() + router.navigate(), skip it here to avoid
                // pushing a duplicate history entry.
                if (e.defaultPrevented) return;

                const href = link.getAttribute('href');
                
                // Skip if no href
                if (!href) return;
                
                // Skip external links (http://, https://, mailto:, tel:, etc.)
                if (href.startsWith('http://') || href.startsWith('https://') ||
                    href.startsWith('mailto:') || href.startsWith('tel:')) {
                    return;
                }

                // In-page hash links: <base href="/"> would otherwise resolve
                // `#section` to `/#section` and navigate home. Keep the current
                // path and scroll instead.
                if (href.startsWith('#')) {
                    e.preventDefault();
                    this.scrollToHash(href);
                    return;
                }

                // Skip if target="_blank" or data-external attribute
                if (link.target === '_blank' || link.hasAttribute('data-external')) {
                    return;
                }

                // Same-path link with hash → scroll only (no view reload)
                const hashIdx = href.indexOf('#');
                if (hashIdx >= 0) {
                    const pathPart = href.slice(0, hashIdx) || window.location.pathname;
                    const hash = href.slice(hashIdx);
                    const norm = (p: string) => (p.replace(/\/+$/, '') || '/');
                    if (norm(pathPart) === norm(window.location.pathname)) {
                        e.preventDefault();
                        this.scrollToHash(hash);
                        return;
                    }
                }

                // Handle as SPA navigation
                e.preventDefault();
                this.navigate(href);
            }
        });
    }

    /**
     * Scroll to an in-page target without leaving the current route.
     * Needed because scaffolds ship `<base href="/">`, which makes bare
     * `#id` hrefs resolve against `/` instead of the current pathname.
     */
    scrollToHash(hash: string): void {
        const id = decodeURIComponent(String(hash || '').replace(/^#/, ''));
        if (!id) return;
        const url = `${window.location.pathname}${window.location.search}#${id}`;
        window.history.pushState(window.history.state, '', url);
        const el = document.getElementById(id) ||
            document.querySelector(`[name="${id.replace(/"/g, '\\"')}"]`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
    
    /**
     * Register a route
     */
    register(
        path: string,
        htmlFile: string,
        controller: ControllerFunction | null = null,
        options: Partial<RouteConfig> = {}
    ): this {
        const fullPath = this._groupPrefix ? `${this._groupPrefix}${path}` : path;
        this.routes[fullPath] = { htmlFile, controller, ...options };
        if (this._groupMiddlewares.length > 0) {
            this._routeMiddlewares.set(fullPath, [...this._groupMiddlewares]);
        }
        return this;
    }

    /**
     * Set a cache policy for the last registered route.
     *
     * @example
     * router
     *   .register('/about', 'views/about.html')
     *   .cache({ ttl: 300 })                        // cache 5 minutes, block on stale
     *
     * @example
     *   .register('/home', 'views/home.html', homeController)
     *   .cache({ ttl: 60, revalidate: true })        // serve stale instantly, refresh in bg
     */
    cache(policy: CachePolicy): this {
        const paths = Object.keys(this.routes);
        const last = paths[paths.length - 1];
        if (last) this.routes[last].cachePolicy = policy;
        return this;
    }

    /**
     * Manually bust the HTML cache for a specific path (or all paths).
     * Also clears the rendered-HTML cache so the next visit always re-renders.
     */
    bustCache(path?: string): void {
        if (path) {
            const config = this.routes[path];
            if (config) {
                this.htmlCache.delete(config.htmlFile);

                try {
                    const chain = this.getLayoutChain({ path, params: {}, config });
                    for (const layout of chain) {
                        this.htmlCache.delete(layout.config.htmlFile);
                    }
                } catch {
                    if (config.layout) {
                        const layoutConfig = this.routes[config.layout];
                        if (layoutConfig) this.htmlCache.delete(layoutConfig.htmlFile);
                    }
                }
            }
        } else {
            this.htmlCache.clear();
            // renderedHtmlCache is a WeakMap keyed by DOM elements;
            // entries are released automatically when containers are replaced.
        }
    }

    /**
     * Prefetch a route's HTML (and layout HTML when applicable) without navigating.
     */
    async prefetch(path: string): Promise<void> {
        const route = this.matchRoute(path);
        if (!route) return;

        const requests: Array<Promise<string>> = [
            this.fetchHTML(route.config.htmlFile, route.config.cachePolicy, true)
        ];
        for (const layout of this.getLayoutChain(route)) {
            requests.push(this.fetchHTML(layout.config.htmlFile, layout.config.cachePolicy, true));
        }

        await Promise.allSettled(requests);
    }
    
    /**
     * Add middleware
     */
    use(middleware: MiddlewareFunction): this {
        this.middlewares.push(middleware);
        return this;
    }

    /**
     * Group routes under shared options (middleware names, path prefix).
     * Routes registered inside the callback inherit the group's middleware tags
     * and prefix. Groups can be nested.
     *
     * @example
     * router.group({ middleware: ['auth'] }, (r) => {
     *     // @group:protected
     *     r.register('/dashboard', 'src/views/protected/dashboard.html', lazyController(...));
     *     r.register('/tasks',     'src/views/protected/tasks.html',     lazyController(...));
     * });
     */
    group(options: { middleware?: string[]; prefix?: string }, callback: (router: this) => void): this {
        const prevMiddlewares = this._groupMiddlewares;
        const prevPrefix = this._groupPrefix;

        this._groupMiddlewares = [...prevMiddlewares, ...(options.middleware ?? [])];
        this._groupPrefix = prevPrefix + (options.prefix ?? '');

        callback(this);

        this._groupMiddlewares = prevMiddlewares;
        this._groupPrefix = prevPrefix;

        return this;
    }

    /**
     * Returns all middleware tags registered on a specific path.
     * Use this inside middleware functions to check whether a tag applies.
     *
     * @example
     * const tags = router.getTagsForPath(route.path);
     * if (tags.includes('auth')) { ... }
     */
    getTagsForPath(path: string): string[] {
        return this._routeMiddlewares.get(path) ?? [];
    }

    /**
     * Returns all route paths that carry the given middleware tag.
     * Use this to derive protectedRoutes (or any middleware-gated set) without
     * maintaining a separate array.
     *
     * @example
     * export const protectedRoutes = router.getPathsForMiddleware('auth');
     */
    getPathsForMiddleware(middlewareName: string): string[] {
        return Array.from(this._routeMiddlewares.entries())
            .filter(([, tags]) => tags.includes(middlewareName))
            .map(([path]) => path);
    }
    
    /**
     * Navigate to a new route
     */
    navigate(path: string, state: any = {}): void {
        const browserPath = this.normalizeBrowserPath(path);

        // Abort any previous navigation
        if (this.navigationController) {
            this.navigationController.abort();
        }
        
        // Create new abort controller for this navigation
        this.navigationController = new AbortController();
        
        window.history.pushState(state, '', browserPath);
        this.handleRoute(browserPath, state);
    }
    
    /**
     * Replace current route
     */
    replace(path: string, state: any = {}): void {
        const browserPath = this.normalizeBrowserPath(path);
        window.history.replaceState(state, '', browserPath);

        // Allow redirects triggered during an in-flight navigation, such as
        // auth middleware or logout handlers, to schedule a new route load.
        if (this.navigationController) {
            this.navigationController.abort();
        }
        this.isNavigating = false;
        this.navigationController = new AbortController();

        queueMicrotask(() => {
            void this.handleRoute(browserPath, state);
        });
    }
    
    /**
     * Force reload current route (for HMR)
     */
    reload(): void {
        // Reset navigation state
        this.isNavigating = false;
        if (this.navigationController) {
            this.navigationController.abort();
        }
        // renderedHtmlCache is a WeakMap — no manual clearing needed.
        // When HMR triggers a reload it busts the htmlCache, so a fresh fetch
        // will produce a new html string that won't match the recorded entry,
        // and the container will always be re-rendered.

        const path = this.currentRoute?.path ?? window.location.pathname;
        this.handleRoute(path, {});
    }
    
    /**
     * Go back
     */
    back(): void {
        window.history.back();
    }
    
    /**
     * Handle route
     */
    private async handleRoute(path: string, state: any = {}): Promise<void> {
        // Capture THIS navigation's own signal at call time.
        // this.navigationController is replaced on every new navigate() / popstate,
        // so checking this.navigationController inside later awaits would test the
        // WRONG (newer) signal and allow stale navigations to overwrite new ones.
        const signal = this.navigationController?.signal ?? null;

        // A newer navigate() already replaced the controller — this call is stale.
        if (signal && this.navigationController && signal !== this.navigationController.signal) {
            return;
        }

        this.isNavigating = true;
        
        const route = this.matchRoute(path);
        
        if (!route) {
            this.handle404(path);
            this.isNavigating = false;
            return;
        }
        
        // Check if this navigation was aborted
        if (signal?.aborted) {
            this.isNavigating = false;
            return;
        }
        
        // Run middlewares
        for (const middleware of this.middlewares) {
            const result = await middleware(route, state);
            if (result === false) {
                this.isNavigating = false;
                return;
            }
        }
        
        // Check if aborted during middleware
        if (signal?.aborted) {
            this.isNavigating = false;
            return;
        }
        
        const previousRoute = this.currentRoute;
        this.currentRoute = route;
        await this.loadPage(route, state, previousRoute, signal);
        this.isNavigating = false;
    }
    
    /**
     * Load page
     */
    private async loadPage(route: RouteMatch, state: any = {}, previousRoute: RouteMatch | null = null, signal?: AbortSignal | null): Promise<void> {
        const mainContent = document.getElementById('main-content');
        const progressBar = document.getElementById('page-progress');
        
        if (!mainContent) {
            console.error('main-content element not found');
            return;
        }
        
        try {
            const isPrerenderedInitialRoute = this.isPrerenderedInitialRoute(
                mainContent,
                route,
                previousRoute
            );
            const hasWarmHtmlCache = this.htmlCache.has(route.config.htmlFile);
            const shouldAnimateTransition =
                !isPrerenderedInitialRoute &&
                hasWarmHtmlCache &&
                route.config.disableTransition !== true &&
                previousRoute?.config?.htmlFile !== route.config.htmlFile;

            // Avoid first-paint flash on SSG pages: no progress bar / scroll jump.
            if (!isPrerenderedInitialRoute) {
                if (progressBar) {
                    progressBar.classList.add('loading');
                }
                this.resetScrollPosition(mainContent);
            }

            if (previousRoute?.path && this.pageScripts[previousRoute.path]?.cleanup) {
                this.pageScripts[previousRoute.path].cleanup!();
            }
            flushPageCleanups();

            // Always fetch/render view HTML on a normal navigation. Animation is
            // optional and only used when we already have a warm HTML cache so the
            // exit transition does not wait on a cold network fetch.
            let mountedLayouts: RouteMatch[] = [];
            let pageRoot: HTMLElement = mainContent;
            if (!isPrerenderedInitialRoute) {
                if (shouldAnimateTransition) {
                    mainContent.classList.add('page-transition-exit');
                    await new Promise(resolve => setTimeout(resolve, 50));

                    // After the animation await, bail out if this navigation was superseded.
                    // Without this check, a stale navigation resuming here would overwrite
                    // whatever the newer navigation already rendered into the DOM.
                    if (signal?.aborted) {
                        mainContent.classList.remove('page-transition-exit');
                        if (progressBar) progressBar.classList.remove('loading');
                        return;
                    }
                }

                const resolved = await this.resolveContentTarget(mainContent, route);
                const contentTarget = resolved.outlet;
                mountedLayouts = resolved.mountedLayouts;
                const html = await this.fetchHTML(route.config.htmlFile, route.config.cachePolicy);

                // Bail again after the async fetch in case navigation was superseded
                if (signal?.aborted) {
                    mainContent.classList.remove('page-transition-exit');
                    if (progressBar) progressBar.classList.remove('loading');
                    return;
                }

                // Skip the innerHTML write when the fetched HTML is identical to
                // what was last rendered into this slot. The controller still runs
                // and re-creates its reactive effects on the existing DOM nodes —
                // wire bindings always re-apply their current state on first run,
                // so the view is immediately consistent without a full re-render.
                // Only skip the innerHTML write when this specific container
                // already holds the same file AND the same HTML string.
                // Keying by element (not file path) ensures that navigating
                // A → B → A never skips the re-render — B overwrote the
                // container, so the recorded entry no longer matches.
                const lastRendered = this.renderedHtmlCache.get(contentTarget);
                const shouldSkipRender =
                    lastRendered?.file === route.config.htmlFile &&
                    lastRendered?.html === html;

                if (!shouldSkipRender) {
                    contentTarget.innerHTML = html;
                    this.renderedHtmlCache.set(contentTarget, { file: route.config.htmlFile, html });
                }

                if (shouldAnimateTransition) {
                    mainContent.classList.remove('page-transition-exit');
                    mainContent.classList.add('page-transition-enter');
                }

                pageRoot = contentTarget.querySelector<HTMLElement>('[data-view]') ?? contentTarget;
            }
            
            for (const layout of mountedLayouts) {
                if (signal?.aborted) return;
                await this.mountLayoutController(layout, route, state, signal);
            }

            if (route.config.controller) {
                let loaderData: unknown;

                if (route.config.loader) {
                    const loaderSignal = signal ?? this.navigationController?.signal ?? new AbortController().signal;
                    window.dispatchEvent(new CustomEvent('nc-route-loading', { detail: { path: route.path, params: route.params } }));
                    loaderData = await route.config.loader(route.params, loaderSignal);
                    window.dispatchEvent(new CustomEvent('nc-route-loaded', { detail: { path: route.path, params: route.params, data: loaderData } }));
                }

                const cleanup = await route.config.controller(route.params, state, loaderData, pageRoot);
                this.pageScripts[route.path] = { 
                    cleanup: typeof cleanup === 'function' ? cleanup : undefined 
                };
            }

            if (isPrerenderedInitialRoute) {
                // Warm caches from the already-painted SSG DOM so later navigations
                // can animate / skip-render correctly without a redundant first fetch.
                const prerenderHtml = mainContent.innerHTML;
                this.renderedHtmlCache.set(mainContent, {
                    file: route.config.htmlFile,
                    html: prerenderHtml,
                });
                if (!this.htmlCache.has(route.config.htmlFile)) {
                    this.htmlCache.set(route.config.htmlFile, {
                        html: prerenderHtml,
                        cachedAt: Date.now(),
                        ttl: route.config.cachePolicy?.ttl ?? 300,
                    });
                }
                mainContent.removeAttribute('data-prerendered-route');
            }
            
            this.applyRouteHead(route);
            window.dispatchEvent(new CustomEvent('pageloaded', { detail: route }));

            // Always settle scroll after the controller runs. Hash targets win;
            // otherwise jump to top (including SSG boot — scrollTo(0,0) is a no-op
            // when already at top, and fixes mid-page jumps from upgrading demos).
            this.settleScrollPosition(mainContent);
            
            if (progressBar && !isPrerenderedInitialRoute) {
                setTimeout(() => progressBar.classList.remove('loading'), 200);
            }
            
            if (shouldAnimateTransition) {
                setTimeout(() => {
                    mainContent.classList.remove('page-transition-enter');
                }, 150);
            }
            
        } catch (error) {
            console.error('Error loading page:', error);
            if (progressBar) {
                progressBar.classList.remove('loading');
            }
            window.dispatchEvent(new CustomEvent(ROUTE_ERROR_EVENT, {
                detail: {
                    error,
                    route: route.path,
                    requestPath: route.requestPath || window.location.pathname,
                    params: route.params,
                    controller: route.config.htmlFile,
                }
            }));

            // Matched routes that fail to fetch HTML / run the controller are load
            // errors, not 404s. Passing route.path here used to show the pattern
            // (`/courses/:slug`) instead of the URL the user actually opened.
            this.handleLoadError(route.requestPath || window.location.pathname, error);
        }
    }

    /**
     * True when the first boot can reuse SSG HTML already in `#main-content`.
     * Prefer the explicit `data-prerendered-route` marker written by SSG; fall back
     * to detecting non-shell view content so a missed marker still avoids a flash.
     */
    private isPrerenderedInitialRoute(
        mainContent: HTMLElement,
        route: RouteMatch,
        previousRoute: RouteMatch | null
    ): boolean {
        if (previousRoute !== null || this.getLayoutChain(route).length > 0) {
            return false;
        }

        const marker = mainContent.getAttribute('data-prerendered-route');
        if (marker != null) {
            return marker === route.path;
        }

        // Fallback: real view content already painted (not the default spinner shell).
        const spinnerOnly =
            mainContent.childElementCount === 1 &&
            Boolean(mainContent.querySelector(':scope > loading-spinner'));
        if (spinnerOnly || mainContent.childElementCount === 0) {
            return false;
        }

        return Boolean(mainContent.querySelector('[data-view]'));
    }
    
    /**
     * Fetch HTML with TTL-aware caching.
     */
    private async fetchHTML(file: string, policy?: CachePolicy, allowPrefetchCache = false): Promise<string> {
        const entry = this.htmlCache.get(file);
        const now = Date.now();
        const ttlMs = this.resolveCacheTtl(policy, entry) * 1000;
        const isFresh = entry && ttlMs > 0 && now - entry.cachedAt < ttlMs;
        const isStale = entry && ttlMs > 0 && !isFresh;

        // Serve stale immediately and refresh in background.
        // Triggers for: explicit revalidate:true OR routes with no cache policy (default behaviour).
        // Only blocks for a fresh fetch when policy.revalidate is explicitly false.
        if (isStale && policy?.revalidate !== false) {
            this.refreshInBackground(file, entry.ttl);
            return entry.html;
        }

        // Serve fresh from cache
        if (isFresh) return entry.html;

        // Fetch from network — always write result to htmlCache regardless of TTL.
        const response = await fetch(bustCache(file), { cache: 'no-store' });
        if (!response.ok) throw new Error(`Failed to load ${file}`);
        const html = await response.text();

        this.htmlCache.set(file, {
            html,
            cachedAt: now,
            ttl: policy?.ttl ?? entry?.ttl ?? 300
        });

        return html;
    }

    private async refreshInBackground(file: string, ttl: number): Promise<void> {
        try {
            const response = await fetch(bustCache(file), { cache: 'no-store' });
            if (!response.ok) return;
            const html = await response.text();
            this.htmlCache.set(file, { html, cachedAt: Date.now(), ttl });
        } catch {
            // silently ignore background refresh failures
        }
    }
    
    /**
     * Match route
     */
    private matchRoute(path: string): RouteMatch | null {
        const normalizedPath = this.normalizeRoutePath(path);

        // Exact match
        if (this.routes[normalizedPath]) {
            return {
                path: normalizedPath,
                requestPath: normalizedPath,
                params: {},
                config: this.routes[normalizedPath],
            };
        }
        
        // Dynamic match
        for (const [routePath, config] of Object.entries(this.routes)) {
            const params = this.extractParams(routePath, normalizedPath);
            if (params) {
                return { path: routePath, requestPath: normalizedPath, params, config };
            }
        }
        
        return null;
    }
    
    /**
     * Extract params
     */
    private extractParams(routePath: string, actualPath: string): Record<string, string> | null {
        const routeParts = this.splitPath(routePath);
        const actualParts = this.splitPath(actualPath);
        const params: Record<string, string> = {};

        let routeIndex = 0;
        let actualIndex = 0;

        while (routeIndex < routeParts.length) {
            const routePart = routeParts[routeIndex];
            const actualPart = actualParts[actualIndex];

            if (routePart === '*') {
                params.wildcard = actualParts.slice(actualIndex).join('/');
                actualIndex = actualParts.length;
                routeIndex++;
                continue;
            }

            if (routePart.startsWith(':') && routePart.endsWith('?')) {
                const paramName = routePart.slice(1, -1);
                if (actualPart !== undefined) {
                    params[paramName] = actualPart;
                    actualIndex++;
                }
                routeIndex++;
                continue;
            }

            if (actualPart === undefined) {
                return null;
            }

            if (routePart.startsWith(':')) {
                params[routePart.slice(1)] = actualPart;
                routeIndex++;
                actualIndex++;
                continue;
            }

            if (routePart !== actualPart) {
                return null;
            }

            routeIndex++;
            actualIndex++;
        }

        return actualIndex === actualParts.length ? params : null;
    }
    
    /**
     * Handle 404
     */
    private applyRouteHead(route: RouteMatch): void {
        if (typeof document === 'undefined') return;

        const { title, meta } = route.config;
        if (title) {
            document.title = typeof title === 'function' ? title(route) : title;
        }
        if (!meta) return;

        const tags = typeof meta === 'function' ? meta(route) : meta;
        for (const [name, content] of Object.entries(tags)) {
            const selector = `meta[name="${name.replace(/"/g, '')}"]`;
            let el = document.head.querySelector(selector);
            if (!el) {
                el = document.createElement('meta');
                el.setAttribute('name', name);
                document.head.appendChild(el);
            }
            el.setAttribute('content', content);
        }
    }

    private escapeHtml(value: string): string {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    private renderFailurePage(options: {
        code: string;
        title: string;
        bodyHtml: string;
        eventDetail: Record<string, unknown>;
    }): void {
        this.teardownLayouts([]);
        this.renderedLayoutChain = [];
        const mainContent = document.getElementById('main-content');
        if (!mainContent) {
            return;
        }

        // Failure UIs overwrite mainContent.innerHTML directly, so drop the
        // skip-render cache entry or the next navigation can leave this page up.
        this.renderedHtmlCache.delete(mainContent);
        this.resetScrollPosition(mainContent);
        mainContent.innerHTML = `
                <div style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 60vh;
                    text-align: center;
                    padding: var(--spacing-xl);
                ">
                    <div style="
                        font-size: 8rem;
                        font-weight: 700;
                        color: var(--primary);
                        line-height: 1;
                        margin-bottom: var(--spacing-md);
                    ">${this.escapeHtml(options.code)}</div>
                    
                    <h1 style="
                        font-size: 2rem;
                        font-weight: 600;
                        color: var(--text-primary);
                        margin-bottom: var(--spacing-sm);
                    ">${this.escapeHtml(options.title)}</h1>
                    
                    <p style="
                        font-size: 1.1rem;
                        color: var(--text-secondary);
                        max-width: 500px;
                        margin-bottom: var(--spacing-lg);
                    ">
                        ${options.bodyHtml}
                    </p>
                    
                    <button onclick="window.history.back()" style="
                        display: inline-flex;
                        align-items: center;
                        gap: 0.5rem;
                        padding: var(--spacing-sm) var(--spacing-lg);
                        background: var(--primary);
                        color: white;
                        border: none;
                        border-radius: var(--radius-md);
                        font-weight: 500;
                        font-size: 1rem;
                        cursor: pointer;
                        transition: all 0.2s ease;
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='var(--shadow-md)'" 
                       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                        <span>&larr;</span> Go Back
                    </button>
                </div>
            `;

        window.dispatchEvent(new CustomEvent('pageloaded', {
            detail: options.eventDetail,
        }));
    }

    private handle404(path: string): void {
        const safePath = this.escapeHtml(path);
        this.renderFailurePage({
            code: '404',
            title: 'Page Not Found',
            bodyHtml: `The page <code style="
                            background: var(--background-secondary);
                            padding: 0.2rem 0.5rem;
                            border-radius: var(--radius-sm);
                            color: var(--primary);
                        ">${safePath}</code> could not be found.`,
            eventDetail: {
                path,
                notFound: true,
            },
        });
    }

    private handleLoadError(path: string, error: unknown): void {
        const safePath = this.escapeHtml(path);
        this.renderFailurePage({
            code: 'Error',
            title: 'Unable to load this page',
            bodyHtml: `The page <code style="
                            background: var(--background-secondary);
                            padding: 0.2rem 0.5rem;
                            border-radius: var(--radius-sm);
                            color: var(--primary);
                        ">${safePath}</code> matched a route, but the view or controller failed to load.`,
            eventDetail: {
                path,
                notFound: false,
                loadError: true,
                error,
            },
        });
    }
    
    /**
     * Start router
     */
    start(): void {
        const browserPath = this.normalizeBrowserPath(window.location.pathname + window.location.search + window.location.hash);

        if (browserPath !== window.location.pathname + window.location.search + window.location.hash) {
            window.history.replaceState(window.history.state, '', browserPath);
        }

        this.handleRoute(browserPath);
    }
    
    /**
     * Get current route
     */
    getCurrentRoute(): RouteMatch | null {
        return this.currentRoute;
    }

    /**
     * Debug helper for developer tooling to inspect route HTML cache health.
     */
    getCacheSnapshot(): RouterCacheSnapshot {
        const now = Date.now();
        const entries = Array.from(this.htmlCache.entries())
            .map(([file, entry]) => {
                const ttlSec = entry.ttl ?? 0;
                const ttlMs = ttlSec * 1000;
                const ageMs = Math.max(0, now - entry.cachedAt);
                const fresh = ttlMs > 0 ? ageMs < ttlMs : true;
                const stale = ttlMs > 0 && !fresh;
                return { file, ageMs, ttlSec, fresh, stale };
            })
            .sort((a, b) => b.ageMs - a.ageMs);

        return {
            total: entries.length,
            fresh: entries.filter(entry => entry.fresh).length,
            stale: entries.filter(entry => entry.stale).length,
            entries,
        };
    }

    /**
     * Debug helper for developer tooling — returns every registered route with
     * its cache policy and current cache state. Used by the devtools Cache tab.
     */
    getRouteDebugInfo(): RouteDebugInfo {
        const now = Date.now();
        const routeEntries = Object.entries(this.routes).map(([path, config]) => {
            const policy = config.cachePolicy;
            const ttlSec = policy?.ttl ?? 0;
            const ttlMs = ttlSec * 1000;
            const cached = this.htmlCache.get(config.htmlFile);
            const ageMs = cached ? Math.max(0, now - cached.cachedAt) : 0;
            let cacheStatus: RouteDebugEntry['cacheStatus'] = 'no-policy';
            if (policy) {
                if (!cached) {
                    cacheStatus = 'uncached';
                } else if (ttlMs > 0 && ageMs < ttlMs) {
                    cacheStatus = 'fresh';
                } else if (ttlMs > 0) {
                    cacheStatus = 'stale';
                } else {
                    cacheStatus = 'uncached';
                }
            }
            return {
                path,
                htmlFile: config.htmlFile,
                hasCachePolicy: !!policy,
                ttlSec,
                revalidate: policy?.revalidate ?? false,
                cacheStatus,
                ageMs,
                hasLayout: !!config.layout,
                layoutDepth: this.safeLayoutDepth({ path, params: {}, config }),
                hasLoader: typeof config.loader === 'function',
            } satisfies RouteDebugEntry;
        });

        return {
            total: routeEntries.length,
            cached: routeEntries.filter(r => r.cacheStatus === 'fresh' || r.cacheStatus === 'stale').length,
            currentPath: this.currentRoute?.requestPath ?? this.currentRoute?.path ?? null,
            routes: routeEntries,
        };
    }

    /**
     * Parsed query-string of the current URL as a plain object. Keys that
     * appear more than once become arrays.
     */
    getQuery(): Record<string, string | string[]> {
        const params = new URLSearchParams(window.location.search);
        const result: Record<string, string | string[]> = {};
        for (const [key, value] of params.entries()) {
            if (key in result) {
                const existing = result[key];
                result[key] = Array.isArray(existing) ? [...existing, value] : [existing as string, value];
            } else {
                result[key] = value;
            }
        }
        return result;
    }

    /** Returns a single query-string value (or a default when missing). */
    getQueryParam(name: string, fallback = ''): string {
        return new URLSearchParams(window.location.search).get(name) ?? fallback;
    }

    /**
     * Updates the query-string on the current URL without triggering a
     * navigation. `null`/`undefined` values remove the key.
     */
    setQuery(
        patch: Record<string, string | number | boolean | null | undefined>,
        options: { replace?: boolean } = {}
    ): void {
        const params = new URLSearchParams(window.location.search);
        for (const [key, value] of Object.entries(patch)) {
            if (value === null || value === undefined) params.delete(key);
            else params.set(key, String(value));
        }
        const search = params.toString();
        const url = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`;
        const method = (options.replace ?? true) ? 'replaceState' : 'pushState';
        window.history[method](window.history.state, '', url);
    }

    private findOutlet(container: HTMLElement): HTMLElement | null {
        return container.querySelector<HTMLElement>('#route-outlet, [data-route-outlet]');
    }

    private async resolveContentTarget(
        mainContent: HTMLElement,
        route: RouteMatch
    ): Promise<{ outlet: HTMLElement; mountedLayouts: RouteMatch[] }> {
        const chain = this.getLayoutChain(route);
        const mountedLayouts: RouteMatch[] = [];

        if (chain.length === 0) {
            this.teardownLayouts([]);
            this.renderedLayoutChain = [];
            return { outlet: mainContent, mountedLayouts };
        }

        const nextPaths = chain.map(layout => layout.path);
        let reuseUntil = 0;
        while (
            reuseUntil < nextPaths.length &&
            reuseUntil < this.renderedLayoutChain.length &&
            this.renderedLayoutChain[reuseUntil] === nextPaths[reuseUntil]
        ) {
            reuseUntil += 1;
        }

        this.teardownLayouts(nextPaths.slice(0, reuseUntil));

        let target = mainContent;
        for (let i = 0; i < chain.length; i++) {
            const layout = chain[i];
            const existingOutlet = this.findOutlet(target);
            const canReuse = i < reuseUntil && Boolean(existingOutlet);

            if (!canReuse) {
                this.teardownLayout(layout.path);
                const layoutHtml = await this.fetchHTML(layout.config.htmlFile, layout.config.cachePolicy);
                target.innerHTML = layoutHtml;
                this.renderedHtmlCache.set(target, { file: layout.config.htmlFile, html: layoutHtml });
                mountedLayouts.push(layout);
            }

            const layoutHost = target.querySelector<HTMLElement>('[data-view]') ?? target;
            this.layoutRoots.set(layout.path, layoutHost);

            const outlet = this.findOutlet(target);
            if (!outlet) {
                console.error(
                    `[router] Layout route "${layout.path}" is missing a #route-outlet element. ` +
                    `Falling back to rendering into the layout root. Add <div id="route-outlet"></div> ` +
                    `or data-route-outlet to ${layout.config.htmlFile} to silence this warning.`
                );
                this.renderedLayoutChain = nextPaths.slice(0, i);
                return { outlet: target, mountedLayouts };
            }

            target = outlet;
        }

        this.renderedLayoutChain = nextPaths;
        return { outlet: target, mountedLayouts };
    }

    /**
     * Walk `layout` pointers from the page to the outermost shell.
     * Returns outer-to-inner. Throws on a missing route or a cycle.
     */
    private getLayoutChain(route: RouteMatch): RouteMatch[] {
        const chain: RouteMatch[] = [];
        const seen = new Set<string>();
        let layoutPath = route.config.layout;

        while (layoutPath) {
            if (seen.has(layoutPath)) {
                throw new Error(`Layout cycle detected at "${layoutPath}"`);
            }
            if (chain.length >= MAX_LAYOUT_DEPTH) {
                throw new Error(`Layout chain exceeds ${MAX_LAYOUT_DEPTH} levels`);
            }
            seen.add(layoutPath);

            const layoutConfig = this.routes[layoutPath];
            if (!layoutConfig) {
                throw new Error(`Layout route "${layoutPath}" is not registered`);
            }

            chain.unshift({
                path: layoutPath,
                params: {},
                config: layoutConfig,
            });
            layoutPath = layoutConfig.layout;
        }

        return chain;
    }

    private safeLayoutDepth(route: RouteMatch): number {
        try {
            return this.getLayoutChain(route).length;
        } catch {
            return route.config.layout ? 1 : 0;
        }
    }

    private teardownLayouts(keepPaths: string[]): void {
        const keep = new Set(keepPaths);
        for (const path of [...this.renderedLayoutChain].reverse()) {
            if (keep.has(path)) continue;
            this.teardownLayout(path);
        }
    }

    private teardownLayout(path: string): void {
        this.layoutScripts[path]?.cleanup?.();
        delete this.layoutScripts[path];
        this.layoutRoots.delete(path);
    }

    private async mountLayoutController(
        layout: RouteMatch,
        page: RouteMatch,
        state: unknown,
        signal?: AbortSignal | null
    ): Promise<void> {
        if (!layout.config.controller) return;

        let loaderData: unknown;
        if (layout.config.loader) {
            const loaderSignal = signal ?? this.navigationController?.signal ?? new AbortController().signal;
            loaderData = await layout.config.loader(page.params, loaderSignal);
        }

        const root = this.layoutRoots.get(layout.path);
        const cleanup = await layout.config.controller(page.params, state, loaderData, root);
        this.layoutScripts[layout.path] = {
            cleanup: typeof cleanup === 'function' ? cleanup : undefined,
        };
    }

    /**
     * Split a route path into normalized segments while ignoring leading/trailing slashes.
     */
    private splitPath(path: string): string[] {
        const trimmed = path.replace(/^\/+|\/+$/g, '');
        return trimmed ? trimmed.split('/') : [];
    }

    private normalizeRoutePath(path: string): string {
        const cleanedPath = path.replace(/[?#].*$/, '').replace(/\/+$/, '');
        return cleanedPath || '/';
    }

    private normalizeBrowserPath(path: string): string {
        const [pathnameWithQuery, hash = ''] = path.split('#');
        const [pathname = '/', query = ''] = pathnameWithQuery.split('?');

        if (!pathname || pathname === '/' || pathname.endsWith('/') || /\.[a-z0-9]+$/i.test(pathname)) {
            return path;
        }

        const normalizedPath = `${pathname}/`;
        const querySuffix = query ? `?${query}` : '';
        const hashSuffix = hash ? `#${hash}` : '';
        return `${normalizedPath}${querySuffix}${hashSuffix}`;
    }

    private resolveCacheTtl(policy?: CachePolicy, entry?: CacheEntry): number {
        return policy?.ttl ?? entry?.ttl ?? 300;
    }

    private resetScrollPosition(mainContent?: HTMLElement | null): void {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;

        if (mainContent) {
            mainContent.scrollTop = 0;
            mainContent.scrollLeft = 0;

            const scrollContainer = mainContent.closest<HTMLElement>('.main-content');
            if (scrollContainer) {
                scrollContainer.scrollTop = 0;
                scrollContainer.scrollLeft = 0;
            }
        }
    }

    /**
     * After a route (and its controller) finishes: scroll to `#hash` if present,
     * otherwise reset to top. A second rAF pass catches late scrollIntoView calls
     * from custom elements that upgrade after the controller returns.
     */
    private settleScrollPosition(mainContent?: HTMLElement | null): void {
        const hash = window.location.hash;
        if (hash && hash.length > 1) {
            requestAnimationFrame(() => {
                const id = decodeURIComponent(hash.slice(1));
                const el = document.getElementById(id) ||
                    document.querySelector(`[name="${id.replace(/"/g, '\\"')}"]`);
                if (el) {
                    el.scrollIntoView({ block: 'start' });
                } else {
                    this.resetScrollPosition(mainContent);
                }
            });
            return;
        }

        this.resetScrollPosition(mainContent);
        requestAnimationFrame(() => {
            this.resetScrollPosition(mainContent);
            requestAnimationFrame(() => this.resetScrollPosition(mainContent));
        });
    }
}

const router = new Router();
export default router;


/**
 * SPA Router - Handles navigation without page reloads
 * Uses History API to manage URLs dynamically
 */
import { bustCache } from '../utils/cacheBuster.js';
import { flushPageCleanups } from '../core/pageCleanupRegistry.js';
export class Router {
    routes = {};
    currentRoute = null;
    middlewares = [];
    htmlCache = new Map();
    /**
     * Tracks the last file + HTML string written to each content container.
     * Keyed by the target element so layout outlets and main-content are
     * tracked independently. Skip innerHTML only when BOTH the file AND the
     * HTML string match what is already in that specific container.
     */
    renderedHtmlCache = new WeakMap();
    pageScripts = {};
    navigationController = null;
    isNavigating = false;
    renderedLayoutPath = null;
    _groupMiddlewares = [];
    _groupPrefix = '';
    _routeMiddlewares = new Map();
    constructor() {
        if ('scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }
        // Listen for browser back/forward buttons
        window.addEventListener('popstate', (e) => {
            this.handleRoute(window.location.pathname, e.state);
        });
        // Intercept all link clicks for SPA navigation
        document.addEventListener('click', (e) => {
            const target = e.target;
            const link = target.closest('a');
            // Check if it's a link
            if (link && link.tagName === 'A') {
                const href = link.getAttribute('href');
                // Skip if no href
                if (!href)
                    return;
                // Skip external links (http://, https://, mailto:, tel:, etc.)
                if (href.startsWith('http://') || href.startsWith('https://') ||
                    href.startsWith('mailto:') || href.startsWith('tel:') ||
                    href.startsWith('#')) {
                    return;
                }
                // Skip if target="_blank" or data-external attribute
                if (link.target === '_blank' || link.hasAttribute('data-external')) {
                    return;
                }
                // Handle as SPA navigation
                e.preventDefault();
                this.navigate(href);
            }
        });
    }
    /**
     * Register a route
     */
    register(path, htmlFile, controller = null, options = {}) {
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
    cache(policy) {
        const paths = Object.keys(this.routes);
        const last = paths[paths.length - 1];
        if (last)
            this.routes[last].cachePolicy = policy;
        return this;
    }
    /**
     * Manually bust the HTML cache for a specific path (or all paths).
     * Also clears the rendered-HTML cache so the next visit always re-renders.
     */
    bustCache(path) {
        if (path) {
            const config = this.routes[path];
            if (config) {
                this.htmlCache.delete(config.htmlFile);
                if (config.layout) {
                    const layoutConfig = this.routes[config.layout];
                    if (layoutConfig) {
                        this.htmlCache.delete(layoutConfig.htmlFile);
                    }
                }
            }
        }
        else {
            this.htmlCache.clear();
            // renderedHtmlCache is a WeakMap keyed by DOM elements;
            // entries are released automatically when containers are replaced.
        }
    }
    /**
     * Prefetch a route's HTML (and layout HTML when applicable) without navigating.
     */
    async prefetch(path) {
        const route = this.matchRoute(path);
        if (!route)
            return;
        const requests = [
            this.fetchHTML(route.config.htmlFile, route.config.cachePolicy, true)
        ];
        const layoutRoute = this.getLayoutRoute(route);
        if (layoutRoute) {
            requests.push(this.fetchHTML(layoutRoute.config.htmlFile, layoutRoute.config.cachePolicy, true));
        }
        await Promise.allSettled(requests);
    }
    /**
     * Add middleware
     */
    use(middleware) {
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
    group(options, callback) {
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
    getTagsForPath(path) {
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
    getPathsForMiddleware(middlewareName) {
        return Array.from(this._routeMiddlewares.entries())
            .filter(([, tags]) => tags.includes(middlewareName))
            .map(([path]) => path);
    }
    /**
     * Navigate to a new route
     */
    navigate(path, state = {}) {
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
    replace(path, state = {}) {
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
    reload() {
        // Reset navigation state
        this.isNavigating = false;
        if (this.navigationController) {
            this.navigationController.abort();
        }
        // renderedHtmlCache is a WeakMap — no manual clearing needed.
        // When HMR triggers a reload it busts the htmlCache, so a fresh fetch
        // will produce a new html string that won't match the recorded entry,
        // and the container will always be re-rendered.
        this.handleRoute(currentPath, {});
    }
    /**
     * Go back
     */
    back() {
        window.history.back();
    }
    /**
     * Handle route
     */
    async handleRoute(path, state = {}) {
        // Prevent concurrent navigations
        if (this.isNavigating && this.navigationController?.signal.aborted === false) {
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
        if (this.navigationController?.signal.aborted) {
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
        if (this.navigationController?.signal.aborted) {
            this.isNavigating = false;
            return;
        }
        const previousRoute = this.currentRoute;
        this.currentRoute = route;
        await this.loadPage(route, state, previousRoute);
        this.isNavigating = false;
    }
    /**
     * Load page
     */
    async loadPage(route, state = {}, previousRoute = null) {
        const mainContent = document.getElementById('main-content');
        const progressBar = document.getElementById('page-progress');
        if (!mainContent) {
            console.error('main-content element not found');
            return;
        }
        try {
            const isPrerenderedInitialRoute = previousRoute === null &&
                mainContent.getAttribute('data-prerendered-route') === route.path &&
                !route.config.layout;
            if (progressBar) {
                progressBar.classList.add('loading');
            }
            this.resetScrollPosition(mainContent);
            if (previousRoute?.path && this.pageScripts[previousRoute.path]?.cleanup) {
                this.pageScripts[previousRoute.path].cleanup();
            }
            flushPageCleanups();
            if (!isPrerenderedInitialRoute) {
                mainContent.classList.add('page-transition-exit');
                await new Promise(resolve => setTimeout(resolve, 50));
                const contentTarget = await this.resolveContentTarget(mainContent, route);
                const html = await this.fetchHTML(route.config.htmlFile, route.config.cachePolicy);
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
                const shouldSkipRender = lastRendered?.file === route.config.htmlFile &&
                    lastRendered?.html === html;
                if (!shouldSkipRender) {
                    contentTarget.innerHTML = html;
                    this.renderedHtmlCache.set(contentTarget, { file: route.config.htmlFile, html });
                }
                mainContent.classList.remove('page-transition-exit');
                mainContent.classList.add('page-transition-enter');
            }
            if (route.config.controller) {
                let loaderData;
                if (route.config.loader) {
                    const signal = this.navigationController?.signal ?? new AbortController().signal;
                    window.dispatchEvent(new CustomEvent('nc-route-loading', { detail: { path: route.path, params: route.params } }));
                    loaderData = await route.config.loader(route.params, signal);
                    window.dispatchEvent(new CustomEvent('nc-route-loaded', { detail: { path: route.path, params: route.params, data: loaderData } }));
                }
                const cleanup = await route.config.controller(route.params, state, loaderData);
                this.pageScripts[route.path] = {
                    cleanup: typeof cleanup === 'function' ? cleanup : undefined
                };
            }
            if (isPrerenderedInitialRoute) {
                mainContent.removeAttribute('data-prerendered-route');
            }
            window.dispatchEvent(new CustomEvent('pageloaded', { detail: route }));
            // Scroll to top on page navigation
            this.resetScrollPosition(mainContent);
            if (progressBar) {
                setTimeout(() => progressBar.classList.remove('loading'), 200);
            }
            if (!isPrerenderedInitialRoute) {
                setTimeout(() => {
                    mainContent.classList.remove('page-transition-enter');
                }, 150);
            }
        }
        catch (error) {
            console.error('Error loading page:', error);
            if (progressBar) {
                progressBar.classList.remove('loading');
            }
            window.dispatchEvent(new CustomEvent('nativecore:route-error', {
                detail: {
                    error,
                    route: route.path,
                    controller: route.config.htmlFile,
                }
            }));
            // Show 404 page when file doesn't exist
            this.handle404(route.path);
        }
    }
    /**
     * Fetch HTML with TTL-aware caching.
     */
    async fetchHTML(file, policy, allowPrefetchCache = false) {
        const entry = this.htmlCache.get(file);
        const now = Date.now();
        const ttlMs = this.resolveCacheTtl(policy, entry) * 1000;
        const isFresh = entry && ttlMs > 0 && now - entry.cachedAt < ttlMs;
        const isStale = entry && ttlMs > 0 && !isFresh;
        // Serve stale immediately and kick off a background refresh
        if (isStale && policy?.revalidate) {
            this.refreshInBackground(file, policy.ttl);
            return entry.html;
        }
        // Serve fresh from cache
        if (isFresh)
            return entry.html;
        // Fetch from network
        const response = await fetch(bustCache(file), { cache: 'no-store' });
        if (!response.ok)
            throw new Error(`Failed to load ${file}`);
        const html = await response.text();
        if (ttlMs > 0 || allowPrefetchCache) {
            this.htmlCache.set(file, {
                html,
                cachedAt: now,
                ttl: policy?.ttl ?? entry?.ttl ?? 30
            });
        }
        return html;
    }
    async refreshInBackground(file, ttl) {
        try {
            const response = await fetch(bustCache(file), { cache: 'no-store' });
            if (!response.ok)
                return;
            const html = await response.text();
            this.htmlCache.set(file, { html, cachedAt: Date.now(), ttl });
        }
        catch {
            // silently ignore background refresh failures
        }
    }
    /**
     * Match route
     */
    matchRoute(path) {
        const normalizedPath = this.normalizeRoutePath(path);
        // Exact match
        if (this.routes[normalizedPath]) {
            return { path: normalizedPath, params: {}, config: this.routes[normalizedPath] };
        }
        // Dynamic match
        for (const [routePath, config] of Object.entries(this.routes)) {
            const params = this.extractParams(routePath, normalizedPath);
            if (params) {
                return { path: routePath, params, config };
            }
        }
        return null;
    }
    /**
     * Extract params
     */
    extractParams(routePath, actualPath) {
        const routeParts = this.splitPath(routePath);
        const actualParts = this.splitPath(actualPath);
        const params = {};
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
    handle404(path) {
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
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
                    ">404</div>
                    
                    <h1 style="
                        font-size: 2rem;
                        font-weight: 600;
                        color: var(--text-primary);
                        margin-bottom: var(--spacing-sm);
                    ">Page Not Found</h1>
                    
                    <p style="
                        font-size: 1.1rem;
                        color: var(--text-secondary);
                        max-width: 500px;
                        margin-bottom: var(--spacing-lg);
                    ">
                        The page <code style="
                            background: var(--background-secondary);
                            padding: 0.2rem 0.5rem;
                            border-radius: var(--radius-sm);
                            color: var(--primary);
                        ">${path}</code> could not be found.
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
                        <span>←</span> Go Back
                    </button>
                </div>
            `;
            window.dispatchEvent(new CustomEvent('pageloaded', {
                detail: {
                    path,
                    notFound: true,
                },
            }));
        }
    }
    /**
     * Start router
     */
    start() {
        const browserPath = this.normalizeBrowserPath(window.location.pathname + window.location.search + window.location.hash);
        if (browserPath !== window.location.pathname + window.location.search + window.location.hash) {
            window.history.replaceState(window.history.state, '', browserPath);
        }
        this.handleRoute(browserPath);
    }
    /**
     * Get current route
     */
    getCurrentRoute() {
        return this.currentRoute;
    }
    /**
     * Parsed query-string of the current URL as a plain object. Keys that
     * appear more than once become arrays.
     */
    getQuery() {
        const params = new URLSearchParams(window.location.search);
        const result = {};
        for (const [key, value] of params.entries()) {
            if (key in result) {
                const existing = result[key];
                result[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
            }
            else {
                result[key] = value;
            }
        }
        return result;
    }
    /** Returns a single query-string value (or a default when missing). */
    getQueryParam(name, fallback = '') {
        return new URLSearchParams(window.location.search).get(name) ?? fallback;
    }
    /**
     * Updates the query-string on the current URL without triggering a
     * navigation. `null`/`undefined` values remove the key.
     */
    setQuery(patch, options = {}) {
        const params = new URLSearchParams(window.location.search);
        for (const [key, value] of Object.entries(patch)) {
            if (value === null || value === undefined)
                params.delete(key);
            else
                params.set(key, String(value));
        }
        const search = params.toString();
        const url = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`;
        const method = (options.replace ?? true) ? 'replaceState' : 'pushState';
        window.history[method](window.history.state, '', url);
    }
    async resolveContentTarget(mainContent, route) {
        const layoutRoute = this.getLayoutRoute(route);
        if (!layoutRoute) {
            this.renderedLayoutPath = null;
            return mainContent;
        }
        const needsLayoutRender = this.renderedLayoutPath !== layoutRoute.path ||
            !mainContent.querySelector('#route-outlet');
        if (needsLayoutRender) {
            const layoutHtml = await this.fetchHTML(layoutRoute.config.htmlFile, layoutRoute.config.cachePolicy);
            mainContent.innerHTML = layoutHtml;
            this.renderedLayoutPath = layoutRoute.path;
        }
        const outlet = mainContent.querySelector('#route-outlet');
        if (!outlet) {
            // Graceful fallback: warn loudly in dev tools but keep the app
            // navigable by rendering directly into the layout root. Throwing
            // here used to nuke the whole page on a single missing element.
            console.error(`[router] Layout route "${layoutRoute.path}" is missing a #route-outlet element. ` +
                `Falling back to rendering into the layout root. Add <div id="route-outlet"></div> to ${layoutRoute.config.htmlFile} to silence this warning.`);
            this.renderedLayoutPath = null;
            return mainContent;
        }
        return outlet;
    }
    getLayoutRoute(route) {
        const layoutPath = route.config.layout;
        if (!layoutPath)
            return null;
        const layoutConfig = this.routes[layoutPath];
        if (!layoutConfig) {
            throw new Error(`Layout route "${layoutPath}" is not registered`);
        }
        return {
            path: layoutPath,
            params: {},
            config: layoutConfig
        };
    }
    /**
     * Split a route path into normalized segments while ignoring leading/trailing slashes.
     */
    splitPath(path) {
        const trimmed = path.replace(/^\/+|\/+$/g, '');
        return trimmed ? trimmed.split('/') : [];
    }
    normalizeRoutePath(path) {
        const cleanedPath = path.replace(/[?#].*$/, '').replace(/\/+$/, '');
        return cleanedPath || '/';
    }
    normalizeBrowserPath(path) {
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
    resolveCacheTtl(policy, entry) {
        return policy?.ttl ?? entry?.ttl ?? 0;
    }
    resetScrollPosition(mainContent) {
        window.scrollTo(0, 0);
        if (mainContent) {
            mainContent.scrollTop = 0;
            mainContent.scrollLeft = 0;
            const scrollContainer = mainContent.closest('.main-content');
            if (scrollContainer) {
                scrollContainer.scrollTop = 0;
                scrollContainer.scrollLeft = 0;
            }
        }
    }
}
const router = new Router();
export default router;

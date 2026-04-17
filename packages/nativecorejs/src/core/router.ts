import { bustCache } from '../utils/cacheBuster.js';
import { escapeHTML } from '../utils/templates.js';

export interface CachePolicy {
    ttl: number;
    revalidate?: boolean;
}

export interface RouteConfig {
    htmlFile: string;
    controller?: ControllerFunction | null;
    cachePolicy?: CachePolicy;
    layout?: string;
}

export interface RouteMatch {
    path: string;
    params: Record<string, string>;
    config: RouteConfig;
}

export type ControllerFunction = (params: Record<string, string>, state?: any) => Promise<(() => void) | void> | (() => void) | void;
export type MiddlewareFunction = (route: RouteMatch, state?: any) => Promise<boolean> | boolean;

interface CacheEntry {
    html: string;
    cachedAt: number;
    ttl: number;
}

export class Router {
    private routes: Record<string, RouteConfig> = {};
    private currentRoute: RouteMatch | null = null;
    private middlewares: MiddlewareFunction[] = [];
    private htmlCache: Map<string, CacheEntry> = new Map();
    private pageScripts: Record<string, { cleanup?: () => void }> = {};
    private navigationController: AbortController | null = null;
    private isNavigating = false;
    private renderedLayoutPath: string | null = null;

    constructor() {
        if ('scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }

        window.addEventListener('popstate', (e: PopStateEvent) => {
            this.handleRoute(window.location.pathname, e.state);
        });

        document.addEventListener('click', (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const link = target.closest('a') as HTMLAnchorElement;

            if (link && link.tagName === 'A') {
                const href = link.getAttribute('href');

                if (!href) return;

                if (href.startsWith('http://') || href.startsWith('https://') ||
                    href.startsWith('mailto:') || href.startsWith('tel:') ||
                    href.startsWith('#')) {
                    return;
                }

                if (link.target === '_blank' || link.hasAttribute('data-external')) {
                    return;
                }

                e.preventDefault();
                this.navigate(href);
            }
        });
    }

    register(
        path: string,
        htmlFile: string,
        controller: ControllerFunction | null = null,
        options: Partial<RouteConfig> = {}
    ): this {
        this.routes[path] = { htmlFile, controller, ...options };
        return this;
    }

    cache(policy: CachePolicy): this {
        const paths = Object.keys(this.routes);
        const last = paths[paths.length - 1];
        if (last) this.routes[last].cachePolicy = policy;
        return this;
    }

    bustCache(path?: string): void {
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
        } else {
            this.htmlCache.clear();
        }
    }

    async prefetch(path: string): Promise<void> {
        const route = this.matchRoute(path);
        if (!route) return;

        const requests: Array<Promise<string>> = [
            this.fetchHTML(route.config.htmlFile, route.config.cachePolicy, true)
        ];
        const layoutRoute = this.getLayoutRoute(route);

        if (layoutRoute) {
            requests.push(this.fetchHTML(layoutRoute.config.htmlFile, layoutRoute.config.cachePolicy, true));
        }

        await Promise.allSettled(requests);
    }

    use(middleware: MiddlewareFunction): this {
        this.middlewares.push(middleware);
        return this;
    }

    navigate(path: string, state: any = {}): void {
        const browserPath = this.normalizeBrowserPath(path);

        if (this.navigationController) {
            this.navigationController.abort();
        }

        this.navigationController = new AbortController();

        window.history.pushState(state, '', browserPath);
        this.handleRoute(browserPath, state);
    }

    replace(path: string, state: any = {}): void {
        const browserPath = this.normalizeBrowserPath(path);
        window.history.replaceState(state, '', browserPath);
        this.handleRoute(browserPath, state);
    }

    reload(): void {
        this.isNavigating = false;
        if (this.navigationController) {
            this.navigationController.abort();
        }
        const currentPath = window.location.pathname;
        this.handleRoute(currentPath, {});
    }

    back(): void {
        window.history.back();
    }

    private async handleRoute(path: string, state: any = {}): Promise<void> {
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

        if (this.navigationController?.signal.aborted) {
            this.isNavigating = false;
            return;
        }

        for (const middleware of this.middlewares) {
            const result = await middleware(route, state);
            if (result === false) {
                this.isNavigating = false;
                return;
            }
        }

        if (this.navigationController?.signal.aborted) {
            this.isNavigating = false;
            return;
        }

        const previousRoute = this.currentRoute;
        this.currentRoute = route;
        await this.loadPage(route, state, previousRoute);
        this.isNavigating = false;
    }

    private async loadPage(route: RouteMatch, state: any = {}, previousRoute: RouteMatch | null = null): Promise<void> {
        const mainContent = document.getElementById('main-content');
        const progressBar = document.getElementById('page-progress');

        if (!mainContent) {
            console.error('main-content element not found');
            return;
        }

        try {
            const isPrerenderedInitialRoute =
                previousRoute === null &&
                mainContent.getAttribute('data-prerendered-route') === route.path &&
                !route.config.layout;

            if (progressBar) {
                progressBar.classList.add('loading');
            }

            this.resetScrollPosition(mainContent);

            if (previousRoute?.path && this.pageScripts[previousRoute.path]?.cleanup) {
                this.pageScripts[previousRoute.path].cleanup?.();
            }

            if (!isPrerenderedInitialRoute) {
                mainContent.classList.add('page-transition-exit');
                await new Promise(resolve => setTimeout(resolve, 50));

                const contentTarget = await this.resolveContentTarget(mainContent, route);
                const html = await this.fetchHTML(route.config.htmlFile, route.config.cachePolicy);

                // Trusted framework template loaded via fetchHTML
                contentTarget.innerHTML = html;
                mainContent.classList.remove('page-transition-exit');
                mainContent.classList.add('page-transition-enter');
            }

            if (route.config.controller) {
                const cleanup = await route.config.controller(route.params, state);
                this.pageScripts[route.path] = {
                    cleanup: typeof cleanup === 'function' ? cleanup : undefined
                };
            }

            if (isPrerenderedInitialRoute) {
                mainContent.removeAttribute('data-prerendered-route');
            }

            window.dispatchEvent(new CustomEvent('pageloaded', { detail: route }));
            this.resetScrollPosition(mainContent);

            if (progressBar) {
                setTimeout(() => progressBar.classList.remove('loading'), 200);
            }

            if (!isPrerenderedInitialRoute) {
                setTimeout(() => {
                    mainContent.classList.remove('page-transition-enter');
                }, 150);
            }
        } catch (error) {
            console.error('Error loading page:', error);
            if (progressBar) {
                progressBar.classList.remove('loading');
            }
            this.handle404(route.path);
        }
    }

    private async fetchHTML(file: string, policy?: CachePolicy, allowPrefetchCache = false): Promise<string> {
        const entry = this.htmlCache.get(file);
        const now = Date.now();
        const ttlMs = this.resolveCacheTtl(policy, entry) * 1000;
        const isFresh = entry && ttlMs > 0 && now - entry.cachedAt < ttlMs;
        const isStale = entry && ttlMs > 0 && !isFresh;

        if (isStale && policy?.revalidate) {
            this.refreshInBackground(file, policy.ttl);
            return entry.html;
        }

        if (isFresh) return entry.html;

        const response = await fetch(bustCache(file), { cache: 'no-store' });
        if (!response.ok) throw new Error(`Failed to load ${file}`);
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

    private async refreshInBackground(file: string, ttl: number): Promise<void> {
        try {
            const response = await fetch(bustCache(file), { cache: 'no-store' });
            if (!response.ok) return;
            const html = await response.text();
            this.htmlCache.set(file, { html, cachedAt: Date.now(), ttl });
        } catch {
        }
    }

    private matchRoute(path: string): RouteMatch | null {
        const normalizedPath = this.normalizeRoutePath(path);

        if (this.routes[normalizedPath]) {
            return { path: normalizedPath, params: {}, config: this.routes[normalizedPath] };
        }

        for (const [routePath, config] of Object.entries(this.routes)) {
            const params = this.extractParams(routePath, normalizedPath);
            if (params) {
                return { path: routePath, params, config };
            }
        }

        return null;
    }

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

    private handle404(path: string): void {
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
                    padding: var(--spacing-xl, 2rem);
                ">
                    <div style="
                        font-size: 8rem;
                        font-weight: 700;
                        color: var(--primary, #0f766e);
                        line-height: 1;
                        margin-bottom: var(--spacing-md, 1rem);
                    ">404</div>
                    <h1 style="
                        font-size: 2rem;
                        font-weight: 600;
                        color: var(--text-primary, #111827);
                        margin-bottom: var(--spacing-sm, 0.75rem);
                    ">Page Not Found</h1>
                    <p style="
                        font-size: 1.1rem;
                        color: var(--text-secondary, #4b5563);
                        max-width: 500px;
                        margin-bottom: var(--spacing-lg, 1.5rem);
                    ">
                        The page <code style="
                            background: var(--background-secondary, #f3f4f6);
                            padding: 0.2rem 0.5rem;
                            border-radius: var(--radius-sm, 0.375rem);
                            color: var(--primary, #0f766e);
                        ">${escapeHTML(path)}</code> could not be found.
                    </p>
                    <button onclick="window.history.back()" style="
                        display: inline-flex;
                        align-items: center;
                        gap: 0.5rem;
                        padding: var(--spacing-sm, 0.75rem) var(--spacing-lg, 1.5rem);
                        background: var(--primary, #0f766e);
                        color: white;
                        border: none;
                        border-radius: var(--radius-md, 0.5rem);
                        font-weight: 500;
                        font-size: 1rem;
                        cursor: pointer;
                        transition: all 0.2s ease;
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='var(--shadow-md, 0 10px 20px rgba(0,0,0,0.12))'"
                       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                        <span><</span> Go Back
                    </button>
                </div>
            `;
        }
    }

    start(): void {
        const browserPath = this.normalizeBrowserPath(window.location.pathname + window.location.search + window.location.hash);

        if (browserPath !== window.location.pathname + window.location.search + window.location.hash) {
            window.history.replaceState(window.history.state, '', browserPath);
        }

        this.handleRoute(browserPath);
    }

    getCurrentRoute(): RouteMatch | null {
        return this.currentRoute;
    }

    private async resolveContentTarget(mainContent: HTMLElement, route: RouteMatch): Promise<HTMLElement> {
        const layoutRoute = this.getLayoutRoute(route);

        if (!layoutRoute) {
            this.renderedLayoutPath = null;
            return mainContent;
        }

        const needsLayoutRender = this.renderedLayoutPath !== layoutRoute.path ||
            !mainContent.querySelector('#route-outlet');

        if (needsLayoutRender) {
            const layoutHtml = await this.fetchHTML(layoutRoute.config.htmlFile, layoutRoute.config.cachePolicy);
            // Trusted framework template loaded via fetchHTML
            mainContent.innerHTML = layoutHtml;
            this.renderedLayoutPath = layoutRoute.path;
        }

        const outlet = mainContent.querySelector<HTMLElement>('#route-outlet');
        if (!outlet) {
            throw new Error(`Layout route "${layoutRoute.path}" is missing a #route-outlet element`);
        }

        return outlet;
    }

    private getLayoutRoute(route: RouteMatch): RouteMatch | null {
        const layoutPath = route.config.layout;
        if (!layoutPath) return null;

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
        return policy?.ttl ?? entry?.ttl ?? 0;
    }

    private resetScrollPosition(mainContent?: HTMLElement | null): void {
        window.scrollTo(0, 0);

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
}

const router = new Router();
export default router;

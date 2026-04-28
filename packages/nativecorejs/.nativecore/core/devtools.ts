/**
 * NativeCoreJS in-page DevTools panel.
 *
 * A minimal, framework-native DevTools surface that runs inside the
 * host page (no browser extension required). Gives developers:
 *
 *   - **Stores tab**: live list of every `createStore(name, ...)` with
 *     its current value and a JSON editor for quick mutation.
 *   - **Components tab**: enumerates every registered `nc-*` custom
 *     element currently mounted in the DOM, highlights them on hover,
 *     and shows their attributes + shadow-root state.
 *   - **Router tab**: current route, params, and query-string.
 *
 * The panel is only activated when the caller explicitly calls
 * {@link mountDevTools}, so it stays out of production bundles when
 * unused. It is rendered inside its own `Shadow Root` to isolate
 * styles from the host app.
 */
import type { State } from './state.js';

interface DevToolsOptions {
    /** Hotkey to toggle visibility. Defaults to `Ctrl+Shift+D`. */
    hotkey?: { ctrl?: boolean; shift?: boolean; alt?: boolean; key: string };
    /** When true, start with the panel open. Defaults to false. */
    openByDefault?: boolean;
}

interface DevToolsHandle {
    show(): void;
    hide(): void;
    toggle(): void;
    destroy(): void;
}

const PANEL_CSS = `
:host { all: initial; }
.panel {
    position: fixed;
    bottom: 0;
    right: 0;
    width: 420px;
    max-width: 100vw;
    height: 360px;
    max-height: 80vh;
    background: #111827;
    color: #f9fafb;
    font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
    border-top-left-radius: 8px;
    box-shadow: 0 -4px 20px rgba(0,0,0,0.4);
    display: flex;
    flex-direction: column;
    z-index: 2147483647;
    resize: both;
    overflow: hidden;
}
.panel[hidden] { display: none; }
.header { display:flex; align-items:center; gap: 4px; padding: 6px 8px; background:#1f2937; border-bottom:1px solid #374151; }
.title { font-weight: 600; margin-right: auto; color:#a7f3d0; }
.tab { background:transparent; color:#9ca3af; border:none; padding:4px 8px; cursor:pointer; border-radius:4px; font: inherit; }
.tab.active { background:#374151; color:#f9fafb; }
.close { background:transparent; color:#9ca3af; border:none; cursor:pointer; padding:4px 8px; font: inherit; }
.close:hover { color:#f9fafb; }
.body { flex:1; overflow:auto; padding: 8px; }
.row { padding: 4px 6px; border-bottom:1px solid #1f2937; display:flex; gap: 8px; align-items:flex-start; }
.row .name { color:#60a5fa; min-width:120px; flex-shrink:0; }
.row .value { flex:1; white-space:pre-wrap; word-break:break-all; color:#f9fafb; }
.row textarea { width:100%; min-height:60px; background:#0b1220; color:#f9fafb; border:1px solid #374151; border-radius:4px; font: inherit; padding:4px; }
.row .actions { display:flex; gap:4px; }
button.mini { background:#374151; color:#f9fafb; border:none; border-radius:4px; padding:2px 6px; cursor:pointer; font: inherit; }
button.mini:hover { background:#4b5563; }
.empty { color:#6b7280; padding: 12px; font-style: italic; }
.component-row:hover { background:#1f2937; cursor:pointer; }
.badge { background:#0f766e; color:white; padding:0 6px; border-radius:10px; font-size:10px; }
.cache-fresh  { color: #34d399; }
.cache-stale  { color: #fbbf24; }
.cache-uncached { color: #6b7280; }
.cache-no-policy { color: #374151; }
.cache-current { background: rgba(99,102,241,0.12); border-radius: 4px; }
.route-flag { font-size: 10px; color: #6b7280; margin-left: 4px; }
.loc-link { color: #60a5fa; text-decoration: underline; cursor: pointer; background: none; border: none; font: inherit; padding: 0; }
.loc-link:hover { color: #93c5fd; }
`;

function getStoreRegistry(): Map<string, State<unknown>> {
    return ((globalThis as Record<string, unknown>).__NC_STORES__ as Map<string, State<unknown>>) ?? new Map();
}

function renderStoreRow(name: string, store: State<unknown>): HTMLElement {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `
        <span class="name">${name}</span>
        <div class="value">
            <pre style="margin:0 0 4px 0">${escape(safeStringify(store.value))}</pre>
            <details>
                <summary style="cursor:pointer;color:#9ca3af">edit</summary>
                <textarea></textarea>
                <div class="actions" style="margin-top:4px">
                    <button class="mini" data-apply>Apply</button>
                    <button class="mini" data-reset>Revert</button>
                </div>
            </details>
        </div>
    `;
    const textarea = row.querySelector('textarea')!;
    textarea.value = safeStringify(store.value);
    row.querySelector('[data-apply]')!.addEventListener('click', () => {
        try {
            store.value = JSON.parse(textarea.value);
        } catch (err) {
            alert(`Invalid JSON: ${(err as Error).message}`);
        }
    });
    row.querySelector('[data-reset]')!.addEventListener('click', () => {
        textarea.value = safeStringify(store.value);
    });
    // Live-update the displayed value when the store changes.
    const pre = row.querySelector('pre')!;
    const unsub = store.watch(v => { pre.textContent = safeStringify(v); });
    (row as HTMLElement & { _dispose?: () => void })._dispose = unsub;
    return row;
}

function safeStringify(value: unknown): string {
    try { return JSON.stringify(value, null, 2); }
    catch { return String(value); }
}

function escape(s: string): string {
    return s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
}

type RouterDebugEntry = {
    path: string;
    htmlFile: string;
    hasCachePolicy: boolean;
    ttlSec: number;
    revalidate: boolean;
    cacheStatus: 'uncached' | 'fresh' | 'stale' | 'no-policy';
    ageMs: number;
    hasLayout: boolean;
    hasLoader: boolean;
};

type RouterDebugInfo = {
    total: number;
    cached: number;
    currentPath: string | null;
    routes: RouterDebugEntry[];
};

type RouterCacheEntry = {
    file: string;
    ageMs: number;
    ttlSec: number;
    fresh: boolean;
    stale: boolean;
};

type RouterCacheSnapshot = {
    total: number;
    fresh: number;
    stale: number;
    entries: RouterCacheEntry[];
};

function getRouterCacheSnapshot(): RouterCacheSnapshot | null {
    const maybeRouter = (globalThis as Record<string, unknown>).__NC_ROUTER__ as {
        getCacheSnapshot?: () => RouterCacheSnapshot;
        getRouteDebugInfo?: () => RouterDebugInfo;
    } | undefined;

    if (!maybeRouter?.getCacheSnapshot) return null;

    try {
        return maybeRouter.getCacheSnapshot();
    } catch {
        return null;
    }
}

function getRouterDebugInfo(): RouterDebugInfo | null {
    const maybeRouter = (globalThis as Record<string, unknown>).__NC_ROUTER__ as {
        getRouteDebugInfo?: () => RouterDebugInfo;
    } | undefined;

    if (!maybeRouter?.getRouteDebugInfo) return null;

    try {
        return maybeRouter.getRouteDebugInfo();
    } catch {
        return null;
    }
}

function findNcElements(): Element[] {
    const result: Element[] = [];
    const walk = (root: ParentNode) => {
        for (const el of root.querySelectorAll('*')) {
            if (el.tagName.toLowerCase().startsWith('nc-')) result.push(el);
            if ((el as Element & { shadowRoot?: ShadowRoot }).shadowRoot) {
                walk((el as Element & { shadowRoot: ShadowRoot }).shadowRoot);
            }
        }
    };
    walk(document.body);
    return result;
}

function renderComponentRow(el: Element): HTMLElement {
    const row = document.createElement('div');
    row.className = 'row component-row';
    const attrs = Array.from(el.attributes).map(a => `${a.name}="${a.value}"`).join(' ');
    row.innerHTML = `
        <span class="name">${el.tagName.toLowerCase()}</span>
        <div class="value">
            <div style="color:#9ca3af">${escape(attrs) || '<em>no attributes</em>'}</div>
        </div>
    `;
    let originalOutline = '';
    row.addEventListener('mouseenter', () => {
        originalOutline = (el as HTMLElement).style.outline;
        (el as HTMLElement).style.outline = '2px solid #22d3ee';
        (el as HTMLElement).scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
    row.addEventListener('mouseleave', () => {
        (el as HTMLElement).style.outline = originalOutline;
    });
    return row;
}

/**
 * Mount the DevTools panel into the current page. Returns a handle
 * with `show()`, `hide()`, `toggle()`, and `destroy()`. Safe to call
 * more than once — repeated calls return the existing handle.
 */
export function mountDevTools(options: DevToolsOptions = {}): DevToolsHandle {
    const existing = (globalThis as Record<string, unknown>).__NC_DEVTOOLS__ as DevToolsHandle | undefined;
    if (existing) return existing;

    const host = document.createElement('div');
    host.setAttribute('data-nc-devtools', '');
    const shadow = host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = PANEL_CSS;
    shadow.appendChild(style);

    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.hidden = !options.openByDefault;
    panel.innerHTML = `
        <div class="header">
            <span class="title">NativeCore DevTools</span>
            <button class="tab active" data-tab="stores">Stores</button>
            <button class="tab" data-tab="components">Components</button>
            <button class="tab" data-tab="router">Router</button>
            <button class="tab" data-tab="cache">Cache</button>
            <button class="close" aria-label="Close">×</button>
        </div>
        <div class="body"></div>
    `;
    shadow.appendChild(panel);
    document.body.appendChild(host);

    const body = panel.querySelector('.body') as HTMLElement;
    const tabs = panel.querySelectorAll<HTMLButtonElement>('.tab');
    let activeTab: 'stores' | 'components' | 'router' | 'cache' = 'stores';
    let storeDisposers: Array<() => void> = [];
    let registryPoll: ReturnType<typeof setInterval> | null = null;

    const clearStoreDisposers = () => {
        for (const d of storeDisposers) d();
        storeDisposers = [];
    };

    const renderStoresTab = () => {
        clearStoreDisposers();
        body.innerHTML = '';
        const registry = getStoreRegistry();
        if (registry.size === 0) {
            body.innerHTML = `<div class="empty">No stores registered.</div>`;
            return;
        }
        for (const [name, store] of registry.entries()) {
            const row = renderStoreRow(name, store);
            body.appendChild(row);
            const dispose = (row as HTMLElement & { _dispose?: () => void })._dispose;
            if (dispose) storeDisposers.push(dispose);
        }
    };

    const renderComponentsTab = () => {
        clearStoreDisposers();
        body.innerHTML = '';
        const elements = findNcElements();
        if (elements.length === 0) {
            body.innerHTML = `<div class="empty">No <code>nc-*</code> elements currently mounted.</div>`;
            return;
        }
        const header = document.createElement('div');
        header.className = 'row';
        header.innerHTML = `<span class="name">Mounted</span><div class="value"><span class="badge">${elements.length}</span></div>`;
        body.appendChild(header);
        for (const el of elements) body.appendChild(renderComponentRow(el));
    };

    const renderRouterTab = () => {
        clearStoreDisposers();
        body.innerHTML = '';
        const location = window.location;
        const params = new URLSearchParams(location.search);
        const query: Record<string, string> = {};
        params.forEach((v, k) => { query[k] = v; });
        const info: Array<[string, string]> = [
            ['pathname', location.pathname],
            ['search', location.search || '(none)'],
            ['hash', location.hash || '(none)'],
            ['query', safeStringify(query)],
        ];
        for (const [name, value] of info) {
            const row = document.createElement('div');
            row.className = 'row';
            row.innerHTML = `<span class="name">${name}</span><div class="value"><pre style="margin:0">${escape(value)}</pre></div>`;
            body.appendChild(row);
        }
    };

    const renderCacheTab = () => {
        clearStoreDisposers();
        body.innerHTML = '';

        const debug = getRouterDebugInfo();
        if (!debug) {
            body.innerHTML = `<div class="empty">Router not available or does not expose debug info.</div>`;
            return;
        }

        // Summary header
        const summary = document.createElement('div');
        summary.className = 'row';
        summary.innerHTML = `
            <span class="name">routes</span>
            <div class="value">
                <pre style="margin:0">${escape(`${debug.total} registered • ${debug.cached} cached • current: ${debug.currentPath ?? '(none)'}`)}</pre>
            </div>
        `;
        body.appendChild(summary);

        const statusColors: Record<string, string> = {
            fresh: 'cache-fresh',
            stale: 'cache-stale',
            uncached: 'cache-uncached',
            'no-policy': 'cache-no-policy',
        };

        for (const route of debug.routes) {
            const row = document.createElement('div');
            const isCurrent = route.path === debug.currentPath;
            row.className = `row${isCurrent ? ' cache-current' : ''}`;
            const cls = statusColors[route.cacheStatus] ?? '';

            const flags = [
                route.hasLayout ? 'layout' : '',
                route.hasLoader ? 'loader' : '',
                route.revalidate ? 'swr' : '',
            ].filter(Boolean).map(f => `<span class="route-flag">${f}</span>`).join('');

            const ageText = route.ageMs > 0 ? `${Math.round(route.ageMs / 1000)}s` : '--';
            const ttlText = route.ttlSec > 0 ? `ttl:${route.ttlSec}s` : 'no-cache';

            row.innerHTML = `
                <span class="name">${escape(route.path)}</span>
                <div class="value">
                    <span class="${cls}">${route.cacheStatus}</span>
                    <span class="route-flag">${ageText}</span>
                    <span class="route-flag">${ttlText}</span>
                    ${flags}
                </div>
            `;
            body.appendChild(row);
        }
    };

    const renderActive = () => {
        if (activeTab === 'stores') renderStoresTab();
        else if (activeTab === 'components') renderComponentsTab();
        else if (activeTab === 'router') renderRouterTab();
        else renderCacheTab();
    };

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeTab = tab.dataset.tab as typeof activeTab;
            renderActive();
        });
    });

    panel.querySelector('.close')!.addEventListener('click', () => handle.hide());

    // Keep the panel fresh: re-render the active tab when navigation
    // occurs, when new stores appear, or every 2s as a safety net.
    window.addEventListener('pageloaded', renderActive);
    registryPoll = setInterval(() => {
        if (!panel.hidden) renderActive();
    }, 2000);

    const hotkey = options.hotkey ?? { ctrl: true, shift: true, key: 'D' };
    const onKey = (e: KeyboardEvent): void => {
        if (hotkey.ctrl && !e.ctrlKey) return;
        if (hotkey.shift && !e.shiftKey) return;
        if (hotkey.alt && !e.altKey) return;
        if (e.key.toUpperCase() !== hotkey.key.toUpperCase()) return;
        e.preventDefault();
        handle.toggle();
    };
    window.addEventListener('keydown', onKey);

    const handle: DevToolsHandle = {
        show() { panel.hidden = false; renderActive(); },
        hide() { panel.hidden = true; },
        toggle() { panel.hidden ? handle.show() : handle.hide(); },
        destroy() {
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('pageloaded', renderActive);
            if (registryPoll) clearInterval(registryPoll);
            clearStoreDisposers();
            host.remove();
            delete (globalThis as Record<string, unknown>).__NC_DEVTOOLS__;
        },
    };

    (globalThis as Record<string, unknown>).__NC_DEVTOOLS__ = handle;
    if (options.openByDefault) renderActive();
    return handle;
}

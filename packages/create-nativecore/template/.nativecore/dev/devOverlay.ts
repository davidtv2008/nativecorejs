/**
 * Dev Performance Overlay
 * Only loaded in dev mode (localhost). Never ships in production.
 *
 * Overlay metrics (click any row for detail modal):
 *   - FPS              live frame rate
 *   - MEM              JS heap used / limit (Chrome only)
 *   - DOM              node count + delta since last route change
 *   - FCP / LCP        paint timing
 *   - LONG TASKS       tasks > 50ms with history
 *   - ROUTE            last navigation duration + history
 *   - NET              pending fetches + last 5 API calls
 *   - ERRORS           unhandled rejections + console errors/warns
 *   - COMPONENTS       mounted Web Component count + list
 *   - CONNECTION       navigator.connection info
 */

// ─── Types ───────────────────────────────────────────────────────────────────

interface PerfMemory {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
}

interface NetworkConnection {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
}

interface ApiCall {
    method: string;
    url: string;
    status: number;
    duration: number;
    ts: number;
    ok: boolean;
}

interface LongTask {
    duration: number;
    startTime: number;
    ts: number;
}

interface RouteEntry {
    path: string;
    duration: number;
    domNodes: number;
    ts: number;
}

interface ConsoleEntry {
    level: 'error' | 'warn';
    msg: string;
    ts: number;
}

declare global {
    interface Performance {
        memory?: PerfMemory;
    }
    interface Navigator {
        connection?: NetworkConnection;
    }
}

// ─── Constants ───────────────────────────────────────────────────────────────

const OVERLAY_ID  = '__nc_dev_overlay__';
const MODAL_ID    = '__nc_dev_modal__';
const STYLE_ID    = '__nc_dev_overlay_style__';
const DEV_VISIBLE_KEY = 'nativecore-devtools-visible';

const MAX_API_LOG       = 20;
const MAX_LONG_TASK_LOG = 50;
const MAX_CONSOLE_LOG   = 50;
const MAX_ROUTE_LOG     = 20;
const FPS_HISTORY_LEN   = 60; // last 60 half-second samples = 30s

// ─── Observers / loops ───────────────────────────────────────────────────────

let fpsFrameId: number | null = null;
let longTaskObserver: PerformanceObserver | null = null;
let paintObserver: PerformanceObserver | null = null;
let lcpObserver: PerformanceObserver | null = null;
let navStartTime: number = performance.now();
let domBaselineNodes = 0;

// ─── State ───────────────────────────────────────────────────────────────────

const state = {
    // FPS
    fps: 0,
    fpsFrameCount: 0,
    fpsHistory: [] as number[],

    // Memory
    memUsed: 0,
    memTotal: 0,
    memHistory: [] as number[],

    // Paint
    fcp: 0,
    lcp: 0,

    // Long tasks
    longTaskCount: 0,
    longTaskLastMs: 0,
    longTaskWarning: false,
    longTaskWarningTimer: null as ReturnType<typeof setTimeout> | null,
    longTaskLog: [] as LongTask[],

    // Routes
    routeTime: 0,
    routePath: '',
    routeHistory: [] as RouteEntry[],

    // DOM
    domNodes: 0,
    domDelta: 0,

    // Network / API
    pendingFetches: 0,
    apiLog: [] as ApiCall[],
    netFailCount: 0,

    // Errors
    consoleErrors: 0,
    consoleWarns: 0,
    unhandledRejections: 0,
    consoleLog: [] as ConsoleEntry[],

    // Components
    componentCount: 0,
    componentList: [] as string[],
};

// ─── Formatters ──────────────────────────────────────────────────────────────

function formatMs(ms: number): string {
    return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms.toFixed(0)}ms`;
}

function formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString('en-US', { hour12: false });
}

function clamp(s: string, max: number): string {
    return s.length > max ? '...' + s.slice(-(max - 3)) : s;
}

// ─── Color helpers ───────────────────────────────────────────────────────────

function fpsColor(fps: number): string {
    if (fps >= 55) return '#00ff88';
    if (fps >= 30) return '#ffcc00';
    return '#ff4444';
}

function memColor(used: number, limit: number): string {
    if (limit === 0) return '#888';
    const r = used / limit;
    if (r < 0.5)  return '#00ff88';
    if (r < 0.75) return '#ffcc00';
    return '#ff4444';
}

function msColor(ms: number, warn: number, bad: number): string {
    if (ms < warn) return '#00ff88';
    if (ms < bad)  return '#ffcc00';
    return '#ff4444';
}

function statusColor(status: number): string {
    if (status >= 500) return '#ff4444';
    if (status >= 400) return '#ffcc00';
    if (status >= 200) return '#00ff88';
    return '#888';
}

// ─── Styles ──────────────────────────────────────────────────────────────────

function injectStyles(): void {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
        /* ── Overlay ── */
        #${OVERLAY_ID} {
            position: fixed;
            bottom: 12px;
            left: 12px;
            z-index: 2147483646;
            background: rgba(0,0,0,0.52);
            border: 1px solid rgba(0,255,136,0.22);
            border-radius: 6px;
            padding: 7px 10px 8px;
            font-family: 'Cascadia Code','Fira Code','Consolas',monospace;
            font-size: 10px;
            line-height: 1.65;
            color: #00ff88;
            backdrop-filter: blur(6px);
            min-width: 192px;
            max-width: 230px;
            user-select: none;
            cursor: move;
            pointer-events: all;
        }
        #${OVERLAY_ID}:hover {
            background: rgba(0,0,0,0.78);
            border-color: rgba(0,255,136,0.45);
        }
        #${OVERLAY_ID} .nc-hdr {
            color: #00ff88;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: .09em;
            margin-bottom: 5px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        #${OVERLAY_ID} .nc-x {
            color: rgba(0,255,136,0.3);
            cursor: pointer;
            padding: 0 2px;
            pointer-events: all;
        }
        #${OVERLAY_ID} .nc-x:hover { color: #ff4444; }
        #${OVERLAY_ID} .nc-row {
            display: flex;
            justify-content: space-between;
            gap: 6px;
            cursor: pointer;
            border-radius: 3px;
            padding: 0 2px;
            margin: 0 -2px;
        }
        #${OVERLAY_ID} .nc-row:hover {
            background: rgba(0,255,136,0.07);
        }
        #${OVERLAY_ID} .nc-lbl { color: #00ff88; }
        #${OVERLAY_ID} .nc-div {
            border: none;
            border-top: 1px solid rgba(0,255,136,0.09);
            margin: 3px 0;
        }
        #${OVERLAY_ID} .nc-warn {
            color: #ff4444;
            animation: nc-blink .6s steps(1) infinite;
        }
        #${OVERLAY_ID} .nc-caution { color: #ffcc00; }
        #${OVERLAY_ID} .nc-muted { color: #00ff88; }
        @keyframes nc-blink { 50% { opacity:0; } }

        /* ── Modal backdrop ── */
        #${MODAL_ID} {
            position: fixed;
            inset: 0;
            z-index: 2147483647;
            background: rgba(0,0,0,0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(3px);
            pointer-events: all;
        }
        #${MODAL_ID} .nc-modal-box {
            background: #0a0a0a;
            border: 1px solid rgba(0,255,136,0.35);
            border-radius: 8px;
            padding: 20px 22px;
            font-family: 'Cascadia Code','Fira Code','Consolas',monospace;
            font-size: 11px;
            color: #00ff88;
            min-width: 420px;
            max-width: 680px;
            max-height: 80vh;
            overflow-y: auto;
            position: relative;
        }
        #${MODAL_ID} .nc-modal-box::-webkit-scrollbar { width: 5px; }
        #${MODAL_ID} .nc-modal-box::-webkit-scrollbar-track { background: transparent; }
        #${MODAL_ID} .nc-modal-box::-webkit-scrollbar-thumb { background: rgba(0,255,136,.25); border-radius: 99px; }
        #${MODAL_ID} .nc-m-title {
            font-size: 13px;
            font-weight: bold;
            letter-spacing: .06em;
            margin-bottom: 14px;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(0,255,136,0.15);
            display: flex;
            justify-content: space-between;
        }
        #${MODAL_ID} .nc-m-close {
            color: rgba(0,255,136,0.35);
            cursor: pointer;
            font-size: 14px;
        }
        #${MODAL_ID} .nc-m-close:hover { color: #ff4444; }
        #${MODAL_ID} .nc-m-sect {
            margin-bottom: 12px;
        }
        #${MODAL_ID} .nc-m-sect-title {
            color: rgba(0,255,136,0.45);
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: .1em;
            margin-bottom: 5px;
        }
        #${MODAL_ID} .nc-m-kv {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 2px;
            line-height: 1.7;
        }
        #${MODAL_ID} .nc-m-kv .k { color: rgba(0,255,136,0.4); min-width: 120px; }
        #${MODAL_ID} .nc-m-log-row {
            border-top: 1px solid rgba(0,255,136,0.06);
            padding: 3px 0;
            line-height: 1.6;
            display: grid;
            gap: 6px;
        }
        #${MODAL_ID} .nc-m-log-row.err  { color: #ff4444; }
        #${MODAL_ID} .nc-m-log-row.warn { color: #ffcc00; }
        #${MODAL_ID} .nc-m-ts {
            color: rgba(0,255,136,0.3);
            font-size: 9px;
        }
        #${MODAL_ID} .nc-m-empty {
            color: rgba(0,255,136,0.25);
            font-style: italic;
        }
        #${MODAL_ID} .nc-sparkline {
            height: 32px;
            width: 100%;
            display: block;
            margin: 6px 0;
        }
        #${MODAL_ID} .nc-chip {
            display: inline-block;
            background: rgba(0,255,136,0.08);
            border: 1px solid rgba(0,255,136,0.18);
            border-radius: 3px;
            padding: 1px 6px;
            margin: 2px 3px 2px 0;
            font-size: 10px;
        }
        #${MODAL_ID} .nc-chip.bad  { border-color: rgba(255,68,68,.5);  background: rgba(255,68,68,.08);  color: #ff4444; }
        #${MODAL_ID} .nc-chip.warn { border-color: rgba(255,204,0,.5);  background: rgba(255,204,0,.08);  color: #ffcc00; }
    `;
    document.head.appendChild(s);
}

// ─── Sparkline SVG ───────────────────────────────────────────────────────────

function sparkline(values: number[], color = '#00ff88'): string {
    if (values.length < 2) return '';
    const w = 380, h = 32;
    const max = Math.max(...values, 1);
    const pts = values.map((v, i) => {
        const x = (i / (values.length - 1)) * w;
        const y = h - (v / max) * h;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    return `<svg class="nc-sparkline" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
        <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>`;
}

// ─── DOM node snapshot ───────────────────────────────────────────────────────

function snapshotDom(): void {
    const count = document.querySelectorAll('*').length;
    const delta = count - state.domNodes;
    state.domDelta = state.domNodes > 0 ? delta : 0;
    state.domNodes = count;
}

function snapshotComponents(): void {
    const all = document.querySelectorAll(':defined');
    const custom: string[] = [];
    all.forEach(el => {
        const tag = el.tagName.toLowerCase();
        if (tag.includes('-')) custom.push(tag);
    });
    state.componentCount = custom.length;
    const freq: Record<string, number> = {};
    for (const t of custom) freq[t] = (freq[t] ?? 0) + 1;
    state.componentList = Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .map(([t, n]) => n > 1 ? `${t} ×${n}` : t);
}

// ─── Console intercept ───────────────────────────────────────────────────────

function patchConsole(): void {
    const origError = console.error.bind(console);
    const origWarn  = console.warn.bind(console);

    console.error = (...args: unknown[]) => {
        state.consoleErrors++;
        state.consoleLog.unshift({ level: 'error', msg: args.map(String).join(' '), ts: Date.now() });
        if (state.consoleLog.length > MAX_CONSOLE_LOG) state.consoleLog.pop();
        origError(...args);
    };

    console.warn = (...args: unknown[]) => {
        state.consoleWarns++;
        state.consoleLog.unshift({ level: 'warn', msg: args.map(String).join(' '), ts: Date.now() });
        if (state.consoleLog.length > MAX_CONSOLE_LOG) state.consoleLog.pop();
        origWarn(...args);
    };
}

// ─── Unhandled rejections ─────────────────────────────────────────────────────

function observeRejections(): void {
    window.addEventListener('unhandledrejection', (e) => {
        state.unhandledRejections++;
        state.consoleLog.unshift({
            level: 'error',
            msg: `Unhandled rejection: ${e.reason}`,
            ts: Date.now(),
        });
        if (state.consoleLog.length > MAX_CONSOLE_LOG) state.consoleLog.pop();
    });
}

// ─── Fetch intercept ─────────────────────────────────────────────────────────

function patchFetch(): void {
    const origFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        state.pendingFetches++;
        const t0 = performance.now();
        const method = (init?.method ?? 'GET').toUpperCase();
        const rawUrl = typeof input === 'string' ? input
            : input instanceof URL ? input.href
            : (input as Request).url;
        const url = clamp(rawUrl, 60);
        try {
            const res = await origFetch(input, init);
            const duration = performance.now() - t0;
            const entry: ApiCall = { method, url, status: res.status, duration, ts: Date.now(), ok: res.ok };
            state.apiLog.unshift(entry);
            if (state.apiLog.length > MAX_API_LOG) state.apiLog.pop();
            if (!res.ok) state.netFailCount++;
            return res;
        } catch (err) {
            const duration = performance.now() - t0;
            state.apiLog.unshift({ method, url, status: 0, duration, ts: Date.now(), ok: false });
            if (state.apiLog.length > MAX_API_LOG) state.apiLog.pop();
            state.netFailCount++;
            throw err;
        } finally {
            state.pendingFetches = Math.max(0, state.pendingFetches - 1);
        }
    };
}

// ─── Performance observers ───────────────────────────────────────────────────

function observePaintMetrics(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
        paintObserver = new PerformanceObserver((list) => {
            for (const e of list.getEntries()) {
                if (e.name === 'first-contentful-paint') state.fcp = e.startTime;
            }
        });
        paintObserver.observe({ type: 'paint', buffered: true });
    } catch { /* not supported */ }

    try {
        lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const last = entries[entries.length - 1];
            if (last) state.lcp = last.startTime;
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch { /* not supported */ }

    try {
        longTaskObserver = new PerformanceObserver((list) => {
            for (const e of list.getEntries()) {
                state.longTaskCount++;
                state.longTaskLastMs = e.duration;
                state.longTaskWarning = true;
                state.longTaskLog.unshift({ duration: e.duration, startTime: e.startTime, ts: Date.now() });
                if (state.longTaskLog.length > MAX_LONG_TASK_LOG) state.longTaskLog.pop();
                if (state.longTaskWarningTimer) clearTimeout(state.longTaskWarningTimer);
                state.longTaskWarningTimer = setTimeout(() => { state.longTaskWarning = false; }, 2000);
            }
        });
        longTaskObserver.observe({ type: 'longtask', buffered: true });
    } catch { /* not supported */ }
}

// ─── Route tracking ───────────────────────────────────────────────────────────

function observeRouteChanges(): void {
    navStartTime = performance.now();

    const onNav = () => {
        navStartTime = performance.now();
        domBaselineNodes = state.domNodes;
    };

    window.addEventListener('popstate', onNav);

    window.addEventListener('pageloaded', () => {
        snapshotDom();
        snapshotComponents();
        const duration = performance.now() - navStartTime;
        const path = window.location.pathname;
        state.routeTime = duration;
        state.routePath = path;
        state.routeHistory.unshift({ path, duration, domNodes: state.domNodes, ts: Date.now() });
        if (state.routeHistory.length > MAX_ROUTE_LOG) state.routeHistory.pop();
    });
}

// ─── FPS loop ─────────────────────────────────────────────────────────────────

function startFpsLoop(): void {
    let lastUpdateTime = performance.now();

    const loop = (now: number): void => {
        state.fpsFrameCount++;
        const elapsed = now - lastUpdateTime;

        if (elapsed >= 500) {
            state.fps = Math.round((state.fpsFrameCount * 1000) / elapsed);
            state.fpsFrameCount = 0;
            lastUpdateTime = now;

            state.fpsHistory.push(state.fps);
            if (state.fpsHistory.length > FPS_HISTORY_LEN) state.fpsHistory.shift();

            if (performance.memory) {
                const mb = performance.memory.usedJSHeapSize / (1024 * 1024);
                state.memHistory.push(mb);
                if (state.memHistory.length > FPS_HISTORY_LEN) state.memHistory.shift();
            }

            snapshotDom();
            snapshotComponents();
            updateOverlay();
        }

        fpsFrameId = requestAnimationFrame(loop);
    };

    fpsFrameId = requestAnimationFrame(loop);
}

// ─── Overlay HTML ─────────────────────────────────────────────────────────────

function row(label: string, valueHtml: string, key: string): string {
    return `<div class="nc-row" data-nc-section="${key}"><span class="nc-lbl">${label}</span><span>${valueHtml}</span></div>`;
}

function renderOverlayHTML(): string {
    const fc = fpsColor(state.fps);
    const memAvail = !!performance.memory;
    const usedMb = performance.memory ? performance.memory.usedJSHeapSize / (1024 * 1024) : 0;
    const limitMb = performance.memory ? performance.memory.jsHeapSizeLimit / (1024 * 1024) : 0;
    const mc = memColor(usedMb, limitMb);

    const totalErrors = state.consoleErrors + state.unhandledRejections;
    const errorCls = totalErrors > 0 ? 'nc-warn' : 'nc-muted';
    const warnCls  = state.consoleWarns > 0 ? 'nc-caution' : 'nc-muted';

    const domDeltaStr = state.domDelta !== 0
        ? ` <span class="${state.domDelta > 100 ? 'nc-warn' : state.domDelta > 20 ? 'nc-caution' : 'nc-muted'}">(${state.domDelta > 0 ? '+' : ''}${state.domDelta})</span>`
        : '';

    const netCls = state.pendingFetches > 0 ? 'nc-caution' : (state.netFailCount > 0 ? 'nc-warn' : 'nc-muted');
    const lastApi = state.apiLog[0];
    const netVal = lastApi
        ? `<span style="color:${statusColor(lastApi.status)}">${lastApi.status}</span> <span class="nc-muted">${formatMs(lastApi.duration)}</span>`
        : '<span class="nc-muted">--</span>';

    let html = `
        <div class="nc-hdr">
            <span>nativecore dev</span>
            <span class="nc-x" data-nc-close title="Close">&#x2715;</span>
        </div>
        ${row('FPS', `<span style="color:${fc}">${state.fps}</span>`, 'fps')}
    `;

    if (memAvail) {
        html += row('MEM', `<span style="color:${mc}">${usedMb.toFixed(1)} / ${limitMb.toFixed(0)} MB</span>`, 'mem');
    }

    html += `<hr class="nc-div">`;
    html += row('DOM', `${state.domNodes}${domDeltaStr}`, 'dom');
    html += row('COMPONENTS', `<span class="nc-muted">${state.componentCount}</span>`, 'components');
    html += `<hr class="nc-div">`;

    if (state.fcp > 0 || state.lcp > 0) {
        if (state.fcp > 0) html += row('FCP', `<span style="color:${msColor(state.fcp, 1800, 3000)}">${formatMs(state.fcp)}</span>`, 'paint');
        if (state.lcp > 0) html += row('LCP', `<span style="color:${msColor(state.lcp, 2500, 4000)}">${formatMs(state.lcp)}</span>`, 'paint');
        html += `<hr class="nc-div">`;
    }

    if (state.routeTime > 0) {
        html += row('ROUTE', `<span class="nc-muted">${formatMs(state.routeTime)}</span>`, 'routes');
    }

    html += row('LONG TASKS', state.longTaskCount > 0
        ? `<span class="${state.longTaskWarning ? 'nc-warn' : ''}">${state.longTaskCount}</span>`
        : '<span class="nc-muted">0</span>', 'longtasks');

    html += `<hr class="nc-div">`;
    html += row('NET', netVal, 'net');
    html += row('ERRORS', `<span class="${errorCls}">${totalErrors}</span> <span class="${warnCls}">/ ${state.consoleWarns}w</span>`, 'errors');

    const conn = navigator.connection;
    if (conn) {
        html += `<hr class="nc-div">`;
        html += row('CONN', `<span class="nc-muted">${conn.effectiveType ?? '--'}</span>`, 'conn');
    }

    return html;
}

// ─── Overlay element ─────────────────────────────────────────────────────────

function createOverlay(): HTMLElement {
    const el = document.createElement('div');
    el.id = OVERLAY_ID;
    el.innerHTML = renderOverlayHTML();
    document.body.appendChild(el);
    makeDraggable(el);
    bindOverlayEvents(el);
    return el;
}

function updateOverlay(): void {
    const el = document.getElementById(OVERLAY_ID);
    if (!el) return;
    const { left, top, bottom, right } = el.style;
    el.innerHTML = renderOverlayHTML();
    el.style.left   = left;
    el.style.top    = top;
    el.style.bottom = bottom;
    el.style.right  = right;
    bindOverlayEvents(el);
}

function bindOverlayEvents(el: HTMLElement): void {
    el.querySelector('[data-nc-close]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        destroyOverlay();
    });
    el.querySelectorAll('.nc-row[data-nc-section]').forEach(row => {
        row.addEventListener('click', (e) => {
            e.stopPropagation();
            const section = (row as HTMLElement).dataset.ncSection!;
            openModal(section);
        });
    });
}

// ─── Modal ───────────────────────────────────────────────────────────────────

function openModal(section: string): void {
    closeModal();
    const backdrop = document.createElement('div');
    backdrop.id = MODAL_ID;
    backdrop.innerHTML = `<div class="nc-modal-box">${renderModalContent(section)}</div>`;
    document.body.appendChild(backdrop);

    backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closeModal();
    });
    backdrop.querySelector('.nc-m-close')?.addEventListener('click', closeModal);
    document.addEventListener('keydown', onEscClose);
}

function closeModal(): void {
    document.getElementById(MODAL_ID)?.remove();
    document.removeEventListener('keydown', onEscClose);
}

function onEscClose(e: KeyboardEvent): void {
    if (e.key === 'Escape') closeModal();
}

function renderModalContent(section: string): string {
    switch (section) {
        case 'fps':        return modalFps();
        case 'mem':        return modalMem();
        case 'dom':        return modalDom();
        case 'components': return modalComponents();
        case 'paint':      return modalPaint();
        case 'routes':     return modalRoutes();
        case 'longtasks':  return modalLongTasks();
        case 'net':        return modalNet();
        case 'errors':     return modalErrors();
        case 'conn':       return modalConn();
        default:           return `<div class="nc-m-title"><span>Dev</span><span class="nc-m-close">&#x2715;</span></div><p class="nc-m-empty">No data.</p>`;
    }
}

function modalHeader(title: string): string {
    return `<div class="nc-m-title"><span>${title}</span><span class="nc-m-close">&#x2715;</span></div>`;
}

function kv(k: string, v: string): string {
    return `<div class="nc-m-kv"><span class="k">${k}</span><span>${v}</span></div>`;
}

function sect(title: string, body: string): string {
    return `<div class="nc-m-sect"><div class="nc-m-sect-title">${title}</div>${body}</div>`;
}

// FPS modal
function modalFps(): string {
    const avg = state.fpsHistory.length
        ? Math.round(state.fpsHistory.reduce((a, b) => a + b, 0) / state.fpsHistory.length)
        : state.fps;
    const min = state.fpsHistory.length ? Math.min(...state.fpsHistory) : state.fps;
    const max = state.fpsHistory.length ? Math.max(...state.fpsHistory) : state.fps;
    const drops = state.fpsHistory.filter(f => f < 30).length;
    return modalHeader('FPS — Frame Rate') +
        sect('Current', kv('Live FPS', `<span style="color:${fpsColor(state.fps)}">${state.fps}</span>`) +
            kv('Average (30s)', `${avg}`) +
            kv('Min', `<span style="color:${fpsColor(min)}">${min}</span>`) +
            kv('Max', `${max}`) +
            kv('Drops < 30fps', drops > 0 ? `<span class="${drops > 5 ? 'nc-warn' : 'nc-caution'}">${drops} samples</span>` : '<span class="nc-muted">none</span>')) +
        sect('History (last 30s)', sparkline(state.fpsHistory, fpsColor(avg)));
}

// Memory modal
function modalMem(): string {
    if (!performance.memory) {
        return modalHeader('Memory') + '<p class="nc-m-empty">memory API not available (Chrome only)</p>';
    }
    const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = performance.memory;
    const usedMb  = usedJSHeapSize  / (1024 * 1024);
    const totalMb = totalJSHeapSize / (1024 * 1024);
    const limitMb = jsHeapSizeLimit / (1024 * 1024);
    const pct = ((usedMb / limitMb) * 100).toFixed(1);
    const mc = memColor(usedMb, limitMb);
    return modalHeader('Memory — JS Heap') +
        sect('Heap', kv('Used', `<span style="color:${mc}">${usedMb.toFixed(2)} MB</span>`) +
            kv('Allocated', `${totalMb.toFixed(2)} MB`) +
            kv('Limit', `${limitMb.toFixed(0)} MB`) +
            kv('Usage %', `<span style="color:${mc}">${pct}%</span>`)) +
        sect('Trend (last 30s)', sparkline(state.memHistory));
}

// DOM modal
function modalDom(): string {
    const deltaStr = state.domDelta !== 0
        ? ` (${state.domDelta > 0 ? '+' : ''}${state.domDelta} since last route)`
        : '';
    const leakWarning = state.domDelta > 200
        ? `<div style="color:#ff4444;margin-top:8px">Warning: large DOM growth after route change may indicate missing cleanup.</div>`
        : '';
    return modalHeader('DOM — Node Count') +
        sect('Snapshot', kv('Total nodes', `${state.domNodes}${deltaStr}`) +
            kv('Delta this route', state.domDelta > 0
                ? `<span class="${state.domDelta > 100 ? 'nc-warn' : 'nc-caution'}">+${state.domDelta}</span>`
                : `<span class="nc-muted">${state.domDelta}</span>`)) +
        leakWarning +
        sect('What to watch for',
            '<div style="color:rgba(0,255,136,0.45);font-size:10px;line-height:1.8">' +
            'If DOM nodes grow after each navigation without returning to baseline,<br>' +
            'check that your controller cleanup functions remove all injected HTML.<br>' +
            'Also verify Shadow DOM components disconnect properly in onUnmount().' +
            '</div>');
}

// Components modal
function modalComponents(): string {
    const chips = state.componentList.length
        ? state.componentList.map(c => `<span class="nc-chip">${c}</span>`).join('')
        : '<span class="nc-m-empty">no custom elements found</span>';
    return modalHeader('Components — Mounted Web Components') +
        sect('Stats', kv('Total mounted', `${state.componentCount}`)) +
        sect('Active components', chips);
}

// Paint modal
function modalPaint(): string {
    return modalHeader('Paint Timing — FCP / LCP') +
        sect('First Contentful Paint (FCP)',
            kv('Time', state.fcp > 0 ? `<span style="color:${msColor(state.fcp, 1800, 3000)}">${formatMs(state.fcp)}</span>` : '<span class="nc-muted">--</span>') +
            kv('Rating', state.fcp === 0 ? '--' : state.fcp < 1800 ? '<span style="color:#00ff88">Good (&lt;1.8s)</span>' : state.fcp < 3000 ? '<span class="nc-caution">Needs Improvement (1.8–3s)</span>' : '<span class="nc-warn">Poor (&gt;3s)</span>')) +
        sect('Largest Contentful Paint (LCP)',
            kv('Time', state.lcp > 0 ? `<span style="color:${msColor(state.lcp, 2500, 4000)}">${formatMs(state.lcp)}</span>` : '<span class="nc-muted">--</span>') +
            kv('Rating', state.lcp === 0 ? '--' : state.lcp < 2500 ? '<span style="color:#00ff88">Good (&lt;2.5s)</span>' : state.lcp < 4000 ? '<span class="nc-caution">Needs Improvement (2.5–4s)</span>' : '<span class="nc-warn">Poor (&gt;4s)</span>'));
}

// Routes modal
function modalRoutes(): string {
    const rows = state.routeHistory.length
        ? state.routeHistory.map(r =>
            `<div class="nc-m-log-row" style="grid-template-columns:1fr auto auto">
                <span>${r.path}</span>
                <span style="color:${msColor(r.duration, 200, 600)}">${formatMs(r.duration)}</span>
                <span class="nc-m-ts">${formatTime(r.ts)}</span>
            </div>`).join('')
        : '<span class="nc-m-empty">no navigations yet</span>';

    return modalHeader('Route Navigation History') +
        sect('Last navigations (newest first)', rows);
}

// Long tasks modal
function modalLongTasks(): string {
    const rows = state.longTaskLog.length
        ? state.longTaskLog.map(t =>
            `<div class="nc-m-log-row" style="grid-template-columns:1fr auto auto">
                <span style="color:#ffcc00">long task</span>
                <span style="color:${msColor(t.duration, 100, 200)}">${formatMs(t.duration)}</span>
                <span class="nc-m-ts">${formatTime(t.ts)}</span>
            </div>`).join('')
        : '<span class="nc-m-empty">no long tasks recorded (> 50ms)</span>';

    return modalHeader('Long Tasks — Main Thread Blocking') +
        sect('Info',
            '<div style="color:rgba(0,255,136,0.45);font-size:10px;line-height:1.8">' +
            'Tasks over 50ms block the main thread and cause jank.<br>' +
            'Look for heavy loops, large DOM mutations, or synchronous XHR in controllers.' +
            '</div>') +
        sect(`History (${state.longTaskLog.length} tasks)`, rows);
}

// Net modal
function modalNet(): string {
    const rows = state.apiLog.length
        ? state.apiLog.map(c => {
            const sc = statusColor(c.status);
            return `<div class="nc-m-log-row" style="grid-template-columns:48px 1fr auto auto">
                <span style="color:rgba(0,255,136,0.5)">${c.method}</span>
                <span style="word-break:break-all">${c.url}</span>
                <span style="color:${sc}">${c.status || 'ERR'}</span>
                <span class="nc-m-ts">${formatMs(c.duration)}</span>
            </div>`;
        }).join('')
        : '<span class="nc-m-empty">no fetch calls recorded</span>';

    return modalHeader('Network — Fetch Log') +
        sect('Stats',
            kv('Pending fetches', state.pendingFetches > 0 ? `<span class="nc-caution">${state.pendingFetches}</span>` : '<span class="nc-muted">0</span>') +
            kv('Failed requests', state.netFailCount > 0 ? `<span class="nc-warn">${state.netFailCount}</span>` : '<span class="nc-muted">0</span>')) +
        sect(`Last ${state.apiLog.length} calls`, rows);
}

// Errors modal
function modalErrors(): string {
    const rows = state.consoleLog.length
        ? state.consoleLog.map(e =>
            `<div class="nc-m-log-row ${e.level} " style="grid-template-columns:1fr auto">
                <span style="word-break:break-all">${e.msg.slice(0, 200)}</span>
                <span class="nc-m-ts">${formatTime(e.ts)}</span>
            </div>`).join('')
        : '<span class="nc-m-empty">no errors or warnings</span>';

    return modalHeader('Errors & Warnings') +
        sect('Summary',
            kv('Console errors', state.consoleErrors > 0 ? `<span class="nc-warn">${state.consoleErrors}</span>` : '<span class="nc-muted">0</span>') +
            kv('Unhandled rejections', state.unhandledRejections > 0 ? `<span class="nc-warn">${state.unhandledRejections}</span>` : '<span class="nc-muted">0</span>') +
            kv('Console warnings', state.consoleWarns > 0 ? `<span class="nc-caution">${state.consoleWarns}</span>` : '<span class="nc-muted">0</span>')) +
        sect(`Log (last ${state.consoleLog.length})`, rows);
}

// Connection modal
function modalConn(): string {
    const conn = navigator.connection;
    if (!conn) {
        return modalHeader('Connection') + '<p class="nc-m-empty">Network Information API not available.</p>';
    }
    const typeColor = conn.effectiveType === '4g' ? '#00ff88' : conn.effectiveType === '3g' ? '#ffcc00' : '#ff4444';
    return modalHeader('Connection — Network Info') +
        sect('Network Information API',
            kv('Effective type', `<span style="color:${typeColor}">${conn.effectiveType ?? '--'}</span>`) +
            kv('Downlink', conn.downlink != null ? `${conn.downlink} Mbps` : '--') +
            kv('RTT', conn.rtt != null ? `${conn.rtt} ms` : '--') +
            kv('Save-data mode', conn.saveData ? '<span class="nc-caution">enabled</span>' : '<span class="nc-muted">off</span>'));
}

// ─── Draggable ───────────────────────────────────────────────────────────────

function makeDraggable(el: HTMLElement): void {
    let dragging = false;
    let startX = 0, startY = 0, origLeft = 0, origTop = 0;

    el.addEventListener('mousedown', (e: MouseEvent) => {
        const t = e.target as HTMLElement;
        if (t.dataset.ncClose || t.classList.contains('nc-row')) return;
        dragging = true;
        const rect = el.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        origLeft = rect.left;
        origTop  = rect.top;
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e: MouseEvent) => {
        if (!dragging) return;
        el.style.left   = `${origLeft + (e.clientX - startX)}px`;
        el.style.top    = `${origTop  + (e.clientY - startY)}px`;
        el.style.bottom = 'auto';
        el.style.right  = 'auto';
    });

    document.addEventListener('mouseup', () => { dragging = false; });
}

// ─── Destroy ─────────────────────────────────────────────────────────────────

function destroyOverlay(): void {
    if (fpsFrameId !== null) { cancelAnimationFrame(fpsFrameId); fpsFrameId = null; }
    longTaskObserver?.disconnect();
    paintObserver?.disconnect();
    lcpObserver?.disconnect();
    closeModal();
    document.getElementById(OVERLAY_ID)?.remove();
    document.getElementById(STYLE_ID)?.remove();
}

// ─── Entry point ─────────────────────────────────────────────────────────────

function isDevModeOn(): boolean {
    try {
        return localStorage.getItem(DEV_VISIBLE_KEY) === 'true';
    } catch {
        return false;
    }
}

function showOverlay(): void {
    if (document.getElementById(OVERLAY_ID)) return;
    injectStyles();
    snapshotDom();
    snapshotComponents();
    domBaselineNodes = state.domNodes;
    createOverlay();
    startFpsLoop();
}

function hideOverlay(): void {
    if (fpsFrameId !== null) { cancelAnimationFrame(fpsFrameId); fpsFrameId = null; }
    closeModal();
    document.getElementById(OVERLAY_ID)?.remove();
}

export function initDevOverlay(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const start = () => {
        patchConsole();
        patchFetch();
        observeRejections();
        observePaintMetrics();
        observeRouteChanges();

        // Only show if dev mode is currently toggled on
        if (isDevModeOn()) {
            showOverlay();
        }

        // Respond to the DEV MODE toggle button in denc-tools
        document.addEventListener('nc-devtools-visibility', (e: Event) => {
            const visible = (e as CustomEvent<{ visible: boolean }>).detail.visible;
            if (visible) {
                showOverlay();
            } else {
                hideOverlay();
            }
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
        start();
    }
}

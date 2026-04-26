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
`;
function getStoreRegistry() {
    return globalThis.__NC_STORES__ ?? new Map();
}
function renderStoreRow(name, store) {
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
    const textarea = row.querySelector('textarea');
    textarea.value = safeStringify(store.value);
    row.querySelector('[data-apply]').addEventListener('click', () => {
        try {
            store.value = JSON.parse(textarea.value);
        }
        catch (err) {
            alert(`Invalid JSON: ${err.message}`);
        }
    });
    row.querySelector('[data-reset]').addEventListener('click', () => {
        textarea.value = safeStringify(store.value);
    });
    // Live-update the displayed value when the store changes.
    const pre = row.querySelector('pre');
    const unsub = store.watch(v => { pre.textContent = safeStringify(v); });
    row._dispose = unsub;
    return row;
}
function safeStringify(value) {
    try {
        return JSON.stringify(value, null, 2);
    }
    catch {
        return String(value);
    }
}
function escape(s) {
    return s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}
function findNcElements() {
    const result = [];
    const walk = (root) => {
        for (const el of root.querySelectorAll('*')) {
            if (el.tagName.toLowerCase().startsWith('nc-'))
                result.push(el);
            if (el.shadowRoot) {
                walk(el.shadowRoot);
            }
        }
    };
    walk(document.body);
    return result;
}
function renderComponentRow(el) {
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
        originalOutline = el.style.outline;
        el.style.outline = '2px solid #22d3ee';
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
    row.addEventListener('mouseleave', () => {
        el.style.outline = originalOutline;
    });
    return row;
}
/**
 * Mount the DevTools panel into the current page. Returns a handle
 * with `show()`, `hide()`, `toggle()`, and `destroy()`. Safe to call
 * more than once — repeated calls return the existing handle.
 */
export function mountDevTools(options = {}) {
    const existing = globalThis.__NC_DEVTOOLS__;
    if (existing)
        return existing;
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
            <button class="close" aria-label="Close">×</button>
        </div>
        <div class="body"></div>
    `;
    shadow.appendChild(panel);
    document.body.appendChild(host);
    const body = panel.querySelector('.body');
    const tabs = panel.querySelectorAll('.tab');
    let activeTab = 'stores';
    let storeDisposers = [];
    let registryPoll = null;
    const clearStoreDisposers = () => {
        for (const d of storeDisposers)
            d();
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
            const dispose = row._dispose;
            if (dispose)
                storeDisposers.push(dispose);
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
        for (const el of elements)
            body.appendChild(renderComponentRow(el));
    };
    const renderRouterTab = () => {
        clearStoreDisposers();
        body.innerHTML = '';
        const location = window.location;
        const params = new URLSearchParams(location.search);
        const query = {};
        params.forEach((v, k) => { query[k] = v; });
        const info = [
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
    const renderActive = () => {
        if (activeTab === 'stores')
            renderStoresTab();
        else if (activeTab === 'components')
            renderComponentsTab();
        else
            renderRouterTab();
    };
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeTab = tab.dataset.tab;
            renderActive();
        });
    });
    panel.querySelector('.close').addEventListener('click', () => handle.hide());
    // Keep the panel fresh: re-render the active tab when navigation
    // occurs, when new stores appear, or every 2s as a safety net.
    window.addEventListener('pageloaded', renderActive);
    registryPoll = setInterval(() => {
        if (!panel.hidden)
            renderActive();
    }, 2000);
    const hotkey = options.hotkey ?? { ctrl: true, shift: true, key: 'D' };
    const onKey = (e) => {
        if (hotkey.ctrl && !e.ctrlKey)
            return;
        if (hotkey.shift && !e.shiftKey)
            return;
        if (hotkey.alt && !e.altKey)
            return;
        if (e.key.toUpperCase() !== hotkey.key.toUpperCase())
            return;
        e.preventDefault();
        handle.toggle();
    };
    window.addEventListener('keydown', onKey);
    const handle = {
        show() { panel.hidden = false; renderActive(); },
        hide() { panel.hidden = true; },
        toggle() { panel.hidden ? handle.show() : handle.hide(); },
        destroy() {
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('pageloaded', renderActive);
            if (registryPoll)
                clearInterval(registryPoll);
            clearStoreDisposers();
            host.remove();
            delete globalThis.__NC_DEVTOOLS__;
        },
    };
    globalThis.__NC_DEVTOOLS__ = handle;
    if (options.openByDefault)
        renderActive();
    return handle;
}

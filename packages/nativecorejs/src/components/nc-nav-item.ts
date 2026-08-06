/**
 * NcNavItem Component â€” sidebar / navigation link with icon, label, badge, active state
 *
 * Attributes:
 *   href       â€” link URL; if omitted renders as a <button>
 *   label      â€” visible text (can also use default slot)
 *   icon       â€” preset icon name OR raw SVG string (see below)
 *   active     â€” boolean â€” mark as active
 *   disabled   â€” boolean
 *   badge      â€” badge count (number string); shown as a pill on the right
 *   badge-variant â€” 'primary'(default)|'success'|'danger'|'warning'
 *   indent     â€” indentation level for nested nav (default: 0)
 *   target     â€” anchor target (default: '_self')
 *   exact      â€” boolean â€” only activate on exact URL match (router integration)
 *
 * Slots:
 *   icon   â€” custom icon (overrides icon attribute)
 *   (default) â€” label text (overrides label attribute)
 *   badge  â€” custom badge content
 *
 * Events:
 *   nav-click â€” CustomEvent<{ href: string | null }> â€” bubbles from both <a> and <button>
 *
 * Usage:
 *   <nc-nav-item href="/dashboard" label="Dashboard" icon="home" active></nc-nav-item>
 *   <nc-nav-item href="/users" label="Users" icon="users" badge="14"></nc-nav-item>
 */
import { CoreComponent } from '../../.nativecore/core/component.js';
import { css } from '../../.nativecore/utils/templates.js';

const NAV_ICONS: Record<string, string> = {
    home:        `<path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H14v-5h-4v5H4a1 1 0 0 1-1-1V9.5z"/>`,
    dashboard:   `<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>`,
    users:       `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
    settings:    `<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>`,
    chart:       `<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>`,
    inbox:       `<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>`,
    file:        `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>`,
    folder:      `<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>`,
    bell:        `<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>`,
    lock:        `<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>`,
    logout:      `<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>`,
    help:        `<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>`,
};

const svgWrap = (paths: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

export class NcNavItem extends CoreComponent {
    static useShadowDOM = true;
    static observedAttributes = ['active', 'disabled', 'badge', 'href', 'label', 'icon', 'badge-variant', 'indent'];
    static attributeOptions   = { 'badge-variant': ['primary', 'success', 'danger', 'warning'] };
    static attributeOrder     = ['href', 'label', 'icon', 'active', 'disabled', 'badge', 'badge-variant', 'indent'];

    // -- Refs -----------------------------------------------------------------
    declare linkEl:  HTMLAnchorElement;
    declare iconEl:  HTMLSpanElement;
    declare labelEl: HTMLSpanElement;
    declare badgeEl: HTMLSpanElement;

    static styles = css`
        :host { display: block; --_indent-px: 0px; }

        /* Badge variant colours */
        :host, :host([badge-variant="primary"]) { --_badge-bg: var(--nc-primary); --_badge-fg: var(--nc-white); }
        :host([badge-variant="success"]) { --_badge-bg: var(--nc-success); --_badge-fg: var(--nc-white); }
        :host([badge-variant="danger"])  { --_badge-bg: var(--nc-danger);  --_badge-fg: var(--nc-white); }
        :host([badge-variant="warning"]) { --_badge-bg: var(--nc-warning); --_badge-fg: var(--nc-text); }

        a {
            display: flex; align-items: center; gap: var(--nc-spacing-sm);
            width: 100%; padding: 9px var(--nc-spacing-md);
            padding-left: calc(var(--nc-spacing-md) + var(--_indent-px));
            border-radius: var(--nc-radius-md);
            text-decoration: none;
            font-family: var(--nc-font-family); font-size: var(--nc-font-size-sm);
            font-weight: var(--nc-font-weight-normal);
            color: var(--nc-text-secondary);
            background: transparent;
            border: none; cursor: pointer;
            text-align: left; outline: none;
            transition: background var(--nc-transition-fast), color var(--nc-transition-fast);
            user-select: none; position: relative;
            box-sizing: border-box;
        }
        :host([active]) a {
            font-weight: var(--nc-font-weight-semibold);
            color: var(--nc-primary);
            background: rgba(var(--nc-primary-rgb, 99,102,241), 0.1);
        }
        :host([active]) a::before {
            content: ''; position: absolute; left: 0; top: 20%; height: 60%;
            width: 3px; background: var(--nc-primary); border-radius: 0 2px 2px 0;
        }
        :host([disabled]) a { cursor: not-allowed; opacity: 0.5; }
        a:hover:not([aria-disabled="true"]) {
            background: var(--nc-bg-secondary); color: var(--nc-text);
        }
        :host([active]) a:hover { background: rgba(var(--nc-primary-rgb, 99,102,241), 0.14); color: var(--nc-primary); }
        a:focus-visible { outline: 2px solid var(--nc-primary); outline-offset: -2px; }

        .icon { flex-shrink: 0; display: flex; opacity: 0.65; }
        :host([active]) .icon { opacity: 1; }
        [hidden] { display: none !important; }
        .label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .badge {
            flex-shrink: 0;
            background: var(--_badge-bg); color: var(--_badge-fg);
            font-size: 10px; font-weight: var(--nc-font-weight-semibold);
            line-height: 1; padding: 2px 6px; border-radius: 99px;
            min-width: 18px; text-align: center;
        }
    `;

    template() {
        return `            <a ref="linkEl" aria-current="false">
                <span ref="iconEl" class="icon" hidden></span>
                <slot name="icon"></slot>
                <span ref="labelEl" class="label"></span>
                <slot></slot>
                <span ref="badgeEl" class="badge" hidden></span>
                <slot name="badge"></slot>
            </a>
        `;
    }

    onMount() {
        this._syncFromAttrs();
        this.on(this.linkEl, 'click', (e: MouseEvent) => {
            if (this.hasAttribute('disabled')) { e.preventDefault(); return; }
            this.emit('nav-click', { href: this.getAttribute('href') });
        });
        this.on(this, 'keydown', (e: KeyboardEvent) => {
            if ((e.key === ' ' || e.key === 'Enter') && !this.getAttribute('href') && !this.hasAttribute('disabled')) {
                e.preventDefault();
                this.emit('nav-click', { href: null });
            }
        });
    }

    protected _handleAttributeUpdate(_name: string, _val: string | null) {
        this._syncFromAttrs();
    }

    private _syncFromAttrs() {
        const href         = this.getAttribute('href');
        const label        = this.getAttribute('label') ?? '';
        const iconName     = this.getAttribute('icon') ?? '';
        const active       = this.hasAttribute('active');
        const disabled     = this.hasAttribute('disabled');
        const badge        = this.getAttribute('badge') ?? '';
        const indent       = parseInt(this.getAttribute('indent') ?? '0', 10);
        const target       = this.getAttribute('target') ?? '_self';

        // Link / button semantics
        if (href) {
            this.linkEl.setAttribute('href', href);
            this.linkEl.setAttribute('target', target);
            this.linkEl.removeAttribute('role');
            this.linkEl.removeAttribute('tabindex');
        } else {
            this.linkEl.removeAttribute('href');
            this.linkEl.setAttribute('role', 'button');
            this.linkEl.setAttribute('tabindex', disabled ? '-1' : '0');
        }
        this.linkEl.setAttribute('aria-current', active ? 'page' : 'false');
        this.linkEl.setAttribute('aria-disabled', String(disabled));

        // Indent
        this.style.setProperty('--_indent-px', `${indent * 16}px`);

        // Icon
        const iconHtml = NAV_ICONS[iconName]
            ? svgWrap(NAV_ICONS[iconName])
            : iconName.startsWith('<') ? iconName : '';
        this.iconEl.hidden = !iconHtml;
        if (iconHtml) this.iconEl.innerHTML = iconHtml;

        // Label
        this.labelEl.textContent = label;

        // Badge
        this.badgeEl.hidden = !badge;
        if (badge) this.badgeEl.textContent = badge;
    }
}

if (!customElements.get('nc-nav-item')) customElements.define('nc-nav-item', NcNavItem);

/**
 * NcBottomNav Component - mobile bottom navigation bar
 *
 * Container for nc-nav-bottom-item children. Handles active state management.
 * Designed for mobile viewports but works on all sizes.
 *
 * Attributes:
 *   value      - currently active tab value
 *   variant    - 'default'|'labeled'|'icon-only' (default: 'labeled')
 *   elevated   - boolean - add drop shadow / elevated appearance
 *   bordered   - boolean - top border (default: true)
 *
 * Slots:
 *   (default) - nc-bottom-nav-item elements
 *
 * Events:
 *   change - CustomEvent<{ value: string }> - tab changed
 *
 * Usage:
 *   <nc-bottom-nav value="home">
 *     <nc-bottom-nav-item value="home"   icon="home"   label="Home"></nc-bottom-nav-item>
 *     <nc-bottom-nav-item value="search" icon="search" label="Search"></nc-bottom-nav-item>
 *     <nc-bottom-nav-item value="inbox"  icon="inbox"  label="Inbox" badge="3"></nc-bottom-nav-item>
 *     <nc-bottom-nav-item value="me"     icon="users"  label="Me"></nc-bottom-nav-item>
 *   </nc-bottom-nav>
 */

/**
 * NcBottomNavItem Component - individual tab in a bottom nav bar
 *
 * Attributes:
 *   value    - unique identifier for this tab
 *   label    - tab label text
 *   icon     - icon name (same set as nc-nav-item)
 *   badge    - numeric badge count
 *   disabled - boolean
 *   active   - boolean (managed by parent nc-bottom-nav)
 */
import { Component, defineComponent } from '../../.nativecore/core/component.js';
import { html, raw, escapeHTML } from '../../.nativecore/utils/templates.js';

// Shared icon paths with nc-nav-item
const NAV_ICONS: Record<string, string> = {
    home:      `<path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H14v-5h-4v5H4a1 1 0 0 1-1-1V9.5z"/>`,
    search:    `<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>`,
    inbox:     `<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>`,
    users:     `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
    heart:     `<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>`,
    bookmark:  `<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>`,
    settings:  `<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>`,
    chart:     `<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>`,
    bell:      `<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>`,
};
const svgWrap = (p: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;

// -- NcBottomNavItem -----------------------------------------------------------

export class NcBottomNavItem extends Component {
    static useShadowDOM = true;

    static get observedAttributes() { return ['active', 'badge', 'disabled']; }

    template() {
        const value    = this.getAttribute('value') ?? '';
        const label    = this.getAttribute('label') ?? '';
        const iconName = this.getAttribute('icon') ?? '';
        const active   = this.hasAttribute('active');
        const disabled = this.hasAttribute('disabled');
        const badge    = this.getAttribute('badge') ?? '';
        const iconOnly = this.closest('nc-bottom-nav')?.getAttribute('variant') === 'icon-only';

        const iconHtml = NAV_ICONS[iconName] ? svgWrap(NAV_ICONS[iconName]) : '';

        return html`
            <style>
                :host { display: flex; flex: 1; }
                button {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 2px;
                    flex: 1;
                    padding: 6px 4px 8px;
                    background: none;
                    border: none;
                    cursor: ${disabled ? 'not-allowed' : 'pointer'};
                    opacity: ${disabled ? 0.4 : 1};
                    font-family: var(--nc-font-family);
                    font-size: 10px;
                    font-weight: var(--nc-font-weight-medium);
                    color: ${active ? 'var(--nc-primary)' : 'var(--nc-text-muted)'};
                    outline: none;
                    transition: color var(--nc-transition-fast);
                    position: relative;
                    min-width: 48px;
                    user-select: none;
                }
                button:focus-visible { color: var(--nc-primary); }
                .icon-wrap {
                    position: relative;
                    display: flex;
                }
                .icon-wrap svg {
                    transition: transform var(--nc-transition-fast);
                    ${active ? 'transform: translateY(-1px) scale(1.05);' : ''}
                }
                .badge {
                    position: absolute;
                    top: -5px;
                    right: -8px;
                    background: var(--nc-danger);
                    color: #fff;
                    font-size: 9px;
                    font-weight: 700;
                    min-width: 16px;
                    height: 16px;
                    border-radius: 99px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0 4px;
                    line-height: 1;
                    border: 1.5px solid var(--nc-bg-elevated, #fff);
                }
            </style>
            <button type="button" ${disabled ? 'disabled' : ''} aria-label="${raw(escapeHTML(label))}" aria-current="${active ? 'page' : 'false'}" data-value="${raw(escapeHTML(value))}">
                <span class="icon-wrap">
                    ${raw(iconHtml)}
                    <slot name="icon"></slot>
                    ${raw(badge ? `<span class="badge">${escapeHTML(badge)}</span>` : '')}
                </span>
                ${raw(!iconOnly && label ? `<span>${escapeHTML(label)}</span>` : '')}
            </button>
        `;
    }

    onMount() {
        this.shadowRoot!.addEventListener('click', () => {
            if (this.hasAttribute('disabled')) return;
            this.emitEvent('nc-bottom-nav-item-click', { value: this.getAttribute('value') });
        });
    }

    attributeChangedCallback(n: string, o: string, v: string) {
        if (o !== v && this._mounted) this.render();
    }
}

defineComponent('nc-bottom-nav-item', NcBottomNavItem);

// -- NcBottomNav ---------------------------------------------------------------

export class NcBottomNav extends Component {
    static useShadowDOM = true;

    static get observedAttributes() { return ['value']; }

    template() {
        const elevated = this.hasAttribute('elevated');
        const bordered = !this.hasAttribute('no-border');

        return html`
            <style>
                :host { display: block; }
                nav {
                    display: flex;
                    align-items: stretch;
                    background: var(--nc-bg-elevated, var(--nc-bg));
                    ${bordered ? 'border-top: 1px solid var(--nc-border);' : ''}
                    ${elevated ? 'box-shadow: 0 -2px 12px rgba(0,0,0,.08);' : ''}
                    padding-bottom: env(safe-area-inset-bottom);
                }
            </style>
            <nav role="navigation" aria-label="Bottom navigation">
                <slot></slot>
            </nav>
        `;
    }

    onMount() {
        this.addEventListener('nc-bottom-nav-item-click', (e: Event) => {
            const ce = e as CustomEvent<{ value: string }>;
            const newValue = ce.detail.value;
            this._setActive(newValue);
            this.emitEvent('nc-bottom-nav-change', { value: newValue });
        });

        // Set initial active state
        const initial = this.getAttribute('value');
        if (initial) this._setActive(initial);
    }

    private _setActive(value: string) {
        this.setAttribute('value', value);
        const items = this.querySelectorAll<HTMLElement>('nc-bottom-nav-item');
        items.forEach(item => {
            if (item.getAttribute('value') === value) item.setAttribute('active', '');
            else item.removeAttribute('active');
        });
    }

    attributeChangedCallback(n: string, o: string, v: string) {
        if (n === 'value' && o !== v && this._mounted) this._setActive(v);
    }
}

defineComponent('nc-bottom-nav', NcBottomNav);



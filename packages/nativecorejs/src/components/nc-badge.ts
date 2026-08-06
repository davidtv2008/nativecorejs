/**
 * NcBadge Component
 *
 * Attributes:
 *   - count: number — value to display (hidden when 0 unless show-zero)
 *   - max: number — cap value (default: 99); shows "max+" when exceeded
 *   - show-zero: boolean — show badge even when count is 0
 *   - dot: boolean — render as a small dot with no count
 *   - variant: 'primary'|'secondary'|'danger'|'warning'|'success'|'info'|'neutral' (default: 'danger')
 *   - position: 'top-right'|'top-left'|'bottom-right'|'bottom-left' (default: 'top-right')
 *
 * Usage:
 *   <nc-badge count="5"><nc-button>Inbox</nc-button></nc-badge>
 *   <nc-badge dot variant="success"><nc-button>Status</nc-button></nc-badge>
 */

import { CoreComponent } from '../../.nativecore/core/component.js';
import { css, html } from '../../.nativecore/utils/templates.js';

export class NcBadge extends CoreComponent {
    static useShadowDOM = true;

    static observedAttributes = ['count', 'max', 'show-zero', 'dot', 'variant', 'position'];

    static attributeOptions = {
        variant: ['primary', 'secondary', 'danger', 'warning', 'success', 'info', 'neutral'],
        position: ['top-right', 'top-left', 'bottom-right', 'bottom-left'],
        dot: ['true'],
        'show-zero': ['true'],
    };

    static attributeOrder = ['count', 'max', 'show-zero', 'dot', 'variant', 'position'];

    static attributePlaceholders = {
        count: '0',
        max: '99',
    };

    // ── Refs ──────────────────────────────────────────────────────────────────
    declare badgeEl: HTMLSpanElement;

    // ── State ─────────────────────────────────────────────────────────────────
    private label = this.state('');
    private isHidden = this.state(true);
    private dot = this.state(false);
    private variant = this.state('danger');
    private badgeAriaLabel = this.state('indicator');

    static styles = css`
        :host { display: inline-flex; position: relative; vertical-align: middle; }

        .badge {
            position: absolute;
            top: -6px;
            right: -6px;
            z-index: 1;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-family: var(--nc-font-family);
            font-size: 0.65rem;
            font-weight: var(--nc-font-weight-bold);
            line-height: 1;
            min-width: var(--_badge-minw, 18px);
            height: var(--_badge-h, 18px);
            padding: var(--_badge-pad, 0 5px);
            border-radius: 999px;
            border: 2px solid var(--nc-bg);
            white-space: nowrap;
            pointer-events: none;
            transition: transform var(--nc-transition-fast);
            transform: scale(var(--_badge-scale, 1));
        }

        :host([position="top-right"])    .badge { top: -6px;    right: -6px;  bottom: auto; left: auto; }
        :host([position="top-left"])     .badge { top: -6px;    left: -6px;   bottom: auto; right: auto; }
        :host([position="bottom-right"]) .badge { bottom: -6px; right: -6px;  top: auto;    left: auto; }
        :host([position="bottom-left"])  .badge { bottom: -6px; left: -6px;   top: auto;    right: auto; }

        .badge[hidden] { display: none; }

        .badge--primary   { background: var(--nc-primary); color: #fff; }
        .badge--secondary { background: var(--nc-secondary, #6366f1); color: #fff; }
        .badge--danger    { background: var(--nc-danger,  #ef4444); color: #fff; }
        .badge--warning   { background: var(--nc-warning, #f59e0b); color: #fff; }
        .badge--success   { background: var(--nc-success, #10b981); color: #fff; }
        .badge--info      { background: var(--nc-info,    #3b82f6); color: #fff; }
        .badge--neutral   { background: var(--nc-text-muted); color: #fff; }

        ::slotted(*) { display: inline-flex; }
    `;

    template() {
        return html`            <slot></slot>
            <span ref="badgeEl" class="badge badge--danger" hidden aria-label="indicator"></span>
        `;
    }

    onMount() {
        // label is text content; hidden toggles hidden attribute.
        this.bind(this.label, this.badgeEl);
        this.bind(this.isHidden, this.badgeEl, '?hidden');

        // Reactively keep class, aria and CSS variables in sync.
        this.effect(() => {
            this.badgeEl.className = `badge badge--${this.variant.value}`;
            this.badgeEl.setAttribute('aria-label', this.badgeAriaLabel.value);

            if (this.dot.value) {
                this.style.setProperty('--_badge-minw', '8px');
                this.style.setProperty('--_badge-h', '8px');
                this.style.setProperty('--_badge-pad', '0');
            } else {
                this.style.setProperty('--_badge-minw', '18px');
                this.style.setProperty('--_badge-h', '18px');
                this.style.setProperty('--_badge-pad', '0 5px');
            }
        });

        this._syncFromAttrs();
    }

    protected _handleAttributeUpdate(_name: string, _val: string | null) {
        this._syncFromAttrs();
    }

    private _syncFromAttrs() {
        const count = Number(this.getAttribute('count') || 0);
        const max = Number(this.getAttribute('max') || 99);
        const showZero = this.hasAttribute('show-zero');
        const isDot = this.hasAttribute('dot');
        const variant = this.getAttribute('variant') || 'danger';

        const visible = isDot || showZero || count > 0;
        const text = isDot ? '' : count > max ? `${max}+` : String(count);

        this.dot.value = isDot;
        this.isHidden.value = !visible;
        this.label.value = text;
        this.variant.value = variant;
        this.badgeAriaLabel.value = isDot ? 'indicator' : `${text} notifications`;
        this.style.setProperty('--_badge-scale', visible ? '1' : '0');
    }
}

if (!customElements.get('nc-badge')) customElements.define('nc-badge', NcBadge);


/**
 * NcChip Component
 *
 * Attributes:
 *   - variant: 'default'|'primary'|'success'|'warning'|'danger'|'neutral' (default: 'default')
 *   - size: 'sm'|'md'|'lg' (default: 'md')
 *   - dismissible: boolean — shows an x button; fires 'dismiss' event on click
 *   - disabled: boolean
 *   - icon: string — URL/path to a leading icon image
 *
 * Events:
 *   dismiss — fired when the x button is clicked
 *
 * Usage:
 *   <nc-chip>React</nc-chip>
 *   <nc-chip variant="success" dismissible>Published</nc-chip>
 */

import { CoreComponent } from '../../.nativecore/core/component.js';
import { css, html } from '../../.nativecore/utils/templates.js';

export class NcChip extends CoreComponent {
    static useShadowDOM = true;
    static observedAttributes = ['variant', 'size', 'dismissible', 'disabled', 'icon'];

    static attributeOptions = {
        variant: ['default', 'primary', 'success', 'warning', 'danger', 'neutral'],
        size:    ['sm', 'md', 'lg'],
    };

    static attributePlaceholders = {
        icon: '/icons/tag.svg',
    };

    static attributeOrder = ['variant', 'size', 'dismissible', 'disabled', 'icon'];

    // -- Refs ------------------------------------------------------------------
    declare chipEl:     HTMLSpanElement;
    declare iconEl:     HTMLImageElement;
    declare dismissBtn: HTMLButtonElement;

    // -- State -----------------------------------------------------------------
    private variant         = this.state('default');
    private iconSrc         = this.state('');
    private isIconHidden    = this.state(true);
    private isDismissHidden = this.state(true);

    static styles = css`
        :host { display: inline-flex; }

        .chip {
            display: inline-flex;
            align-items: center;
            gap: var(--nc-spacing-xs);
            border-radius: 999px;
            font-family: var(--nc-font-family);
            font-size: var(--nc-font-size-sm);
            font-weight: var(--nc-font-weight-medium);
            padding: 3px 10px;
            white-space: nowrap;
            border: 1px solid transparent;
            transition: opacity var(--nc-transition-fast);
        }

        :host([size="sm"]) .chip { font-size: var(--nc-font-size-xs);   padding: 2px 8px; }
        :host([size="lg"]) .chip { font-size: var(--nc-font-size-base);  padding: 6px 14px; }

        :host([disabled]) .chip { opacity: 0.5; pointer-events: none; }

        .chip--default { background: var(--nc-bg-secondary);       color: var(--nc-text);                 border-color: var(--nc-border); }
        .chip--primary { background: rgba(16,185,129,.12);          color: var(--nc-primary);              border-color: var(--nc-primary); }
        .chip--success { background: rgba(16,185,129,.12);          color: var(--nc-success, #10b981);     border-color: var(--nc-success, #10b981); }
        .chip--warning { background: rgba(245,158,11,.12);          color: var(--nc-warning, #f59e0b);     border-color: var(--nc-warning, #f59e0b); }
        .chip--danger  { background: rgba(239,68,68,.10);           color: var(--nc-danger,  #ef4444);     border-color: var(--nc-danger,  #ef4444); }
        .chip--neutral { background: var(--nc-bg-tertiary);         color: var(--nc-text-muted);           border-color: var(--nc-border-dark); }

        .chip__icon          { width: 14px; height: 14px; border-radius: 50%; object-fit: cover; }
        .chip__icon[hidden]  { display: none; }

        .chip__dismiss {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: none;
            border: none;
            cursor: pointer;
            padding: 0;
            margin-left: 2px;
            color: inherit;
            opacity: 0.6;
            transition: opacity var(--nc-transition-fast);
            line-height: 1;
        }
        .chip__dismiss:hover         { opacity: 1; }
        .chip__dismiss[hidden]       { display: none; }

        ::slotted(*) { pointer-events: none; }
    `;

    template() {
        return html`            <span ref="chipEl" class="chip chip--default">
                <img ref="iconEl" class="chip__icon" src="" alt="" aria-hidden="true" hidden />
                <slot></slot>
                <button ref="dismissBtn" class="chip__dismiss" type="button" aria-label="Remove" hidden>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="none" width="10" height="10">
                        <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                </button>
            </span>
        `;
    }

    onMount() {
        // Variant class
        this.effect(() => {
            this.chipEl.className = `chip chip--${this.variant.value}`;
        });

        // Icon
        this.bind(this.iconSrc,      this.iconEl, 'src');
        this.bind(this.isIconHidden, this.iconEl, '?hidden');

        // Dismiss button
        this.bind(this.isDismissHidden, this.dismissBtn, '?hidden');
        this.on(this.dismissBtn, 'click', (e: Event) => {
            e.stopPropagation();
            this.emit('dismiss');
        });

        this._syncFromAttrs();
    }

    protected _handleAttributeUpdate(_name: string, _val: string | null) {
        this._syncFromAttrs();
    }

    private _syncFromAttrs() {
        const icon = this.getAttribute('icon') || '';
        this.variant.value         = this.getAttribute('variant') || 'default';
        this.iconSrc.value         = icon;
        this.isIconHidden.value    = !icon;
        this.isDismissHidden.value = !this.hasAttribute('dismissible');
    }
}

if (!customElements.get('nc-chip')) customElements.define('nc-chip', NcChip);

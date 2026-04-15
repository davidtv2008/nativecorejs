/**
 * NcChip Component
 *
 * Attributes:
 *   - variant: 'default'|'primary'|'success'|'warning'|'danger'|'neutral' (default: 'default')
 *   - size: 'sm'|'md'|'lg' (default: 'md')
 *   - dismissible: boolean — shows an × button; fires 'dismiss' event on click
 *   - disabled: boolean
 *   - icon: string — URL/path to a leading icon image
 *
 * Events:
 *   - dismiss: CustomEvent (when × is clicked)
 *
 * Usage:
 *   <nc-chip>React</nc-chip>
 *   <nc-chip variant="success" dismissible>Published</nc-chip>
 */

import { Component, defineComponent } from '@core/component.js';

export class NcChip extends Component {
    static useShadowDOM = true;

    static get observedAttributes() {
        return ['variant', 'size', 'dismissible', 'disabled', 'icon'];
    }

    template() {
        const variant = this.getAttribute('variant') || 'default';
        const dismissible = this.hasAttribute('dismissible');
        const disabled = this.hasAttribute('disabled');
        const icon = this.getAttribute('icon');

        return `
            <style>
                :host { display: inline-flex; }

                .chip {
                    display: inline-flex;
                    align-items: center;
                    gap: var(--nc-spacing-xs);
                    border-radius: 999px;
                    font-family: var(--nc-font-family);
                    font-weight: var(--nc-font-weight-medium);
                    white-space: nowrap;
                    border: 1px solid transparent;
                    transition: opacity var(--nc-transition-fast);
                    opacity: ${disabled ? '0.5' : '1'};
                    pointer-events: ${disabled ? 'none' : 'auto'};
                }

                :host([size="sm"]) .chip { font-size: var(--nc-font-size-xs);  padding: 2px 8px; }
                :host([size="lg"]) .chip { font-size: var(--nc-font-size-base); padding: 6px 14px; }
                .chip                    { font-size: var(--nc-font-size-sm);   padding: 3px 10px; }

                /* Variants */
                .chip--default { background: var(--nc-bg-secondary); color: var(--nc-text); border-color: var(--nc-border); }
                .chip--primary { background: rgba(16,185,129,.12); color: var(--nc-primary); border-color: var(--nc-primary); }
                .chip--success { background: rgba(16,185,129,.12); color: var(--nc-success, #10b981); border-color: var(--nc-success, #10b981); }
                .chip--warning { background: rgba(245,158,11,.12); color: var(--nc-warning, #f59e0b); border-color: var(--nc-warning, #f59e0b); }
                .chip--danger  { background: rgba(239,68,68,.10);  color: var(--nc-danger,  #ef4444); border-color: var(--nc-danger,  #ef4444); }
                .chip--neutral { background: var(--nc-bg-tertiary); color: var(--nc-text-muted); border-color: var(--nc-border-dark); }

                .chip__icon { width: 14px; height: 14px; border-radius: 50%; object-fit: cover; }

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
                .chip__dismiss:hover { opacity: 1; }

                ::slotted(*) { pointer-events: none; }
            </style>
            <span class="chip chip--${variant}">
                ${icon ? `<img class="chip__icon" src="${icon}" alt="" aria-hidden="true" />` : ''}
                <slot></slot>
                ${dismissible ? `
                <button class="chip__dismiss" type="button" aria-label="Remove">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="none" width="10" height="10">
                        <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                </button>` : ''}
            </span>
        `;
    }

    onMount() {
        const btn = this.$<HTMLButtonElement>('.chip__dismiss');
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.dispatchEvent(new CustomEvent('dismiss', { bubbles: true, composed: true }));
            });
        }
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue !== newValue && this._mounted) {
            this.render();
            this.onMount();
        }
    }
}

defineComponent('nc-chip', NcChip);

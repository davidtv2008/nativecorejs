import { Component, defineComponent } from '../../.nativecore/core/component.js';
import { html, raw, sanitizeURL } from '../../.nativecore/utils/templates.js';

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

        return html`
            <style>
                :host { display: inline-flex; }

                .chip {
                    display: inline-flex;
                    align-items: center;
                    gap: var(--nc-spacing-xs, 0.25rem);
                    border-radius: 999px;
                    font-family: var(--nc-font-family);
                    font-weight: var(--nc-font-weight-medium, 500);
                    white-space: nowrap;
                    border: 1px solid transparent;
                    transition: opacity var(--nc-transition-fast, 160ms ease);
                    opacity: ${disabled ? '0.5' : '1'};
                    pointer-events: ${disabled ? 'none' : 'auto'};
                }

                :host([size="sm"]) .chip { font-size: var(--nc-font-size-xs, 0.75rem);  padding: 2px 8px; }
                :host([size="lg"]) .chip { font-size: var(--nc-font-size-base, 1rem); padding: 6px 14px; }
                .chip                    { font-size: var(--nc-font-size-sm, 0.875rem);   padding: 3px 10px; }

                .chip--default { background: var(--nc-bg-secondary, #f8fafc); color: var(--nc-text, #111827); border-color: var(--nc-border, #e5e7eb); }
                .chip--primary { background: rgba(16,185,129,.12); color: var(--nc-primary, #10b981); border-color: var(--nc-primary, #10b981); }
                .chip--success { background: rgba(16,185,129,.12); color: var(--nc-success, #10b981); border-color: var(--nc-success, #10b981); }
                .chip--warning { background: rgba(245,158,11,.12); color: var(--nc-warning, #f59e0b); border-color: var(--nc-warning, #f59e0b); }
                .chip--danger  { background: rgba(239,68,68,.10);  color: var(--nc-danger,  #ef4444); border-color: var(--nc-danger,  #ef4444); }
                .chip--neutral { background: var(--nc-bg-tertiary, #f3f4f6); color: var(--nc-text-muted, #6b7280); border-color: var(--nc-border-dark, #d1d5db); }

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
                    transition: opacity var(--nc-transition-fast, 160ms ease);
                    line-height: 1;
                }
                .chip__dismiss:hover { opacity: 1; }

                ::slotted(*) { pointer-events: none; }
            </style>
            <span class="chip chip--${variant}">
                ${raw(icon ? `<img class="chip__icon" src="${sanitizeURL(icon)}" alt="" aria-hidden="true" />` : '')}
                <slot></slot>
                ${raw(dismissible ? `
                <button class="chip__dismiss" type="button" aria-label="Remove">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="none" width="10" height="10">
                        <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                </button>` : '')}
            </span>
        `;
    }

    onMount() {
        const button = this.$<HTMLButtonElement>('.chip__dismiss');
        if (button) {
            button.addEventListener('click', event => {
                event.stopPropagation();
                this.emitEvent('nc-chip-dismiss', {});
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



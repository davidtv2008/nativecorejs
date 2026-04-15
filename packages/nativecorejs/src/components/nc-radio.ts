import { Component, defineComponent } from '../core/component.js';

export class NcRadio extends Component {
    static useShadowDOM = true;

    static attributeOptions = {
        variant: ['primary', 'success', 'danger'],
        size: ['sm', 'md', 'lg']
    };

    static get observedAttributes() {
        return ['label', 'name', 'value', 'checked', 'disabled', 'size', 'variant'];
    }

    template() {
        const label = this.getAttribute('label') || '';
        const size = this.getAttribute('size') || 'md';
        const checked = this.hasAttribute('checked');
        const disabled = this.hasAttribute('disabled');

        const dotSize = size === 'sm' ? '6px' : size === 'lg' ? '10px' : '8px';
        const boxSize = size === 'sm' ? '16px' : size === 'lg' ? '24px' : '20px';

        return `
            <style>
                :host {
                    display: inline-flex;
                    align-items: center;
                    gap: var(--nc-spacing-sm, 0.5rem);
                    cursor: ${disabled ? 'not-allowed' : 'pointer'};
                    user-select: none;
                    font-family: var(--nc-font-family);
                    opacity: ${disabled ? '0.5' : '1'};
                }
                .radio-wrapper {
                    display: inline-flex;
                    align-items: center;
                    gap: var(--nc-spacing-sm, 0.5rem);
                }
                input[type="radio"] {
                    position: absolute;
                    opacity: 0;
                    width: 0;
                    height: 0;
                    pointer-events: none;
                }
                .ring {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    width: ${boxSize};
                    height: ${boxSize};
                    border-radius: var(--nc-radius-full, 9999px);
                    border: 2px solid var(--nc-border-dark, #9ca3af);
                    background: var(--nc-bg, #ffffff);
                    transition: all var(--nc-transition-fast, 160ms ease);
                    box-sizing: border-box;
                    position: relative;
                }
                .dot {
                    width: ${dotSize};
                    height: ${dotSize};
                    border-radius: var(--nc-radius-full, 9999px);
                    background: var(--nc-white, #ffffff);
                    opacity: 0;
                    transform: scale(0);
                    transition: all var(--nc-transition-fast, 160ms ease);
                }
                :host([checked]) .ring {
                    border-color: var(--nc-primary, #10b981);
                    background: var(--nc-primary, #10b981);
                }
                :host([checked]) .dot {
                    opacity: 1;
                    transform: scale(1);
                }
                :host([variant="success"][checked]) .ring {
                    border-color: var(--nc-success, #10b981);
                    background: var(--nc-success, #10b981);
                }
                :host([variant="danger"][checked]) .ring {
                    border-color: var(--nc-danger, #ef4444);
                    background: var(--nc-danger, #ef4444);
                }
                :host(:not([disabled])) .ring:hover {
                    border-color: var(--nc-primary, #10b981);
                    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
                }
                :host([variant="success"]:not([disabled])) .ring:hover {
                    border-color: var(--nc-success, #10b981);
                    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
                }
                :host([variant="danger"]:not([disabled])) .ring:hover {
                    border-color: var(--nc-danger, #ef4444);
                    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
                }
                :host(:focus-visible) .ring {
                    outline: 2px solid var(--nc-primary, #10b981);
                    outline-offset: 2px;
                }
                .label {
                    font-size: var(--nc-font-size-base, 1rem);
                    color: var(--nc-text, #111827);
                    line-height: var(--nc-line-height-normal, 1.5);
                }
                :host([size="sm"]) .label {
                    font-size: var(--nc-font-size-sm, 0.875rem);
                }
                :host([size="lg"]) .label {
                    font-size: var(--nc-font-size-lg, 1.125rem);
                }
            </style>

            <label class="radio-wrapper">
                <input type="radio" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''} name="${this.getAttribute('name') || ''}" value="${this.getAttribute('value') || ''}" />
                <span class="ring"><span class="dot"></span></span>
                ${label ? `<span class="label">${label}</span>` : '<slot></slot>'}
            </label>
        `;
    }

    onMount() {
        if (!this.hasAttribute('tabindex')) {
            this.setAttribute('tabindex', '0');
        }
        this.setAttribute('role', 'radio');
        this.setAttribute('aria-checked', String(this.hasAttribute('checked')));

        this.shadowRoot?.addEventListener('click', () => {
            if (this.hasAttribute('disabled')) return;
            this.select();
        });

        this.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.key === ' ' || event.key === 'Enter') {
                event.preventDefault();
                if (!this.hasAttribute('disabled')) this.select();
            }
        });
    }

    private select() {
        if (this.hasAttribute('checked')) return;

        const name = this.getAttribute('name');
        if (name) {
            const root = this.getRootNode() as Document | ShadowRoot;
            const siblings = Array.from(root.querySelectorAll<NcRadio>(`nc-radio[name="${name}"]`));
            siblings.forEach(sibling => {
                if (sibling !== this) {
                    sibling.removeAttribute('checked');
                    sibling.setAttribute('aria-checked', 'false');
                }
            });
        }

        this.setAttribute('checked', '');
        this.setAttribute('aria-checked', 'true');

        this.dispatchEvent(new CustomEvent('change', {
            bubbles: true,
            composed: true,
            detail: {
                value: this.getAttribute('value') || '',
                name: this.getAttribute('name') || ''
            }
        }));
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue !== newValue) {
            this.render();
            if (name === 'checked') {
                this.setAttribute('aria-checked', String(this.hasAttribute('checked')));
            }
        }
    }
}

defineComponent('nc-radio', NcRadio);

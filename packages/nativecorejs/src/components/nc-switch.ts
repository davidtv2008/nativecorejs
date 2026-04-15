import { Component, defineComponent } from '../core/component.js';

export class NcSwitch extends Component {
    static useShadowDOM = true;

    static attributeOptions = {
        variant: ['primary', 'success', 'danger'],
        size: ['sm', 'md', 'lg'],
        'label-position': ['left', 'right']
    };

    static get observedAttributes() {
        return ['label', 'label-position', 'name', 'value', 'checked', 'disabled', 'size', 'variant'];
    }

    template() {
        const label = this.getAttribute('label') || '';
        const labelPosition = this.getAttribute('label-position') || 'right';
        const disabled = this.hasAttribute('disabled');

        const labelElement = label ? `<span class="label">${label}</span>` : '<slot></slot>';
        const track = `<span class="track"><span class="thumb"></span></span>`;

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
                .switch-wrapper {
                    display: inline-flex;
                    align-items: center;
                    gap: var(--nc-spacing-sm, 0.5rem);
                }
                input[type="checkbox"] {
                    position: absolute;
                    opacity: 0;
                    width: 0;
                    height: 0;
                    pointer-events: none;
                }
                .track {
                    display: inline-flex;
                    align-items: center;
                    flex-shrink: 0;
                    border-radius: var(--nc-radius-full, 9999px);
                    background: var(--nc-gray-300, #d1d5db);
                    transition: background var(--nc-transition-fast, 160ms ease);
                    position: relative;
                    box-sizing: border-box;
                    padding: 2px;
                }
                :host([size="sm"]) .track {
                    width: 32px;
                    height: 18px;
                }
                :host([size="sm"]) .thumb {
                    width: 14px;
                    height: 14px;
                }
                .track {
                    width: 44px;
                    height: 24px;
                }
                .thumb {
                    width: 20px;
                    height: 20px;
                }
                :host([size="md"]) .track {
                    width: 44px;
                    height: 24px;
                }
                :host([size="md"]) .thumb {
                    width: 20px;
                    height: 20px;
                }
                :host([size="lg"]) .track {
                    width: 56px;
                    height: 30px;
                }
                :host([size="lg"]) .thumb {
                    width: 26px;
                    height: 26px;
                }
                .thumb {
                    border-radius: var(--nc-radius-full, 9999px);
                    background: var(--nc-white, #ffffff);
                    box-shadow: var(--nc-shadow-sm, 0 1px 2px rgba(0,0,0,0.08));
                    transition: transform var(--nc-transition-fast, 160ms ease);
                    transform: translateX(0);
                    flex-shrink: 0;
                }
                :host([checked]) .thumb {
                    transform: translateX(calc(100% - 0px));
                }
                :host([size="sm"][checked]) .thumb {
                    transform: translateX(14px);
                }
                :host([size="md"][checked]) .thumb,
                :host([checked]:not([size])) .thumb {
                    transform: translateX(20px);
                }
                :host([size="lg"][checked]) .thumb {
                    transform: translateX(26px);
                }
                :host([checked]) .track {
                    background: var(--nc-primary, #10b981);
                }
                :host([variant="success"][checked]) .track {
                    background: var(--nc-success, #10b981);
                }
                :host([variant="danger"][checked]) .track {
                    background: var(--nc-danger, #ef4444);
                }
                :host(:not([disabled])) .track:hover {
                    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
                }
                :host([variant="success"]:not([disabled])) .track:hover {
                    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
                }
                :host([variant="danger"]:not([disabled])) .track:hover {
                    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
                }
                :host(:focus-visible) .track {
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

            <input type="hidden" name="${this.getAttribute('name') || ''}" value="${this.hasAttribute('checked') ? (this.getAttribute('value') || 'on') : ''}" />
            <span class="switch-wrapper">
                ${labelPosition === 'left' ? labelElement : ''}
                ${track}
                ${labelPosition !== 'left' ? labelElement : ''}
            </span>
        `;
    }

    onMount() {
        if (!this.hasAttribute('tabindex')) {
            this.setAttribute('tabindex', '0');
        }
        this.setAttribute('role', 'switch');
        this.setAttribute('aria-checked', String(this.hasAttribute('checked')));

        this.addEventListener('click', () => {
            if (this.hasAttribute('disabled')) return;
            this.toggle();
        });

        this.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.key === ' ' || event.key === 'Enter') {
                event.preventDefault();
                if (!this.hasAttribute('disabled')) this.toggle();
            }
        });
    }

    private toggle() {
        if (this.hasAttribute('checked')) {
            this.removeAttribute('checked');
        } else {
            this.setAttribute('checked', '');
        }

        this.setAttribute('aria-checked', String(this.hasAttribute('checked')));

        this.dispatchEvent(new CustomEvent('change', {
            bubbles: true,
            composed: true,
            detail: {
                checked: this.hasAttribute('checked'),
                value: this.getAttribute('value') || 'on',
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

defineComponent('nc-switch', NcSwitch);

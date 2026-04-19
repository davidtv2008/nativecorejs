import { Component, defineComponent } from '../../.nativecore/core/component.js';

export class NcCheckbox extends Component {
    static useShadowDOM = true;

    private readonly handleInputChange = (event: Event) => {
        const target = event.target as HTMLInputElement | null;
        if (!target || target.type !== 'checkbox') return;
        this.setCheckedState(target.checked);
    };

    private readonly handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            if (!this.hasAttribute('disabled')) {
                this.setCheckedState(!this.hasAttribute('checked'));
            }
        }
    };

    static attributeOptions = {
        variant: ['primary', 'success', 'danger'],
        size: ['sm', 'md', 'lg']
    };

    static get observedAttributes() {
        return ['label', 'name', 'value', 'checked', 'disabled', 'size', 'variant', 'indeterminate'];
    }

    template() {
        const label = this.getAttribute('label') || '';
        const size = this.getAttribute('size') || 'md';
        const checked = this.hasAttribute('checked');
        const disabled = this.hasAttribute('disabled');

        return html`
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
                .checkbox-wrapper {
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
                .box {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    border-radius: var(--nc-radius-sm, 4px);
                    border: 2px solid var(--nc-border-dark, #9ca3af);
                    background: var(--nc-bg, #ffffff);
                    transition: all var(--nc-transition-fast, 160ms ease);
                    position: relative;
                    box-sizing: border-box;
                }
                :host([size="sm"]) .box,
                :host(:not([size])) .box {
                    width: 16px;
                    height: 16px;
                }
                :host([size="md"]) .box {
                    width: 20px;
                    height: 20px;
                }
                :host([size="lg"]) .box {
                    width: 24px;
                    height: 24px;
                }
                .box {
                    width: 20px;
                    height: 20px;
                }
                :host([checked]) .box,
                :host([indeterminate]) .box {
                    border-color: var(--nc-primary, #10b981);
                    background: var(--nc-primary, #10b981);
                }
                :host([variant="success"][checked]) .box,
                :host([variant="success"][indeterminate]) .box {
                    border-color: var(--nc-success, #10b981);
                    background: var(--nc-success, #10b981);
                }
                :host([variant="danger"][checked]) .box,
                :host([variant="danger"][indeterminate]) .box {
                    border-color: var(--nc-danger, #ef4444);
                    background: var(--nc-danger, #ef4444);
                }
                .check-icon {
                    display: none;
                    pointer-events: none;
                }
                :host([checked]) .check-icon {
                    display: block;
                }
                .indeterminate-icon {
                    display: none;
                    pointer-events: none;
                }
                :host([indeterminate]:not([checked])) .indeterminate-icon {
                    display: block;
                }
                :host([indeterminate]:not([checked])) .check-icon {
                    display: none;
                }
                :host(:not([disabled])) .box:hover {
                    border-color: var(--nc-primary, #10b981);
                    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
                }
                :host([variant="success"]:not([disabled])) .box:hover {
                    border-color: var(--nc-success, #10b981);
                    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
                }
                :host([variant="danger"]:not([disabled])) .box:hover {
                    border-color: var(--nc-danger, #ef4444);
                    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
                }
                :host(:focus-visible) .box {
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

            <label class="checkbox-wrapper">
                <input type="checkbox" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''} name="${this.getAttribute('name') || ''}" value="${this.getAttribute('value') || 'on'}" />
                <span class="box">
                    <svg class="check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="none" width="${size === 'sm' ? '8' : size === 'lg' ? '14' : '11'}" height="${size === 'sm' ? '8' : size === 'lg' ? '14' : '11'}"><path d="M2 6l3 3 5-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    <svg class="indeterminate-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="none" width="${size === 'sm' ? '8' : size === 'lg' ? '14' : '11'}" height="${size === 'sm' ? '8' : size === 'lg' ? '14' : '11'}"><path d="M2 6h8" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>
                </span>
                ${raw(label ? `<span class="label">${label}</span>` : '<slot></slot>')}
            </label>
        `;
    }

    onMount() {
        if (!this.hasAttribute('tabindex')) {
            this.setAttribute('tabindex', '0');
        }
        this.setAttribute('role', 'checkbox');
        this.setAttribute('aria-checked', String(this.hasAttribute('checked')));
        this.shadowRoot?.addEventListener('change', this.handleInputChange);
        this.addEventListener('keydown', this.handleKeyDown);
    }

    onUnmount() {
        this.shadowRoot?.removeEventListener('change', this.handleInputChange);
        this.removeEventListener('keydown', this.handleKeyDown);
    }

    private setCheckedState(isChecked: boolean) {
        if (isChecked) {
            this.setAttribute('checked', '');
            this.removeAttribute('indeterminate');
        } else {
            this.removeAttribute('checked');
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
        if (oldValue !== newValue && this._mounted) {
            this.render();
            if (name === 'checked') {
                this.setAttribute('aria-checked', String(this.hasAttribute('checked')));
            }
        }
    }
}

defineComponent('nc-checkbox', NcCheckbox);


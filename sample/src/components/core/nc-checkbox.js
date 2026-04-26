/**
 * NcCheckbox Component
 *
 * NativeCore Framework Core Component
 *
 * Attributes:
 *   - label: string — text label shown next to the checkbox
 *   - name: string — form field name
 *   - value: string — value submitted with a form (default: 'on')
 *   - checked: boolean — checked state
 *   - disabled: boolean — disabled state
 *   - size: 'sm' | 'md' | 'lg' (default: 'md')
 *   - variant: 'primary' | 'success' | 'danger' (default: 'primary')
 *   - indeterminate: boolean — indeterminate visual state
 *
 * Events:
 *   - change: CustomEvent<{ checked: boolean; value: string; name: string }>
 *
 * Usage:
 *   <nc-checkbox label="Accept terms" name="terms" checked></nc-checkbox>
 *   <nc-checkbox label="Disabled" disabled></nc-checkbox>
 *   <nc-checkbox label="Danger" variant="danger"></nc-checkbox>
 */
import { Component, defineComponent } from '@core/component.js';
import { html, trusted } from '@core-utils/templates.js';
export class NcCheckbox extends Component {
    static useShadowDOM = true;
    _handleInputChange = (event) => {
        const target = event.target;
        if (!target || target.type !== 'checkbox')
            return;
        this._setCheckedState(target.checked);
    };
    _handleKeyDown = (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            if (!this.hasAttribute('disabled')) {
                this._setCheckedState(!this.hasAttribute('checked'));
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
    constructor() {
        super();
    }
    template() {
        const label = this.getAttribute('label') || '';
        const size = this.getAttribute('size') || 'md';
        const checked = this.hasAttribute('checked');
        const disabled = this.hasAttribute('disabled');
        return html `
            <style>
                :host {
                    display: inline-flex;
                    align-items: center;
                    gap: var(--nc-spacing-sm);
                    cursor: ${disabled ? 'not-allowed' : 'pointer'};
                    user-select: none;
                    font-family: var(--nc-font-family);
                    opacity: ${disabled ? '0.5' : '1'};
                }

                .checkbox-wrapper {
                    display: inline-flex;
                    align-items: center;
                    gap: var(--nc-spacing-sm);
                }

                /* Hidden native input — keeps form semantics */
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
                    border-radius: var(--nc-radius-sm);
                    border: 2px solid var(--nc-border-dark);
                    background: var(--nc-bg);
                    transition: all var(--nc-transition-fast);
                    position: relative;
                    box-sizing: border-box;
                }

                /* Size variants */
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

                /* Default size (md) */
                .box {
                    width: 20px;
                    height: 20px;
                }

                /* Checked state — variant colors */
                :host([checked]) .box,
                :host([indeterminate]) .box {
                    border-color: var(--nc-primary);
                    background: var(--nc-primary);
                }

                :host([variant="success"][checked]) .box,
                :host([variant="success"][indeterminate]) .box {
                    border-color: var(--nc-success);
                    background: var(--nc-success);
                }

                :host([variant="danger"][checked]) .box,
                :host([variant="danger"][indeterminate]) .box {
                    border-color: var(--nc-danger);
                    background: var(--nc-danger);
                }

                /* Checkmark SVG */
                .check-icon {
                    display: none;
                    pointer-events: none;
                }

                :host([checked]) .check-icon {
                    display: block;
                }

                /* Indeterminate dash */
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

                /* Hover */
                :host(:not([disabled])) .box:hover {
                    border-color: var(--nc-primary);
                    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
                }

                :host([variant="success"]:not([disabled])) .box:hover {
                    border-color: var(--nc-success);
                    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
                }

                :host([variant="danger"]:not([disabled])) .box:hover {
                    border-color: var(--nc-danger);
                    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
                }

                /* Focus ring */
                :host(:focus-visible) .box {
                    outline: 2px solid var(--nc-primary);
                    outline-offset: 2px;
                }

                /* Label */
                .label {
                    font-size: var(--nc-font-size-base);
                    color: var(--nc-text);
                    line-height: var(--nc-line-height-normal);
                }

                :host([size="sm"]) .label {
                    font-size: var(--nc-font-size-sm);
                }

                :host([size="lg"]) .label {
                    font-size: var(--nc-font-size-lg);
                }
            </style>

            <label class="checkbox-wrapper">
                <input
                    type="checkbox"
                    ${checked ? 'checked' : ''}
                    ${disabled ? 'disabled' : ''}
                    name="${this.getAttribute('name') || ''}"
                    value="${this.getAttribute('value') || 'on'}"
                />
                <span class="box">
                    <svg class="check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="none"
                        width="${size === 'sm' ? '8' : size === 'lg' ? '14' : '11'}"
                        height="${size === 'sm' ? '8' : size === 'lg' ? '14' : '11'}">
                        <path d="M2 6l3 3 5-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <svg class="indeterminate-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="none"
                        width="${size === 'sm' ? '8' : size === 'lg' ? '14' : '11'}"
                        height="${size === 'sm' ? '8' : size === 'lg' ? '14' : '11'}">
                        <path d="M2 6h8" stroke="white" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </span>
                ${trusted(label ? `<span class="label">${label}</span>` : '<slot></slot>')}
            </label>
        `;
    }
    onMount() {
        if (!this.hasAttribute('tabindex')) {
            this.setAttribute('tabindex', '0');
        }
        this.setAttribute('role', 'checkbox');
        this.setAttribute('aria-checked', String(this.hasAttribute('checked')));
        this.shadowRoot.addEventListener('change', this._handleInputChange);
        this.addEventListener('keydown', this._handleKeyDown);
    }
    onUnmount() {
        this.shadowRoot?.removeEventListener('change', this._handleInputChange);
        this.removeEventListener('keydown', this._handleKeyDown);
    }
    _setCheckedState(isChecked) {
        if (isChecked) {
            this.setAttribute('checked', '');
            this.removeAttribute('indeterminate');
        }
        else {
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
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            this.render();
            if (name === 'checked' || name === 'indeterminate') {
                this.setAttribute('aria-checked', this.hasAttribute('indeterminate') ? 'mixed' : String(this.hasAttribute('checked')));
            }
        }
    }
}
defineComponent('nc-checkbox', NcCheckbox);

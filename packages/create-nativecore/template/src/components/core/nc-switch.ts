/**
 * NcSwitch Component
 *
 * NativeCore Framework Core Component
 *
 * Attributes:
 *   - label: string — text label shown next to the switch
 *   - label-position: 'left' | 'right' (default: 'right')
 *   - name: string — form field name
 *   - value: string — value submitted with a form (default: 'on')
 *   - checked: boolean — on state
 *   - disabled: boolean — disabled state
 *   - size: 'sm' | 'md' | 'lg' (default: 'md')
 *   - variant: 'primary' | 'success' | 'danger' (default: 'primary')
 *
 * Events:
 *   - change: CustomEvent<{ checked: boolean; value: string; name: string }>
 *
 * Usage:
 *   <nc-switch label="Enable notifications" name="notifs"></nc-switch>
 *   <nc-switch label="Active" checked variant="success"></nc-switch>
 *   <nc-switch label="Danger mode" variant="danger" size="lg"></nc-switch>
 */

import { Component, defineComponent } from '@core/component.js';
import { html } from '@core-utils/templates.js';

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

    constructor() {
        super();
    }

    template() {
        const label = this.getAttribute('label') || '';
        const labelPosition = this.getAttribute('label-position') || 'right';
        const disabled = this.hasAttribute('disabled');

        const labelEl = label
            ? `<span class="label">${label}</span>`
            : `<slot></slot>`;

        const track = `
            <span class="track">
                <span class="thumb"></span>
            </span>
        `;

        return html`
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

                .switch-wrapper {
                    display: inline-flex;
                    align-items: center;
                    gap: var(--nc-spacing-sm);
                }

                input[type="checkbox"] {
                    position: absolute;
                    opacity: 0;
                    width: 0;
                    height: 0;
                    pointer-events: none;
                }

                /* Track */
                .track {
                    display: inline-flex;
                    align-items: center;
                    flex-shrink: 0;
                    border-radius: var(--nc-radius-full);
                    background: var(--nc-gray-300);
                    transition: background var(--nc-transition-fast);
                    position: relative;
                    box-sizing: border-box;
                    padding: 2px;
                }

                /* Size: sm */
                :host([size="sm"]) .track {
                    width: 32px;
                    height: 18px;
                }

                :host([size="sm"]) .thumb {
                    width: 14px;
                    height: 14px;
                }

                /* Size: md (default) */
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

                /* Size: lg */
                :host([size="lg"]) .track {
                    width: 56px;
                    height: 30px;
                }

                :host([size="lg"]) .thumb {
                    width: 26px;
                    height: 26px;
                }

                /* Thumb */
                .thumb {
                    border-radius: var(--nc-radius-full);
                    background: var(--nc-white);
                    box-shadow: var(--nc-shadow-sm);
                    transition: transform var(--nc-transition-fast);
                    transform: translateX(0);
                    flex-shrink: 0;
                }

                /* Checked — move thumb right */
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

                /* Checked track colors */
                :host([checked]) .track {
                    background: var(--nc-primary);
                }

                :host([variant="success"][checked]) .track {
                    background: var(--nc-success);
                }

                :host([variant="danger"][checked]) .track {
                    background: var(--nc-danger);
                }

                /* Hover glow */
                :host(:not([disabled])) .track:hover {
                    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
                }

                :host([variant="success"]:not([disabled])) .track:hover {
                    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
                }

                :host([variant="danger"]:not([disabled])) .track:hover {
                    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
                }

                /* Focus ring */
                :host(:focus-visible) .track {
                    outline: 2px solid var(--nc-primary);
                    outline-offset: 2px;
                }

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

            <input type="hidden"
                name="${this.getAttribute('name') || ''}"
                value="${this.hasAttribute('checked') ? (this.getAttribute('value') || 'on') : ''}"
            />
            <span class="switch-wrapper">
                ${labelPosition === 'left' ? labelEl : ''}
                ${track}
                ${labelPosition !== 'left' ? labelEl : ''}
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
            this._toggle();
        });

        this.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                if (!this.hasAttribute('disabled')) this._toggle();
            }
        });
    }

    private _toggle() {
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
        if (oldValue === newValue) return;

        if (name === 'checked') {
            // Let :host([checked]) CSS handle the visual — no re-render needed
            this.setAttribute('aria-checked', String(this.hasAttribute('checked')));
            return;
        }

        this.render();
    }
}

defineComponent('nc-switch', NcSwitch);


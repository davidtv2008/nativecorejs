/**
 * NcTextarea Component
 *
 * NativeCore Framework Core Component
 *
 * Attributes:
 *   - name: string — form field name
 *   - value: string — current value
 *   - placeholder: string — placeholder text
 *   - rows: number — visible row count (default: 4)
 *   - disabled: boolean — disabled state
 *   - readonly: boolean — read-only state
 *   - maxlength: number — character limit (shows counter when set)
 *   - autoresize: boolean — grow to fit content automatically
 *   - size: 'sm' | 'md' | 'lg' (default: 'md')
 *   - variant: 'default' | 'filled' (default: 'default')
 *
 * Events:
 *   - input: CustomEvent<{ value: string; name: string }>
 *   - change: CustomEvent<{ value: string; name: string }>
 *
 * Usage:
 *   <nc-textarea name="bio" placeholder="Tell us about yourself" rows="4"></nc-textarea>
 *   <nc-textarea name="notes" maxlength="200" autoresize></nc-textarea>
 */

import { Component, defineComponent } from '@core/component.js';
import { html } from '@utils/templates.js';

export class NcTextarea extends Component {
    static useShadowDOM = true;

    static attributeOptions = {
        variant: ['default', 'filled'],
        size: ['sm', 'md', 'lg']
    };

    static get observedAttributes() {
        return ['name', 'value', 'placeholder', 'rows', 'disabled', 'readonly', 'maxlength', 'autoresize', 'size', 'variant'];
    }

    constructor() {
        super();
    }

    template() {
        const value = this.getAttribute('value') || '';
        const placeholder = this.getAttribute('placeholder') || '';
        const rows = this.getAttribute('rows') || '4';
        const disabled = this.hasAttribute('disabled');
        const readonly = this.hasAttribute('readonly');
        const maxlength = this.getAttribute('maxlength');
        const autoresize = this.hasAttribute('autoresize');
        const charCount = value.length;

        return html`
            <style>
                :host {
                    display: block;
                    font-family: var(--nc-font-family);
                    width: 100%;
                }

                .wrap {
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    gap: var(--nc-spacing-xs);
                }

                textarea {
                    width: 100%;
                    box-sizing: border-box;
                    padding: var(--nc-spacing-sm) var(--nc-spacing-md);
                    background: var(--nc-bg);
                    border: var(--nc-input-border);
                    border-radius: var(--nc-input-radius);
                    color: var(--nc-text);
                    font-size: var(--nc-font-size-base);
                    font-family: var(--nc-font-family);
                    line-height: var(--nc-line-height-normal);
                    resize: ${autoresize ? 'none' : 'vertical'};
                    transition: border-color var(--nc-transition-fast), box-shadow var(--nc-transition-fast);
                    outline: none;
                    min-height: 80px;
                    opacity: ${disabled ? '0.5' : '1'};
                    cursor: ${disabled ? 'not-allowed' : 'auto'};
                }

                :host([size="sm"]) textarea {
                    padding: var(--nc-spacing-xs) var(--nc-spacing-sm);
                    font-size: var(--nc-font-size-sm);
                }

                :host([size="lg"]) textarea {
                    padding: var(--nc-spacing-md) var(--nc-spacing-lg);
                    font-size: var(--nc-font-size-lg);
                }

                :host([variant="filled"]) textarea {
                    background: var(--nc-bg-tertiary);
                    border-color: transparent;
                }

                :host([variant="filled"]) textarea:hover:not(:disabled) {
                    background: var(--nc-bg-secondary);
                }

                textarea:hover:not(:disabled) {
                    border-color: var(--nc-input-focus-border);
                }

                textarea:focus {
                    border-color: var(--nc-input-focus-border);
                    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
                }

                textarea::placeholder {
                    color: var(--nc-text-muted);
                }

                .counter {
                    align-self: flex-end;
                    font-size: var(--nc-font-size-xs);
                    color: var(--nc-text-muted);
                    line-height: 1;
                }

                .counter.over {
                    color: var(--nc-danger);
                    font-weight: var(--nc-font-weight-semibold);
                }
            </style>

            <div class="wrap">
                <textarea
                    rows="${rows}"
                    ${maxlength ? `maxlength="${maxlength}"` : ''}
                    ${disabled ? 'disabled' : ''}
                    ${readonly ? 'readonly' : ''}
                    placeholder="${placeholder}"
                    name="${this.getAttribute('name') || ''}"
                    aria-multiline="true"
                >${value}</textarea>
                ${maxlength ? `
                <span class="counter${charCount > Number(maxlength) ? ' over' : ''}">${charCount} / ${maxlength}</span>` : ''}
            </div>
        `;
    }

    onMount() {
        this._bindEvents();
    }

    private _bindEvents() {
        const ta = this.shadowRoot!.querySelector<HTMLTextAreaElement>('textarea');
        if (!ta) return;

        if (this.hasAttribute('autoresize')) {
            this._autoResize(ta);
        }

        ta.addEventListener('input', () => {
            if (this.hasAttribute('autoresize')) this._autoResize(ta);
            this._updateCounter(ta.value);

            this.dispatchEvent(new CustomEvent('input', {
                bubbles: true, composed: true,
                detail: { value: ta.value, name: this.getAttribute('name') || '' }
            }));
        });

        ta.addEventListener('change', () => {
            this.setAttribute('value', ta.value);
            this.dispatchEvent(new CustomEvent('change', {
                bubbles: true, composed: true,
                detail: { value: ta.value, name: this.getAttribute('name') || '' }
            }));
        });
    }

    private _autoResize(ta: HTMLTextAreaElement) {
        ta.style.height = 'auto';
        ta.style.height = `${ta.scrollHeight}px`;
    }

    private _updateCounter(value: string) {
        const maxlength = this.getAttribute('maxlength');
        if (!maxlength) return;
        const counter = this.shadowRoot!.querySelector('.counter');
        if (!counter) return;
        const count = value.length;
        const max = Number(maxlength);
        counter.textContent = `${count} / ${maxlength}`;
        counter.classList.toggle('over', count > max);
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue === newValue) return;
        // Don't rebuild DOM for live value changes — the textarea manages its own value
        if (name === 'value' && this._mounted) {
            const ta = this.shadowRoot!.querySelector<HTMLTextAreaElement>('textarea');
            if (ta) {
                ta.value = newValue || '';
                this._updateCounter(ta.value);
                if (this.hasAttribute('autoresize')) this._autoResize(ta);
            }
            return;
        }
        if (this._mounted) {
            this.render();
            this._bindEvents();
        }
    }
}

defineComponent('nc-textarea', NcTextarea);

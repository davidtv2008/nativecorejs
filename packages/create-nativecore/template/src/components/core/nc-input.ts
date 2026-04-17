/**
 * NcInput Component
 *
 * Attributes:
 *   - name: string
 *   - value: string
 *   - type: 'text'|'email'|'password'|'search'|'url'|'tel'|'number' (default: 'text')
 *   - placeholder: string
 *   - disabled: boolean
 *   - readonly: boolean
 *   - required: boolean
 *   - maxlength: number
 *   - minlength: number
 *   - pattern: string — validation regex pattern
 *   - autocomplete: string
 *   - size: 'sm'|'md'|'lg' (default: 'md')
 *   - variant: 'default'|'filled' (default: 'default')
 *   - icon-left: string — SVG/HTML string for leading icon
 *   - icon-right: string — SVG/HTML string for trailing icon
 *   - clearable: boolean — show clear (×) button when value is non-empty
 *   - show-password-toggle: boolean — toggles password visibility (type="password" only)
 *   - error: string — error message; also sets error styling
 *   - hint: string — hint text below the input
 *
 * Events:
 *   - input:  CustomEvent<{ value: string; name: string }>
 *   - change: CustomEvent<{ value: string; name: string }>
 *   - clear:  CustomEvent<{ name: string }> (when cleared via button)
 *
 * Methods:
 *   - checkValidity(): boolean
 *   - validate(): boolean
 *   - reportValidity(): boolean
 *   - getValidationMessage(): string
 *   - clearValidationError(): void
 *
 * Usage:
 *   <nc-input name="email" type="email" placeholder="you@example.com"></nc-input>
 *   <nc-input name="pwd" type="password" show-password-toggle></nc-input>
 *   <nc-input name="q" type="search" clearable placeholder="Search..."></nc-input>
 */

import { Component, defineComponent } from '@core/component.js';
import { html } from '@utils/templates.js';

const EYE_OPEN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16"><path d="M1 10s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6z"/><circle cx="10" cy="10" r="2.5"/></svg>`;
const EYE_CLOSED = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16"><path d="M2 2l16 16M7.5 7.5A3 3 0 0012.5 12.5M4.2 4.2C2.6 5.5 1 8 1 10s3 6 9 6c2 0 3.8-.5 5.3-1.3M8 4.3A8.7 8.7 0 0110 4c6 0 9 6 9 6s-.9 1.8-2.5 3.2"/></svg>`;
const CLEAR_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" width="12" height="12"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
const SEARCH_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14"><circle cx="6.5" cy="6.5" r="4"/><path d="M11 11l3 3" stroke-linecap="round"/></svg>`;

export class NcInput extends Component {
    static useShadowDOM = true;

    static get observedAttributes() {
        return [
            'name', 'value', 'type', 'placeholder', 'disabled', 'readonly', 'required',
            'maxlength', 'minlength', 'pattern', 'autocomplete',
            'size', 'variant', 'icon-left', 'icon-right',
            'clearable', 'show-password-toggle', 'error', 'hint',
        ];
    }

    private _value = '';
    private _showPassword = false;
    private _validationError = '';
    private readonly _handleInputEvent = (event: Event) => {
        const input = event.target as HTMLInputElement | null;
        if (!input || input.tagName !== 'INPUT') return;

        this._value = input.value;
        if (this._validationError) {
            this._validationError = '';
            this.render();
        } else {
            this._syncClearBtn();
        }

        this.dispatchEvent(new CustomEvent('input', {
            bubbles: true, composed: true,
            detail: { value: input.value, name: this.getAttribute('name') || '' }
        }));
    };

    private readonly _handleChangeEvent = (event: Event) => {
        const input = event.target as HTMLInputElement | null;
        if (!input || input.tagName !== 'INPUT') return;

        this._value = input.value;
        this._validationError = '';
        this.render();

        this.dispatchEvent(new CustomEvent('change', {
            bubbles: true, composed: true,
            detail: { value: input.value, name: this.getAttribute('name') || '' }
        }));
    };

    private readonly _handleClickEvent = (event: Event) => {
        const btn = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
        if (!btn) return;

        if (btn.dataset.action === 'toggle-password') {
            this._showPassword = !this._showPassword;
            this.render();
            this.$<HTMLInputElement>('input')?.focus();
        }

        if (btn.dataset.action === 'clear') {
            const input = this.$<HTMLInputElement>('input');
            this._value = '';
            this._validationError = '';
            if (input) input.value = '';
            this.render();
            this.$<HTMLInputElement>('input')?.focus();
            this.dispatchEvent(new CustomEvent('clear', {
                bubbles: true, composed: true,
                detail: { name: this.getAttribute('name') || '' }
            }));
            this.dispatchEvent(new CustomEvent('input', {
                bubbles: true, composed: true,
                detail: { value: '', name: this.getAttribute('name') || '' }
            }));
        }
    };

    constructor() { super(); }

    get value(): string {
        return this.$<HTMLInputElement>('input')?.value ?? this._value;
    }

    set value(nextValue: string) {
        this._value = nextValue ?? '';
        this._validationError = '';
        if (this._mounted) {
            this.render();
        }
    }

    template() {
        if (!this._mounted) {
            this._value = this.getAttribute('value') || '';
        }

        const type = this.getAttribute('type') || 'text';
        const name = this.getAttribute('name') || '';
        const placeholder = this.getAttribute('placeholder') || '';
        const disabled = this.hasAttribute('disabled');
        const readonly = this.hasAttribute('readonly');
        const required = this.hasAttribute('required');
        const maxlength = this.getAttribute('maxlength');
        const minlength = this.getAttribute('minlength');
        const pattern = this.getAttribute('pattern');
        const autocomplete = this.getAttribute('autocomplete') || 'off';
        const iconLeft = this.getAttribute('icon-left') || (type === 'search' ? SEARCH_ICON : '');
        const iconRight = this.getAttribute('icon-right') || '';
        const clearable = this.hasAttribute('clearable');
        const showToggle = this.hasAttribute('show-password-toggle') && type === 'password';
        const error = this.getAttribute('error') || this._validationError;
        const hint = this.getAttribute('hint') || '';

        const hasLeft = !!iconLeft;
        const hasRight = !!(iconRight || (clearable && this._value) || showToggle);
        const inputType = type === 'password' && this._showPassword ? 'text' : type;

        return html`
            <style>
                :host { display: block; width: 100%; font-family: var(--nc-font-family); }

                .wrap { position: relative; display: flex; align-items: center; }

                input {
                    width: 100%;
                    box-sizing: border-box;
                    padding: var(--nc-spacing-sm) var(--nc-spacing-md);
                    padding-left: ${hasLeft ? '2.4rem' : 'var(--nc-spacing-md)'};
                    padding-right: ${hasRight ? '2.4rem' : 'var(--nc-spacing-md)'};
                    background: var(--nc-bg);
                    border: var(--nc-input-border);
                    border-radius: var(--nc-input-radius);
                    color: var(--nc-text);
                    font-size: var(--nc-font-size-base);
                    font-family: var(--nc-font-family);
                    outline: none;
                    transition: border-color var(--nc-transition-fast), box-shadow var(--nc-transition-fast);
                    opacity: ${disabled ? '0.5' : '1'};
                    cursor: ${disabled ? 'not-allowed' : 'text'};
                }

                :host([size="sm"]) input { font-size: var(--nc-font-size-sm); padding-top: var(--nc-spacing-xs); padding-bottom: var(--nc-spacing-xs); }
                :host([size="lg"]) input { font-size: var(--nc-font-size-lg); padding-top: var(--nc-spacing-md); padding-bottom: var(--nc-spacing-md); }

                :host([variant="filled"]) input { background: var(--nc-bg-tertiary); border-color: transparent; }
                :host([variant="filled"]) input:focus { background: var(--nc-bg); }

                input:focus { border-color: var(--nc-input-focus-border); box-shadow: 0 0 0 3px rgba(16,185,129,.15); }
                :host([error]) input, input.has-error { border-color: var(--nc-danger, #ef4444) !important; box-shadow: 0 0 0 3px rgba(239,68,68,.12) !important; }
                input::placeholder { color: var(--nc-text-muted); }
                input[type="search"]::-webkit-search-cancel-button { display: none; }

                .icon {
                    position: absolute;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--nc-text-muted);
                    pointer-events: none;
                    width: 2.2rem;
                }
                .icon--left  { left: 0; }
                .icon--right { right: 0; pointer-events: auto; }

                .action-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 4px;
                    color: var(--nc-text-muted);
                    display: flex;
                    align-items: center;
                    transition: color var(--nc-transition-fast);
                    border-radius: var(--nc-radius-sm, 4px);
                }
                .action-btn:hover { color: var(--nc-text); }

                .subtext {
                    font-size: var(--nc-font-size-xs);
                    margin-top: 4px;
                    display: block;
                }
                .subtext--hint  { color: var(--nc-text-muted); }
                .subtext--error { color: var(--nc-danger, #ef4444); }
            </style>

            <div class="wrap">
                ${hasLeft ? `<span class="icon icon--left">${iconLeft}</span>` : ''}

                <input
                    type="${inputType}"
                    name="${name}"
                    value="${this._value}"
                    placeholder="${placeholder}"
                    autocomplete="${autocomplete}"
                    ${disabled ? 'disabled' : ''}
                    ${readonly ? 'readonly' : ''}
                    ${required ? 'required' : ''}
                    ${maxlength ? `maxlength="${maxlength}"` : ''}
                    ${minlength ? `minlength="${minlength}"` : ''}
                    ${pattern ? `pattern="${pattern}"` : ''}
                    ${error ? 'class="has-error"' : ''}
                    aria-invalid="${!!error}"
                    aria-describedby="${error ? 'subtext' : hint ? 'subtext' : ''}"
                />

                ${hasRight ? `
                <span class="icon icon--right">
                    ${showToggle ? `
                    <button class="action-btn" type="button" data-action="toggle-password" aria-label="${this._showPassword ? 'Hide password' : 'Show password'}">
                        ${this._showPassword ? EYE_CLOSED : EYE_OPEN}
                    </button>` : ''}
                    ${clearable && this._value && !showToggle ? `
                    <button class="action-btn" type="button" data-action="clear" aria-label="Clear">
                        ${CLEAR_ICON}
                    </button>` : ''}
                    ${iconRight && !clearable && !showToggle ? iconRight : ''}
                </span>` : ''}
            </div>

            ${error ? `<span class="subtext subtext--error" id="subtext" role="alert">${error}</span>` : ''}
            ${hint && !error ? `<span class="subtext subtext--hint" id="subtext">${hint}</span>` : ''}
        `;
    }

    onMount() {
        this.shadowRoot?.addEventListener('input', this._handleInputEvent);
        this.shadowRoot?.addEventListener('change', this._handleChangeEvent);
        this.shadowRoot?.addEventListener('click', this._handleClickEvent);
    }

    onUnmount() {
        this.shadowRoot?.removeEventListener('input', this._handleInputEvent);
        this.shadowRoot?.removeEventListener('change', this._handleChangeEvent);
        this.shadowRoot?.removeEventListener('click', this._handleClickEvent);
    }

    private _syncClearBtn() {
        const clearBtn = this.$<HTMLElement>('[data-action="clear"]');
        if (!clearBtn) return;
        clearBtn.style.display = this._value ? 'flex' : 'none';
    }

    private _getInput(): HTMLInputElement | null {
        return this.$<HTMLInputElement>('input');
    }

    private _buildValidationMessage(input: HTMLInputElement): string {
        const { validity } = input;

        if (validity.valueMissing) {
            return 'This field is required.';
        }

        if (validity.typeMismatch) {
            if (input.type === 'email') return 'Enter a valid email address.';
            if (input.type === 'url') return 'Enter a valid URL.';
            return 'Enter a valid value.';
        }

        if (validity.patternMismatch) {
            return 'Enter a value in the expected format.';
        }

        if (validity.tooShort) {
            const minLength = input.getAttribute('minlength');
            return minLength
                ? `Enter at least ${minLength} characters.`
                : 'The value is too short.';
        }

        if (validity.tooLong) {
            const maxLength = input.getAttribute('maxlength');
            return maxLength
                ? `Enter no more than ${maxLength} characters.`
                : 'The value is too long.';
        }

        if (validity.badInput) {
            return 'Enter a valid value.';
        }

        return '';
    }

    getValidationMessage(): string {
        const explicitError = this.getAttribute('error');
        if (explicitError) return explicitError;

        const input = this._getInput();
        if (!input) return this._validationError;
        return this._buildValidationMessage(input);
    }

    checkValidity(): boolean {
        const input = this._getInput();
        if (!input) return true;
        return input.checkValidity();
    }

    validate(): boolean {
        const isValid = this.checkValidity();
        this._validationError = isValid ? '' : this.getValidationMessage();
        if (this._mounted) {
            this.render();
        }
        return isValid;
    }

    reportValidity(): boolean {
        return this.validate();
    }

    clearValidationError(): void {
        if (!this._validationError) return;
        this._validationError = '';
        if (this._mounted) {
            this.render();
        }
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue === newValue) return;
        if (name === 'value' && this._mounted) {
            this._value = newValue || '';
            this._validationError = '';
            const input = this.$<HTMLInputElement>('input');
            if (input) input.value = this._value;
            this._syncClearBtn();
            return;
        }
        if (this._mounted) { this.render(); }
    }
}

defineComponent('nc-input', NcInput);

import { Component, defineComponent } from '../../.nativecore/core/component.js';

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
            'clearable', 'show-password-toggle', 'error', 'hint'
        ];
    }

    private currentValue = '';
    private showPassword = false;
    private validationError = '';

    private readonly handleInputEvent = (event: Event) => {
        const input = event.target as HTMLInputElement | null;
        if (!input || input.tagName !== 'INPUT') return;

        this.currentValue = input.value;
        if (this.validationError) {
            this.validationError = '';
            this.render();
        } else {
            this.syncClearButton();
        }

        this.dispatchEvent(new CustomEvent('input', {
            bubbles: true,
            composed: true,
            detail: { value: input.value, name: this.getAttribute('name') || '' }
        }));
    };

    private readonly handleChangeEvent = (event: Event) => {
        const input = event.target as HTMLInputElement | null;
        if (!input || input.tagName !== 'INPUT') return;

        this.currentValue = input.value;
        this.validationError = '';
        this.render();

        this.dispatchEvent(new CustomEvent('change', {
            bubbles: true,
            composed: true,
            detail: { value: input.value, name: this.getAttribute('name') || '' }
        }));
    };

    private readonly handleClickEvent = (event: Event) => {
        const button = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
        if (!button) return;

        if (button.dataset.action === 'toggle-password') {
            this.showPassword = !this.showPassword;
            this.render();
            this.$<HTMLInputElement>('input')?.focus();
        }

        if (button.dataset.action === 'clear') {
            const input = this.$<HTMLInputElement>('input');
            this.currentValue = '';
            this.validationError = '';
            if (input) input.value = '';
            this.render();
            this.$<HTMLInputElement>('input')?.focus();
            this.dispatchEvent(new CustomEvent('clear', {
                bubbles: true,
                composed: true,
                detail: { name: this.getAttribute('name') || '' }
            }));
            this.dispatchEvent(new CustomEvent('input', {
                bubbles: true,
                composed: true,
                detail: { value: '', name: this.getAttribute('name') || '' }
            }));
        }
    };

    get value(): string {
        return this.$<HTMLInputElement>('input')?.value ?? this.currentValue;
    }

    set value(nextValue: string) {
        this.currentValue = nextValue ?? '';
        this.validationError = '';
        if (this._mounted) {
            this.render();
        }
    }

    template() {
        if (!this._mounted) {
            this.currentValue = this.getAttribute('value') || '';
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
        const error = this.getAttribute('error') || this.validationError;
        const hint = this.getAttribute('hint') || '';

        const hasLeft = !!iconLeft;
        const hasRight = !!(iconRight || (clearable && this.currentValue) || showToggle);
        const inputType = type === 'password' && this.showPassword ? 'text' : type;

        return `
            <style>
                :host { display: block; width: 100%; font-family: var(--nc-font-family); }
                .wrap { position: relative; display: flex; align-items: center; }
                input {
                    width: 100%;
                    box-sizing: border-box;
                    padding: var(--nc-spacing-sm) var(--nc-spacing-md);
                    padding-left: ${hasLeft ? '2.4rem' : 'var(--nc-spacing-md)'};
                    padding-right: ${hasRight ? '2.4rem' : 'var(--nc-spacing-md)'};
                    background: var(--nc-bg, #ffffff);
                    border: var(--nc-input-border, 1px solid #d1d5db);
                    border-radius: var(--nc-input-radius, 0.5rem);
                    color: var(--nc-text, #111827);
                    font-size: var(--nc-font-size-base, 1rem);
                    font-family: var(--nc-font-family);
                    outline: none;
                    transition: border-color var(--nc-transition-fast, 160ms ease), box-shadow var(--nc-transition-fast, 160ms ease);
                    opacity: ${disabled ? '0.5' : '1'};
                    cursor: ${disabled ? 'not-allowed' : 'text'};
                }
                :host([size="sm"]) input { font-size: var(--nc-font-size-sm, 0.875rem); padding-top: var(--nc-spacing-xs, 0.25rem); padding-bottom: var(--nc-spacing-xs, 0.25rem); }
                :host([size="lg"]) input { font-size: var(--nc-font-size-lg, 1.125rem); padding-top: var(--nc-spacing-md, 1rem); padding-bottom: var(--nc-spacing-md, 1rem); }
                :host([variant="filled"]) input { background: var(--nc-bg-tertiary, #f3f4f6); border-color: transparent; }
                :host([variant="filled"]) input:focus { background: var(--nc-bg, #ffffff); }
                input:focus { border-color: var(--nc-input-focus-border, #10b981); box-shadow: 0 0 0 3px rgba(16,185,129,.15); }
                :host([error]) input, input.has-error { border-color: var(--nc-danger, #ef4444) !important; box-shadow: 0 0 0 3px rgba(239,68,68,.12) !important; }
                input::placeholder { color: var(--nc-text-muted, #6b7280); }
                input[type="search"]::-webkit-search-cancel-button { display: none; }
                .icon {
                    position: absolute;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--nc-text-muted, #6b7280);
                    pointer-events: none;
                    width: 2.2rem;
                }
                .icon--left { left: 0; }
                .icon--right { right: 0; pointer-events: auto; }
                .action-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 4px;
                    color: var(--nc-text-muted, #6b7280);
                    display: flex;
                    align-items: center;
                    transition: color var(--nc-transition-fast, 160ms ease);
                    border-radius: var(--nc-radius-sm, 4px);
                }
                .action-btn:hover { color: var(--nc-text, #111827); }
                .subtext {
                    font-size: var(--nc-font-size-xs, 0.75rem);
                    margin-top: 4px;
                    display: block;
                }
                .subtext--hint { color: var(--nc-text-muted, #6b7280); }
                .subtext--error { color: var(--nc-danger, #ef4444); }
            </style>

            <div class="wrap">
                ${hasLeft ? `<span class="icon icon--left">${iconLeft}</span>` : ''}
                <input
                    type="${inputType}"
                    name="${name}"
                    value="${this.currentValue}"
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
                    <button class="action-btn" type="button" data-action="toggle-password" aria-label="${this.showPassword ? 'Hide password' : 'Show password'}">
                        ${this.showPassword ? EYE_CLOSED : EYE_OPEN}
                    </button>` : ''}
                    ${clearable && this.currentValue && !showToggle ? `
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
        this.shadowRoot?.addEventListener('input', this.handleInputEvent);
        this.shadowRoot?.addEventListener('change', this.handleChangeEvent);
        this.shadowRoot?.addEventListener('click', this.handleClickEvent);
    }

    onUnmount() {
        this.shadowRoot?.removeEventListener('input', this.handleInputEvent);
        this.shadowRoot?.removeEventListener('change', this.handleChangeEvent);
        this.shadowRoot?.removeEventListener('click', this.handleClickEvent);
    }

    private syncClearButton() {
        const clearButton = this.$<HTMLElement>('[data-action="clear"]');
        if (!clearButton) return;
        clearButton.style.display = this.currentValue ? 'flex' : 'none';
    }

    private getInput(): HTMLInputElement | null {
        return this.$<HTMLInputElement>('input');
    }

    private buildValidationMessage(input: HTMLInputElement): string {
        const { validity } = input;

        if (validity.valueMissing) return 'This field is required.';
        if (validity.typeMismatch) {
            if (input.type === 'email') return 'Enter a valid email address.';
            if (input.type === 'url') return 'Enter a valid URL.';
            return 'Enter a valid value.';
        }
        if (validity.patternMismatch) return 'Enter a value in the expected format.';
        if (validity.tooShort) {
            const minLength = input.getAttribute('minlength');
            return minLength ? `Enter at least ${minLength} characters.` : 'The value is too short.';
        }
        if (validity.tooLong) {
            const maxLength = input.getAttribute('maxlength');
            return maxLength ? `Enter no more than ${maxLength} characters.` : 'The value is too long.';
        }
        if (validity.badInput) return 'Enter a valid value.';
        return '';
    }

    getValidationMessage(): string {
        const explicitError = this.getAttribute('error');
        if (explicitError) return explicitError;

        const input = this.getInput();
        if (!input) return this.validationError;
        return this.buildValidationMessage(input);
    }

    checkValidity(): boolean {
        const input = this.getInput();
        if (!input) return true;
        return input.checkValidity();
    }

    validate(): boolean {
        const isValid = this.checkValidity();
        this.validationError = isValid ? '' : this.getValidationMessage();
        if (this._mounted) this.render();
        return isValid;
    }

    reportValidity(): boolean {
        return this.validate();
    }

    clearValidationError(): void {
        if (!this.validationError) return;
        this.validationError = '';
        if (this._mounted) this.render();
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue === newValue) return;
        if (name === 'value' && this._mounted) {
            this.currentValue = newValue || '';
            this.validationError = '';
            const input = this.$<HTMLInputElement>('input');
            if (input) input.value = this.currentValue;
            this.syncClearButton();
            return;
        }
        if (this._mounted) {
            this.render();
        }
    }
}

defineComponent('nc-input', NcInput);


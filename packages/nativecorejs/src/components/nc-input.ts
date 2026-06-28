/**
 * NcInput Component
 *
 * Framework-native text input using all NativeCore patterns:
 * - useState()     : all runtime state (_valueState, _showPassword, _validationError)
 * - computed()     : _hasError derived from error attribute + _validationError state
 * - model()        : two-way binding between _valueState and inner <input>
 * - bindClass()    : surgical class toggle (has-error on input)
 * - bindAttr()     : surgical attribute update (aria-invalid on input)
 * - bindStyle()    : surgical style update (clear btn display, error subtext display)
 * - wireContents() : declarative wire-content binding for error subtext text
 * - wireActions()  : declarative button wires (clear, toggle-password)
 * - listen()       : auto-cleaned event listeners via _bindings
 * - emitEvent()    : clean custom event emission (bubbles + composed by default)
 * - render()       : structural changes only (type, icons, size, variant, layout)
 *
 * Attributes:
 *   - name: string
 *   - value: string (initial/default — seeded into reactive state on mount)
 *   - type: 'text'|'email'|'password'|'search'|'url'|'tel'|'number' (default: 'text')
 *   - placeholder: string
 *   - disabled: boolean
 *   - readonly: boolean
 *   - required: boolean
 *   - maxlength: number
 *   - minlength: number
 *   - pattern: string
 *   - autocomplete: string
 *   - size: 'sm'|'md'|'lg' (default: 'md')
 *   - variant: 'default'|'filled' (default: 'default')
 *   - icon-left: string (trusted SVG/HTML)
 *   - icon-right: string (trusted SVG/HTML)
 *   - clearable: boolean
 *   - show-password-toggle: boolean (type="password" only)
 *   - error: string
 *   - hint: string
 *
 * Events (via emitEvent):
 *   - input  -> detail: { value: string; name: string }
 *   - change -> detail: { value: string; name: string }
 *   - clear  -> detail: { name: string }
 *
 * Methods:
 *   - checkValidity(): boolean
 *   - validate(): boolean
 *   - reportValidity(): boolean
 *   - getValidationMessage(): string
 *   - clearValidationError(): void
 */
import { Component, defineComponent } from '../../.nativecore/core/component.js';
import { useState, computed } from '../../.nativecore/core/state.js';
import { html, raw, escapeHTML } from '../../.nativecore/utils/templates.js';
import type { State, ComputedState } from '../../.nativecore/core/state.js';

// ─── Icons ────────────────────────────────────────────────────────────────────

const EYE_OPEN   = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16"><path d="M1 10s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6z"/><circle cx="10" cy="10" r="2.5"/></svg>`;
const EYE_CLOSED = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16"><path d="M2 2l16 16M7.5 7.5A3 3 0 0012.5 12.5M4.2 4.2C2.6 5.5 1 8 1 10s3 6 9 6c2 0 3.8-.5 5.3-1.3M8 4.3A8.7 8.7 0 0110 4c6 0 9 6 9 6s-.9 1.8-2.5 3.2"/></svg>`;
const CLEAR_ICON  = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" width="12" height="12"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
const SEARCH_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14"><circle cx="6.5" cy="6.5" r="4"/><path d="M11 11l3 3" stroke-linecap="round"/></svg>`;

// ─── Component ────────────────────────────────────────────────────────────────

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

    // ─── Reactive State ───────────────────────────────────────────────────────
    //
    // All runtime state held in useState() so framework bindings (model, bindClass,
    // bindAttr, bindStyle, wireContents) update only the affected DOM nodes —
    // no full re-render required for runtime changes.

    // Two-way bound to inner <input> via model() in onMount.
    _valueState: State<string> = useState('');

    // Flipping requires structural re-render (input type + icon change).
    _showPassword: State<boolean> = useState(false);

    // Inline validation error — drives error subtext and has-error class surgically.
    _validationError: State<string> = useState('');

    // Mirrors the error attribute as reactive state so _hasError computed
    // re-evaluates when the attribute changes externally via attributeChangedCallback.
    _errorAttr: State<string> = useState('');

    // ─── Computed ─────────────────────────────────────────────────────────────

    // True when the error attribute or runtime validationError is set.
    // Drives bindClass (has-error) and bindAttr (aria-invalid) surgically.
    _hasError: ComputedState<boolean> = computed(() => {
        return !!this._errorAttr.value || !!this._validationError.value;
    });

    // ─── Public Value API ─────────────────────────────────────────────────────

    get value(): string {
        return this.$<HTMLInputElement>('input')?.value ?? this._valueState.value;
    }

    set value(next: string) {
        const normalized = next ?? '';
        if (normalized === this._valueState.value) return;

        // model() propagates this to the inner input surgically.
        this._valueState.value = normalized;
        this._validationError.value = '';
    }

    // ─── Template ─────────────────────────────────────────────────────────────
    //
    // Renders structural HTML only. All runtime state is wired in onMount().
    // Called only on first mount and when structural attributes change.

    template() {
        const type         = this.getAttribute('type') || 'text';
        const name         = this.getAttribute('name') || '';
        const placeholder  = this.getAttribute('placeholder') || '';
        const autocomplete = this.getAttribute('autocomplete') || 'off';
        const maxlength    = this.getAttribute('maxlength');
        const minlength    = this.getAttribute('minlength');
        const pattern      = this.getAttribute('pattern');
        const iconLeft     = this.getAttribute('icon-left') || (type === 'search' ? SEARCH_ICON : '');
        const iconRight    = this.getAttribute('icon-right') || '';
        const clearable    = this.hasAttribute('clearable');
        const showToggle   = this.hasAttribute('show-password-toggle') && type === 'password';
        const disabled     = this.hasAttribute('disabled');
        const readonly     = this.hasAttribute('readonly');
        const required     = this.hasAttribute('required');
        const hint         = this.getAttribute('hint') || '';

        const hasLeft  = !!iconLeft;
        const hasRight = !!(iconRight || clearable || showToggle);

        // Password type flips between 'password' and 'text' based on toggle state.
        const inputType = type === 'password' && this._showPassword.value ? 'text' : type;

        // Seed initial display value from state (hydrated by onMount seed or prior writes).
        const initialValue = this._valueState.value || this.getAttribute('value') || '';

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
                    background: var(--nc-bg, #ffffff);
                    border: var(--nc-input-border, 1px solid #d1d5db);
                    border-radius: var(--nc-input-radius, 0.5rem);
                    color: var(--nc-text, #111827);
                    font-size: var(--nc-font-size-base, 1rem);
                    font-family: var(--nc-font-family);
                    outline: none;
                    transition:
                        border-color var(--nc-transition-fast, 160ms ease),
                        box-shadow var(--nc-transition-fast, 160ms ease);
                    opacity: ${disabled ? '0.5' : '1'};
                    cursor: ${disabled ? 'not-allowed' : 'text'};
                }

                :host([size="sm"]) input {
                    font-size: var(--nc-font-size-sm, 0.875rem);
                    padding-top: var(--nc-spacing-xs, 0.25rem);
                    padding-bottom: var(--nc-spacing-xs, 0.25rem);
                }

                :host([size="lg"]) input {
                    font-size: var(--nc-font-size-lg, 1.125rem);
                    padding-top: var(--nc-spacing-md, 1rem);
                    padding-bottom: var(--nc-spacing-md, 1rem);
                }

                :host([variant="filled"]) input {
                    background: var(--nc-bg-tertiary, #f3f4f6);
                    border-color: transparent;
                }

                :host([variant="filled"]) input:focus { background: var(--nc-bg, #ffffff); }

                input:focus {
                    border-color: var(--nc-input-focus-border, #10b981);
                    box-shadow: 0 0 0 3px rgba(16,185,129,.15);
                }

                :host([error]) input,
                input.has-error {
                    border-color: var(--nc-danger, #ef4444) !important;
                    box-shadow: 0 0 0 3px rgba(239,68,68,.12) !important;
                }

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

                .icon--left  { left: 0; }
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

                /* Visibility controlled surgically via bindStyle() in onMount */
                .clear-btn { display: none; }

                .subtext {
                    font-size: var(--nc-font-size-xs, 0.75rem);
                    margin-top: 4px;
                    display: block;
                }

                .subtext--hint  { color: var(--nc-text-muted, #6b7280); }

                /* Visibility controlled surgically via bindStyle() in onMount */
                .subtext--error { color: var(--nc-danger, #ef4444); display: none; }
            </style>

            <div class="wrap">
                ${raw(hasLeft ? `<span class="icon icon--left">${iconLeft}</span>` : '')}

                <input
                    type="${raw(escapeHTML(inputType))}"
                    name="${raw(escapeHTML(name))}"
                    value="${raw(escapeHTML(initialValue))}"
                    placeholder="${raw(escapeHTML(placeholder))}"
                    autocomplete="${raw(escapeHTML(autocomplete))}"
                    ${disabled  ? 'disabled'  : ''}
                    ${readonly  ? 'readonly'  : ''}
                    ${required  ? 'required'  : ''}
                    ${raw(maxlength ? `maxlength="${escapeHTML(String(maxlength))}"` : '')}
                    ${raw(minlength ? `minlength="${escapeHTML(String(minlength))}"` : '')}
                    ${raw(pattern  ? `pattern="${escapeHTML(String(pattern))}"`    : '')}
                    aria-invalid="false"
                    aria-describedby="subtext-error"
                />

                ${raw(hasRight ? `
                    <span class="icon icon--right">
                        ${showToggle ? `
                            <button
                                class="action-btn"
                                type="button"
                                wire-action="togglePassword:click"
                                aria-label="Toggle password visibility"
                            >${this._showPassword.value ? EYE_CLOSED : EYE_OPEN}</button>
                        ` : ''}
                        ${clearable ? `
                            <button
                                class="action-btn clear-btn"
                                type="button"
                                wire-action="clear:click"
                                aria-label="Clear input"
                            >${CLEAR_ICON}</button>
                        ` : ''}
                        ${iconRight && !clearable && !showToggle ? iconRight : ''}
                    </span>
                ` : '')}
            </div>

            <span
                class="subtext subtext--error"
                id="subtext-error"
                role="alert"
                wire-content="_validationError"
            ></span>

            ${raw(hint ? `
                <span class="subtext subtext--hint">${escapeHTML(hint)}</span>
            ` : '')}
        `;
    }

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    onMount() {
        // Seed reactive value state from attribute if no prior property write.
        if (!this._valueState.value) {
            this._valueState.value = this.getAttribute('value') || '';
        }

        // Two-way binding: _valueState <-> inner <input> value.
        // model() auto-disposes on unmount via _bindings.
        this.model(this._valueState, 'input');

        // Surgical class toggle: adds/removes 'has-error' on <input>.
        this.bindClass(this._hasError, 'input', 'has-error');

        // Surgical attribute update: keeps aria-invalid in sync.
        this.bindAttr(this._hasError, 'input', 'aria-invalid');

        // Declarative content wire: wire-content="_validationError" -> span textContent.
        this.wireContents();

        // Show/hide error subtext based on validationError state.
        this.bindStyle(
            computed(() => this._validationError.value ? 'block' : 'none'),
            '.subtext--error',
            'display'
        );

        // Show/hide clear button based on whether input has a value.
        if (this.hasAttribute('clearable')) {
            this.bindStyle(
                computed(() => this._valueState.value ? 'flex' : 'none'),
                '.clear-btn',
                'display'
            );
        }

        // Declarative action wires: wireActions() scans wire-action="name:event" in shadow DOM.
        const { togglePassword, clear } = this.wireActions();

        if (togglePassword) {
            // Toggle requires structural re-render (input type + icon change).
            this.listen(togglePassword, () => {
                this._showPassword.value = !this._showPassword.value;
                this.render();
                this.$<HTMLInputElement>('input')?.focus();
            });
        }

        if (clear) {
            // Clear is purely surgical — reset state, re-focus, emit events.
            this.listen(clear, () => {
                this._valueState.value = '';
                this._validationError.value = '';
                this.$<HTMLInputElement>('input')?.focus();

                this.emitEvent('clear', { name: this.getAttribute('name') || '' });
                this.emitEvent('input', { value: '', name: this.getAttribute('name') || '' });
            });
        }

        // Forward inner input/change events as composed host events.
        this.listen('input', 'input', (e: Event) => {
            const target = e.target as HTMLInputElement;
            if (target?.tagName !== 'INPUT') return;
            this._validationError.value = '';
            this.emitEvent('input', { value: target.value, name: this.getAttribute('name') || '' });
        });

        this.listen('input', 'change', (e: Event) => {
            const target = e.target as HTMLInputElement;
            if (target?.tagName !== 'INPUT') return;
            this.emitEvent('change', { value: target.value, name: this.getAttribute('name') || '' });
        });
    }

    onUnmount() {
        // listen(), model(), bindClass(), bindAttr(), bindStyle() all registered in
        // _bindings and auto-disposed by base Component's disconnectedCallback.
        // Only computed states created in this class need explicit disposal.
        this._hasError.dispose();
    }

    // ─── Attribute Sync ───────────────────────────────────────────────────────

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue === newValue) return;

        if (name === 'value') {
            // Flows into reactive state — model() propagates to inner input surgically.
            this._valueState.value = newValue || '';
            this._validationError.value = '';
            return;
        }

        if (name === 'error') {
            // Writing _errorAttr triggers _hasError computed to re-evaluate,
            // which surgically updates has-error class and aria-invalid via bindings.
            this._errorAttr.value = newValue || '';
            return;
        }

        // Structural attribute change (type, size, variant, icons, etc.).
        if (this._mounted) this.render();
    }

    // ─── Validation (Public API) ──────────────────────────────────────────────

    getValidationMessage(): string {
        const explicitError = this.getAttribute('error');
        if (explicitError) return explicitError;

        const input = this.$<HTMLInputElement>('input');
        if (!input) return this._validationError.value;

        return this._buildValidationMessage(input);
    }

    checkValidity(): boolean {
        return this.$<HTMLInputElement>('input')?.checkValidity() ?? true;
    }

    validate(): boolean {
        const isValid = this.checkValidity();
        this._validationError.value = isValid ? '' : this.getValidationMessage();
        return isValid;
    }

    reportValidity(): boolean {
        return this.validate();
    }

    clearValidationError(): void {
        this._validationError.value = '';
    }

    // ─── Private Helpers ─────────────────────────────────────────────────────

    private _buildValidationMessage(input: HTMLInputElement): string {
        const { validity } = input;

        if (validity.valueMissing)    return 'This field is required.';
        if (validity.patternMismatch) return 'Enter a value in the expected format.';
        if (validity.badInput)        return 'Enter a valid value.';

        if (validity.typeMismatch) {
            if (input.type === 'email') return 'Enter a valid email address.';
            if (input.type === 'url')   return 'Enter a valid URL.';
            return 'Enter a valid value.';
        }

        if (validity.tooShort) {
            const min = input.getAttribute('minlength');
            return min ? `Enter at least ${min} characters.` : 'The value is too short.';
        }

        if (validity.tooLong) {
            const max = input.getAttribute('maxlength');
            return max ? `Enter no more than ${max} characters.` : 'The value is too long.';
        }

        return '';
    }
}

defineComponent('nc-input', NcInput);

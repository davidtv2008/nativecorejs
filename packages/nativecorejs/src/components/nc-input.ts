/**
 * NcInput — text input component for NativeCore devdemo.
 *
 * Conforms to the CoreComponent pattern:
 *  - Fully static template (no instance values) — safe for per-tag template caching
 *  - State via this.state() / this.compute() — auto-disposed, no external imports
 *  - Reactive wiring via this.effect() / this.bind() / this.on() — auto-disposed
 *  - Attribute changes via _handleAttributeUpdate (called only after setup)
 *  - CSS uses attribute selectors + host classes — no JS interpolation in static styles
 *
 * Attributes:
 *   name, value, type, placeholder, disabled, readonly, required,
 *   maxlength, minlength, pattern, autocomplete, size, variant,
 *   icon-left, icon-right, clearable, show-password-toggle, error, hint
 *
 * Events: input, change, clear
 *
 * Public API: value (get/set), checkValidity(), validate(), reportValidity(),
 *             clearValidationError(), getValidationMessage()
 */
import { CoreComponent } from '../../.nativecore/core/component.js';
import { html, trusted, css } from '../../.nativecore/utils/templates.js';

// --- Icons ---

const EYE_OPEN    = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16"><path d="M1 10s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6z"/><circle cx="10" cy="10" r="2.5"/></svg>`;
const EYE_CLOSED  = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16"><path d="M2 2l16 16M7.5 7.5A3 3 0 0012.5 12.5M4.2 4.2C2.6 5.5 1 8 1 10s3 6 9 6c2 0 3.8-.5 5.3-1.3M8 4.3A8.7 8.7 0 0110 4c6 0 9 6 9 6s-.9 1.8-2.5 3.2"/></svg>`;
const CLEAR_ICON  = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" width="12" height="12"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
const SEARCH_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14"><circle cx="6.5" cy="6.5" r="4"/><path d="M11 11l3 3" stroke-linecap="round"/></svg>`;

// --- Component ---

export class NcInput extends CoreComponent {
    static useShadowDOM = true;

    static get observedAttributes() {
        return [
            'name', 'value', 'type', 'placeholder', 'disabled', 'readonly', 'required',
            'maxlength', 'minlength', 'pattern', 'autocomplete',
            'size', 'variant', 'icon-left', 'icon-right',
            'clearable', 'show-password-toggle', 'error', 'hint', 'label',
        ];
    }

    static styles = css`
        :host { display: block; width: 100%; font-family: var(--nc-font-family); }

        label {
            display: block;
            font-size: var(--nc-font-size-sm);
            font-weight: var(--nc-font-weight-medium, 500);
            color: var(--nc-text);
            margin-bottom: var(--nc-spacing-xs, 4px);
            cursor: pointer;
        }
        label[hidden] { display: none; }
        :host([required]) label::after {
            content: '*';
            color: var(--nc-danger, #ef4444);
            margin-left: 2px;
        }

        .wrap { position: relative; display: flex; align-items: center; }

        input {
            width: 100%;
            box-sizing: border-box;
            padding: var(--nc-spacing-sm) var(--nc-spacing-md);
            background: var(--nc-bg);
            border: var(--nc-input-border);
            border-radius: var(--nc-input-radius);
            color: var(--nc-text);
            font-size: var(--nc-font-size-base);
            font-family: var(--nc-font-family);
            outline: none;
            transition:
                border-color var(--nc-transition-fast),
                box-shadow var(--nc-transition-fast);
            cursor: text;
        }

        :host(.has-icon-left)  input { padding-left: 2.4rem; }
        :host(.has-icon-right) input { padding-right: 2.4rem; }
        :host([disabled]) input { opacity: 0.5; cursor: not-allowed; }

        :host([size="sm"]) input {
            font-size: var(--nc-font-size-sm);
            padding-top: var(--nc-spacing-xs);
            padding-bottom: var(--nc-spacing-xs);
        }
        :host([size="lg"]) input {
            font-size: var(--nc-font-size-lg);
            padding-top: var(--nc-spacing-md);
            padding-bottom: var(--nc-spacing-md);
        }

        :host([variant="filled"]) input { background: var(--nc-bg-tertiary); border-color: transparent; }
        :host([variant="filled"]) input:focus { background: var(--nc-bg); }

        input:focus {
            border-color: var(--nc-input-focus-border);
            box-shadow: 0 0 0 3px rgba(16,185,129,.15);
        }

        :host([error]) input,
        input.has-error {
            border-color: var(--nc-danger, #ef4444) !important;
            box-shadow: 0 0 0 3px rgba(239,68,68,.12) !important;
        }

        input::placeholder { color: var(--nc-text-muted); }
        input[type="search"]::-webkit-search-cancel-button { display: none; }

        .icon {
            position: absolute;
            display: none;
            align-items: center;
            justify-content: center;
            color: var(--nc-text-muted);
            pointer-events: none;
            width: 2.2rem;
        }
        .icon--left  { left: 0; }
        .icon--right { right: 0; pointer-events: auto; }
        :host(.has-icon-left)  .icon--left  { display: flex; }
        :host(.has-icon-right) .icon--right { display: flex; }

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

        .toggle-password-btn { display: none; }
        :host(.has-toggle) .toggle-password-btn { display: flex; }

        .clear-btn { display: none; }

        .subtext {
            font-size: var(--nc-font-size-xs);
            margin-top: 4px;
            display: block;
        }
        .subtext--hint  { color: var(--nc-text-muted); }
        .subtext--hint[hidden] { display: none; }
        .subtext--error { color: var(--nc-danger, #ef4444); display: none; }
    `;

    // --- Reactive state (CoreComponent instance methods - all auto-disposed) ---
    //
    // Class fields run after super() so this.state() / this.compute() are
    // available. Declare _errorAttr and _validationError before _hasError so
    // the compute() fn can read them as reactive dependencies on first run.
    private _errorAttr       = this.state('');
    private _valueState      = this.state('');
    private _showPassword    = this.state(false);
    private _validationError = this.state('');
    private _hasError        = this.compute(() =>
        !!this._errorAttr.value || !!this._validationError.value
    );

    // --- Public value API ---

    get value(): string {
        return this.$<HTMLInputElement>('input')?.value ?? this._valueState.value;
    }

    set value(next: string) {
        const v = next ?? '';
        if (v === this._valueState.value) return;
        this._valueState.value      = v;
        this._validationError.value = '';
    }

    // --- Template (fully static - no instance-specific values) ---
    //
    // CoreComponent caches the template per tag name, so instance-specific
    // values (name, placeholder, type, etc.) must NOT appear here.
    // _syncAttrs() and reactive effects in onMount() do all hydration.
    template(): string {
        return html`
            <label for="_input" hidden></label>
            <div class="wrap">
                <span class="icon icon--left"></span>
                <input id="_input" aria-invalid="false" aria-describedby="subtext-error" />
                <span class="icon icon--right">
                    <span class="icon-right-static"></span>
                    <button class="action-btn toggle-password-btn" type="button" aria-label="Toggle password visibility"></button>
                    <button class="action-btn clear-btn" type="button" aria-label="Clear input">${trusted(CLEAR_ICON)}</button>
                </span>
            </div>
            <span class="subtext subtext--error" id="subtext-error" role="alert"></span>
            <span class="subtext subtext--hint" hidden></span>
        `;
    }

    // --- Lifecycle ---

    onMount() {
        // Seed reactive state from current attributes.
        this._errorAttr.value  = this.getAttribute('error') ?? '';
        this._valueState.value = this.getAttribute('value') ?? '';

        // Hydrate inner <input> attributes + sync layout classes.
        this._syncAttrs();
        this._syncLayout();

        const inputEl   = this.$<HTMLInputElement>('input');
        const errorEl   = this.$<HTMLElement>('.subtext--error');
        const clearBtn  = this.$<HTMLButtonElement>('.clear-btn');
        const toggleBtn = this.$<HTMLButtonElement>('.toggle-password-btn');

        if (!inputEl) return;

        // Two-way value binding: state <-> inner <input>
        this.effect(() => {
            if (inputEl.value !== this._valueState.value) {
                inputEl.value = this._valueState.value ?? '';
            }
        });
        this.on(inputEl, 'input', () => { this._valueState.value = inputEl.value; });

        // Error state -> .has-error class + aria-invalid attribute
        this.bind(this._hasError, inputEl, '.has-error');
        this.bind(this._hasError, inputEl, 'aria-invalid');

        // Error message text + visibility
        if (errorEl) {
            this.effect(() => {
                const msg = this._validationError.value;
                errorEl.textContent   = msg;
                errorEl.style.display = msg ? 'block' : 'none';
            });
        }

        // Clear button: reactive visibility + click handler (only when clearable attr is set)
        if (clearBtn && this.hasAttribute('clearable')) {
            this.effect(() => {
                clearBtn.style.display = this._valueState.value ? 'flex' : 'none';
            });
            this.on(clearBtn, 'click', () => {
                this._valueState.value      = '';
                this._validationError.value = '';
                inputEl.focus();
                const name = this.getAttribute('name') ?? '';
                this.emit('clear', { name });
                this.emit('input', { value: '', name });
            });
        }

        // Password toggle: direct DOM mutation, no re-render needed
        if (toggleBtn) {
            this.on(toggleBtn, 'click', () => {
                this._showPassword.value = !this._showPassword.value;
                inputEl.type        = this._showPassword.value ? 'text' : 'password';
                toggleBtn.innerHTML = this._showPassword.value ? EYE_CLOSED : EYE_OPEN;
                inputEl.focus();
            });
        }

        // Forward inner input / change events as composed host events
        this.on(inputEl, 'input', (e: Event) => {
            this._validationError.value = '';
            this.emit('input', {
                value: (e.target as HTMLInputElement).value,
                name:  this.getAttribute('name') ?? '',
            });
        });
        this.on(inputEl, 'change', (e: Event) => {
            this.emit('change', {
                value: (e.target as HTMLInputElement).value,
                name:  this.getAttribute('name') ?? '',
            });
        });
    }

    // --- Attribute changes (CoreComponent calls this after setup) ---

    protected _handleAttributeUpdate(name: string, val: string | null): void {
        switch (name) {
            case 'value':
                this._valueState.value      = val ?? '';
                this._validationError.value = '';
                return;
            case 'error':
                this._errorAttr.value = val ?? '';
                return;
            case 'hint': {
                const hintEl = this.$<HTMLElement>('.subtext--hint');
                if (hintEl) { hintEl.textContent = val ?? ''; hintEl.hidden = !val; }
                return;
            }
            case 'label': {
                const labelEl = this.$<HTMLLabelElement>('label');
                if (labelEl) { labelEl.textContent = val ?? ''; labelEl.hidden = !val; }
                return;
            }
            case 'type': {
                const inputEl = this.$<HTMLInputElement>('input');
                if (inputEl) inputEl.type = val ?? 'text';
                this._syncLayout();
                return;
            }
            case 'disabled':
            case 'readonly':
            case 'required': {
                const inputEl = this.$<HTMLInputElement>('input');
                if (inputEl) {
                    if (val !== null) inputEl.setAttribute(name, '');
                    else              inputEl.removeAttribute(name);
                }
                return;
            }
            case 'placeholder':
            case 'name':
            case 'autocomplete':
            case 'maxlength':
            case 'minlength':
            case 'pattern': {
                const inputEl = this.$<HTMLInputElement>('input');
                if (inputEl) {
                    if (val !== null) inputEl.setAttribute(name, val);
                    else              inputEl.removeAttribute(name);
                }
                return;
            }
            default:
                // icon-left, icon-right, clearable, show-password-toggle
                this._syncLayout();
        }
    }

    // --- Validation API ---

    getValidationMessage(): string {
        const explicit = this.getAttribute('error');
        if (explicit) return explicit;
        const input = this.$<HTMLInputElement>('input');
        if (!input) return this._validationError.value;
        return this._buildValidationMessage(input);
    }

    checkValidity(): boolean {
        return this.$<HTMLInputElement>('input')?.checkValidity() ?? true;
    }

    validate(): boolean {
        const valid = this.checkValidity();
        this._validationError.value = valid ? '' : this.getValidationMessage();
        return valid;
    }

    reportValidity(): boolean { return this.validate(); }

    clearValidationError(): void { this._validationError.value = ''; }

    // --- Private helpers ---

    /** Hydrate inner <input> attributes from host. Called once in onMount(). */
    private _syncAttrs(): void {
        const inputEl = this.$<HTMLInputElement>('input');
        const hintEl  = this.$<HTMLElement>('.subtext--hint');
        if (!inputEl) return;

        const setAttr = (attr: string, fallback = '') => {
            const v = this.getAttribute(attr) ?? fallback;
            if (v) inputEl.setAttribute(attr, v);
        };

        inputEl.type = this.getAttribute('type') ?? 'text';
        setAttr('name');
        setAttr('placeholder');
        setAttr('autocomplete', 'off');
        setAttr('maxlength');
        setAttr('minlength');
        setAttr('pattern');

        if (this.hasAttribute('disabled')) inputEl.setAttribute('disabled', '');
        if (this.hasAttribute('readonly')) inputEl.setAttribute('readonly', '');
        if (this.hasAttribute('required')) inputEl.setAttribute('required', '');

        if (hintEl) {
            const hint = this.getAttribute('hint') ?? '';
            hintEl.textContent = hint;
            hintEl.hidden      = !hint;
        }

        const labelEl = this.$<HTMLLabelElement>('label');
        if (labelEl) {
            const label = this.getAttribute('label') ?? '';
            labelEl.textContent = label;
            labelEl.hidden      = !label;
        }
    }

    /**
     * Sync host layout classes and icon innerHTML.
     * CSS reacts to .has-icon-left / .has-icon-right / .has-toggle on the host.
     * Called on mount and whenever structural attributes change.
     */
    private _syncLayout(): void {
        const type       = this.getAttribute('type') ?? 'text';
        const iconLeft   = this.getAttribute('icon-left') || (type === 'search' ? SEARCH_ICON : '');
        const iconRight  = this.getAttribute('icon-right') ?? '';
        const clearable  = this.hasAttribute('clearable');
        const showToggle = this.hasAttribute('show-password-toggle') && type === 'password';
        const hasLeft    = !!iconLeft;
        const hasRight   = !!(iconRight || clearable || showToggle);

        this.classList.toggle('has-icon-left',  hasLeft);
        this.classList.toggle('has-icon-right', hasRight);
        this.classList.toggle('has-toggle',     showToggle);

        const iconLeftEl   = this.$<HTMLElement>('.icon--left');
        const staticIconEl = this.$<HTMLElement>('.icon-right-static');
        const toggleBtn    = this.$<HTMLButtonElement>('.toggle-password-btn');

        if (iconLeftEl)   iconLeftEl.innerHTML   = iconLeft;
        if (staticIconEl) staticIconEl.innerHTML = iconRight && !clearable && !showToggle ? iconRight : '';
        if (toggleBtn)    toggleBtn.innerHTML    = this._showPassword.value ? EYE_CLOSED : EYE_OPEN;
    }

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

if (!customElements.get('nc-input')) customElements.define('nc-input', NcInput);

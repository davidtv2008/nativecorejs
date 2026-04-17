/**
 * NcForm + NcField Components
 *
 * nc-form:
 *   A form wrapper that collects values from all nc-* form controls within it,
 *   runs validation, and emits structured events.
 *
 *   Attributes:
 *     - novalidate: boolean — skip HTML5 native validation
 *
 *   Methods:
 *     - form.getValues(): Record<string, string> — collect all named form control values
 *     - form.validate(): boolean — trigger validation; returns true if all valid
 *     - form.reset() — reset all fields to initial value/clear errors
 *
 *   Events:
 *     - submit: CustomEvent<{ values: Record<string, string> }> — on valid submit
 *     - invalid: CustomEvent<{ fields: string[] }> — on invalid submit (list of failing names)
 *
 * nc-field:
 *   A labelled wrapper for a single form control. Handles the label, hint, and
 *   error message display in a consistent layout. Pairs naturally with nc-input,
 *   nc-select, nc-textarea, nc-autocomplete, nc-date-picker, etc.
 *
 *   Attributes:
 *     - label: string — field label
 *     - for: string — id of the slotted input (for focus on label click)
 *     - required: boolean — shows required marker
 *     - hint: string — sub-label hint text
 *     - error: string — error message (shown in red; overrides hint)
 *
 * Usage:
 *   <nc-form id="signup-form">
 *     <nc-field label="Email" required hint="We'll never share your email.">
 *       <nc-input name="email" type="email" placeholder="you@example.com"></nc-input>
 *     </nc-field>
 *     <nc-field label="Password" required>
 *       <nc-input name="password" type="password" show-password-toggle></nc-input>
 *     </nc-field>
 *     <nc-button type="submit">Sign up</nc-button>
 *   </nc-form>
 *
 *   document.getElementById('signup-form').addEventListener('submit', e => {
 *     console.log(e.detail.values);
 *   });
 */

import { Component, defineComponent } from '@core/component.js';
import { html } from '@utils/templates.js';

// ── NcField ──────────────────────────────────────────────────────────────────

export class NcField extends Component {
    static useShadowDOM = true;

    static get observedAttributes() {
        return ['label', 'for', 'required', 'hint', 'error'];
    }

    template() {
        const label = this.getAttribute('label') || '';
        const forAttr = this.getAttribute('for') || '';
        const required = this.hasAttribute('required');
        const hint = this.getAttribute('hint') || '';
        const error = this.getAttribute('error') || '';

        return html`
            <style>
                :host { display: block; font-family: var(--nc-font-family); }

                .field { display: flex; flex-direction: column; gap: 4px; }

                label {
                    font-size: var(--nc-font-size-sm);
                    font-weight: var(--nc-font-weight-medium);
                    color: var(--nc-text);
                    cursor: ${forAttr ? 'pointer' : 'default'};
                }

                .required {
                    color: var(--nc-danger, #ef4444);
                    margin-left: 2px;
                }

                .subtext {
                    font-size: var(--nc-font-size-xs);
                    line-height: 1.4;
                }
                .subtext--hint  { color: var(--nc-text-muted); }
                .subtext--error { color: var(--nc-danger, #ef4444); }
            </style>
            <div class="field">
                ${label ? `
                <label ${forAttr ? `for="${forAttr}"` : ''}>
                    ${label}${required ? `<span class="required" aria-hidden="true">*</span>` : ''}
                </label>` : ''}
                <slot></slot>
                ${error
                    ? `<span class="subtext subtext--error" role="alert">${error}</span>`
                    : hint ? `<span class="subtext subtext--hint">${hint}</span>` : ''}
            </div>
        `;
    }

    setError(msg: string) {
        if (msg) this.setAttribute('error', msg);
        else this.removeAttribute('error');
    }

    clearError() { this.removeAttribute('error'); }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue !== newValue && this._mounted) this.render();
    }
}

defineComponent('nc-field', NcField);

// ── NcForm ───────────────────────────────────────────────────────────────────

const FORM_CONTROLS = [
    'nc-input', 'nc-textarea', 'nc-select', 'nc-checkbox', 'nc-radio',
    'nc-switch', 'nc-slider', 'nc-rating', 'nc-number-input',
    'nc-autocomplete', 'nc-date-picker', 'nc-time-picker', 'nc-color-picker',
    'input', 'textarea', 'select',
];

export class NcForm extends Component {
    static useShadowDOM = true;

    private readonly _submitHandler = this._onSubmit.bind(this);

    private readonly _keydownHandler = (e: Event) => {
        const ke = e as KeyboardEvent;
        const target = ke.target as HTMLElement;
        if (ke.key === 'Enter' && target.tagName !== 'TEXTAREA') {
            this._handleSubmit();
        }
    };

    private readonly _clickHandler = (e: Event) => {
        const btn = (e.target as HTMLElement).closest<HTMLElement>('[type="submit"], nc-button[type="submit"]');
        if (btn && this.contains(btn)) {
            e.preventDefault();
            this._handleSubmit();
        }
    };

    template() {
        return `
            <style>
                :host {
                    display: block;
                    width: 100%;
                }
            </style>
            <slot></slot>
        `;
    }

    connectedCallback() {
        super.connectedCallback?.();
        this.addEventListener('submit', this._submitHandler as EventListener);
        this.addEventListener('keydown', this._keydownHandler);
        this.addEventListener('click', this._clickHandler);
    }

    disconnectedCallback() {
        this.removeEventListener('submit', this._submitHandler as EventListener);
        this.removeEventListener('keydown', this._keydownHandler);
        this.removeEventListener('click', this._clickHandler);
        super.disconnectedCallback?.();
    }

    private _onSubmit(e: Event) {
        const customEvent = e as CustomEvent<{ values?: Record<string, string> }>;
        if (customEvent.detail?.values) {
            return;
        }

        e.preventDefault();
        this._handleSubmit();
    }

    private _handleSubmit() {
        if (!this.hasAttribute('novalidate')) {
            const valid = this.validate();
            if (!valid) return;
        }
        const values = this.getValues();
        this.dispatchEvent(new CustomEvent('submit', {
            bubbles: true, composed: true,
            detail: { values }
        }));
    }

    getValues(): Record<string, string> {
        const result: Record<string, string> = {};
        FORM_CONTROLS.forEach(tag => {
            this.querySelectorAll<HTMLElement>(tag).forEach(el => {
                const name = el.getAttribute('name');
                if (!name) return;
                // nc-checkbox/nc-switch: use checked state
                if (tag === 'nc-checkbox' || tag === 'nc-switch') {
                    result[name] = el.hasAttribute('checked') ? 'true' : 'false';
                } else {
                    const controlWithValue = el as HTMLElement & { value?: string };
                    result[name] = controlWithValue.value ?? el.getAttribute('value') ?? (el as HTMLInputElement).value ?? '';
                }
            });
        });
        return result;
    }

    validate(): boolean {
        let valid = true;
        const invalidFields: string[] = [];

        // Check nc-field wrappers first
        this.querySelectorAll<NcField>('nc-field').forEach(field => {
            // Find the first named control inside this field
            const ctrl = FORM_CONTROLS.map(tag => field.querySelector<HTMLElement>(tag)).find(Boolean) as (HTMLElement & {
                value?: string;
                checkValidity?: () => boolean;
                getValidationMessage?: () => string;
                clearValidationError?: () => void;
                validate?: () => boolean;
            }) | undefined;
            if (!ctrl) return;

            const name = ctrl.getAttribute('name') || '';
            const value = ctrl.value ?? ctrl.getAttribute('value') ?? (ctrl as HTMLInputElement).value ?? '';
            const isRequired = field.hasAttribute('required') || ctrl.hasAttribute('required');

            if (isRequired && !String(value).trim()) {
                valid = false;
                field.setError('This field is required.');
                invalidFields.push(name);
                ctrl.clearValidationError?.();
                return;
            }

            if (typeof ctrl.checkValidity === 'function' && !ctrl.checkValidity()) {
                valid = false;
                field.setError(
                    typeof ctrl.getValidationMessage === 'function'
                        ? ctrl.getValidationMessage()
                        : 'Enter a valid value.'
                );
                invalidFields.push(name);
                ctrl.clearValidationError?.();
                return;
            }

            field.clearError();
            ctrl.clearValidationError?.();
        });

        // Validate standalone controls not wrapped in nc-field.
        FORM_CONTROLS.forEach(tag => {
            this.querySelectorAll<HTMLElement>(tag).forEach(ctrl => {
                if (ctrl.closest('nc-field')) return;

                const element = ctrl as HTMLElement & {
                    validate?: () => boolean;
                    checkValidity?: () => boolean;
                    clearValidationError?: () => void;
                };

                if (typeof element.validate === 'function') {
                    const isValid = element.validate();
                    if (!isValid) {
                        valid = false;
                        const name = ctrl.getAttribute('name');
                        if (name) invalidFields.push(name);
                    }
                    return;
                }

                if (typeof element.checkValidity === 'function' && !element.checkValidity()) {
                    valid = false;
                    const name = ctrl.getAttribute('name');
                    if (name) invalidFields.push(name);
                    return;
                }

                element.clearValidationError?.();
            });
        });

        if (!valid) {
            this.dispatchEvent(new CustomEvent('invalid', {
                bubbles: true, composed: true,
                detail: { fields: Array.from(new Set(invalidFields)) }
            }));
        }
        return valid;
    }

    reset() {
        FORM_CONTROLS.forEach(tag => {
            this.querySelectorAll<HTMLElement>(tag).forEach(el => {
                el.setAttribute('value', '');
                if (tag === 'nc-checkbox' || tag === 'nc-switch') el.removeAttribute('checked');
            });
        });
        this.querySelectorAll<NcField>('nc-field').forEach(f => f.clearError());
    }

    attributeChangedCallback(_name: string, _oldValue: string, _newValue: string) {}
}

defineComponent('nc-form', NcForm);

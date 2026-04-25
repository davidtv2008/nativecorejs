/**
 * NcOtpInput Component - One-time password / verification code input
 *
 * Attributes:
 *   length       - number of boxes (default: 6)
 *   type         - 'numeric'(default)|'alphanumeric'|'alpha'
 *   separator    - insert a visual dash/space separator after this position (e.g. "3" for 3+3)
 *   disabled     - boolean
 *   masked       - boolean - mask input like a password
 *   autofocus    - boolean - focus first box on mount
 *   label        - accessible label
 *   error        - error message
 *   hint         - helper text
 *
 * Value (read/write via property):
 *   el.value     - get/set current OTP string
 *
 * Events:
 *   change   - CustomEvent<{ value: string; complete: boolean }>
 *   complete - CustomEvent<{ value: string }> - fired when all boxes are filled
 *
 * Usage:
 *   <nc-otp-input length="6" type="numeric"></nc-otp-input>
 */
import { Component, defineComponent } from '../../.nativecore/core/component.js';
import { html, raw, escapeHTML } from '../../.nativecore/utils/templates.js';

export class NcOtpInput extends Component {
    static useShadowDOM = true;

    private _values: string[] = [];

    static get observedAttributes() { return ['length', 'disabled', 'masked', 'error']; }

    get value(): string { return this._values.join(''); }
    set value(v: string) {
        const len = this._length();
        this._values = v.slice(0, len).split('');
        while (this._values.length < len) this._values.push('');
        this.render();
        this._bindEvents();
    }

    private _length() { return parseInt(this.getAttribute('length') ?? '6', 10); }

    template() {
        const len       = this._length();
        const masked    = this.hasAttribute('masked');
        const disabled  = this.hasAttribute('disabled');
        const label     = this.getAttribute('label') ?? '';
        const error     = this.getAttribute('error') ?? '';
        const hint      = this.getAttribute('hint') ?? '';
        const separator = parseInt(this.getAttribute('separator') ?? '0', 10);

        while (this._values.length < len) this._values.push('');

        const boxesHtml = Array.from({ length: len }, (_, i) => {
            const val = this._values[i] ?? '';
            const showSep = separator > 0 && i === separator - 1 && i < len - 1;
            return html`
                <input
                    class="box"
                    type="${masked ? 'password' : 'text'}"
                    inputmode="${masked ? 'text' : 'numeric'}"
                    maxlength="1"
                    data-idx="${i}"
                    value="${val}"
                    ${disabled ? 'disabled' : ''}
                    autocomplete="one-time-code"
                    aria-label="${label ? label + ' ' : ''}digit ${i + 1}"
                />
                ${showSep ? '<span class="sep">-</span>' : ''}
            `;
        }).join('');

        return `
            <style>
                :host { display: block; font-family: var(--nc-font-family); }
                .wrap    { display: flex; align-items: center; gap: var(--nc-spacing-xs); }
                .box {
                    width: 44px;
                    height: 52px;
                    text-align: center;
                    font-size: var(--nc-font-size-xl);
                    font-weight: var(--nc-font-weight-semibold);
                    color: var(--nc-text);
                    background: var(--nc-bg);
                    border: 2px solid ${error ? 'var(--nc-danger)' : 'var(--nc-border)'};
                    border-radius: var(--nc-radius-md);
                    outline: none;
                    transition: border-color var(--nc-transition-fast), box-shadow var(--nc-transition-fast);
                    caret-color: transparent;
                    padding: 0;
                }
                .box:focus {
                    border-color: var(--nc-primary);
                    box-shadow: 0 0 0 3px rgba(var(--nc-primary-rgb, 99,102,241),.2);
                }
                .box:disabled { opacity: 0.5; cursor: not-allowed; }
                .box.filled   { border-color: var(--nc-primary); background: var(--nc-bg-secondary); }
                .sep {
                    color: var(--nc-text-muted);
                    font-size: var(--nc-font-size-lg);
                    font-weight: var(--nc-font-weight-medium);
                    user-select: none;
                    padding: 0 2px;
                }
                .hint  { font-size: var(--nc-font-size-xs); color: var(--nc-text-muted); margin-top: 6px; }
                .error { font-size: var(--nc-font-size-xs); color: var(--nc-danger);      margin-top: 6px; }
            </style>
            <div class="wrap" role="group" aria-label="${label || 'OTP input'}">
                ${raw(boxesHtml)}
            </div>
            ${raw(error ? `<p class="error">${escapeHTML(error)}</p>` : hint ? `<p class="hint">${escapeHTML(hint)}</p>` : '')}
        `;
    }

    onMount() {
        if (this.hasAttribute('autofocus')) {
            requestAnimationFrame(() => this._boxAt(0)?.focus());
        }
        this._bindEvents();
        this._applyFilledClass();
    }

    private _bindEvents() {
        const boxes = this._boxes();
        boxes.forEach((box, idx) => {
            // Remove stale listeners by replacing (simple approach via re-render)
            box.addEventListener('focus', () => box.select());

            box.addEventListener('input', () => {
                const type  = this.getAttribute('type') ?? 'numeric';
                const input = box as HTMLInputElement;
                let val = input.value;
                // Filter by type
                if (type === 'numeric')       val = val.replace(/\D/g, '');
                if (type === 'alpha')         val = val.replace(/[^a-zA-Z]/g, '');
                if (type === 'alphanumeric')  val = val.replace(/[^a-zA-Z0-9]/g, '');
                val = val.slice(-1).toUpperCase();
                input.value = val;
                this._values[idx] = val;
                this._applyFilledClass();
                this._emitChange();
                if (val && idx < boxes.length - 1) this._boxAt(idx + 1)?.focus();
            });

            box.addEventListener('keydown', (e: KeyboardEvent) => {
                const input = box as HTMLInputElement;
                if (e.key === 'Backspace') {
                    if (input.value) {
                        input.value = '';
                        this._values[idx] = '';
                        this._applyFilledClass();
                        this._emitChange();
                    } else if (idx > 0) {
                        this._boxAt(idx - 1)?.focus();
                    }
                    e.preventDefault();
                } else if (e.key === 'ArrowLeft'  && idx > 0)               this._boxAt(idx - 1)?.focus();
                else if   (e.key === 'ArrowRight' && idx < boxes.length - 1) this._boxAt(idx + 1)?.focus();
                else if   (e.key === 'Delete') {
                    input.value = '';
                    this._values[idx] = '';
                    this._applyFilledClass();
                    this._emitChange();
                    e.preventDefault();
                }
            });

            // Handle multi-character paste without blocking the native paste event.
            box.addEventListener('paste', (e: ClipboardEvent) => {
                const text = e.clipboardData?.getData('text') ?? '';
                if (!text) return;

                let filtered = text;
                const type = this.getAttribute('type') ?? 'numeric';
                if (type === 'numeric')      filtered = text.replace(/\D/g, '');
                if (type === 'alpha')        filtered = text.replace(/[^a-zA-Z]/g, '');
                if (type === 'alphanumeric') filtered = text.replace(/[^a-zA-Z0-9]/g, '');

                requestAnimationFrame(() => {
                    const chars = filtered.toUpperCase().slice(0, this._length() - idx).split('');
                    chars.forEach((ch, offset) => {
                        const targetIndex = idx + offset;
                        this._values[targetIndex] = ch;
                        const targetBox = this._boxAt(targetIndex);
                        if (targetBox) targetBox.value = ch;
                    });

                    this._applyFilledClass();
                    this._emitChange();

                    const nextFocus = Math.min(idx + chars.length, boxes.length - 1);
                    this._boxAt(nextFocus)?.focus();
                });
            });
        });
    }

    private _applyFilledClass() {
        this._boxes().forEach((box, i) => {
            box.classList.toggle('filled', !!(this._values[i]));
        });
    }

    private _emitChange() {
        const value    = this.value;
        const complete = value.length === this._length() && !value.includes('');
        this.emitEvent('change', { value, complete });
        if (complete) {
            this.emitEvent('complete', { value });
        }
    }

    private _boxes(): HTMLInputElement[] {
        return Array.from(this.shadowRoot!.querySelectorAll<HTMLInputElement>('.box'));
    }

    private _boxAt(i: number): HTMLInputElement | null {
        return this.shadowRoot!.querySelector<HTMLInputElement>(`.box[data-idx="${i}"]`);
    }

    attributeChangedCallback(name: string, oldVal: string, newVal: string) {
        if (oldVal === newVal || !this._mounted) return;
        this.render();
        this._bindEvents();
        this._applyFilledClass();
    }
}

defineComponent('nc-otp-input', NcOtpInput);




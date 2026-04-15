/**
 * NcNumberInput Component
 *
 * NativeCore Framework Core Component
 *
 * Attributes:
 *   - name: string — form field name
 *   - value: number — current value (default: min or 0)
 *   - min: number — minimum value (default: no limit)
 *   - max: number — maximum value (default: no limit)
 *   - step: number — increment/decrement amount (default: 1)
 *   - placeholder: string — placeholder text
 *   - disabled: boolean — disabled state
 *   - readonly: boolean — read-only state
 *   - size: 'sm' | 'md' | 'lg' (default: 'md')
 *   - variant: 'default' | 'filled' (default: 'default')
 *
 * Events:
 *   - change: CustomEvent<{ value: number; name: string }>
 *   - input: CustomEvent<{ value: number; name: string }>
 *
 * Usage:
 *   <nc-number-input name="qty" value="1" min="1" max="99"></nc-number-input>
 *   <nc-number-input name="price" value="9.99" step="0.01" min="0"></nc-number-input>
 */

import { Component, defineComponent } from '@core/component.js';

export class NcNumberInput extends Component {
    static useShadowDOM = true;

    static attributeOptions = {
        variant: ['default', 'filled'],
        size: ['sm', 'md', 'lg']
    };

    static get observedAttributes() {
        return ['name', 'value', 'min', 'max', 'step', 'placeholder', 'disabled', 'readonly', 'size', 'variant'];
    }

    // Track hold-to-repeat timer
    private _holdTimer: ReturnType<typeof setTimeout> | null = null;
    private _holdInterval: ReturnType<typeof setInterval> | null = null;

    constructor() {
        super();
    }

    private _getNum(attr: string, fallback: number): number {
        const v = this.getAttribute(attr);
        return v !== null && v !== '' ? Number(v) : fallback;
    }

    private _getCurrentValue(): number {
        const v = this.getAttribute('value');
        return v !== null && v !== '' ? Number(v) : 0;
    }

    private _clamp(val: number): number {
        const min = this.getAttribute('min');
        const max = this.getAttribute('max');
        if (min !== null && val < Number(min)) return Number(min);
        if (max !== null && val > Number(max)) return Number(max);
        return val;
    }

    private _atMin(): boolean {
        const min = this.getAttribute('min');
        return min !== null && this._getCurrentValue() <= Number(min);
    }

    private _atMax(): boolean {
        const max = this.getAttribute('max');
        return max !== null && this._getCurrentValue() >= Number(max);
    }

    template() {
        const value = this._getCurrentValue();
        const placeholder = this.getAttribute('placeholder') || '';
        const disabled = this.hasAttribute('disabled');
        const readonly = this.hasAttribute('readonly');
        const min = this.getAttribute('min');
        const max = this.getAttribute('max');
        const step = this._getNum('step', 1);
        const atMin = min !== null && value <= Number(min);
        const atMax = max !== null && value >= Number(max);

        return `
            <style>
                :host {
                    display: inline-flex;
                    font-family: var(--nc-font-family);
                }

                .wrap {
                    display: inline-flex;
                    align-items: stretch;
                    border: var(--nc-input-border);
                    border-radius: var(--nc-input-radius);
                    overflow: hidden;
                    transition: border-color var(--nc-transition-fast), box-shadow var(--nc-transition-fast);
                    background: var(--nc-bg);
                    opacity: ${disabled ? '0.5' : '1'};
                    width: 100%;
                }

                :host([variant="filled"]) .wrap {
                    background: var(--nc-bg-tertiary);
                    border-color: transparent;
                }

                .wrap:focus-within {
                    border-color: var(--nc-input-focus-border);
                    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
                }

                .btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    background: var(--nc-bg-secondary);
                    border: none;
                    cursor: ${disabled || readonly ? 'not-allowed' : 'pointer'};
                    color: var(--nc-text-muted);
                    transition: background var(--nc-transition-fast), color var(--nc-transition-fast);
                    user-select: none;
                    -webkit-user-select: none;
                    padding: 0;
                }

                :host([size="sm"]) .btn { width: 28px; }
                :host([size="lg"]) .btn { width: 40px; }
                :host,
                :host([size="md"]) { }
                .btn { width: 34px; }

                .btn:hover:not(:disabled):not([aria-disabled="true"]) {
                    background: var(--nc-bg-tertiary);
                    color: var(--nc-text);
                }

                .btn:active:not(:disabled):not([aria-disabled="true"]) {
                    background: var(--nc-border);
                }

                .btn[aria-disabled="true"] {
                    opacity: 0.35;
                    cursor: not-allowed;
                }

                input[type="number"] {
                    flex: 1;
                    min-width: 0;
                    border: none;
                    outline: none;
                    background: transparent;
                    color: var(--nc-text);
                    font-size: var(--nc-font-size-base);
                    font-family: var(--nc-font-family);
                    text-align: center;
                    padding: 0;
                    cursor: ${disabled ? 'not-allowed' : 'auto'};
                    -moz-appearance: textfield;
                }

                input[type="number"]::-webkit-outer-spin-button,
                input[type="number"]::-webkit-inner-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }

                input[type="number"]::placeholder {
                    color: var(--nc-text-muted);
                }

                :host([size="sm"]) input { font-size: var(--nc-font-size-sm); padding: var(--nc-spacing-xs) 0; }
                :host([size="md"]) input,
                :host input         { padding: var(--nc-spacing-sm) 0; }
                :host([size="lg"]) input { font-size: var(--nc-font-size-lg); padding: var(--nc-spacing-md) 0; }
            </style>

            <div class="wrap">
                <button
                    class="btn btn-dec"
                    type="button"
                    aria-label="Decrease"
                    aria-disabled="${atMin || disabled || readonly}"
                    tabindex="${disabled ? '-1' : '0'}"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" width="14" height="14">
                        <path d="M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                </button>

                <input
                    type="number"
                    value="${value}"
                    ${min !== null ? `min="${min}"` : ''}
                    ${max !== null ? `max="${max}"` : ''}
                    step="${step}"
                    ${disabled ? 'disabled' : ''}
                    ${readonly ? 'readonly' : ''}
                    placeholder="${placeholder}"
                    name="${this.getAttribute('name') || ''}"
                    aria-label="${this.getAttribute('name') || 'number'}"
                />

                <button
                    class="btn btn-inc"
                    type="button"
                    aria-label="Increase"
                    aria-disabled="${atMax || disabled || readonly}"
                    tabindex="${disabled ? '-1' : '0'}"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" width="14" height="14">
                        <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>
        `;
    }

    onMount() {
        this._bindEvents();
    }

    private _bindEvents() {
        const sr = this.shadowRoot!;
        const input = sr.querySelector<HTMLInputElement>('input[type="number"]')!;
        const decBtn = sr.querySelector<HTMLButtonElement>('.btn-dec')!;
        const incBtn = sr.querySelector<HTMLButtonElement>('.btn-inc')!;

        // Direct input
        input.addEventListener('input', () => {
            const val = this._clamp(Number(input.value));
            this._updateButtons(val);
            this.dispatchEvent(new CustomEvent('input', {
                bubbles: true, composed: true,
                detail: { value: val, name: this.getAttribute('name') || '' }
            }));
        });

        input.addEventListener('change', () => {
            const val = this._clamp(Number(input.value));
            input.value = String(val);
            this.setAttribute('value', String(val));
            this._updateButtons(val);
            this.dispatchEvent(new CustomEvent('change', {
                bubbles: true, composed: true,
                detail: { value: val, name: this.getAttribute('name') || '' }
            }));
        });

        // Scroll on focused input
        input.addEventListener('wheel', (e) => {
            if (document.activeElement !== this && !this.shadowRoot!.activeElement) return;
            e.preventDefault();
            const delta = (e as WheelEvent).deltaY;
            if (delta < 0) {
                this._step(1);
            } else {
                this._step(-1);
            }
        }, { passive: false });

        // Buttons — click + hold to repeat
        const setupHold = (btn: HTMLButtonElement, dir: 1 | -1) => {
            btn.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return;
                if (btn.getAttribute('aria-disabled') === 'true') return;
                this._step(dir);
                this._holdTimer = setTimeout(() => {
                    this._holdInterval = setInterval(() => this._step(dir), 80);
                }, 400);
            });
        };

        setupHold(decBtn, -1);
        setupHold(incBtn, 1);

        const stopHold = () => {
            if (this._holdTimer) { clearTimeout(this._holdTimer); this._holdTimer = null; }
            if (this._holdInterval) { clearInterval(this._holdInterval); this._holdInterval = null; }
        };

        document.addEventListener('mouseup', stopHold);

        // Keyboard on buttons
        decBtn.addEventListener('click', () => { if (decBtn.getAttribute('aria-disabled') !== 'true') this._step(-1); });
        incBtn.addEventListener('click', () => { if (incBtn.getAttribute('aria-disabled') !== 'true') this._step(1); });

        // Arrow keys on input
        input.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'ArrowUp') { e.preventDefault(); this._step(1); }
            if (e.key === 'ArrowDown') { e.preventDefault(); this._step(-1); }
        });
    }

    private _step(dir: 1 | -1) {
        if (this.hasAttribute('disabled') || this.hasAttribute('readonly')) return;
        const step = this._getNum('step', 1);
        // Use toFixed to avoid floating point drift (e.g. 0.1 + 0.2)
        const decimals = step.toString().split('.')[1]?.length ?? 0;
        const next = this._clamp(parseFloat((this._getCurrentValue() + dir * step).toFixed(decimals)));
        this._setValue(next);
    }

    private _setValue(value: number) {
        const input = this.shadowRoot!.querySelector<HTMLInputElement>('input[type="number"]');
        if (input) input.value = String(value);
        this.setAttribute('value', String(value));
        this._updateButtons(value);
        this.dispatchEvent(new CustomEvent('change', {
            bubbles: true, composed: true,
            detail: { value, name: this.getAttribute('name') || '' }
        }));
    }

    private _updateButtons(value: number) {
        const sr = this.shadowRoot!;
        const min = this.getAttribute('min');
        const max = this.getAttribute('max');
        const decBtn = sr.querySelector<HTMLButtonElement>('.btn-dec');
        const incBtn = sr.querySelector<HTMLButtonElement>('.btn-inc');
        if (decBtn) decBtn.setAttribute('aria-disabled', String(min !== null && value <= Number(min)));
        if (incBtn) incBtn.setAttribute('aria-disabled', String(max !== null && value >= Number(max)));
    }

    onUnmount() {
        if (this._holdTimer) clearTimeout(this._holdTimer);
        if (this._holdInterval) clearInterval(this._holdInterval);
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue === newValue) return;
        if (name === 'value' && this._mounted) {
            const input = this.shadowRoot!.querySelector<HTMLInputElement>('input[type="number"]');
            if (input) input.value = newValue || '0';
            this._updateButtons(Number(newValue || 0));
            return;
        }
        if (this._mounted) {
            this.render();
            this._bindEvents();
        }
    }
}

defineComponent('nc-number-input', NcNumberInput);

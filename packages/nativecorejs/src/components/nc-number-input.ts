/**
 * NcNumberInput Component
 *
 * NativeCore Framework Core Component
 *
 * Attributes:
 *   - name: string â€” form field name
 *   - value: number â€” current value (default: min or 0)
 *   - min: number â€” minimum value (default: no limit)
 *   - max: number â€” maximum value (default: no limit)
 *   - step: number â€” increment/decrement amount (default: 1)
 *   - placeholder: string â€” placeholder text
 *   - disabled: boolean â€” disabled state
 *   - readonly: boolean â€” read-only state
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

import { CoreComponent } from '../../.nativecore/core/component.js';
import { css } from '../../.nativecore/utils/templates.js';

export class NcNumberInput extends CoreComponent {
    static useShadowDOM = true;
    static observedAttributes = ['name', 'value', 'min', 'max', 'step', 'placeholder', 'disabled', 'readonly', 'size', 'variant'];
    static attributeOptions = { variant: ['default', 'filled'], size: ['sm', 'md', 'lg'] };
    static attributeOrder   = ['name', 'value', 'min', 'max', 'step', 'placeholder', 'size', 'variant', 'disabled', 'readonly'];

    // -- Refs -----------------------------------------------------------------
    declare inputEl:  HTMLInputElement;
    declare decBtnEl: HTMLButtonElement;
    declare incBtnEl: HTMLButtonElement;

    // Hold-to-repeat timers
    private _holdTimer:    ReturnType<typeof setTimeout>  | null = null;
    private _holdInterval: ReturnType<typeof setInterval> | null = null;

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

    static styles = css`
        :host { display: inline-flex; font-family: var(--nc-font-family); }

        .wrap {
            display: inline-flex; align-items: stretch;
            border: var(--nc-input-border);
            border-radius: var(--nc-input-radius);
            overflow: hidden;
            transition: border-color var(--nc-transition-fast), box-shadow var(--nc-transition-fast);
            background: var(--nc-bg); width: 100%;
        }
        :host([disabled]) .wrap { opacity: 0.5; }
        :host([variant="filled"]) .wrap { background: var(--nc-bg-tertiary); border-color: transparent; }
        .wrap:focus-within { border-color: var(--nc-input-focus-border); box-shadow: 0 0 0 3px rgba(16,185,129,.15); }

        .btn {
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0; width: 34px;
            background: var(--nc-bg-secondary); border: none; cursor: pointer;
            color: var(--nc-text-muted);
            transition: background var(--nc-transition-fast), color var(--nc-transition-fast);
            user-select: none; -webkit-user-select: none; padding: 0;
        }
        :host([size="sm"]) .btn { width: 28px; }
        :host([size="lg"]) .btn { width: 40px; }
        :host([disabled]) .btn,
        :host([readonly]) .btn { cursor: not-allowed; }
        .btn:hover:not(:disabled):not([aria-disabled="true"]) { background: var(--nc-bg-tertiary); color: var(--nc-text); }
        .btn:active:not(:disabled):not([aria-disabled="true"]) { background: var(--nc-border); }
        .btn[aria-disabled="true"] { opacity: 0.35; cursor: not-allowed; }

        input[type="number"] {
            flex: 1; min-width: 0; border: none; outline: none;
            background: transparent; color: var(--nc-text);
            font-size: var(--nc-font-size-base); font-family: var(--nc-font-family);
            text-align: center; padding: var(--nc-spacing-sm) 0; cursor: auto;
            -moz-appearance: textfield;
        }
        :host([disabled]) input { cursor: not-allowed; }
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type="number"]::placeholder { color: var(--nc-text-muted); }
        :host([size="sm"]) input { font-size: var(--nc-font-size-sm);  padding: var(--nc-spacing-xs)  0; }
        :host([size="lg"]) input { font-size: var(--nc-font-size-lg);  padding: var(--nc-spacing-md)  0; }
    `;

    template() {
        return `            <div class="wrap">
                <button ref="decBtnEl" class="btn btn-dec" type="button" aria-label="Decrease">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" width="14" height="14">
                        <path d="M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                </button>
                <input ref="inputEl" type="number" />
                <button ref="incBtnEl" class="btn btn-inc" type="button" aria-label="Increase">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" width="14" height="14">
                        <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>
        `;
    }

    onMount() {
        this._syncFromAttrs();

        // Direct input change
        this.on(this.inputEl, 'input', () => {
            const val = this._clamp(Number(this.inputEl.value));
            this._updateButtons(val);
            this.emit('input', { value: val, name: this.getAttribute('name') || '' });
        });
        this.on(this.inputEl, 'change', () => {
            const val = this._clamp(Number(this.inputEl.value));
            this.inputEl.value = String(val);
            this.setAttribute('value', String(val));
            this._updateButtons(val);
            this.emit('change', { value: val, name: this.getAttribute('name') || '' });
        });

        // Scroll wheel
        this.on(this.inputEl, 'wheel', (e: WheelEvent) => {
            if (document.activeElement !== this && !this.shadowRoot!.activeElement) return;
            e.preventDefault();
            this._step(e.deltaY < 0 ? 1 : -1);
        });

        // Hold-to-repeat
        const setupHold = (btn: HTMLButtonElement, dir: 1 | -1) => {
            this.on(btn, 'mousedown', (e: MouseEvent) => {
                if (e.button !== 0 || btn.getAttribute('aria-disabled') === 'true') return;
                this._step(dir);
                this._holdTimer = setTimeout(() => {
                    this._holdInterval = setInterval(() => this._step(dir), 80);
                }, 400);
            });
            this.on(btn, 'click', () => {
                if (btn.getAttribute('aria-disabled') !== 'true') this._step(dir);
            });
        };
        setupHold(this.decBtnEl, -1);
        setupHold(this.incBtnEl, 1);

        const stopHold = () => {
            if (this._holdTimer)    { clearTimeout(this._holdTimer);    this._holdTimer = null; }
            if (this._holdInterval) { clearInterval(this._holdInterval); this._holdInterval = null; }
        };
        this.on(document, 'mouseup', stopHold);

        // Arrow keys
        this.on(this.inputEl, 'keydown', (e: KeyboardEvent) => {
            if (e.key === 'ArrowUp')   { e.preventDefault(); this._step(1);  }
            if (e.key === 'ArrowDown') { e.preventDefault(); this._step(-1); }
        });
    }

    onUnmount() {
        if (this._holdTimer)    clearTimeout(this._holdTimer);
        if (this._holdInterval) clearInterval(this._holdInterval);
    }

    protected _handleAttributeUpdate(name: string, val: string | null) {
        if (name === 'value') {
            this.inputEl.value = val ?? '0';
            this._updateButtons(Number(val ?? 0));
            return;
        }
        this._syncFromAttrs();
    }

    private _syncFromAttrs() {
        const value       = this._getCurrentValue();
        const placeholder = this.getAttribute('placeholder') || '';
        const disabled    = this.hasAttribute('disabled');
        const readonly    = this.hasAttribute('readonly');
        const min         = this.getAttribute('min');
        const max         = this.getAttribute('max');
        const step        = this._getNum('step', 1);

        this.inputEl.value       = String(value);
        this.inputEl.placeholder = placeholder;
        this.inputEl.disabled    = disabled;
        this.inputEl.readOnly    = readonly;
        this.inputEl.step        = String(step);
        this.inputEl.name        = this.getAttribute('name') || '';
        this.inputEl.setAttribute('aria-label', this.getAttribute('name') || 'number');
        if (min !== null) this.inputEl.min = min; else this.inputEl.removeAttribute('min');
        if (max !== null) this.inputEl.max = max; else this.inputEl.removeAttribute('max');

        this._updateButtons(value);
    }

    private _step(dir: 1 | -1) {
        if (this.hasAttribute('disabled') || this.hasAttribute('readonly')) return;
        const step     = this._getNum('step', 1);
        const decimals = step.toString().split('.')[1]?.length ?? 0;
        const next     = this._clamp(parseFloat((this._getCurrentValue() + dir * step).toFixed(decimals)));
        this.inputEl.value = String(next);
        this.setAttribute('value', String(next));
        this._updateButtons(next);
        this.emit('change', { value: next, name: this.getAttribute('name') || '' });
    }

    private _updateButtons(value: number) {
        const min = this.getAttribute('min');
        const max = this.getAttribute('max');
        this.decBtnEl.setAttribute('aria-disabled', String(min !== null && value <= Number(min)));
        this.incBtnEl.setAttribute('aria-disabled', String(max !== null && value >= Number(max)));
    }
}

if (!customElements.get('nc-number-input')) customElements.define('nc-number-input', NcNumberInput);

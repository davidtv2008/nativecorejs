/**
 * NcSlider Component
 *
 * NativeCore Framework Core Component
 *
 * Attributes:
 *   - name: string â€” form field name
 *   - value: number â€” current value (default: min)
 *   - min: number â€” minimum value (default: 0)
 *   - max: number â€” maximum value (default: 100)
 *   - step: number â€” step increment (default: 1)
 *   - disabled: boolean â€” disabled state
 *   - show-value: boolean â€” show current value bubble above thumb
 *   - size: 'sm' | 'md' | 'lg' (default: 'md')
 *   - variant: 'primary' | 'success' | 'danger' (default: 'primary')
 *
 * Events:
 *   - change: CustomEvent<{ value: number; name: string }>
 *   - input: CustomEvent<{ value: number; name: string }>
 *
 * Usage:
 *   <nc-slider name="volume" min="0" max="100" value="50" show-value></nc-slider>
 *   <nc-slider name="opacity" min="0" max="1" step="0.01" value="0.5"></nc-slider>
 */

import { CoreComponent } from '../../.nativecore/core/component.js';
import { css } from '../../.nativecore/utils/templates.js';

export class NcSlider extends CoreComponent {
    static useShadowDOM = true;
    static observedAttributes = ['name', 'value', 'min', 'max', 'step', 'disabled', 'show-value', 'size', 'variant'];
    static attributeOptions = { variant: ['primary', 'success', 'danger'], size: ['sm', 'md', 'lg'] };
    static attributeOrder   = ['name', 'value', 'min', 'max', 'step', 'size', 'variant', 'show-value', 'disabled'];

    // -- Refs -----------------------------------------------------------------
    declare rangeEl:  HTMLInputElement;
    declare bubbleEl: HTMLSpanElement;

    private _isDragging = false;

    private _getNum(attr: string, fallback: number): number {
        const v = this.getAttribute(attr);
        return v !== null && v !== '' ? Number(v) : fallback;
    }

    static styles = css`
        :host {
            display: block; font-family: var(--nc-font-family); width: 100%;
            /* size tokens */
            --track-h: 4px; --thumb-size: 18px;
        }
        :host([size="sm"]) { --track-h: 3px; --thumb-size: 14px; }
        :host([size="lg"]) { --track-h: 6px; --thumb-size: 22px; }
        :host,
        :host([variant="primary"]) { --track-fill: var(--nc-primary); }
        :host([variant="success"]) { --track-fill: var(--nc-success); }
        :host([variant="danger"])  { --track-fill: var(--nc-danger); }

        .slider-wrap {
            position: relative; display: flex; align-items: center; width: 100%;
        }
        :host([show-value]) .slider-wrap { padding-top: 1.75rem; }

        input[type="range"] {
            -webkit-appearance: none; appearance: none;
            width: 100%; background: transparent;
            cursor: pointer; outline: none; margin: 0;
        }
        :host([disabled]) input[type="range"] { cursor: not-allowed; opacity: 0.5; }

        /* Track WebKit */
        input[type="range"]::-webkit-slider-runnable-track {
            height: var(--track-h); border-radius: var(--nc-radius-full);
            background: linear-gradient(
                to right,
                var(--track-fill) 0%,
                var(--track-fill) var(--_fill-pct, 0%),
                var(--nc-gray-200) var(--_fill-pct, 0%),
                var(--nc-gray-200) 100%
            );
        }
        /* Track Firefox */
        input[type="range"]::-moz-range-track {
            height: var(--track-h); border-radius: var(--nc-radius-full); background: var(--nc-gray-200);
        }
        input[type="range"]::-moz-range-progress {
            height: var(--track-h); border-radius: var(--nc-radius-full); background: var(--track-fill);
        }
        /* Thumb WebKit */
        input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none; appearance: none;
            width: var(--thumb-size); height: var(--thumb-size);
            border-radius: var(--nc-radius-full);
            background: var(--nc-white); border: 2px solid var(--track-fill);
            box-shadow: var(--nc-shadow-sm);
            margin-top: calc((var(--track-h) - var(--thumb-size)) / 2);
            transition: box-shadow var(--nc-transition-fast), transform var(--nc-transition-fast);
            cursor: pointer;
        }
        :host([disabled]) input[type="range"]::-webkit-slider-thumb { cursor: not-allowed; }
        input[type="range"]::-webkit-slider-thumb:hover { box-shadow: 0 0 0 6px color-mix(in srgb, var(--track-fill) 15%, transparent); transform: scale(1.1); }
        input[type="range"]::-webkit-slider-thumb:active { transform: scale(1.15); }
        /* Thumb Firefox */
        input[type="range"]::-moz-range-thumb {
            width: var(--thumb-size); height: var(--thumb-size);
            border-radius: var(--nc-radius-full);
            background: var(--nc-white); border: 2px solid var(--track-fill); box-shadow: var(--nc-shadow-sm);
        }
        input[type="range"]:focus-visible::-webkit-slider-thumb {
            box-shadow: 0 0 0 3px var(--nc-bg), 0 0 0 5px var(--track-fill);
        }

        /* Value bubble */
        .value-bubble {
            position: absolute; top: 0;
            left: var(--_fill-pct, 0%);
            transform: translateX(-50%);
            background: var(--track-fill); color: var(--nc-white);
            font-size: var(--nc-font-size-xs); font-weight: var(--nc-font-weight-semibold);
            padding: 1px 6px; border-radius: var(--nc-radius-sm);
            white-space: nowrap; pointer-events: none; line-height: 1.5;
        }
        .value-bubble::after {
            content: ''; position: absolute; top: 100%; left: 50%;
            transform: translateX(-50%); border: 4px solid transparent;
            border-top-color: var(--track-fill);
        }
        [hidden] { display: none !important; }
    `;

    template() {
        return `            <div class="slider-wrap">
                <span ref="bubbleEl" class="value-bubble" hidden></span>
                <input ref="rangeEl" type="range" />
            </div>
        `;
    }

    onMount() {
        this._syncFromAttrs();

        this.on(this.rangeEl, 'input', () => {
            const val = Number(this.rangeEl.value);
            this._updateLive(val);
            this.emit('input', { value: val, name: this.getAttribute('name') || '' });
        });
        this.on(this.rangeEl, 'change', () => {
            this._isDragging = false;
            const val = Number(this.rangeEl.value);
            this.setAttribute('value', String(val));
            this.emit('change', { value: val, name: this.getAttribute('name') || '' });
        });
        this.on(this.rangeEl, 'mousedown', () => { this._isDragging = true; });
        this.on(this.rangeEl, 'touchstart', () => { this._isDragging = true; });
    }

    protected _handleAttributeUpdate(name: string, val: string | null) {
        if (name === 'value' && !this._isDragging) {
            this._updateLive(Number(val ?? this.getAttribute('value') ?? this._getNum('min', 0)));
            return;
        }
        this._syncFromAttrs();
    }

    private _syncFromAttrs() {
        const min   = this._getNum('min', 0);
        const max   = this._getNum('max', 100);
        const step  = this._getNum('step', 1);
        const value = this._getNum('value', min);
        const disabled = this.hasAttribute('disabled');
        const showValue = this.hasAttribute('show-value');

        this.rangeEl.min      = String(min);
        this.rangeEl.max      = String(max);
        this.rangeEl.step     = String(step);
        this.rangeEl.value    = String(value);
        this.rangeEl.disabled = disabled;
        this.rangeEl.name     = this.getAttribute('name') || '';
        this.rangeEl.setAttribute('aria-valuemin', String(min));
        this.rangeEl.setAttribute('aria-valuemax', String(max));
        this.rangeEl.setAttribute('aria-valuenow', String(value));

        this.bubbleEl.hidden      = !showValue;
        this.bubbleEl.textContent = String(value);
        this._updateFillPct(value, min, max);
    }

    private _updateLive(val: number) {
        const min = this._getNum('min', 0);
        const max = this._getNum('max', 100);
        this._updateFillPct(val, min, max);
        this.bubbleEl.textContent = String(val);
        this.rangeEl.setAttribute('aria-valuenow', String(val));
    }

    private _updateFillPct(value: number, min: number, max: number) {
        const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;
        this.style.setProperty('--_fill-pct', `${pct}%`);
    }
}

if (!customElements.get('nc-slider')) customElements.define('nc-slider', NcSlider);

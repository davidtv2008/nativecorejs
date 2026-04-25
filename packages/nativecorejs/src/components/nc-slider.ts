/**
 * NcSlider Component
 *
 * NativeCore Framework Core Component
 *
 * Attributes:
 *   - name: string - form field name
 *   - value: number - current value (default: min)
 *   - min: number - minimum value (default: 0)
 *   - max: number - maximum value (default: 100)
 *   - step: number - step increment (default: 1)
 *   - disabled: boolean - disabled state
 *   - show-value: boolean - show current value bubble above thumb
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

import { Component, defineComponent } from '../../.nativecore/core/component.js';
import { html, raw } from '../../.nativecore/utils/templates.js';
import { useState } from '../../.nativecore/core/state.js';

export class NcSlider extends Component {
    static useShadowDOM = true;

    static attributeOptions = {
        variant: ['primary', 'success', 'danger'],
        size: ['sm', 'md', 'lg']
    };

    static get observedAttributes() {
        return ['name', 'value', 'min', 'max', 'step', 'disabled', 'show-value', 'size', 'variant'];
    }

    constructor() {
        super();
    }

    private _getNum(attr: string, fallback: number): number {
        const v = this.getAttribute(attr);
        return v !== null && v !== '' ? Number(v) : fallback;
    }

    template() {
        const min = this._getNum('min', 0);
        const max = this._getNum('max', 100);
        const step = this._getNum('step', 1);
        const value = this._getNum('value', min);
        const disabled = this.hasAttribute('disabled');
        const showValue = this.hasAttribute('show-value');

        const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;

        // Set fill % as a host CSS variable so it can be updated without re-render
        this.style.setProperty('--_fill-pct', `${pct}%`);

        return html`
            <style>
                :host {
                    display: block;
                    font-family: var(--nc-font-family);
                    width: 100%;
                }

                .slider-wrap {
                    position: relative;
                    display: flex;
                    align-items: center;
                    width: 100%;
                    padding-top: ${showValue ? '1.75rem' : '0'};
                }

                input[type="range"] {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 100%;
                    background: transparent;
                    cursor: ${disabled ? 'not-allowed' : 'pointer'};
                    outline: none;
                    margin: 0;
                    opacity: ${disabled ? '0.5' : '1'};
                }

                /* Track - WebKit: uses the host CSS variable for live fill */
                input[type="range"]::-webkit-slider-runnable-track {
                    height: var(--track-h);
                    border-radius: var(--nc-radius-full);
                    background: linear-gradient(
                        to right,
                        var(--track-fill) 0%,
                        var(--track-fill) var(--_fill-pct, ${pct}%),
                        var(--nc-gray-200) var(--_fill-pct, ${pct}%),
                        var(--nc-gray-200) 100%
                    );
                }

                /* Track - Firefox */
                input[type="range"]::-moz-range-track {
                    height: var(--track-h);
                    border-radius: var(--nc-radius-full);
                    background: var(--nc-gray-200);
                }

                input[type="range"]::-moz-range-progress {
                    height: var(--track-h);
                    border-radius: var(--nc-radius-full);
                    background: var(--track-fill);
                }

                /* Thumb - WebKit */
                input[type="range"]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: var(--thumb-size);
                    height: var(--thumb-size);
                    border-radius: var(--nc-radius-full);
                    background: var(--nc-white);
                    border: 2px solid var(--track-fill);
                    box-shadow: var(--nc-shadow-sm);
                    margin-top: calc((var(--track-h) - var(--thumb-size)) / 2);
                    transition: box-shadow var(--nc-transition-fast), transform var(--nc-transition-fast);
                    cursor: ${disabled ? 'not-allowed' : 'pointer'};
                }

                input[type="range"]::-webkit-slider-thumb:hover {
                    box-shadow: 0 0 0 6px color-mix(in srgb, var(--track-fill) 15%, transparent);
                    transform: scale(1.1);
                }

                input[type="range"]::-webkit-slider-thumb:active {
                    transform: scale(1.15);
                }

                /* Thumb - Firefox */
                input[type="range"]::-moz-range-thumb {
                    width: var(--thumb-size);
                    height: var(--thumb-size);
                    border-radius: var(--nc-radius-full);
                    background: var(--nc-white);
                    border: 2px solid var(--track-fill);
                    box-shadow: var(--nc-shadow-sm);
                    cursor: ${disabled ? 'not-allowed' : 'pointer'};
                }

                input[type="range"]:focus-visible::-webkit-slider-thumb {
                    box-shadow: 0 0 0 3px var(--nc-bg), 0 0 0 5px var(--track-fill);
                }

                /* Size tokens */
                :host([size="sm"]),
                :host(:not([size])) {
                    --track-h: 3px;
                    --thumb-size: 14px;
                }

                :host([size="md"]) {
                    --track-h: 4px;
                    --thumb-size: 18px;
                }

                :host([size="lg"]) {
                    --track-h: 6px;
                    --thumb-size: 22px;
                }

                :host {
                    --track-h: 4px;
                    --thumb-size: 18px;
                }

                :host,
                :host([variant="primary"]) { --track-fill: var(--nc-primary); }
                :host([variant="success"]) { --track-fill: var(--nc-success); }
                :host([variant="danger"])  { --track-fill: var(--nc-danger); }

                /* Value bubble - position driven by --_fill-pct */
                .value-bubble {
                    position: absolute;
                    top: 0;
                    left: var(--_fill-pct, ${pct}%);
                    transform: translateX(-50%);
                    background: var(--track-fill);
                    color: var(--nc-white);
                    font-size: var(--nc-font-size-xs);
                    font-weight: var(--nc-font-weight-semibold);
                    padding: 1px 6px;
                    border-radius: var(--nc-radius-sm);
                    white-space: nowrap;
                    pointer-events: none;
                    line-height: 1.5;
                }

                .value-bubble::after {
                    content: '';
                    position: absolute;
                    top: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    border: 4px solid transparent;
                    border-top-color: var(--track-fill);
                }
            </style>

            <div class="slider-wrap">
                ${raw(showValue ? `<span class="value-bubble">${value}</span>` : '')}
                <input
                    type="range"
                    min="${min}"
                    max="${max}"
                    step="${step}"
                    value="${value}"
                    ${disabled ? 'disabled' : ''}
                    name="${this.getAttribute('name') || ''}"
                    aria-valuemin="${min}"
                    aria-valuemax="${max}"
                    aria-valuenow="${value}"
                />
            </div>
        `;
    }

    onMount() {
        // Use this.on() delegation — auto-cleaned on unmount, no accumulation across re-renders
        this.on('input', (event: Event) => {
            const el = event.target as HTMLInputElement;
            if (el.type !== 'range') return;
            const val = Number(el.value);
            this._updateLive(val);
            this.emitEvent('input', { value: val, name: this.getAttribute('name') || '' });
        });

        this.on('change', (event: Event) => {
            const el = event.target as HTMLInputElement;
            if (el.type !== 'range') return;
            const val = Number(el.value);
            this._isDragging.value = false;
            this.setAttribute('value', String(val));
            this.emitEvent('change', { value: val, name: this.getAttribute('name') || '' });
        });

        this.on('mousedown', (event: Event) => {
            if ((event.target as HTMLElement).closest('input[type="range"]')) {
                this._isDragging.value = true;
            }
        });

        this.on('touchstart', (event: Event) => {
            if ((event.target as HTMLElement).closest('input[type="range"]')) {
                this._isDragging.value = true;
            }
        });
    }

    private _isDragging = useState(false);

    private _updateLive(val: number) {
        const min = this._getNum('min', 0);
        const max = this._getNum('max', 100);
        const pct = max === min ? 0 : ((val - min) / (max - min)) * 100;

        this.style.setProperty('--_fill-pct', `${pct}%`);

        const bubble = this.shadowRoot!.querySelector<HTMLElement>('.value-bubble');
        if (bubble) bubble.textContent = String(val);
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue === newValue) return;
        if (name === 'value' && this._isDragging.value) return;
        if (this._mounted) this.render();
    }
}

defineComponent('nc-slider', NcSlider);



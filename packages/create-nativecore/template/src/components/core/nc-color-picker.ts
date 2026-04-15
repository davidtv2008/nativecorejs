/**
 * NcColorPicker Component
 *
 * Attributes:
 *   - name: string
 *   - value: string — current hex color (default: '#10b981')
 *   - swatches: JSON string array of hex colors — quick-pick palette
 *   - show-input: boolean — show hex text input (default: true)
 *   - disabled: boolean
 *   - size: 'sm'|'md'|'lg' (default: 'md')
 *
 * Events:
 *   - change: CustomEvent<{ value: string; name: string }>
 *   - input:  CustomEvent<{ value: string; name: string }>
 *
 * Usage:
 *   <nc-color-picker name="bg" value="#3b82f6"></nc-color-picker>
 *   <nc-color-picker name="accent" swatches='["#ef4444","#f59e0b","#10b981","#3b82f6","#8b5cf6"]'></nc-color-picker>
 */

import { Component, defineComponent } from '@core/component.js';

const DEFAULT_SWATCHES = [
    '#ef4444','#f97316','#f59e0b','#eab308',
    '#84cc16','#22c55e','#10b981','#14b8a6',
    '#06b6d4','#3b82f6','#6366f1','#8b5cf6',
    '#a855f7','#ec4899','#f43f5e','#64748b',
    '#000000','#ffffff',
];

export class NcColorPicker extends Component {
    static useShadowDOM = true;

    static get observedAttributes() {
        return ['name', 'value', 'swatches', 'show-input', 'disabled', 'size'];
    }

    private _value = '#10b981';

    constructor() { super(); }

    private _getSwatches(): string[] {
        const raw = this.getAttribute('swatches');
        if (!raw) return DEFAULT_SWATCHES;
        try { return JSON.parse(raw); } catch { return DEFAULT_SWATCHES; }
    }

    template() {
        if (!this._mounted) {
            this._value = this.getAttribute('value') || '#10b981';
        }
        const value = this._value;
        const showInput = this.getAttribute('show-input') !== 'false';
        const disabled = this.hasAttribute('disabled');
        const swatches = this._getSwatches();

        return `
            <style>
                :host { display: inline-block; font-family: var(--nc-font-family); }

                .picker {
                    display: inline-flex;
                    flex-direction: column;
                    gap: var(--nc-spacing-sm);
                    opacity: ${disabled ? '0.5' : '1'};
                    pointer-events: ${disabled ? 'none' : 'auto'};
                }

                .swatches {
                    display: grid;
                    grid-template-columns: repeat(9, 1fr);
                    gap: 4px;
                }

                .swatch {
                    width: 24px;
                    height: 24px;
                    border-radius: 4px;
                    border: 2px solid transparent;
                    cursor: pointer;
                    transition: transform var(--nc-transition-fast), border-color var(--nc-transition-fast);
                    outline: none;
                    padding: 0;
                }

                :host([size="sm"]) .swatch { width: 18px; height: 18px; }
                :host([size="lg"]) .swatch { width: 30px; height: 30px; }

                .swatch:hover { transform: scale(1.15); }
                .swatch:focus-visible { border-color: var(--nc-primary) !important; }
                .swatch.active { border-color: var(--nc-primary) !important; transform: scale(1.1); }

                /* White swatch needs a border to be visible */
                .swatch--light { border-color: var(--nc-border) !important; }
                .swatch--light.active { border-color: var(--nc-primary) !important; }

                .input-row {
                    display: flex;
                    align-items: center;
                    gap: var(--nc-spacing-sm);
                }

                .preview {
                    width: 32px;
                    height: 32px;
                    border-radius: var(--nc-radius-sm, 4px);
                    border: 1px solid var(--nc-border);
                    flex-shrink: 0;
                    position: relative;
                    overflow: hidden;
                    cursor: pointer;
                }

                /* Native color input — hidden but triggered by clicking the preview */
                .native-input {
                    position: absolute;
                    inset: 0;
                    opacity: 0;
                    cursor: pointer;
                    width: 100%;
                    height: 100%;
                    padding: 0;
                    border: none;
                }

                .hex-input {
                    flex: 1;
                    padding: 4px 8px;
                    background: var(--nc-bg);
                    border: var(--nc-input-border);
                    border-radius: var(--nc-input-radius);
                    color: var(--nc-text);
                    font-size: var(--nc-font-size-sm);
                    font-family: var(--nc-font-family);
                    font-variant-numeric: tabular-nums;
                    outline: none;
                    width: 90px;
                }

                .hex-input:focus { border-color: var(--nc-input-focus-border); box-shadow: 0 0 0 2px rgba(16,185,129,.15); }
            </style>
            <div class="picker">
                <div class="swatches" role="listbox" aria-label="Color swatches">
                    ${swatches.map(color => {
                        const isLight = this._isLight(color);
                        const active = color.toLowerCase() === value.toLowerCase();
                        return `<button
                            class="swatch${active ? ' active' : ''}${isLight ? ' swatch--light' : ''}"
                            style="background:${color}"
                            data-color="${color}"
                            aria-label="${color}"
                            aria-selected="${active}"
                            role="option"
                            type="button"
                            title="${color}"
                        ></button>`;
                    }).join('')}
                </div>

                ${showInput ? `
                <div class="input-row">
                    <div class="preview" style="background:${value}" title="Click to open color picker">
                        <input class="native-input" type="color" value="${value}" aria-label="Color picker" />
                    </div>
                    <input class="hex-input" type="text" value="${value}" maxlength="7" placeholder="#rrggbb" aria-label="Hex color value" />
                </div>` : ''}

                <input type="hidden" name="${this.getAttribute('name') || ''}" value="${value}" />
            </div>
        `;
    }

    private _isLight(hex: string): boolean {
        const c = hex.replace('#', '');
        const r = parseInt(c.slice(0, 2), 16);
        const g = parseInt(c.slice(2, 4), 16);
        const b = parseInt(c.slice(4, 6), 16);
        return (r * 299 + g * 587 + b * 114) / 1000 > 200;
    }

    onMount() {
        this._bindEvents();
    }

    private _bindEvents() {
        // Swatch clicks
        this.$<HTMLElement>('.swatches')!.addEventListener('click', (e) => {
            const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-color]');
            if (btn) this._commit(btn.dataset.color!);
        });

        // Native color input
        const native = this.$<HTMLInputElement>('.native-input');
        if (native) {
            native.addEventListener('input', () => {
                this._commit(native.value, false);
                const hex = this.$<HTMLInputElement>('.hex-input');
                if (hex) hex.value = native.value;
            });
            native.addEventListener('change', () => this._commit(native.value));
        }

        // Hex text input
        const hexIn = this.$<HTMLInputElement>('.hex-input');
        if (hexIn) {
            hexIn.addEventListener('input', () => {
                const v = hexIn.value.trim();
                if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                    this._commit(v, false);
                    const nat = this.$<HTMLInputElement>('.native-input');
                    if (nat) nat.value = v;
                }
            });
            hexIn.addEventListener('change', () => {
                const v = hexIn.value.trim();
                if (/^#[0-9a-fA-F]{6}$/.test(v)) this._commit(v);
                else hexIn.value = this._value; // revert invalid
            });
        }
    }

    private _commit(value: string, fireChange = true) {
        this._value = value;
        this.setAttribute('value', value);

        // Update swatch active states
        this.$$<HTMLElement>('.swatch').forEach(s => {
            const active = s.dataset.color?.toLowerCase() === value.toLowerCase();
            s.classList.toggle('active', active);
            s.setAttribute('aria-selected', String(active));
        });

        // Update preview
        const preview = this.$<HTMLElement>('.preview');
        if (preview) preview.style.background = value;

        // Update hidden input
        const hidden = this.$<HTMLInputElement>('input[type="hidden"]');
        if (hidden) hidden.value = value;

        const name = this.getAttribute('name') || '';
        const eventType = fireChange ? 'change' : 'input';
        this.dispatchEvent(new CustomEvent(eventType, {
            bubbles: true, composed: true,
            detail: { value, name }
        }));
        if (fireChange) {
            this.dispatchEvent(new CustomEvent('input', {
                bubbles: true, composed: true,
                detail: { value, name }
            }));
        }
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue === newValue) return;
        if (name === 'value' && this._mounted) {
            this._value = newValue;
            this._commit(newValue, false);
            const hex = this.$<HTMLInputElement>('.hex-input');
            if (hex) hex.value = newValue;
            return;
        }
        if (this._mounted) { this.render(); this._bindEvents(); }
    }
}

defineComponent('nc-color-picker', NcColorPicker);

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

import { CoreComponent } from '../../.nativecore/core/component.js';
import { css } from '../../.nativecore/utils/templates.js';

const DEFAULT_SWATCHES = [
    '#ef4444','#f97316','#f59e0b','#eab308',
    '#84cc16','#22c55e','#10b981','#14b8a6',
    '#06b6d4','#3b82f6','#6366f1','#8b5cf6',
    '#a855f7','#ec4899','#f43f5e','#64748b',
    '#000000','#ffffff',
];

export class NcColorPicker extends CoreComponent {
    static useShadowDOM = true;
    static observedAttributes = ['name', 'value', 'swatches', 'show-input', 'disabled', 'size'];
    static attributeOrder     = ['name', 'value', 'swatches', 'show-input', 'size', 'disabled'];

    // -- Refs -----------------------------------------------------------------
    declare swatchesEl:  HTMLDivElement;
    declare previewEl:   HTMLDivElement;
    declare nativeEl:    HTMLInputElement;
    declare hexInputEl:  HTMLInputElement;
    declare hiddenEl:    HTMLInputElement;

    private _value = '#10b981';

    private _getSwatches(): string[] {
        const raw = this.getAttribute('swatches');
        if (!raw) return DEFAULT_SWATCHES;
        try { return JSON.parse(raw); } catch { return DEFAULT_SWATCHES; }
    }

    static styles = css`
        :host { display: inline-block; font-family: var(--nc-font-family); }

        .picker {
            display: inline-flex;
            flex-direction: column;
            gap: var(--nc-spacing-sm);
        }
        :host([disabled]) .picker { opacity: 0.5; pointer-events: none; }

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

        :host([size="sm"]) .swatch { width: 18px; height: 18px; border-radius: 3px; }
        :host([size="lg"]) .swatch { width: 30px; height: 30px; border-radius: 5px; }

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
    `;

    template() {
        return `            <div class="picker">
                <div ref="swatchesEl" class="swatches" role="listbox" aria-label="Color swatches"></div>
                </div>

                <div class="input-row">
                    <div ref="previewEl" class="preview" title="Click to open color picker">
                        <input ref="nativeEl" class="native-input" type="color" aria-label="Color picker" />
                    </div>
                    <input ref="hexInputEl" class="hex-input" type="text" maxlength="7" placeholder="#rrggbb" aria-label="Hex color value" />
                </div>

                <input ref="hiddenEl" type="hidden" />
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
        this._value = this.getAttribute('value') || '#10b981';
        this._renderSwatches();
        this._syncInputs();

        // Swatch clicks
        this.on(this.swatchesEl, 'click', (e: MouseEvent) => {
            const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-color]');
            if (btn) this._commit(btn.dataset.color!);
        });

        // Native color input
        this.on(this.nativeEl, 'input', () => {
            this._commit(this.nativeEl.value, false);
            this.hexInputEl.value = this.nativeEl.value;
        });
        this.on(this.nativeEl, 'change', () => this._commit(this.nativeEl.value));

        // Hex text input
        this.on(this.hexInputEl, 'input', () => {
            const v = this.hexInputEl.value.trim();
            if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                this._commit(v, false);
                this.nativeEl.value = v;
            }
        });
        this.on(this.hexInputEl, 'change', () => {
            const v = this.hexInputEl.value.trim();
            if (/^#[0-9a-fA-F]{6}$/.test(v)) this._commit(v);
            else this.hexInputEl.value = this._value;
        });

        // Show/hide input row based on show-input attr
        this._syncInputRowVisibility();
    }

    protected _handleAttributeUpdate(name: string, val: string | null) {
        if (name === 'value' && val) {
            this._value = val;
            this._commit(val, false);
            return;
        }
        if (name === 'show-input') { this._syncInputRowVisibility(); return; }
        if (name === 'swatches')   { this._renderSwatches(); return; }
        if (name === 'disabled')   { return; } // handled by :host([disabled]) CSS
        this._syncInputs();
    }

    private _renderSwatches() {
        const value    = this._value;
        const swatches = this._getSwatches();
        this.swatchesEl.innerHTML = swatches.map(color => {
            const isLight = this._isLight(color);
            const active  = color.toLowerCase() === value.toLowerCase();
            return `<button class="swatch${active ? ' active' : ''}${isLight ? ' swatch--light' : ''}"
                style="background:${color}" data-color="${color}"
                aria-label="${color}" aria-selected="${active}"
                role="option" type="button" title="${color}"></button>`;
        }).join('');
    }

    private _syncInputs() {
        const value = this._value;
        this.nativeEl.value   = value;
        this.hexInputEl.value = value;
        this.previewEl.style.background = value;
        this.hiddenEl.value  = value;
        this.hiddenEl.name   = this.getAttribute('name') || '';
    }

    private _syncInputRowVisibility() {
        const show = this.getAttribute('show-input') !== 'false';
        const row  = this.$<HTMLElement>('.input-row');
        if (row) row.style.display = show ? '' : 'none';
    }

    private _commit(value: string, fireChange = true) {
        this._value = value;
        this.setAttribute('value', value);

        // Update swatch active states without re-render
        this.swatchesEl.querySelectorAll<HTMLElement>('.swatch').forEach(s => {
            const active = s.dataset.color?.toLowerCase() === value.toLowerCase();
            s.classList.toggle('active', active);
            s.setAttribute('aria-selected', String(active));
        });

        this._syncInputs();

        const name = this.getAttribute('name') || '';
        this.emit(fireChange ? 'change' : 'input', { value, name });
        if (fireChange) this.emit('input', { value, name });
    }
}

if (!customElements.get('nc-color-picker')) customElements.define('nc-color-picker', NcColorPicker);


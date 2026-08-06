/**
 * NcTimePicker Component
 *
 * Attributes:
 *   - name: string
 *   - value: string — HH:MM or HH:MM:SS (24-hour)
 *   - format: '12'|'24' (default: '24')
 *   - show-seconds: boolean — include seconds column (default: false)
 *   - min: string — minimum time HH:MM
 *   - max: string — maximum time HH:MM
 *   - step: number — minute step interval (default: 1)
 *   - placeholder: string (default: '--:--')
 *   - disabled: boolean
 *   - readonly: boolean
 *   - size: 'sm'|'md'|'lg' (default: 'md')
 *
 * Events:
 *   - change: CustomEvent<{ value: string; name: string }>
 *
 * Usage:
 *   <nc-time-picker name="start" value="09:30"></nc-time-picker>
 *   <nc-time-picker name="alarm" format="12" show-seconds></nc-time-picker>
 */

import { CoreComponent } from '@core/component.js';
import { css } from '@core-utils/templates.js';

function pad2(n: number) { return String(n).padStart(2, '0'); }

function parseTime(v: string | null): { h: number; m: number; s: number } | null {
    if (!v) return null;
    const parts = v.split(':').map(Number);
    if (parts.length < 2 || parts.some(isNaN)) return null;
    return { h: parts[0] ?? 0, m: parts[1] ?? 0, s: parts[2] ?? 0 };
}

function formatValue(h: number, m: number, s: number, showSec: boolean): string {
    return showSec ? `${pad2(h)}:${pad2(m)}:${pad2(s)}` : `${pad2(h)}:${pad2(m)}`;
}

function to12(h: number): { display: number; ampm: 'AM' | 'PM' } {
    return { display: h === 0 ? 12 : h > 12 ? h - 12 : h, ampm: h < 12 ? 'AM' : 'PM' };
}

export class NcTimePicker extends CoreComponent {
    static useShadowDOM = true;
    static observedAttributes = ['name', 'value', 'format', 'show-seconds', 'min', 'max', 'step', 'placeholder', 'disabled', 'readonly', 'size'];
    static attributeOptions   = { format: ['12', '24'], size: ['sm', 'md', 'lg'] };
    static attributeOrder     = ['name', 'value', 'format', 'show-seconds', 'min', 'max', 'step', 'placeholder', 'size', 'disabled', 'readonly'];

    // -- Refs -----------------------------------------------------------------
    declare inputWrapEl: HTMLDivElement;
    declare displayEl:   HTMLSpanElement;
    declare panelEl:     HTMLDivElement;
    declare hiddenEl:    HTMLInputElement;

    private _open         = false;
    private _h            = 0;
    private _m            = 0;
    private _s            = 0;
    private _ampm: 'AM' | 'PM' = 'AM';
    private _initialized  = false;
    private _outsideClick: ((e: MouseEvent) => void) | null = null;

    private _initFromAttr() {
        const t = parseTime(this.getAttribute('value'));
        if (t) {
            this._h = t.h;
            this._m = t.m;
            this._s = t.s;
            const { ampm } = to12(t.h);
            this._ampm = ampm;
        }
        this._initialized = true;
    }

    private _is12() { return this.getAttribute('format') === '12'; }
    private _showSec() { return this.hasAttribute('show-seconds'); }

    private _displayValue(): string {
        if (!this._initialized && !this.getAttribute('value')) return '';
        if (this._is12()) {
            const { display } = to12(this._h);
            return `${pad2(display)}:${pad2(this._m)}${this._showSec() ? `:${pad2(this._s)}` : ''} ${this._ampm}`;
        }
        return formatValue(this._h, this._m, this._s, this._showSec());
    }

    static styles = css`
        :host { display: block; position: relative; font-family: var(--nc-font-family); }

        .input-wrap {
            display: flex; align-items: center;
            border: var(--nc-input-border);
            border-radius: var(--nc-input-radius);
            background: var(--nc-bg);
            cursor: pointer;
            transition: border-color var(--nc-transition-fast), box-shadow var(--nc-transition-fast);
            user-select: none;
        }
        :host([disabled]) .input-wrap,
        :host([readonly]) .input-wrap { cursor: not-allowed; }
        :host([disabled]) .input-wrap { opacity: 0.5; }
        .input-wrap:focus-within { border-color: var(--nc-input-focus-border); box-shadow: 0 0 0 3px rgba(16,185,129,.15); }

        .display {
            flex: 1;
            padding: var(--nc-spacing-sm) var(--nc-spacing-md);
            font-size: var(--nc-font-size-base);
            color: var(--nc-text-muted);
            font-variant-numeric: tabular-nums;
        }

        :host([size="sm"]) .display { font-size: var(--nc-font-size-sm); padding: var(--nc-spacing-xs) var(--nc-spacing-sm); }
        :host([size="lg"]) .display { font-size: var(--nc-font-size-lg); padding: var(--nc-spacing-md); }

        .input-icon {
            padding: 0 var(--nc-spacing-sm);
            color: var(--nc-text-muted);
            display: flex;
            flex-shrink: 0;
        }

        .panel {
            position: absolute; top: calc(100% + 6px); left: 0; z-index: 500;
            background: var(--nc-bg); border: 1px solid var(--nc-border);
            border-radius: var(--nc-radius-md, 8px); box-shadow: var(--nc-shadow-lg);
            display: none; flex-direction: column; overflow: hidden; min-width: 240px;
        }

        .columns {
            display: flex;
            gap: 0;
            max-height: 220px;
        }

        .col {
            flex: 1;
            overflow-y: auto;
            scroll-snap-type: y mandatory;
            border-right: 1px solid var(--nc-border);
            scrollbar-width: thin;
        }
        .col:last-child { border-right: none; }

        .col-header {
            position: sticky;
            top: 0;
            background: var(--nc-bg-secondary);
            font-size: var(--nc-font-size-xs);
            font-weight: var(--nc-font-weight-semibold);
            color: var(--nc-text-muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 5px var(--nc-spacing-sm);
            text-align: center;
            z-index: 1;
        }

        .col-item {
            padding: 7px var(--nc-spacing-sm);
            text-align: center;
            font-size: var(--nc-font-size-sm);
            font-variant-numeric: tabular-nums;
            cursor: pointer;
            color: var(--nc-text);
            scroll-snap-align: start;
            transition: background var(--nc-transition-fast);
        }
        .col-item:hover { background: var(--nc-bg-secondary); }
        .col-item.selected { background: var(--nc-primary); color: #fff; font-weight: var(--nc-font-weight-semibold); }
        .col-item:disabled, .col-item[disabled] { opacity: 0.3; pointer-events: none; }

        .panel-footer {
            display: flex;
            justify-content: space-between;
            gap: var(--nc-spacing-xs);
            padding: var(--nc-spacing-sm);
            border-top: 1px solid var(--nc-border);
        }

        .panel-btn {
            flex: 1;
            padding: 5px;
            border-radius: var(--nc-radius-sm, 4px);
            font-size: var(--nc-font-size-xs);
            font-family: var(--nc-font-family);
            cursor: pointer;
            border: 1px solid var(--nc-border);
            background: var(--nc-bg-secondary);
            color: var(--nc-text);
            transition: background var(--nc-transition-fast);
        }
        .panel-btn:hover { background: var(--nc-bg-tertiary); }
        .panel-btn--primary { background: var(--nc-primary); color: #fff; border-color: var(--nc-primary); }
        .panel-btn--primary:hover { opacity: 0.9; }
    `;

    template() {
        const dur = parseInt(this.getAttribute('duration') ?? '250', 10); void dur;
        const step     = Number(this.getAttribute('step') || 1);
        const is12     = this._is12();
        const showSec  = this._showSec();
        const minuteOptions = Array.from({ length: Math.ceil(60 / step) }, (_, i) => i * step).filter(m => m < 60);
        const hourRange     = is12 ? 12 : 24;
        const hourOptions   = Array.from({ length: hourRange }, (_, i) => is12 ? i + 1 : i);

        return `            <div ref="inputWrapEl" class="input-wrap" tabindex="0" role="button" aria-haspopup="dialog" aria-expanded="false">
                <span ref="displayEl" class="display"></span>
                <span class="input-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" width="14" height="14">
                        <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.2"/>
                        <path d="M8 5v3.5l2 1.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
                    </svg>
                </span>
            </div>

            <div ref="panelEl" class="panel" role="dialog">
                <div class="columns">
                    <!-- Hours -->
                    <div class="col" data-col="hour">
                        <div class="col-header">HH</div>
                        ${hourOptions.map(h => {
                            const isSelected = is12 ? to12(this._h).display === h : this._h === h;
                            return `<div class="col-item${isSelected ? ' selected' : ''}" data-col="hour" data-value="${h}">${pad2(h)}</div>`;
                        }).join('')}
                    </div>
                    <!-- Minutes -->
                    <div class="col" data-col="minute">
                        <div class="col-header">MM</div>
                        ${minuteOptions.map(m => {
                            const isSelected = this._m === m;
                            return `<div class="col-item${isSelected ? ' selected' : ''}" data-col="minute" data-value="${m}">${pad2(m)}</div>`;
                        }).join('')}
                    </div>
                    ${showSec ? `
                    <div class="col" data-col="second">
                        <div class="col-header">SS</div>
                        ${Array.from({ length: 60 }, (_, i) => i).map(s => {
                            const isSelected = this._s === s;
                            return `<div class="col-item${isSelected ? ' selected' : ''}" data-col="second" data-value="${s}">${pad2(s)}</div>`;
                        }).join('')}
                    </div>` : ''}
                    ${is12 ? `
                    <div class="col" data-col="ampm">
                        <div class="col-header">AM/PM</div>
                        <div class="col-item${this._ampm === 'AM' ? ' selected' : ''}" data-col="ampm" data-value="AM">AM</div>
                        <div class="col-item${this._ampm === 'PM' ? ' selected' : ''}" data-col="ampm" data-value="PM">PM</div>
                    </div>` : ''}
                </div>
                <div class="panel-footer">
                    <button class="panel-btn" data-action="clear" type="button">Clear</button>
                    <button class="panel-btn" data-action="now" type="button">Now</button>
                    <button class="panel-btn panel-btn--primary" data-action="apply" type="button">Apply</button>
                </div>
            </div>

            <input ref="hiddenEl" type="hidden" />
        `;
    }

    onMount() {
        if (!this._initialized) this._initFromAttr();
        this._updateDisplay();
        this._bindEvents();
        // Panel starts closed — scrolling selected rows only matters when opened.
    }

    private _bindEvents() {
        this.on(this.inputWrapEl, 'click', () => {
            if (this.hasAttribute('disabled') || this.hasAttribute('readonly')) return;
            this._open = !this._open;
            this.panelEl.style.display = this._open ? 'flex' : 'none';
            this.inputWrapEl.setAttribute('aria-expanded', String(this._open));
            if (this._open) this._scrollToSelected();
        });

        this.on(this.inputWrapEl, 'keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.inputWrapEl.click(); }
            if (e.key === 'Escape') { this._open = false; this.panelEl.style.display = 'none'; }
        });

        // Column item + footer button clicks
        this.on(this.panelEl, 'click', (e: MouseEvent) => {
            const item   = (e.target as HTMLElement).closest<HTMLElement>('[data-col][data-value]');
            const action = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');

            if (item) {
                const col = item.dataset.col!;
                const val = item.dataset.value!;
                this._handleColSelect(col, val);
                const colEl = this.panelEl.querySelector<HTMLElement>(`[data-col="${col}"].col`);
                colEl?.querySelectorAll<HTMLElement>('.col-item').forEach(el => {
                    el.classList.toggle('selected', el.dataset.value === val);
                });
            }

            if (action) {
                switch (action.dataset.action) {
                    case 'clear': this._clear(); break;
                    case 'now':   this._setNow(); break;
                    case 'apply': this._apply(); break;
                }
            }
        });

        // Outside click
        this._outsideClick = (e: MouseEvent) => {
            if (!this.contains(e.target as Node) && !this.shadowRoot!.contains(e.target as Node)) {
                this._open = false;
                this.panelEl.style.display = 'none';
                this.inputWrapEl.setAttribute('aria-expanded', 'false');
            }
        };
        document.addEventListener('mousedown', this._outsideClick);
        this._unsubs.add(() => document.removeEventListener('mousedown', this._outsideClick!));
    }

    private _handleColSelect(col: string, val: string) {
        switch (col) {
            case 'hour': {
                const n = Number(val);
                if (this._is12()) {
                    this._h = this._ampm === 'AM'
                        ? (n === 12 ? 0 : n)
                        : (n === 12 ? 12 : n + 12);
                } else {
                    this._h = n;
                }
                break;
            }
            case 'minute': this._m = Number(val); break;
            case 'second': this._s = Number(val); break;
            case 'ampm': {
                this._ampm = val as 'AM' | 'PM';
                if (val === 'AM' && this._h >= 12) this._h -= 12;
                if (val === 'PM' && this._h < 12)  this._h += 12;
                break;
            }
        }
        this._updateDisplay();
    }

    private _updateDisplay() {
        const val = this._displayValue();
        const placeholder = this.getAttribute('placeholder') || '--:--';
        this.displayEl.textContent = val || placeholder;
        this.displayEl.style.color = val ? 'var(--nc-text)' : 'var(--nc-text-muted)';
        this.hiddenEl.value  = formatValue(this._h, this._m, this._s, this._showSec());
        this.hiddenEl.name   = this.getAttribute('name') || '';
    }

    private _apply() {
        this._initialized = true;
        const value = formatValue(this._h, this._m, this._s, this._showSec());
        this.setAttribute('value', value);
        this._open = false;
        this.panelEl.style.display = 'none';
        this.inputWrapEl.setAttribute('aria-expanded', 'false');
        this._updateDisplay();
        this.emit('change', { value, name: this.getAttribute('name') || '' });
    }

    private _clear() {
        this._h = 0; this._m = 0; this._s = 0; this._ampm = 'AM';
        this._initialized = false;
        this.removeAttribute('value');
        this._open = false;
        this.panelEl.style.display = 'none';
        this._updateDisplay();
        this.emit('change', { value: '', name: this.getAttribute('name') || '' });
    }

    private _setNow() {
        const now  = new Date();
        this._h    = now.getHours();
        this._m    = now.getMinutes();
        this._s    = now.getSeconds();
        this._ampm = this._h < 12 ? 'AM' : 'PM';
        this._initialized = true;
        this._updateDisplay();
        this._rebuildColumns();
        this._scrollToSelected();
    }

    // Rebuild only the scrollable columns (not the static wrapper/footer)
    private _rebuildColumns() {
        const step    = Number(this.getAttribute('step') || 1);
        const is12    = this._is12();
        const showSec = this._showSec();
        const minuteOptions = Array.from({ length: Math.ceil(60 / step) }, (_, i) => i * step).filter(m => m < 60);
        const hourRange     = is12 ? 12 : 24;
        const hourOptions   = Array.from({ length: hourRange }, (_, i) => is12 ? i + 1 : i);

        const colsEl = this.panelEl.querySelector<HTMLElement>('.columns');
        if (!colsEl) return;
        colsEl.innerHTML = `
            <div class="col" data-col="hour">
                <div class="col-header">HH</div>
                ${hourOptions.map(h => {
                    const isSelected = is12 ? to12(this._h).display === h : this._h === h;
                    return `<div class="col-item${isSelected ? ' selected' : ''}" data-col="hour" data-value="${h}">${pad2(h)}</div>`;
                }).join('')}
            </div>
            <div class="col" data-col="minute">
                <div class="col-header">MM</div>
                ${minuteOptions.map(m => {
                    const isSel = this._m === m;
                    return `<div class="col-item${isSel ? ' selected' : ''}" data-col="minute" data-value="${m}">${pad2(m)}</div>`;
                }).join('')}
            </div>
            ${showSec ? `<div class="col" data-col="second">
                <div class="col-header">SS</div>
                ${Array.from({ length: 60 }, (_, i) => i).map(s => {
                    return `<div class="col-item${this._s === s ? ' selected' : ''}" data-col="second" data-value="${s}">${pad2(s)}</div>`;
                }).join('')}
            </div>` : ''}
            ${is12 ? `<div class="col" data-col="ampm">
                <div class="col-header">AM/PM</div>
                <div class="col-item${this._ampm === 'AM' ? ' selected' : ''}" data-col="ampm" data-value="AM">AM</div>
                <div class="col-item${this._ampm === 'PM' ? ' selected' : ''}" data-col="ampm" data-value="PM">PM</div>
            </div>` : ''}
        `;
    }

    private _scrollToSelected() {
        if (!this._open) return;
        requestAnimationFrame(() => {
            this.panelEl.querySelectorAll<HTMLElement>('.col').forEach(col => {
                const selected = col.querySelector<HTMLElement>('.selected');
                if (!selected) return;
                // Scroll within the column only — scrollIntoView can move the page.
                col.scrollTop = selected.offsetTop - (col.clientHeight / 2) + (selected.clientHeight / 2);
            });
        });
    }

    protected _handleAttributeUpdate(name: string, val: string | null) {
        if (name === 'value') {
            const t = parseTime(val);
            if (t) { this._h = t.h; this._m = t.m; this._s = t.s; this._ampm = to12(t.h).ampm; this._initialized = true; }
            this._updateDisplay();
            return;
        }
    }

    onUnmount() {
        // _outsideClick is auto-removed via _unsubs
    }
}

if (!customElements.get('nc-time-picker')) customElements.define('nc-time-picker', NcTimePicker);


/**
 * NcDatePicker Component
 *
 * Attributes:
 *   - name: string
 *   - value: string — ISO date string YYYY-MM-DD
 *   - min: string — minimum selectable date (YYYY-MM-DD)
 *   - max: string — maximum selectable date (YYYY-MM-DD)
 *   - placeholder: string (default: 'Select date')
 *   - disabled: boolean
 *   - readonly: boolean
 *   - size: 'sm'|'md'|'lg' (default: 'md')
 *   - variant: 'default'|'filled' (default: 'default')
 *   - first-day: 0|1 — 0=Sunday, 1=Monday (default: 0)
 *
 * Events:
 *   - change: CustomEvent<{ value: string; date: Date | null; name: string }>
 *
 * Usage:
 *   <nc-date-picker name="dob" value="2024-03-15"></nc-date-picker>
 *   <nc-date-picker name="from" min="2024-01-01" max="2024-12-31"></nc-date-picker>
 */

import { CoreComponent } from '../../.nativecore/core/component.js';
import { css } from '../../.nativecore/utils/templates.js';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_SUN = ['Su','Mo','Tu','We','Th','Fr','Sa'];
const DAYS_MON = ['Mo','Tu','We','Th','Fr','Sa','Su'];

function pad(n: number) { return String(n).padStart(2, '0'); }
function toISO(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function parseDate(s: string | null): Date | null {
    if (!s) return null;
    const d = new Date(s + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
}
function formatDisplay(d: Date | null): string {
    if (!d) return '';
    return `${MONTHS[d.getMonth()].slice(0,3)} ${d.getDate()}, ${d.getFullYear()}`;
}

export class NcDatePicker extends CoreComponent {
    static useShadowDOM = true;
    static observedAttributes = ['name', 'value', 'min', 'max', 'placeholder', 'disabled', 'readonly', 'size', 'variant', 'first-day'];
    static attributeOptions   = { size: ['sm', 'md', 'lg'], variant: ['default', 'filled'] };
    static attributeOrder     = ['name', 'value', 'min', 'max', 'placeholder', 'first-day', 'size', 'variant', 'disabled', 'readonly'];

    // -- Refs -----------------------------------------------------------------
    declare inputWrapEl:  HTMLDivElement;
    declare inputTextEl:  HTMLSpanElement;
    declare calendarEl:   HTMLDivElement;
    declare hiddenEl:     HTMLInputElement;

    private _open     = false;
    private _selected: Date | null = null;
    private _viewYear  = new Date().getFullYear();
    private _viewMonth = new Date().getMonth();
    private _outsideClick: ((e: MouseEvent) => void) | null = null;

    static styles = css`
        :host { display: block; position: relative; font-family: var(--nc-font-family); }

        .input-wrap {
            display: flex; align-items: center;
            border: var(--nc-input-border);
            border-radius: var(--nc-input-radius);
            background: var(--nc-bg);
            overflow: hidden;
            cursor: pointer;
            transition: border-color var(--nc-transition-fast), box-shadow var(--nc-transition-fast);
        }
        :host([disabled]) .input-wrap,
        :host([readonly]) .input-wrap { cursor: not-allowed; }
        :host([disabled]) .input-wrap { opacity: 0.5; }

        :host([variant="filled"]) .input-wrap { background: var(--nc-bg-tertiary); border-color: transparent; }
        .input-wrap:focus-within { border-color: var(--nc-input-focus-border); box-shadow: 0 0 0 3px rgba(16,185,129,.15); }

        .input-text {
            flex: 1;
            padding: var(--nc-spacing-sm) var(--nc-spacing-md);
            font-size: var(--nc-font-size-base);
            color: var(--nc-text-muted);
            background: none; border: none; outline: none;
            cursor: inherit; white-space: nowrap; min-width: 0;
        }

        :host([size="sm"]) .input-text { font-size: var(--nc-font-size-sm); padding: var(--nc-spacing-xs) var(--nc-spacing-sm); }
        :host([size="lg"]) .input-text { font-size: var(--nc-font-size-lg); padding: var(--nc-spacing-md) var(--nc-spacing-lg); }

        .input-icon {
            padding: 0 var(--nc-spacing-sm);
            color: var(--nc-text-muted);
            display: flex;
            align-items: center;
            flex-shrink: 0;
        }

        .calendar {
            position: absolute; top: calc(100% + 6px); left: 0; z-index: 500;
            background: var(--nc-bg); border: 1px solid var(--nc-border);
            border-radius: var(--nc-radius-md, 8px); box-shadow: var(--nc-shadow-lg);
            padding: var(--nc-spacing-md); width: 280px; display: none;
        }

        .cal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: var(--nc-spacing-sm);
            gap: 4px;
        }

        .cal-nav {
            background: none;
            border: none;
            cursor: pointer;
            padding: 4px 6px;
            border-radius: var(--nc-radius-sm, 4px);
            color: var(--nc-text-muted);
            display: flex;
            transition: background var(--nc-transition-fast), color var(--nc-transition-fast);
        }
        .cal-nav:hover { background: var(--nc-bg-secondary); color: var(--nc-text); }

        .cal-title {
            flex: 1;
            text-align: center;
            font-weight: var(--nc-font-weight-semibold);
            font-size: var(--nc-font-size-sm);
            color: var(--nc-text);
        }

        .cal-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 2px;
        }

        .cal-day-label {
            text-align: center;
            font-size: 0.65rem;
            font-weight: var(--nc-font-weight-semibold);
            color: var(--nc-text-muted);
            padding: 2px 0;
            text-transform: uppercase;
        }

        .cal-day {
            text-align: center;
            font-size: var(--nc-font-size-sm);
            padding: 5px 2px;
            border-radius: var(--nc-radius-sm, 4px);
            cursor: pointer;
            color: var(--nc-text);
            transition: background var(--nc-transition-fast), color var(--nc-transition-fast);
            border: none;
            background: none;
            width: 100%;
            font-family: var(--nc-font-family);
        }

        .cal-day:hover:not(:disabled) { background: var(--nc-bg-secondary); }
        .cal-day--other-month { color: var(--nc-text-muted); opacity: 0.4; }
        .cal-day--today { font-weight: var(--nc-font-weight-semibold); border: 1px solid var(--nc-border-dark); }
        .cal-day--selected { background: var(--nc-primary) !important; color: #fff !important; }
        .cal-day:disabled { opacity: 0.25; cursor: not-allowed; }

        .cal-footer {
            margin-top: var(--nc-spacing-sm);
            display: flex;
            justify-content: space-between;
            gap: var(--nc-spacing-xs);
        }

        .cal-btn {
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
        .cal-btn:hover { background: var(--nc-bg-tertiary); }
        .cal-btn--primary { background: var(--nc-primary); color: #fff; border-color: var(--nc-primary); }
        .cal-btn--primary:hover { opacity: 0.9; }
    `;

    template() {
        const firstDay  = Number(this.getAttribute('first-day') ?? 0);
        const dayLabels = firstDay === 1 ? DAYS_MON : DAYS_SUN;
        void dayLabels; // used only after mount

        return `            <div ref="inputWrapEl" class="input-wrap" tabindex="0" role="button" aria-haspopup="dialog" aria-expanded="false">
                <span ref="inputTextEl" class="input-text"></span>
                <span class="input-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" width="14" height="14">
                        <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" stroke-width="1.2"/>
                        <path d="M5 1v3M11 1v3M2 7h12" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
                    </svg>
                </span>
            </div>

            <div ref="calendarEl" class="calendar" role="dialog" aria-label="Date picker" aria-modal="false"></div>

            <input ref="hiddenEl" type="hidden" />
        `;
    }

    private _renderCalendar(dayLabels: string[], firstDay: number): string {
        const year = this._viewYear;
        const month = this._viewMonth;
        const today = new Date();
        const min = parseDate(this.getAttribute('min'));
        const max = parseDate(this.getAttribute('max'));

        // Grid: fill from firstDay
        const firstOfMonth = new Date(year, month, 1).getDay(); // 0=Sun
        // offset to align with firstDay
        const startOffset = (firstOfMonth - firstDay + 7) % 7;

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrev = new Date(year, month, 0).getDate();
        const cells: { date: Date; type: 'prev'|'curr'|'next' }[] = [];

        for (let i = startOffset - 1; i >= 0; i--) {
            cells.push({ date: new Date(year, month - 1, daysInPrev - i), type: 'prev' });
        }
        for (let d = 1; d <= daysInMonth; d++) {
            cells.push({ date: new Date(year, month, d), type: 'curr' });
        }
        const remaining = 42 - cells.length;
        for (let d = 1; d <= remaining; d++) {
            cells.push({ date: new Date(year, month + 1, d), type: 'next' });
        }

        const dayLabelsHtml = dayLabels.map(l => `<span class="cal-day-label">${l}</span>`).join('');

        const daysHtml = cells.map(({ date, type }) => {
            const iso = toISO(date);
            const isToday = iso === toISO(today);
            const isSelected = this._selected && iso === toISO(this._selected);
            const isDisabled = (min && date < min) || (max && date > max);
            const classes = [
                'cal-day',
                type !== 'curr' ? 'cal-day--other-month' : '',
                isToday ? 'cal-day--today' : '',
                isSelected ? 'cal-day--selected' : '',
            ].filter(Boolean).join(' ');
            return `<button class="${classes}" data-date="${iso}" ${isDisabled ? 'disabled' : ''} type="button" tabindex="-1" aria-label="${iso}" aria-pressed="${!!isSelected}">${date.getDate()}</button>`;
        }).join('');

        return `
            <div class="cal-header">
                <button class="cal-nav" data-nav="prev-year" type="button" aria-label="Previous year">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="none" width="10" height="10"><path d="M9 2L5 6l4 4M5 2L1 6l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
                <button class="cal-nav" data-nav="prev-month" type="button" aria-label="Previous month">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="none" width="10" height="10"><path d="M8 2L4 6l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
                <span class="cal-title">${MONTHS[month]} ${year}</span>
                <button class="cal-nav" data-nav="next-month" type="button" aria-label="Next month">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="none" width="10" height="10"><path d="M4 2l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
                <button class="cal-nav" data-nav="next-year" type="button" aria-label="Next year">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="none" width="10" height="10"><path d="M3 2l4 4-4 4M7 2l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
            </div>
            <div class="cal-grid">
                ${dayLabelsHtml}
                ${daysHtml}
            </div>
            <div class="cal-footer">
                <button class="cal-btn" data-action="today" type="button">Today</button>
                <button class="cal-btn" data-action="clear" type="button">Clear</button>
            </div>
        `;
    }

    onMount() {
        this._selected = parseDate(this.getAttribute('value'));
        if (this._selected) {
            this._viewYear  = this._selected.getFullYear();
            this._viewMonth = this._selected.getMonth();
        }
        this._syncInputText();
        this._refreshCalendar();
        this.hiddenEl.name  = this.getAttribute('name') || '';
        this.hiddenEl.value = this._selected ? toISO(this._selected) : '';
        this._bindEvents();
    }

    private _bindEvents() {
        this.on(this.inputWrapEl, 'click', () => {
            if (this.hasAttribute('disabled') || this.hasAttribute('readonly')) return;
            this._open = !this._open;
            this.calendarEl.style.display = this._open ? 'block' : 'none';
            this.inputWrapEl.setAttribute('aria-expanded', String(this._open));
        });

        this.on(this.inputWrapEl, 'keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.inputWrapEl.click(); }
            if (e.key === 'Escape') { this._open = false; this.calendarEl.style.display = 'none'; }
        });

        this.on(this.calendarEl, 'click', (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const btn    = target.closest<HTMLElement>('[data-nav]');
            const day    = target.closest<HTMLElement>('[data-date]');
            const action = target.closest<HTMLElement>('[data-action]');

            if (btn) {
                e.stopPropagation();
                switch (btn.dataset.nav) {
                    case 'prev-month': this._viewMonth--; if (this._viewMonth < 0) { this._viewMonth = 11; this._viewYear--; } break;
                    case 'next-month': this._viewMonth++; if (this._viewMonth > 11) { this._viewMonth = 0; this._viewYear++; } break;
                    case 'prev-year': this._viewYear--; break;
                    case 'next-year': this._viewYear++; break;
                }
                this._refreshCalendar();
            }

            if (day && day.dataset.date) this._select(parseDate(day.dataset.date));

            if (action) {
                if (action.dataset.action === 'today') {
                    const today = new Date();
                    this._viewYear  = today.getFullYear();
                    this._viewMonth = today.getMonth();
                    this._select(today);
                } else if (action.dataset.action === 'clear') {
                    this._select(null);
                }
            }
        });

        this._outsideClick = (e: MouseEvent) => {
            if (!this.contains(e.target as Node) && !this.shadowRoot!.contains(e.target as Node)) {
                this._open = false;
                this.calendarEl.style.display = 'none';
                this.inputWrapEl.setAttribute('aria-expanded', 'false');
            }
        };
        document.addEventListener('mousedown', this._outsideClick);
        this._unsubs.add(() => document.removeEventListener('mousedown', this._outsideClick!));
    }

    private _syncInputText() {
        const displayValue = formatDisplay(this._selected);
        const placeholder  = this.getAttribute('placeholder') || 'Select date';
        this.inputTextEl.textContent = displayValue || placeholder;
        this.inputTextEl.style.color = displayValue ? 'var(--nc-text)' : 'var(--nc-text-muted)';
    }

    private _select(date: Date | null) {
        this._selected = date;
        if (date) { this._viewYear = date.getFullYear(); this._viewMonth = date.getMonth(); }
        this._open = false;
        this.calendarEl.style.display = 'none';
        this.inputWrapEl.setAttribute('aria-expanded', 'false');

        const isoValue = date ? toISO(date) : '';
        this._syncInputText();
        this.hiddenEl.value = isoValue;
        this.setAttribute('value', isoValue);
        this.emit('change', { value: isoValue, date, name: this.getAttribute('name') || '' });
    }

    private _refreshCalendar() {
        const firstDay  = Number(this.getAttribute('first-day') ?? 0);
        const dayLabels = firstDay === 1 ? DAYS_MON : DAYS_SUN;
        this.calendarEl.innerHTML = this._renderCalendar(dayLabels, firstDay);
    }

    protected _handleAttributeUpdate(name: string, val: string | null) {
        if (name === 'value') {
            this._selected = parseDate(val);
            if (this._selected) { this._viewYear = this._selected.getFullYear(); this._viewMonth = this._selected.getMonth(); }
            this._syncInputText();
            this.hiddenEl.value = val ?? '';
            this._refreshCalendar();
            return;
        }
        if (name === 'name') { this.hiddenEl.name = val ?? ''; return; }
        this._refreshCalendar();
    }

    onUnmount() {
        // _outsideClick auto-removed via _unsubs
    }
}

if (!customElements.get('nc-date-picker')) customElements.define('nc-date-picker', NcDatePicker);


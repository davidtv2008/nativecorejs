/**
 * NcSelect Component
 *
 * NativeCore Framework Core Component
 *
 * Options are provided as a JSON array via the `options` attribute or by
 * populating child `<option>` elements before the component mounts.
 *
 * Attributes:
 *   - options: JSON string — array of { value, label, disabled? }
 *   - value: string — currently selected value
 *   - placeholder: string — shown when no value selected (default: 'Select...')
 *   - name: string — form field name
 *   - disabled: boolean — disabled state
 *   - size: 'sm' | 'md' | 'lg' (default: 'md')
 *   - variant: 'default' | 'filled' (default: 'default')
 *   - searchable: boolean — adds a live filter input inside the dropdown
 *
 * Events:
 *   - change: CustomEvent<{ value: string; label: string; name: string }>
 *
 * Usage:
 *   <nc-select
 *     name="country"
 *     placeholder="Pick a country"
 *     options='[{"value":"us","label":"United States"},{"value":"ca","label":"Canada"}]'>
 *   </nc-select>
 */

import { CoreComponent } from '@core/component.js';
import { css } from '@core-utils/templates.js';

interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

export class NcSelect extends CoreComponent {
    static useShadowDOM = true;
    static attributeOptions = { variant: ['default', 'filled'], size: ['sm', 'md', 'lg'] };
    static observedAttributes = ['options', 'value', 'placeholder', 'name', 'disabled', 'size', 'variant', 'searchable'];
    static attributeOrder = ['name', 'options', 'value', 'placeholder', 'size', 'variant', 'searchable', 'disabled'];

    // -- Refs -----------------------------------------------------------------
    declare triggerEl:      HTMLDivElement;
    declare triggerLabelEl: HTMLSpanElement;
    declare chevronEl:      SVGElement;
    declare dropdownEl:     HTMLDivElement;
    declare optionsListEl:  HTMLDivElement;
    declare searchWrapEl:   HTMLDivElement;
    declare hiddenInputEl:  HTMLInputElement;

    private _open = false;
    private _filterText = '';

    private _getOptions(): SelectOption[] {
        try {
            const raw = this.getAttribute('options');
            if (raw) return JSON.parse(raw) as SelectOption[];
        } catch { /* fall through */ }
        return [];
    }

    private _getSelectedLabel(): string {
        const value = this.getAttribute('value') || '';
        if (!value) return '';
        return this._getOptions().find(o => o.value === value)?.label ?? value;
    }

    static styles = css`
        :host { display: inline-block; position: relative; font-family: var(--nc-font-family); width: 100%; }
        .select-trigger {
            display: flex; align-items: center; justify-content: space-between;
            width: 100%; box-sizing: border-box;
            padding: var(--nc-spacing-sm) var(--nc-spacing-md);
            background: var(--nc-bg); border: var(--nc-input-border);
            border-radius: var(--nc-input-radius); cursor: pointer;
            color: var(--nc-text-muted);
            font-size: var(--nc-font-size-base);
            transition: border-color var(--nc-transition-fast), box-shadow var(--nc-transition-fast);
            user-select: none; gap: var(--nc-spacing-sm); min-height: 40px;
        }
        .select-trigger.has-value { color: var(--nc-text); }
        :host([disabled]) .select-trigger { cursor: not-allowed; opacity: 0.5; }
        :host([size="sm"]) .select-trigger { padding: var(--nc-spacing-xs) var(--nc-spacing-sm); font-size: var(--nc-font-size-sm); min-height: 32px; }
        :host([size="lg"]) .select-trigger { padding: var(--nc-spacing-md) var(--nc-spacing-lg); font-size: var(--nc-font-size-lg); min-height: 48px; }
        :host([variant="filled"]) .select-trigger { background: var(--nc-bg-tertiary); border-color: transparent; }
        :host([variant="filled"]) .select-trigger:hover:not([disabled]) { background: var(--nc-bg-secondary); }
        .select-trigger:hover { border-color: var(--nc-input-focus-border); }
        .select-trigger.open  { border-color: var(--nc-input-focus-border); box-shadow: 0 0 0 3px rgba(16,185,129,.15); }
        .trigger-label { flex: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
        .chevron { flex-shrink: 0; transition: transform var(--nc-transition-fast); color: var(--nc-text-muted); }
        .chevron.open { transform: rotate(180deg); }
        .dropdown {
            display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0;
            background: var(--nc-bg); border: var(--nc-input-border);
            border-radius: var(--nc-radius-md); box-shadow: var(--nc-shadow-lg);
            z-index: var(--nc-z-dropdown); overflow: hidden; max-height: 240px; flex-direction: column;
        }
        .dropdown.open { display: flex; }
        .search-wrap { padding: var(--nc-spacing-xs) var(--nc-spacing-sm); border-bottom: 1px solid var(--nc-border); }
        .search-input {
            width: 100%; box-sizing: border-box; border: var(--nc-input-border);
            border-radius: var(--nc-radius-sm); padding: var(--nc-spacing-xs) var(--nc-spacing-sm);
            font-size: var(--nc-font-size-sm); font-family: var(--nc-font-family);
            color: var(--nc-text); background: var(--nc-bg-secondary); outline: none;
        }
        .search-input:focus { border-color: var(--nc-input-focus-border); }
        .options-list { overflow-y: auto; flex: 1; }
        .option {
            display: flex; align-items: center; justify-content: space-between;
            padding: var(--nc-spacing-sm) var(--nc-spacing-md); cursor: pointer;
            font-size: var(--nc-font-size-base); color: var(--nc-text);
            transition: background var(--nc-transition-fast); gap: var(--nc-spacing-sm);
        }
        .option:hover:not(.option--disabled) { background: var(--nc-bg-secondary); }
        .option--selected { color: var(--nc-primary); font-weight: var(--nc-font-weight-medium); }
        .option--disabled { opacity: 0.4; cursor: not-allowed; }
        .option__check { flex-shrink: 0; }
        .empty { padding: var(--nc-spacing-md); text-align: center; color: var(--nc-text-muted); font-size: var(--nc-font-size-sm); }
        [hidden] { display: none !important; }
    `;

    template() {
        return `            <input ref="hiddenInputEl" type="hidden" />
            <div ref="triggerEl" class="select-trigger" role="combobox" aria-expanded="false" aria-haspopup="listbox">
                <span ref="triggerLabelEl" class="trigger-label"></span>
                <svg ref="chevronEl" class="chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" width="16" height="16">
                    <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <div ref="dropdownEl" class="dropdown" role="listbox">
                <div ref="searchWrapEl" class="search-wrap" hidden>
                    <input class="search-input" type="text" placeholder="Search..." autocomplete="off" />
                </div>
                <div ref="optionsListEl" class="options-list"></div>
            </div>
        `;
    }

    onMount() {
        if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', '0');
        this._syncFromAttrs();

        this.on(this.shadowRoot!, 'click', (e: MouseEvent) => {
            if (this.hasAttribute('disabled')) return;
            const target = e.target as HTMLElement;
            const option = target.closest<HTMLElement>('.option');
            if (option) {
                if (!option.classList.contains('option--disabled')) this._select(option.dataset.value ?? '');
                return;
            }
            if (target.closest('.select-trigger')) this._setOpen(!this._open);
        });

        this.on(this.shadowRoot!, 'input', (e: Event) => {
            const input = e.target as HTMLInputElement;
            if (input.classList.contains('search-input')) {
                this._filterText = input.value;
                this._rerenderList();
            }
        });

        this.on(document as EventTarget, 'click', (e: MouseEvent) => {
            if (!this.contains(e.target as Node) && !this.shadowRoot!.contains(e.target as Node)) {
                this._setOpen(false);
            }
        });

        this.on(this, 'keydown', (e: KeyboardEvent) => {
            if (e.key === 'Escape') { this._setOpen(false); return; }
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._setOpen(!this._open); return; }
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); this._navigateOptions(e.key === 'ArrowDown' ? 1 : -1); }
        });
    }

    protected _handleAttributeUpdate(_name: string, _val: string | null) {
        this._syncFromAttrs();
    }

    private _syncFromAttrs() {
        const value       = this.getAttribute('value') || '';
        const placeholder = this.getAttribute('placeholder') || 'Select...';
        const searchable  = this.hasAttribute('searchable');
        const label       = this._getSelectedLabel();

        this.hiddenInputEl.name  = this.getAttribute('name') || '';
        this.hiddenInputEl.value = value;

        this.triggerLabelEl.textContent = label || placeholder;
        this.triggerEl.classList.toggle('has-value', !!label);
        this.searchWrapEl.hidden = !searchable;

        this._rerenderList();
    }

    private _setOpen(open: boolean) {
        this._open = open;
        if (!open) {
            this._filterText = '';
            const searchInput = this.searchWrapEl.querySelector<HTMLInputElement>('.search-input');
            if (searchInput) searchInput.value = '';
            this._rerenderList();
        }
        this.triggerEl.classList.toggle('open', open);
        this.triggerEl.setAttribute('aria-expanded', String(open));
        this.chevronEl.classList.toggle('open', open);
        this.dropdownEl.classList.toggle('open', open);
        if (open) {
            const search = this.searchWrapEl.querySelector<HTMLInputElement>('.search-input');
            if (search && !this.searchWrapEl.hidden) search.focus();
        }
    }

    private _rerenderList() {
        const value   = this.getAttribute('value') || '';
        const options = this._getOptions();
        const filtered = this._filterText
            ? options.filter(o => o.label.toLowerCase().includes(this._filterText.toLowerCase()))
            : options;

        this.optionsListEl.innerHTML = filtered.length ? filtered.map(o => `
            <div class="option${o.value === value ? ' option--selected' : ''}${o.disabled ? ' option--disabled' : ''}"
                 data-value="${o.value}" role="option"
                 aria-selected="${o.value === value}"
                 aria-disabled="${o.disabled ? 'true' : 'false'}">
                ${o.label}
                ${o.value === value ? `<svg class="option__check" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="none" width="12" height="12"><path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>` : ''}
            </div>`).join('') : '<div class="empty">No results</div>';
    }

    private _select(value: string) {
        const opt = this._getOptions().find(o => o.value === value);
        if (!opt) return;
        this.setAttribute('value', value);
        this.triggerLabelEl.textContent = opt.label;
        this.triggerEl.classList.add('has-value');
        this.hiddenInputEl.value = value;
        this._setOpen(false);
        this._rerenderList();
        this.emit('change', { value, label: opt.label, name: this.getAttribute('name') || '' });
    }

    private _navigateOptions(direction: number) {
        const opts    = this._getOptions().filter(o => !o.disabled);
        const current = this.getAttribute('value') || '';
        const idx     = opts.findIndex(o => o.value === current);
        const next    = opts[Math.max(0, Math.min(opts.length - 1, idx + direction))];
        if (next) this._select(next.value);
    }
}

if (!customElements.get('nc-select')) customElements.define('nc-select', NcSelect);


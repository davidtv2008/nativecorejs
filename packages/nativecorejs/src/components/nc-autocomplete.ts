/**
 * NcAutocomplete Component
 *
 * Attributes:
 *   - name: string
 *   - value: string — current input value
 *   - placeholder: string
 *   - options: JSON string array OR comma-separated — static suggestions
 *   - min-chars: number — chars before showing suggestions (default: 1)
 *   - max-results: number — max visible items (default: 8)
 *   - disabled: boolean
 *   - size: 'sm'|'md'|'lg' (default: 'md')
 *   - variant: 'default'|'filled' (default: 'default')
 *
 * Dynamic options — dispatch 'nc-autocomplete-options' on the element:
 *   el.dispatchEvent(new CustomEvent('nc-autocomplete-options', { detail: ['a','b'] }))
 *
 * Events:
 *   - input:  CustomEvent<{ value: string; name: string }>
 *   - select: CustomEvent<{ value: string; name: string }>
 *   - change: CustomEvent<{ value: string; name: string }>
 */

import { CoreComponent } from '../../.nativecore/core/component.js';
import { css, escapeHtml, html } from '../../.nativecore/utils/templates.js';

export class NcAutocomplete extends CoreComponent {
    static useShadowDOM = true;

    static observedAttributes = [
        'name', 'value', 'placeholder', 'options',
        'min-chars', 'max-results', 'disabled', 'size', 'variant',
    ];

    static attributeOptions = {
        size:     ['sm', 'md', 'lg'],
        variant:  ['default', 'filled'],
        disabled: ['true'],
    };

    static attributeOrder = [
        'name', 'value', 'placeholder', 'options',
        'min-chars', 'max-results', 'size', 'variant', 'disabled',
    ];

    static attributePlaceholders = {
        name:          'field-name',
        value:         'initial value',
        placeholder:   'Search...',
        options:       'Option A, Option B, Option C',
        'min-chars':   '1',
        'max-results': '8',
    };

    // ── Refs (auto-wired by _bootstrap via ref="...") ─────────────────────────
    declare inputEl: HTMLInputElement;
    declare dropdownEl: HTMLElement;

    // ── Reactive state ────────────────────────────────────────────────────────
    private inputValue     = this.state('');
    private open           = this.state(false);
    private activeIndex    = this.state(-1);
    private dynamicOptions = this.state<string[]>([]);

    // ── Helpers ───────────────────────────────────────────────────────────────
    private _getOptions(): string[] {
        const dyn = this.dynamicOptions.value;   // tracked dependency
        if (dyn.length) return dyn;
        const raw = this.getAttribute('options') || '';
        if (!raw) return [];
        try { return JSON.parse(raw); } catch { return raw.split(',').map(s => s.trim()).filter(Boolean); }
    }

    private _filtered(): string[] {
        const query    = this.inputValue.value.trim().toLowerCase();  // tracked
        const minChars = Number(this.getAttribute('min-chars') ?? 1);
        const max      = Number(this.getAttribute('max-results') ?? 8);
        if (query.length < minChars) return [];
        return this._getOptions()
            .filter(o => o.toLowerCase().includes(query))
            .slice(0, max);
    }

    // ── Template ──────────────────────────────────────────────────────────────
    static styles = css`
        :host {
            display: block;
            position: relative;
            width: 100%;
            font-family: var(--nc-font-family);
        }

        .input-wrap {
            position: relative;
            display: flex;
            align-items: center;
        }

        input {
            width: 100%;
            box-sizing: border-box;
            padding: var(--nc-spacing-sm) var(--nc-spacing-md);
            background: var(--nc-bg);
            border: var(--nc-input-border);
            border-radius: var(--nc-input-radius);
            color: var(--nc-text);
            font-size: var(--nc-font-size-base);
            font-family: var(--nc-font-family);
            outline: none;
            transition: border-color var(--nc-transition-fast), box-shadow var(--nc-transition-fast);
        }

        input:disabled { opacity: 0.5; cursor: not-allowed; }

        :host([size="sm"]) input { font-size: var(--nc-font-size-sm); padding: var(--nc-spacing-xs) var(--nc-spacing-sm); }
        :host([size="lg"]) input { font-size: var(--nc-font-size-lg); padding: var(--nc-spacing-md) var(--nc-spacing-lg); }
        :host([variant="filled"]) input { background: var(--nc-bg-tertiary); border-color: transparent; }

        input:focus { border-color: var(--nc-input-focus-border); box-shadow: 0 0 0 3px rgba(16,185,129,.15); }
        input::placeholder { color: var(--nc-text-muted); }

        .dropdown {
            display: none;
            position: absolute;
            top: calc(100% + 4px);
            left: 0;
            right: 0;
            background: var(--nc-bg);
            border: 1px solid var(--nc-border);
            border-radius: var(--nc-radius-md, 8px);
            box-shadow: var(--nc-shadow-lg);
            overflow: hidden;
            z-index: 500;
        }

        .option {
            padding: var(--nc-spacing-sm) var(--nc-spacing-md);
            cursor: pointer;
            font-size: var(--nc-font-size-sm);
            color: var(--nc-text);
            text-align: left;
            transition: background var(--nc-transition-fast);
        }

        .option:hover,
        .option.active { background: var(--nc-bg-secondary); }

        .option mark {
            background: none;
            color: var(--nc-primary);
            font-weight: var(--nc-font-weight-semibold);
        }
    `;

    template() {
        const name        = this.getAttribute('name') || '';
        const initValue   = this.getAttribute('value') || '';
        const placeholder = this.getAttribute('placeholder') || '';

        return html`            <div class="input-wrap">
                <input
                    ref="inputEl"
                    type="text"
                    name="${name}"
                    value="${initValue}"
                    placeholder="${placeholder}"
                    autocomplete="off"
                    role="combobox"
                    aria-expanded="false"
                    aria-autocomplete="list"
                    aria-haspopup="listbox"
                />
            </div>
            <div ref="dropdownEl" class="dropdown" role="listbox"></div>
        `;
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────
    onMount() {
        this.inputValue.value = this.getAttribute('value') || '';
        // Apply initial disabled state imperatively (avoids ts-lit-plugin boolean binding error).
        this.inputEl.toggleAttribute('disabled', this.hasAttribute('disabled'));

        // Effect 1: re-render dropdown items when open/query/options change.
        // _filtered() reads inputValue.value + dynamicOptions.value → auto-tracked.
        this.effect(() => {
            const isOpen  = this.open.value;
            const results = isOpen ? this._filtered() : [];
            this._renderDropdown(results);
        });

        // Effect 2: update the active-item highlight without a full re-render.
        this.effect(() => {
            this._updateActiveHighlight(this.activeIndex.value);
        });

        // Dynamic options API — external code pushes new options via custom event.
        this.on(this, 'nc-autocomplete-options', (e: CustomEvent<string[]>) => {
            this.dynamicOptions.value = e.detail || [];
        });
    }

    events() {
        this.on(this.inputEl, 'input', () => {
            this.inputValue.value  = this.inputEl.value;
            this.activeIndex.value = -1;
            this.open.value        = true;
            this.emit('input', { value: this.inputEl.value, name: this.getAttribute('name') || '' });
        });

        this.on(this.inputEl, 'focus', () => {
            this.open.value = true;
        });

        this.on(this.inputEl, 'blur', () => {
            // Delay so a mousedown on a dropdown option fires before the dropdown closes.
            setTimeout(() => { this.open.value = false; }, 150);
        });

        this.on(this.inputEl, 'keydown', (e: KeyboardEvent) => {
            const results = this._filtered();
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.activeIndex.value = Math.min(this.activeIndex.value + 1, results.length - 1);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.activeIndex.value = Math.max(this.activeIndex.value - 1, -1);
            } else if (e.key === 'Enter' && this.activeIndex.value >= 0) {
                e.preventDefault();
                this._selectOption(results[this.activeIndex.value]);
            } else if (e.key === 'Escape') {
                this.open.value = false;
            }
        });

        this.on(this.dropdownEl, 'mousedown', (e: MouseEvent) => {
            const opt = (e.target as HTMLElement).closest<HTMLElement>('[data-value]');
            if (opt) {
                e.preventDefault();
                this._selectOption(opt.dataset.value!);
            }
        });
    }

    // ── Attribute changes ─────────────────────────────────────────────────────
    protected _handleAttributeUpdate(name: string, val: string | null) {
        if (name === 'value') {
            this.inputValue.value = val || '';
            if (this.inputEl) this.inputEl.value = val || '';
        } else if (name === 'disabled') {
            if (this.inputEl) this.inputEl.toggleAttribute('disabled', val !== null);
        }
        // size/variant are CSS-driven via :host([attr]) — no JS update needed.
    }

    // ── Private DOM updaters ──────────────────────────────────────────────────
    private _selectOption(value: string) {
        this.inputValue.value  = value;
        this.open.value        = false;
        this.activeIndex.value = -1;
        this.setAttribute('value', value);
        this.inputEl.value = value;
        this.emit('select', { value, name: this.getAttribute('name') || '' });
        this.emit('change', { value, name: this.getAttribute('name') || '' });
    }

    private _renderDropdown(results: string[]) {
        if (!results.length) {
            this.dropdownEl.style.display = 'none';
            this.dropdownEl.innerHTML = '';
            this.inputEl?.setAttribute('aria-expanded', 'false');
            return;
        }

        const query   = this.inputValue.value;
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        this.dropdownEl.innerHTML = results.map(opt => {
            const safeOpt = escapeHtml(opt);
            const hl = escaped
                ? safeOpt.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>')
                : safeOpt;
            return `<div class="option" role="option" data-value="${escapeHtml(opt)}" aria-selected="false">${hl}</div>`;
        }).join('');

        this.dropdownEl.style.display = 'block';
        this.inputEl?.setAttribute('aria-expanded', 'true');

        // Apply active highlight immediately after fresh HTML is stamped.
        this._updateActiveHighlight(this.activeIndex.value);
    }

    private _updateActiveHighlight(activeIdx: number) {
        this.$$<HTMLElement>('.option').forEach((opt, i) => {
            opt.classList.toggle('active', i === activeIdx);
            opt.setAttribute('aria-selected', String(i === activeIdx));
        });
    }
}

if (!customElements.get('nc-autocomplete')) customElements.define('nc-autocomplete', NcAutocomplete);


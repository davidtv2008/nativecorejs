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
import { Component, defineComponent } from '@core/component.js';
import { html, trusted, escapeHtml } from '@core-utils/templates.js';
export class NcAutocomplete extends Component {
    static useShadowDOM = true;
    static get observedAttributes() {
        return ['name', 'value', 'placeholder', 'options', 'min-chars', 'max-results', 'disabled', 'size', 'variant'];
    }
    _inputValue = '';
    _dynamicOptions = [];
    _activeIndex = -1;
    _open = false;
    constructor() { super(); }
    _getOptions() {
        if (this._dynamicOptions.length)
            return this._dynamicOptions;
        const raw = this.getAttribute('options') || '';
        if (!raw)
            return [];
        try {
            return JSON.parse(raw);
        }
        catch {
            return raw.split(',').map(s => s.trim()).filter(Boolean);
        }
    }
    _filtered() {
        const query = this._inputValue.trim().toLowerCase();
        const minChars = Number(this.getAttribute('min-chars') ?? 1);
        const max = Number(this.getAttribute('max-results') ?? 8);
        if (query.length < minChars)
            return [];
        return this._getOptions()
            .filter(o => o.toLowerCase().includes(query))
            .slice(0, max);
    }
    template() {
        if (!this._mounted) {
            this._inputValue = this.getAttribute('value') || '';
        }
        const disabled = this.hasAttribute('disabled');
        const placeholder = this.getAttribute('placeholder') || '';
        const name = this.getAttribute('name') || '';
        const results = this._open ? this._filtered() : [];
        return html `
            <style>
                :host { display: block; position: relative; width: 100%; font-family: var(--nc-font-family); }

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
                    opacity: ${disabled ? '0.5' : '1'};
                    cursor: ${disabled ? 'not-allowed' : 'auto'};
                }

                :host([size="sm"]) input { font-size: var(--nc-font-size-sm); padding: var(--nc-spacing-xs) var(--nc-spacing-sm); }
                :host([size="lg"]) input { font-size: var(--nc-font-size-lg); padding: var(--nc-spacing-md) var(--nc-spacing-lg); }
                :host([variant="filled"]) input { background: var(--nc-bg-tertiary); border-color: transparent; }

                input:focus { border-color: var(--nc-input-focus-border); box-shadow: 0 0 0 3px rgba(16,185,129,.15); }
                input::placeholder { color: var(--nc-text-muted); }

                .dropdown {
                    position: absolute;
                    top: calc(100% + 4px);
                    left: 0; right: 0;
                    background: var(--nc-bg);
                    border: 1px solid var(--nc-border);
                    border-radius: var(--nc-radius-md, 8px);
                    box-shadow: var(--nc-shadow-lg);
                    overflow: hidden;
                    z-index: 500;
                    display: ${results.length ? 'block' : 'none'};
                }

                .option {
                    padding: var(--nc-spacing-sm) var(--nc-spacing-md);
                    cursor: pointer;
                    font-size: var(--nc-font-size-sm);
                    color: var(--nc-text);
                    transition: background var(--nc-transition-fast);
                }

                .option:hover,
                .option.active { background: var(--nc-bg-secondary); }

                .option mark {
                    background: none;
                    color: var(--nc-primary);
                    font-weight: var(--nc-font-weight-semibold);
                }
            </style>
            <div class="input-wrap">
                <input
                    type="text"
                    name="${name}"
                    value="${this._inputValue}"
                    placeholder="${placeholder}"
                    ${disabled ? 'disabled' : ''}
                    autocomplete="off"
                    role="combobox"
                    aria-expanded="${results.length > 0}"
                    aria-autocomplete="list"
                    aria-haspopup="listbox"
                />
            </div>
            <div class="dropdown" role="listbox">
                ${trusted(results.map((opt, i) => {
            // Escape the option text first, then safely insert <mark> around the match.
            // This ensures user-typed input cannot inject HTML via the highlight pattern.
            const safeOpt = escapeHtml(opt);
            const escapedQuery = this._inputValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const hl = escapedQuery
                ? safeOpt.replace(new RegExp(`(${escapedQuery})`, 'gi'), '<mark>$1</mark>')
                : safeOpt;
            return `<div class="option${i === this._activeIndex ? ' active' : ''}" role="option" data-value="${escapeHtml(opt)}" aria-selected="${i === this._activeIndex}">${hl}</div>`;
        }).join(''))}
            </div>
        `;
    }
    onMount() {
        this._bindEvents();
        // Dynamic options API
        this.addEventListener('nc-autocomplete-options', (e) => {
            this._dynamicOptions = e.detail || [];
            if (this._open) {
                this.render();
                this._bindEvents();
            }
        });
    }
    _bindEvents() {
        const input = this.$('input');
        const dropdown = this.$('.dropdown');
        input.addEventListener('input', () => {
            this._inputValue = input.value;
            this._activeIndex = -1;
            this._open = true;
            this._refreshDropdown();
            this.dispatchEvent(new CustomEvent('input', {
                bubbles: true, composed: true,
                detail: { value: input.value, name: this.getAttribute('name') || '' }
            }));
        });
        input.addEventListener('focus', () => {
            this._open = true;
            this._refreshDropdown();
        });
        input.addEventListener('blur', () => {
            // Delay so click on option fires first
            setTimeout(() => {
                this._open = false;
                this._refreshDropdown();
            }, 150);
        });
        input.addEventListener('keydown', (e) => {
            const results = this._filtered();
            if (!results.length)
                return;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this._activeIndex = Math.min(this._activeIndex + 1, results.length - 1);
                this._refreshActive();
            }
            else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this._activeIndex = Math.max(this._activeIndex - 1, -1);
                this._refreshActive();
            }
            else if (e.key === 'Enter' && this._activeIndex >= 0) {
                e.preventDefault();
                this._selectOption(results[this._activeIndex]);
            }
            else if (e.key === 'Escape') {
                this._open = false;
                this._refreshDropdown();
            }
        });
        dropdown.addEventListener('mousedown', (e) => {
            const opt = e.target.closest('[data-value]');
            if (opt) {
                e.preventDefault();
                this._selectOption(opt.dataset.value);
            }
        });
    }
    _selectOption(value) {
        this._inputValue = value;
        this._open = false;
        this._activeIndex = -1;
        this.setAttribute('value', value);
        const input = this.$('input');
        if (input)
            input.value = value;
        this._refreshDropdown();
        this.dispatchEvent(new CustomEvent('select', {
            bubbles: true, composed: true,
            detail: { value, name: this.getAttribute('name') || '' }
        }));
        this.dispatchEvent(new CustomEvent('change', {
            bubbles: true, composed: true,
            detail: { value, name: this.getAttribute('name') || '' }
        }));
    }
    _refreshDropdown() {
        const dropdown = this.$('.dropdown');
        if (!dropdown)
            return;
        const results = this._open ? this._filtered() : [];
        if (!results.length) {
            dropdown.style.display = 'none';
            return;
        }
        dropdown.style.display = 'block';
        dropdown.innerHTML = results.map((opt, i) => {
            const safeOpt = escapeHtml(opt);
            const escaped = this._inputValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const hl = escaped ? safeOpt.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>') : safeOpt;
            return `<div class="option${i === this._activeIndex ? ' active' : ''}" role="option" data-value="${escapeHtml(opt)}" aria-selected="${i === this._activeIndex}">${hl}</div>`;
        }).join('');
        const input = this.$('input');
        if (input)
            input.setAttribute('aria-expanded', String(results.length > 0));
    }
    _refreshActive() {
        this.$$('.option').forEach((opt, i) => {
            opt.classList.toggle('active', i === this._activeIndex);
            opt.setAttribute('aria-selected', String(i === this._activeIndex));
        });
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue)
            return;
        if (name === 'value' && this._mounted) {
            this._inputValue = newValue || '';
            const input = this.$('input');
            if (input)
                input.value = this._inputValue;
            return;
        }
        if (this._mounted) {
            this.render();
            this._bindEvents();
        }
    }
}
defineComponent('nc-autocomplete', NcAutocomplete);

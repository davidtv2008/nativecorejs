/**
 * NcRating Component
 *
 * NativeCore Framework Core Component
 *
 * Attributes:
 *   - name: string — form field name
 *   - value: number — current rating (0 = none)
 *   - max: number — total stars (default: 5)
 *   - readonly: boolean — display only, no interaction
 *   - disabled: boolean — disabled state
 *   - size: 'sm' | 'md' | 'lg' (default: 'md')
 *   - variant: 'star' | 'heart' | 'circle' (default: 'star')
 *   - allow-clear: boolean — clicking the active star clears the value
 *
 * Events:
 *   - change: CustomEvent<{ value: number; name: string }>
 *
 * Usage:
 *   <nc-rating name="score" value="3"></nc-rating>
 *   <nc-rating name="score" value="4" max="10" size="lg" allow-clear></nc-rating>
 *   <nc-rating name="mood" variant="heart" value="2"></nc-rating>
 */

import { CoreComponent } from '@core/component.js';
import { css } from '@core-utils/templates.js';

const ICONS: Record<string, { filled: string; empty: string }> = {
    star: {
        filled: `<svg class="icon-filled" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,
        empty:  `<svg class="icon-empty"  xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="1em" height="1em"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,
    },
    heart: {
        filled: `<svg class="icon-filled" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`,
        empty:  `<svg class="icon-empty"  xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="1em" height="1em"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`,
    },
    circle: {
        filled: `<svg class="icon-filled" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><circle cx="12" cy="12" r="10"/></svg>`,
        empty:  `<svg class="icon-empty"  xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="1em" height="1em"><circle cx="12" cy="12" r="10"/></svg>`,
    },
};

export class NcRating extends CoreComponent {
    static useShadowDOM = true;
    static observedAttributes = ['name', 'max', 'readonly', 'disabled', 'size', 'variant', 'allow-clear'];
    static attributeOptions = { variant: ['star', 'heart', 'circle'], size: ['sm', 'md', 'lg'] };
    static attributeOrder   = ['name', 'value', 'max', 'variant', 'size', 'allow-clear', 'readonly', 'disabled'];

    // -- Refs -----------------------------------------------------------------
    declare itemsEl:      HTMLDivElement;
    declare hiddenInputEl: HTMLInputElement;

    private _value   = 0;
    private _hovered = 0;

    private _getMax()   { return Number(this.getAttribute('max') || 5); }
    private _getValue() { return this._value; }

    static styles = css`
        :host { display: inline-flex; align-items: center; font-family: var(--nc-font-family); }
        :host,
        :host([size="md"]) { font-size: 1.5rem; }
        :host([size="sm"]) { font-size: 1rem; }
        :host([size="lg"]) { font-size: 2rem; }
        .items { display: inline-flex; align-items: center; gap: 2px; }
        .item {
            display: inline-flex; align-items: center; justify-content: center;
            cursor: pointer; color: var(--nc-gray-300);
            transition: color var(--nc-transition-fast), transform var(--nc-transition-fast);
            line-height: 1;
        }
        :host([readonly]) .item,
        :host([disabled]) .item { cursor: default; pointer-events: none; }
        :host([disabled]) .item { opacity: 0.4; }
        .item .icon-filled { display: none; }
        .item .icon-empty  { display: block; }
        .item.filled .icon-filled { display: block; }
        .item.filled .icon-empty  { display: none; }
        .item.filled, .item.hovered { color: var(--nc-warning, #f59e0b); }
        .item.hovered { transform: scale(1.2); }
        .item.preview-filled .icon-filled { display: block; }
        .item.preview-filled .icon-empty  { display: none; }
        .item.preview-empty  .icon-filled { display: none; }
        .item.preview-empty  .icon-empty  { display: block; }
        .item:focus-visible { outline: 2px solid var(--nc-primary); outline-offset: 2px; border-radius: 2px; }
    `;

    template() {
        return `            <div ref="itemsEl" class="items"></div>
            <input ref="hiddenInputEl" type="hidden" />
        `;
    }

    onMount() {
        this._value = Number(this.getAttribute('value') || 0);
        this._buildItems();
        this._bindEvents();
    }

    protected _handleAttributeUpdate(name: string, _val: string | null) {
        this._buildItems();
        if (name === 'readonly' || name === 'disabled') this._bindEvents();
    }

    private _buildItems() {
        const max       = this._getMax();
        const value     = this._getValue();
        const variant   = this.getAttribute('variant') || 'star';
        const icon      = ICONS[variant] ?? ICONS.star;
        const readonly  = this.hasAttribute('readonly');
        const disabled  = this.hasAttribute('disabled');
        const interactive = !readonly && !disabled;

        this.itemsEl.setAttribute('role', interactive ? 'radiogroup' : 'img');
        this.itemsEl.setAttribute('aria-label', `Rating: ${value} of ${max}`);

        this.itemsEl.innerHTML = Array.from({ length: max }, (_, i) => {
            const pos    = i + 1;
            const filled = pos <= value;
            return `<span
                class="item${filled ? ' filled' : ''}"
                data-pos="${pos}"
                role="${interactive ? 'radio' : 'presentation'}"
                aria-checked="${filled}"
                aria-label="${pos} of ${max}"
                tabindex="${interactive ? '0' : '-1'}"
            >${icon.filled}${icon.empty}</span>`;
        }).join('');

        this.hiddenInputEl.name  = this.getAttribute('name') || '';
        this.hiddenInputEl.value = String(value);
    }

    private _bindEvents() {
        if (this.hasAttribute('readonly') || this.hasAttribute('disabled')) return;
        const container = this.itemsEl;

        container.addEventListener('mouseover', (e) => {
            const item = (e.target as HTMLElement).closest<HTMLElement>('.item');
            if (!item) return;
            this._hovered = Number(item.dataset.pos);
            this._applyState();
        });
        container.addEventListener('mouseleave', () => {
            this._hovered = 0;
            this._applyState();
        });
        container.addEventListener('click', (e) => {
            const item = (e.target as HTMLElement).closest<HTMLElement>('.item');
            if (!item) return;
            const pos  = Number(item.dataset.pos);
            const next = this.hasAttribute('allow-clear') && pos === this._getValue() ? 0 : pos;
            this._hovered = 0;
            this._commit(next);
        });
        this.itemsEl.querySelectorAll<HTMLElement>('.item').forEach(item => {
            item.addEventListener('keydown', (e: KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.click(); }
                if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); this._commit(Math.min(this._getMax(), this._getValue() + 1)); }
                if (e.key === 'ArrowLeft'  || e.key === 'ArrowDown') { e.preventDefault(); this._commit(Math.max(0, this._getValue() - 1)); }
            });
        });
    }

    private _applyState() {
        const value   = this._getValue();
        const hovered = this._hovered;
        this.itemsEl.querySelectorAll<HTMLElement>('.item').forEach(item => {
            const pos = Number(item.dataset.pos);
            if (hovered > 0) {
                const previewFilled = pos <= hovered;
                item.classList.toggle('hovered',        previewFilled);
                item.classList.toggle('preview-filled', previewFilled);
                item.classList.toggle('preview-empty',  !previewFilled);
                item.setAttribute('aria-checked', String(pos <= value));
            } else {
                item.classList.remove('hovered', 'preview-filled', 'preview-empty');
                item.classList.toggle('filled', pos <= value);
                item.setAttribute('aria-checked', String(pos <= value));
            }
        });
    }

    private _commit(value: number) {
        this._value = value;
        this.setAttribute('value', String(value));
        this.hiddenInputEl.value = String(value);
        this.itemsEl.setAttribute('aria-label', `Rating: ${value} of ${this._getMax()}`);
        this.itemsEl.querySelectorAll<HTMLElement>('.item').forEach(item => {
            item.classList.toggle('filled', Number(item.dataset.pos) <= value);
        });
        this.emit('change', { value, name: this.getAttribute('name') || '' });
    }
}

if (!customElements.get('nc-rating')) customElements.define('nc-rating', NcRating);


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

import { Component, defineComponent } from '@core/component.js';
import { html } from '@core-utils/templates.js';

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

export class NcRating extends Component {
    static useShadowDOM = true;

    static attributeOptions = {
        variant: ['star', 'heart', 'circle'],
        size: ['sm', 'md', 'lg']
    };

    static get observedAttributes() {
        // 'value' excluded — managed via _value to prevent base-class re-render on every pick
        return ['name', 'max', 'readonly', 'disabled', 'size', 'variant', 'allow-clear'];
    }

    private _value = 0;
    private _hovered = 0;

    constructor() {
        super();
    }

    private _getMax() { return Number(this.getAttribute('max') || 5); }
    private _getValue() { return this._value; }

    template() {
        // Seed from attribute only on first mount
        if (!this._mounted) {
            this._value = Number(this.getAttribute('value') || 0);
        }
        const value = this._getValue();
        const max = this._getMax();
        const variant = this.getAttribute('variant') || 'star';
        const icon = ICONS[variant] ?? ICONS.star;
        const readonly = this.hasAttribute('readonly');
        const disabled = this.hasAttribute('disabled');
        const interactive = !readonly && !disabled;

        // Both icons are always in the DOM — visibility toggled by CSS class only.
        // This prevents _applyHover from ever replacing innerHTML, which would
        // trigger spurious mouseover events and break the saved-state display.
        const items = Array.from({ length: max }, (_, i) => {
            const pos = i + 1;
            const filled = pos <= value;
            return html`<span
                class="item${filled ? ' filled' : ''}"
                data-pos="${pos}"
                role="${interactive ? 'radio' : 'presentation'}"
                aria-checked="${filled}"
                aria-label="${pos} of ${max}"
                tabindex="${interactive ? '0' : '-1'}"
            >${icon.filled}${icon.empty}</span>`;
        }).join('');

        return `
            <style>
                :host {
                    display: inline-flex;
                    align-items: center;
                    font-family: var(--nc-font-family);
                }

                .items {
                    display: inline-flex;
                    align-items: center;
                    gap: 2px;
                }

                :host,
                :host([size="md"]) { font-size: 1.5rem; }
                :host([size="sm"]) { font-size: 1rem; }
                :host([size="lg"]) { font-size: 2rem; }

                .item {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    cursor: ${interactive ? 'pointer' : 'default'};
                    color: var(--nc-gray-300);
                    transition: color var(--nc-transition-fast), transform var(--nc-transition-fast);
                    opacity: ${disabled ? '0.4' : '1'};
                    line-height: 1;
                    pointer-events: ${interactive ? 'auto' : 'none'};
                }

                /* SVGs are siblings inside .item — show one at a time */
                .item .icon-filled { display: none; }
                .item .icon-empty  { display: block; }

                .item.filled .icon-filled { display: block; }
                .item.filled .icon-empty  { display: none; }

                /* Hover/active state */
                .item.filled,
                .item.hovered {
                    color: var(--nc-warning, #f59e0b);
                }

                .item.hovered {
                    transform: scale(1.2);
                }

                /* During hover preview, preview-filled shows filled icon */
                .item.preview-filled .icon-filled { display: block; }
                .item.preview-filled .icon-empty  { display: none; }
                .item.preview-empty  .icon-filled { display: none; }
                .item.preview-empty  .icon-empty  { display: block; }

                .item:focus-visible {
                    outline: 2px solid var(--nc-primary);
                    outline-offset: 2px;
                    border-radius: 2px;
                }
            </style>

            <div
                class="items"
                role="${interactive ? 'radiogroup' : 'img'}"
                aria-label="Rating: ${value} of ${max}"
            >${items}</div>
            <input type="hidden" name="${this.getAttribute('name') || ''}" value="${value}" />
        `;
    }

    onMount() {
        this._bindEvents();
    }

    private _bindEvents() {
        if (this.hasAttribute('readonly') || this.hasAttribute('disabled')) return;

        const container = this.$<HTMLElement>('.items')!;

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
            const pos = Number(item.dataset.pos);
            const next = this.hasAttribute('allow-clear') && pos === this._getValue() ? 0 : pos;
            this._hovered = 0;
            this._commit(next);
        });

        this.$$<HTMLElement>('.item').forEach(item => {
            item.addEventListener('keydown', (e: KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    item.click();
                }
                if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    this._commit(Math.min(this._getMax(), this._getValue() + 1));
                }
                if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    this._commit(Math.max(0, this._getValue() - 1));
                }
            });
        });
    }

    // Applies the current hover/selected state to the DOM via classes only — no innerHTML changes
    private _applyState() {
        const value = this._getValue();
        const hovered = this._hovered;

        this.$$<HTMLElement>('.item').forEach(item => {
            const pos = Number(item.dataset.pos);

            if (hovered > 0) {
                // Preview mode: override fill display with preview classes
                const previewFilled = pos <= hovered;
                item.classList.toggle('hovered', previewFilled);
                item.classList.toggle('preview-filled', previewFilled);
                item.classList.toggle('preview-empty', !previewFilled);
                item.setAttribute('aria-checked', String(pos <= value));
            } else {
                // Committed state: remove all preview classes, rely on .filled
                item.classList.remove('hovered', 'preview-filled', 'preview-empty');
                item.classList.toggle('filled', pos <= value);
                item.setAttribute('aria-checked', String(pos <= value));
            }
        });
    }

    private _commit(value: number) {
        this._value = value;
        // setAttribute is safe — 'value' is not in observedAttributes, no re-render triggered
        this.setAttribute('value', String(value));

        const hidden = this.$<HTMLInputElement>('input[type="hidden"]');
        if (hidden) hidden.value = String(value);

        const container = this.$('.items');
        if (container) container.setAttribute('aria-label', `Rating: ${value} of ${this._getMax()}`);

        // Re-sync .filled classes to match the new committed value
        this.$$<HTMLElement>('.item').forEach(item => {
            item.classList.toggle('filled', Number(item.dataset.pos) <= value);
        });

        this.dispatchEvent(new CustomEvent('change', {
            bubbles: true,
            composed: true,
            detail: { value, name: this.getAttribute('name') || '' }
        }));
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue === newValue || !this._mounted) return;
        this.render();
        this._bindEvents();
    }
}

defineComponent('nc-rating', NcRating);


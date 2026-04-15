import { Component, defineComponent } from '../core/component.js';

const ICONS: Record<string, { filled: string; empty: string }> = {
    star: {
        filled: `<svg class="icon-filled" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,
        empty: `<svg class="icon-empty" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="1em" height="1em"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`
    },
    heart: {
        filled: `<svg class="icon-filled" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`,
        empty: `<svg class="icon-empty" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="1em" height="1em"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`
    },
    circle: {
        filled: `<svg class="icon-filled" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><circle cx="12" cy="12" r="10"/></svg>`,
        empty: `<svg class="icon-empty" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="1em" height="1em"><circle cx="12" cy="12" r="10"/></svg>`
    }
};

export class NcRating extends Component {
    static useShadowDOM = true;

    static attributeOptions = {
        variant: ['star', 'heart', 'circle'],
        size: ['sm', 'md', 'lg']
    };

    static get observedAttributes() {
        return ['name', 'max', 'readonly', 'disabled', 'size', 'variant', 'allow-clear'];
    }

    private valueState = 0;
    private hovered = 0;

    private getMax() {
        return Number(this.getAttribute('max') || 5);
    }

    private getValue() {
        return this.valueState;
    }

    template() {
        if (!this._mounted) {
            this.valueState = Number(this.getAttribute('value') || 0);
        }
        const value = this.getValue();
        const max = this.getMax();
        const variant = this.getAttribute('variant') || 'star';
        const icon = ICONS[variant] ?? ICONS.star;
        const readonly = this.hasAttribute('readonly');
        const disabled = this.hasAttribute('disabled');
        const interactive = !readonly && !disabled;

        const items = Array.from({ length: max }, (_, index) => {
            const position = index + 1;
            const filled = position <= value;
            return `<span class="item${filled ? ' filled' : ''}" data-pos="${position}" role="${interactive ? 'radio' : 'presentation'}" aria-checked="${filled}" aria-label="${position} of ${max}" tabindex="${interactive ? '0' : '-1'}">${icon.filled}${icon.empty}</span>`;
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
                    color: var(--nc-gray-300, #d1d5db);
                    transition: color var(--nc-transition-fast, 160ms ease), transform var(--nc-transition-fast, 160ms ease);
                    opacity: ${disabled ? '0.4' : '1'};
                    line-height: 1;
                    pointer-events: ${interactive ? 'auto' : 'none'};
                }
                .item .icon-filled { display: none; }
                .item .icon-empty { display: block; }
                .item.filled .icon-filled { display: block; }
                .item.filled .icon-empty { display: none; }
                .item.filled,
                .item.hovered { color: var(--nc-warning, #f59e0b); }
                .item.hovered { transform: scale(1.2); }
                .item.preview-filled .icon-filled { display: block; }
                .item.preview-filled .icon-empty { display: none; }
                .item.preview-empty .icon-filled { display: none; }
                .item.preview-empty .icon-empty { display: block; }
                .item:focus-visible {
                    outline: 2px solid var(--nc-primary, #10b981);
                    outline-offset: 2px;
                    border-radius: 2px;
                }
            </style>
            <div class="items" role="${interactive ? 'radiogroup' : 'img'}" aria-label="Rating: ${value} of ${max}">${items}</div>
            <input type="hidden" name="${this.getAttribute('name') || ''}" value="${value}" />
        `;
    }

    onMount() {
        this.bindEvents();
    }

    private bindEvents() {
        if (this.hasAttribute('readonly') || this.hasAttribute('disabled')) return;

        const container = this.$<HTMLElement>('.items');
        if (!container) return;

        container.addEventListener('mouseover', event => {
            const item = (event.target as HTMLElement).closest<HTMLElement>('.item');
            if (!item) return;
            this.hovered = Number(item.dataset.pos);
            this.applyState();
        });

        container.addEventListener('mouseleave', () => {
            this.hovered = 0;
            this.applyState();
        });

        container.addEventListener('click', event => {
            const item = (event.target as HTMLElement).closest<HTMLElement>('.item');
            if (!item) return;
            const position = Number(item.dataset.pos);
            const next = this.hasAttribute('allow-clear') && position === this.getValue() ? 0 : position;
            this.hovered = 0;
            this.commit(next);
        });

        this.$$<HTMLElement>('.item').forEach(item => {
            item.addEventListener('keydown', (event: KeyboardEvent) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    item.click();
                }
                if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
                    event.preventDefault();
                    this.commit(Math.min(this.getMax(), this.getValue() + 1));
                }
                if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
                    event.preventDefault();
                    this.commit(Math.max(0, this.getValue() - 1));
                }
            });
        });
    }

    private applyState() {
        const value = this.getValue();
        const hovered = this.hovered;

        this.$$<HTMLElement>('.item').forEach(item => {
            const position = Number(item.dataset.pos);

            if (hovered > 0) {
                const previewFilled = position <= hovered;
                item.classList.toggle('hovered', previewFilled);
                item.classList.toggle('preview-filled', previewFilled);
                item.classList.toggle('preview-empty', !previewFilled);
                item.setAttribute('aria-checked', String(position <= value));
            } else {
                item.classList.remove('hovered', 'preview-filled', 'preview-empty');
                item.classList.toggle('filled', position <= value);
                item.setAttribute('aria-checked', String(position <= value));
            }
        });
    }

    private commit(value: number) {
        this.valueState = value;
        this.setAttribute('value', String(value));

        const hidden = this.$<HTMLInputElement>('input[type="hidden"]');
        if (hidden) hidden.value = String(value);

        const container = this.$('.items');
        if (container) container.setAttribute('aria-label', `Rating: ${value} of ${this.getMax()}`);

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
        this.bindEvents();
    }
}

defineComponent('nc-rating', NcRating);

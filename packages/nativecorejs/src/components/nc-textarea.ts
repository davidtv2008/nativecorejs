import { Component, defineComponent } from '../../.nativecore/core/component.js';
import { html, raw } from '../../.nativecore/utils/templates.js';

export class NcTextarea extends Component {
    static useShadowDOM = true;

    static attributeOptions = {
        variant: ['default', 'filled'],
        size: ['sm', 'md', 'lg']
    };

    static get observedAttributes() {
        return ['name', 'value', 'placeholder', 'rows', 'disabled', 'readonly', 'maxlength', 'autoresize', 'size', 'variant'];
    }

    template() {
        const value = this.getAttribute('value') || '';
        const placeholder = this.getAttribute('placeholder') || '';
        const rows = this.getAttribute('rows') || '4';
        const disabled = this.hasAttribute('disabled');
        const readonly = this.hasAttribute('readonly');
        const maxlength = this.getAttribute('maxlength');
        const autoresize = this.hasAttribute('autoresize');
        const charCount = value.length;

        return html`
            <style>
                :host {
                    display: block;
                    font-family: var(--nc-font-family);
                    width: 100%;
                }
                .wrap {
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    gap: var(--nc-spacing-xs, 0.25rem);
                }
                textarea {
                    width: 100%;
                    box-sizing: border-box;
                    padding: var(--nc-spacing-sm, 0.5rem) var(--nc-spacing-md, 0.75rem);
                    background: var(--nc-bg, #ffffff);
                    border: var(--nc-input-border, 1px solid #d1d5db);
                    border-radius: var(--nc-input-radius, 0.5rem);
                    color: var(--nc-text, #111827);
                    font-size: var(--nc-font-size-base, 1rem);
                    font-family: var(--nc-font-family);
                    line-height: var(--nc-line-height-normal, 1.5);
                    resize: ${autoresize ? 'none' : 'vertical'};
                    transition: border-color var(--nc-transition-fast, 160ms ease), box-shadow var(--nc-transition-fast, 160ms ease);
                    outline: none;
                    min-height: 80px;
                    opacity: ${disabled ? '0.5' : '1'};
                    cursor: ${disabled ? 'not-allowed' : 'auto'};
                }
                :host([size="sm"]) textarea {
                    padding: var(--nc-spacing-xs, 0.25rem) var(--nc-spacing-sm, 0.5rem);
                    font-size: var(--nc-font-size-sm, 0.875rem);
                }
                :host([size="lg"]) textarea {
                    padding: var(--nc-spacing-md, 1rem) var(--nc-spacing-lg, 1.5rem);
                    font-size: var(--nc-font-size-lg, 1.125rem);
                }
                :host([variant="filled"]) textarea {
                    background: var(--nc-bg-tertiary, #f3f4f6);
                    border-color: transparent;
                }
                :host([variant="filled"]) textarea:hover:not(:disabled) {
                    background: var(--nc-bg-secondary, #f8fafc);
                }
                textarea:hover:not(:disabled) {
                    border-color: var(--nc-input-focus-border, #10b981);
                }
                textarea:focus {
                    border-color: var(--nc-input-focus-border, #10b981);
                    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
                }
                textarea::placeholder { color: var(--nc-text-muted, #6b7280); }
                .counter {
                    align-self: flex-end;
                    font-size: var(--nc-font-size-xs, 0.75rem);
                    color: var(--nc-text-muted, #6b7280);
                    line-height: 1;
                }
                .counter.over {
                    color: var(--nc-danger, #ef4444);
                    font-weight: var(--nc-font-weight-semibold, 600);
                }
            </style>

            <div class="wrap">
                <textarea
                    rows="${rows}"
                    ${raw(maxlength ? `maxlength="${maxlength}"` : '')}
                    ${disabled ? 'disabled' : ''}
                    ${readonly ? 'readonly' : ''}
                    placeholder="${placeholder}"
                    name="${this.getAttribute('name') || ''}"
                    aria-multiline="true"
                >${value}</textarea>
                ${raw(maxlength ? `<span class="counter${charCount > Number(maxlength) ? ' over' : ''}">${charCount} / ${maxlength}</span>` : '')}
            </div>
        `;
    }

    onMount() {
        const textarea = this.shadowRoot?.querySelector<HTMLTextAreaElement>('textarea');
        if (textarea && this.hasAttribute('autoresize')) {
            this.autoResize(textarea);
        }

        // Use shadowRoot delegation — survives re-renders, no listener leak
        this.on('input', (event: Event) => {
            const el = event.target as HTMLTextAreaElement;
            if (el.tagName !== 'TEXTAREA') return;
            if (this.hasAttribute('autoresize')) this.autoResize(el);
            this.updateCounter(el.value);
            this.emitEvent('input', { value: el.value, name: this.getAttribute('name') || '' });
        });

        this.on('change', (event: Event) => {
            const el = event.target as HTMLTextAreaElement;
            if (el.tagName !== 'TEXTAREA') return;
            this.setAttribute('value', el.value);
            this.emitEvent('change', { value: el.value, name: this.getAttribute('name') || '' });
        });
    }

    private autoResize(textarea: HTMLTextAreaElement) {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
    }

    private updateCounter(value: string) {
        const maxlength = this.getAttribute('maxlength');
        if (!maxlength) return;
        const counter = this.shadowRoot?.querySelector('.counter');
        if (!counter) return;
        const count = value.length;
        const max = Number(maxlength);
        counter.textContent = `${count} / ${maxlength}`;
        counter.classList.toggle('over', count > max);
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue === newValue) return;
        if (name === 'value' && this._mounted) {
            const textarea = this.shadowRoot?.querySelector<HTMLTextAreaElement>('textarea');
            if (textarea) {
                textarea.value = newValue || '';
                this.updateCounter(textarea.value);
                if (this.hasAttribute('autoresize')) this.autoResize(textarea);
            }
            return;
        }
        if (this._mounted) {
            this.render();
        }
    }
}

defineComponent('nc-textarea', NcTextarea);


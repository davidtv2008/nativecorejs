import { Component, defineComponent } from '../../.nativecore/core/component.js';
import { html, raw } from '../../.nativecore/utils/templates.js';

export class NcNumberInput extends Component {
    static useShadowDOM = true;

    static attributeOptions = {
        variant: ['default', 'filled'],
        size: ['sm', 'md', 'lg']
    };

    static get observedAttributes() {
        return ['name', 'value', 'min', 'max', 'step', 'placeholder', 'disabled', 'readonly', 'size', 'variant'];
    }

    private holdTimer: ReturnType<typeof setTimeout> | null = null;
    private holdInterval: ReturnType<typeof setInterval> | null = null;
    private _stopHold: (() => void) | null = null;

    private getNumber(attr: string, fallback: number): number {
        const value = this.getAttribute(attr);
        return value !== null && value !== '' ? Number(value) : fallback;
    }

    private getCurrentValue(): number {
        const value = this.getAttribute('value');
        return value !== null && value !== '' ? Number(value) : 0;
    }

    private clamp(value: number): number {
        const min = this.getAttribute('min');
        const max = this.getAttribute('max');
        if (min !== null && value < Number(min)) return Number(min);
        if (max !== null && value > Number(max)) return Number(max);
        return value;
    }

    template() {
        const value = this.getCurrentValue();
        const placeholder = this.getAttribute('placeholder') || '';
        const disabled = this.hasAttribute('disabled');
        const readonly = this.hasAttribute('readonly');
        const min = this.getAttribute('min');
        const max = this.getAttribute('max');
        const step = this.getNumber('step', 1);
        const atMin = min !== null && value <= Number(min);
        const atMax = max !== null && value >= Number(max);

        return html`
            <style>
                :host { display: inline-flex; font-family: var(--nc-font-family); }
                .wrap {
                    display: inline-flex;
                    align-items: stretch;
                    border: var(--nc-input-border, 1px solid #d1d5db);
                    border-radius: var(--nc-input-radius, 0.5rem);
                    overflow: hidden;
                    transition: border-color var(--nc-transition-fast, 160ms ease), box-shadow var(--nc-transition-fast, 160ms ease);
                    background: var(--nc-bg, #ffffff);
                    opacity: ${disabled ? '0.5' : '1'};
                    width: 100%;
                }
                :host([variant="filled"]) .wrap {
                    background: var(--nc-bg-tertiary, #f3f4f6);
                    border-color: transparent;
                }
                .wrap:focus-within {
                    border-color: var(--nc-input-focus-border, #10b981);
                    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
                }
                .btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    background: var(--nc-bg-secondary, #f8fafc);
                    border: none;
                    cursor: ${disabled || readonly ? 'not-allowed' : 'pointer'};
                    color: var(--nc-text-muted, #6b7280);
                    transition: background var(--nc-transition-fast, 160ms ease), color var(--nc-transition-fast, 160ms ease);
                    user-select: none;
                    -webkit-user-select: none;
                    padding: 0;
                }
                :host([size="sm"]) .btn { width: 28px; }
                :host([size="lg"]) .btn { width: 40px; }
                .btn { width: 34px; }
                .btn:hover:not(:disabled):not([aria-disabled="true"]) {
                    background: var(--nc-bg-tertiary, #f3f4f6);
                    color: var(--nc-text, #111827);
                }
                .btn:active:not(:disabled):not([aria-disabled="true"]) {
                    background: var(--nc-border, #d1d5db);
                }
                .btn[aria-disabled="true"] {
                    opacity: 0.35;
                    cursor: not-allowed;
                }
                input[type="number"] {
                    flex: 1;
                    min-width: 0;
                    border: none;
                    outline: none;
                    background: transparent;
                    color: var(--nc-text, #111827);
                    font-size: var(--nc-font-size-base, 1rem);
                    font-family: var(--nc-font-family);
                    text-align: center;
                    padding: 0;
                    cursor: ${disabled ? 'not-allowed' : 'auto'};
                    -moz-appearance: textfield;
                }
                input[type="number"]::-webkit-outer-spin-button,
                input[type="number"]::-webkit-inner-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
                input[type="number"]::placeholder { color: var(--nc-text-muted, #6b7280); }
                :host([size="sm"]) input { font-size: var(--nc-font-size-sm, 0.875rem); padding: var(--nc-spacing-xs, 0.25rem) 0; }
                :host([size="md"]) input,
                :host input { padding: var(--nc-spacing-sm, 0.5rem) 0; }
                :host([size="lg"]) input { font-size: var(--nc-font-size-lg, 1.125rem); padding: var(--nc-spacing-md, 1rem) 0; }
            </style>

            <div class="wrap">
                <button class="btn btn-dec" type="button" aria-label="Decrease" aria-disabled="${atMin || disabled || readonly}" tabindex="${disabled ? '-1' : '0'}">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                </button>
                <input type="number" value="${value}" ${raw(min !== null ? `min="${min}"` : '')} ${raw(max !== null ? `max="${max}"` : '')} step="${step}" ${disabled ? 'disabled' : ''} ${readonly ? 'readonly' : ''} placeholder="${placeholder}" name="${this.getAttribute('name') || ''}" aria-label="${this.getAttribute('name') || 'number'}" />
                <button class="btn btn-inc" type="button" aria-label="Increase" aria-disabled="${atMax || disabled || readonly}" tabindex="${disabled ? '-1' : '0'}">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                </button>
            </div>
        `;
    }

    onMount() {
        // Use this.on() for delegation — auto-cleaned on unmount, no listener accumulation
        this.on('input', (event: Event) => {
            const el = event.target as HTMLInputElement;
            if (el.type !== 'number') return;
            const value = this.clamp(Number(el.value));
            this.updateButtons(value);
            this.emitEvent('input', { value, name: this.getAttribute('name') || '' });
        });

        this.on('change', (event: Event) => {
            const el = event.target as HTMLInputElement;
            if (el.type !== 'number') return;
            const value = this.clamp(Number(el.value));
            el.value = String(value);
            this.setAttribute('value', String(value));
            this.updateButtons(value);
            this.emitEvent('change', { value, name: this.getAttribute('name') || '' });
        });

        this.on('click', (event: Event) => {
            const btn = (event.target as HTMLElement).closest<HTMLButtonElement>('.btn-dec, .btn-inc');
            if (!btn) return;
            if (btn.getAttribute('aria-disabled') === 'true') return;
            this.step(btn.classList.contains('btn-dec') ? -1 : 1);
        });

        this.on('mousedown', (event: MouseEvent) => {
            const btn = (event.target as HTMLElement).closest<HTMLButtonElement>('.btn-dec, .btn-inc');
            if (!btn || event.button !== 0 || btn.getAttribute('aria-disabled') === 'true') return;
            const direction: 1 | -1 = btn.classList.contains('btn-dec') ? -1 : 1;
            this.holdTimer = setTimeout(() => {
                this.holdInterval = setInterval(() => this.step(direction), 80);
            }, 400);
        });

        const stopHold = () => {
            if (this.holdTimer) { clearTimeout(this.holdTimer); this.holdTimer = null; }
            if (this.holdInterval) { clearInterval(this.holdInterval); this.holdInterval = null; }
        };
        if (this._stopHold) document.removeEventListener('mouseup', this._stopHold);
        this._stopHold = stopHold;
        document.addEventListener('mouseup', stopHold);

        this.on('keydown', (event: KeyboardEvent) => {
            const el = event.target as HTMLElement;
            if (!el.matches('input[type="number"]')) return;
            if (event.key === 'ArrowUp') { event.preventDefault(); this.step(1); }
            if (event.key === 'ArrowDown') { event.preventDefault(); this.step(-1); }
        });
    }

    private step(direction: 1 | -1) {
        if (this.hasAttribute('disabled') || this.hasAttribute('readonly')) return;
        const step = this.getNumber('step', 1);
        const decimals = step.toString().split('.')[1]?.length ?? 0;
        const next = this.clamp(parseFloat((this.getCurrentValue() + direction * step).toFixed(decimals)));
        this.setValue(next);
    }

    private setValue(value: number) {
        const input = this.shadowRoot?.querySelector<HTMLInputElement>('input[type="number"]');
        if (input) input.value = String(value);
        this.setAttribute('value', String(value));
        this.updateButtons(value);
        this.emitEvent('change', { value, name: this.getAttribute('name') || '' });
    }

    private updateButtons(value: number) {
        const shadowRoot = this.shadowRoot;
        if (!shadowRoot) return;
        const min = this.getAttribute('min');
        const max = this.getAttribute('max');
        const decreaseButton = shadowRoot.querySelector<HTMLButtonElement>('.btn-dec');
        const increaseButton = shadowRoot.querySelector<HTMLButtonElement>('.btn-inc');
        if (decreaseButton) decreaseButton.setAttribute('aria-disabled', String(min !== null && value <= Number(min)));
        if (increaseButton) increaseButton.setAttribute('aria-disabled', String(max !== null && value >= Number(max)));
    }

    onUnmount() {
        if (this.holdTimer) clearTimeout(this.holdTimer);
        if (this.holdInterval) clearInterval(this.holdInterval);
        if (this._stopHold) {
            document.removeEventListener('mouseup', this._stopHold);
            this._stopHold = null;
        }
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue === newValue) return;
        if (name === 'value' && this._mounted) {
            const input = this.shadowRoot?.querySelector<HTMLInputElement>('input[type="number"]');
            if (input) input.value = newValue || '0';
            this.updateButtons(Number(newValue || 0));
            return;
        }
        if (this._mounted) {
            this.render();
        }
    }
}

defineComponent('nc-number-input', NcNumberInput);


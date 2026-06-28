/**
 * NcRadio Component
 *
 * NativeCore Framework Core Component
 *
 * Attributes:
 *   - label: string â€” text label shown next to the radio
 *   - name: string â€” radio group name (required for grouping)
 *   - value: string â€” value submitted with a form
 *   - checked: boolean â€” selected state
 *   - disabled: boolean â€” disabled state
 *   - size: 'sm' | 'md' | 'lg' (default: 'md')
 *   - variant: 'primary' | 'success' | 'danger' (default: 'primary')
 *
 * Events:
 *   - change: CustomEvent<{ value: string; name: string }>
 *
 * Usage:
 *   <nc-radio name="plan" value="free" label="Free" checked></nc-radio>
 *   <nc-radio name="plan" value="pro" label="Pro"></nc-radio>
 *   <nc-radio name="plan" value="enterprise" label="Enterprise" disabled></nc-radio>
 */

import { CoreComponent } from '@core/component.js';
import { css } from '@core-utils/templates.js';

export class NcRadio extends CoreComponent {
    static useShadowDOM = true;
    static observedAttributes = ['label', 'name', 'value', 'checked', 'disabled', 'size', 'variant'];
    static attributeOptions = { variant: ['primary', 'success', 'danger'], size: ['sm', 'md', 'lg'] };
    static attributeOrder   = ['label', 'name', 'value', 'size', 'variant', 'checked', 'disabled'];

    // -- Refs -----------------------------------------------------------------
    declare radioInputEl: HTMLInputElement;
    declare labelEl:      HTMLSpanElement;

    static styles = css`
        :host {
            display: inline-flex; align-items: center;
            gap: var(--nc-spacing-sm); cursor: pointer;
            user-select: none; font-family: var(--nc-font-family);
        }
        :host([disabled]) { cursor: not-allowed; opacity: 0.5; }

        .radio-wrapper { display: inline-flex; align-items: center; gap: var(--nc-spacing-sm); }

        input[type="radio"] { position: absolute; opacity: 0; width: 0; height: 0; pointer-events: none; }

        /* Size tokens */
        :host { --_box: 20px; --_dot: 8px; }
        :host([size="sm"]) { --_box: 16px; --_dot: 6px; }
        :host([size="lg"]) { --_box: 24px; --_dot: 10px; }

        .ring {
            display: inline-flex; align-items: center; justify-content: center;
            flex-shrink: 0;
            width: var(--_box); height: var(--_box);
            border-radius: var(--nc-radius-full);
            border: 2px solid var(--nc-border-dark);
            background: var(--nc-bg);
            transition: all var(--nc-transition-fast);
            box-sizing: border-box;
        }
        .dot {
            width: var(--_dot); height: var(--_dot);
            border-radius: var(--nc-radius-full);
            background: var(--nc-white);
            opacity: 0; transform: scale(0);
            transition: all var(--nc-transition-fast);
        }

        /* Checked */
        :host([checked]) .ring { border-color: var(--nc-primary); background: var(--nc-primary); }
        :host([checked]) .dot  { opacity: 1; transform: scale(1); }
        :host([variant="success"][checked]) .ring { border-color: var(--nc-success); background: var(--nc-success); }
        :host([variant="danger"][checked])  .ring { border-color: var(--nc-danger);  background: var(--nc-danger); }

        /* Hover */
        :host(:not([disabled])) .ring:hover { border-color: var(--nc-primary); box-shadow: 0 0 0 3px rgba(16,185,129,.15); }
        :host([variant="success"]:not([disabled])) .ring:hover { border-color: var(--nc-success); }
        :host([variant="danger"]:not([disabled]))  .ring:hover { border-color: var(--nc-danger); box-shadow: 0 0 0 3px rgba(239,68,68,.15); }

        /* Focus ring */
        :host(:focus-visible) .ring { outline: 2px solid var(--nc-primary); outline-offset: 2px; }

        .label { font-size: var(--nc-font-size-base); color: var(--nc-text); line-height: var(--nc-line-height-normal); }
        :host([size="sm"]) .label { font-size: var(--nc-font-size-sm); }
        :host([size="lg"]) .label { font-size: var(--nc-font-size-lg); }
        [hidden] { display: none !important; }
    `;

    template() {
        return `            <label class="radio-wrapper">
                <input ref="radioInputEl" type="radio" />
                <span class="ring"><span class="dot"></span></span>
                <span ref="labelEl" class="label" hidden></span>
                <slot></slot>
            </label>
        `;
    }

    onMount() {
        if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', '0');
        this.setAttribute('role', 'radio');
        this._syncFromAttrs();

        this.on(this.root, 'click', () => {
            if (!this.hasAttribute('disabled')) this._select();
        });
        this.on(this, 'keydown', (e: KeyboardEvent) => {
            if ((e.key === ' ' || e.key === 'Enter') && !this.hasAttribute('disabled')) {
                e.preventDefault();
                this._select();
            }
        });
    }

    protected _handleAttributeUpdate(name: string, _val: string | null) {
        if (name === 'checked') {
            this.radioInputEl.checked = this.hasAttribute('checked');
            this.setAttribute('aria-checked', String(this.hasAttribute('checked')));
            return;
        }
        this._syncFromAttrs();
    }

    private _syncFromAttrs() {
        this.radioInputEl.name     = this.getAttribute('name')  || '';
        this.radioInputEl.value    = this.getAttribute('value') || '';
        this.radioInputEl.checked  = this.hasAttribute('checked');
        this.radioInputEl.disabled = this.hasAttribute('disabled');
        const label = this.getAttribute('label') || '';
        this.labelEl.textContent = label;
        this.labelEl.hidden = !label;
        this.setAttribute('aria-checked', String(this.hasAttribute('checked')));
    }

    private _select() {
        if (this.hasAttribute('checked')) return;

        const name = this.getAttribute('name');
        if (name) {
            const root = this.getRootNode() as Document | ShadowRoot;
            root.querySelectorAll<NcRadio>(`nc-radio[name="${name}"]`).forEach(sibling => {
                if (sibling !== this) {
                    sibling.removeAttribute('checked');
                    sibling.setAttribute('aria-checked', 'false');
                }
            });
        }

        this.setAttribute('checked', '');
        this.setAttribute('aria-checked', 'true');
        this.emit('change', { value: this.getAttribute('value') || '', name: this.getAttribute('name') || '' });
    }
}

if (!customElements.get('nc-radio')) customElements.define('nc-radio', NcRadio);

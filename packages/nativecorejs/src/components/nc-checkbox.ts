/**
 * NcCheckbox Component
 *
 * NativeCore Framework Core Component
 *
 * Attributes:
 *   - label: string — text label shown next to the checkbox
 *   - name: string — form field name
 *   - value: string — value submitted with a form (default: 'on')
 *   - checked: boolean — checked state
 *   - disabled: boolean — disabled state
 *   - size: 'sm' | 'md' | 'lg' (default: 'md')
 *   - variant: 'primary' | 'success' | 'danger' (default: 'primary')
 *   - indeterminate: boolean — indeterminate visual state
 *
 * Events:
 *   - change: CustomEvent<{ checked: boolean; value: string; name: string }>
 *
 * Usage:
 *   <nc-checkbox label="Accept terms" name="terms" checked></nc-checkbox>
 *   <nc-checkbox label="Disabled" disabled></nc-checkbox>
 *   <nc-checkbox label="Danger" variant="danger"></nc-checkbox>
 */

import { CoreComponent } from '../../.nativecore/core/component.js';
import { css, html } from '../../.nativecore/utils/templates.js';

export class NcCheckbox extends CoreComponent {
    static useShadowDOM = true;

    static attributeOptions = {
        variant: ['primary', 'success', 'danger'],
        size:    ['sm', 'md', 'lg'],
    };

    static observedAttributes = ['label', 'name', 'value', 'checked', 'disabled', 'size', 'variant', 'indeterminate'];
    static attributeOrder     = ['label', 'name', 'value', 'variant', 'size', 'checked', 'disabled', 'indeterminate'];
    static attributePlaceholders = { label: 'Accept terms', name: 'terms', value: 'on' };

    // -- Refs -----------------------------------------------------------------
    declare checkboxWrapper: HTMLLabelElement;
    declare nativeInput:     HTMLInputElement;
    declare boxEl:           HTMLSpanElement;
    declare labelEl:         HTMLSpanElement;
    declare checkIcon:       SVGElement;
    declare indeterminateIcon: SVGElement;

    // -- State ----------------------------------------------------------------
    private isChecked       = this.state(false);
    private isIndeterminate = this.state(false);
    private isLabelHidden   = this.state(true);
    private labelText       = this.state('');

    static styles = css`
        :host {
            display: inline-flex;
            align-items: center;
            gap: var(--nc-spacing-sm);
            cursor: pointer;
            user-select: none;
            font-family: var(--nc-font-family);
        }
        :host([disabled]) { cursor: not-allowed; opacity: 0.5; }

        .checkbox-wrapper {
            display: inline-flex;
            align-items: center;
            gap: var(--nc-spacing-sm);
        }

        /* Hidden native input — keeps form semantics */
        input[type="checkbox"] {
            position: absolute;
            opacity: 0;
            width: 0;
            height: 0;
            pointer-events: none;
        }

        .box {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            border-radius: var(--nc-radius-sm);
            border: 2px solid var(--nc-border-dark);
            background: var(--nc-bg);
            transition: all var(--nc-transition-fast);
            position: relative;
            box-sizing: border-box;
        }

        /* Size variants */
        :host([size="sm"]) .box,
        :host(:not([size])) .box {
            width: 16px;
            height: 16px;
        }

        :host([size="md"]) .box {
            width: 20px;
            height: 20px;
        }

        :host([size="lg"]) .box {
            width: 24px;
            height: 24px;
        }

        /* Default size (md) */
        .box {
            width: 20px;
            height: 20px;
        }

        /* Checked state — variant colors */
        :host([checked]) .box,
        :host([indeterminate]) .box {
            border-color: var(--nc-primary);
            background: var(--nc-primary);
        }

        :host([variant="success"][checked]) .box,
        :host([variant="success"][indeterminate]) .box {
            border-color: var(--nc-success);
            background: var(--nc-success);
        }

        :host([variant="danger"][checked]) .box,
        :host([variant="danger"][indeterminate]) .box {
            border-color: var(--nc-danger);
            background: var(--nc-danger);
        }

        /* Checkmark SVG */
        .check-icon {
            display: none;
            pointer-events: none;
        }

        :host([checked]) .check-icon {
            display: block;
        }

        /* Indeterminate dash */
        .indeterminate-icon {
            display: none;
            pointer-events: none;
        }

        :host([indeterminate]:not([checked])) .indeterminate-icon {
            display: block;
        }

        :host([indeterminate]:not([checked])) .check-icon {
            display: none;
        }

        /* Hover */
        :host(:not([disabled])) .box:hover {
            border-color: var(--nc-primary);
            box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
        }

        :host([variant="success"]:not([disabled])) .box:hover {
            border-color: var(--nc-success);
            box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
        }

        :host([variant="danger"]:not([disabled])) .box:hover {
            border-color: var(--nc-danger);
            box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
        }

        /* Focus ring */
        :host(:focus-visible) .box {
            outline: 2px solid var(--nc-primary);
            outline-offset: 2px;
        }

        /* Label */
        .label {
            font-size: var(--nc-font-size-base);
            color: var(--nc-text);
            line-height: var(--nc-line-height-normal);
        }

        :host([size="sm"]) .label {
            font-size: var(--nc-font-size-sm);
        }

        :host([size="lg"]) .label {
            font-size: var(--nc-font-size-lg);
        }
    `;

    template() {
        return html`            <label ref="checkboxWrapper" class="checkbox-wrapper">
                <input ref="nativeInput"
                    type="checkbox"
                    name=""
                    value="on"
                />
                <span ref="boxEl" class="box">
                    <svg ref="checkIcon" class="check-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="none" width="11" height="11">
                        <path d="M2 6l3 3 5-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <svg ref="indeterminateIcon" class="indeterminate-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="none" width="11" height="11">
                        <path d="M2 6h8" stroke="white" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </span>
                <span ref="labelEl" class="label" hidden></span>
                <slot></slot>
            </label>
        `;
    }

    onMount() {
        if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', '0');
        this.setAttribute('role', 'checkbox');

        // Bind label
        this.bind(this.labelText,     this.labelEl);
        this.bind(this.isLabelHidden, this.labelEl, '?hidden');

        // Sync visual state reactively
        this.effect(() => {
            const checked       = this.isChecked.value;
            const indeterminate = this.isIndeterminate.value;
            this.nativeInput.checked       = checked;
            this.nativeInput.indeterminate = indeterminate;
            this.setAttribute('aria-checked', indeterminate ? 'mixed' : String(checked));
        });

        // Events
        this.on(this.nativeInput, 'change', (e: Event) => {
            const t = e.target as HTMLInputElement;
            this._setCheckedState(t.checked);
        });

        this.on(this, 'keydown', (e: KeyboardEvent) => {
            if ((e.key === ' ' || e.key === 'Enter') && !this.hasAttribute('disabled')) {
                e.preventDefault();
                this._setCheckedState(!this.isChecked.value);
            }
        });

        this._syncFromAttrs();
    }

    private _setCheckedState(isChecked: boolean) {
        if (isChecked) {
            this.setAttribute('checked', '');
            this.removeAttribute('indeterminate');
        } else {
            this.removeAttribute('checked');
        }
        this.isChecked.value       = isChecked;
        this.isIndeterminate.value = false;
        this.emit('change', {
            checked: isChecked,
            value:   this.getAttribute('value') || 'on',
            name:    this.getAttribute('name')  || '',
        });
    }

    protected _handleAttributeUpdate(name: string, _val: string | null) {
        this._syncFromAttrs();
        if (name === 'checked' || name === 'indeterminate') {
            this.setAttribute('aria-checked',
                this.hasAttribute('indeterminate') ? 'mixed' : String(this.hasAttribute('checked'))
            );
        }
    }

    private _syncFromAttrs() {
        const label         = this.getAttribute('label') || '';
        this.isChecked.value       = this.hasAttribute('checked');
        this.isIndeterminate.value = this.hasAttribute('indeterminate');
        this.nativeInput.name      = this.getAttribute('name')  || '';
        this.nativeInput.value     = this.getAttribute('value') || 'on';
        this.nativeInput.disabled  = this.hasAttribute('disabled');
        this.labelText.value       = label;
        this.isLabelHidden.value   = !label;
    }
}

if (!customElements.get('nc-checkbox')) customElements.define('nc-checkbox', NcCheckbox);


/**
 * NcSwitch Component
 *
 * NativeCore Framework Core Component
 *
 * Attributes:
 *   - label: string â€” text label shown next to the switch
 *   - label-position: 'left' | 'right' (default: 'right')
 *   - name: string â€” form field name
 *   - value: string â€” value submitted with a form (default: 'on')
 *   - checked: boolean â€” on state
 *   - disabled: boolean â€” disabled state
 *   - size: 'sm' | 'md' | 'lg' (default: 'md')
 *   - variant: 'primary' | 'success' | 'danger' (default: 'primary')
 *
 * Events:
 *   - change: CustomEvent<{ checked: boolean; value: string; name: string }>
 *
 * Usage:
 *   <nc-switch label="Enable notifications" name="notifs"></nc-switch>
 *   <nc-switch label="Active" checked variant="success"></nc-switch>
 *   <nc-switch label="Danger mode" variant="danger" size="lg"></nc-switch>
 */

import { CoreComponent } from '@core/component.js';

export class NcSwitch extends CoreComponent {
    static useShadowDOM = true;
    static observedAttributes = ['label', 'label-position', 'name', 'value', 'checked', 'disabled', 'size', 'variant'];
    static attributeOptions = {
        variant: ['primary', 'success', 'danger'],
        size: ['sm', 'md', 'lg'],
        'label-position': ['left', 'right'],
    };
    static attributeOrder = ['label', 'label-position', 'name', 'value', 'size', 'variant', 'checked', 'disabled'];

    // -- Refs -----------------------------------------------------------------
    declare labelEl:      HTMLSpanElement;
    declare hiddenInputEl: HTMLInputElement;

    static styles = css`
        :host {
            display: inline-flex; align-items: center;
            gap: var(--nc-spacing-sm); cursor: pointer;
            user-select: none; font-family: var(--nc-font-family);
        }
        :host([disabled]) { cursor: not-allowed; opacity: 0.5; }

        .switch-wrapper { display: inline-flex; align-items: center; gap: var(--nc-spacing-sm); }

        /* Label order: track = 1, label/slot = 2 (right by default) */
        .track { order: 1; }
        .label { order: 2; }
        slot   { order: 2; }
        :host([label-position="left"]) .label { order: 0; }
        :host([label-position="left"]) slot   { order: 0; }

        input[type="hidden"] { position: absolute; opacity: 0; width: 0; height: 0; pointer-events: none; }

        /* Track */
        .track {
            display: inline-flex; align-items: center; flex-shrink: 0;
            border-radius: var(--nc-radius-full); background: var(--nc-gray-300);
            transition: background var(--nc-transition-fast);
            position: relative; box-sizing: border-box; padding: 2px;
            width: 44px; height: 24px;
        }
        :host([size="sm"]) .track { width: 32px; height: 18px; }
        :host([size="lg"]) .track { width: 56px; height: 30px; }

        /* Thumb */
        .thumb {
            border-radius: var(--nc-radius-full); background: var(--nc-white);
            box-shadow: var(--nc-shadow-sm);
            transition: transform var(--nc-transition-fast);
            transform: translateX(0); flex-shrink: 0;
            width: 20px; height: 20px;
        }
        :host([size="sm"]) .thumb { width: 14px; height: 14px; }
        :host([size="lg"]) .thumb { width: 26px; height: 26px; }

        /* Checked â€” move thumb right */
        :host([checked]:not([size])) .thumb,
        :host([size="md"][checked]) .thumb  { transform: translateX(20px); }
        :host([size="sm"][checked]) .thumb  { transform: translateX(14px); }
        :host([size="lg"][checked]) .thumb  { transform: translateX(26px); }

        /* Checked track colors */
        :host([checked]) .track { background: var(--nc-primary); }
        :host([variant="success"][checked]) .track { background: var(--nc-success); }
        :host([variant="danger"][checked])  .track { background: var(--nc-danger); }

        /* Hover glow */
        :host(:not([disabled])) .track:hover { box-shadow: 0 0 0 3px rgba(16,185,129,.15); }
        :host([variant="danger"]:not([disabled])) .track:hover { box-shadow: 0 0 0 3px rgba(239,68,68,.15); }

        /* Focus ring */
        :host(:focus-visible) .track { outline: 2px solid var(--nc-primary); outline-offset: 2px; }

        .label { font-size: var(--nc-font-size-base); color: var(--nc-text); line-height: var(--nc-line-height-normal); }
        :host([size="sm"]) .label { font-size: var(--nc-font-size-sm); }
        :host([size="lg"]) .label { font-size: var(--nc-font-size-lg); }

        [hidden] { display: none !important; }
    `;

    template() {
        return `            <input ref="hiddenInputEl" type="hidden" />
            <span class="switch-wrapper">
                <span ref="labelEl" class="label" hidden></span>
                <slot></slot>
                <span class="track"><span class="thumb"></span></span>
            </span>
        `;
    }

    onMount() {
        if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', '0');
        this.setAttribute('role', 'switch');
        this.setAttribute('aria-checked', String(this.hasAttribute('checked')));
        this._syncFromAttrs();

        this.on(this, 'click', () => {
            if (!this.hasAttribute('disabled')) this._toggle();
        });
        this.on(this, 'keydown', (e: KeyboardEvent) => {
            if ((e.key === ' ' || e.key === 'Enter') && !this.hasAttribute('disabled')) {
                e.preventDefault();
                this._toggle();
            }
        });
    }

    protected _handleAttributeUpdate(name: string, _val: string | null) {
        if (name === 'checked') {
            this.setAttribute('aria-checked', String(this.hasAttribute('checked')));
            this._syncHiddenInput();
            return;
        }
        this._syncFromAttrs();
    }

    private _syncFromAttrs() {
        const label = this.getAttribute('label') || '';
        this.labelEl.textContent = label;
        this.labelEl.hidden = !label;
        this._syncHiddenInput();
    }

    private _syncHiddenInput() {
        this.hiddenInputEl.name  = this.getAttribute('name') || '';
        this.hiddenInputEl.value = this.hasAttribute('checked') ? (this.getAttribute('value') || 'on') : '';
    }

    private _toggle() {
        if (this.hasAttribute('checked')) {
            this.removeAttribute('checked');
        } else {
            this.setAttribute('checked', '');
        }
        this.setAttribute('aria-checked', String(this.hasAttribute('checked')));
        this._syncHiddenInput();
        this.emit('change', {
            checked: this.hasAttribute('checked'),
            value:   this.getAttribute('value') || 'on',
            name:    this.getAttribute('name') || '',
        });
    }
}

if (!customElements.get('nc-switch')) customElements.define('nc-switch', NcSwitch);

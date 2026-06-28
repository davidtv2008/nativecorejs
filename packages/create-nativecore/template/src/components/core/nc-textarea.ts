/**
 * NcTextarea Component
 *
 * NativeCore Framework Core Component
 *
 * Attributes:
 *   - name: string — form field name
 *   - value: string — current value
 *   - placeholder: string — placeholder text
 *   - rows: number — visible row count (default: 4)
 *   - disabled: boolean — disabled state
 *   - readonly: boolean — read-only state
 *   - maxlength: number — character limit (shows counter when set)
 *   - autoresize: boolean — grow to fit content automatically
 *   - size: 'sm' | 'md' | 'lg' (default: 'md')
 *   - variant: 'default' | 'filled' (default: 'default')
 *
 * Events:
 *   - input: CustomEvent<{ value: string; name: string }>
 *   - change: CustomEvent<{ value: string; name: string }>
 *
 * Usage:
 *   <nc-textarea name="bio" placeholder="Tell us about yourself" rows="4"></nc-textarea>
 *   <nc-textarea name="notes" maxlength="200" autoresize></nc-textarea>
 */

import { CoreComponent } from '@core/component.js';
import { css } from '@core-utils/templates.js';

export class NcTextarea extends CoreComponent {
    static useShadowDOM = true;
    static observedAttributes = ['name', 'value', 'placeholder', 'rows', 'disabled', 'readonly', 'maxlength', 'autoresize', 'size', 'variant'];
    static attributeOptions = { variant: ['default', 'filled'], size: ['sm', 'md', 'lg'] };
    static attributeOrder   = ['name', 'value', 'placeholder', 'rows', 'maxlength', 'size', 'variant', 'autoresize', 'disabled', 'readonly'];

    // -- Refs -----------------------------------------------------------------
    declare textareaEl: HTMLTextAreaElement;
    declare counterEl:  HTMLSpanElement;

    static styles = css`
        :host { display: block; font-family: var(--nc-font-family); width: 100%; }
        .wrap { position: relative; display: flex; flex-direction: column; gap: var(--nc-spacing-xs); }
        textarea {
            width: 100%; box-sizing: border-box;
            padding: var(--nc-spacing-sm) var(--nc-spacing-md);
            background: var(--nc-bg); border: var(--nc-input-border);
            border-radius: var(--nc-input-radius);
            color: var(--nc-text); font-size: var(--nc-font-size-base);
            font-family: var(--nc-font-family); line-height: var(--nc-line-height-normal);
            resize: vertical; transition: border-color var(--nc-transition-fast), box-shadow var(--nc-transition-fast);
            outline: none; min-height: 80px;
        }
        :host([autoresize]) textarea { resize: none; }
        :host([disabled]) textarea   { opacity: 0.5; cursor: not-allowed; }
        :host([size="sm"]) textarea  { padding: var(--nc-spacing-xs) var(--nc-spacing-sm); font-size: var(--nc-font-size-sm); }
        :host([size="lg"]) textarea  { padding: var(--nc-spacing-md) var(--nc-spacing-lg); font-size: var(--nc-font-size-lg); }
        :host([variant="filled"]) textarea { background: var(--nc-bg-tertiary); border-color: transparent; }
        :host([variant="filled"]) textarea:hover:not(:disabled) { background: var(--nc-bg-secondary); }
        textarea:hover:not(:disabled) { border-color: var(--nc-input-focus-border); }
        textarea:focus { border-color: var(--nc-input-focus-border); box-shadow: 0 0 0 3px rgba(16,185,129,.15); }
        textarea::placeholder { color: var(--nc-text-muted); }
        .counter { align-self: flex-end; font-size: var(--nc-font-size-xs); color: var(--nc-text-muted); line-height: 1; }
        .counter.over { color: var(--nc-danger); font-weight: var(--nc-font-weight-semibold); }
        [hidden] { display: none !important; }
    `;

    template() {
        return `            <div class="wrap">
                <textarea ref="textareaEl" aria-multiline="true"></textarea>
                <span ref="counterEl" class="counter" hidden></span>
            </div>
        `;
    }

    onMount() {
        this._syncFromAttrs();

        this.on(this.textareaEl, 'input', () => {
            if (this.hasAttribute('autoresize')) this._autoResize();
            this._updateCounter(this.textareaEl.value);
            this.emit('input', { value: this.textareaEl.value, name: this.getAttribute('name') || '' });
        });

        this.on(this.textareaEl, 'change', () => {
            this.setAttribute('value', this.textareaEl.value);
            this.emit('change', { value: this.textareaEl.value, name: this.getAttribute('name') || '' });
        });
    }

    protected _handleAttributeUpdate(name: string, val: string | null) {
        if (name === 'value') {
            this.textareaEl.value = val || '';
            this._updateCounter(this.textareaEl.value);
            if (this.hasAttribute('autoresize')) this._autoResize();
            return;
        }
        this._syncFromAttrs();
    }

    private _syncFromAttrs() {
        const ta = this.textareaEl;
        ta.value       = this.getAttribute('value') || '';
        ta.placeholder = this.getAttribute('placeholder') || '';
        ta.rows        = Number(this.getAttribute('rows') || 4);
        ta.name        = this.getAttribute('name') || '';
        ta.disabled    = this.hasAttribute('disabled');
        ta.readOnly    = this.hasAttribute('readonly');
        const maxlength = this.getAttribute('maxlength');
        if (maxlength) {
            ta.maxLength = Number(maxlength);
        } else {
            ta.removeAttribute('maxlength');
        }
        if (this.hasAttribute('autoresize')) this._autoResize();
        this._updateCounter(ta.value);
    }

    private _autoResize() {
        this.textareaEl.style.height = 'auto';
        this.textareaEl.style.height = `${this.textareaEl.scrollHeight}px`;
    }

    private _updateCounter(value: string) {
        const maxlength = this.getAttribute('maxlength');
        if (!maxlength) { this.counterEl.hidden = true; return; }
        const count = value.length;
        const max   = Number(maxlength);
        this.counterEl.textContent = `${count} / ${maxlength}`;
        this.counterEl.classList.toggle('over', count > max);
        this.counterEl.hidden = false;
    }
}

if (!customElements.get('nc-textarea')) customElements.define('nc-textarea', NcTextarea);


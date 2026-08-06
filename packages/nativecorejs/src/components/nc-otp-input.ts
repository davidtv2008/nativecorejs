/**
 * NcOtpInput Component â€” One-time password / verification code input
 *
 * Attributes:
 *   length       â€” number of boxes (default: 6)
 *   type         â€” 'numeric'(default)|'alphanumeric'|'alpha'
 *   separator    â€” insert a visual dash/space separator after this position (e.g. "3" for 3+3)
 *   disabled     â€” boolean
 *   masked       â€” boolean â€” mask input like a password
 *   autofocus    â€” boolean â€” focus first box on mount
 *   label        â€” accessible label
 *   error        â€” error message
 *   hint         â€” helper text
 *
 * Value (read/write via property):
 *   el.value     â€” get/set current OTP string
 *
 * Events:
 *   change   â€” CustomEvent<{ value: string; complete: boolean }>
 *   complete â€” CustomEvent<{ value: string }> â€” fired when all boxes are filled
 *
 * Usage:
 *   <nc-otp-input length="6" type="numeric"></nc-otp-input>
 */
import { CoreComponent } from '../../.nativecore/core/component.js';
import { css, escapeHtml } from '../../.nativecore/utils/templates.js';

export class NcOtpInput extends CoreComponent {
    static useShadowDOM = true;
    static observedAttributes = ['length', 'disabled', 'masked', 'error'];
    static attributeOptions   = { type: ['numeric', 'alphanumeric', 'alpha'] };
    static attributeOrder     = ['length', 'type', 'separator', 'label', 'hint', 'error', 'masked', 'disabled', 'autofocus'];

    // -- Refs -----------------------------------------------------------------
    declare wrapEl:   HTMLDivElement;
    declare statusEl: HTMLParagraphElement;

    private _values: string[] = [];

    get value(): string { return this._values.join(''); }
    set value(v: string) {
        const len = this._length();
        this._values = v.slice(0, len).split('');
        while (this._values.length < len) this._values.push('');
        this._syncBoxes();
    }

    private _length() { return parseInt(this.getAttribute('length') ?? '6', 10); }

    static styles = css`
        :host { display: block; font-family: var(--nc-font-family); }
        .wrap  { display: flex; align-items: center; gap: var(--nc-spacing-xs); }
        .box {
            width: 44px; height: 52px;
            text-align: center;
            font-size: var(--nc-font-size-xl);
            font-weight: var(--nc-font-weight-semibold);
            color: var(--nc-text); background: var(--nc-bg);
            border: 2px solid var(--nc-border);
            border-radius: var(--nc-radius-md);
            outline: none;
            transition: border-color var(--nc-transition-fast), box-shadow var(--nc-transition-fast);
            caret-color: transparent; padding: 0;
        }
        :host([error]) .box { border-color: var(--nc-danger); }
        .box:focus {
            border-color: var(--nc-primary);
            box-shadow: 0 0 0 3px rgba(var(--nc-primary-rgb, 99,102,241),.2);
        }
        :host([error]) .box:focus { border-color: var(--nc-danger); box-shadow: 0 0 0 3px rgba(239,68,68,.2); }
        .box:disabled { opacity: 0.5; cursor: not-allowed; }
        .box.filled   { border-color: var(--nc-primary); background: var(--nc-bg-secondary); }
        :host([error]) .box.filled { border-color: var(--nc-danger); }
        .sep { color: var(--nc-text-muted); font-size: var(--nc-font-size-lg); font-weight: var(--nc-font-weight-medium); user-select: none; padding: 0 2px; }
        .hint  { font-size: var(--nc-font-size-xs); color: var(--nc-text-muted); margin-top: 6px; }
        .error { font-size: var(--nc-font-size-xs); color: var(--nc-danger);      margin-top: 6px; }
        [hidden] { display: none !important; }
    `;

    template() {
        return `            <div ref="wrapEl" class="wrap" role="group"></div>
            <p ref="statusEl" class="hint" hidden></p>
        `;
    }

    onMount() {
        const label = this.getAttribute('label') ?? '';
        this.wrapEl.setAttribute('aria-label', label || 'OTP input');

        this._syncBoxes();

        if (this.hasAttribute('autofocus')) {
            requestAnimationFrame(() => this._boxAt(0)?.focus());
        }

        // Event delegation â€” all box events handled via wrapEl
        this.on(this.wrapEl, 'focusin',  (e: FocusEvent) => {
            const box = (e.target as HTMLElement).closest<HTMLInputElement>('.box');
            if (box) box.select();
        });

        this.on(this.wrapEl, 'input', (e: InputEvent) => {
            const box = (e.target as HTMLElement).closest<HTMLInputElement>('.box');
            if (!box) return;
            const idx  = parseInt(box.dataset.idx ?? '0', 10);
            const type = this.getAttribute('type') ?? 'numeric';
            let val = box.value;
            if (type === 'numeric')      val = val.replace(/\D/g, '');
            if (type === 'alpha')        val = val.replace(/[^a-zA-Z]/g, '');
            if (type === 'alphanumeric') val = val.replace(/[^a-zA-Z0-9]/g, '');
            val = val.slice(-1).toUpperCase();
            box.value = val;
            this._values[idx] = val;
            box.classList.toggle('filled', !!val);
            this._emitChange();
            if (val) this._boxAt(idx + 1)?.focus();
        });

        this.on(this.wrapEl, 'keydown', (e: KeyboardEvent) => {
            const box = (e.target as HTMLElement).closest<HTMLInputElement>('.box');
            if (!box) return;
            const idx   = parseInt(box.dataset.idx ?? '0', 10);
            const boxes = this._boxes();
            if (e.key === 'Backspace') {
                if (box.value) {
                    box.value = ''; this._values[idx] = '';
                    box.classList.remove('filled');
                    this._emitChange();
                } else if (idx > 0) { this._boxAt(idx - 1)?.focus(); }
                e.preventDefault();
            } else if (e.key === 'ArrowLeft'  && idx > 0)              this._boxAt(idx - 1)?.focus();
            else if   (e.key === 'ArrowRight' && idx < boxes.length - 1) this._boxAt(idx + 1)?.focus();
            else if   (e.key === 'Delete') {
                box.value = ''; this._values[idx] = '';
                box.classList.remove('filled');
                this._emitChange(); e.preventDefault();
            }
        });

        this.on(this.wrapEl, 'paste', (e: ClipboardEvent) => {
            const box = (e.target as HTMLElement).closest<HTMLInputElement>('.box');
            if (!box) return;
            const idx    = parseInt(box.dataset.idx ?? '0', 10);
            const text   = e.clipboardData?.getData('text') ?? '';
            if (!text) return;
            const type   = this.getAttribute('type') ?? 'numeric';
            let filtered = text;
            if (type === 'numeric')      filtered = text.replace(/\D/g, '');
            if (type === 'alpha')        filtered = text.replace(/[^a-zA-Z]/g, '');
            if (type === 'alphanumeric') filtered = text.replace(/[^a-zA-Z0-9]/g, '');
            requestAnimationFrame(() => {
                const chars = filtered.toUpperCase().slice(0, this._length() - idx).split('');
                chars.forEach((ch, offset) => {
                    const ti = idx + offset;
                    this._values[ti] = ch;
                    const tb = this._boxAt(ti);
                    if (tb) { tb.value = ch; tb.classList.toggle('filled', !!ch); }
                });
                this._emitChange();
                this._boxAt(Math.min(idx + chars.length, this._boxes().length - 1))?.focus();
            });
        });
    }

    protected _handleAttributeUpdate(name: string, _val: string | null) {
        if (name === 'error') { this._syncStatus(); return; }
        this._syncBoxes();
    }

    private _syncBoxes() {
        const len       = this._length();
        const masked    = this.hasAttribute('masked');
        const disabled  = this.hasAttribute('disabled');
        const separator = parseInt(this.getAttribute('separator') ?? '0', 10);
        const label     = this.getAttribute('label') ?? '';

        while (this._values.length < len) this._values.push('');

        this.wrapEl.innerHTML = Array.from({ length: len }, (_, i) => {
            const val = escapeHtml(this._values[i] ?? '');
            const sep = separator > 0 && i === separator - 1 && i < len - 1
                ? '<span class="sep">â€“</span>' : '';
            return `<input class="box${val ? ' filled' : ''}" type="${masked ? 'password' : 'text'}"
                inputmode="${masked ? 'text' : 'numeric'}" maxlength="1" data-idx="${i}"
                value="${val}" ${disabled ? 'disabled' : ''}
                autocomplete="one-time-code"
                aria-label="${label ? escapeHtml(label) + ' ' : ''}digit ${i + 1}"/>${sep}`;
        }).join('');

        this._syncStatus();
    }

    private _syncStatus() {
        const error = this.getAttribute('error') ?? '';
        const hint  = this.getAttribute('hint') ?? '';
        this.statusEl.hidden = !error && !hint;
        if (error) {
            this.statusEl.className = 'error';
            this.statusEl.textContent = error;
        } else if (hint) {
            this.statusEl.className = 'hint';
            this.statusEl.textContent = hint;
        }
    }

    private _emitChange() {
        const value    = this.value;
        const complete = value.length === this._length() && !value.includes('');
        this.emit('change', { value, complete });
        if (complete) this.emit('complete', { value });
    }

    private _boxes(): HTMLInputElement[] {
        return Array.from(this.wrapEl.querySelectorAll<HTMLInputElement>('.box'));
    }

    private _boxAt(i: number): HTMLInputElement | null {
        return this.wrapEl.querySelector<HTMLInputElement>(`.box[data-idx="${i}"]`);
    }
}

if (!customElements.get('nc-otp-input')) customElements.define('nc-otp-input', NcOtpInput);

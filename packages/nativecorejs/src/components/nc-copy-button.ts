/**
 * NcCopyButton Component — copy text to clipboard with auto feedback
 *
 * Attributes:
 *   value    — text to copy (required)
 *   label    — idle button label (default: 'Copy')
 *   copied-label — label after copy (default: 'Copied!')
 *   timeout  — ms before reverting label (default: 2000)
 *   variant  — button variant passed to inner button (default: 'outline')
 *   size     — 'sm'|'md'|'lg' (default: 'md')
 *   icon-only — boolean — show icon only, no text
 *
 * Events:
 *   copy — CustomEvent<{ value: string }> — fires on successful copy
 *   error — CustomEvent<{ error: unknown }> — fires if clipboard write fails
 */
import { CoreComponent } from '../../.nativecore/core/component.js';
import { css, escapeHtml, html, trusted } from '../../.nativecore/utils/templates.js';

export class NcCopyButton extends CoreComponent {
    static useShadowDOM = true;
    static observedAttributes = ['value', 'label', 'copied-label', 'timeout', 'variant', 'size', 'icon-only'];

    static attributeOptions = {
        variant: ['outline', 'primary', 'ghost'],
        size:    ['sm', 'md', 'lg'],
    };
    static attributePlaceholders = {
        value:         'Text to copy',
        label:         'Copy',
        'copied-label': 'Copied!',
        timeout:       '2000',
    };
    static attributeOrder = ['value', 'label', 'copied-label', 'variant', 'size', 'icon-only', 'timeout'];

    // -- Refs -----------------------------------------------------------------
    declare btnEl:   HTMLButtonElement;
    declare iconEl:  HTMLSpanElement;
    declare labelEl: HTMLSpanElement;

    // -- State ----------------------------------------------------------------
    private isCopied = this.state(false);
    private _timer: ReturnType<typeof setTimeout> | null = null;

    static styles = css`
        :host { display: inline-block; }

        button {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-family: var(--nc-font-family);
            font-size: var(--nc-font-size-sm);
            font-weight: var(--nc-font-weight-medium);
            color: var(--nc-text, #1e293b);
            background: var(--nc-bg-secondary, #f1f5f9);
            border: 1px solid var(--nc-border, #cbd5e1);
            border-radius: var(--nc-radius-md);
            padding: 6px 14px;
            cursor: pointer;
            transition: color var(--nc-transition-fast), background var(--nc-transition-fast),
                        border-color var(--nc-transition-fast), opacity var(--nc-transition-fast);
            outline: none;
            white-space: nowrap;
        }
        :host([size="sm"]) button { font-size: var(--nc-font-size-xs);   padding: 4px 8px; }
        :host([size="sm"]) button svg { width: 14px; height: 14px; }
        :host([size="lg"]) button { font-size: var(--nc-font-size-base); padding: 8px 20px; }
        :host([size="lg"]) button svg { width: 20px; height: 20px; }

        button:hover:not(:disabled) { opacity: 0.8; }
        button:focus-visible { outline: 2px solid var(--nc-primary); outline-offset: 2px; }
        button:disabled { opacity: 0.5; cursor: default; }

        .copied { color: var(--nc-success); }
        .icon { flex-shrink: 0; display: flex; }
        .label[hidden] { display: none; }
    `;

    template() {
        const iconOnly = this.hasAttribute('icon-only');
        const variant  = this.getAttribute('variant') ?? 'outline';

        const copyIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>`;
        const checkIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
        </svg>`;

        const borderColor = variant === 'primary' ? 'var(--nc-primary)' : variant === 'ghost' ? 'transparent' : 'var(--nc-border)';
        const bg          = variant === 'primary' ? 'var(--nc-primary)' : 'transparent';
        const baseColor   = variant === 'primary' ? 'var(--nc-white)' : 'var(--nc-text)';

        return html`            <button ref="btnEl" type="button" aria-label="Copy">
                <span ref="iconEl" class="icon">${trusted(copyIcon)}</span>
                ${trusted(!iconOnly ? `<span ref="labelEl" class="label"></span>` : '<span ref="labelEl" class="label" hidden></span>')}
            </button>
        `;
    }

    onMount() {
        const copyIcon  = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
        const checkIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

        this.effect(() => {
            const copied      = this.isCopied.value;
            const label       = this.getAttribute('label') ?? 'Copy';
            const copiedLabel = this.getAttribute('copied-label') ?? 'Copied!';

            this.btnEl.disabled = copied;
            this.btnEl.setAttribute('aria-label', copied ? copiedLabel : label);
            this.btnEl.classList.toggle('copied', copied);
            this.iconEl.innerHTML = copied ? checkIcon : copyIcon;
            if (this.labelEl) {
                this.labelEl.textContent = copied ? copiedLabel : label;
                this.labelEl.classList.toggle('copied', copied);
            }
        });

        this.on(this.btnEl, 'click', () => this._copy());
    }

    private async _copy() {
        const value   = this.getAttribute('value') ?? '';
        const timeout = parseInt(this.getAttribute('timeout') ?? '2000', 10);
        try {
            await navigator.clipboard.writeText(value);
            this.isCopied.value = true;
            if (this._timer) clearTimeout(this._timer);
            this._timer = setTimeout(() => { this.isCopied.value = false; }, timeout);
            this.emit('copy', { value });
        } catch (error) {
            this.emit('error', { error });
        }
    }

    onUnmount() {
        if (this._timer) clearTimeout(this._timer);
    }
}

if (!customElements.get('nc-copy-button')) customElements.define('nc-copy-button', NcCopyButton);


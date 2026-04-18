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
import { Component, defineComponent } from '@core/component.js';
import { html, trusted } from '@core-utils/templates.js';

export class NcCopyButton extends Component {
    static useShadowDOM = true;

    private _timer: ReturnType<typeof setTimeout> | null = null;
    private _copied = false;

    template() {
        const label       = this.getAttribute('label') ?? 'Copy';
        const copiedLabel = this.getAttribute('copied-label') ?? 'Copied!';
        const variant     = this.getAttribute('variant') ?? 'outline';
        const size        = this.getAttribute('size') ?? 'md';
        const iconOnly    = this.hasAttribute('icon-only');
        const isCopied    = this._copied;

        const pad   = size === 'sm' ? '4px 8px' : size === 'lg' ? '8px 20px' : '6px 14px';
        const fs    = size === 'sm' ? 'var(--nc-font-size-xs)' : size === 'lg' ? 'var(--nc-font-size-base)' : 'var(--nc-font-size-sm)';
        const iconSz = size === 'sm' ? 14 : size === 'lg' ? 20 : 16;

        const copyIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="${iconSz}" height="${iconSz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>`;
        const checkIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="${iconSz}" height="${iconSz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
        </svg>`;

        const variantColors: Record<string, string> = {
            outline: 'var(--nc-border)',
            primary: 'var(--nc-primary)',
            ghost:   'transparent',
        };
        const border = variantColors[variant] ?? variantColors.outline;
        const bg     = variant === 'primary' ? 'var(--nc-primary)' : 'transparent';
        const color  = isCopied
            ? 'var(--nc-success)'
            : variant === 'primary' ? 'var(--nc-white)' : 'var(--nc-text)';

        return html`
            <style>
                :host { display: inline-block; }
                button {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    font-family: var(--nc-font-family);
                    font-size: ${fs};
                    font-weight: var(--nc-font-weight-medium);
                    color: ${color};
                    background: ${bg};
                    border: 1px solid ${border};
                    border-radius: var(--nc-radius-md);
                    padding: ${pad};
                    cursor: pointer;
                    transition: color var(--nc-transition-fast), background var(--nc-transition-fast),
                                border-color var(--nc-transition-fast), opacity var(--nc-transition-fast);
                    outline: none;
                    white-space: nowrap;
                }
                button:hover:not(:disabled) { opacity: 0.8; }
                button:focus-visible { outline: 2px solid var(--nc-primary); outline-offset: 2px; }
                button:disabled { opacity: 0.5; cursor: default; }
                .icon { flex-shrink: 0; display: flex; }
            </style>
            <button type="button" aria-label="${isCopied ? copiedLabel : label}" ${isCopied ? 'disabled' : ''}>
                <span class="icon">${trusted(isCopied ? checkIcon : copyIcon)}</span>
                ${trusted(!iconOnly ? `<span>${isCopied ? copiedLabel : label}</span>` : '')}
            </button>
        `;
    }

    onMount() {
        this.shadowRoot!.addEventListener('click', () => this._copy());
    }

    private async _copy() {
        const value = this.getAttribute('value') ?? '';
        const timeout = parseInt(this.getAttribute('timeout') ?? '2000', 10);
        try {
            await navigator.clipboard.writeText(value);
            this._copied = true;
            this.render();
            if (this._timer) clearTimeout(this._timer);
            this._timer = setTimeout(() => {
                this._copied = false;
                this.render();
            }, timeout);
            this.dispatchEvent(new CustomEvent('copy', {
                detail: { value }, bubbles: true, composed: true,
            }));
        } catch (error) {
            this.dispatchEvent(new CustomEvent('error', {
                detail: { error }, bubbles: true, composed: true,
            }));
        }
    }

    onUnmount() {
        if (this._timer) clearTimeout(this._timer);
    }
}

defineComponent('nc-copy-button', NcCopyButton);


import { Component, defineComponent } from '../../.nativecore/core/component.js';
import { escapeHTML } from '../../.nativecore/utils/templates.js';

export class NcCopyButton extends Component {
    static useShadowDOM = true;

    private timer: ReturnType<typeof setTimeout> | null = null;
    private copied = false;

    template() {
        const label = this.getAttribute('label') ?? 'Copy';
        const copiedLabel = this.getAttribute('copied-label') ?? 'Copied!';
        const variant = this.getAttribute('variant') ?? 'outline';
        const size = this.getAttribute('size') ?? 'md';
        const iconOnly = this.hasAttribute('icon-only');
        const isCopied = this.copied;

        const padding = size === 'sm' ? '4px 8px' : size === 'lg' ? '8px 20px' : '6px 14px';
        const fontSize = size === 'sm' ? 'var(--nc-font-size-xs, 0.75rem)' : size === 'lg' ? 'var(--nc-font-size-base, 1rem)' : 'var(--nc-font-size-sm, 0.875rem)';
        const iconSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 16;

        const copyIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
        const checkIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

        const variantColors: Record<string, string> = {
            outline: 'var(--nc-border, #e5e7eb)',
            primary: 'var(--nc-primary, #10b981)',
            ghost: 'transparent'
        };
        const border = variantColors[variant] ?? variantColors.outline;
        const background = variant === 'primary' ? 'var(--nc-primary, #10b981)' : 'transparent';
        const color = isCopied
            ? 'var(--nc-success, #10b981)'
            : variant === 'primary' ? 'var(--nc-white, #ffffff)' : 'var(--nc-text, #111827)';

        return `
            <style>
                :host { display: inline-block; }
                button {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    font-family: var(--nc-font-family);
                    font-size: ${fontSize};
                    font-weight: var(--nc-font-weight-medium, 500);
                    color: ${color};
                    background: ${background};
                    border: 1px solid ${border};
                    border-radius: var(--nc-radius-md, 0.5rem);
                    padding: ${padding};
                    cursor: pointer;
                    transition: color var(--nc-transition-fast, 160ms ease), background var(--nc-transition-fast, 160ms ease), border-color var(--nc-transition-fast, 160ms ease), opacity var(--nc-transition-fast, 160ms ease);
                    outline: none;
                    white-space: nowrap;
                }
                button:hover:not(:disabled) { opacity: 0.8; }
                button:focus-visible { outline: 2px solid var(--nc-primary, #10b981); outline-offset: 2px; }
                button:disabled { opacity: 0.5; cursor: default; }
                .icon { flex-shrink: 0; display: flex; }
            </style>
            <button type="button" aria-label="${escapeHTML(isCopied ? copiedLabel : label)}" ${isCopied ? 'disabled' : ''}>
                <span class="icon">${isCopied ? checkIcon : copyIcon}</span>
                ${!iconOnly ? `<span>${escapeHTML(isCopied ? copiedLabel : label)}</span>` : ''}
            </button>
        `;
    }

    onMount() {
        this.shadowRoot?.addEventListener('click', () => this.copy());
    }

    private async copy() {
        const value = this.getAttribute('value') ?? '';
        const timeout = parseInt(this.getAttribute('timeout') ?? '2000', 10);
        try {
            await navigator.clipboard.writeText(value);
            this.copied = true;
            this.render();
            if (this.timer) clearTimeout(this.timer);
            this.timer = setTimeout(() => {
                this.copied = false;
                this.render();
            }, timeout);
            this.dispatchEvent(new CustomEvent('copy', {
                detail: { value },
                bubbles: true,
                composed: true
            }));
        } catch (error) {
            this.dispatchEvent(new CustomEvent('error', {
                detail: { error },
                bubbles: true,
                composed: true
            }));
        }
    }

    onUnmount() {
        if (this.timer) clearTimeout(this.timer);
    }
}

defineComponent('nc-copy-button', NcCopyButton);


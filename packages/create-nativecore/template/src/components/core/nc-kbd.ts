/**
 * NcKbd Component — keyboard key display
 *
 * Attributes:
 *   - size: 'sm' | 'md' (default) | 'lg'
 *
 * Usage:
 *   <nc-kbd>Ctrl</nc-kbd>
 *   <nc-kbd>⌘</nc-kbd> + <nc-kbd>K</nc-kbd>
 */
import { CoreComponent } from '@core/component.js';
import { css, html } from '@core-utils/templates.js';

export class NcKbd extends CoreComponent {
    static useShadowDOM = true;
    static observedAttributes = ['size'];
    static attributeOptions = {
        size: ['sm', 'md', 'lg'],
    };

    static styles = css`
        :host { display: inline-block; }

        kbd {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-family: var(--nc-font-family-mono, 'SFMono-Regular', Consolas, monospace);
            font-weight: var(--nc-font-weight-medium);
            line-height: 1;
            color: var(--nc-text);
            background: var(--nc-bg-secondary);
            border: 1px solid var(--nc-border);
            border-bottom-width: 3px;
            border-radius: var(--nc-radius-sm);
            white-space: nowrap;
            user-select: none;
            box-shadow: inset 0 -1px 0 rgba(0,0,0,.08);
            /* default md */
            font-size: 12px;
            padding: 2px 8px;
        }

        :host([size="sm"]) kbd { font-size: 11px; padding: 1px 5px; }
        :host([size="lg"]) kbd { font-size: 15px; padding: 4px 12px; }
    `;

    template() {
        return html`            <kbd><slot></slot></kbd>
        `;
    }
}

if (!customElements.get('nc-kbd')) customElements.define('nc-kbd', NcKbd);


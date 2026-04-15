/**
 * NcKbd Component — keyboard key display
 *
 * Usage:
 *   <nc-kbd>Ctrl</nc-kbd>
 *   <nc-kbd>⌘</nc-kbd> + <nc-kbd>K</nc-kbd>
 *
 * Attributes:
 *   size — 'sm'|'md'(default)|'lg'
 */
import { Component, defineComponent } from '@core/component.js';

export class NcKbd extends Component {
    static useShadowDOM = true;

    template() {
        const size = this.getAttribute('size') || 'md';
        const pad  = size === 'sm' ? '1px 5px' : size === 'lg' ? '4px 12px' : '2px 8px';
        const fs   = size === 'sm' ? '11px' : size === 'lg' ? '15px' : '12px';

        return `
            <style>
                :host { display: inline-block; }
                kbd {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    font-family: var(--nc-font-family-mono, 'SFMono-Regular', Consolas, monospace);
                    font-size: ${fs};
                    font-weight: var(--nc-font-weight-medium);
                    line-height: 1;
                    color: var(--nc-text);
                    background: var(--nc-bg-secondary);
                    border: 1px solid var(--nc-border);
                    border-bottom-width: 3px;
                    border-radius: var(--nc-radius-sm);
                    padding: ${pad};
                    white-space: nowrap;
                    user-select: none;
                    box-shadow: inset 0 -1px 0 rgba(0,0,0,.08);
                }
            </style>
            <kbd><slot></slot></kbd>
        `;
    }
}

defineComponent('nc-kbd', NcKbd);

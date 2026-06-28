/**
 * NcCard Component
 *
 * Attributes:
 *   - variant: 'default' | 'primary' | 'secondary' | 'success' | 'danger' (default: 'default')
 *   - size: 'sm' | 'md' | 'lg' (default: 'md')
 *   - disabled: boolean
 *   - elevated: boolean â€” adds a box shadow
 *   - bordered: boolean â€” adds a border (default when no variant)
 *
 * Usage:
 *   <nc-card>Content</nc-card>
 *   <nc-card variant="primary">Highlighted</nc-card>
 *   <nc-card elevated size="lg">Large elevated card</nc-card>
 */

import { CoreComponent } from '@core/component.js';
import { css, html } from '@core-utils/templates.js';

export class NcCard extends CoreComponent {
    static useShadowDOM = true;
    static observedAttributes = ['variant', 'size', 'disabled', 'elevated', 'bordered'];

    static attributeOptions = {
        variant: ['default', 'primary', 'secondary', 'success', 'danger'],
        size:    ['sm', 'md', 'lg'],
    };

    static attributeOrder = ['variant', 'size', 'elevated', 'bordered', 'disabled'];

    static styles = css`
        :host {
            display: block;
            font-family: var(--nc-font-family);
            padding: var(--nc-spacing-md);
            border-radius: var(--nc-radius-md);
            background: var(--nc-bg-secondary);
            transition: box-shadow var(--nc-transition-fast);
            width: 100%;
            box-sizing: border-box;
        }

        /* variant */
        :host([variant="default"])   { background: var(--nc-bg-secondary); color: var(--nc-text); }
        :host([variant="primary"])   { background: var(--nc-gradient-primary); color: var(--nc-white); }
        :host([variant="secondary"]) { background: var(--nc-bg-secondary); color: var(--nc-text); border: 1px solid var(--nc-border); }
        :host([variant="success"])   { background: var(--nc-gradient-success); color: var(--nc-white); }
        :host([variant="danger"])    { background: var(--nc-gradient-danger);  color: var(--nc-white); }

        /* size */
        :host([size="sm"]) { padding: var(--nc-spacing-sm); font-size: var(--nc-font-size-sm); }
        :host([size="md"]) { padding: var(--nc-spacing-md); font-size: var(--nc-font-size-base); }
        :host([size="lg"]) { padding: var(--nc-spacing-lg); font-size: var(--nc-font-size-lg); }

        /* modifiers */
        :host([elevated]) { box-shadow: var(--nc-shadow-md); }
        :host([bordered]:not([variant="secondary"])) { border: 1px solid var(--nc-border); }
        :host([disabled]) { opacity: 0.5; pointer-events: none; }
    `;

    template() {
        return html`            <slot></slot>
        `;
    }
}

if (!customElements.get('nc-card')) customElements.define('nc-card', NcCard);

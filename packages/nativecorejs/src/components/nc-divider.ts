import { Component, defineComponent } from '../../.nativecore/core/component.js';
import { html, raw, escapeHTML } from '../../.nativecore/utils/templates.js';

export class NcDivider extends Component {
    static useShadowDOM = true;

    static get observedAttributes() {
        return ['orientation', 'variant', 'label', 'thickness', 'color', 'spacing'];
    }

    template() {
        const orientation = this.getAttribute('orientation') || 'horizontal';
        const variant = this.getAttribute('variant') || 'solid';
        const label = this.getAttribute('label') || '';
        const thickness = this.getAttribute('thickness') || '1px';
        const color = this.getAttribute('color') || 'var(--nc-border, #e5e7eb)';
        const spacing = this.getAttribute('spacing') || (orientation === 'horizontal' ? 'var(--nc-spacing-md, 1rem) 0' : '0 var(--nc-spacing-md, 1rem)');

        const isHorizontal = orientation === 'horizontal';

        return html`
            <style>
                :host {
                    display: ${isHorizontal ? 'block' : 'inline-flex'};
                    align-self: ${isHorizontal ? 'auto' : 'stretch'};
                }

                .divider {
                    display: flex;
                    align-items: center;
                    margin: ${spacing};
                    ${isHorizontal ? 'width: 100%;' : 'flex-direction: column; height: 100%;'}
                    font-family: var(--nc-font-family);
                }

                .line {
                    ${isHorizontal ? 'flex: 1; height: 0;' : 'flex: 1; width: 0;'}
                    border: none;
                    border-${isHorizontal ? 'top' : 'left'}: ${thickness} ${variant} ${color};
                }

                .label {
                    padding: ${isHorizontal ? '0 var(--nc-spacing-sm, 0.5rem)' : 'var(--nc-spacing-sm, 0.5rem) 0'};
                    font-size: var(--nc-font-size-xs, 0.75rem);
                    color: var(--nc-text-muted, #6b7280);
                    white-space: nowrap;
                    font-weight: var(--nc-font-weight-medium, 500);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
            </style>
            <div class="divider" role="separator" aria-orientation="${orientation}">
                <span class="line"></span>
                ${raw(label ? `<span class="label">${raw(escapeHTML(label)))}</span><span class="line"></span>` : ''}
            </div>
        `;
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue !== newValue && this._mounted) this.render();
    }
}

defineComponent('nc-divider', NcDivider);



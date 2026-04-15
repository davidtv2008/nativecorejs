import { Component, defineComponent } from '../core/component.js';

export class NcCard extends Component {
    static useShadowDOM = true;

    static attributeOptions = {
        variant: ['primary', 'secondary', 'success', 'danger'],
        size: ['sm', 'md', 'lg']
    };

    static get observedAttributes() {
        return ['variant', 'size', 'disabled'];
    }

    template() {
        return `
            <style>
                :host {
                    display: block;
                    font-family: var(--nc-font-family);
                    padding: var(--nc-spacing-md, 1rem);
                    border-radius: var(--nc-radius-md, 0.75rem);
                    transition: all var(--nc-transition-fast, 160ms ease);
                    width: 100%;
                    box-sizing: border-box;
                }

                :host([variant="primary"]) {
                    background: var(--nc-gradient-primary, linear-gradient(135deg, #10b981, #059669));
                    color: var(--nc-white, #ffffff);
                }

                :host([variant="secondary"]) {
                    background: var(--nc-bg-secondary, #f8fafc);
                    color: var(--nc-text, #111827);
                    border: 1px solid var(--nc-border, #e5e7eb);
                }

                :host([variant="success"]) {
                    background: var(--nc-gradient-success, linear-gradient(135deg, #22c55e, #16a34a));
                    color: var(--nc-white, #ffffff);
                }

                :host([variant="danger"]) {
                    background: var(--nc-gradient-danger, linear-gradient(135deg, #ef4444, #dc2626));
                    color: var(--nc-white, #ffffff);
                }

                :host([size="sm"]) {
                    padding: var(--nc-spacing-sm, 0.75rem);
                    font-size: var(--nc-font-size-sm, 0.875rem);
                }

                :host([size="md"]) {
                    padding: var(--nc-spacing-md, 1rem);
                    font-size: var(--nc-font-size-base, 1rem);
                }

                :host([size="lg"]) {
                    padding: var(--nc-spacing-lg, 1.5rem);
                    font-size: var(--nc-font-size-lg, 1.125rem);
                }

                :host([disabled]) {
                    opacity: 0.5;
                    pointer-events: none;
                }
            </style>
            <slot></slot>
        `;
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue !== newValue && this._mounted) {
            this.render();
        }
    }
}

defineComponent('nc-card', NcCard);

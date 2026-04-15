import { Component, defineComponent } from '../core/component.js';

export class LoadingSpinner extends Component {
    static get observedAttributes() {
        return ['size', 'message'];
    }

    template() {
        const size = this.attr('size', 'medium');
        const message = this.attr('message', 'Loading...');

        const dimension = size === 'small' ? '20px' : size === 'large' ? '40px' : '28px';

        return `
            <style>
                :host {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    font-family: var(--nc-font-family);
                }
                .loading-spinner {
                    display: inline-flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.75rem;
                }
                .spinner {
                    width: ${dimension};
                    height: ${dimension};
                    border-radius: 50%;
                    border: 3px solid var(--nc-bg-tertiary, #e5e7eb);
                    border-top-color: var(--nc-primary, #10b981);
                    animation: nc-spin 0.8s linear infinite;
                }
                .loading-message {
                    margin: 0;
                    color: var(--nc-text-muted, #6b7280);
                    font-size: var(--nc-font-size-sm, 0.875rem);
                }
                @keyframes nc-spin {
                    to { transform: rotate(360deg); }
                }
            </style>
            <div class="loading-spinner ${size}">
                <div class="spinner"></div>
                ${message ? `<p class="loading-message">${message}</p>` : ''}
            </div>
        `;
    }
}

defineComponent('loading-spinner', LoadingSpinner);

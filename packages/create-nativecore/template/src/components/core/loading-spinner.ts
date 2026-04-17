/**
 * Loading Spinner Component
 * Simple reusable loading indicator
 */
import { Component, defineComponent } from '@core/component.js';
import { html } from '@core-utils/templates.js';

class LoadingSpinner extends Component {
    static get observedAttributes() {
        return ['size', 'message'];
    }
    
    template() {
        const size = this.attr('size', 'medium');
        const message = this.attr('message', 'Loading...');
        
        return html`
            <div class="loading-spinner ${size}">
                <div class="spinner"></div>
                ${message ? `<p class="loading-message">${message}</p>` : ''}
            </div>
        `;
    }
}

defineComponent('loading-spinner', LoadingSpinner);


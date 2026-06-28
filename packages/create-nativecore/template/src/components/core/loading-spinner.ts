/**
 * Loading Spinner Component
 * Simple reusable loading indicator
 */
import { CoreComponent } from '@core/component.js';
import { html, css } from '@core-utils/templates.js';

class LoadingSpinner extends CoreComponent {

    static useShadowDOM = true;
    static observedAttributes = ['size', 'message', 'color'];

    static attributeOptions = {
        size: ['small', 'medium', 'large'],
        color: ['primary', 'secondary', 'tertiary'],
    };

    static styles = css`
        :host {
            display: inline-flex;
        }

        .loading-spinner {
            display: inline-flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            color: var(--nc-text, #334155);
        }

        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid rgba(0, 0, 0, 0.1);
            border-top-color: var(--_spinner-color, var(--nc-primary, #3b82f6));
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        :host([color="primary"]) { --_spinner-color: var(--nc-primary, #3b82f6); }
        :host([color="secondary"]) { --_spinner-color: var(--nc-secondary, #6c757d); }
        :host([color="tertiary"]) { --_spinner-color: var(--nc-gray-900, #1e293b); }

        :host([size="small"]) .spinner {
            width: 24px;
            height: 24px;
            border-width: 3px;
        }

        :host([size="medium"]) .spinner {
            width: 40px;
            height: 40px;
        }

        :host([size="large"]) .spinner {
            width: 56px;
            height: 56px;
            border-width: 5px;
        }

        .loading-message {
            margin: 0;
            font-size: 0.875rem;
            color: var(--nc-text-secondary, #64748b);
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;

    // --- STATE ---
    private _size = this.state<'small' | 'medium' | 'large'>('medium');
    private _message = this.state('Loading...');
    private _color = this.state<'primary' | 'secondary' | 'tertiary'>('primary');

    // --- DOM REFS ---
    private container!: HTMLElement;
    private messageEl!: HTMLParagraphElement;

    // --- TEMPLATE ---
    // Keep template static; dynamic values are applied via state/effects.
    template() {
        return html`
            <div ref="container" class="loading-spinner" role="status" aria-live="polite" aria-busy="true">
                <div class="spinner" aria-hidden="true"></div>
                <p ref="messageEl" class="loading-message"></p>
            </div>
        `;
    }

    // --- LIFECYCLE ---
    onMount(){
        const sizeAttr = this.getAttribute('size');
        const isValidSize = sizeAttr === 'small' || sizeAttr === 'medium' || sizeAttr === 'large';
        this._size.value = isValidSize ? sizeAttr : 'medium';
        
        this._message.value = this.getAttribute('message') ?? 'Loading...';

        const colorAttr = this.getAttribute('color');
        const isValidColor = colorAttr === 'primary' || colorAttr === 'secondary' || colorAttr === 'tertiary';
        this._color.value = isValidColor ? (colorAttr as 'primary' | 'secondary' | 'tertiary') : 'primary';

        // Keep host attributes in sync so CSS variant selectors work.
        this.bind(this._size, this, 'size');
        this.bind(this._color, this, 'color');

        // Keep message text reactive and hide when empty.
        this.bind(this._message, this.messageEl);
        this.effect(() => {
            this.messageEl.hidden = !this._message.value;
        });
    }

    protected _handleAttributeUpdate(name: string, val: string | null) {
        if (name === 'size') {
            const isValidSize = val === 'small' || val === 'medium' || val === 'large';
            this._size.value = isValidSize ? val : 'medium';
        }

        if (name === 'message') {
            this._message.value = val ?? 'Loading...';
        }

        if (name === 'color') {
            const isValidColor = val === 'primary' || val === 'secondary' || val === 'tertiary';
            this._color.value = isValidColor ? (val as 'primary' | 'secondary' | 'tertiary') : 'primary';
        }
    }
}

if (!customElements.get('loading-spinner')) customElements.define('loading-spinner', LoadingSpinner);


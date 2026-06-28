/**
 * NativeCore Button Component
 * 
 * Framework core component using Shadow DOM and --nc- variables.
 * 
 * Attributes:
 *   - variant: 'primary' | 'secondary' | 'tertiary' | 'success' | 'danger' | 'outline' (default: 'primary')
 *   - size: 'sm' | 'md' | 'lg' (default: 'md')
 *   - icon: URL to icon/image (optional, e.g., '/icons/delete.svg' or 'assets/logo.png')
 *   - icon-position: 'left' | 'right' | 'top' | 'bottom' (default: 'left')
 *   - alt: Alt text for icon (optional, for accessibility)
 *   - disabled: boolean
 *   - loading: boolean
 *   - full-width: boolean
 * 
 * Usage:
 *   
 *   
 *   
 */

import { CoreComponent} from '@core/component.js';
import { html, css, trusted } from '@core-utils/templates.js';

export class NcButton extends CoreComponent {

    static useShadowDOM = true;
    static get observedAttributes() {
        return ['variant', 'size', 'icon', 'icon-position', 'alt', 'disabled', 'loading', 'full-width'];
    }
    
    // Dev tools will auto-detect these dropdown options
    static attributeOptions = {
        variant: ['primary', 'secondary', 'tertiary', 'success', 'danger', 'outline'],
        size: ['sm', 'md', 'lg'],
        'icon-position': ['left', 'right', 'top', 'bottom']
    };
    
    // Add placeholders for text inputs in dev tools
    static attributePlaceholders = {
        icon: '/icons/my-icon.svg or assets/image.png',
        alt: 'Icon description for accessibility'
    };

    static styles = css`
        :host {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: var(--nc-spacing-sm);
                    font-family: var(--nc-font-family);
                    font-weight: var(--nc-font-weight-semibold);
                    border: none;
                    border-radius: var(--nc-button-radius);
                    cursor: pointer;
                    transition: all var(--nc-transition-fast);
                    text-decoration: none;
                    outline: none;
                    position: relative;
                    overflow: hidden;
                    user-select: none;
                    box-sizing: border-box !important;
                    margin: 0 !important;
                    flex-direction: row;

                    /* Default size (md) */
                    padding: var(--nc-spacing-sm) var(--nc-spacing-xl) !important;
                    font-size: var(--nc-font-size-base);
                    min-height: 40px;
                    
                    /* Default variant (primary) */
                    background: var(--nc-gradient-primary);
                    color: var(--nc-white);
                }
                
                .nc-button-icon {
                    width: 1.2em;
                    height: 1.2em;
                    object-fit: contain;
                    flex-shrink: 0;
                }
                
                :host(:focus-visible) {
                    outline: 2px solid var(--nc-primary);
                    outline-offset: 2px;
                }
                
                /* Size Variants */
                :host([size="sm"]) {
                    padding: var(--nc-spacing-xs) var(--nc-spacing-lg) !important;
                    font-size: var(--nc-font-size-sm);
                    min-height: 32px;
                }
                
                :host([size="md"]) {
                    padding: var(--nc-spacing-sm) var(--nc-spacing-xl) !important;
                    font-size: var(--nc-font-size-base);
                    min-height: 40px;
                }
                
                :host([size="lg"]) {
                    padding: var(--nc-spacing-md) var(--nc-spacing-2xl) !important;
                    font-size: var(--nc-font-size-lg);
                    min-height: 48px;
                }
                
                /* Variant: Primary */
                :host([variant="primary"]) {
                    background: #10b981;
                    color: white;
                    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
                }
                
                :host([variant="primary"]:hover:not([disabled]):not([loading])) {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
                    background: #059669;
                }
                
                :host([variant="primary"]:active:not([disabled]):not([loading])) {
                    transform: translateY(0);
                }
                
                /* Variant: Secondary */
                :host([variant="secondary"]) {
                    background: var(--nc-gray-200);
                    color: var(--nc-text);
                    border: none;
                }
                
                :host([variant="secondary"]:hover:not([disabled]):not([loading])) {
                    background: var(--nc-gray-300);
                    transform: translateY(-1px);
                }
                
                /* Variant: Success */
                :host([variant="success"]) {
                    background: var(--nc-gradient-success);
                    color: var(--nc-white);
                }
                
                :host([variant="success"]:hover:not([disabled]):not([loading])) {
                    transform: translateY(-2px);
                    box-shadow: var(--nc-shadow-success);
                }
                
                :host([variant="success"]:active:not([disabled]):not([loading])) {
                    transform: translateY(0);
                }
                
                /* Variant: Danger */
                :host([variant="danger"]) {
                    background: var(--nc-gradient-danger);
                    color: var(--nc-white);
                }
                
                :host([variant="danger"]:hover:not([disabled]):not([loading])) {
                    transform: translateY(-2px);
                    box-shadow: var(--nc-shadow-danger);
                }
                
                :host([variant="danger"]:active:not([disabled]):not([loading])) {
                    transform: translateY(0);
                }
                
                /* Variant: Tertiary (dark) */
                :host([variant="tertiary"]) {
                    background: var(--nc-gray-900);
                    color: var(--nc-white);
                }
                
                :host([variant="tertiary"]:hover:not([disabled]):not([loading])) {
                    background: var(--nc-gray-800);
                    transform: translateY(-2px);
                }
                
                :host([variant="tertiary"]:active:not([disabled]):not([loading])) {
                    transform: translateY(0);
                }
                
                /* Variant: Outline */
                :host([variant="outline"]) {
                    background: transparent;
                    color: var(--nc-primary);
                    border: 2px solid var(--nc-primary);
                }
                
                :host([variant="outline"]:hover:not([disabled]):not([loading])) {
                    background: var(--nc-primary);
                    color: var(--nc-white);
                }
                
                /* Full Width */
                :host([full-width]) {
                    display: block;
                    width: 100%;
                }
                
                /* Icon position */
                :host([icon-position="right"])  { flex-direction: row-reverse; }
                :host([icon-position="top"])    { flex-direction: column; }
                :host([icon-position="bottom"]) { flex-direction: column-reverse; }

                /* Disabled State */
                :host([disabled]) {
                    opacity: 0.5;
                    pointer-events: none;
                    cursor: not-allowed;
                }
                
                /* Loading State */
                :host([loading]) {
                    pointer-events: none;
                    cursor: not-allowed;
                    overflow: visible;
                }
                
                :host([loading])::after {
                    content: '';
                    position: absolute;
                    width: 16px;
                    height: 16px;
                    border: 2px solid currentColor;
                    border-top-color: transparent;
                    border-radius: 50%;
                    animation: spin 0.6s linear infinite;
                    margin-left: var(--nc-spacing-sm);
                }
                
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                
                /* Ripple Effect */
                :host::before {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 0;
                    height: 0;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.5);
                    transform: translate(-50%, -50%);
                    transition: width 0.6s, height 0.6s;
                }
                
                :host(:active:not([disabled]):not([loading]))::before {
                    width: 300px;
                    height: 300px;
                    opacity: 0;
                }
                
                /* Anchor tags inside button */
                ::slotted(a) {
                    color: white;
                    text-decoration: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
    `;
 
    // --- TEMPLATE ---
    template() {        
        return html`
            ${trusted(this._iconHTML)}
            <slot></slot>
        `;
    }

    // --- STATE ---
    private _icon = this.getAttribute('icon');
    private _alt = this.getAttribute('alt') || '';    
    private _iconHTML = this._icon ? `<img class="nc-button-icon" src="${this._icon}" alt="${this._alt}" />` : '';
    private _disabled = this.state(this.hasAttribute('disabled'));

    // --- LIFECYCLE ---
    onMount() {
        // Set button role and tab index for accessibility
        this.setAttribute('role', 'button');
        if (!this.hasAttribute('tabindex')) {
            this.setAttribute('tabindex', '0');
        }
        
        // Handle keyboard navigation (Enter and Space)
        this.addEventListener('keydown', (e) => {
            if ((e.key === 'Enter' || e.key === ' ') && 
                !this.hasAttribute('disabled') && 
                !this.hasAttribute('loading')) {
                e.preventDefault();
                this.click();
            }
        });
    }

    events(){
        this.on(this, 'click', (e: MouseEvent) => {
            if(this._disabled.value) return e.preventDefault();

        });
    }
    
    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue !== newValue) {
            //this.render();
        }
    }
}

if (!customElements.get('nc-button')) customElements.define('nc-button', NcButton);


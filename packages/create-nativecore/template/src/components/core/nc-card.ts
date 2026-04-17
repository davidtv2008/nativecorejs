/**
 * NcCard Component
 * 
 * NativeCore Framework Core Component
 * Generated on 2/1/2026
 * 
 * ⚠️ FRAMEWORK INTERNAL COMPONENT ⚠️
 * This component uses --nc- CSS variables from core-variables.css
 * for consistent styling across the framework.
 * 
 * ═══════════════════════════════════════════════════════════════════
 * DEV TOOLS INTEGRATION - How to make attributes editable in sidebar:
 * ═══════════════════════════════════════════════════════════════════
 * 
 * 1. ADD TO observedAttributes:
 *    static get observedAttributes() {
 *      return ['variant', 'size', 'disabled'];  // ← These become editable
 *    }
 * 
 * 2. USE getAttribute() IN template():
 *    const variant = this.getAttribute('variant') || 'primary';
 *    const size = this.getAttribute('size') || 'md';
 * 
 * 3. FOR DROPDOWN SELECTORS (variant/size):
 *    Name attributes 'variant' or 'size' AND use CSS patterns:
 * 
 *    Option A - :host() selectors (RECOMMENDED for core components):
 *      :host([variant="primary"]) { ... }
 *      :host([variant="secondary"]) { ... }
 *      :host([size="sm"]) { ... }
 *      :host([size="lg"]) { ... }
 * 
 *    Option B - Class selectors:
 *      .primary { ... }
 *      .secondary { ... }
 *      .btn-sm { ... }
 *      .btn-lg { ... }
 * 
 *    The dev tools will auto-detect these patterns and create dropdowns!
 * 
 * 4. ATTRIBUTE TYPES (auto-detected):
 *    - Boolean: disabled, loading, hidden, readonly → Checkbox
 *    - Variant/Size: variant, size (with CSS) → Dropdown
 *    - Number: count, max, min, step → Slider
 *    - Everything else → Text input
 * 
 * 5. LIVE UPDATES:
 *    Implement attributeChangedCallback for instant preview updates
 * 
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Usage:
 *   
 *   
 * 
 * Attributes:
 *   - variant: Component style variant
 *   - size: Component size (sm, md, lg)
 *   - disabled: Disabled state
 */

import { Component, defineComponent } from '@core/component.js';
import { html } from '@utils/templates.js';

export class NcCard extends Component {
    static useShadowDOM = true;
    
    // ═══ Define dropdown options for dev tools (auto-detected) ═══
    static attributeOptions = {
        variant: ['primary', 'secondary', 'success', 'danger'],
        size: ['sm', 'md', 'lg']
    };
    
    // ═══ Attributes listed here become editable in dev tools sidebar ═══
    static get observedAttributes() {
        return ['variant', 'size', 'disabled'];
    }
    
    constructor() {
        super();
    }
    
    template() {
        return html`
            <style>
                :host {
                    display: block;
                    font-family: var(--nc-font-family);
                    padding: var(--nc-spacing-md);
                    border-radius: var(--nc-radius-md);
                    transition: all var(--nc-transition-fast);
                    width: 100%;
                    box-sizing: border-box;
                }
                
                /* ═══ Variant Options (auto-detected for dropdown) ═══ */
                /* Dev tools will scan :host([variant="..."]) patterns */
                
                :host([variant="primary"]) {
                    background: var(--nc-gradient-primary);
                    color: var(--nc-white);
                }
                
                :host([variant="secondary"]) {
                    background: var(--nc-bg-secondary);
                    color: var(--nc-text);
                    border: 1px solid var(--nc-border);
                }
                
                :host([variant="success"]) {
                    background: var(--nc-gradient-success);
                    color: var(--nc-white);
                }
                
                :host([variant="danger"]) {
                    background: var(--nc-gradient-danger);
                    color: var(--nc-white);
                }
                
                /* ═══ Size Options (auto-detected for dropdown) ═══ */
                /* Dev tools will scan :host([size="..."]) patterns */
                
                :host([size="sm"]) {
                    padding: var(--nc-spacing-sm);
                    font-size: var(--nc-font-size-sm);
                }
                
                :host([size="md"]) {
                    padding: var(--nc-spacing-md);
                    font-size: var(--nc-font-size-base);
                }
                
                :host([size="lg"]) {
                    padding: var(--nc-spacing-lg);
                    font-size: var(--nc-font-size-lg);
                }
                
                /* ═══ Disabled State (auto-detected as checkbox) ═══ */
                :host([disabled]) {
                    opacity: 0.5;
                    pointer-events: none;
                }
            </style>
            
            <slot></slot>
        `;
    }
    
    onMount() {
        // Component logic here
    }
    
    // ═══ Makes changes instant in dev tools preview ═══
    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue !== newValue && this._mounted) {
            this.render();
        }
    }
}

defineComponent('nc-card', NcCard);

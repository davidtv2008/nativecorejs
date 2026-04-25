import { Component, defineComponent } from "@core/component.js";
import { html } from "@core-utils/templates.js";
class NcCard extends Component {
  static useShadowDOM = true;
  // ═══ Define dropdown options for dev tools (auto-detected) ═══
  static attributeOptions = {
    variant: ["primary", "secondary", "success", "danger"],
    size: ["sm", "md", "lg"]
  };
  // ═══ Attributes listed here become editable in dev tools sidebar ═══
  static get observedAttributes() {
    return ["variant", "size", "disabled"];
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
  }
  // ═══ Makes changes instant in dev tools preview ═══
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue && this._mounted) {
      this.render();
    }
  }
}
defineComponent("nc-card", NcCard);
export {
  NcCard
};

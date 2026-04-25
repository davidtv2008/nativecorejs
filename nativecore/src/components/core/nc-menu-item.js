import { Component, defineComponent } from "@core/component.js";
import { html, trusted, escapeHtml, sanitizeURL } from "@core-utils/templates.js";
class NcMenuItem extends Component {
  static useShadowDOM = true;
  static get observedAttributes() {
    return ["icon", "alt", "disabled", "active", "danger"];
  }
  _onClick = null;
  _onKeydown = null;
  template() {
    const icon = this.getAttribute("icon");
    const alt = this.getAttribute("alt") || "";
    const disabled = this.hasAttribute("disabled");
    const iconHTML = icon ? `<img class="item__icon" src="${sanitizeURL(icon)}" alt="${escapeHtml(alt)}" />` : "";
    return html`
            <style>
                :host {
                    display: block;
                }

                .item {
                    display: flex;
                    align-items: center;
                    gap: var(--nc-spacing-sm);
                    padding: var(--nc-spacing-sm) var(--nc-spacing-md);
                    border-radius: var(--nc-radius-md);
                    cursor: pointer;
                    font-family: var(--nc-font-family);
                    font-size: var(--nc-font-size-sm);
                    font-weight: var(--nc-font-weight-medium);
                    color: var(--nc-text);
                    background: transparent;
                    border: none;
                    width: 100%;
                    text-align: left;
                    box-sizing: border-box;
                    transition:
                        background var(--nc-transition-fast),
                        color var(--nc-transition-fast);
                    user-select: none;
                    outline: none;
                }

                .item:hover {
                    background: var(--nc-bg-tertiary);
                    color: var(--nc-text);
                }

                .item:focus-visible {
                    outline: 2px solid var(--nc-primary);
                    outline-offset: -2px;
                }

                /* Active / selected */
                :host([active]) .item {
                    background: rgba(16, 185, 129, 0.1);
                    color: var(--nc-primary);
                    font-weight: var(--nc-font-weight-semibold);
                }

                :host([active]) .item:hover {
                    background: rgba(16, 185, 129, 0.15);
                }

                /* Danger */
                :host([danger]) .item {
                    color: var(--nc-danger);
                }

                :host([danger]) .item:hover {
                    background: rgba(239, 68, 68, 0.08);
                    color: var(--nc-danger);
                }

                /* Disabled */
                :host([disabled]) .item {
                    opacity: 0.4;
                    cursor: not-allowed;
                    pointer-events: none;
                }

                .item__icon {
                    width: 16px;
                    height: 16px;
                    object-fit: contain;
                    flex-shrink: 0;
                    opacity: 0.75;
                }

                :host([active]) .item__icon,
                :host([danger]) .item__icon {
                    opacity: 1;
                }

                .item__label {
                    flex: 1;
                    min-width: 0;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .item__end {
                    flex-shrink: 0;
                    font-size: var(--nc-font-size-xs, 0.7rem);
                    color: var(--nc-text-muted, var(--nc-text-secondary));
                    opacity: 0.65;
                }
            </style>
            <div class="item" role="menuitem" tabindex="${disabled ? -1 : 0}" aria-disabled="${disabled}">
                ${trusted(iconHTML)}
                <span class="item__label"><slot></slot></span>
                <span class="item__end"><slot name="end"></slot></span>
            </div>
        `;
  }
  onMount() {
    this._onClick = (e) => {
      if (this.hasAttribute("disabled")) {
        e.stopPropagation();
        return;
      }
      this.emitEvent("nc-select", {}, { bubbles: true, composed: true });
    };
    this._onKeydown = (e) => {
      const ke = e;
      if (ke.key === "Enter" || ke.key === " ") {
        e.preventDefault();
        this._onClick(e);
      }
    };
    this.shadowRoot.addEventListener("click", this._onClick);
    this.shadowRoot.addEventListener("keydown", this._onKeydown);
  }
  onUnmount() {
    if (this._onClick) this.shadowRoot?.removeEventListener("click", this._onClick);
    if (this._onKeydown) this.shadowRoot?.removeEventListener("keydown", this._onKeydown);
    this._onClick = null;
    this._onKeydown = null;
  }
  attributeChangedCallback(_name, oldValue, newValue) {
    if (this._mounted && oldValue !== newValue) this.render();
  }
}
defineComponent("nc-menu-item", NcMenuItem);
export {
  NcMenuItem
};

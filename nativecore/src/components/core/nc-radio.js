import { Component, defineComponent } from "@core/component.js";
import { html, trusted } from "@core-utils/templates.js";
class NcRadio extends Component {
  static useShadowDOM = true;
  static attributeOptions = {
    variant: ["primary", "success", "danger"],
    size: ["sm", "md", "lg"]
  };
  static get observedAttributes() {
    return ["label", "name", "value", "checked", "disabled", "size", "variant"];
  }
  constructor() {
    super();
  }
  template() {
    const label = this.getAttribute("label") || "";
    const size = this.getAttribute("size") || "md";
    const checked = this.hasAttribute("checked");
    const disabled = this.hasAttribute("disabled");
    const dotSize = size === "sm" ? "6px" : size === "lg" ? "10px" : "8px";
    const boxSize = size === "sm" ? "16px" : size === "lg" ? "24px" : "20px";
    return html`
            <style>
                :host {
                    display: inline-flex;
                    align-items: center;
                    gap: var(--nc-spacing-sm);
                    cursor: ${disabled ? "not-allowed" : "pointer"};
                    user-select: none;
                    font-family: var(--nc-font-family);
                    opacity: ${disabled ? "0.5" : "1"};
                }

                .radio-wrapper {
                    display: inline-flex;
                    align-items: center;
                    gap: var(--nc-spacing-sm);
                }

                input[type="radio"] {
                    position: absolute;
                    opacity: 0;
                    width: 0;
                    height: 0;
                    pointer-events: none;
                }

                .ring {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    width: ${boxSize};
                    height: ${boxSize};
                    border-radius: var(--nc-radius-full);
                    border: 2px solid var(--nc-border-dark);
                    background: var(--nc-bg);
                    transition: all var(--nc-transition-fast);
                    box-sizing: border-box;
                    position: relative;
                }

                .dot {
                    width: ${dotSize};
                    height: ${dotSize};
                    border-radius: var(--nc-radius-full);
                    background: var(--nc-white);
                    opacity: 0;
                    transform: scale(0);
                    transition: all var(--nc-transition-fast);
                }

                /* Checked state */
                :host([checked]) .ring {
                    border-color: var(--nc-primary);
                    background: var(--nc-primary);
                }

                :host([checked]) .dot {
                    opacity: 1;
                    transform: scale(1);
                }

                :host([variant="success"][checked]) .ring {
                    border-color: var(--nc-success);
                    background: var(--nc-success);
                }

                :host([variant="danger"][checked]) .ring {
                    border-color: var(--nc-danger);
                    background: var(--nc-danger);
                }

                /* Hover */
                :host(:not([disabled])) .ring:hover {
                    border-color: var(--nc-primary);
                    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
                }

                :host([variant="success"]:not([disabled])) .ring:hover {
                    border-color: var(--nc-success);
                    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
                }

                :host([variant="danger"]:not([disabled])) .ring:hover {
                    border-color: var(--nc-danger);
                    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
                }

                /* Focus ring */
                :host(:focus-visible) .ring {
                    outline: 2px solid var(--nc-primary);
                    outline-offset: 2px;
                }

                .label {
                    font-size: var(--nc-font-size-base);
                    color: var(--nc-text);
                    line-height: var(--nc-line-height-normal);
                }

                :host([size="sm"]) .label {
                    font-size: var(--nc-font-size-sm);
                }

                :host([size="lg"]) .label {
                    font-size: var(--nc-font-size-lg);
                }
            </style>

            <label class="radio-wrapper">
                <input
                    type="radio"
                    ${checked ? "checked" : ""}
                    ${disabled ? "disabled" : ""}
                    name="${this.getAttribute("name") || ""}"
                    value="${this.getAttribute("value") || ""}"
                />
                <span class="ring">
                    <span class="dot"></span>
                </span>
                ${trusted(label ? `<span class="label">${label}</span>` : "<slot></slot>")}
            </label>
        `;
  }
  onMount() {
    if (!this.hasAttribute("tabindex")) {
      this.setAttribute("tabindex", "0");
    }
    this.setAttribute("role", "radio");
    this.setAttribute("aria-checked", String(this.hasAttribute("checked")));
    this.shadowRoot.addEventListener("click", () => {
      if (this.hasAttribute("disabled")) return;
      this._select();
    });
    this.addEventListener("keydown", (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!this.hasAttribute("disabled")) this._select();
      }
    });
  }
  _select() {
    if (this.hasAttribute("checked")) return;
    const name = this.getAttribute("name");
    if (name) {
      const root = this.getRootNode();
      const siblings = Array.from(root.querySelectorAll(`nc-radio[name="${name}"]`));
      siblings.forEach((sibling) => {
        if (sibling !== this) {
          sibling.removeAttribute("checked");
          sibling.setAttribute("aria-checked", "false");
        }
      });
    }
    this.setAttribute("checked", "");
    this.setAttribute("aria-checked", "true");
    this.dispatchEvent(new CustomEvent("change", {
      bubbles: true,
      composed: true,
      detail: {
        value: this.getAttribute("value") || "",
        name: this.getAttribute("name") || ""
      }
    }));
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
      if (name === "checked") {
        this.setAttribute("aria-checked", String(this.hasAttribute("checked")));
      }
    }
  }
}
defineComponent("nc-radio", NcRadio);
export {
  NcRadio
};

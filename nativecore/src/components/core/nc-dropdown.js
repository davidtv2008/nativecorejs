import { Component, defineComponent } from "@core/component.js";
import { html } from "@core-utils/templates.js";
class NcDropdown extends Component {
  static useShadowDOM = true;
  static get observedAttributes() {
    return ["open", "placement", "close-on-select", "disabled", "offset", "width"];
  }
  _outsideClick = null;
  template() {
    const open = this.hasAttribute("open");
    const placement = this.getAttribute("placement") || "bottom-start";
    const [vSide, hAlign] = placement.split("-");
    const above = vSide === "top";
    return html`
            <style>
                :host { display: inline-flex; position: relative; vertical-align: middle; }

                .trigger-slot {
                    display: contents;
                }

                .panel {
                    position: absolute;
                    ${above ? "bottom: calc(100% + var(--dropdown-offset, 6px));" : "top: calc(100% + var(--dropdown-offset, 6px));"}
                    ${!hAlign || hAlign === "start" ? "left: 0;" : hAlign === "end" ? "right: 0;" : "left: 50%; transform: translateX(-50%);"}
                    z-index: 600;
                    background: var(--nc-bg);
                    border: 1px solid var(--nc-border);
                    border-radius: var(--nc-radius-md, 8px);
                    box-shadow: var(--nc-shadow-lg);
                    min-width: 160px;
                    overflow: hidden;
                    opacity: ${open ? "1" : "0"};
                    pointer-events: ${open ? "auto" : "none"};
                    transform-origin: ${above ? "bottom" : "top"} ${!hAlign || hAlign === "start" ? "left" : hAlign === "end" ? "right" : "center"};
                    transform: ${open ? !hAlign || hAlign !== "center" ? "none" : "translateX(-50%)" : !hAlign || hAlign !== "center" ? `scale(0.97) translateY(${above ? "4px" : "-4px"})` : `translateX(-50%) scale(0.97) translateY(${above ? "4px" : "-4px"})`};
                    transition: opacity var(--nc-transition-fast), transform var(--nc-transition-fast);
                }
            </style>
            <span class="trigger-slot">
                <slot name="trigger"></slot>
            </span>
            <div class="panel" role="menu" aria-hidden="${!open}">
                <slot></slot>
            </div>
        `;
  }
  onMount() {
    this._bindEvents();
  }
  _bindEvents() {
    const triggerSlot = this.shadowRoot.querySelector('slot[name="trigger"]');
    triggerSlot.addEventListener("slotchange", () => this._hookTrigger());
    this._hookTrigger();
    this._outsideClick = (e) => {
      if (!this.contains(e.target) && !this.shadowRoot.contains(e.target)) {
        this._setOpen(false);
      }
    };
    document.addEventListener("mousedown", this._outsideClick);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.hasAttribute("open")) this._setOpen(false);
    });
    this.addEventListener("click", (e) => {
      const target = e.target.closest("[data-value]");
      if (!target) return;
      const value = target.dataset.value ?? "";
      const label = target.textContent?.trim() ?? "";
      this.dispatchEvent(new CustomEvent("select", {
        bubbles: true,
        composed: true,
        detail: { value, label }
      }));
      if (this.getAttribute("close-on-select") !== "false") {
        this._setOpen(false);
      }
    });
  }
  _hookTrigger() {
    const slot = this.shadowRoot.querySelector('slot[name="trigger"]');
    const nodes = slot.assignedElements();
    nodes.forEach((node) => {
      node.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!this.hasAttribute("disabled")) this._setOpen(!this.hasAttribute("open"));
      });
    });
  }
  _setOpen(open) {
    if (open) {
      this.setAttribute("open", "");
    } else {
      this.removeAttribute("open");
    }
  }
  onUnmount() {
    if (this._outsideClick) document.removeEventListener("mousedown", this._outsideClick);
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === "open" && this._mounted) {
      const open = this.hasAttribute("open");
      const panel = this.$(".panel");
      if (panel) {
        const placement = this.getAttribute("placement") || "bottom-start";
        const [vSide, hAlign] = placement.split("-");
        const above = vSide === "top";
        const center = hAlign === "center";
        panel.style.opacity = open ? "1" : "0";
        panel.style.pointerEvents = open ? "auto" : "none";
        panel.style.transform = open ? center ? "translateX(-50%)" : "none" : center ? `translateX(-50%) scale(0.97) translateY(${above ? "4px" : "-4px"})` : `scale(0.97) translateY(${above ? "4px" : "-4px"})`;
        panel.setAttribute("aria-hidden", String(!open));
      }
      this.dispatchEvent(new CustomEvent(open ? "open" : "close", {
        bubbles: true,
        composed: true
      }));
      return;
    }
    if (this._mounted) {
      this.render();
      this._bindEvents();
    }
  }
}
defineComponent("nc-dropdown", NcDropdown);
export {
  NcDropdown
};

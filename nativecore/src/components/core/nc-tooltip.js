import { Component, defineComponent } from "@core/component.js";
import { html } from "@core-utils/templates.js";
class NcTooltip extends Component {
  static useShadowDOM = true;
  static get observedAttributes() {
    return ["tip", "placement", "delay", "variant"];
  }
  _showTimer = null;
  _visible = false;
  template() {
    const placement = this.getAttribute("placement") || "top";
    const variant = this.getAttribute("variant") || "default";
    const tip = this.getAttribute("tip") || "";
    return html`
            <style>
                :host { display: inline-flex; position: relative; }

                .tip {
                    position: absolute;
                    z-index: 9999;
                    padding: 5px 10px;
                    border-radius: var(--nc-radius-sm, 4px);
                    font-family: var(--nc-font-family);
                    font-size: var(--nc-font-size-xs);
                    line-height: 1.4;
                    white-space: nowrap;
                    pointer-events: none;
                    opacity: 0;
                    transform: ${placement === "top" ? "translateY(4px)" : placement === "bottom" ? "translateY(-4px)" : placement === "left" ? "translateX(4px)" : "translateX(-4px)"};
                    transition: opacity var(--nc-transition-fast), transform var(--nc-transition-fast);
                    max-width: 220px;
                    overflow-wrap: break-word;
                    white-space: normal;
                    text-align: center;
                }

                .tip--default { background: var(--nc-gray-900, #111); color: #fff; }
                .tip--light   { background: var(--nc-bg); color: var(--nc-text); border: 1px solid var(--nc-border); box-shadow: var(--nc-shadow-md); }

                /* Placement */
                .tip[data-placement="top"]    { bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%) translateY(4px); }
                .tip[data-placement="bottom"] { top: calc(100% + 8px);    left: 50%; transform: translateX(-50%) translateY(-4px); }
                .tip[data-placement="left"]   { right: calc(100% + 8px);  top: 50%;  transform: translateY(-50%) translateX(4px); }
                .tip[data-placement="right"]  { left: calc(100% + 8px);   top: 50%;  transform: translateY(-50%) translateX(-4px); }

                .tip.visible {
                    opacity: 1;
                }
                .tip[data-placement="top"].visible    { transform: translateX(-50%) translateY(0); }
                .tip[data-placement="bottom"].visible { transform: translateX(-50%) translateY(0); }
                .tip[data-placement="left"].visible   { transform: translateY(-50%) translateX(0); }
                .tip[data-placement="right"].visible  { transform: translateY(-50%) translateX(0); }

                /* Arrow */
                .tip::after {
                    content: '';
                    position: absolute;
                    border: 5px solid transparent;
                }
                .tip--default[data-placement="top"]::after    { top: 100%;   left: 50%; transform: translateX(-50%); border-top-color: var(--nc-gray-900, #111); }
                .tip--default[data-placement="bottom"]::after { bottom: 100%; left: 50%; transform: translateX(-50%); border-bottom-color: var(--nc-gray-900, #111); }
                .tip--default[data-placement="left"]::after   { left: 100%;  top: 50%;  transform: translateY(-50%); border-left-color: var(--nc-gray-900, #111); }
                .tip--default[data-placement="right"]::after  { right: 100%; top: 50%;  transform: translateY(-50%); border-right-color: var(--nc-gray-900, #111); }

                .tip--light[data-placement="top"]::after { display: none; }

                ::slotted(*) { display: inline-flex; }
            </style>
            <slot></slot>
            <div
                class="tip tip--${variant}"
                data-placement="${placement}"
                role="tooltip"
                aria-hidden="true"
            >${tip}</div>
        `;
  }
  onMount() {
    const tip = this.$(".tip");
    const delay = Number(this.getAttribute("delay") ?? 200);
    const show = () => {
      if (this._showTimer) clearTimeout(this._showTimer);
      this._showTimer = setTimeout(() => {
        tip.classList.add("visible");
        tip.setAttribute("aria-hidden", "false");
        this._visible = true;
      }, delay);
    };
    const hide = () => {
      if (this._showTimer) {
        clearTimeout(this._showTimer);
        this._showTimer = null;
      }
      tip.classList.remove("visible");
      tip.setAttribute("aria-hidden", "true");
      this._visible = false;
    };
    this.addEventListener("mouseenter", show);
    this.addEventListener("mouseleave", hide);
    this.addEventListener("focusin", show);
    this.addEventListener("focusout", hide);
    this.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this._visible) hide();
    });
  }
  onUnmount() {
    if (this._showTimer) clearTimeout(this._showTimer);
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue && this._mounted) {
      this.render();
      this.onMount();
    }
  }
}
defineComponent("nc-tooltip", NcTooltip);
export {
  NcTooltip
};

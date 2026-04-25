import { Component, defineComponent } from "@core/component.js";
import { html } from "@core-utils/templates.js";
class NcBadge extends Component {
  static useShadowDOM = true;
  static get observedAttributes() {
    return ["count", "max", "show-zero", "dot", "variant", "position"];
  }
  template() {
    const count = Number(this.getAttribute("count") || 0);
    const max = Number(this.getAttribute("max") || 99);
    const showZero = this.hasAttribute("show-zero");
    const dot = this.hasAttribute("dot");
    const variant = this.getAttribute("variant") || "danger";
    const position = this.getAttribute("position") || "top-right";
    const visible = dot || showZero || count > 0;
    const label = dot ? "" : count > max ? `${max}+` : String(count);
    const [vPos, hPos] = position.split("-");
    return html`
            <style>
                :host { display: inline-flex; position: relative; vertical-align: middle; }

                .badge {
                    position: absolute;
                    ${vPos === "top" ? "top: -6px;" : "bottom: -6px;"}
                    ${hPos === "right" ? "right: -6px;" : "left: -6px;"}
                    z-index: 1;
                    display: ${visible ? "inline-flex" : "none"};
                    align-items: center;
                    justify-content: center;
                    font-family: var(--nc-font-family);
                    font-size: 0.65rem;
                    font-weight: var(--nc-font-weight-bold);
                    line-height: 1;
                    min-width: ${dot ? "8px" : "18px"};
                    height: ${dot ? "8px" : "18px"};
                    padding: ${dot ? "0" : "0 5px"};
                    border-radius: 999px;
                    border: 2px solid var(--nc-bg);
                    white-space: nowrap;
                    pointer-events: none;
                    transition: transform var(--nc-transition-fast);
                    transform: scale(${visible ? "1" : "0"});
                }

                .badge--primary   { background: var(--nc-primary); color: #fff; }
                .badge--secondary { background: var(--nc-secondary, #6366f1); color: #fff; }
                .badge--danger    { background: var(--nc-danger,  #ef4444); color: #fff; }
                .badge--warning   { background: var(--nc-warning, #f59e0b); color: #fff; }
                .badge--success   { background: var(--nc-success, #10b981); color: #fff; }
                .badge--info      { background: var(--nc-info,    #3b82f6); color: #fff; }
                .badge--neutral   { background: var(--nc-text-muted); color: #fff; }

                ::slotted(*) { display: inline-flex; }
            </style>
            <slot></slot>
            <span class="badge badge--${variant}" aria-label="${dot ? "indicator" : `${label} notifications`}">${label}</span>
        `;
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue && this._mounted) this.render();
  }
}
defineComponent("nc-badge", NcBadge);
export {
  NcBadge
};

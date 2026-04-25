import { Component, defineComponent } from "@core/component.js";
import { html } from "@core-utils/templates.js";
class NcAvatarGroup extends Component {
  static useShadowDOM = true;
  template() {
    const overlap = parseInt(this.getAttribute("overlap") ?? "10", 10);
    const size = this.getAttribute("size") ?? "md";
    const sizePx = {
      xs: 24,
      sm: 32,
      md: 40,
      lg: 48,
      xl: 56
    };
    const sz = sizePx[size] ?? 40;
    const fs = Math.round(sz * 0.32);
    const bw = Math.max(2, Math.round(sz * 0.06));
    return html`
            <style>
                :host { display: inline-block; }
                .group {
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                }
                /* Offset each child leftwards to create the overlap stack */
                ::slotted(*) {
                    margin-left: -${overlap}px;
                    box-shadow: 0 0 0 ${bw}px var(--nc-bg, #fff);
                    border-radius: 50%;
                    flex-shrink: 0;
                    position: relative;
                    transition: transform var(--nc-transition-fast), z-index 0s;
                    z-index: 0;
                }
                ::slotted(*:first-child) { margin-left: 0; }
                ::slotted(*:hover)       { transform: translateY(-3px); z-index: 10; }
                .overflow {
                    margin-left: -${overlap}px;
                    width: ${sz}px;
                    height: ${sz}px;
                    border-radius: 50%;
                    background: var(--nc-bg-tertiary, #e5e7eb);
                    color: var(--nc-text-secondary);
                    font-family: var(--nc-font-family);
                    font-size: ${fs}px;
                    font-weight: var(--nc-font-weight-semibold);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 0 0 ${bw}px var(--nc-bg, #fff);
                    flex-shrink: 0;
                    user-select: none;
                }
            </style>
            <div class="group" role="group" aria-label="Avatar group">
                <slot></slot>
                <div class="overflow" id="overflow" style="display:none" aria-hidden="true"></div>
            </div>
        `;
  }
  onMount() {
    this._update();
  }
  _update() {
    const slot = this.shadowRoot.querySelector("slot");
    const overflow = this.shadowRoot.querySelector("#overflow");
    if (!slot || !overflow) return;
    const max = parseInt(this.getAttribute("max") ?? "4", 10);
    const total = parseInt(this.getAttribute("total") ?? "0", 10);
    const items = slot.assignedElements({ flatten: true });
    const count = total > 0 ? total : items.length;
    items.forEach((el, idx) => {
      el.style.display = idx < max ? "" : "none";
    });
    const extra = count - Math.min(max, items.length);
    if (extra > 0) {
      overflow.textContent = `+${extra}`;
      overflow.style.display = "flex";
    } else {
      overflow.style.display = "none";
    }
  }
}
defineComponent("nc-avatar-group", NcAvatarGroup);
export {
  NcAvatarGroup
};

import { Component, defineComponent } from "@core/component.js";
import { html, trusted } from "@core-utils/templates.js";
class NcPopover extends Component {
  static useShadowDOM = true;
  _open = false;
  _hoverTimer = null;
  _outside = null;
  static get observedAttributes() {
    return ["open", "placement", "disabled"];
  }
  template() {
    const open = this._open;
    const arrow = this.getAttribute("arrow") !== "false";
    const width = this.getAttribute("width") ?? "auto";
    const maxWidth = this.getAttribute("max-width") ?? "320px";
    return html`
            <style>
                :host { display: inline-block; position: relative; }
                .trigger-wrap { display: contents; }
                .popover {
                    position: absolute;
                    z-index: 1000;
                    background: var(--nc-bg-elevated, var(--nc-bg));
                    border: 1px solid var(--nc-border);
                    border-radius: var(--nc-radius-lg);
                    box-shadow: var(--nc-shadow-lg);
                    width: ${width};
                    max-width: ${maxWidth};
                    font-family: var(--nc-font-family);
                    font-size: var(--nc-font-size-sm);
                    color: var(--nc-text);
                    opacity: ${open ? 1 : 0};
                    pointer-events: ${open ? "auto" : "none"};
                    transform: ${open ? "scale(1) translateY(0)" : "scale(0.97) translateY(-4px)"};
                    transform-origin: top center;
                    transition:
                        opacity var(--nc-transition-fast),
                        transform var(--nc-transition-fast);
                    white-space: normal;
                }
                /* Placement styles applied via JS in _position() */
                .arrow {
                    display: ${arrow ? "block" : "none"};
                    position: absolute;
                    width: 8px;
                    height: 8px;
                    background: var(--nc-bg-elevated, var(--nc-bg));
                    border: 1px solid var(--nc-border);
                    transform: rotate(45deg);
                    pointer-events: none;
                }
            </style>
            <div class="trigger-wrap">
                <slot name="trigger"></slot>
            </div>
            <div class="popover" id="popover" role="dialog" aria-modal="false">
                ${trusted(arrow ? '<div class="arrow" id="arrow"></div>' : "")}
                <slot></slot>
            </div>
        `;
  }
  onMount() {
    this._bindTrigger();
    if (this.hasAttribute("open")) {
      this._open = true;
      this.render();
    }
    this._position();
  }
  onUnmount() {
    this._cleanup();
  }
  // ── Public API ──────────────────────────────────────────────────────────
  show() {
    if (!this._open) {
      this._open = true;
      this.render();
      this._position();
      this._setupOutside();
      this.dispatchEvent(new CustomEvent("open", { bubbles: true, composed: true }));
    }
  }
  hide() {
    if (this._open) {
      this._open = false;
      this.render();
      this._cleanupOutside();
      this.dispatchEvent(new CustomEvent("close", { bubbles: true, composed: true }));
    }
  }
  toggle() {
    if (this._open) this.hide();
    else this.show();
  }
  // ── Trigger binding ─────────────────────────────────────────────────────
  _bindTrigger() {
    const triggerSlot = this.shadowRoot.querySelector('slot[name="trigger"]');
    if (!triggerSlot) return;
    const getTrigger = () => {
      const els = triggerSlot.assignedElements({ flatten: true });
      return els[0] ?? null;
    };
    const mode = this.getAttribute("trigger") ?? "click";
    const hoverDelay = parseInt(this.getAttribute("hover-delay") ?? "200", 10);
    if (mode === "click") {
      triggerSlot.addEventListener("slotchange", () => {
        const el = getTrigger();
        if (el) el.addEventListener("click", () => {
          if (this.hasAttribute("disabled")) return;
          this.toggle();
        });
      });
      requestAnimationFrame(() => {
        const el = getTrigger();
        if (el) el.addEventListener("click", () => {
          if (this.hasAttribute("disabled")) return;
          this.toggle();
        });
      });
    }
    if (mode === "hover") {
      triggerSlot.addEventListener("slotchange", () => {
        const el = getTrigger();
        if (!el) return;
        el.addEventListener("mouseenter", () => {
          if (this.hasAttribute("disabled")) return;
          this._hoverTimer = setTimeout(() => this.show(), hoverDelay);
        });
        el.addEventListener("mouseleave", () => {
          if (this._hoverTimer) {
            clearTimeout(this._hoverTimer);
            this._hoverTimer = null;
          }
          this.hide();
        });
      });
    }
    if (mode === "focus") {
      triggerSlot.addEventListener("slotchange", () => {
        const el = getTrigger();
        if (!el) return;
        el.addEventListener("focusin", () => {
          if (!this.hasAttribute("disabled")) this.show();
        });
        el.addEventListener("focusout", () => this.hide());
      });
    }
  }
  // ── Position calculation ────────────────────────────────────────────────
  _position() {
    const popover = this.shadowRoot.querySelector("#popover");
    const arrow = this.shadowRoot.querySelector("#arrow");
    if (!popover) return;
    const placement = this.getAttribute("placement") ?? "bottom";
    const offset = parseInt(this.getAttribute("offset") ?? "8", 10);
    const [side, align = "center"] = placement.split("-");
    ["top", "bottom", "left", "right"].forEach((s) => {
      popover.style[s] = "";
    });
    const arrowSz = 8;
    const fullOff = offset + (this.getAttribute("arrow") !== "false" ? arrowSz / 2 : 0);
    if (side === "bottom") {
      popover.style.top = `calc(100% + ${fullOff}px)`;
      popover.style.transformOrigin = "top center";
      if (align === "start") popover.style.left = "0";
      else if (align === "end") popover.style.right = "0";
      else {
        popover.style.left = "50%";
        popover.style.transform = this._open ? "translateX(-50%)" : "translateX(-50%) scale(0.97) translateY(-4px)";
      }
      if (arrow) {
        arrow.style.top = `-${arrowSz / 2}px`;
        arrow.style.left = "16px";
        arrow.style.borderRight = "none";
        arrow.style.borderBottom = "none";
      }
    } else if (side === "top") {
      popover.style.bottom = `calc(100% + ${fullOff}px)`;
      popover.style.transformOrigin = "bottom center";
      if (align === "start") popover.style.left = "0";
      else if (align === "end") popover.style.right = "0";
      else {
        popover.style.left = "50%";
        popover.style.transform = this._open ? "translateX(-50%)" : "translateX(-50%) scale(0.97) translateY(4px)";
      }
      if (arrow) {
        arrow.style.bottom = `-${arrowSz / 2}px`;
        arrow.style.left = "16px";
        arrow.style.borderLeft = "none";
        arrow.style.borderTop = "none";
      }
    } else if (side === "right") {
      popover.style.left = `calc(100% + ${fullOff}px)`;
      popover.style.top = "0";
      popover.style.transformOrigin = "left center";
      if (arrow) {
        arrow.style.left = `-${arrowSz / 2}px`;
        arrow.style.top = "12px";
        arrow.style.borderRight = "none";
        arrow.style.borderTop = "none";
      }
    } else {
      popover.style.right = `calc(100% + ${fullOff}px)`;
      popover.style.top = "0";
      popover.style.transformOrigin = "right center";
      if (arrow) {
        arrow.style.right = `-${arrowSz / 2}px`;
        arrow.style.top = "12px";
        arrow.style.borderLeft = "none";
        arrow.style.borderBottom = "none";
      }
    }
  }
  _setupOutside() {
    if (this.getAttribute("close-on-outside") === "false") return;
    const handler = (e) => {
      if (!this.contains(e.target)) this.hide();
    };
    document.addEventListener("mousedown", handler);
    this._outside = handler;
  }
  _cleanupOutside() {
    if (this._outside) {
      document.removeEventListener("mousedown", this._outside);
      this._outside = null;
    }
  }
  _cleanup() {
    this._cleanupOutside();
    if (this._hoverTimer) clearTimeout(this._hoverTimer);
  }
  attributeChangedCallback(n, o, v) {
    if (o === v || !this._mounted) return;
    if (n === "open") {
      this._open = this.hasAttribute("open");
      this.render();
      if (this._open) {
        this._position();
        this._setupOutside();
      } else this._cleanupOutside();
      return;
    }
    this.render();
    this._position();
  }
}
defineComponent("nc-popover", NcPopover);
export {
  NcPopover
};

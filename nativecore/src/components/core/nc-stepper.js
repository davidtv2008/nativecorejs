import { Component, defineComponent } from "@core/component.js";
import { html, trusted } from "@core-utils/templates.js";
const CHECK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M3 8l4 4 6-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ERROR_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M8 5v4M8 11v1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
class NcStep extends Component {
  static useShadowDOM = false;
  // light DOM — stepper queries children directly
  static get observedAttributes() {
    return ["label", "description", "status"];
  }
  template() {
    return "";
  }
  // rendered by NcStepper
}
defineComponent("nc-step", NcStep);
class NcStepper extends Component {
  static useShadowDOM = true;
  static get observedAttributes() {
    return ["step", "orientation", "variant", "linear"];
  }
  _getSteps() {
    return Array.from(this.querySelectorAll("nc-step"));
  }
  template() {
    const current = Number(this.getAttribute("step") || 0);
    const orientation = this.getAttribute("orientation") || "horizontal";
    const isHorizontal = orientation === "horizontal";
    const steps = this._getSteps();
    const total = steps.length;
    const stepItems = steps.map((step, i) => {
      const label = step.getAttribute("label") || `Step ${i + 1}`;
      const desc = step.getAttribute("description") || "";
      const forcedStatus = step.getAttribute("status") || "";
      const isDone = forcedStatus === "complete" || !forcedStatus && i < current;
      const isError = forcedStatus === "error";
      const isActive = i === current;
      let stateClass = "step--pending";
      if (isActive) stateClass = "step--active";
      else if (isDone) stateClass = "step--done";
      else if (isError) stateClass = "step--error";
      const iconContent = isDone ? CHECK_ICON : isError ? ERROR_ICON : String(i + 1);
      return html`
                <div
                    class="step ${stateClass}"
                    data-index="${i}"
                    role="tab"
                    aria-selected="${isActive}"
                    aria-label="Step ${i + 1}: ${label}"
                    tabindex="${isActive ? "0" : "-1"}"
                >
                    <div class="step__indicator">${trusted(iconContent)}</div>
                    <div class="step__text">
                        <span class="step__label">${label}</span>
                        ${trusted(desc ? `<span class="step__desc">${desc}</span>` : "")}
                    </div>
                    ${trusted(i < total - 1 ? `<div class="step__connector"></div>` : "")}
                </div>`;
    }).join("");
    return `
            <style>
                :host { display: block; font-family: var(--nc-font-family); }

                .stepper {
                    display: flex;
                    flex-direction: ${isHorizontal ? "row" : "column"};
                    gap: 0;
                }

                .step {
                    display: flex;
                    flex-direction: ${isHorizontal ? "column" : "row"};
                    align-items: ${isHorizontal ? "center" : "flex-start"};
                    flex: ${isHorizontal ? "1" : "none"};
                    position: relative;
                    cursor: pointer;
                    gap: ${isHorizontal ? "6px" : "var(--nc-spacing-sm)"};
                    padding: ${isHorizontal ? "0 8px" : "var(--nc-spacing-sm) 0"};
                    outline: none;
                }
                .step:first-child { padding-left: 0; }
                .step:last-child  { padding-right: 0; }

                .step__indicator {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: var(--nc-font-size-sm);
                    font-weight: var(--nc-font-weight-semibold);
                    flex-shrink: 0;
                    border: 2px solid var(--nc-border);
                    background: var(--nc-bg);
                    color: var(--nc-text-muted);
                    transition: background var(--nc-transition-fast), border-color var(--nc-transition-fast), color var(--nc-transition-fast);
                    z-index: 1;
                }

                .step--active  .step__indicator { border-color: var(--nc-primary); background: var(--nc-primary); color: #fff; }
                .step--done    .step__indicator { border-color: var(--nc-primary); background: var(--nc-primary); color: #fff; }
                .step--error   .step__indicator { border-color: var(--nc-danger, #ef4444); background: var(--nc-danger, #ef4444); color: #fff; }

                .step__text {
                    display: flex;
                    flex-direction: column;
                    align-items: ${isHorizontal ? "center" : "flex-start"};
                    text-align: ${isHorizontal ? "center" : "left"};
                }

                .step__label {
                    font-size: var(--nc-font-size-sm);
                    font-weight: var(--nc-font-weight-medium);
                    color: var(--nc-text-muted);
                    white-space: nowrap;
                }
                .step--active .step__label { color: var(--nc-text); font-weight: var(--nc-font-weight-semibold); }
                .step--done   .step__label { color: var(--nc-text); }
                .step--error  .step__label { color: var(--nc-danger, #ef4444); }

                .step__desc {
                    font-size: var(--nc-font-size-xs);
                    color: var(--nc-text-muted);
                    white-space: nowrap;
                }

                /* Connector line */
                .step__connector {
                    position: absolute;
                    background: var(--nc-border);
                    transition: background var(--nc-transition-fast);
                    ${isHorizontal ? `top: 16px; left: calc(50% + 20px); right: calc(-50% + 20px); height: 2px;` : `top: 36px; left: 15px; width: 2px; height: calc(100% - 4px);`}
                }
                .step--done .step__connector,
                .step--active .step__connector { background: var(--nc-primary); }
            </style>
            <div class="stepper" role="tablist" aria-orientation="${orientation}">
                ${stepItems}
            </div>
        `;
  }
  onMount() {
    this._bindEvents();
  }
  _bindEvents() {
    this.$(".stepper").addEventListener("click", (e) => {
      const stepEl = e.target.closest("[data-index]");
      if (!stepEl) return;
      const index = Number(stepEl.dataset.index);
      const current = Number(this.getAttribute("step") || 0);
      if (this.hasAttribute("linear") && index > current) return;
      this.goTo(index);
    });
    this.$(".stepper").addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        this.next();
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        this.prev();
      }
      if (e.key === "Home") this.goTo(0);
      if (e.key === "End") this.goTo(this._getSteps().length - 1);
    });
  }
  next() {
    const current = Number(this.getAttribute("step") || 0);
    this.goTo(Math.min(current + 1, this._getSteps().length - 1));
  }
  prev() {
    const current = Number(this.getAttribute("step") || 0);
    this.goTo(Math.max(current - 1, 0));
  }
  goTo(index) {
    const steps = this._getSteps();
    if (index < 0 || index >= steps.length) return;
    const prev = Number(this.getAttribute("step") || 0);
    if (index === prev) return;
    this.setAttribute("step", String(index));
    this.dispatchEvent(new CustomEvent("change", {
      bubbles: true,
      composed: true,
      detail: { step: index, prev }
    }));
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue && this._mounted) {
      this.render();
      this._bindEvents();
    }
  }
}
defineComponent("nc-stepper", NcStepper);
export {
  NcStep,
  NcStepper
};

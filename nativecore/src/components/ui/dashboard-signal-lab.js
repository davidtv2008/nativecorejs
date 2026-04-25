import { Component, defineComponent } from "@core/component.js";
import { useState, computed } from "@core/state.js";
import { html } from "@core-utils/templates.js";
class DashboardSignalLab extends Component {
  static useShadowDOM = true;
  completedItems;
  totalItems;
  completionPercent;
  remainingItems;
  statusLabel;
  _unwatchCompleted;
  _unwatchTotal;
  _unwatchCompletionPercent;
  _unwatchRemainingItems;
  _unwatchStatusLabel;
  _handleClick = (event) => {
    const target = event.target;
    if (target.closest('[data-action="add-item"]')) {
      this.totalItems.value += 1;
    }
    if (target.closest('[data-action="complete-item"]') && this.completedItems.value < this.totalItems.value) {
      this.completedItems.value += 1;
    }
    if (target.closest('[data-action="reset-items"]')) {
      this.totalItems.value = 18;
      this.completedItems.value = 14;
    }
  };
  constructor() {
    super();
    this.completedItems = useState(14);
    this.totalItems = useState(18);
    this.completionPercent = computed(() => Math.round(this.completedItems.value / this.totalItems.value * 100));
    this.remainingItems = computed(() => Math.max(this.totalItems.value - this.completedItems.value, 0));
    this.statusLabel = computed(() => {
      if (this.completionPercent.value >= 90) return "Release ready";
      if (this.completionPercent.value >= 70) return "On track";
      return "Needs focus";
    });
  }
  template() {
    return html`
            <style>
                :host {
                    display: block;
                }

                .signal-lab {
                    padding: 1.4rem;
                    border-radius: 24px;
                    background: linear-gradient(180deg, #0f172a, #111827);
                    color: #f8fafc;
                    border: 1px solid rgba(148, 163, 184, 0.22);
                    box-shadow: 0 18px 40px rgba(15, 23, 42, 0.22);
                }

                .signal-lab__eyebrow {
                    display: inline-flex;
                    align-items: center;
                    padding: 0.35rem 0.7rem;
                    border-radius: 999px;
                    background: rgba(16, 185, 129, 0.18);
                    color: #86efac;
                    font-size: 0.72rem;
                    font-weight: 700;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                }

                .signal-lab__title {
                    margin: 1rem 0 0.4rem;
                    font-size: 1.35rem;
                    line-height: 1.15;
                }

                .signal-lab__copy {
                    margin: 0;
                    color: rgba(226, 232, 240, 0.76);
                    line-height: 1.65;
                }

                .signal-lab__stats {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 0.85rem;
                    margin: 1.25rem 0;
                }

                .signal-lab__stat {
                    padding: 0.9rem;
                    border-radius: 18px;
                    background: rgba(15, 23, 42, 0.6);
                    border: 1px solid rgba(148, 163, 184, 0.16);
                }

                .signal-lab__stat-label {
                    display: block;
                    color: rgba(148, 163, 184, 0.9);
                    font-size: 0.74rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    margin-bottom: 0.45rem;
                }

                .signal-lab__stat-value {
                    display: block;
                    font-size: 1.7rem;
                    font-weight: 700;
                    color: #ffffff;
                }

                .signal-lab__bar {
                    position: relative;
                    height: 10px;
                    border-radius: 999px;
                    background: rgba(148, 163, 184, 0.18);
                    overflow: hidden;
                }

                .signal-lab__bar-fill {
                    position: absolute;
                    inset: 0 auto 0 0;
                    width: ${this.completionPercent.value}%;
                    background: linear-gradient(90deg, #10b981, #34d399);
                    border-radius: inherit;
                    transition: width 180ms ease;
                }

                .signal-lab__status {
                    margin: 0.85rem 0 0;
                    color: #e2e8f0;
                    font-size: 0.94rem;
                }

                .signal-lab__actions {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.75rem;
                    margin-top: 1rem;
                }

                .signal-lab__button {
                    border: none;
                    border-radius: 12px;
                    padding: 0.75rem 1rem;
                    font: inherit;
                    font-weight: 600;
                    cursor: pointer;
                    transition: transform 0.15s ease, opacity 0.15s ease, background 0.15s ease;
                }

                .signal-lab__button:hover {
                    transform: translateY(-1px);
                }

                .signal-lab__button--primary {
                    background: #10b981;
                    color: #052e16;
                }

                .signal-lab__button--secondary {
                    background: rgba(255, 255, 255, 0.08);
                    color: #f8fafc;
                    border: 1px solid rgba(148, 163, 184, 0.24);
                }

                .signal-lab__code {
                    margin-top: 1.25rem;
                    padding: 0.95rem 1rem;
                    border-radius: 18px;
                    background: rgba(2, 6, 23, 0.88);
                    border: 1px solid rgba(148, 163, 184, 0.14);
                    overflow-x: auto;
                    color: #cbd5e1;
                    font-size: 0.82rem;
                    line-height: 1.7;
                    white-space: pre;
                }

                @media (max-width: 640px) {
                    .signal-lab__stats {
                        grid-template-columns: 1fr;
                    }

                    .signal-lab__code {
                        white-space: pre-wrap;
                    }
                }
            </style>

            <div class="signal-lab">
                <span class="signal-lab__eyebrow">Live Signals</span>
                <h3 class="signal-lab__title">useState + computed without a view-layer rerender loop</h3>
                <p class="signal-lab__copy">Update scoped values and derived metrics in place to show how NativeCore keeps interaction logic simple.</p>

                <div class="signal-lab__stats">
                    <div class="signal-lab__stat">
                        <span class="signal-lab__stat-label">Completed</span>
                        <span class="signal-lab__stat-value" id="completed-count">${this.completedItems.value}</span>
                    </div>
                    <div class="signal-lab__stat">
                        <span class="signal-lab__stat-label">Remaining</span>
                        <span class="signal-lab__stat-value" id="remaining-count">${this.remainingItems.value}</span>
                    </div>
                    <div class="signal-lab__stat">
                        <span class="signal-lab__stat-label">Completion</span>
                        <span class="signal-lab__stat-value" id="completion-percent">${this.completionPercent.value}%</span>
                    </div>
                </div>

                <div class="signal-lab__bar" aria-hidden="true">
                    <div class="signal-lab__bar-fill" id="completion-bar"></div>
                </div>

                <p class="signal-lab__status">Current status: <strong id="status-label">${this.statusLabel.value}</strong></p>

                <div class="signal-lab__actions">
                    <button class="signal-lab__button signal-lab__button--primary" type="button" data-action="complete-item">Complete item</button>
                    <button class="signal-lab__button signal-lab__button--secondary" type="button" data-action="add-item">Add scope</button>
                    <button class="signal-lab__button signal-lab__button--secondary" type="button" data-action="reset-items">Reset demo</button>
                </div>

                <div class="signal-lab__code">const completed = useState(14);
const total = useState(18);
const completion = computed(() =&gt; Math.round((completed.value / total.value) * 100));</div>
            </div>
        `;
  }
  onMount() {
    this.shadowRoot.addEventListener("click", this._handleClick);
    this._unwatchCompleted = this.completedItems.watch((value) => {
      const target = this.shadowRoot.querySelector("#completed-count");
      if (target) target.textContent = String(value);
    });
    this._unwatchTotal = this.totalItems.watch(() => {
      const percent = this.shadowRoot.querySelector("#completion-percent");
      if (percent) percent.textContent = `${this.completionPercent.value}%`;
    });
    this._unwatchCompletionPercent = this.completionPercent.watch((value) => {
      const percent = this.shadowRoot.querySelector("#completion-percent");
      const bar = this.shadowRoot.querySelector("#completion-bar");
      if (percent) percent.textContent = `${value}%`;
      if (bar) bar.style.width = `${value}%`;
    });
    this._unwatchRemainingItems = this.remainingItems.watch((value) => {
      const target = this.shadowRoot.querySelector("#remaining-count");
      if (target) target.textContent = String(value);
    });
    this._unwatchStatusLabel = this.statusLabel.watch((value) => {
      const target = this.shadowRoot.querySelector("#status-label");
      if (target) target.textContent = value;
    });
  }
  onUnmount() {
    this.shadowRoot?.removeEventListener("click", this._handleClick);
    this._unwatchCompleted?.();
    this._unwatchTotal?.();
    this._unwatchCompletionPercent?.();
    this._unwatchRemainingItems?.();
    this._unwatchStatusLabel?.();
    this.completionPercent.dispose();
    this.remainingItems.dispose();
    this.statusLabel.dispose();
  }
}
defineComponent("dashboard-signal-lab", DashboardSignalLab);
export {
  DashboardSignalLab
};

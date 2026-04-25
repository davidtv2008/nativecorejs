import { Component, defineComponent } from "@core/component.js";
import { html } from "@core-utils/templates.js";
class NcSelect extends Component {
  static useShadowDOM = true;
  static attributeOptions = {
    variant: ["default", "filled"],
    size: ["sm", "md", "lg"]
  };
  static get observedAttributes() {
    return ["options", "value", "placeholder", "name", "disabled", "size", "variant", "searchable"];
  }
  _open = false;
  _filterText = "";
  constructor() {
    super();
  }
  _getOptions() {
    try {
      const raw = this.getAttribute("options");
      if (raw) return JSON.parse(raw);
    } catch {
    }
    return [];
  }
  _getSelectedLabel() {
    const value = this.getAttribute("value") || "";
    if (!value) return "";
    const opt = this._getOptions().find((o) => o.value === value);
    return opt?.label ?? value;
  }
  template() {
    const value = this.getAttribute("value") || "";
    const placeholder = this.getAttribute("placeholder") || "Select...";
    const disabled = this.hasAttribute("disabled");
    const searchable = this.hasAttribute("searchable");
    const selectedLabel = this._getSelectedLabel() || placeholder;
    const hasValue = !!value;
    const options = this._getOptions();
    const filtered = this._filterText ? options.filter((o) => o.label.toLowerCase().includes(this._filterText.toLowerCase())) : options;
    const optionItems = filtered.map((o) => `
            <div class="option${o.value === value ? " option--selected" : ""}${o.disabled ? " option--disabled" : ""}"
                 data-value="${o.value}"
                 role="option"
                 aria-selected="${o.value === value}"
                 aria-disabled="${o.disabled ? "true" : "false"}">
                ${o.label}
                ${o.value === value ? `
                <svg class="option__check" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="none" width="12" height="12">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>` : ""}
            </div>
        `).join("");
    return html`
            <style>
                :host {
                    display: inline-block;
                    position: relative;
                    font-family: var(--nc-font-family);
                    width: 100%;
                }

                .select-trigger {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    width: 100%;
                    box-sizing: border-box;
                    padding: var(--nc-spacing-sm) var(--nc-spacing-md);
                    background: var(--nc-bg);
                    border: var(--nc-input-border);
                    border-radius: var(--nc-input-radius);
                    cursor: ${disabled ? "not-allowed" : "pointer"};
                    color: ${hasValue ? "var(--nc-text)" : "var(--nc-text-muted)"};
                    font-size: var(--nc-font-size-base);
                    transition: border-color var(--nc-transition-fast), box-shadow var(--nc-transition-fast);
                    opacity: ${disabled ? "0.5" : "1"};
                    user-select: none;
                    gap: var(--nc-spacing-sm);
                    min-height: 40px;
                }

                /* Size variants */
                :host([size="sm"]) .select-trigger {
                    padding: var(--nc-spacing-xs) var(--nc-spacing-sm);
                    font-size: var(--nc-font-size-sm);
                    min-height: 32px;
                }

                :host([size="lg"]) .select-trigger {
                    padding: var(--nc-spacing-md) var(--nc-spacing-lg);
                    font-size: var(--nc-font-size-lg);
                    min-height: 48px;
                }

                /* Filled variant */
                :host([variant="filled"]) .select-trigger {
                    background: var(--nc-bg-tertiary);
                    border-color: transparent;
                }

                :host([variant="filled"]) .select-trigger:hover:not([disabled]) {
                    background: var(--nc-bg-secondary);
                }

                .select-trigger:hover {
                    border-color: var(--nc-input-focus-border);
                }

                .select-trigger.open {
                    border-color: var(--nc-input-focus-border);
                    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
                }

                .trigger-label {
                    flex: 1;
                    overflow: hidden;
                    white-space: nowrap;
                    text-overflow: ellipsis;
                }

                .chevron {
                    flex-shrink: 0;
                    transition: transform var(--nc-transition-fast);
                    color: var(--nc-text-muted);
                }

                .chevron.open {
                    transform: rotate(180deg);
                }

                /* Dropdown */
                .dropdown {
                    display: none;
                    position: absolute;
                    top: calc(100% + 4px);
                    left: 0;
                    right: 0;
                    background: var(--nc-bg);
                    border: var(--nc-input-border);
                    border-radius: var(--nc-radius-md);
                    box-shadow: var(--nc-shadow-lg);
                    z-index: var(--nc-z-dropdown);
                    overflow: hidden;
                    max-height: 240px;
                    flex-direction: column;
                }

                .dropdown.open {
                    display: flex;
                }

                .search-wrap {
                    padding: var(--nc-spacing-xs) var(--nc-spacing-sm);
                    border-bottom: 1px solid var(--nc-border);
                }

                .search-input {
                    width: 100%;
                    box-sizing: border-box;
                    border: var(--nc-input-border);
                    border-radius: var(--nc-radius-sm);
                    padding: var(--nc-spacing-xs) var(--nc-spacing-sm);
                    font-size: var(--nc-font-size-sm);
                    font-family: var(--nc-font-family);
                    color: var(--nc-text);
                    background: var(--nc-bg-secondary);
                    outline: none;
                }

                .search-input:focus {
                    border-color: var(--nc-input-focus-border);
                }

                .options-list {
                    overflow-y: auto;
                    flex: 1;
                }

                .option {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: var(--nc-spacing-sm) var(--nc-spacing-md);
                    cursor: pointer;
                    font-size: var(--nc-font-size-base);
                    color: var(--nc-text);
                    transition: background var(--nc-transition-fast);
                    gap: var(--nc-spacing-sm);
                }

                .option:hover:not(.option--disabled) {
                    background: var(--nc-bg-secondary);
                }

                .option--selected {
                    color: var(--nc-primary);
                    font-weight: var(--nc-font-weight-medium);
                }

                .option--disabled {
                    opacity: 0.4;
                    cursor: not-allowed;
                }

                .option__check {
                    flex-shrink: 0;
                }

                .empty {
                    padding: var(--nc-spacing-md);
                    text-align: center;
                    color: var(--nc-text-muted);
                    font-size: var(--nc-font-size-sm);
                }
            </style>

            <input type="hidden"
                name="${this.getAttribute("name") || ""}"
                value="${value}"
            />

            <div class="select-trigger${this._open ? " open" : ""}" role="combobox" aria-expanded="${this._open}" aria-haspopup="listbox">
                <span class="trigger-label">${selectedLabel}</span>
                <svg class="chevron${this._open ? " open" : ""}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" width="16" height="16">
                    <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>

            <div class="dropdown${this._open ? " open" : ""}" role="listbox">
                ${searchable ? `
                <div class="search-wrap">
                    <input class="search-input" type="text" placeholder="Search..." value="${this._filterText}" autocomplete="off" />
                </div>` : ""}
                <div class="options-list">
                    ${optionItems || `<div class="empty">No options</div>`}
                </div>
            </div>
        `;
  }
  onMount() {
    if (!this.hasAttribute("tabindex")) {
      this.setAttribute("tabindex", "0");
    }
    const sr = this.shadowRoot;
    sr.addEventListener("click", (e) => {
      if (this.hasAttribute("disabled")) return;
      const target = e.target;
      const option = target.closest(".option");
      if (option) {
        if (option.classList.contains("option--disabled")) return;
        this._select(option.dataset.value ?? "");
        return;
      }
      if (target.closest(".select-trigger")) {
        this._setOpen(!this._open);
      }
    });
    sr.addEventListener("input", (e) => {
      const input = e.target;
      if (input.classList.contains("search-input")) {
        this._filterText = input.value;
        this._rerenderDropdown();
      }
    });
    document.addEventListener("click", this._onOutsideClick);
    this.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this._setOpen(false);
        return;
      }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this._setOpen(!this._open);
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        this._navigateOptions(e.key === "ArrowDown" ? 1 : -1);
      }
    });
  }
  _onOutsideClick = (e) => {
    if (!this.contains(e.target) && !this.shadowRoot.contains(e.target)) {
      this._setOpen(false);
    }
  };
  _setOpen(open) {
    this._open = open;
    if (!open) this._filterText = "";
    const sr = this.shadowRoot;
    const trigger = sr.querySelector(".select-trigger");
    const chevron = sr.querySelector(".chevron");
    const dropdown = sr.querySelector(".dropdown");
    if (trigger) {
      trigger.classList.toggle("open", open);
      trigger.setAttribute("aria-expanded", String(open));
    }
    if (chevron) chevron.classList.toggle("open", open);
    if (dropdown) {
      dropdown.classList.toggle("open", open);
      if (!open) {
        const searchInput = dropdown.querySelector(".search-input");
        if (searchInput) searchInput.value = "";
        this._rerenderDropdown();
      }
    }
    if (open) {
      const search = sr.querySelector(".search-input");
      if (search) search.focus();
    }
  }
  _rerenderDropdown() {
    const sr = this.shadowRoot;
    const list = sr.querySelector(".options-list");
    if (!list) return;
    const value = this.getAttribute("value") || "";
    const options = this._getOptions();
    const filtered = this._filterText ? options.filter((o) => o.label.toLowerCase().includes(this._filterText.toLowerCase())) : options;
    list.innerHTML = filtered.length ? filtered.map((o) => `
            <div class="option${o.value === value ? " option--selected" : ""}${o.disabled ? " option--disabled" : ""}"
                 data-value="${o.value}"
                 role="option"
                 aria-selected="${o.value === value}"
                 aria-disabled="${o.disabled ? "true" : "false"}">
                ${o.label}
                ${o.value === value ? `
                <svg class="option__check" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="none" width="12" height="12">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>` : ""}
            </div>
        `).join("") : '<div class="empty">No results</div>';
  }
  _select(value) {
    const opts = this._getOptions();
    const opt = opts.find((o) => o.value === value);
    if (!opt) return;
    this._open = false;
    this._filterText = "";
    const sr = this.shadowRoot;
    const label = sr.querySelector(".trigger-label");
    if (label) label.textContent = opt.label;
    const hidden = sr.querySelector('input[type="hidden"]');
    if (hidden) hidden.value = value;
    this._setOpen(false);
    this.setAttribute("value", value);
    this.dispatchEvent(new CustomEvent("change", {
      bubbles: true,
      composed: true,
      detail: {
        value,
        label: opt.label,
        name: this.getAttribute("name") || ""
      }
    }));
  }
  _navigateOptions(direction) {
    const opts = this._getOptions().filter((o) => !o.disabled);
    const current = this.getAttribute("value") || "";
    const idx = opts.findIndex((o) => o.value === current);
    const next = opts[Math.max(0, Math.min(opts.length - 1, idx + direction))];
    if (next) this._select(next.value);
  }
  onUnmount() {
    document.removeEventListener("click", this._onOutsideClick);
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue && this._mounted) {
      this.render();
    }
  }
}
defineComponent("nc-select", NcSelect);
export {
  NcSelect
};

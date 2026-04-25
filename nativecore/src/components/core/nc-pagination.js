import { Component, defineComponent } from "@core/component.js";
import { html, trusted } from "@core-utils/templates.js";
class NcPagination extends Component {
  static useShadowDOM = true;
  static get observedAttributes() {
    return ["page", "total", "siblings", "show-first-last", "disabled", "size", "variant"];
  }
  _buildPages(current, total, siblings) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const left = Math.max(2, current - siblings);
    const right = Math.min(total - 1, current + siblings);
    const pages = [1];
    if (left > 2) pages.push("...");
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < total - 1) pages.push("...");
    pages.push(total);
    return pages;
  }
  template() {
    const current = Number(this.getAttribute("page") || 1);
    const total = Number(this.getAttribute("total") || 1);
    const siblings = Number(this.getAttribute("siblings") ?? 1);
    const showFirstLast = this.hasAttribute("show-first-last");
    const disabled = this.hasAttribute("disabled");
    const pages = this._buildPages(current, total, siblings);
    const atFirst = current <= 1;
    const atLast = current >= total;
    const navBtn = (dir, label, dis) => `
            <button class="btn btn--nav" data-dir="${dir}" ${dis || disabled ? "disabled" : ""} aria-label="${label}">
                ${dir === "prev" || dir === "first" ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M${dir === "first" ? "12 3L7 8l5 5M7 3L2 8l5 5" : "10 3L5 8l5 5"}" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>` : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M${dir === "last" ? "4 3l5 5-5 5M9 3l5 5-5 5" : "6 3l5 5-5 5"}" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`}
            </button>`;
    return html`
            <style>
                :host { display: block; font-family: var(--nc-font-family); }

                .pagination {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    flex-wrap: wrap;
                    opacity: ${disabled ? "0.5" : "1"};
                    pointer-events: ${disabled ? "none" : "auto"};
                }

                .btn {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid var(--nc-border);
                    background: var(--nc-bg);
                    color: var(--nc-text);
                    cursor: pointer;
                    border-radius: var(--nc-radius-sm, 6px);
                    font-family: var(--nc-font-family);
                    font-size: var(--nc-font-size-sm);
                    transition: background var(--nc-transition-fast), color var(--nc-transition-fast), border-color var(--nc-transition-fast);
                    min-width: 36px;
                    height: 36px;
                    padding: 0 6px;
                }

                :host([size="sm"]) .btn { min-width: 28px; height: 28px; font-size: var(--nc-font-size-xs); }
                :host([size="lg"]) .btn { min-width: 44px; height: 44px; font-size: var(--nc-font-size-base); }

                .btn:hover:not(:disabled):not(.btn--active) { background: var(--nc-bg-secondary); border-color: var(--nc-border-dark); }
                .btn:disabled { opacity: 0.4; cursor: not-allowed; }

                .btn--active {
                    background: var(--nc-primary);
                    color: #fff;
                    border-color: var(--nc-primary);
                    font-weight: var(--nc-font-weight-semibold);
                    pointer-events: none;
                }

                :host([variant="outline"]) .btn--active {
                    background: transparent;
                    color: var(--nc-primary);
                }

                .ellipsis {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 36px;
                    height: 36px;
                    font-size: var(--nc-font-size-sm);
                    color: var(--nc-text-muted);
                }
            </style>
            <nav aria-label="Pagination" class="pagination">
                ${showFirstLast ? trusted(navBtn("first", "First page", atFirst)) : ""}
                ${trusted(navBtn("prev", "Previous page", atFirst))}
                ${trusted(pages.map(
      (p) => p === "..." ? `<span class="ellipsis" aria-hidden="true">...</span>` : `<button class="btn${p === current ? " btn--active" : ""}" data-page="${p}" aria-label="Page ${p}" aria-current="${p === current ? "page" : "false"}">${p}</button>`
    ).join(""))}
                ${trusted(navBtn("next", "Next page", atLast))}
                ${showFirstLast ? trusted(navBtn("last", "Last page", atLast)) : ""}
            </nav>
        `;
  }
  onMount() {
    this._bindEvents();
  }
  _bindEvents() {
    this.$(".pagination").addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn || btn.disabled) return;
      const current = Number(this.getAttribute("page") || 1);
      const total = Number(this.getAttribute("total") || 1);
      let next = current;
      if (btn.dataset.page) {
        next = Number(btn.dataset.page);
      } else {
        switch (btn.dataset.dir) {
          case "first":
            next = 1;
            break;
          case "prev":
            next = Math.max(1, current - 1);
            break;
          case "next":
            next = Math.min(total, current + 1);
            break;
          case "last":
            next = total;
            break;
        }
      }
      if (next !== current) {
        this.setAttribute("page", String(next));
        this.dispatchEvent(new CustomEvent("change", {
          bubbles: true,
          composed: true,
          detail: { page: next }
        }));
      }
    });
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue && this._mounted) {
      this.render();
      this._bindEvents();
    }
  }
}
defineComponent("nc-pagination", NcPagination);
export {
  NcPagination
};

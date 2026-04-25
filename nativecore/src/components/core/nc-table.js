import { Component, defineComponent } from "@core/component.js";
import { html } from "@core-utils/templates.js";
function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
class NcTable extends Component {
  static useShadowDOM = true;
  static get observedAttributes() {
    return ["columns", "rows", "sortable", "striped", "compact", "sticky-header", "empty", "max-height"];
  }
  _sortKey = "";
  _sortDir = "asc";
  _parseColumns() {
    try {
      const raw = this.getAttribute("columns") ?? "[]";
      const cols = JSON.parse(raw);
      return Array.isArray(cols) ? cols : [];
    } catch {
      return [];
    }
  }
  _parseRows() {
    try {
      const raw = this.getAttribute("rows") ?? "[]";
      const rows = JSON.parse(raw);
      return Array.isArray(rows) ? rows : [];
    } catch {
      return [];
    }
  }
  _sortedRows(rows, columns) {
    if (!this._sortKey) return rows;
    const col = columns.find((c) => c.key === this._sortKey);
    if (!col) return rows;
    const dir = this._sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = a[this._sortKey];
      const vb = b[this._sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return -1 * dir;
      if (vb == null) return 1 * dir;
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      const sa = String(va).toLowerCase();
      const sb = String(vb).toLowerCase();
      return sa.localeCompare(sb) * dir;
    });
  }
  _fmt(value, col) {
    if (value == null) return "";
    switch (col.format) {
      case "number":
        return typeof value === "number" ? String(value) : esc(value);
      case "currency":
        return typeof value === "number" ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value) : esc(value);
      case "date": {
        const d = new Date(String(value));
        return isNaN(d.getTime()) ? esc(value) : d.toLocaleDateString();
      }
      case "badge":
        return `<span class="badge">${esc(value)}</span>`;
      default:
        return esc(value);
    }
  }
  template() {
    const columns = this._parseColumns();
    const rows = this._sortedRows(this._parseRows(), columns);
    const striped = this.hasAttribute("striped");
    const compact = this.hasAttribute("compact");
    const stickyHeader = this.hasAttribute("sticky-header");
    const emptyText = this.getAttribute("empty") ?? "No data available";
    const maxHeight = this.getAttribute("max-height") ?? "";
    const sortableAll = this.hasAttribute("sortable");
    const tableRows = rows.length === 0 ? `<tr><td class="empty" colspan="${Math.max(columns.length, 1)}">${esc(emptyText)}</td></tr>` : rows.map((row, rowIndex) => `
                <tr data-row-index="${rowIndex}">
                    ${columns.map((col) => {
      const align = col.align ?? "left";
      return html`<td style="text-align:${align}">${this._fmt(row[col.key], col)}</td>`;
    }).join("")}
                </tr>
            `).join("");
    const headers = columns.map((col) => {
      const align = col.align ?? "left";
      const sortable = sortableAll && col.sortable !== false;
      const active = this._sortKey === col.key;
      const arrow = active ? this._sortDir === "asc" ? "\u25B2" : "\u25BC" : "";
      return `
                <th style="text-align:${align};${col.width ? `width:${col.width};` : ""}">
                    <button class="head-btn ${sortable ? "is-sortable" : ""} ${active ? "is-active" : ""}" type="button" ${sortable ? `data-sort-key="${col.key}"` : "disabled"}>
                        <span>${esc(col.label ?? col.key)}</span>
                        <span class="sort-indicator">${arrow}</span>
                    </button>
                </th>
            `;
    }).join("");
    return `
            <style>
                :host { display: block; font-family: var(--nc-font-family); }
                .wrap {
                    border: 1px solid var(--nc-border);
                    border-radius: var(--nc-radius-lg);
                    overflow: auto;
                    background: var(--nc-bg);
                    ${maxHeight ? `max-height:${maxHeight};` : ""}
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    min-width: 480px;
                }
                thead th {
                    position: ${stickyHeader ? "sticky" : "static"};
                    top: 0;
                    z-index: 1;
                    background: var(--nc-bg-secondary);
                    border-bottom: 1px solid var(--nc-border);
                    padding: 0;
                    font-size: var(--nc-font-size-xs);
                    text-transform: uppercase;
                    letter-spacing: .04em;
                    color: var(--nc-text-muted);
                }
                .head-btn {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    padding: ${compact ? "10px 12px" : "14px 16px"};
                    background: none;
                    border: none;
                    cursor: default;
                    font: inherit;
                    color: inherit;
                    text-align: inherit;
                }
                .head-btn.is-sortable { cursor: pointer; }
                .head-btn.is-sortable:hover { background: rgba(0,0,0,.03); }
                .head-btn.is-active { color: var(--nc-text); }
                tbody tr {
                    transition: background var(--nc-transition-fast);
                    cursor: pointer;
                }
                tbody tr:hover { background: rgba(0,0,0,.02); }
                ${striped ? "tbody tr:nth-child(even) { background: var(--nc-bg-secondary); }" : ""}
                td {
                    padding: ${compact ? "10px 12px" : "14px 16px"};
                    border-bottom: 1px solid var(--nc-border);
                    font-size: var(--nc-font-size-sm);
                    color: var(--nc-text-secondary);
                    vertical-align: top;
                }
                tbody tr:last-child td { border-bottom: none; }
                .empty {
                    text-align: center;
                    color: var(--nc-text-muted);
                    padding: 28px 16px;
                    cursor: default;
                }
                .badge {
                    display: inline-flex;
                    align-items: center;
                    padding: 2px 8px;
                    border-radius: 99px;
                    background: rgba(var(--nc-primary-rgb, 99,102,241), .12);
                    color: var(--nc-primary);
                    font-size: var(--nc-font-size-xs);
                    font-weight: var(--nc-font-weight-medium);
                }
                .sort-indicator {
                    min-width: 1em;
                    font-size: 10px;
                    text-align: center;
                    color: var(--nc-text-muted);
                }
            </style>
            <div class="wrap">
                <table role="table">
                    <thead><tr>${headers}</tr></thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>
        `;
  }
  onMount() {
    this.shadowRoot.addEventListener("click", (e) => {
      const sortBtn = e.target.closest("[data-sort-key]");
      if (sortBtn) {
        const key = sortBtn.dataset.sortKey ?? "";
        if (this._sortKey === key) this._sortDir = this._sortDir === "asc" ? "desc" : "asc";
        else {
          this._sortKey = key;
          this._sortDir = "asc";
        }
        this.render();
        this.dispatchEvent(new CustomEvent("sort", {
          detail: { key: this._sortKey, direction: this._sortDir },
          bubbles: true,
          composed: true
        }));
        return;
      }
      const row = e.target.closest("tbody tr[data-row-index]");
      if (row) {
        const index = parseInt(row.dataset.rowIndex ?? "-1", 10);
        const rows = this._sortedRows(this._parseRows(), this._parseColumns());
        if (index >= 0 && rows[index]) {
          this.dispatchEvent(new CustomEvent("row-click", {
            detail: { row: rows[index], index },
            bubbles: true,
            composed: true
          }));
        }
      }
    });
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue && this._mounted) this.render();
  }
}
defineComponent("nc-table", NcTable);
export {
  NcTable
};

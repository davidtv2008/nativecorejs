/**
 * NcTable Component - lightweight sortable data table
 *
 * Renders a table from JSON data with optional sorting, striping, compact mode,
 * sticky header, and simple empty state. Zero dependencies.
 *
 * Attributes:
 *   columns   - JSON array of column defs:
 *               [{ key, label?, sortable?, align?, width?, format? }]
 *               format: 'text'(default)|'number'|'currency'|'date'|'badge'
 *   rows      - JSON array of row objects
 *   sortable  - boolean - enable sorting on all columns unless column.sortable=false
 *   striped   - boolean - alternating row backgrounds
 *   compact   - boolean - reduced cell padding
 *   sticky-header - boolean - sticky thead
 *   empty     - empty state text (default: 'No data available')
 *   max-height - CSS value to constrain height and enable scrolling
 *
 * Events:
 *   sort  - CustomEvent<{ key: string; direction: 'asc'|'desc' }>
 *   row-click - CustomEvent<{ row: Record<string, unknown>; index: number }>
 *
 * Usage:
 *   <nc-table
 *      sortable
 *      striped
 *      columns='[{"key":"name","label":"Name"},{"key":"role","label":"Role"}]'
 *      rows='[{"name":"Alice","role":"Admin"},{"name":"Bob","role":"Editor"}]'>
 *   </nc-table>
 */
import { Component, defineComponent } from '../../.nativecore/core/component.js';

type TableAlign = 'left' | 'center' | 'right';
interface TableColumn {
    key: string;
    label?: string;
    sortable?: boolean;
    align?: TableAlign;
    width?: string;
    format?: 'text' | 'number' | 'currency' | 'date' | 'badge';
}

type TableRow = Record<string, unknown>;

function esc(s: unknown): string {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export class NcTable extends Component {
    static useShadowDOM = true;

    static get observedAttributes() {
        return ['columns', 'rows', 'sortable', 'striped', 'compact', 'sticky-header', 'empty', 'max-height'];
    }

    private _sortKey = '';
    private _sortDir: 'asc' | 'desc' = 'asc';

    private _parseColumns(): TableColumn[] {
        try {
            const raw = this.getAttribute('columns') ?? '[]';
            const cols = JSON.parse(raw) as TableColumn[];
            return Array.isArray(cols) ? cols : [];
        } catch {
            return [];
        }
    }

    private _parseRows(): TableRow[] {
        try {
            const raw = this.getAttribute('rows') ?? '[]';
            const rows = JSON.parse(raw) as TableRow[];
            return Array.isArray(rows) ? rows : [];
        } catch {
            return [];
        }
    }

    private _sortedRows(rows: TableRow[], columns: TableColumn[]): TableRow[] {
        if (!this._sortKey) return rows;
        const col = columns.find(c => c.key === this._sortKey);
        if (!col) return rows;
        const dir = this._sortDir === 'asc' ? 1 : -1;
        return [...rows].sort((a, b) => {
            const va = a[this._sortKey];
            const vb = b[this._sortKey];
            if (va == null && vb == null) return 0;
            if (va == null) return -1 * dir;
            if (vb == null) return 1 * dir;
            if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
            const sa = String(va).toLowerCase();
            const sb = String(vb).toLowerCase();
            return sa.localeCompare(sb) * dir;
        });
    }

    private _fmt(value: unknown, col: TableColumn): string {
        if (value == null) return '';
        switch (col.format) {
            case 'number':
                return typeof value === 'number' ? String(value) : esc(value);
            case 'currency':
                return typeof value === 'number'
                    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
                    : esc(value);
            case 'date': {
                const d = new Date(String(value));
                return isNaN(d.getTime()) ? esc(value) : d.toLocaleDateString();
            }
            case 'badge':
                return `<span class="badge">${esc(value)}</span>`;
            default:
                return esc(value);
        }
    }

    template() {
        const columns      = this._parseColumns();
        const rows         = this._sortedRows(this._parseRows(), columns);
        const striped      = this.hasAttribute('striped');
        const compact      = this.hasAttribute('compact');
        const stickyHeader = this.hasAttribute('sticky-header');
        const emptyText    = this.getAttribute('empty') ?? 'No data available';
        const maxHeight    = this.getAttribute('max-height') ?? '';
        const sortableAll  = this.hasAttribute('sortable');

        const tableRows = rows.length === 0
            ? `<tr><td class="empty" colspan="${Math.max(columns.length, 1)}">${esc(emptyText)}</td></tr>`
            : rows.map((row, rowIndex) => `
                <tr data-row-index="${rowIndex}">
                    ${columns.map(col => {
                        const align = col.align ?? 'left';
                        return `<td style="text-align:${align}">${this._fmt(row[col.key], col)}</td>`;
                    }).join('')}
                </tr>
            `).join('');

        const headers = columns.map(col => {
            const align    = col.align ?? 'left';
            const sortable = sortableAll && col.sortable !== false;
            const active   = this._sortKey === col.key;
            const arrow    = active ? (this._sortDir === 'asc' ? '?' : '?') : '';
            return `
                <th style="text-align:${align};${col.width ? `width:${col.width};` : ''}">
                    <button class="head-btn ${sortable ? 'is-sortable' : ''} ${active ? 'is-active' : ''}" type="button" ${sortable ? `data-sort-key="${col.key}"` : 'disabled'}>
                        <span>${esc(col.label ?? col.key)}</span>
                        <span class="sort-indicator">${arrow}</span>
                    </button>
                </th>
            `;
        }).join('');

        return `
            <style>
                :host { display: block; font-family: var(--nc-font-family); }
                .wrap {
                    border: 1px solid var(--nc-border);
                    border-radius: var(--nc-radius-lg);
                    overflow: auto;
                    background: var(--nc-bg);
                    ${maxHeight ? `max-height:${maxHeight};` : ''}
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    min-width: 480px;
                }
                thead th {
                    position: ${stickyHeader ? 'sticky' : 'static'};
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
                    padding: ${compact ? '10px 12px' : '14px 16px'};
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
                ${striped ? 'tbody tr:nth-child(even) { background: var(--nc-bg-secondary); }' : ''}
                td {
                    padding: ${compact ? '10px 12px' : '14px 16px'};
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
        this.shadowRoot!.addEventListener('click', (e) => {
            const sortBtn = (e.target as HTMLElement).closest<HTMLElement>('[data-sort-key]');
            if (sortBtn) {
                const key = sortBtn.dataset.sortKey ?? '';
                if (this._sortKey === key) this._sortDir = this._sortDir === 'asc' ? 'desc' : 'asc';
                else { this._sortKey = key; this._sortDir = 'asc'; }
                this.render();
                this.dispatchEvent(new CustomEvent('sort', {
                    detail: { key: this._sortKey, direction: this._sortDir }, bubbles: true, composed: true,
                }));
                return;
            }

            const row = (e.target as HTMLElement).closest<HTMLTableRowElement>('tbody tr[data-row-index]');
            if (row) {
                const index = parseInt(row.dataset.rowIndex ?? '-1', 10);
                const rows  = this._sortedRows(this._parseRows(), this._parseColumns());
                if (index >= 0 && rows[index]) {
                    this.dispatchEvent(new CustomEvent('row-click', {
                        detail: { row: rows[index], index }, bubbles: true, composed: true,
                    }));
                }
            }
        });
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue !== newValue && this._mounted) this.render();
    }
}

defineComponent('nc-table', NcTable);



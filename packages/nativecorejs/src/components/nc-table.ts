/**
 * NcTable Component — lightweight sortable data table
 *
 * Accepts two data shapes via the `rows` attribute or the `rows` JS property:
 *
 *   2-D array  (simple):
 *     rows='[["Name","Age"],["Alice",30],["Bob",25]]'
 *     Add `header` attribute → first row becomes the column header.
 *
 *   Array of objects (keyed):
 *     rows='[{"name":"Alice","age":30},{"name":"Bob","age":25}]'
 *     Column keys are inferred from the first object.
 *     Add `header` attribute → keys are used as header labels.
 *
 *   JS property (recommended for dynamic data):
 *     table.rows = myArray;   // 2-D or object[], no JSON.stringify needed
 *
 * Attributes:
 *   rows          — JSON (see above)
 *   header        — boolean — show column headers
 *   sortable      — boolean — enable click-to-sort on headers
 *   striped       — boolean — alternating row backgrounds
 *   compact       — boolean — reduced cell padding
 *   sticky-header — boolean — fix thead on scroll
 *   empty         — string  — empty state text (default: 'No data available')
 *   max-height    — CSS value — enables vertical scroll (e.g. '320px')
 *
 * Events:
 *   sort      — CustomEvent<{ key: string; direction: 'asc'|'desc' }>
 *   row-click — CustomEvent<{ row: Record<string,unknown>; index: number }>
 *
 * Usage (simple):
 *   <nc-table header sortable striped
 *     rows='[["Name","Role"],["Alice","Admin"],["Bob","Editor"]]'>
 *   </nc-table>
 *
 * Usage (keyed objects):
 *   <nc-table header striped
 *     rows='[{"name":"Alice","role":"Admin"},{"name":"Bob","role":"Editor"}]'>
 *   </nc-table>
 *
 * Usage (programmatic + pagination):
 *   const table = document.querySelector('nc-table');
 *   const pager = document.querySelector('nc-pagination');
 *   pager.addEventListener('change', ({ detail }) => {
 *     table.rows = allRows.slice(detail.offset, detail.offset + detail.limit);
 *   });
 */
import { CoreComponent } from '../../.nativecore/core/component.js';
import { css } from '../../.nativecore/utils/templates.js';

type TableAlign = 'left' | 'center' | 'right';
interface ColDef { key: string; label: string; align: TableAlign; }
type TableRow = Record<string, unknown>;

function esc(s: unknown): string {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export class NcTable extends CoreComponent {
    static useShadowDOM = true;
    static observedAttributes = ['rows', 'header', 'sortable', 'striped', 'compact', 'sticky-header', 'empty', 'max-height'];
    static attributeOrder     = ['rows', 'header', 'sortable', 'striped', 'compact', 'sticky-header', 'empty', 'max-height'];

    // -- Refs -----------------------------------------------------------------
    declare wrapEl:      HTMLDivElement;
    declare theadEl:     HTMLTableSectionElement;
    declare headerRowEl: HTMLTableRowElement;
    declare tbodyEl:     HTMLTableSectionElement;

    // -- JS property ----------------------------------------------------------
    private _rowsOverride: unknown[] | null = null;

    /** Set rows directly from JS — accepts 2-D array or array of objects. */
    get rows(): unknown[] {
        return this._rowsOverride ?? this._parseAttr();
    }
    set rows(value: unknown[]) {
        this._rowsOverride = Array.isArray(value) ? value : [];
        if (this.isConnected) this._render();
    }

    // -- Sort state -----------------------------------------------------------
    private _sortKey = '';
    private _sortDir: 'asc' | 'desc' = 'asc';

    // -- Data helpers ---------------------------------------------------------
    private _parseAttr(): unknown[] {
        try {
            const raw = this.getAttribute('rows') ?? '[]';
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch { return []; }
    }

    /** Normalise any input shape into ColDefs + uniform row objects. */
    private _normalise(raw: unknown[]): { cols: ColDef[]; rows: TableRow[] } {
        if (raw.length === 0) return { cols: [], rows: [] };
        const hasHeader = this.hasAttribute('header');

        // 2-D array
        if (Array.isArray(raw[0])) {
            const grid = raw as unknown[][];
            let cols: ColDef[];
            let dataRows: unknown[][];
            if (hasHeader) {
                cols     = (grid[0]).map(h => ({ key: String(h), label: String(h), align: 'left' }));
                dataRows = grid.slice(1);
            } else {
                const w = Math.max(...grid.map(r => r.length));
                cols     = Array.from({ length: w }, (_, i) => ({ key: String(i), label: String(i), align: 'left' as TableAlign }));
                dataRows = grid;
            }
            const rows: TableRow[] = dataRows.map(r =>
                Object.fromEntries((r as unknown[]).map((cell, i) => [cols[i]?.key ?? String(i), cell]))
            );
            return { cols, rows };
        }

        // Array of objects
        const objRows = raw as TableRow[];
        const keys = Object.keys(objRows[0] ?? {});
        const cols: ColDef[] = keys.map(k => ({ key: k, label: k, align: 'left' }));
        return { cols, rows: objRows };
    }

    private _sorted(rows: TableRow[], cols: ColDef[]): TableRow[] {
        if (!this._sortKey) return rows;
        const col = cols.find(c => c.key === this._sortKey);
        if (!col) return rows;
        const dir = this._sortDir === 'asc' ? 1 : -1;
        return [...rows].sort((a, b) => {
            const va = a[this._sortKey], vb = b[this._sortKey];
            if (va == null && vb == null) return 0;
            if (va == null) return -1 * dir;
            if (vb == null) return  1 * dir;
            if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
            return String(va).toLowerCase().localeCompare(String(vb).toLowerCase()) * dir;
        });
    }

    // -- Template -------------------------------------------------------------
    static styles = css`
        :host { display: block; font-family: var(--nc-font-family); }
        .wrap {
            border: 1px solid var(--nc-border);
            border-radius: var(--nc-radius-lg);
            overflow: auto;
            background: var(--nc-bg);
        }
        table { width: 100%; border-collapse: collapse; min-width: 320px; }
        thead th {
            background: var(--nc-bg-secondary);
            border-bottom: 1px solid var(--nc-border);
            padding: 0;
            font-size: var(--nc-font-size-xs);
            text-transform: uppercase;
            letter-spacing: .04em;
            color: var(--nc-text-muted);
        }
        :host([sticky-header]) thead th { position: sticky; top: 0; z-index: 1; }
        .head-btn {
            width: 100%; display: flex; align-items: center;
            justify-content: space-between; gap: 8px;
            padding: 14px 16px;
            background: none; border: none; cursor: default;
            font: inherit; color: inherit; text-align: inherit;
        }
        :host([compact]) .head-btn { padding: 10px 12px; }
        .head-btn.sortable { cursor: pointer; }
        .head-btn.sortable:hover { background: rgba(0,0,0,.03); }
        .head-btn.active { color: var(--nc-text); }
        tbody tr { transition: background var(--nc-transition-fast); cursor: pointer; }
        tbody tr:hover { background: rgba(0,0,0,.02); }
        :host([striped]) tbody tr:nth-child(even) { background: var(--nc-bg-secondary); }
        td {
            padding: 14px 16px;
            border-bottom: 1px solid var(--nc-border);
            font-size: var(--nc-font-size-sm);
            color: var(--nc-text-secondary);
            vertical-align: top;
        }
        :host([compact]) td { padding: 10px 12px; }
        tbody tr:last-child td { border-bottom: none; }
        .empty { text-align: center; color: var(--nc-text-muted); padding: 28px 16px; cursor: default; }
        .sort-icon { min-width: 1em; font-size: 10px; text-align: center; color: var(--nc-text-muted); }
    `;

    template() {
        return `            <div ref="wrapEl" class="wrap">
                <table role="table">
                    <thead ref="theadEl"><tr ref="headerRowEl"></tr></thead>
                    <tbody ref="tbodyEl"></tbody>
                </table>
            </div>
        `;
    }

    // -- Lifecycle ------------------------------------------------------------
    onMount() {
        this._render();
        this.on(this.root, 'click', (e: MouseEvent) => {
            const sortBtn = (e.target as HTMLElement).closest<HTMLElement>('[data-sort-key]');
            if (sortBtn) {
                const key = sortBtn.dataset.sortKey ?? '';
                if (this._sortKey === key) this._sortDir = this._sortDir === 'asc' ? 'desc' : 'asc';
                else { this._sortKey = key; this._sortDir = 'asc'; }
                this._render();
                this.emit('sort', { key: this._sortKey, direction: this._sortDir });
                return;
            }
            const row = (e.target as HTMLElement).closest<HTMLTableRowElement>('tbody tr[data-row-index]');
            if (row) {
                const index = parseInt(row.dataset.rowIndex ?? '-1', 10);
                const { cols, rows } = this._normalise(this._rowsOverride ?? this._parseAttr());
                const sorted = this._sorted(rows, cols);
                if (index >= 0 && sorted[index]) this.emit('row-click', { row: sorted[index], index });
            }
        });
    }

    protected _handleAttributeUpdate(_name: string, _val: string | null) {
        // If rows attr changes, clear JS override so attribute takes precedence
        if (_name === 'rows') this._rowsOverride = null;
        this._render();
    }

    private _render() {
        const raw             = this._rowsOverride ?? this._parseAttr();
        const { cols, rows }  = this._normalise(raw);
        const sorted          = this._sorted(rows, cols);
        const hasHeader       = this.hasAttribute('header');
        const sortableAll     = this.hasAttribute('sortable');
        const emptyText       = this.getAttribute('empty') ?? 'No data available';
        const maxHeight       = this.getAttribute('max-height') ?? '';

        this.wrapEl.style.maxHeight = maxHeight || '';
        this.theadEl.style.display  = hasHeader ? '' : 'none';

        // Header
        this.headerRowEl.innerHTML = cols.map(col => {
            const active = this._sortKey === col.key;
            const arrow  = active ? (this._sortDir === 'asc' ? '▲' : '▼') : '';
            return `<th>
                <button class="head-btn ${sortableAll ? 'sortable' : ''} ${active ? 'active' : ''}"
                    type="button" ${sortableAll ? `data-sort-key="${esc(col.key)}"` : 'disabled'}>
                    <span>${esc(col.label)}</span>
                    <span class="sort-icon">${arrow}</span>
                </button>
            </th>`;
        }).join('');

        // Body
        this.tbodyEl.innerHTML = sorted.length === 0
            ? `<tr><td class="empty" colspan="${Math.max(cols.length, 1)}">${esc(emptyText)}</td></tr>`
            : sorted.map((row, i) => `
                <tr data-row-index="${i}">
                    ${cols.map(col => `<td>${esc(row[col.key])}</td>`).join('')}
                </tr>`).join('');
    }
}

if (!customElements.get('nc-table')) customElements.define('nc-table', NcTable);

/**
 * NcPagination Component
 *
 * Attributes:
 *   page          — number — current page, 1-based (default: 1)
 *   total         — number — total number of *items* (not pages)
 *   per-page      — number — items per page (default: 10)
 *   siblings      — number — page buttons shown each side of current (default: 1)
 *   show-first-last — boolean — show ⏮ / ⏭ buttons
 *   disabled      — boolean
 *   size          — 'sm'|'md'|'lg' (default: 'md')
 *   variant       — 'default'|'outline' (default: 'default')
 *
 * Events:
 *   change — CustomEvent<{ page, perPage, totalPages, offset, limit }>
 *     offset = (page-1) * perPage  — pass directly to API/slice
 *     limit  = perPage             — pass directly to API/slice
 *
 * Usage:
 *   <nc-pagination total="150" per-page="10" page="1"></nc-pagination>
 *
 * Pairing with nc-table (client-side):
 *   pager.addEventListener('change', ({ detail }) => {
 *     table.rows = allRows.slice(detail.offset, detail.offset + detail.limit);
 *   });
 *
 * Pairing with nc-table (server-side):
 *   pager.addEventListener('change', async ({ detail }) => {
 *     const data = await api.getUsers({ offset: detail.offset, limit: detail.limit });
 *     table.rows = data.items;
 *   });
 */

import { CoreComponent } from '../../.nativecore/core/component.js';
import { css } from '../../.nativecore/utils/templates.js';

export class NcPagination extends CoreComponent {
    static useShadowDOM = true;
    static observedAttributes = ['page', 'total', 'per-page', 'siblings', 'show-first-last', 'disabled', 'size', 'variant'];
    static attributePlaceholders = { page: '1', total: '150', 'per-page': '10' };
    static attributeOptions = { size: ['sm', 'md', 'lg'], variant: ['default', 'outline'] };
    static attributeOrder = ['page', 'total', 'per-page', 'siblings', 'size', 'variant', 'show-first-last', 'disabled'];

    // -- Refs -----------------------------------------------------------------
    declare navEl: HTMLElement;

    // -- Helpers --------------------------------------------------------------
    private _totalPages(): number {
        const total   = Math.max(0, Number(this.getAttribute('total')    || 0));
        const perPage = Math.max(1, Number(this.getAttribute('per-page') || 10));
        return Math.max(1, Math.ceil(total / perPage));
    }

    private _buildPages(current: number, totalPages: number, siblings: number): (number | '...')[] {
        if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
        const left  = Math.max(2, current - siblings);
        const right = Math.min(totalPages - 1, current + siblings);
        const pages: (number | '...')[] = [1];
        if (left > 2) pages.push('...');
        for (let i = left; i <= right; i++) pages.push(i);
        if (right < totalPages - 1) pages.push('...');
        pages.push(totalPages);
        return pages;
    }

    private _navBtn(dir: string, label: string, disabled: boolean): string {
        const arrowD: Record<string, string> = {
            first: 'M12 3L7 8l5 5M7 3L2 8l5 5',
            prev:  'M10 3L5 8l5 5',
            next:  'M6 3l5 5-5 5',
            last:  'M4 3l5 5-5 5M9 3l5 5-5 5',
        };
        return `<button class="btn btn--nav" data-dir="${dir}" ${disabled ? 'disabled' : ''} aria-label="${label}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" width="14" height="14">
                <path d="${arrowD[dir]}" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg></button>`;
    }

    // -- Template -------------------------------------------------------------
    static styles = css`
        :host { display: block; font-family: var(--nc-font-family); }
        .pagination { display: inline-flex; align-items: center; gap: 4px; flex-wrap: wrap; }
        :host([disabled]) .pagination { opacity: 0.5; pointer-events: none; }
        .btn {
            display: inline-flex; align-items: center; justify-content: center;
            border: 1px solid var(--nc-border); background: var(--nc-bg); color: var(--nc-text);
            cursor: pointer; border-radius: var(--nc-radius-sm, 6px);
            font-family: var(--nc-font-family); font-size: var(--nc-font-size-sm);
            transition: background var(--nc-transition-fast), color var(--nc-transition-fast), border-color var(--nc-transition-fast);
            min-width: 36px; height: 36px; padding: 0 6px;
        }
        :host([size="sm"]) .btn { min-width: 28px; height: 28px; font-size: var(--nc-font-size-xs); }
        :host([size="lg"]) .btn { min-width: 44px; height: 44px; font-size: var(--nc-font-size-base); }
        .btn:hover:not(:disabled):not(.btn--active) { background: var(--nc-bg-secondary); border-color: var(--nc-border-dark); }
        .btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn--active { background: var(--nc-primary); color: #fff; border-color: var(--nc-primary); font-weight: var(--nc-font-weight-semibold); pointer-events: none; }
        :host([variant="outline"]) .btn--active { background: transparent; color: var(--nc-primary); }
        .ellipsis { display: inline-flex; align-items: center; justify-content: center; min-width: 36px; height: 36px; font-size: var(--nc-font-size-sm); color: var(--nc-text-muted); }
    `;

    template() {
        return `            <nav ref="navEl" aria-label="Pagination" class="pagination"></nav>
        `;
    }

    // -- Lifecycle ------------------------------------------------------------
    onMount() {
        this._render();
        this.on(this.navEl, 'click', (e: MouseEvent) => {
            const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
            if (!btn || btn.disabled) return;

            const current    = Math.max(1, Number(this.getAttribute('page') || 1));
            const totalPages = this._totalPages();
            let next = current;

            if (btn.dataset.page) {
                next = Number(btn.dataset.page);
            } else {
                switch (btn.dataset.dir) {
                    case 'first': next = 1; break;
                    case 'prev':  next = Math.max(1, current - 1); break;
                    case 'next':  next = Math.min(totalPages, current + 1); break;
                    case 'last':  next = totalPages; break;
                }
            }

            if (next !== current) {
                this.setAttribute('page', String(next));
                const perPage = Math.max(1, Number(this.getAttribute('per-page') || 10));
                this.emit('change', {
                    page:       next,
                    perPage,
                    totalPages,
                    offset:     (next - 1) * perPage,
                    limit:      perPage,
                });
            }
        });
    }

    protected _handleAttributeUpdate(_name: string, _val: string | null) {
        this._render();
    }

    private _render() {
        const current       = Math.max(1, Number(this.getAttribute('page') || 1));
        const totalPages    = this._totalPages();
        const siblings      = Math.max(1, Number(this.getAttribute('siblings') ?? 1));
        const showFirstLast = this.hasAttribute('show-first-last');
        const disabled      = this.hasAttribute('disabled');
        const atFirst       = current <= 1;
        const atLast        = current >= totalPages;
        const pages         = this._buildPages(current, totalPages, siblings);

        const items = pages.map(p =>
            p === '...'
                ? `<span class="ellipsis" aria-hidden="true">…</span>`
                : `<button class="btn${p === current ? ' btn--active' : ''}" data-page="${p}" aria-label="Page ${p}" aria-current="${p === current ? 'page' : 'false'}">${p}</button>`
        ).join('');

        this.navEl.innerHTML =
            (showFirstLast ? this._navBtn('first', 'First page', atFirst || disabled) : '') +
            this._navBtn('prev', 'Previous page', atFirst || disabled) +
            items +
            this._navBtn('next', 'Next page', atLast || disabled) +
            (showFirstLast ? this._navBtn('last', 'Last page', atLast || disabled) : '');
    }
}

if (!customElements.get('nc-pagination')) customElements.define('nc-pagination', NcPagination);


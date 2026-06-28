/**
 * NcEmptyState Component — empty state illustration + heading + action
 *
 * Attributes:
 *   title        — main heading text
 *   description  — secondary description text
 *   icon         — preset icon name: 'inbox'|'search'|'folder'|'data'|'error'|'lock'|'custom'
 *                  Use 'custom' and the icon slot for your own SVG.
 *   size         — 'sm'|'md'(default)|'lg'
 *   variant      — 'default'|'bordered'|'filled'
 *
 * Slots:
 *   icon    — custom illustration/icon (use with icon="custom")
 *   title   — overrides title attribute
 *   description — overrides description attribute
 *   actions — buttons / links below the description
 *
 * Usage:
 *   <nc-empty-state title="No results found" description="Try adjusting your search." icon="search">
 *     <div slot="actions">
 *       <nc-button>Clear filters</nc-button>
 *     </div>
 *   </nc-empty-state>
 */
import { CoreComponent } from '@core/component.js';
import { css, html } from '@core-utils/templates.js';

const ICONS: Record<string, string> = {
    inbox: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
        <rect x="8" y="16" width="48" height="36" rx="4" stroke="currentColor" stroke-width="2.5"/>
        <polyline points="8,30 26,42 38,42 56,30" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>
        <line x1="20" y1="24" x2="44" y2="24" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".5"/>
        <line x1="20" y1="30" x2="32" y2="30" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".5"/>
    </svg>`,
    search: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
        <circle cx="27" cy="27" r="17" stroke="currentColor" stroke-width="2.5"/>
        <line x1="39" y1="39" x2="56" y2="56" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
        <line x1="21" y1="27" x2="33" y2="27" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".5"/>
        <line x1="27" y1="21" x2="27" y2="33" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".5"/>
    </svg>`,
    folder: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
        <path d="M8 20a4 4 0 0 1 4-4h12l6 6h22a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V20z"
              stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>
        <line x1="24" y1="38" x2="40" y2="38" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".5"/>
    </svg>`,
    data: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
        <ellipse cx="32" cy="18" rx="20" ry="8" stroke="currentColor" stroke-width="2.5"/>
        <path d="M12 18v10c0 4.4 9 8 20 8s20-3.6 20-8V18" stroke="currentColor" stroke-width="2.5"/>
        <path d="M12 28v10c0 4.4 9 8 20 8s20-3.6 20-8V28" stroke="currentColor" stroke-width="2.5"/>
    </svg>`,
    error: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="32" r="24" stroke="currentColor" stroke-width="2.5"/>
        <line x1="32" y1="20" x2="32" y2="36" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
        <circle cx="32" cy="44" r="2.5" fill="currentColor"/>
    </svg>`,
    lock: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
        <rect x="14" y="28" width="36" height="26" rx="4" stroke="currentColor" stroke-width="2.5"/>
        <path d="M20 28V20a12 12 0 0 1 24 0v8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="32" cy="41" r="4" stroke="currentColor" stroke-width="2.5"/>
        <line x1="32" y1="45" x2="32" y2="50" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    </svg>`,
};

export class NcEmptyState extends CoreComponent {
    static useShadowDOM = true;
    static observedAttributes = ['title', 'description', 'icon', 'size', 'variant'];
    static attributeOptions = {
        icon:    ['inbox', 'search', 'folder', 'data', 'error', 'lock', 'custom'],
        size:    ['sm', 'md', 'lg'],
        variant: ['default', 'bordered', 'filled'],
    };
    static attributeOrder = ['icon', 'title', 'description', 'variant', 'size'];

    // -- Refs -----------------------------------------------------------------
    declare iconWrapEl: HTMLDivElement;
    declare titleEl:    HTMLParagraphElement;
    declare descEl:     HTMLParagraphElement;

    static styles = css`
        :host { display: block; }
        .wrap {
            display: flex; flex-direction: column; align-items: center; text-align: center;
            padding: var(--nc-spacing-xl, 40px);
            font-family: var(--nc-font-family);
        }
        :host([size="sm"]) .wrap { padding: var(--nc-spacing-lg); }
        :host([size="lg"]) .wrap { padding: var(--nc-spacing-2xl, 48px); }
        :host([variant="bordered"]) .wrap { border: 1px dashed var(--nc-border); border-radius: var(--nc-radius-lg); }
        :host([variant="filled"])   .wrap { background: var(--nc-bg-secondary); border-radius: var(--nc-radius-lg); }
        .icon-wrap {
            width: 72px; height: 72px;
            color: var(--nc-text-muted); margin-bottom: var(--nc-spacing-md); opacity: 0.6;
        }
        :host([size="sm"]) .icon-wrap { width: 56px; height: 56px; }
        :host([size="lg"]) .icon-wrap { width: 96px; height: 96px; }
        .icon-wrap svg { width: 100%; height: 100%; }
        .title {
            font-size: var(--nc-font-size-lg); font-weight: var(--nc-font-weight-semibold);
            color: var(--nc-text); margin: 0 0 var(--nc-spacing-xs);
        }
        :host([size="sm"]) .title { font-size: var(--nc-font-size-base); }
        :host([size="lg"]) .title { font-size: var(--nc-font-size-xl); }
        .desc {
            font-size: var(--nc-font-size-sm); color: var(--nc-text-secondary);
            margin: 0 0 var(--nc-spacing-md); max-width: 360px;
            line-height: var(--nc-line-height-relaxed, 1.7);
        }
        .actions { display: flex; gap: var(--nc-spacing-sm); flex-wrap: wrap; justify-content: center; }
        slot[name="title"]::slotted(*), slot[name="description"]::slotted(*) { margin: 0; }
        [hidden] { display: none; }
    `;

    template() {
        return html`            <div class="wrap">
                <div ref="iconWrapEl" class="icon-wrap"></div>
                <p ref="titleEl" class="title" hidden></p>
                <slot name="title"></slot>
                <p ref="descEl" class="desc" hidden></p>
                <slot name="description"></slot>
                <div class="actions"><slot name="actions"></slot></div>
            </div>
        `;
    }

    onMount() { this._syncFromAttrs(); }

    protected _handleAttributeUpdate(_name: string, _val: string | null) {
        this._syncFromAttrs();
    }

    private _syncFromAttrs() {
        const title       = this.getAttribute('title') ?? '';
        const description = this.getAttribute('description') ?? '';
        const icon        = this.getAttribute('icon') ?? 'inbox';

        this.iconWrapEl.innerHTML = icon === 'custom'
            ? '<slot name="icon"></slot>'
            : (ICONS[icon] ?? ICONS.inbox);

        if (title) { this.titleEl.textContent = title; this.titleEl.hidden = false; }
        else        { this.titleEl.hidden = true; }

        if (description) { this.descEl.textContent = description; this.descEl.hidden = false; }
        else              { this.descEl.hidden = true; }
    }
}

if (!customElements.get('nc-empty-state')) customElements.define('nc-empty-state', NcEmptyState);


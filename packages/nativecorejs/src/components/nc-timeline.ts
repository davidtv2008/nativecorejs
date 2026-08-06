/**
 * NcTimeline Component â€” vertical event timeline
 *
 * Attributes:
 *   align  â€” 'left'(default)|'right'|'alternate' â€” which side the content appears
 *   size   â€” 'sm'|'md'(default)|'lg' â€” dot and line scale
 *   dense  â€” boolean â€” reduce spacing
 *
 * Slots: nc-timeline-item elements
 *
 * ---
 *
 * NcTimelineItem Component â€” single timeline event
 *
 * Attributes:
 *   color    â€” dot color preset: 'primary'(default)|'success'|'warning'|'danger'|'neutral'
 *              OR any valid CSS color string
 *   icon     â€” small icon inside the dot (same icon names as nc-nav-item)
 *   title    â€” event heading
 *   time     â€” timestamp / relative time string (shown muted)
 *   status   â€” 'completed'|'active'|'pending'|'error' (sets color automatically)
 *   no-line  â€” boolean â€” hide the connector line (usually set on last item)
 *
 * Slots:
 *   icon     â€” custom dot content
 *   title    â€” override title
 *   time     â€” time content
 *   (default)â€” event body / description
 *
 * Usage:
 *   <nc-timeline>
 *     <nc-timeline-item title="Order placed" time="2h ago" status="completed">
 *       Your order #4521 was received.
 *     </nc-timeline-item>
 *     <nc-timeline-item title="Processing" status="active">
 *       We're preparing your items.
 *     </nc-timeline-item>
 *     <nc-timeline-item title="Delivery" status="pending" no-line>
 *       Estimated 2-3 business days.
 *     </nc-timeline-item>
 *   </nc-timeline>
 */
import { CoreComponent } from '../../.nativecore/core/component.js';
import { css, html } from '../../.nativecore/utils/templates.js';

const STATUS_COLORS: Record<string, string> = {
    completed: 'var(--nc-success)',
    active:    'var(--nc-primary)',
    pending:   'var(--nc-text-muted)',
    error:     'var(--nc-danger)',
};

const SMALL_ICONS: Record<string, string> = {
    check:   `<polyline points="20 6 9 17 4 12"/>`,
    x:       `<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`,
    star:    `<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>`,
    info:    `<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>`,
    alert:   `<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>`,
};
const iconSvg = (p: string, sz = 10) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;

// â”€â”€ NcTimelineItem â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export class NcTimelineItem extends CoreComponent {
    static useShadowDOM = true;
    static observedAttributes = ['color', 'status', 'icon', 'title', 'time', 'no-line'];
    static attributeOptions   = { status: ['completed', 'active', 'pending', 'error'] };
    static attributeOrder     = ['title', 'time', 'status', 'color', 'icon', 'no-line'];

    // -- Refs -----------------------------------------------------------------
    declare dotEl:   HTMLDivElement;
    declare titleEl: HTMLElement;
    declare timeEl:  HTMLElement;

    static styles = css`
        :host { display: flex; font-family: var(--nc-font-family); --_dot-color: var(--nc-primary); }
        :host([status="completed"]) { --_dot-color: var(--nc-success); }
        :host([status="active"])    { --_dot-color: var(--nc-primary); }
        :host([status="pending"])   { --_dot-color: var(--nc-text-muted); }
        :host([status="error"])     { --_dot-color: var(--nc-danger); }

        .col-dot { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; width: 28px; margin-right: var(--nc-spacing-md); }
        .dot {
            width: 12px; height: 12px;
            border-radius: 50%;
            background: var(--_dot-color);
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0; color: #fff; margin-top: 4px;
            transition: background var(--nc-transition-fast);
        }
        :host([status="active"]) .dot {
            width: 14px; height: 14px;
            box-shadow: 0 0 0 4px rgba(0,0,0,.1), 0 0 0 3px color-mix(in srgb, var(--_dot-color) 20%, transparent);
        }
        .line {
            flex: 1; width: 2px; background: var(--nc-border);
            margin-top: 4px; min-height: 24px;
        }
        :host([no-line]) .line { display: none; }
        .content {
            flex: 1; padding-bottom: var(--nc-spacing-lg); min-width: 0;
        }
        :host([no-line]) .content { padding-bottom: 0; }
        .header { display: flex; align-items: baseline; justify-content: space-between; gap: var(--nc-spacing-sm); margin-bottom: 4px; }
        .title  { font-size: var(--nc-font-size-sm); font-weight: var(--nc-font-weight-semibold); color: var(--nc-text); margin: 0; }
        .time   { font-size: var(--nc-font-size-xs); color: var(--nc-text-muted); white-space: nowrap; flex-shrink: 0; }
        .body   { font-size: var(--nc-font-size-sm); color: var(--nc-text-secondary); line-height: var(--nc-line-height-relaxed, 1.65); }
        [hidden] { display: none !important; }
    `;

    template() {
        return `            <div class="col-dot">
                <div ref="dotEl" class="dot"><slot name="icon"></slot></div>
                <div class="line"></div>
            </div>
            <div class="content">
                <div class="header">
                    <p ref="titleEl" class="title"><slot name="title"></slot></p>
                    <span ref="timeEl" class="time" hidden><slot name="time"></slot></span>
                </div>
                <div class="body"><slot></slot></div>
            </div>
        `;
    }

    onMount() {
        this._syncFromAttrs();
    }

    protected _handleAttributeUpdate(_name: string, _val: string | null) {
        this._syncFromAttrs();
    }

    private _syncFromAttrs() {
        const color   = this.getAttribute('color') ?? STATUS_COLORS[this.getAttribute('status') ?? ''] ?? '';
        const iconKey = this.getAttribute('icon') ?? '';
        const status  = this.getAttribute('status') ?? '';
        const title   = this.getAttribute('title') ?? '';
        const time    = this.getAttribute('time') ?? '';

        // Custom color overrides CSS vars
        if (color && !STATUS_COLORS[this.getAttribute('status') ?? '']) {
            this.dotEl.style.background = color;
        } else {
            this.dotEl.style.background = '';
        }

        // Dot icon
        const dotContent = SMALL_ICONS[iconKey]
            ? iconSvg(SMALL_ICONS[iconKey], 10)
            : (status === 'completed' ? iconSvg(SMALL_ICONS.check, 10) : '');
        // Only override if there's an icon attribute â€” otherwise the named slot handles it
        if (iconKey || status === 'completed') {
            const existingIcon = this.dotEl.querySelector<HTMLElement>('.dot-icon-inner');
            if (!existingIcon) {
                const span = document.createElement('span');
                span.className = 'dot-icon-inner';
                span.innerHTML = dotContent;
                this.dotEl.prepend(span);
            } else {
                existingIcon.innerHTML = dotContent;
            }
        }

        this.titleEl.childNodes[0]?.remove?.();
        if (title) this.titleEl.insertAdjacentText('afterbegin', title);

        this.timeEl.hidden = !time;
        if (time) {
            this.timeEl.childNodes[0]?.remove?.();
            this.timeEl.insertAdjacentText('afterbegin', time);
        }
    }
}

if (!customElements.get('nc-timeline-item')) customElements.define('nc-timeline-item', NcTimelineItem);

// â”€â”€ NcTimeline â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export class NcTimeline extends CoreComponent {
    static useShadowDOM = true;

    static styles = css`
        :host { display: block; padding: var(--nc-spacing-sm) 0; }
    `;

    template() {
        return html`<slot></slot>`;
    }
}

if (!customElements.get('nc-timeline')) customElements.define('nc-timeline', NcTimeline);

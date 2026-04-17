/**
 * NcTimeline Component — vertical event timeline
 *
 * Attributes:
 *   align  — 'left'(default)|'right'|'alternate' — which side the content appears
 *   size   — 'sm'|'md'(default)|'lg' — dot and line scale
 *   dense  — boolean — reduce spacing
 *
 * Slots: nc-timeline-item elements
 *
 * ---
 *
 * NcTimelineItem Component — single timeline event
 *
 * Attributes:
 *   color    — dot color preset: 'primary'(default)|'success'|'warning'|'danger'|'neutral'
 *              OR any valid CSS color string
 *   icon     — small icon inside the dot (same icon names as nc-nav-item)
 *   title    — event heading
 *   time     — timestamp / relative time string (shown muted)
 *   status   — 'completed'|'active'|'pending'|'error' (sets color automatically)
 *   no-line  — boolean — hide the connector line (usually set on last item)
 *
 * Slots:
 *   icon     — custom dot content
 *   title    — override title
 *   time     — time content
 *   (default)— event body / description
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
import { Component, defineComponent } from '@core/component.js';
import { html } from '@core-utils/templates.js';

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

// ── NcTimelineItem ────────────────────────────────────────────────────────────

export class NcTimelineItem extends Component {
    static useShadowDOM = true;

    static get observedAttributes() { return ['color', 'status', 'active', 'no-line']; }

    template() {
        const title   = this.getAttribute('title') ?? '';
        const time    = this.getAttribute('time') ?? '';
        const status  = this.getAttribute('status') ?? '';
        const iconKey = this.getAttribute('icon') ?? '';
        const noLine  = this.hasAttribute('no-line');
        const color   = this.getAttribute('color')
            ?? STATUS_COLORS[status]
            ?? 'var(--nc-primary)';

        const dotContent = SMALL_ICONS[iconKey]
            ? iconSvg(SMALL_ICONS[iconKey], 10)
            : (status === 'completed' ? iconSvg(SMALL_ICONS.check, 10) : '');

        const isActive = status === 'active';
        const dotSz   = isActive ? 14 : 12;

        return html`
            <style>
                :host { display: flex; font-family: var(--nc-font-family); }
                .col-dot {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    flex-shrink: 0;
                    width: 28px;
                    margin-right: var(--nc-spacing-md);
                }
                .dot {
                    width: ${dotSz}px;
                    height: ${dotSz}px;
                    border-radius: 50%;
                    background: ${color};
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    color: #fff;
                    ${isActive ? `box-shadow: 0 0 0 4px rgba(0,0,0,.1), 0 0 0 3px ${color}33;` : ''}
                    margin-top: 4px;
                }
                .line {
                    flex: 1;
                    width: 2px;
                    background: var(--nc-border);
                    margin-top: 4px;
                    min-height: 24px;
                    display: ${noLine ? 'none' : 'block'};
                }
                .content {
                    flex: 1;
                    padding-bottom: ${noLine ? '0' : 'var(--nc-spacing-lg)'};
                    min-width: 0;
                }
                .header {
                    display: flex;
                    align-items: baseline;
                    justify-content: space-between;
                    gap: var(--nc-spacing-sm);
                    margin-bottom: 4px;
                }
                .title {
                    font-size: var(--nc-font-size-sm);
                    font-weight: var(--nc-font-weight-semibold);
                    color: var(--nc-text);
                    margin: 0;
                }
                .time {
                    font-size: var(--nc-font-size-xs);
                    color: var(--nc-text-muted);
                    white-space: nowrap;
                    flex-shrink: 0;
                }
                .body {
                    font-size: var(--nc-font-size-sm);
                    color: var(--nc-text-secondary);
                    line-height: var(--nc-line-height-relaxed, 1.65);
                }
            </style>
            <div class="col-dot">
                <div class="dot">
                    <slot name="icon">${dotContent}</slot>
                </div>
                <div class="line"></div>
            </div>
            <div class="content">
                <div class="header">
                    <p class="title"><slot name="title">${title}</slot></p>
                    ${time ? `<span class="time"><slot name="time">${time}</slot></span>` : '<slot name="time"></slot>'}
                </div>
                <div class="body"><slot></slot></div>
            </div>
        `;
    }

    attributeChangedCallback(n: string, o: string, v: string) {
        if (o !== v && this._mounted) this.render();
    }
}

defineComponent('nc-timeline-item', NcTimelineItem);

// ── NcTimeline ────────────────────────────────────────────────────────────────

export class NcTimeline extends Component {
    static useShadowDOM = true;

    template() {
        return `
            <style>
                :host { display: block; padding: var(--nc-spacing-sm) 0; }
            </style>
            <slot></slot>
        `;
    }
}

defineComponent('nc-timeline', NcTimeline);


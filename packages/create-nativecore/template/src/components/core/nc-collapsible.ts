/**
 * NcCollapsible Component — single expand/collapse panel
 *
 * Attributes:
 *   open      — boolean — expanded state
 *   disabled  — boolean
 *   duration  — transition duration ms (default: 250)
 *   icon      — 'chevron'(default)|'plus'|'arrow'|'none'
 *
 * Slots:
 *   trigger  — the clickable header content
 *   (default) — collapsible body content
 *
 * Events:
 *   open   — CustomEvent — after opened
 *   close  — CustomEvent — after closed
 *   toggle — CustomEvent<{ open: boolean }>
 *
 * Usage:
 *   <nc-collapsible>
 *     <span slot="trigger">Section title</span>
 *     <p>Hidden content revealed on click.</p>
 *   </nc-collapsible>
 */
import { CoreComponent } from '@core/component.js';
import { css, html, trusted } from '@core-utils/templates.js';

export class NcCollapsible extends CoreComponent {
    static useShadowDOM = true;
    static observedAttributes = ['open', 'disabled', 'duration', 'icon'];

    static attributeOptions  = { icon: ['chevron', 'plus', 'arrow', 'none'] };
    static attributePlaceholders = { duration: '300' };
    static attributeOrder = ['icon', 'duration', 'open', 'disabled'];

    // -- Refs -----------------------------------------------------------------
    declare triggerBtn: HTMLButtonElement;
    declare bodyEl:     HTMLDivElement;

    static styles = css`
        :host { display: block; border: 1px solid var(--nc-border); border-radius: var(--nc-radius-md); overflow: hidden; font-family: var(--nc-font-family); }

        .trigger {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: var(--nc-spacing-sm);
            padding: var(--nc-spacing-md) var(--nc-spacing-lg);
            background: var(--nc-bg);
            border: none;
            cursor: pointer;
            text-align: left;
            font-family: inherit;
            font-size: var(--nc-font-size-base);
            font-weight: var(--nc-font-weight-medium);
            color: var(--nc-text);
            transition: background var(--nc-transition-fast);
            user-select: none;
            outline: none;
        }
        :host([disabled]) .trigger { cursor: not-allowed; color: var(--nc-text-muted); opacity: 0.5; }
        .trigger:hover:not(:disabled) { background: var(--nc-bg-secondary); }
        .trigger:focus-visible { outline: 2px solid var(--nc-primary); outline-offset: -2px; }

        .icon {
            flex-shrink: 0;
            color: var(--nc-text-muted);
            transform: rotate(0deg);
            transition: transform var(--nc-collapsible-dur, 250ms) var(--nc-ease-out);
        }
        :host([open]) .icon           { transform: rotate(180deg); }
        :host([icon="arrow"]) .icon    { transform: rotate(0deg); }
        :host([icon="arrow"][open]) .icon { transform: rotate(90deg); }
        /* Plus icon: hide horizontal bar when open */
        :host([open]) .plus-h { display: none; }

        .body {
            display: grid;
            grid-template-rows: 0fr;
            transition: grid-template-rows var(--nc-collapsible-dur, 250ms) var(--nc-ease-out);
        }
        :host([open]) .body { grid-template-rows: 1fr; }

        .body-inner { overflow: hidden; }
        .body-content {
            padding: var(--nc-spacing-md) var(--nc-spacing-lg) var(--nc-spacing-lg);
            color: var(--nc-text-secondary);
            font-size: var(--nc-font-size-sm);
            line-height: var(--nc-line-height-relaxed, 1.7);
            border-top: 1px solid var(--nc-border);
        }
    `;

    template() {
        const dur  = parseInt(this.getAttribute('duration') ?? '250', 10);
        this.style.setProperty('--nc-collapsible-dur', `${Number.isFinite(dur) ? dur : 250}ms`);
        const icon = this.getAttribute('icon') ?? 'chevron';

        const iconSvg: Record<string, string> = {
            chevron: `<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                           viewBox="0 0 24 24" fill="none" stroke="currentColor"
                           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="6 9 12 15 18 9"/>
                      </svg>`,
            plus:    `<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                           viewBox="0 0 24 24" fill="none" stroke="currentColor"
                           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19"/>
                          <line class="plus-h" x1="5" y1="12" x2="19" y2="12"/>
                      </svg>`,
            arrow:   `<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14"
                           viewBox="0 0 24 24" fill="none" stroke="currentColor"
                           stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="9 18 15 12 9 6"/>
                      </svg>`,
            none:    '',
        };

        return html`            <button
                ref="triggerBtn"
                class="trigger"
                type="button"
                aria-expanded="false"
            >
                <slot name="trigger"></slot>
                ${trusted(iconSvg[icon] ?? iconSvg.chevron)}
            </button>
            <div ref="bodyEl" class="body" role="region">
                <div class="body-inner">
                    <div class="body-content">
                        <slot></slot>
                    </div>
                </div>
            </div>
        `;
    }

    onMount() {
        // Sync trigger state reactively from host attribute
        this.effect(() => {
            const open = this.hasAttribute('open');
            this.triggerBtn.setAttribute('aria-expanded', String(open));
            this.triggerBtn.disabled = this.hasAttribute('disabled');
        });

        this.on(this.triggerBtn, 'click', () => {
            if (this.hasAttribute('disabled')) return;
            this._toggle();
        });
    }

    private _toggle() {
        const nowOpen = !this.hasAttribute('open');
        if (nowOpen) this.setAttribute('open', '');
        else this.removeAttribute('open');
        this.emit('toggle', { open: nowOpen });
        this.emit(nowOpen ? 'open' : 'close');
    }

    protected _handleAttributeUpdate(name: string, _val: string | null) {
        // icon or duration changed — re-render so the correct SVG + duration appear
        if (name === 'icon' || name === 'duration') this.render();
    }
}

if (!customElements.get('nc-collapsible')) customElements.define('nc-collapsible', NcCollapsible);


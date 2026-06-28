/**
 * NcAvatar Component
 *
 * Attributes:
 *   - src: string — image URL
 *   - alt: string — alt text / fallback initials (e.g. "John Doe" → "JD")
 *   - size: 'xs'|'sm'|'md'|'lg'|'xl'|'2xl' — or any CSS size string (default: 'md')
 *   - shape: 'circle'|'square'|'rounded' (default: 'circle')
 *   - variant: 'primary'|'secondary'|'success'|'warning'|'danger'|'neutral' — fallback bg color (default: 'neutral')
 *   - status: 'online'|'offline'|'away'|'busy' — status dot
 *   - status-position: 'top-right'|'bottom-right'|'bottom-left'|'top-left' (default: 'bottom-right')
 *
 * Usage:
 *   <nc-avatar src="/user.jpg" alt="Jane Doe" size="md"></nc-avatar>
 *   <nc-avatar alt="David Toledo" variant="primary" status="online"></nc-avatar>
 */

import { CoreComponent } from '@core/component.js';
import { css, html } from '@core-utils/templates.js';

const SIZE_MAP: Record<string, string> = {
    xs: '24px', sm: '32px', md: '40px', lg: '48px', xl: '64px', '2xl': '80px',
};

const STATUS_COLORS: Record<string, string> = {
    online: '#22c55e', offline: '#94a3b8', away: '#f59e0b', busy: '#ef4444',
};

function initials(name: string): string {
    return name.trim().split(/\s+/).map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2);
}

export class NcAvatar extends CoreComponent {
    static useShadowDOM = true;

    static observedAttributes = ['src', 'alt', 'size', 'shape', 'variant', 'status', 'status-position'];

    static attributeOptions = {
        size:              ['xs', 'sm', 'md', 'lg', 'xl', '2xl'],
        shape:             ['circle', 'square', 'rounded'],
        variant:           ['primary', 'secondary', 'success', 'warning', 'danger', 'neutral'],
        status:            ['online', 'offline', 'away', 'busy'],
        'status-position': ['top-right', 'bottom-right', 'bottom-left', 'top-left'],
    };

    static attributeOrder = ['src', 'alt', 'size', 'shape', 'variant', 'status', 'status-position'];

    static attributePlaceholders = {
        src: 'https://...',
        alt: 'Jane Doe',
    };

    // ── Refs ──────────────────────────────────────────────────────────────────
    declare avatarEl:   HTMLElement;
    declare imgEl:      HTMLImageElement;
    declare initialsEl: HTMLElement;
    declare statusDotEl: HTMLElement;

    // ── State ─────────────────────────────────────────────────────────────────
    private imgError = this.state(false);

    // ── Template ──────────────────────────────────────────────────────────────
    // Size, shape, variant and status-position are all handled via CSS
    // :host([attr]) selectors — no JS re-render needed when they change.
    static styles = css`
        :host { display: inline-flex; position: relative; flex-shrink: 0; --_sz: 40px; --_br: 50%; }

        /* ── Size tokens ── */
        :host([size="xs"])  { --_sz: 24px; }
        :host([size="sm"])  { --_sz: 32px; }
        :host([size="md"])  { --_sz: 40px; }
        :host([size="lg"])  { --_sz: 48px; }
        :host([size="xl"])  { --_sz: 64px; }
        :host([size="2xl"]) { --_sz: 80px; }

        /* ── Shape tokens ── */
        :host([shape="circle"])  { --_br: 50%; }
        :host([shape="rounded"]) { --_br: 25%; }
        :host([shape="square"])  { --_br: 8px; }

        .avatar {
            width: var(--_sz);
            height: var(--_sz);
            border-radius: var(--_br);
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--nc-bg-tertiary);
            color: var(--nc-text);
            font-family: var(--nc-font-family);
            font-size: calc(var(--_sz) * 0.38);
            font-weight: var(--nc-font-weight-semibold);
            user-select: none;
            flex-shrink: 0;
        }

        /* ── Variant colors ── */
        :host([variant="primary"])   .avatar { background: var(--nc-primary);             color: #fff; }
        :host([variant="secondary"]) .avatar { background: var(--nc-secondary, #6366f1);  color: #fff; }
        :host([variant="success"])   .avatar { background: var(--nc-success,  #10b981);   color: #fff; }
        :host([variant="warning"])   .avatar { background: var(--nc-warning,  #f59e0b);   color: #fff; }
        :host([variant="danger"])    .avatar { background: var(--nc-danger,   #ef4444);   color: #fff; }

        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .initials {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
            line-height: 1;
        }

        .status-dot {
            position: absolute;
            bottom: 0; right: 0;
            width: calc(var(--_sz) * 0.26);
            height: calc(var(--_sz) * 0.26);
            border-radius: 50%;
            border: 2px solid var(--nc-bg);
            display: none;
        }

        /* ── Status positions ── */
        :host([status-position="top-right"])    .status-dot { top: 0;    right: 0;  bottom: auto; left: auto; }
        :host([status-position="bottom-right"]) .status-dot { bottom: 0; right: 0;  top: auto;    left: auto; }
        :host([status-position="bottom-left"])  .status-dot { bottom: 0; left: 0;   top: auto;    right: auto; }
        :host([status-position="top-left"])     .status-dot { top: 0;    left: 0;   bottom: auto; right: auto; }
    `;

    template() {
        const alt = this.getAttribute('alt') || '';
        return html`            <div ref="avatarEl" class="avatar" title="${alt}" aria-label="${alt}" role="img">
                <img ref="imgEl" alt="${alt}" style="display:none" />
                <span ref="initialsEl" class="initials">${initials(alt) || '?'}</span>
            </div>
            <span ref="statusDotEl" class="status-dot" aria-hidden="true"></span>
        `;
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────
    onMount() {
        // Effect: toggle img/initials whenever imgError state changes.
        this.effect(() => { this._applyImageState(); });

        // Seed initial values from attributes.
        this._applyImageState();
        this._applyStatus();

        // Img load error → fall back to initials.
        this.on(this.imgEl, 'error', () => { this.imgError.value = true; });
    }

    protected _handleAttributeUpdate(name: string, val: string | null) {
        if (name === 'src') {
            this.imgError.value = false;   // reset error on new src — effect re-runs
            this._applyImageState();
        } else if (name === 'alt') {
            const letters = initials(val || '');
            this.initialsEl.textContent = letters || '?';
            this.avatarEl.title = val || '';
            this.avatarEl.setAttribute('aria-label', val || '');
            this.imgEl.alt = val || '';
        } else if (name === 'status' || name === 'status-position') {
            this._applyStatus();
        }
        // size / shape / variant / status-position → handled by CSS :host([attr]) — no JS needed.
    }

    // ── Private helpers ───────────────────────────────────────────────────────
    private _applyImageState() {
        const src  = this.getAttribute('src') || '';
        const show = !!src && !this.imgError.value;   // imgError.value → tracked by effect
        if (this.imgEl) {
            this.imgEl.src              = src;
            this.imgEl.style.display    = show ? 'block' : 'none';
        }
        if (this.initialsEl) {
            this.initialsEl.style.display = show ? 'none' : 'flex';
        }
    }

    private _applyStatus() {
        const status = this.getAttribute('status') || '';
        if (!this.statusDotEl) return;
        this.statusDotEl.style.display    = status ? 'block' : 'none';
        this.statusDotEl.style.background = STATUS_COLORS[status] ?? STATUS_COLORS.offline;
        this.statusDotEl.setAttribute('aria-label', status);
        this.statusDotEl.setAttribute('aria-hidden', status ? 'false' : 'true');
    }
}

if (!customElements.get('nc-avatar')) customElements.define('nc-avatar', NcAvatar);


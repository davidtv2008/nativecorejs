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

import { Component, defineComponent } from '@core/component.js';
import { html } from '@core-utils/templates.js';

const SIZE_MAP: Record<string, string> = {
    xs: '24px', sm: '32px', md: '40px', lg: '48px', xl: '64px', '2xl': '80px',
};

const STATUS_COLORS: Record<string, string> = {
    online: '#22c55e', offline: '#94a3b8', away: '#f59e0b', busy: '#ef4444',
};

function initials(name: string): string {
    return name.trim().split(/\s+/).map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2);
}

export class NcAvatar extends Component {
    static useShadowDOM = true;

    static get observedAttributes() {
        return ['src', 'alt', 'size', 'shape', 'variant', 'status', 'status-position'];
    }

    private _imgError = false;

    template() {
        const src = this.getAttribute('src') || '';
        const alt = this.getAttribute('alt') || '';
        const sizeAttr = this.getAttribute('size') || 'md';
        const shape = this.getAttribute('shape') || 'circle';
        const variant = this.getAttribute('variant') || 'neutral';
        const status = this.getAttribute('status') || '';
        const statusPos = this.getAttribute('status-position') || 'bottom-right';

        const sizeVal = SIZE_MAP[sizeAttr] ?? sizeAttr;
        const fontSize = `calc(${sizeVal} * 0.38)`;
        const statusSize = `calc(${sizeVal} * 0.26)`;

        const borderRadius = shape === 'circle' ? '50%' : shape === 'rounded' ? '25%' : '8px';

        const letters = initials(alt);
        const showImg = src && !this._imgError;

        const [svPos, shPos] = statusPos.split('-');
        const statusDotStyle = [
            svPos === 'top' ? 'top: 0;' : 'bottom: 0;',
            shPos === 'right' ? 'right: 0;' : 'left: 0;',
        ].join(' ');

        const variantBg: Record<string, string> = {
            primary:   'var(--nc-primary)',
            secondary: 'var(--nc-secondary, #6366f1)',
            success:   'var(--nc-success, #10b981)',
            warning:   'var(--nc-warning, #f59e0b)',
            danger:    'var(--nc-danger,  #ef4444)',
            neutral:   'var(--nc-bg-tertiary)',
        };

        return html`
            <style>
                :host { display: inline-flex; position: relative; flex-shrink: 0; }

                .avatar {
                    width: ${sizeVal};
                    height: ${sizeVal};
                    border-radius: ${borderRadius};
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: ${variantBg[variant] ?? variantBg.neutral};
                    color: ${variant === 'neutral' ? 'var(--nc-text)' : '#fff'};
                    font-family: var(--nc-font-family);
                    font-size: ${fontSize};
                    font-weight: var(--nc-font-weight-semibold);
                    user-select: none;
                    flex-shrink: 0;
                }

                img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    display: ${showImg ? 'block' : 'none'};
                }

                .initials {
                    display: ${showImg ? 'none' : 'flex'};
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    height: 100%;
                    line-height: 1;
                }

                .status-dot {
                    position: absolute;
                    ${statusDotStyle}
                    width: ${statusSize};
                    height: ${statusSize};
                    border-radius: 50%;
                    background: ${STATUS_COLORS[status] ?? STATUS_COLORS.offline};
                    border: 2px solid var(--nc-bg);
                    display: ${status ? 'block' : 'none'};
                }
            </style>
            <div class="avatar" title="${alt}" aria-label="${alt}" role="img">
                ${showImg ? `<img src="${src}" alt="${alt}" />` : ''}
                <span class="initials">${letters || '?'}</span>
            </div>
            ${status ? `<span class="status-dot" aria-label="${status}"></span>` : ''}
        `;
    }

    onMount() {
        const img = this.$<HTMLImageElement>('img');
        if (img) {
            img.addEventListener('error', () => {
                this._imgError = true;
                this.render();
            });
        }
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue !== newValue) {
            if (name === 'src') this._imgError = false;
            if (this._mounted) { this.render(); this.onMount(); }
        }
    }
}

defineComponent('nc-avatar', NcAvatar);


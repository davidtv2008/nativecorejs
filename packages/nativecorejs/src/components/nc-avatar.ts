import { Component, defineComponent } from '../core/component.js';
import { escapeHTML, sanitizeURL } from '../utils/templates.js';

const SIZE_MAP: Record<string, string> = {
    xs: '24px',
    sm: '32px',
    md: '40px',
    lg: '48px',
    xl: '64px',
    '2xl': '80px'
};

const STATUS_COLORS: Record<string, string> = {
    online: '#22c55e',
    offline: '#94a3b8',
    away: '#f59e0b',
    busy: '#ef4444'
};

function initials(name: string): string {
    return name.trim().split(/\s+/).map(word => word[0] ?? '').join('').toUpperCase().slice(0, 2);
}

export class NcAvatar extends Component {
    static useShadowDOM = true;

    static get observedAttributes() {
        return ['src', 'alt', 'size', 'shape', 'variant', 'status', 'status-position'];
    }

    private imageError = false;

    template() {
        const src = this.getAttribute('src') || '';
        const alt = this.getAttribute('alt') || '';
        const sizeAttr = this.getAttribute('size') || 'md';
        const shape = this.getAttribute('shape') || 'circle';
        const variant = this.getAttribute('variant') || 'neutral';
        const status = this.getAttribute('status') || '';
        const statusPosition = this.getAttribute('status-position') || 'bottom-right';

        const sizeValue = SIZE_MAP[sizeAttr] ?? sizeAttr;
        const fontSize = `calc(${sizeValue} * 0.38)`;
        const statusSize = `calc(${sizeValue} * 0.26)`;
        const borderRadius = shape === 'circle' ? '50%' : shape === 'rounded' ? '25%' : '8px';
        const letters = initials(alt);
        const showImage = src && !this.imageError;
        const [verticalPosition, horizontalPosition] = statusPosition.split('-');
        const statusDotStyle = [
            verticalPosition === 'top' ? 'top: 0;' : 'bottom: 0;',
            horizontalPosition === 'right' ? 'right: 0;' : 'left: 0;'
        ].join(' ');

        const variantBackground: Record<string, string> = {
            primary: 'var(--nc-primary, #10b981)',
            secondary: 'var(--nc-secondary, #6366f1)',
            success: 'var(--nc-success, #10b981)',
            warning: 'var(--nc-warning, #f59e0b)',
            danger: 'var(--nc-danger, #ef4444)',
            neutral: 'var(--nc-bg-tertiary, #e5e7eb)'
        };

        return `
            <style>
                :host { display: inline-flex; position: relative; flex-shrink: 0; }

                .avatar {
                    width: ${sizeValue};
                    height: ${sizeValue};
                    border-radius: ${borderRadius};
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: ${variantBackground[variant] ?? variantBackground.neutral};
                    color: ${variant === 'neutral' ? 'var(--nc-text, #111827)' : '#fff'};
                    font-family: var(--nc-font-family);
                    font-size: ${fontSize};
                    font-weight: var(--nc-font-weight-semibold, 600);
                    user-select: none;
                    flex-shrink: 0;
                }

                img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    display: ${showImage ? 'block' : 'none'};
                }

                .initials {
                    display: ${showImage ? 'none' : 'flex'};
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
                    border: 2px solid var(--nc-bg, #ffffff);
                    display: ${status ? 'block' : 'none'};
                }
            </style>
            <div class="avatar" title="${escapeHTML(alt)}" aria-label="${escapeHTML(alt)}" role="img">
                ${showImage ? `<img src="${sanitizeURL(src)}" alt="${escapeHTML(alt)}" />` : ''}
                <span class="initials">${letters || '?'}</span>
            </div>
            ${status ? `<span class="status-dot" aria-label="${escapeHTML(status)}"></span>` : ''}
        `;
    }

    onMount() {
        const image = this.$<HTMLImageElement>('img');
        if (image) {
            image.addEventListener('error', () => {
                this.imageError = true;
                this.render();
            });
        }
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue !== newValue) {
            if (name === 'src') this.imageError = false;
            if (this._mounted) {
                this.render();
                this.onMount();
            }
        }
    }
}

defineComponent('nc-avatar', NcAvatar);

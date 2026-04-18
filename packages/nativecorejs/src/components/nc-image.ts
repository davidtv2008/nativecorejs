import { Component, defineComponent } from '../../.nativecore/core/component.js';
import { escapeHTML, sanitizeURL } from '../../.nativecore/utils/templates.js';

const RADIUS: Record<string, string> = {
    none: '0',
    sm: 'var(--nc-radius-sm, 0.375rem)',
    md: 'var(--nc-radius-md, 0.5rem)',
    lg: 'var(--nc-radius-lg, 1rem)',
    full: '9999px'
};

export class NcImage extends Component {
    static useShadowDOM = true;

    private loaded = false;
    private errored = false;

    static get observedAttributes() {
        return ['src', 'alt', 'width', 'height', 'fit', 'radius', 'aspect', 'fallback'];
    }

    template() {
        const src = this.getAttribute('src') ?? '';
        const alt = this.getAttribute('alt') ?? '';
        const width = this.getAttribute('width') ?? '';
        const height = this.getAttribute('height') ?? '';
        const fit = this.getAttribute('fit') ?? 'cover';
        const position = this.getAttribute('position') ?? 'center';
        const radius = this.getAttribute('radius') ?? 'none';
        const loading = this.getAttribute('loading') ?? 'lazy';
        const placeholder = this.getAttribute('placeholder') ?? 'skeleton';
        const aspect = this.getAttribute('aspect') ?? '';
        const caption = this.getAttribute('caption') ?? '';

        const radiusValue = RADIUS[radius] ?? radius;
        const aspectStyle = aspect ? `aspect-ratio: ${aspect};` : '';
        const widthStyle = width ? `width:${/^\d+$/.test(width) ? width + 'px' : width};` : '';
        const heightStyle = height ? `height:${/^\d+$/.test(height) ? height + 'px' : height};` : '';
        const showSkeleton = !this.loaded && !this.errored && placeholder === 'skeleton';

        return `
            <style>
                :host { display: inline-block; }
                figure {
                    margin: 0;
                    padding: 0;
                    display: block;
                    ${widthStyle} ${heightStyle}
                    border-radius: ${radiusValue};
                    overflow: hidden;
                    position: relative;
                    ${aspectStyle}
                }
                .skeleton {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(90deg, var(--nc-bg-secondary, #f8fafc) 25%, var(--nc-bg-tertiary, #e2e8f0) 50%, var(--nc-bg-secondary, #f8fafc) 75%);
                    background-size: 200% 100%;
                    animation: nc-img-shimmer 1.4s infinite linear;
                    border-radius: inherit;
                    display: ${showSkeleton ? 'block' : 'none'};
                }
                @keyframes nc-img-shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                img {
                    display: block;
                    width: 100%;
                    height: 100%;
                    object-fit: ${fit};
                    object-position: ${position};
                    border-radius: inherit;
                    opacity: ${this.loaded ? 1 : 0};
                    transition: opacity var(--nc-transition-base, 220ms ease);
                }
                .error-plate {
                    display: ${this.errored ? 'flex' : 'none'};
                    align-items: center;
                    justify-content: center;
                    position: absolute;
                    inset: 0;
                    background: var(--nc-bg-secondary, #f8fafc);
                    color: var(--nc-text-muted, #6b7280);
                    font-size: var(--nc-font-size-xs, 0.75rem);
                    font-family: var(--nc-font-family);
                    flex-direction: column;
                    gap: 4px;
                }
                figcaption {
                    font-family: var(--nc-font-family);
                    font-size: var(--nc-font-size-xs, 0.75rem);
                    color: var(--nc-text-muted, #6b7280);
                    text-align: center;
                    padding-top: 4px;
                    line-height: 1.4;
                }
            </style>
            <figure>
                <div class="skeleton"></div>
                <img id="img" src="${sanitizeURL(src)}" alt="${escapeHTML(alt)}" loading="${loading}" decoding="async" ${width ? `width="${width}"` : ''} ${height ? `height="${height}"` : ''} />
                <div class="error-plate" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    <span>Image not found</span>
                </div>
            </figure>
            ${caption ? `<figcaption>${escapeHTML(caption)}</figcaption>` : ''}
        `;
    }

    onMount() {
        const image = this.$<HTMLImageElement>('#img');
        if (!image) return;

        if (image.complete && image.naturalWidth > 0) {
            this.loaded = true;
            this.render();
            return;
        }

        image.addEventListener('load', () => {
            this.loaded = true;
            this.errored = false;
            this.render();
            this.dispatchEvent(new CustomEvent('load', { bubbles: true, composed: true }));
        }, { once: true });

        image.addEventListener('error', () => {
            const fallback = this.getAttribute('fallback');
            if (fallback && image.src !== fallback) {
                image.src = fallback;
                return;
            }
            this.errored = true;
            this.loaded = false;
            this.render();
            this.dispatchEvent(new CustomEvent('error', { bubbles: true, composed: true }));
        }, { once: true });
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue === newValue || !this._mounted) return;
        if (name === 'src') {
            this.loaded = false;
            this.errored = false;
        }
        this.render();
    }
}

defineComponent('nc-image', NcImage);



/**
 * NcImage Component — responsive image with lazy loading and skeleton placeholder
 *
 * Attributes:
 *   src         — image URL
 *   alt         — alt text (required for accessibility)
 *   width       — intrinsic width (CSS value or px integer)
 *   height      — intrinsic height
 *   fit         — CSS object-fit: 'cover'(default)|'contain'|'fill'|'none'|'scale-down'
 *   position    — CSS object-position (default: 'center')
 *   radius      — border-radius CSS value or preset: 'none'|'sm'|'md'|'lg'|'full'
 *   loading     — 'lazy'(default)|'eager'
 *   fallback    — fallback image URL on error
 *   placeholder — 'skeleton'(default)|'blur'|'none'
 *   aspect      — aspect ratio shorthand: '16/9'|'4/3'|'1/1'|'3/2' etc.
 *   caption     — optional caption text below image
 *
 * Events:
 *   load  — image loaded
 *   error — image failed
 *
 * Usage:
 *   <nc-image src="/photo.jpg" alt="Mountain view" aspect="16/9" radius="md"></nc-image>
 */
import { Component, defineComponent } from '@core/component.js';
import { html } from '@core-utils/templates.js';

const RADIUS: Record<string, string> = {
    none: '0',
    sm:   'var(--nc-radius-sm)',
    md:   'var(--nc-radius-md)',
    lg:   'var(--nc-radius-lg)',
    full: '9999px',
};

export class NcImage extends Component {
    static useShadowDOM = true;

    private _loaded  = false;
    private _errored = false;

    static get observedAttributes() { return ['src', 'alt', 'width', 'height', 'fit', 'radius', 'aspect', 'fallback']; }

    template() {
        const src         = this.getAttribute('src') ?? '';
        const alt         = this.getAttribute('alt') ?? '';
        const width       = this.getAttribute('width') ?? '';
        const height      = this.getAttribute('height') ?? '';
        const fit         = this.getAttribute('fit') ?? 'cover';
        const pos         = this.getAttribute('position') ?? 'center';
        const radius      = this.getAttribute('radius') ?? 'none';
        const loading     = this.getAttribute('loading') ?? 'lazy';
        const placeholder = this.getAttribute('placeholder') ?? 'skeleton';
        const aspect      = this.getAttribute('aspect') ?? '';
        const caption     = this.getAttribute('caption') ?? '';

        const radVal = RADIUS[radius] ?? radius;
        const aspectStyle = aspect ? `aspect-ratio: ${aspect.replace('/', '/')};` : '';
        const wStyle  = width  ? `width:${/^\d+$/.test(width)  ? width  + 'px' : width};`  : '';
        const hStyle  = height ? `height:${/^\d+$/.test(height) ? height + 'px' : height};` : '';
        const showSkeleton = !this._loaded && !this._errored && placeholder === 'skeleton';

        return html`
            <style>
                :host { display: inline-block; }
                figure {
                    margin: 0;
                    padding: 0;
                    display: block;
                    ${wStyle} ${hStyle}
                    border-radius: ${radVal};
                    overflow: hidden;
                    position: relative;
                    ${aspectStyle}
                }
                .skeleton {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(
                        90deg,
                        var(--nc-bg-secondary) 25%,
                        var(--nc-bg-tertiary, #e2e8f0) 50%,
                        var(--nc-bg-secondary) 75%
                    );
                    background-size: 200% 100%;
                    animation: nc-img-shimmer 1.4s infinite linear;
                    border-radius: inherit;
                    display: ${showSkeleton ? 'block' : 'none'};
                }
                @keyframes nc-img-shimmer {
                    0%   { background-position: -200% 0; }
                    100% { background-position:  200% 0; }
                }
                img {
                    display: block;
                    width: 100%;
                    height: 100%;
                    object-fit: ${fit};
                    object-position: ${pos};
                    border-radius: inherit;
                    opacity: ${this._loaded ? 1 : 0};
                    transition: opacity var(--nc-transition-base);
                }
                .error-plate {
                    display: ${this._errored ? 'flex' : 'none'};
                    align-items: center;
                    justify-content: center;
                    position: absolute;
                    inset: 0;
                    background: var(--nc-bg-secondary);
                    color: var(--nc-text-muted);
                    font-size: var(--nc-font-size-xs);
                    font-family: var(--nc-font-family);
                    flex-direction: column;
                    gap: 4px;
                }
                figcaption {
                    font-family: var(--nc-font-family);
                    font-size: var(--nc-font-size-xs);
                    color: var(--nc-text-muted);
                    text-align: center;
                    padding-top: 4px;
                    line-height: 1.4;
                }
            </style>
            <figure>
                <div class="skeleton"></div>
                <img
                    id="img"
                    src="${src}"
                    alt="${alt}"
                    loading="${loading}"
                    decoding="async"
                    ${width  ? `width="${width}"`   : ''}
                    ${height ? `height="${height}"` : ''}
                />
                <div class="error-plate" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <span>Image not found</span>
                </div>
            </figure>
            ${caption ? `<figcaption>${caption}</figcaption>` : ''}
        `;
    }

    onMount() {
        const img = this.$<HTMLImageElement>('#img');
        if (!img) return;

        if (img.complete && img.naturalWidth > 0) {
            this._loaded = true;
            this.render();
            return;
        }

        img.addEventListener('load', () => {
            this._loaded  = true;
            this._errored = false;
            this.render();
            this.dispatchEvent(new CustomEvent('load', { bubbles: true, composed: true }));
        }, { once: true });

        img.addEventListener('error', () => {
            const fallback = this.getAttribute('fallback');
            if (fallback && img.src !== fallback) {
                img.src = fallback;
                return;
            }
            this._errored = true;
            this._loaded  = false;
            this.render();
            this.dispatchEvent(new CustomEvent('error', { bubbles: true, composed: true }));
        }, { once: true });
    }

    attributeChangedCallback(n: string, o: string, v: string) {
        if (o === v || !this._mounted) return;
        if (n === 'src') { this._loaded = false; this._errored = false; }
        this.render();
    }
}

defineComponent('nc-image', NcImage);


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
import { CoreComponent } from '@core/component.js';
import { css, sanitizeURL } from '@core-utils/templates.js';

const RADIUS: Record<string, string> = {
    none: '0',
    sm:   'var(--nc-radius-sm)',
    md:   'var(--nc-radius-md)',
    lg:   'var(--nc-radius-lg)',
    full: '9999px',
};

export class NcImage extends CoreComponent {
    static useShadowDOM = true;
    static observedAttributes = ['src', 'alt', 'width', 'height', 'fit', 'radius', 'aspect', 'fallback', 'caption', 'position', 'placeholder', 'loading'];
    static attributeOptions = {
        fit:         ['cover', 'contain', 'fill', 'none', 'scale-down'],
        radius:      ['none', 'sm', 'md', 'lg', 'full'],
        placeholder: ['skeleton', 'blur', 'none'],
        loading:     ['lazy', 'eager'],
    };
    static attributePlaceholders = { src: 'https://example.com/img.jpg', alt: 'Description', aspect: '16/9' };
    static attributeOrder = ['src', 'alt', 'aspect', 'width', 'height', 'fit', 'radius', 'placeholder', 'loading', 'position', 'fallback', 'caption'];

    // -- Refs -----------------------------------------------------------------
    declare figureEl:     HTMLElement;
    declare imgEl:        HTMLImageElement;
    declare skeletonEl:   HTMLDivElement;
    declare errorPlateEl: HTMLDivElement;
    declare captionEl:    HTMLElement;

    private _loaded  = false;
    private _errored = false;

    static styles = css`
        :host { display: inline-block; }
        figure {
            margin: 0; padding: 0; display: block;
            border-radius: var(--img-radius, 0); overflow: hidden; position: relative;
        }
        .skeleton {
            position: absolute; inset: 0;
            background: linear-gradient(90deg, var(--nc-bg-secondary) 25%, var(--nc-bg-tertiary, #e2e8f0) 50%, var(--nc-bg-secondary) 75%);
            background-size: 200% 100%;
            animation: nc-img-shimmer 1.4s infinite linear;
            border-radius: inherit;
        }
        @keyframes nc-img-shimmer {
            0%   { background-position: -200% 0; }
            100% { background-position:  200% 0; }
        }
        img {
            display: block; width: 100%; height: 100%;
            object-fit: var(--img-fit, cover);
            object-position: var(--img-pos, center);
            border-radius: inherit;
            opacity: 0; transition: opacity var(--nc-transition-base);
        }
        .error-plate {
            display: none; align-items: center; justify-content: center;
            position: absolute; inset: 0;
            background: var(--nc-bg-secondary); color: var(--nc-text-muted);
            font-size: var(--nc-font-size-xs); font-family: var(--nc-font-family);
            flex-direction: column; gap: 4px;
        }
        figcaption {
            font-family: var(--nc-font-family); font-size: var(--nc-font-size-xs);
            color: var(--nc-text-muted); text-align: center; padding-top: 4px; line-height: 1.4;
        }
    `;

    template() {
        return `            <figure ref="figureEl">
                <div ref="skeletonEl" class="skeleton"></div>
                <img ref="imgEl" src="" alt="" loading="lazy" decoding="async"/>
                <div ref="errorPlateEl" class="error-plate" aria-hidden="true" style="display:none;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <span>Image not found</span>
                </div>
            </figure>
            <figcaption ref="captionEl" style="display:none;"></figcaption>
        `;
    }

    onMount() {
        this._syncFromAttrs();
        this._attachImageEvents();
    }

    protected _handleAttributeUpdate(name: string, _val: string | null) {
        if (name === 'src') {
            this._loaded  = false;
            this._errored = false;
            this._updateVisuals();
            this._attachImageEvents();
        }
        this._syncFromAttrs();
    }

    private _attachImageEvents() {
        if (this.imgEl.complete && this.imgEl.naturalWidth > 0) {
            this._loaded = true; this._errored = false;
            this._updateVisuals();
            return;
        }
        this.imgEl.addEventListener('load', () => {
            this._loaded = true; this._errored = false;
            this._updateVisuals();
            this.emit('load');
        }, { once: true });
        this.imgEl.addEventListener('error', () => {
            const fallback = this.getAttribute('fallback');
            if (fallback && !this.imgEl.src.endsWith(fallback)) {
                this.imgEl.src = fallback;
                return;
            }
            this._errored = true; this._loaded = false;
            this._updateVisuals();
            this.emit('error');
        }, { once: true });
    }

    private _syncFromAttrs() {
        const src     = this.getAttribute('src')      ?? '';
        const alt     = this.getAttribute('alt')      ?? '';
        const width   = this.getAttribute('width')    ?? '';
        const height  = this.getAttribute('height')   ?? '';
        const fit     = this.getAttribute('fit')      ?? 'cover';
        const pos     = this.getAttribute('position') ?? 'center';
        const radius  = this.getAttribute('radius')   ?? 'none';
        const loading = this.getAttribute('loading')  ?? 'lazy';
        const aspect  = this.getAttribute('aspect')   ?? '';
        const caption = this.getAttribute('caption')  ?? '';

        const radVal  = RADIUS[radius] ?? radius;
        const safeSrc = sanitizeURL(src);

        this.figureEl.style.setProperty('--img-fit',    fit);
        this.figureEl.style.setProperty('--img-pos',    pos);
        this.figureEl.style.setProperty('--img-radius', radVal);
        if (width)  this.figureEl.style.width       = /^\d+$/.test(width)  ? width  + 'px' : width;
        if (height) this.figureEl.style.height      = /^\d+$/.test(height) ? height + 'px' : height;
        if (aspect) this.figureEl.style.aspectRatio = aspect;

        if (this.imgEl.getAttribute('src') !== safeSrc) this.imgEl.src = safeSrc;
        this.imgEl.alt     = alt;
        this.imgEl.loading = loading as 'lazy' | 'eager';

        if (caption) { this.captionEl.textContent = caption; this.captionEl.style.display = ''; }
        else          { this.captionEl.style.display = 'none'; }

        this._updateVisuals();
    }

    private _updateVisuals() {
        const placeholder  = this.getAttribute('placeholder') ?? 'skeleton';
        const showSkeleton = !this._loaded && !this._errored && placeholder === 'skeleton';
        this.imgEl.style.opacity        = this._loaded  ? '1' : '0';
        this.skeletonEl.style.display   = showSkeleton  ? 'block' : 'none';
        this.errorPlateEl.style.display = this._errored ? 'flex'  : 'none';
    }
}

if (!customElements.get('nc-image')) customElements.define('nc-image', NcImage);


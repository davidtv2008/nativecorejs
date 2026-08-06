/**
 * NcSkeleton Component
 *
 * Attributes:
 *   - variant: 'text'|'rect'|'circle'|'card' (default: 'text')
 *   - width: string — CSS width (default: '100%')
 *   - height: string — CSS height
 *   - lines: number — for variant="text", how many text lines to show (default: 1)
 *   - animate: 'pulse'|'wave'|'none' (default: 'wave')
 *
 * Usage:
 *   <nc-skeleton></nc-skeleton>
 *   <nc-skeleton variant="circle" width="40px" height="40px"></nc-skeleton>
 *   <nc-skeleton variant="text" lines="3"></nc-skeleton>
 *   <nc-skeleton variant="card"></nc-skeleton>
 */

import { CoreComponent } from '../../.nativecore/core/component.js';
import { css, html } from '../../.nativecore/utils/templates.js';

export class NcSkeleton extends CoreComponent {
    static useShadowDOM = true;

    static observedAttributes = ['variant', 'width', 'height', 'lines', 'animate'];

    static attributeOptions = {
        variant: ['text', 'rect', 'circle', 'card'],
        animate: ['wave', 'pulse', 'none'],
    };

    static attributePlaceholders = {
        width:  '200px',
        height: '120px',
        lines:  '3',
    };

    static attributeOrder = ['variant', 'animate', 'lines', 'width', 'height'];

    declare skeletonEl: HTMLDivElement;

    static styles = css`
        :host { display: block; }
        .skeleton { display: flex; flex-direction: column; gap: 6px; }
        .bone {
            display: block; background: var(--nc-bg-tertiary);
            border-radius: 4px; position: relative; overflow: hidden;
        }
        .bone--text   { height: 0.875em; border-radius: 3px; }
        .bone--circle { border-radius: 50%; flex-shrink: 0; }
        .bone--rect   { border-radius: var(--nc-radius-md, 8px); width: 100%; }
        @keyframes nc-skeleton-wave {
            0%   { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }
        .wave .bone::after {
            content: ''; position: absolute; inset: 0;
            background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,.08) 50%, transparent 100%);
            animation: nc-skeleton-wave 1.6s ease-in-out infinite;
        }
        @keyframes nc-skeleton-pulse {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0.4; }
        }
        .pulse .bone { animation: nc-skeleton-pulse 1.8s ease-in-out infinite; }
    `;

    template() {
        return `            <div ref="skeletonEl" class="skeleton" aria-hidden="true"></div>
        `;
    }

    onMount() { this._syncFromAttrs(); }

    protected _handleAttributeUpdate(_name: string, _val: string | null) {
        this._syncFromAttrs();
    }

    private _syncFromAttrs() {
        const variant = this.getAttribute('variant') || 'text';
        const width   = this.getAttribute('width')   || '100%';
        const height  = this.getAttribute('height')  || '';
        const lines   = Math.max(1, Number(this.getAttribute('lines') || 1));
        const animate = this.getAttribute('animate') ?? 'wave';

        const baseHeight = height || (
            variant === 'text'   ? '0.875em' :
            variant === 'rect'   ? '120px'   :
            variant === 'circle' ? width     : '160px'
        );

        this.style.width = variant === 'circle' ? 'auto' : width;
        this.skeletonEl.classList.toggle('wave',  animate === 'wave');
        this.skeletonEl.classList.toggle('pulse', animate === 'pulse');

        let content = '';
        if (variant === 'text') {
            content = Array.from({ length: lines }, (_, i) => {
                const w = i === lines - 1 && lines > 1 ? '75%' : '100%';
                return `<span class="bone bone--text" style="width:${w}"></span>`;
            }).join('');
        } else if (variant === 'circle') {
            content = `<span class="bone bone--circle" style="width:${width};height:${width}"></span>`;
        } else if (variant === 'card') {
            content = `<span class="bone bone--rect" style="height:120px;margin-bottom:12px"></span>
                <span class="bone bone--text" style="width:60%;margin-bottom:8px"></span>
                <span class="bone bone--text" style="width:90%;margin-bottom:8px"></span>
                <span class="bone bone--text" style="width:75%"></span>`;
        } else {
            content = `<span class="bone bone--rect" style="height:${baseHeight}"></span>`;
        }
        this.skeletonEl.innerHTML = content;
    }
}

if (!customElements.get('nc-skeleton')) customElements.define('nc-skeleton', NcSkeleton);


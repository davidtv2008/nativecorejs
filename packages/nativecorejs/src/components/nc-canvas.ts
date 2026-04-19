/**
 * NcCanvas Component
 *
 * NativeCore Framework Core Component
 *
 * A fully-featured, responsive canvas wrapper that handles the most common canvas
 * pitfalls out of the box: HiDPI/Retina scaling, resize observation, touch+mouse
 * drawing, and programmatic access.
 *
 * Attributes:
 *   - width: number           - logical width in px (auto-tracks container if omitted)
 *   - height: number          - logical height in px (default: 300)
 *   - mode: 'draw' | 'signature' | 'static'
 *             draw      - freehand drawing with color/stroke controls
 *             signature - draw mode pre-configured for signatures (black, thin pen)
 *             static    - no built-in drawing; use getContext() / drawImage() programmatically
 *   - stroke-color: string    - CSS color (default: '#000000')
 *   - stroke-width: number    - line width in logical px (default: 2)
 *   - bg-color: string        - canvas background fill on clear (default: '#ffffff')
 *   - show-toolbar: boolean   - show built-in toolbar (default: true for draw/signature, false for static)
 *   - download-label: string  - label for the download button (default: 'Download')
 *   - download-filename: string - file name without extension (default: 'canvas')
 *   - download-format: 'png' | 'jpeg' | 'webp' (default: 'png')
 *   - disabled: boolean       - disables all drawing
 *   - placeholder: string     - placeholder text shown on empty canvas (signature mode)
 *
 * Properties (get/set after mount):
 *   - strokeColor: string
 *   - strokeWidth: number
 *   - bgColor: string
 *
 * Methods (accessible via element reference):
 *   - getContext(): CanvasRenderingContext2D | null
 *   - getCanvas(): HTMLCanvasElement | null
 *   - clear(): void
 *   - download(filename?, format?): void
 *   - toDataURL(format?, quality?): string
 *   - toBlob(callback, format?, quality?): void
 *   - isEmpty(): boolean
 *   - loadImage(src: string): Promise<void>
 *   - resize(): void  — call this if you change container size programmatically
 *
 * Events:
 *   - draw-start:  CustomEvent<{ x: number; y: number }>
 *   - draw-move:   CustomEvent<{ x: number; y: number }>
 *   - draw-end:    CustomEvent<{ dataURL: string }>
 *   - canvas-clear: CustomEvent<void>
 *   - canvas-ready: CustomEvent<{ canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }>
 *
 * Usage:
 *   <!-- Freehand drawing with toolbar -->
 *   <nc-canvas mode="draw" height="400"></nc-canvas>
 *
 *   <!-- Signature capture -->
 *   <nc-canvas mode="signature" height="200" placeholder="Sign here"></nc-canvas>
 *
 *   <!-- Static - draw via JS -->
 *   <nc-canvas mode="static" height="300" id="my-chart"></nc-canvas>
 *
 *   <!-- JS access -->
 *   const nc = document.querySelector('#my-chart');
 *   const ctx = nc.getContext();
 *   ctx.fillStyle = 'red';
 *   ctx.fillRect(10, 10, 100, 100);
 */

import { Component, defineComponent } from '../../.nativecore/core/component.js';

export class NcCanvas extends Component {
    static useShadowDOM = true;

    static get observedAttributes() {
        return [
            'width', 'height', 'mode', 'stroke-color', 'stroke-width',
            'bg-color', 'show-toolbar', 'download-label', 'download-filename',
            'download-format', 'disabled', 'placeholder',
        ];
    }

    // Internal drawing state
    private _drawing = false;
    private _lastX = 0;
    private _lastY = 0;
    private _hasStrokes = false;

    // ResizeObserver to handle container changes
    private _resizeObserver: ResizeObserver | null = null;

    // Pixel-ratio — cached once on mount
    private _dpr = 1;

    // -----------------------------------------------------------------
    // Lifecycle
    // -----------------------------------------------------------------

    template() {
        const mode        = this._mode();
        const showToolbar = this._showToolbar();
        const disabled    = this.hasAttribute('disabled');
        const strokeColor = this.getAttribute('stroke-color') || '#000000';
        const strokeWidth = Number(this.getAttribute('stroke-width') || '2');
        const dlLabel     = this.getAttribute('download-label') || 'Download';
        const placeholder = this.getAttribute('placeholder') || '';
        const isSignature = mode === 'signature';
        const isStatic    = mode === 'static';

        return html`
            <style>
                :host {
                    display: block;
                    width: 100%;
                    font-family: var(--nc-font-family, system-ui, sans-serif);
                }

                .nc-canvas-wrapper {
                    position: relative;
                    width: 100%;
                    background: var(--nc-bg, #fff);
                    border: 1px solid var(--nc-border, #e2e8f0);
                    border-radius: var(--nc-radius-lg, 0.5rem);
                    overflow: hidden;
                }

                canvas {
                    display: block;
                    width: 100%;
                    height: 100%;
                    touch-action: none;
                    cursor: ${disabled || isStatic ? 'default' : 'crosshair'};
                    border-radius: inherit;
                }

                /* Placeholder - shown on top of empty canvas in signature mode */
                .nc-canvas-placeholder {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    pointer-events: none;
                    font-size: var(--nc-font-size-sm, 0.875rem);
                    color: var(--nc-text-muted, #94a3b8);
                    user-select: none;
                    opacity: ${this._hasStrokes ? '0' : '1'};
                    transition: opacity 0.2s;
                }

                /* Toolbar */
                .nc-canvas-toolbar {
                    display: ${showToolbar ? 'flex' : 'none'};
                    align-items: center;
                    gap: var(--nc-spacing-sm, 0.5rem);
                    padding: var(--nc-spacing-sm, 0.5rem) var(--nc-spacing-md, 1rem);
                    border-top: 1px solid var(--nc-border, #e2e8f0);
                    background: var(--nc-bg-secondary, #f8fafc);
                    flex-wrap: wrap;
                }

                /* Signature mode simplifies the toolbar */
                .nc-canvas-toolbar.signature {
                    justify-content: space-between;
                }

                .toolbar-group {
                    display: flex;
                    align-items: center;
                    gap: var(--nc-spacing-xs, 0.25rem);
                }

                .toolbar-label {
                    font-size: var(--nc-font-size-xs, 0.75rem);
                    color: var(--nc-text-muted, #64748b);
                    white-space: nowrap;
                }

                /* Color swatch */
                input[type="color"] {
                    width: 28px;
                    height: 28px;
                    padding: 1px;
                    border: 1px solid var(--nc-border, #e2e8f0);
                    border-radius: var(--nc-radius-sm, 0.25rem);
                    cursor: pointer;
                    background: none;
                }

                /* Range slider */
                input[type="range"] {
                    width: 80px;
                    accent-color: var(--nc-primary, #10b981);
                    cursor: pointer;
                }

                /* Toolbar buttons */
                .btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 4px 10px;
                    font-size: var(--nc-font-size-xs, 0.75rem);
                    font-family: inherit;
                    font-weight: var(--nc-font-weight-medium, 500);
                    border-radius: var(--nc-radius-md, 0.375rem);
                    border: 1px solid var(--nc-border, #e2e8f0);
                    cursor: pointer;
                    transition: background var(--nc-transition-fast, 150ms), color var(--nc-transition-fast, 150ms);
                    background: var(--nc-bg, #fff);
                    color: var(--nc-text, #0f172a);
                    white-space: nowrap;
                }

                .btn:hover { background: var(--nc-bg-alt, #f1f5f9); }

                .btn.danger {
                    color: var(--nc-danger, #ef4444);
                    border-color: var(--nc-danger, #ef4444);
                }

                .btn.danger:hover { background: rgba(239,68,68,0.08); }

                .btn.primary {
                    background: var(--nc-primary, #10b981);
                    color: #fff;
                    border-color: transparent;
                }

                .btn.primary:hover { filter: brightness(0.92); }

                .btn:disabled,
                .btn[disabled] {
                    opacity: 0.45;
                    pointer-events: none;
                }

                /* Width preview dot */
                .width-preview {
                    display: inline-block;
                    width: ${strokeWidth}px;
                    height: ${strokeWidth}px;
                    max-width: 20px;
                    max-height: 20px;
                    border-radius: 50%;
                    background: ${strokeColor};
                    flex-shrink: 0;
                    transition: width 0.1s, height 0.1s;
                }
            </style>

            <div class="nc-canvas-wrapper" id="wrapper">
                <canvas id="canvas" aria-label="Drawing canvas"></canvas>
                ${raw(placeholder && !isStatic ? `<div class="nc-canvas-placeholder" id="placeholder">${placeholder}</div>` : '')}
            </div>

            <div class="nc-canvas-toolbar${isSignature ? ' signature' : ''}" id="toolbar">
                ${raw(!isSignature && !isStatic ? `
                <div class="toolbar-group">
                    <label class="toolbar-label" for="nc-color">Color</label>
                    <input type="color" id="nc-color" value="${strokeColor}" title="Stroke color" />
                </div>
                <div class="toolbar-group">
                    <label class="toolbar-label" for="nc-width">Size</label>
                    <input type="range" id="nc-width" min="1" max="40" step="1" value="${strokeWidth}" title="Stroke width" />
                    <span class="width-preview" id="width-preview"></span>
                </div>
                ` : '')}
                <div class="toolbar-group" style="margin-left: auto;">
                    <button class="btn danger" id="btn-clear" type="button"${disabled ? ' disabled' : ''}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                        </svg>
                        Clear
                    </button>
                    <button class="btn primary" id="btn-download" type="button">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        ${dlLabel}
                    </button>
                </div>
            </div>
        `;
    }

    onMount() {
        this._dpr = window.devicePixelRatio || 1;
        this._initCanvas();
        this._attachToolbarEvents();
        this._observeResize();
    }

    onUnmount() {
        this._resizeObserver?.disconnect();
        this._resizeObserver = null;
    }

    attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null) {
        if (oldVal === newVal) return;
        if (!this._mounted) return;

        if (name === 'stroke-color') {
            const preview = this.shadowRoot!.querySelector<HTMLElement>('#width-preview');
            if (preview) preview.style.background = newVal || '#000000';
            const colorInput = this.shadowRoot!.querySelector<HTMLInputElement>('#nc-color');
            if (colorInput) colorInput.value = newVal || '#000000';
            return;
        }

        if (name === 'stroke-width') {
            const w = Number(newVal || '2');
            const preview = this.shadowRoot!.querySelector<HTMLElement>('#width-preview');
            if (preview) { preview.style.width = `${Math.min(w, 20)}px`; preview.style.height = `${Math.min(w, 20)}px`; }
            const rangeInput = this.shadowRoot!.querySelector<HTMLInputElement>('#nc-width');
            if (rangeInput) rangeInput.value = String(w);
            return;
        }

        // For structural attribute changes re-render
        if (['mode', 'show-toolbar', 'download-label', 'height', 'width'].includes(name)) {
            this.render();
            this._dpr = window.devicePixelRatio || 1;
            this._initCanvas();
            this._attachToolbarEvents();
            this._observeResize();
        }
    }

    // -----------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------

    getCanvas(): HTMLCanvasElement | null {
        return this.shadowRoot?.querySelector<HTMLCanvasElement>('#canvas') ?? null;
    }

    getContext(): CanvasRenderingContext2D | null {
        return this.getCanvas()?.getContext('2d') ?? null;
    }

    clear(): void {
        const canvas = this.getCanvas();
        const ctx = this.getContext();
        if (!canvas || !ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this._fillBackground(ctx, canvas);
        this._hasStrokes = false;
        this._updatePlaceholder(true);
        this.dispatchEvent(new CustomEvent('canvas-clear', { bubbles: true, composed: true }));
    }

    download(filename?: string, format?: string): void {
        const canvas = this.getCanvas();
        if (!canvas) return;
        const name = filename || this.getAttribute('download-filename') || 'canvas';
        const fmt  = format  || this.getAttribute('download-format')   || 'png';
        const mimeType = fmt === 'jpeg' ? 'image/jpeg' : fmt === 'webp' ? 'image/webp' : 'image/png';
        const ext  = fmt === 'jpeg' ? 'jpg' : fmt;

        // For formats that don't support transparency, composite on bg first
        let dataURL: string;
        if (fmt !== 'png') {
            const tmp = document.createElement('canvas');
            tmp.width  = canvas.width;
            tmp.height = canvas.height;
            const tmpCtx = tmp.getContext('2d')!;
            tmpCtx.fillStyle = this.getAttribute('bg-color') || '#ffffff';
            tmpCtx.fillRect(0, 0, tmp.width, tmp.height);
            tmpCtx.drawImage(canvas, 0, 0);
            dataURL = tmp.toDataURL(mimeType, 0.92);
        } else {
            dataURL = canvas.toDataURL(mimeType);
        }

        const link = document.createElement('a');
        link.href = dataURL;
        link.download = `${name}.${ext}`;
        link.click();
    }

    toDataURL(format = 'image/png', quality = 1): string {
        return this.getCanvas()?.toDataURL(format, quality) ?? '';
    }

    toBlob(callback: BlobCallback, format = 'image/png', quality = 1): void {
        this.getCanvas()?.toBlob(callback, format, quality);
    }

    isEmpty(): boolean {
        return !this._hasStrokes;
    }

    async loadImage(src: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const ctx = this.getContext();
                const canvas = this.getCanvas();
                if (!ctx || !canvas) { resolve(); return; }
                ctx.drawImage(img, 0, 0, canvas.width / this._dpr, canvas.height / this._dpr);
                this._hasStrokes = true;
                this._updatePlaceholder(false);
                resolve();
            };
            img.onerror = () => reject(new Error(`NcCanvas: failed to load image "${src}"`));
            img.src = src;
        });
    }

    /** Re-compute canvas size from container. Call after programmatic size changes. */
    resize(): void {
        this._syncCanvasSize();
    }

    // Property accessors — convenience mirrors of attributes
    get strokeColor(): string { return this.getAttribute('stroke-color') || '#000000'; }
    set strokeColor(v: string) { this.setAttribute('stroke-color', v); }

    get strokeWidth(): number { return Number(this.getAttribute('stroke-width') || '2'); }
    set strokeWidth(v: number) { this.setAttribute('stroke-width', String(v)); }

    get bgColor(): string { return this.getAttribute('bg-color') || '#ffffff'; }
    set bgColor(v: string) { this.setAttribute('bg-color', v); }

    // -----------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------

    private _mode(): string {
        return this.getAttribute('mode') || 'draw';
    }

    private _showToolbar(): boolean {
        const attr = this.getAttribute('show-toolbar');
        if (attr === null) return this._mode() !== 'static';
        return attr !== 'false';
    }

    private _initCanvas(): void {
        const canvas = this.getCanvas();
        if (!canvas) return;

        this._syncCanvasSize();

        const ctx = this.getContext();
        if (!ctx) return;

        this._fillBackground(ctx, canvas);
        this._applyContextDefaults(ctx);

        this._attachCanvasEvents(canvas, ctx);

        this.dispatchEvent(new CustomEvent('canvas-ready', {
            bubbles: true,
            composed: true,
            detail: { canvas, ctx },
        }));
    }

    private _syncCanvasSize(): void {
        const canvas = this.getCanvas();
        const wrapper = this.shadowRoot?.querySelector<HTMLElement>('#wrapper');
        if (!canvas || !wrapper) return;

        const logicalW = this.getAttribute('width')
            ? Number(this.getAttribute('width'))
            : wrapper.clientWidth || canvas.offsetWidth || 300;

        const logicalH = Number(this.getAttribute('height') || '300');

        // Save current drawing before resize
        let snapshot: ImageData | null = null;
        const ctx = canvas.getContext('2d');
        if (ctx && canvas.width > 0 && canvas.height > 0) {
            try { snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height); } catch { /* cross-origin */ }
        }

        canvas.width  = Math.round(logicalW  * this._dpr);
        canvas.height = Math.round(logicalH  * this._dpr);
        canvas.style.height = `${logicalH}px`;

        if (ctx) {
            ctx.scale(this._dpr, this._dpr);
            this._fillBackground(ctx, canvas);
            this._applyContextDefaults(ctx);

            if (snapshot) {
                // Restore snapshot — note coordinates are in physical px at this point
                // so we temporarily reset transform
                ctx.save();
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.putImageData(snapshot, 0, 0);
                ctx.restore();
                ctx.scale(this._dpr, this._dpr);
            }
        }
    }

    private _fillBackground(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
        const bg = this.getAttribute('bg-color') || '#ffffff';
        if (bg === 'transparent') return;
        // Draw in physical coordinates then restore logical scale
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    private _applyContextDefaults(ctx: CanvasRenderingContext2D): void {
        const mode = this._mode();
        ctx.lineCap    = 'round';
        ctx.lineJoin   = 'round';
        ctx.strokeStyle = (mode === 'signature')
            ? '#000000'
            : (this.getAttribute('stroke-color') || '#000000');
        ctx.lineWidth = (mode === 'signature')
            ? 1.5
            : Number(this.getAttribute('stroke-width') || '2');
    }

    private _attachCanvasEvents(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
        const mode     = this._mode();
        const isStatic = mode === 'static';
        if (isStatic || this.hasAttribute('disabled')) return;

        // Helper: logical coords from any event
        const coords = (e: MouseEvent | Touch): { x: number; y: number } => {
            const rect = canvas.getBoundingClientRect();
            return {
                x: (e.clientX - rect.left),
                y: (e.clientY - rect.top),
            };
        };

        const startDraw = (x: number, y: number) => {
            this._drawing = true;
            this._lastX   = x;
            this._lastY   = y;
            ctx.beginPath();
            ctx.moveTo(x, y);
            this.dispatchEvent(new CustomEvent('draw-start', { bubbles: true, composed: true, detail: { x, y } }));
        };

        const moveDraw = (x: number, y: number) => {
            if (!this._drawing) return;
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, y);
            this._lastX = x;
            this._lastY = y;
            this._hasStrokes = true;
            this._updatePlaceholder(false);
            this.dispatchEvent(new CustomEvent('draw-move', { bubbles: true, composed: true, detail: { x, y } }));
        };

        const endDraw = () => {
            if (!this._drawing) return;
            this._drawing = false;
            ctx.beginPath();
            this.dispatchEvent(new CustomEvent('draw-end', {
                bubbles: true,
                composed: true,
                detail: { dataURL: canvas.toDataURL() },
            }));
        };

        // Mouse events
        canvas.addEventListener('mousedown', (e: MouseEvent) => {
            e.preventDefault();
            const { x, y } = coords(e);
            startDraw(x, y);
        });
        canvas.addEventListener('mousemove', (e: MouseEvent) => {
            const { x, y } = coords(e);
            moveDraw(x, y);
        });
        canvas.addEventListener('mouseup',    () => endDraw());
        canvas.addEventListener('mouseleave', () => endDraw());

        // Touch events (single touch for drawing/signature)
        canvas.addEventListener('touchstart', (e: TouchEvent) => {
            e.preventDefault();
            const { x, y } = coords(e.touches[0]);
            startDraw(x, y);
        }, { passive: false });

        canvas.addEventListener('touchmove', (e: TouchEvent) => {
            e.preventDefault();
            const { x, y } = coords(e.touches[0]);
            moveDraw(x, y);
        }, { passive: false });

        canvas.addEventListener('touchend',   () => endDraw());
        canvas.addEventListener('touchcancel', () => endDraw());

        // Stylus pressure support (Pointer Events API)
        canvas.addEventListener('pointerdown', (e: PointerEvent) => {
            if (e.pointerType === 'mouse') return; // handled above
            e.preventDefault();
            const { x, y } = coords(e);
            startDraw(x, y);
            // Vary line width by pressure for stylus
            if (e.pressure && e.pointerType === 'pen') {
                ctx.lineWidth = Math.max(0.5, Number(this.getAttribute('stroke-width') || '2') * e.pressure * 1.5);
            }
        });

        canvas.addEventListener('pointermove', (e: PointerEvent) => {
            if (e.pointerType === 'mouse') return;
            const { x, y } = coords(e);
            if (e.pointerType === 'pen' && e.pressure) {
                ctx.lineWidth = Math.max(0.5, Number(this.getAttribute('stroke-width') || '2') * e.pressure * 1.5);
            }
            moveDraw(x, y);
        });

        canvas.addEventListener('pointerup',     (e: PointerEvent) => { if (e.pointerType !== 'mouse') endDraw(); });
        canvas.addEventListener('pointercancel', (e: PointerEvent) => { if (e.pointerType !== 'mouse') endDraw(); });
    }

    private _attachToolbarEvents(): void {
        const sr = this.shadowRoot!;

        const colorInput = sr.querySelector<HTMLInputElement>('#nc-color');
        const widthInput = sr.querySelector<HTMLInputElement>('#nc-width');
        const preview    = sr.querySelector<HTMLElement>('#width-preview');
        const btnClear   = sr.querySelector<HTMLButtonElement>('#btn-clear');
        const btnDl      = sr.querySelector<HTMLButtonElement>('#btn-download');

        colorInput?.addEventListener('input', (e) => {
            const val = (e.target as HTMLInputElement).value;
            this.setAttribute('stroke-color', val);
            const ctx = this.getContext();
            if (ctx) ctx.strokeStyle = val;
            if (preview) preview.style.background = val;
        });

        widthInput?.addEventListener('input', (e) => {
            const val = Number((e.target as HTMLInputElement).value);
            this.setAttribute('stroke-width', String(val));
            const ctx = this.getContext();
            if (ctx) ctx.lineWidth = val;
            if (preview) {
                const clamped = Math.min(val, 20);
                preview.style.width  = `${clamped}px`;
                preview.style.height = `${clamped}px`;
            }
        });

        btnClear?.addEventListener('click', () => this.clear());
        btnDl?.addEventListener('click', () => this.download());
    }

    private _observeResize(): void {
        this._resizeObserver?.disconnect();

        const wrapper = this.shadowRoot?.querySelector<HTMLElement>('#wrapper');
        if (!wrapper) return;

        this._resizeObserver = new ResizeObserver(() => {
            this._syncCanvasSize();
        });

        this._resizeObserver.observe(wrapper);
    }

    private _updatePlaceholder(show: boolean): void {
        const el = this.shadowRoot?.querySelector<HTMLElement>('#placeholder');
        if (!el) return;
        el.style.opacity = show ? '1' : '0';
    }
}

defineComponent('nc-canvas', NcCanvas);

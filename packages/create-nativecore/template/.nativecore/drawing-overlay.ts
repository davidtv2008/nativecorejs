/**
 * Drawing Overlay — Dev Mode Annotation Layer
 * Only active when DEV MODE is on. Never ships in production.
 *
 * Features:
 *   - Freehand pen tool
 *   - Shape tools: Rectangle, Circle, Arrow, Line
 *   - Color picker (6 presets + custom)
 *   - Stroke width picker
 *   - Undo (Ctrl+Z) and clear
 *   - Sticky canvas — strokes persist until cleared
 *   - Canvas is click-through when drawing mode is off
 */

const CANVAS_ID  = '__nc_draw_canvas__';
const TOOLBAR_ID = '__nc_draw_toolbar__';
const STYLE_ID   = '__nc_draw_style__';

type Tool = 'pen' | 'rect' | 'circle' | 'pill' | 'line' | 'arrow' | 'move';

interface Stroke {
    tool: Tool;
    color: string;
    width: number;
    points: { x: number; y: number }[];  // pen
    x1?: number; y1?: number;            // shapes
    x2?: number; y2?: number;
}

const PRESET_COLORS = ['#ff4444', '#ffcc00', '#00ff88', '#4488ff', '#ff44cc', '#ffffff'];

const state = {
    active: false,
    tool: 'pen' as Tool,
    color: '#ff4444',
    strokeWidth: 3,
    drawing: false,
    current: null as Stroke | null,
    committed: [] as Stroke[],
    startX: 0,
    startY: 0,
    // Move tool
    dragIndex: -1,
    dragOffsetX: 0,
    dragOffsetY: 0,
};

// ─── Canvas helpers ───────────────────────────────────────────────────────────

function getCanvas(): HTMLCanvasElement | null {
    return document.getElementById(CANVAS_ID) as HTMLCanvasElement | null;
}

function getCtx(): CanvasRenderingContext2D | null {
    return getCanvas()?.getContext('2d') ?? null;
}

function resizeCanvas(): void {
    const canvas = getCanvas();
    if (!canvas) return;
    if (canvas.width === window.innerWidth && canvas.height === window.innerHeight) return;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    redrawAll();
}

// ─── Drawing ─────────────────────────────────────────────────────────────────

function applyCtxStyle(ctx: CanvasRenderingContext2D, stroke: Stroke): void {
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle   = stroke.color;
    ctx.lineWidth   = stroke.width;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke): void {
    applyCtxStyle(ctx, stroke);

    if (stroke.tool === 'pen') {
        if (stroke.points.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
        return;
    }

    const x1 = stroke.x1 ?? 0, y1 = stroke.y1 ?? 0;
    const x2 = stroke.x2 ?? 0, y2 = stroke.y2 ?? 0;

    if (stroke.tool === 'line') {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        return;
    }

    if (stroke.tool === 'rect') {
        ctx.beginPath();
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        return;
    }

    if (stroke.tool === 'circle') {
        // Perfect circle — use the smaller of the two deltas as the radius
        const dx = x2 - x1;
        const dy = y2 - y1;
        const r  = Math.min(Math.abs(dx), Math.abs(dy)) / 2;
        const cx = x1 + (dx < 0 ? -r : r);
        const cy = y1 + (dy < 0 ? -r : r);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        return;
    }

    if (stroke.tool === 'pill') {
        const w  = x2 - x1;
        const h  = y2 - y1;
        const aw = Math.abs(w);
        const ah = Math.abs(h);
        const r  = Math.min(aw, ah) / 2;
        const lx = Math.min(x1, x2);
        const ly = Math.min(y1, y2);
        ctx.beginPath();
        ctx.roundRect(lx, ly, aw, ah, r);
        ctx.stroke();
        return;
    }

    if (stroke.tool === 'arrow') {
        const dx = x2 - x1, dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 2) return;
        const ux = dx / len, uy = dy / len;
        const headLen = Math.min(24, len * 0.35);
        const angle = Math.PI / 7;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Arrowhead
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(
            x2 - headLen * (ux * Math.cos(angle) - uy * Math.sin(angle)),
            y2 - headLen * (uy * Math.cos(angle) + ux * Math.sin(angle))
        );
        ctx.moveTo(x2, y2);
        ctx.lineTo(
            x2 - headLen * (ux * Math.cos(-angle) - uy * Math.sin(-angle)),
            y2 - headLen * (uy * Math.cos(-angle) + ux * Math.sin(-angle))
        );
        ctx.stroke();
    }
}

function redrawAll(highlightIndex = -1): void {
    const ctx = getCtx();
    const canvas = getCanvas();
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(-window.scrollX, -window.scrollY);
    for (let i = 0; i < state.committed.length; i++) {
        if (i === highlightIndex) {
            ctx.save();
            ctx.globalAlpha = 0.6;
            drawStroke(ctx, state.committed[i]);
            ctx.restore();
        } else {
            drawStroke(ctx, state.committed[i]);
        }
    }
    ctx.restore();
}

function onScroll(): void {
    redrawAll();
}

// ─── Hit testing ─────────────────────────────────────────────────────────────

function distPointToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - ax, py - ay);
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function hitTest(stroke: Stroke, x: number, y: number): boolean {
    const thresh = Math.max(stroke.width / 2 + 8, 12);
    if (stroke.tool === 'pen') {
        for (let i = 1; i < stroke.points.length; i++) {
            const p = stroke.points[i - 1], q = stroke.points[i];
            if (distPointToSegment(x, y, p.x, p.y, q.x, q.y) <= thresh) return true;
        }
        return false;
    }
    const x1 = stroke.x1 ?? 0, y1 = stroke.y1 ?? 0;
    const x2 = stroke.x2 ?? 0, y2 = stroke.y2 ?? 0;
    if (stroke.tool === 'line' || stroke.tool === 'arrow') {
        return distPointToSegment(x, y, x1, y1, x2, y2) <= thresh;
    }
    // rect / circle / pill — hit border
    if (stroke.tool === 'rect' || stroke.tool === 'pill') {
        const lx = Math.min(x1, x2), rx = Math.max(x1, x2);
        const ty = Math.min(y1, y2), by = Math.max(y1, y2);
        const nearH = x >= lx - thresh && x <= rx + thresh;
        const nearV = y >= ty - thresh && y <= by + thresh;
        const onLeft   = nearV && Math.abs(x - lx) <= thresh;
        const onRight  = nearV && Math.abs(x - rx) <= thresh;
        const onTop    = nearH && Math.abs(y - ty) <= thresh;
        const onBottom = nearH && Math.abs(y - by) <= thresh;
        return onLeft || onRight || onTop || onBottom;
    }
    if (stroke.tool === 'circle') {
        const dx = x2 - x1, dy = y2 - y1;
        const r  = Math.min(Math.abs(dx), Math.abs(dy)) / 2;
        const cx = x1 + (dx < 0 ? -r : r);
        const cy = y1 + (dy < 0 ? -r : r);
        return Math.abs(Math.hypot(x - cx, y - cy) - r) <= thresh;
    }
    return false;
}

function findHit(x: number, y: number): number {
    for (let i = state.committed.length - 1; i >= 0; i--) {
        if (hitTest(state.committed[i], x, y)) return i;
    }
    return -1;
}

function offsetStroke(s: Stroke, dx: number, dy: number): void {
    s.points = s.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
    if (s.x1 != null) s.x1 += dx;
    if (s.y1 != null) s.y1 += dy;
    if (s.x2 != null) s.x2 += dx;
    if (s.y2 != null) s.y2 += dy;
}

// ─── Mouse / touch events ─────────────────────────────────────────────────────

function clientPos(clientX: number, clientY: number): { x: number; y: number } {
    return { x: clientX + window.scrollX, y: clientY + window.scrollY };
}

function pos(e: MouseEvent): { x: number; y: number } {
    return clientPos(e.clientX, e.clientY);
}

function touchPos(e: TouchEvent): { x: number; y: number } {
    const t = e.touches[0] ?? e.changedTouches[0];
    return clientPos(t.clientX, t.clientY);
}

function startDraw(x: number, y: number): void {
    if (state.tool === 'move') {
        state.dragIndex   = findHit(x, y);
        state.dragOffsetX = x;
        state.dragOffsetY = y;
        state.drawing     = state.dragIndex >= 0;
        if (state.dragIndex >= 0) redrawAll(state.dragIndex);
        return;
    }
    state.drawing = true;
    state.startX  = x;
    state.startY  = y;

    if (state.tool === 'pen') {
        state.current = { tool: 'pen', color: state.color, width: state.strokeWidth, points: [{ x, y }] };
    } else {
        state.current = { tool: state.tool, color: state.color, width: state.strokeWidth, points: [], x1: x, y1: y, x2: x, y2: y };
    }
}

function moveDraw(x: number, y: number): void {
    if (state.tool === 'move') {
        if (!state.drawing || state.dragIndex < 0) return;
        const dx = x - state.dragOffsetX;
        const dy = y - state.dragOffsetY;
        offsetStroke(state.committed[state.dragIndex], dx, dy);
        state.dragOffsetX = x;
        state.dragOffsetY = y;
        redrawAll(state.dragIndex);
        return;
    }
    const ctx = getCtx();
    if (!ctx) return;

    if (state.tool === 'pen') {
        state.current.points.push({ x, y });
        const pts = state.current.points;
        if (pts.length >= 2) {
            ctx.save();
            ctx.translate(-window.scrollX, -window.scrollY);
            ctx.strokeStyle = state.current.color;
            ctx.lineWidth   = state.current.width;
            ctx.lineCap     = 'round';
            ctx.lineJoin    = 'round';
            ctx.beginPath();
            ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.restore();
        }
    } else {
        // Redraw committed strokes then draw live preview on top
        state.current.x2 = x;
        state.current.y2 = y;
        redrawAll();
        ctx.save();
        ctx.translate(-window.scrollX, -window.scrollY);
        drawStroke(ctx, state.current);
        ctx.restore();
    }
}

function endDraw(x: number, y: number): void {
    if (state.tool === 'move') {
        state.drawing   = false;
        state.dragIndex = -1;
        redrawAll();
        return;
    }

    if (state.tool !== 'pen') {
        if (!state.current) return;
        state.current.x2 = x;
        state.current.y2 = y;
    }

    if (!state.current) return;
    const s = state.current;
    const hasContent = s.tool === 'pen'
        ? s.points.length > 1
        : Math.abs((s.x2 ?? 0) - (s.x1 ?? 0)) > 3 || Math.abs((s.y2 ?? 0) - (s.y1 ?? 0)) > 3;

    if (hasContent) state.committed.push(s);

    state.current = null;
    redrawAll();
}

function onMouseDown(e: MouseEvent): void {
    if (!state.active || e.button !== 0) return;
    e.preventDefault();
    const { x, y } = pos(e);
    startDraw(x, y);
}

function onMouseMove(e: MouseEvent): void {
    const { x, y } = pos(e);
    moveDraw(x, y);
}

function onMouseUp(e: MouseEvent): void {
    const { x, y } = pos(e);
    endDraw(x, y);
}

function onTouchStart(e: TouchEvent): void {
    if (!state.active) return;
    e.preventDefault(); // prevents scroll while drawing
    const { x, y } = touchPos(e);
    startDraw(x, y);
}

function onTouchMove(e: TouchEvent): void {
    if (!state.active) return;
    e.preventDefault();
    const { x, y } = touchPos(e);
    moveDraw(x, y);
}

function onTouchEnd(e: TouchEvent): void {
    if (!state.active) return;
    const { x, y } = touchPos(e);
    endDraw(x, y);
}

function onKeyDown(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (state.committed.length > 0) {
            state.committed.pop();
            redrawAll();
        }
        return;
    }
    if (e.key === 'Escape') {
        drawingOverlayInstance?.setVisible(false);
        syncBrushButton();
    }
}

// ─── Scroll passthrough ───────────────────────────────────────────────────────

// No longer needed — absolute canvas does not intercept scroll events.

// ─── Styles ──────────────────────────────────────────────────────────────────

function injectStyles(): void {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
        #${CANVAS_ID} {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: 2147483644;
            pointer-events: none;
            touch-action: none;
        }
        #${CANVAS_ID}.nc-draw-active {
            pointer-events: all;
            cursor: crosshair;
        }
        #${CANVAS_ID}.nc-draw-active.nc-cursor-move {
            cursor: grab;
        }
        #${CANVAS_ID}.nc-draw-active.nc-cursor-move.nc-dragging {
            cursor: grabbing;
        }
        #${TOOLBAR_ID} {
            position: fixed;
            bottom: 62px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 2147483645;
            background: rgba(10,10,10,0.88);
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 32px;
            padding: 6px 12px;
            display: flex;
            align-items: center;
            gap: 6px;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 11px;
            color: white;
            backdrop-filter: blur(8px);
            box-shadow: 0 4px 24px rgba(0,0,0,0.4);
            user-select: none;
            pointer-events: all;
            white-space: nowrap;
        }
        #${TOOLBAR_ID} .nc-dr-sep {
            width: 1px;
            height: 18px;
            background: rgba(255,255,255,0.15);
            margin: 0 2px;
            flex-shrink: 0;
        }
        #${TOOLBAR_ID} .nc-dr-tool {
            width: 28px;
            height: 28px;
            border-radius: 8px;
            border: 1.5px solid transparent;
            background: transparent;
            color: rgba(255,255,255,0.65);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            transition: background 0.15s, color 0.15s;
            padding: 0;
            flex-shrink: 0;
        }
        #${TOOLBAR_ID} .nc-dr-tool:hover {
            background: rgba(255,255,255,0.1);
            color: white;
        }
        #${TOOLBAR_ID} .nc-dr-tool.active {
            background: rgba(255,255,255,0.15);
            border-color: rgba(255,255,255,0.35);
            color: white;
        }
        #${TOOLBAR_ID} .nc-dr-color {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 2px solid transparent;
            cursor: pointer;
            flex-shrink: 0;
            transition: transform 0.1s, border-color 0.1s;
        }
        #${TOOLBAR_ID} .nc-dr-color:hover {
            transform: scale(1.2);
        }
        #${TOOLBAR_ID} .nc-dr-color.active {
            border-color: white;
            transform: scale(1.15);
        }
        #${TOOLBAR_ID} input[type=color] {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 2px solid rgba(255,255,255,0.3);
            cursor: pointer;
            padding: 0;
            background: none;
            flex-shrink: 0;
        }
        #${TOOLBAR_ID} input[type=range] {
            width: 64px;
            accent-color: white;
            cursor: pointer;
            flex-shrink: 0;
        }
        #${TOOLBAR_ID} .nc-dr-label {
            color: rgba(255,255,255,0.35);
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: .06em;
        }
    `;
    document.head.appendChild(s);
}

// ─── Toolbar ─────────────────────────────────────────────────────────────────

const TOOLS: { id: Tool; icon: string; title: string }[] = [
    { id: 'move',   icon: '↕️', title: 'Move / drag a stroke' },
    { id: 'pen',    icon: '✏️', title: 'Pen (freehand)' },
    { id: 'line',   icon: '╱',  title: 'Line' },
    { id: 'arrow',  icon: '→',  title: 'Arrow' },
    { id: 'rect',   icon: '▭',  title: 'Rectangle' },
    { id: 'circle', icon: '◯',  title: 'Circle (perfect)' },
    { id: 'pill',   icon: '⬭',  title: 'Pill / Capsule' },
];

function createToolbar(): HTMLElement {
    const bar = document.createElement('div');
    bar.id = TOOLBAR_ID;
    renderToolbar(bar);
    document.body.appendChild(bar);
    return bar;
}

function renderToolbar(bar: HTMLElement): void {
    bar.innerHTML = '';

    // Tool buttons
    for (const t of TOOLS) {
        const btn = document.createElement('button');
        btn.className = `nc-dr-tool${state.tool === t.id ? ' active' : ''}`;
        btn.title  = t.title;
        btn.type   = 'button';
        btn.textContent = t.icon;
        btn.addEventListener('click', () => {
            state.tool = t.id;
            const canvas = getCanvas();
            if (canvas) canvas.classList.toggle('nc-cursor-move', t.id === 'move');
            renderToolbar(bar);
        });
        bar.appendChild(btn);
    }

    // Separator
    const sep1 = document.createElement('div');
    sep1.className = 'nc-dr-sep';
    bar.appendChild(sep1);

    // Preset colors
    for (const c of PRESET_COLORS) {
        const swatch = document.createElement('div');
        swatch.className = `nc-dr-color${state.color === c ? ' active' : ''}`;
        swatch.style.background = c;
        swatch.title = c;
        swatch.addEventListener('click', () => {
            state.color = c;
            renderToolbar(bar);
        });
        bar.appendChild(swatch);
    }

    // Custom color picker
    const picker = document.createElement('input');
    picker.type  = 'color';
    picker.value = state.color;
    picker.title = 'Custom color';
    picker.addEventListener('input', () => {
        state.color = picker.value;
        renderToolbar(bar);
    });
    bar.appendChild(picker);

    // Separator
    const sep2 = document.createElement('div');
    sep2.className = 'nc-dr-sep';
    bar.appendChild(sep2);

    // Stroke width
    const widthLabel = document.createElement('span');
    widthLabel.className = 'nc-dr-label';
    widthLabel.textContent = 'W';
    bar.appendChild(widthLabel);

    const widthRange = document.createElement('input');
    widthRange.type  = 'range';
    widthRange.min   = '1';
    widthRange.max   = '20';
    widthRange.value = String(state.strokeWidth);
    widthRange.title = 'Stroke width';
    widthRange.addEventListener('input', () => {
        state.strokeWidth = Number(widthRange.value);
    });
    bar.appendChild(widthRange);

    // Separator
    const sep3 = document.createElement('div');
    sep3.className = 'nc-dr-sep';
    bar.appendChild(sep3);

    // Undo button
    const undoBtn = document.createElement('button');
    undoBtn.className = 'nc-dr-tool';
    undoBtn.title = 'Undo (Ctrl+Z)';
    undoBtn.type  = 'button';
    undoBtn.textContent = '↩';
    undoBtn.addEventListener('click', () => {
        if (state.committed.length > 0) {
            state.committed.pop();
            redrawAll();
        }
    });
    bar.appendChild(undoBtn);

    // Clear button
    const clearBtn = document.createElement('button');
    clearBtn.className = 'nc-dr-tool';
    clearBtn.title = 'Clear all drawings';
    clearBtn.type  = 'button';
    clearBtn.textContent = '🗑';
    clearBtn.addEventListener('click', () => {
        state.committed = [];
        redrawAll();
    });
    bar.appendChild(clearBtn);

    // Save button — screen capture
    const saveBtn = document.createElement('button');
    saveBtn.className = 'nc-dr-tool';
    saveBtn.title = 'Screenshot (captures full page)';
    saveBtn.type  = 'button';
    saveBtn.textContent = '💾';
    saveBtn.addEventListener('click', async () => {
        try {
            const stream = await (navigator.mediaDevices as any).getDisplayMedia({
                video: { displaySurface: 'browser' },
                preferCurrentTab: true,
            } as any);

            // Play the stream into a video element to get a stable frame
            const video = document.createElement('video');
            video.srcObject = stream;
            video.muted = true;
            await new Promise<void>((resolve) => {
                video.onloadedmetadata = () => { video.play(); resolve(); };
            });
            // Wait one animation frame for the first real frame to paint
            await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));

            stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());

            // Composite video frame + current drawing canvas into one image
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const offscreen = document.createElement('canvas');
            offscreen.width  = vw;
            offscreen.height = vh;
            const octx = offscreen.getContext('2d')!;

            // Scale video frame to viewport size
            octx.drawImage(video, 0, 0, vw, vh);

            // Draw our annotation canvas on top (already viewport-sized)
            const drawCanvas = getCanvas();
            if (drawCanvas) octx.drawImage(drawCanvas, 0, 0);

            offscreen.toBlob(async (blob) => {
                if (!blob) return;
                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob }),
                    ]);
                    const orig = saveBtn.textContent;
                    saveBtn.textContent = '✓ copied';
                    setTimeout(() => { saveBtn.textContent = orig; }, 1500);
                } catch {
                    const link = document.createElement('a');
                    link.download = `screenshot-${Date.now()}.png`;
                    link.href = URL.createObjectURL(blob);
                    link.click();
                }
            }, 'image/png');
        } catch {
            // User cancelled or API not supported
        }
    });
    bar.appendChild(saveBtn);

    // Separator
    const sep4 = document.createElement('div');
    sep4.className = 'nc-dr-sep';
    bar.appendChild(sep4);

    // Exit button
    const exitBtn = document.createElement('button');
    exitBtn.className = 'nc-dr-tool';
    exitBtn.title = 'Exit drawing mode (Esc)';
    exitBtn.type  = 'button';
    exitBtn.textContent = '✕';
    exitBtn.style.color = 'rgba(255,100,100,0.8)';
    exitBtn.addEventListener('click', () => {
        drawingOverlayInstance?.setVisible(false);
        syncBrushButton();
    });
    bar.appendChild(exitBtn);

    // Prevent toolbar clicks from propagating to canvas
    bar.addEventListener('mousedown', e => e.stopPropagation());
}

// ─── Public API ───────────────────────────────────────────────────────────────

// Singleton ref so Escape key and Exit button can call back into the instance
let drawingOverlayInstance: DrawingOverlay | null = null;

function syncBrushButton(): void {
    const btn = document.getElementById('nativecore-denc-brush-btn');
    btn?.classList.toggle('drawing-on', drawingOverlayInstance?.isOn ?? false);
}

let resizeHandler: (() => void) | null = null;
let navHandler:    (() => void) | null = null;

export class DrawingOverlay {
    private canvas: HTMLCanvasElement | null = null;
    private toolbar: HTMLElement | null = null;
    private _on = false;

    init(): void {
        injectStyles();
        drawingOverlayInstance = this;

        // Canvas
        const canvas = document.createElement('canvas');
        canvas.id     = CANVAS_ID;
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
        document.body.appendChild(canvas);
        this.canvas = canvas;

        // Toolbar (hidden until activated)
        this.toolbar = createToolbar();
        this.setVisible(false);

        // Events
        canvas.addEventListener('mousedown', onMouseDown);
        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('mouseup',   onMouseUp);
        canvas.addEventListener('touchstart', onTouchStart, { passive: false });
        canvas.addEventListener('touchmove',  onTouchMove,  { passive: false });
        canvas.addEventListener('touchend',   onTouchEnd,   { passive: false });
        document.addEventListener('keydown', onKeyDown);
        window.addEventListener('scroll', onScroll, { passive: true });

        resizeHandler = () => resizeCanvas();
        window.addEventListener('resize', resizeHandler);

        navHandler = () => { drawingOverlayInstance?.clear(); };
        window.addEventListener('pageloaded', navHandler);
    }

    toggle(): void {
        this._on = !this._on;
        this.setVisible(this._on);
    }

    get isOn(): boolean {
        return this._on;
    }

    setVisible(visible: boolean): void {
        this._on = visible;
        state.active = visible;

        const canvas = getCanvas();
        if (canvas) {
            canvas.classList.toggle('nc-draw-active', visible);
        }

        const toolbar = document.getElementById(TOOLBAR_ID);
        if (toolbar) {
            toolbar.style.display = visible ? 'flex' : 'none';
        }
    }

    clear(): void {
        state.committed = [];
        state.current   = null;
        state.drawing   = false;
        redrawAll();
    }

    destroy(): void {
        this.setVisible(false);
        drawingOverlayInstance = null;
        if (resizeHandler) window.removeEventListener('resize', resizeHandler);
        if (navHandler)    window.removeEventListener('pageloaded', navHandler);
        window.removeEventListener('scroll', onScroll);
        document.removeEventListener('keydown', onKeyDown);
        getCanvas()?.removeEventListener('mousedown', onMouseDown);
        getCanvas()?.removeEventListener('mousemove', onMouseMove);
        getCanvas()?.removeEventListener('mouseup', onMouseUp);
        getCanvas()?.removeEventListener('touchstart', onTouchStart);
        getCanvas()?.removeEventListener('touchmove',  onTouchMove);
        getCanvas()?.removeEventListener('touchend',   onTouchEnd);
        document.getElementById(CANVAS_ID)?.remove();
        document.getElementById(TOOLBAR_ID)?.remove();
        document.getElementById(STYLE_ID)?.remove();
        state.committed = [];
        state.drawing   = false;
        state.current   = null;
    }
}

/**
 * NcAnimation Component
 *
 * A declarative animation wrapper that intelligently selects the most
 * GPU-efficient execution path for each animation type:
 *
 *   - Simple CSS keyframes  → runs entirely on the compositor thread (no JS)
 *   - Enter / exit          → Web Animations API via gpu-animation.ts
 *   - Scroll-reveal         → IntersectionObserver + Web Animations API
 *   - Continuous / looping  → CSS animation (compositor-only)
 *   - Particle effects      → WebGL (vertex shader) with canvas2d fallback
 *
 * Attributes:
 *   name         — Animation preset name (see list below). Required.
 *   trigger      — When to run: 'mount'|'visible'|'hover'|'click'|'manual' (default: 'mount')
 *   duration     — Ms integer (default: varies per preset)
 *   delay        — Ms delay before animation starts (default: 0)
 *   easing       — CSS easing / cubic-bezier string (default: preset-specific)
 *   iterations   — Number or 'infinite' (default: 1)
 *   distance     — Slide/offset distance in px (default: 40)
 *   threshold    — IntersectionObserver threshold 0-1 (default: 0.15, trigger=visible only)
 *   fill         — Web Animations fill mode: 'forwards'|'backwards'|'both'|'none' (default: 'forwards')
 *   reverse      — boolean — play animation backwards
 *   no-gpu-hint  — boolean — skip will-change + contain hints (use for very tiny elements)
 *
 * Particle-specific attributes (all optional):
 *   origin-x     — Horizontal start position as 0-1 fraction of screen width (default: 0.5 = center)
 *   origin-y     — Vertical start position as 0-1 fraction of screen height (default: 0.5)
 *                  Special shortcuts: 'top'=0, 'bottom'=1, 'left'=0, 'right'=1, 'center'=0.5
 *   target-x     — End-point X fraction (used by 'converge'/'ripple' presets)
 *   target-y     — End-point Y fraction
 *   count        — Override particle count (integer)
 *   spread       — Override spread/speed scale 0-2 (default: 1)
 *
 * Animation preset names:
 *   Enter/exit:  fade-in | fade-out | slide-up | slide-down | slide-left | slide-right
 *                scale-in | scale-out | zoom-in | zoom-out | flip-x | flip-y
 *   Attention:   pulse | shake | bounce | rubber-band | swing | jello | tada | heartbeat
 *   Continuous:  spin | ping | float | glow
 *   Particles:   confetti | sparkles | bubbles | snow | firework |
 *                electricity | fire | explosion | ripple
 *
 * Events:
 *   start    — CustomEvent — animation begins
 *   finish   — CustomEvent — animation ends (not fired for infinite)
 *   cancel   — CustomEvent — animation was cancelled
 *
 * Methods (call on the element):
 *   el.play()    — play / replay
 *   el.pause()   — pause (Web Animations API animations only)
 *   el.cancel()  — cancel and reset
 *
 * Slots:
 *   default — the content to animate
 *
 * Usage:
 *   <nc-animation name="fade-in" trigger="visible">
 *     <nc-card>...</nc-card>
 *   </nc-animation>
 *
 *   <nc-animation name="slide-up" trigger="visible" delay="150">
 *     <p>Staggered paragraph</p>
 *   </nc-animation>
 *
 *   <nc-animation name="pulse" trigger="hover" iterations="infinite">
 *     <nc-button>Hover me</nc-button>
 *   </nc-animation>
 *
 *   <nc-animation name="confetti" trigger="click">
 *     <nc-button variant="success">Celebrate</nc-button>
 *   </nc-animation>
 */
import { Component, defineComponent } from '@core/component.js';
import { html } from '@core-utils/templates.js';
import { animate, prepareForAnimation, cleanupAnimation, fadeIn, fadeOut, slideIn, scaleIn, createAnimationLoop, } from '@core/gpu-animation.js';
// ── Preset registry ───────────────────────────────────────────────────────────
const PRESETS = {
    // ── Enter / exit (WAAPI — GPU transform + opacity) ──────────────────────
    'fade-in': {
        path: 'waapi', duration: 400,
        run: (el, opts) => fadeIn(el, opts.duration),
    },
    'fade-out': {
        path: 'waapi', duration: 400,
        run: (el, opts) => fadeOut(el, opts.duration),
    },
    'slide-up': {
        path: 'waapi', duration: 450,
        run: (el, opts) => slideIn(el, 'up', opts.distance, opts.duration),
    },
    'slide-down': {
        path: 'waapi', duration: 450,
        run: (el, opts) => slideIn(el, 'down', opts.distance, opts.duration),
    },
    'slide-left': {
        path: 'waapi', duration: 450,
        run: (el, opts) => slideIn(el, 'left', opts.distance, opts.duration),
    },
    'slide-right': {
        path: 'waapi', duration: 450,
        run: (el, opts) => slideIn(el, 'right', opts.distance, opts.duration),
    },
    'scale-in': {
        path: 'waapi', duration: 350,
        run: (el, opts) => scaleIn(el, opts.duration),
    },
    'scale-out': {
        path: 'waapi', duration: 350,
        run: (el, opts) => animate(el, [
            { transform: 'scale3d(1,1,1)', opacity: '1' },
            { transform: 'scale3d(0.8,0.8,1)', opacity: '0' },
        ], opts),
    },
    'zoom-in': {
        path: 'waapi', duration: 400,
        run: (el, opts) => animate(el, [
            { transform: 'scale3d(0.5,0.5,1)', opacity: '0' },
            { transform: 'scale3d(1,1,1)', opacity: '1' },
        ], { ...opts, easing: 'cubic-bezier(0.34,1.56,0.64,1)' }),
    },
    'zoom-out': {
        path: 'waapi', duration: 400,
        run: (el, opts) => animate(el, [
            { transform: 'scale3d(1,1,1)', opacity: '1' },
            { transform: 'scale3d(0.5,0.5,1)', opacity: '0' },
        ], opts),
    },
    'flip-x': {
        path: 'waapi', duration: 500,
        run: (el, opts) => {
            prepareForAnimation(el, ['transform', 'opacity']);
            return animate(el, [
                { transform: 'perspective(400px) rotateX(90deg)', opacity: '0' },
                { transform: 'perspective(400px) rotateX(-10deg)', opacity: '1', offset: 0.6 },
                { transform: 'perspective(400px) rotateX(0deg)', opacity: '1' },
            ], opts);
        },
    },
    'flip-y': {
        path: 'waapi', duration: 500,
        run: (el, opts) => {
            prepareForAnimation(el, ['transform', 'opacity']);
            return animate(el, [
                { transform: 'perspective(400px) rotateY(90deg)', opacity: '0' },
                { transform: 'perspective(400px) rotateY(-10deg)', opacity: '1', offset: 0.6 },
                { transform: 'perspective(400px) rotateY(0deg)', opacity: '1' },
            ], opts);
        },
    },
    // ── Attention seekers (WAAPI — brief GPU motion) ─────────────────────────
    'pulse': {
        path: 'waapi', duration: 600,
        run: (el, opts) => {
            prepareForAnimation(el, ['transform']);
            return animate(el, [
                { transform: 'scale3d(1,1,1)' },
                { transform: 'scale3d(1.05,1.05,1)', offset: 0.5 },
                { transform: 'scale3d(1,1,1)' },
            ], opts);
        },
    },
    'shake': {
        path: 'waapi', duration: 500,
        run: (el, opts) => {
            prepareForAnimation(el, ['transform']);
            return animate(el, [
                { transform: 'translate3d(0,0,0)' },
                { transform: 'translate3d(-8px,0,0)', offset: 0.1 },
                { transform: 'translate3d(8px,0,0)', offset: 0.3 },
                { transform: 'translate3d(-8px,0,0)', offset: 0.5 },
                { transform: 'translate3d(8px,0,0)', offset: 0.7 },
                { transform: 'translate3d(-4px,0,0)', offset: 0.9 },
                { transform: 'translate3d(0,0,0)' },
            ], { ...opts, easing: 'ease-in-out' });
        },
    },
    'bounce': {
        path: 'waapi', duration: 800,
        run: (el, opts) => {
            prepareForAnimation(el, ['transform']);
            return animate(el, [
                { transform: 'translate3d(0,0,0)', animationTimingFunction: 'cubic-bezier(0.8,0,1,1)' },
                { transform: 'translate3d(0,-30px,0)', offset: 0.4, animationTimingFunction: 'cubic-bezier(0,0,0.2,1)' },
                { transform: 'translate3d(0,0,0)', offset: 0.6, animationTimingFunction: 'cubic-bezier(0.8,0,1,1)' },
                { transform: 'translate3d(0,-15px,0)', offset: 0.8, animationTimingFunction: 'cubic-bezier(0,0,0.2,1)' },
                { transform: 'translate3d(0,0,0)' },
            ], { ...opts, easing: 'linear' });
        },
    },
    'rubber-band': {
        path: 'waapi', duration: 700,
        run: (el, opts) => {
            prepareForAnimation(el, ['transform']);
            return animate(el, [
                { transform: 'scale3d(1,1,1)' },
                { transform: 'scale3d(1.25,0.75,1)', offset: 0.3 },
                { transform: 'scale3d(0.75,1.25,1)', offset: 0.5 },
                { transform: 'scale3d(1.15,0.85,1)', offset: 0.65 },
                { transform: 'scale3d(0.95,1.05,1)', offset: 0.75 },
                { transform: 'scale3d(1.05,0.95,1)', offset: 0.9 },
                { transform: 'scale3d(1,1,1)' },
            ], { ...opts, easing: 'ease-in-out' });
        },
    },
    'swing': {
        path: 'waapi', duration: 700,
        run: (el, opts) => {
            prepareForAnimation(el, ['transform']);
            return animate(el, [
                { transform: 'rotate3d(0,0,1,0deg)' },
                { transform: 'rotate3d(0,0,1,15deg)', offset: 0.2 },
                { transform: 'rotate3d(0,0,1,-10deg)', offset: 0.4 },
                { transform: 'rotate3d(0,0,1,5deg)', offset: 0.6 },
                { transform: 'rotate3d(0,0,1,-5deg)', offset: 0.8 },
                { transform: 'rotate3d(0,0,1,0deg)' },
            ], { ...opts, easing: 'ease-in-out' });
        },
    },
    'jello': {
        path: 'waapi', duration: 900,
        run: (el, opts) => {
            prepareForAnimation(el, ['transform']);
            return animate(el, [
                { transform: 'skewX(0) skewY(0)' },
                { transform: 'skewX(-12.5deg) skewY(-12.5deg)', offset: 0.11 },
                { transform: 'skewX(6.25deg) skewY(6.25deg)', offset: 0.22 },
                { transform: 'skewX(-3.125deg) skewY(-3.125deg)', offset: 0.33 },
                { transform: 'skewX(1.5625deg) skewY(1.5625deg)', offset: 0.44 },
                { transform: 'skewX(-0.78125deg) skewY(-0.78125deg)', offset: 0.55 },
                { transform: 'skewX(0.390625deg) skewY(0.390625deg)', offset: 0.66 },
                { transform: 'skewX(-0.1953125deg) skewY(-0.1953125deg)', offset: 0.77 },
                { transform: 'skewX(0) skewY(0)' },
            ], { ...opts, easing: 'ease-in-out' });
        },
    },
    'tada': {
        path: 'waapi', duration: 800,
        run: (el, opts) => {
            prepareForAnimation(el, ['transform']);
            return animate(el, [
                { transform: 'scale3d(1,1,1) rotate3d(0,0,1,0deg)' },
                { transform: 'scale3d(0.9,0.9,0.9) rotate3d(0,0,1,-3deg)', offset: 0.1 },
                { transform: 'scale3d(1.1,1.1,1.1) rotate3d(0,0,1,3deg)', offset: 0.3 },
                { transform: 'scale3d(1.1,1.1,1.1) rotate3d(0,0,1,-3deg)', offset: 0.5 },
                { transform: 'scale3d(1.1,1.1,1.1) rotate3d(0,0,1,3deg)', offset: 0.7 },
                { transform: 'scale3d(1.1,1.1,1.1) rotate3d(0,0,1,-3deg)', offset: 0.8 },
                { transform: 'scale3d(1,1,1) rotate3d(0,0,1,0deg)' },
            ], { ...opts, easing: 'ease-in-out' });
        },
    },
    'heartbeat': {
        path: 'waapi', duration: 600,
        run: (el, opts) => {
            prepareForAnimation(el, ['transform']);
            return animate(el, [
                { transform: 'scale3d(1,1,1)' },
                { transform: 'scale3d(1.15,1.15,1)', offset: 0.14 },
                { transform: 'scale3d(1,1,1)', offset: 0.28 },
                { transform: 'scale3d(1.15,1.15,1)', offset: 0.42 },
                { transform: 'scale3d(1,1,1)' },
            ], { ...opts, easing: 'ease-in-out' });
        },
    },
    // ── Continuous / looping (CSS — compositor-only, zero rAF cost) ──────────
    'spin': {
        path: 'css', duration: 1000,
        keyframes: `from { transform: rotate(0deg); } to { transform: rotate(360deg); }`,
    },
    'ping': {
        path: 'css', duration: 1000,
        keyframes: `
            0%   { transform: scale3d(1,1,1); opacity: 1; }
            75%, 100% { transform: scale3d(2,2,1); opacity: 0; }
        `,
    },
    'float': {
        path: 'css', duration: 3000,
        easing: 'ease-in-out',
        keyframes: `
            0%, 100% { transform: translate3d(0,0,0); }
            50%      { transform: translate3d(0,-12px,0); }
        `,
    },
    'glow': {
        path: 'css', duration: 2000,
        easing: 'ease-in-out',
        keyframes: `
            0%, 100% { filter: brightness(1) drop-shadow(0 0 0px currentColor); }
            50%      { filter: brightness(1.2) drop-shadow(0 0 8px currentColor); }
        `,
    },
    // ── Particle system (WebGL → canvas2d fallback) ───────────────────────────
    'confetti': {
        path: 'particle', duration: 3000,
        particle: {
            count: 120,
            colors: ['#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'],
            size: { min: 4, max: 10 },
            speed: { min: 60, max: 160 },
            type: 'shower',
        },
    },
    'sparkles': {
        path: 'particle', duration: 2000,
        particle: {
            count: 60,
            colors: ['#fcd34d', '#fbbf24', '#fde68a', '#fff'],
            size: { min: 2, max: 6 },
            speed: { min: 40, max: 100 },
            type: 'burst',
        },
    },
    'bubbles': {
        path: 'particle', duration: 4000,
        particle: {
            count: 50,
            colors: ['#93c5fd', '#bfdbfe', '#dbeafe'],
            size: { min: 6, max: 18 },
            speed: { min: 20, max: 60 },
            type: 'float',
        },
    },
    'snow': {
        path: 'particle', duration: 5000,
        particle: {
            count: 80,
            colors: ['#e0f2fe', '#bae6fd', '#fff'],
            size: { min: 3, max: 8 },
            speed: { min: 20, max: 50 },
            type: 'shower',
        },
    },
    'firework': {
        path: 'particle', duration: 3000,
        particle: {
            count: 120,
            colors: ['#f43f5e', '#f59e0b', '#fcd34d', '#34d399', '#60a5fa', '#c084fc', '#fff'],
            size: { min: 2, max: 5 },
            speed: { min: 280, max: 460 },
            type: 'firework',
        },
    },
    // ── New presets ───────────────────────────────────────────────────────────
    'electricity': {
        path: 'particle', duration: 2000,
        particle: {
            count: 5, // number of simultaneous bolts
            colors: ['#a5f3fc', '#e0f2fe', '#7dd3fc', '#ffffff'],
            size: { min: 1, max: 2 },
            speed: { min: 0, max: 0 },
            type: 'electricity',
        },
    },
    'fire': {
        path: 'particle', duration: 3000,
        particle: {
            count: 120,
            colors: ['#ef4444', '#f97316', '#fbbf24', '#fde68a'],
            size: { min: 8, max: 22 },
            speed: { min: 80, max: 180 },
            type: 'fire',
        },
    },
    'explosion': {
        path: 'particle', duration: 2000,
        particle: {
            count: 110,
            colors: ['#ef4444', '#f97316', '#fbbf24', '#fde68a', '#fff'],
            size: { min: 4, max: 16 },
            speed: { min: 90, max: 360 },
            type: 'explosion',
        },
    },
    'ripple': {
        path: 'particle', duration: 2500,
        particle: {
            count: 5, // number of concentric rings
            colors: ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'],
            size: { min: 2, max: 4 },
            speed: { min: 0, max: 0 },
            type: 'ripple',
        },
    },
};
// ── Component ─────────────────────────────────────────────────────────────────
// Global set — keyframes injected into document.head, deduplicated across all instances
const _injectedKeyframes = new Set();
export class NcAnimation extends Component {
    static useShadowDOM = true;
    static get observedAttributes() {
        return ['name', 'trigger', 'duration', 'delay', 'easing', 'iterations',
            'distance', 'threshold', 'fill', 'reverse', 'no-gpu-hint',
            'origin-x', 'origin-y', 'target-x', 'target-y', 'count', 'spread'];
    }
    // active Web Animation handle — lets us pause / cancel
    _waAnimation = null;
    // particle loop + webgl handles
    _particleLoop = null;
    _particleWebGL = null;
    _canvas = null;
    // IntersectionObserver for trigger=visible
    _io = null;
    // tear-down refs
    _hoverOff = null;
    _clickOff = null;
    // css animation class injected into shadow
    _cssAnimName = '';
    // track whether IntersectionObserver already fired
    _visibleFired = false;
    template() {
        return html `
            <style>
                :host {
                    display: contents;
                }
                .wrap {
                    display: contents;
                }
                .canvas-layer {
                    position: absolute;
                    inset: 0;
                    pointer-events: none;
                    z-index: 10;
                }
                /* Will be extended dynamically per CSS preset */
            </style>
            <div class="wrap"><slot></slot></div>
        `;
    }
    onMount() {
        this._setup();
    }
    onUnmount() {
        this._teardown();
    }
    // ── Public methods ────────────────────────────────────────────────────────
    play() { this._run(); }
    pause() {
        if (this._waAnimation && this._waAnimation.playState === 'running') {
            this._waAnimation.pause();
        }
    }
    cancel() {
        this._waAnimation?.cancel();
        this._waAnimation = null;
        this._stopParticles();
        const target = this._target();
        if (target) {
            cleanupAnimation(target);
            target.style.cssText = target.style.cssText.replace(/animation[^;]*;?/g, '');
        }
        this.dispatchEvent(new CustomEvent('cancel', { bubbles: true, composed: true }));
    }
    // ── Setup ─────────────────────────────────────────────────────────────────
    _setup() {
        const trigger = this._attr('trigger', 'mount');
        switch (trigger) {
            case 'mount':
                this._scheduleRun();
                break;
            case 'visible':
                this._setupVisibleTrigger();
                break;
            case 'hover':
                this._setupHoverTrigger();
                break;
            case 'click':
                this._setupClickTrigger();
                break;
            // 'manual' — nothing; caller calls .play()
        }
    }
    _teardown() {
        this._io?.disconnect();
        this._io = null;
        this._hoverOff?.();
        this._hoverOff = null;
        this._clickOff?.();
        this._clickOff = null;
        this._waAnimation?.cancel();
        this._waAnimation = null;
        this._stopParticles();
        const target = this._target();
        if (target)
            cleanupAnimation(target);
    }
    _scheduleRun() {
        const delay = this._numAttr('delay', 0);
        if (delay > 0) {
            setTimeout(() => this._run(), delay);
        }
        else {
            // defer one tick so the slot is painted
            requestAnimationFrame(() => this._run());
        }
    }
    _setupVisibleTrigger() {
        const threshold = parseFloat(this.getAttribute('threshold') || '0.15');
        this._io = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting && !this._visibleFired) {
                    this._visibleFired = true;
                    this._scheduleRun();
                    this._io?.disconnect();
                }
            }
        }, { threshold });
        this._io.observe(this);
    }
    _setupHoverTrigger() {
        const onEnter = () => { this._visibleFired = false; this._run(); };
        this.addEventListener('mouseenter', onEnter);
        this._hoverOff = () => this.removeEventListener('mouseenter', onEnter);
    }
    _setupClickTrigger() {
        const onClick = () => { this._visibleFired = false; this._run(); };
        this.addEventListener('click', onClick);
        this._clickOff = () => this.removeEventListener('click', onClick);
    }
    // ── Core run dispatcher ───────────────────────────────────────────────────
    _run() {
        const name = this._attr('name', 'fade-in');
        const preset = PRESETS[name];
        if (!preset) {
            console.warn(`[nc-animation] Unknown preset: "${name}"`);
            return;
        }
        this.dispatchEvent(new CustomEvent('start', { bubbles: true, composed: true }));
        switch (preset.path) {
            case 'waapi':
                this._runWAAPI(preset);
                break;
            case 'css':
                this._runCSS(preset, name);
                break;
            case 'particle':
                this._runParticles(preset);
                break;
        }
    }
    // ── WAAPI path ────────────────────────────────────────────────────────────
    _runWAAPI(preset) {
        const target = this._target();
        if (!target || !preset.run)
            return;
        const noHint = this.hasAttribute('no-gpu-hint');
        if (!noHint)
            prepareForAnimation(target, ['transform', 'opacity']);
        const opts = {
            duration: this._numAttr('duration', preset.duration),
            delay: this._numAttr('delay', 0),
            easing: this.getAttribute('easing') ?? preset.easing ?? 'cubic-bezier(0.4,0,0.2,1)',
            fill: this.getAttribute('fill') ?? 'forwards',
            iterations: this._iterAttr(),
            distance: this._numAttr('distance', 40),
        };
        // Capture the animation handle so pause/cancel work
        // We monkey-patch by running and grabbing the animation from the element
        const before = target.getAnimations().length;
        preset.run(target, opts).then(() => {
            if (!noHint && opts.iterations === 1)
                cleanupAnimation(target);
            this.dispatchEvent(new CustomEvent('finish', { bubbles: true, composed: true }));
        });
        // Grab the newest animation handle
        requestAnimationFrame(() => {
            const anims = target.getAnimations();
            if (anims.length > before) {
                this._waAnimation = anims[anims.length - 1];
            }
        });
    }
    // ── CSS compositor path ───────────────────────────────────────────────────
    _runCSS(preset, name) {
        const target = this._target();
        if (!target || !preset.keyframes)
            return;
        const animName = `nc-anim-${name}`;
        // Inject keyframes into document.head (NOT shadow root) — slotted targets
        // are light DOM elements; shadow-scoped @keyframes are invisible to them.
        if (!_injectedKeyframes.has(animName)) {
            const style = document.createElement('style');
            style.id = `kf-${animName}`;
            style.textContent = `@keyframes ${animName} { ${preset.keyframes} }`;
            document.head.appendChild(style);
            _injectedKeyframes.add(animName);
        }
        const duration = this._numAttr('duration', preset.duration);
        const delay = this._numAttr('delay', 0);
        const easing = this.getAttribute('easing') ?? preset.easing ?? 'ease-in-out';
        const iterations = this.getAttribute('iterations') === 'infinite' ? 'infinite' : this._iterAttr();
        const fill = this.getAttribute('fill') ?? (iterations === 'infinite' ? 'none' : 'forwards');
        const direction = this.hasAttribute('reverse') ? 'reverse' : 'normal';
        target.style.willChange = 'transform, opacity';
        target.style.animation = `${animName} ${duration}ms ${easing} ${delay}ms ${iterations} ${fill} ${direction}`;
        if (iterations !== 'infinite') {
            target.addEventListener('animationend', () => {
                cleanupAnimation(target);
                this.dispatchEvent(new CustomEvent('finish', { bubbles: true, composed: true }));
            }, { once: true });
        }
    }
    // ── Particle path ─────────────────────────────────────────────────────────
    /** Resolve 'top'|'bottom'|'left'|'right'|'center'|number-string → 0-1 float */
    _resolvePos(raw, fallback) {
        if (!raw)
            return fallback;
        const aliases = { top: 0, bottom: 1, left: 0, right: 1, center: 0.5 };
        if (raw in aliases)
            return aliases[raw];
        const n = parseFloat(raw);
        return isNaN(n) ? fallback : Math.max(0, Math.min(1, n));
    }
    _runParticles(preset) {
        if (!preset.particle)
            return;
        this._stopParticles();
        // Full-viewport canvas — particles live in screen space, not element space
        const canvas = document.createElement('canvas');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        canvas.style.cssText =
            'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9999;';
        document.body.appendChild(canvas);
        this._canvas = canvas;
        // Resolve origin from attributes (default center of screen)
        const ox = this._resolvePos(this.getAttribute('origin-x'), 0.5);
        const oy = this._resolvePos(this.getAttribute('origin-y'), 0.5);
        const tx = this._resolvePos(this.getAttribute('target-x'), 0.5);
        const ty = this._resolvePos(this.getAttribute('target-y'), 0.5);
        // Allow attribute overrides on count and spread
        const countOverride = this.getAttribute('count');
        const spreadScale = parseFloat(this.getAttribute('spread') ?? '1');
        const cfg = {
            ...preset.particle,
            count: countOverride ? parseInt(countOverride, 10) : preset.particle.count,
            speed: preset.particle.speed
                ? { min: preset.particle.speed.min * spreadScale, max: preset.particle.speed.max * spreadScale }
                : { min: 40, max: 120 },
        };
        // Always use canvas2d — the WebGL system from gpu-animation doesn't
        // support per-preset behaviors (electricity, fire, ripple etc.)
        this._runCanvas2D(canvas, cfg, ox, oy, tx, ty, preset);
        const duration = this._numAttr('duration', preset.duration);
        setTimeout(() => {
            this._stopParticles();
            this.dispatchEvent(new CustomEvent('finish', { bubbles: true, composed: true }));
        }, duration);
    }
    /**
     * Full canvas2d particle engine.
     * origin / target are 0-1 fractions of canvas dimensions.
     * Each preset type gets its own spawn + update behaviour.
     */
    _runCanvas2D(canvas, config, ox, oy, tx, ty, preset) {
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        const W = canvas.width;
        const H = canvas.height;
        const originX = ox * W;
        const originY = oy * H;
        const targetX = tx * W;
        const targetY = ty * H;
        const { count, colors = ['#667eea'], size = { min: 3, max: 8 }, speed = { min: 40, max: 120 }, type = 'burst' } = config;
        const rnd = (min, max) => min + Math.random() * (max - min);
        const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
        const hex2rgb = (hex) => {
            const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return r ? [parseInt(r[1], 16), parseInt(r[2], 16), parseInt(r[3], 16)] : [255, 255, 255];
        };
        const particles = [];
        // ── Spawn logic per type ─────────────────────────────────────────────
        const spawnParticle = (i) => {
            const t = count > 1 ? i / (count - 1) : 0.5;
            switch (type) {
                case 'shower': {
                    // rain from origin-x spread across top edge
                    const spread = W * 0.6;
                    return {
                        x: originX + (Math.random() - 0.5) * spread,
                        y: originY * H < H * 0.3 ? -10 : originY * H,
                        vx: rnd(-30, 30),
                        vy: speed.min + Math.random() * (speed.max - speed.min),
                        ax: 0, ay: 60,
                        size: rnd(size.min, size.max),
                        color: pick(colors), alpha: 1, life: 1, maxLife: 1,
                        rot: Math.random() * Math.PI * 2,
                        rotV: rnd(-3, 3),
                        shape: 'rect',
                    };
                }
                case 'burst': {
                    const angle = t * Math.PI * 2;
                    const spd = rnd(speed.min, speed.max);
                    return {
                        x: originX, y: originY,
                        vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
                        ax: 0, ay: 20,
                        size: rnd(size.min, size.max),
                        color: pick(colors), alpha: 1, life: 1, maxLife: 1,
                        rot: 0, rotV: rnd(-5, 5), shape: 'circle',
                    };
                }
                case 'explode': {
                    const angle = Math.random() * Math.PI * 2;
                    const spd = rnd(speed.min, speed.max);
                    return {
                        x: originX, y: originY,
                        vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
                        ax: 0, ay: 120,
                        size: rnd(size.min, size.max),
                        color: pick(colors), alpha: 1, life: 1, maxLife: 1,
                        rot: Math.random() * Math.PI * 2,
                        rotV: rnd(-8, 8), shape: 'rect',
                    };
                }
                case 'float': {
                    return {
                        x: originX + (Math.random() - 0.5) * W * 0.8,
                        y: H + rnd(0, H * 0.2),
                        vx: rnd(-20, 20),
                        vy: -(speed.min + Math.random() * (speed.max - speed.min)),
                        ax: Math.sin(i) * 5, ay: 0,
                        size: rnd(size.min, size.max),
                        color: pick(colors), alpha: 0.7, life: 1, maxLife: 1,
                        shape: 'circle',
                    };
                }
                case 'spiral': {
                    const a = t * Math.PI * 8;
                    const r = t * Math.min(W, H) * 0.4;
                    const spd = rnd(speed.min, speed.max);
                    return {
                        x: originX + Math.cos(a) * r,
                        y: originY + Math.sin(a) * r,
                        vx: Math.cos(a + Math.PI / 2) * spd,
                        vy: Math.sin(a + Math.PI / 2) * spd,
                        ax: 0, ay: 0,
                        size: rnd(size.min, size.max),
                        color: pick(colors), alpha: 1, life: 1, maxLife: 1,
                        shape: 'circle',
                    };
                }
                case 'converge': {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = rnd(Math.min(W, H) * 0.3, Math.min(W, H) * 0.6);
                    const sx = targetX + Math.cos(angle) * dist;
                    const sy = targetY + Math.sin(angle) * dist;
                    const spd = rnd(speed.min, speed.max);
                    const dx = targetX - sx, dy = targetY - sy;
                    const len = Math.hypot(dx, dy) || 1;
                    return {
                        x: sx, y: sy,
                        vx: (dx / len) * spd, vy: (dy / len) * spd,
                        ax: 0, ay: 0,
                        size: rnd(size.min, size.max),
                        color: pick(colors), alpha: 1, life: 1, maxLife: 1,
                        shape: 'circle',
                    };
                }
                case 'firework': {
                    // Particles burst from random cluster positions across upper screen
                    const clusterSize = 20;
                    const clusterIdx = Math.floor(i / clusterSize);
                    const totalClusters = Math.max(1, Math.ceil(count / clusterSize));
                    // Spread bursts evenly across horizontal, upper 55% of screen
                    const burstX = W * (0.1 + (clusterIdx / Math.max(totalClusters - 1, 1)) * 0.8);
                    const burstY = H * (0.1 + Math.random() * 0.35);
                    const angle = ((i % clusterSize) / clusterSize) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
                    const spd = rnd(speed.min, speed.max);
                    return {
                        x: burstX, y: burstY,
                        vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
                        ax: 0, ay: 80,
                        size: rnd(size.min, size.max),
                        color: pick(colors), alpha: 1, life: 1, maxLife: 1,
                        shape: 'circle',
                    };
                }
                case 'explosion': {
                    // First 3 are expanding shockwave rings, rest are debris
                    if (i < 4) {
                        return {
                            x: originX, y: originY,
                            vx: 0, vy: 0, ax: 0, ay: 0,
                            size: 3 + i * 2,
                            color: pick(['#fbbf24', '#fde68a', '#fff']),
                            alpha: 0.85, life: 1, maxLife: 1,
                            wave: i * 0.12,
                            shape: 'arc',
                        };
                    }
                    const angle = Math.random() * Math.PI * 2;
                    const spd = rnd(speed.min, speed.max);
                    return {
                        x: originX + (Math.random() - 0.5) * 20,
                        y: originY + (Math.random() - 0.5) * 20,
                        vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd - 40,
                        ax: 0, ay: 200,
                        size: rnd(size.min, size.max),
                        color: pick(colors), alpha: 1, life: 1, maxLife: 1,
                        shape: 'circle',
                    };
                }
                case 'fire': {
                    return {
                        x: originX + (Math.random() - 0.5) * size.max * 6,
                        y: originY,
                        vx: rnd(-20, 20),
                        vy: -(speed.min + Math.random() * (speed.max - speed.min)),
                        ax: rnd(-8, 8), ay: -10,
                        size: rnd(size.min, size.max),
                        color: colors[Math.floor(Math.random() * colors.length)],
                        alpha: 0.9, life: 1, maxLife: 1,
                        shape: 'circle',
                    };
                }
                case 'ripple': {
                    return {
                        x: originX, y: originY,
                        vx: 0, vy: 0, ax: 0, ay: 0,
                        size: 0,
                        color: pick(colors), alpha: 1, life: 1, maxLife: 1,
                        wave: t * 0.5, // stagger rings by index
                        shape: 'arc',
                    };
                }
                default: {
                    const angle = Math.random() * Math.PI * 2;
                    const spd = rnd(speed.min, speed.max);
                    return {
                        x: originX, y: originY,
                        vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
                        ax: 0, ay: 30,
                        size: rnd(size.min, size.max),
                        color: pick(colors), alpha: 1, life: 1, maxLife: 1,
                        shape: 'circle',
                    };
                }
            }
        };
        // Stagger spawning for shower/fire so screen doesn't flash all at once
        const isStaggered = type === 'shower' || type === 'fire' || type === 'float' || type === 'ripple';
        if (isStaggered) {
            // Spawn first 20% immediately, rest over first 40% of duration
            const duration = this._numAttr('duration', preset.duration);
            for (let i = 0; i < count; i++) {
                const delay = (i / count) * duration * 0.5;
                setTimeout(() => {
                    if (!this._canvas)
                        return;
                    particles.push(spawnParticle(i));
                }, delay);
            }
        }
        else {
            for (let i = 0; i < count; i++)
                particles.push(spawnParticle(i));
        }
        // ── Per-particle draw ─────────────────────────────────────────────────
        const drawParticle = (p) => {
            ctx.globalAlpha = Math.max(0, p.life) * (p.alpha ?? 1);
            ctx.fillStyle = p.color;
            ctx.strokeStyle = p.color;
            if (p.shape === 'rect' && p.rot !== undefined) {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.fillRect(-p.size / 2, -p.size * 1.5, p.size, p.size * 3);
                ctx.restore();
            }
            else if (p.shape === 'line' && p.trail && p.trail.length > 1) {
                // Electricity bolt — draw jagged line segments from trail
                ctx.lineWidth = p.size;
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 12;
                ctx.beginPath();
                ctx.moveTo(p.trail[0][0], p.trail[0][1]);
                for (let k = 1; k < p.trail.length; k++) {
                    ctx.lineTo(p.trail[k][0], p.trail[k][1]);
                }
                ctx.stroke();
                ctx.shadowBlur = 0;
            }
            else if (p.shape === 'arc') {
                // Ripple ring OR explosion shockwave
                const maxR = type === 'explosion'
                    ? Math.max(W, H) * 0.35
                    : Math.max(W, H) * 0.45;
                const radius = (1 - p.life) * maxR + (p.size ?? 0);
                if (radius > 0) {
                    ctx.lineWidth = type === 'explosion' ? Math.max(1, p.size * p.life * 2) : (p.size > 0 ? p.size : 2);
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }
            else {
                // Circle — fire, firework, explosion debris each get glow
                if (type === 'fire') {
                    const [r, g, b] = hex2rgb(p.color);
                    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
                    grad.addColorStop(0, `rgba(${r},${g},${b},${p.life})`);
                    grad.addColorStop(0.6, `rgba(${r},${g},${b},${p.life * 0.5})`);
                    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
                    ctx.fillStyle = grad;
                }
                else if (type === 'firework') {
                    // Glowing spark — shrinks as it fades
                    ctx.shadowColor = p.color;
                    ctx.shadowBlur = p.size * 4;
                    const drawR = Math.max(0.5, p.size * p.life);
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, drawR, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                    ctx.globalAlpha = 1;
                    return; // skip the generic arc below
                }
                else if (type === 'explosion') {
                    const [r, g, b] = hex2rgb(p.color);
                    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
                    grad.addColorStop(0, `rgba(255,255,255,${p.life})`);
                    grad.addColorStop(0.35, `rgba(${r},${g},${b},${p.life})`);
                    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
                    ctx.fillStyle = grad;
                    ctx.shadowColor = p.color;
                    ctx.shadowBlur = p.size * 2;
                }
                ctx.beginPath();
                ctx.arc(p.x, p.y, Math.max(0, p.size), 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
        };
        const maxElecBolts = 5;
        let elecTimer = 0;
        const elecInterval = 0.06; // seconds between new bolt sets
        const loop = createAnimationLoop((dt) => {
            ctx.clearRect(0, 0, W, H);
            // ── Electricity: regenerate jagged bolt paths each interval ────
            if (type === 'electricity') {
                elecTimer += dt;
                if (elecTimer >= elecInterval) {
                    elecTimer = 0;
                    // Re-generate all bolt trails from origin -> target
                    const activeBolts = Math.min(maxElecBolts, particles.length);
                    for (let b = 0; b < activeBolts; b++) {
                        const p = particles[b];
                        if (!p)
                            continue;
                        const steps = 12 + Math.floor(Math.random() * 8);
                        const trail = [[originX, originY]];
                        for (let s = 1; s < steps; s++) {
                            const t2 = s / steps;
                            const mx = originX + (targetX - originX) * t2;
                            const my = originY + (targetY - originY) * t2;
                            const jitter = (1 - Math.abs(t2 - 0.5) * 2) * 80;
                            trail.push([
                                mx + (Math.random() - 0.5) * jitter,
                                my + (Math.random() - 0.5) * jitter,
                            ]);
                        }
                        trail.push([targetX, targetY]);
                        p.trail = trail;
                        p.life = 1;
                        p.alpha = 0.6 + Math.random() * 0.4;
                    }
                }
                else {
                    // Fade between regenerations
                    for (const p of particles)
                        p.life = Math.max(0, p.life - dt * 6);
                }
                for (const p of particles)
                    drawParticle(p);
                return true; // electricity loops until duration expires
            }
            // ── All other types ───────────────────────────────────────────
            let alive = 0;
            const fadeRate = type === 'ripple' ? 0.3 : type === 'fire' ? 0.7 :
                type === 'float' ? 0.15 :
                    type === 'firework' ? 0.42 :
                        type === 'explosion' ? 0.65 : 0.35;
            for (const p of particles) {
                p.vx += p.ax * dt;
                p.vy += p.ay * dt;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                if (p.rot !== undefined && p.rotV !== undefined)
                    p.rot += p.rotV * dt;
                // Ripple: shrink size for growing ring effect is handled in draw
                if (type !== 'ripple') {
                    p.life = Math.max(0, p.life - dt * fadeRate);
                }
                else {
                    // stagger rings with wave offset
                    p.life = Math.max(0, p.life - dt * (0.35 + (p.wave ?? 0) * 0.1));
                }
                if (p.life <= 0.01)
                    continue;
                alive++;
                drawParticle(p);
            }
            return alive > 0 || particles.length < count;
        });
        this._particleLoop = loop;
        loop.start();
    }
    _stopParticles() {
        this._particleWebGL?.stop();
        this._particleWebGL = null;
        this._particleLoop?.stop();
        this._particleLoop = null;
        if (this._canvas) {
            this._canvas.remove();
            this._canvas = null;
        }
    }
    // ── Helpers ───────────────────────────────────────────────────────────────
    /** First painted element assigned to the default slot. */
    _target() {
        const slot = this.shadowRoot?.querySelector('slot');
        if (!slot)
            return null;
        const nodes = slot.assignedElements({ flatten: true });
        return nodes[0] ?? null;
    }
    _attr(name, fallback) {
        return this.getAttribute(name) ?? fallback;
    }
    _numAttr(name, fallback) {
        const v = parseInt(this.getAttribute(name) ?? '', 10);
        return isNaN(v) ? fallback : v;
    }
    _iterAttr() {
        const raw = this.getAttribute('iterations');
        if (!raw || raw === 'infinite')
            return 1;
        const n = parseInt(raw, 10);
        return isNaN(n) ? 1 : n;
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue || !this._mounted)
            return;
        // Re-setup on any attribute change (restarts trigger logic)
        this._teardown();
        this._visibleFired = false;
        this._setup();
    }
}
defineComponent('nc-animation', NcAnimation);

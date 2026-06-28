/**
 * GPU Animation Utilities
 * 
 * High-performance animation primitives that leverage:
 * - CSS transforms (GPU composited)
 * - CSS custom properties for dynamic values
 * - Web Animations API for smooth interpolation
 * - RequestAnimationFrame with delta time
 * - Passive event listeners
 * - will-change optimization
 * - contain property for layout isolation
 * 
 * These utilities make NativeCore animations outperform other frameworks
 * by maximizing GPU utilization and minimizing main thread work.
 */

// Types
export interface AnimationOptions {
    duration?: number;
    easing?: string;
    delay?: number;
    fill?: FillMode;
    iterations?: number;
}

export interface ParticleConfig {
    count: number;
    colors?: string[];
    size?: { min: number; max: number };
    speed?: { min: number; max: number };
    spread?: number;
    loop?: boolean;
    spiralDirection?: 'clockwise' | 'counterclockwise';
    type?: 'shower' | 'burst' | 'float' | 'spiral' | 'explode' | 'converge' | 'electricity' | 'fire' | 'ripple' | 'firework' | 'explosion';
}

export interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    alpha: number;
    angle: number;
    life: number;
    maxLife: number;
}

// ============================================
// GPU Transform Utilities
// ============================================

/**
 * Apply GPU-accelerated transform using translate3d
 * translate3d forces GPU layer creation even for 2D transforms
 */
export function setGPUTransform(element: HTMLElement, x: number, y: number, z = 0, scale = 1, rotate = 0): void {
    element.style.transform = `translate3d(${x}px, ${y}px, ${z}px) scale(${scale}) rotate(${rotate}deg)`;
}

/**
 * Apply transform using CSS custom properties
 * This allows CSS transitions to handle the animation on GPU
 */
export function setTransformVars(element: HTMLElement, vars: Record<string, string | number>): void {
    for (const [key, value] of Object.entries(vars)) {
        element.style.setProperty(`--${key}`, typeof value === 'number' ? `${value}px` : value);
    }
}

/**
 * Prepare element for GPU animation with proper hints
 */
export function prepareForAnimation(element: HTMLElement, properties: string[] = ['transform', 'opacity']): void {
    element.style.willChange = properties.join(', ');
    element.style.contain = 'layout style paint';
    element.style.backfaceVisibility = 'hidden';
    // Force GPU layer
    element.style.transform = element.style.transform || 'translateZ(0)';
}

/**
 * Clean up animation hints to free GPU memory
 */
export function cleanupAnimation(element: HTMLElement): void {
    element.style.willChange = 'auto';
    element.style.contain = '';
}

// ============================================
// Web Animations API Wrappers
// ============================================

/**
 * Animate using Web Animations API (GPU accelerated)
 * Returns a Promise that resolves when animation completes
 */
export function animate(
    element: HTMLElement,
    keyframes: Keyframe[],
    options: AnimationOptions = {}
): Promise<void> {
    const {
        duration = 300,
        easing = 'cubic-bezier(0.4, 0, 0.2, 1)',
        delay = 0,
        fill = 'forwards',
        iterations = 1
    } = options;

    return new Promise((resolve) => {
        const animation = element.animate(keyframes, {
            duration,
            easing,
            delay,
            fill,
            iterations
        });

        animation.onfinish = () => resolve();
        animation.oncancel = () => resolve();
    });
}

/**
 * GPU-accelerated fade animation
 */
export function fadeIn(element: HTMLElement, duration = 300): Promise<void> {
    prepareForAnimation(element, ['opacity']);
    return animate(element, [
        { opacity: 0 },
        { opacity: 1 }
    ], { duration });
}

export function fadeOut(element: HTMLElement, duration = 300): Promise<void> {
    prepareForAnimation(element, ['opacity']);
    return animate(element, [
        { opacity: 1 },
        { opacity: 0 }
    ], { duration });
}

/**
 * GPU-accelerated slide animation
 */
export function slideIn(element: HTMLElement, direction: 'up' | 'down' | 'left' | 'right' = 'up', distance = 40, duration = 400): Promise<void> {
    prepareForAnimation(element);
    
    const translations: Record<string, [string, string]> = {
        up: [`translate3d(0, ${distance}px, 0)`, 'translate3d(0, 0, 0)'],
        down: [`translate3d(0, -${distance}px, 0)`, 'translate3d(0, 0, 0)'],
        left: [`translate3d(${distance}px, 0, 0)`, 'translate3d(0, 0, 0)'],
        right: [`translate3d(-${distance}px, 0, 0)`, 'translate3d(0, 0, 0)']
    };

    const [from, to] = translations[direction];

    return animate(element, [
        { transform: from, opacity: 0 },
        { transform: to, opacity: 1 }
    ], { duration, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' });
}

/**
 * GPU-accelerated scale animation
 */
export function scaleIn(element: HTMLElement, duration = 300): Promise<void> {
    prepareForAnimation(element);
    return animate(element, [
        { transform: 'scale3d(0.8, 0.8, 1)', opacity: 0 },
        { transform: 'scale3d(1, 1, 1)', opacity: 1 }
    ], { duration, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });
}

// ============================================
// High-Performance Animation Loop
// ============================================

export interface AnimationLoop {
    start: () => void;
    stop: () => void;
    isRunning: () => boolean;
}

/**
 * Create a high-performance animation loop with delta time
 * Automatically handles frame timing and cleanup
 */
export function createAnimationLoop(
    callback: (deltaTime: number, elapsed: number) => boolean | void
): AnimationLoop {
    let rafId: number | null = null;
    let lastTime = 0;
    let startTime = 0;
    let running = false;

    const tick = (currentTime: number) => {
        if (!running) return;

        if (lastTime === 0) {
            lastTime = currentTime;
            startTime = currentTime;
        }

        // Delta time in seconds, capped to prevent huge jumps
        const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
        const elapsed = (currentTime - startTime) / 1000;
        lastTime = currentTime;

        // Callback returns false to stop the loop
        const shouldContinue = callback(deltaTime, elapsed);
        
        if (shouldContinue !== false && running) {
            rafId = requestAnimationFrame(tick);
        } else {
            running = false;
        }
    };

    return {
        start() {
            if (running) return;
            running = true;
            lastTime = 0;
            rafId = requestAnimationFrame(tick);
        },
        stop() {
            running = false;
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
        },
        isRunning() {
            return running;
        }
    };
}

// ============================================
// WebGL Particle System for High Counts
// ============================================

/**
 * Create a WebGL-based particle system for thousands of particles
 * Uses vertex shaders for GPU-computed positions
 */
export function createWebGLParticleSystem(
    canvas: HTMLCanvasElement,
    config: ParticleConfig
): { start: () => void; stop: () => void; destroy: () => void } | null {
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
        console.warn('[GPU Animation] WebGL not available, falling back to canvas');
        return null;
    }

    const {
        count,
        colors = ['#667eea', '#764ba2', '#f093fb'],
        size = { min: 2, max: 6 },
        speed = { min: 40, max: 120 },
        spread = 1,
        loop = false,
        spiralDirection = 'clockwise',
        type = 'burst',
    } = config;

    // Vertex shader - full position integration on GPU
    const vertexShaderSource = `
        attribute vec2 a_spawn;
        attribute vec2 a_velocity;
        attribute float a_size;
        attribute vec4 a_color;
        attribute float a_lifespan;
        attribute float a_phase;
        
        uniform vec2 u_resolution;
        uniform float u_time;
        uniform vec2 u_gravity;
        uniform float u_wrapMode;
        uniform mediump float u_fireMode;
        uniform float u_loopMode;
        
        varying vec4 v_color;
        varying float v_life;
        
        vec2 integrate(vec2 p0, vec2 v0, vec2 g, float t) {
            return p0 + v0 * t + 0.5 * g * t * t;
        }

        void main() {
            float lifeSpan = max(0.001, a_lifespan);
            float rawTime = u_time + a_phase;
            float t = u_loopMode > 0.5 ? mod(rawTime, lifeSpan) : min(rawTime, lifeSpan);
            vec2 pos = integrate(a_spawn, a_velocity, u_gravity, t);

            if (u_fireMode > 0.5) {
                float progress = clamp(t / lifeSpan, 0.0, 1.0);
                float centerX = u_resolution.x * 0.5;
                pos.x = mix(pos.x, centerX, progress * 0.85);
            }

            if (u_wrapMode > 0.5) {
                float h = max(1.0, u_resolution.y);
                pos.y = mod(pos.y + h + 40.0, h + 80.0) - 40.0;
            }
            
            // Normalize to clip space
            vec2 clipSpace = (pos / u_resolution) * 2.0 - 1.0;
            gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
            gl_PointSize = a_size;
            
            v_color = a_color;
            v_life = clamp(1.0 - (t / lifeSpan), 0.0, 1.0);
        }
    `;

    // Fragment shader - draws circular particles; fire uses a teardrop flame shape
    const fragmentShaderSource = `
        precision mediump float;
        
        varying vec4 v_color;
        varying float v_life;
        uniform mediump float u_fireMode;
        
        void main() {
            vec2 uv = gl_PointCoord * 2.0 - 1.0;

            if (u_fireMode > 0.5) {
                // Teardrop profile: narrow at top, rounder near base.
                float t = clamp((uv.y + 1.0) * 0.5, 0.0, 1.0);
                float halfWidth = mix(0.12, 1.0, t);
                float x = uv.x / max(0.08, halfWidth);
                float y = (uv.y - 0.1) / 1.05;
                float body = x * x + y * y;

                float outer = smoothstep(1.0, 0.55, body);
                float core = smoothstep(0.55, 0.15, body) * 0.45;
                float alpha = (outer + core) * v_color.a * v_life;

                if (alpha < 0.01) discard;
                gl_FragColor = vec4(v_color.rgb, alpha);
                return;
            }

            vec2 coord = gl_PointCoord - vec2(0.5);
            float dist = length(coord);
            
            if (dist > 0.5) discard;
            
            float alpha = smoothstep(0.5, 0.2, dist) * v_color.a * v_life;
            gl_FragColor = vec4(v_color.rgb, alpha);
        }
    `;

    // Compile shaders
    function createShader(type: number, source: string): WebGLShader | null {
        const shader = gl!.createShader(type);
        if (!shader) return null;
        gl!.shaderSource(shader, source);
        gl!.compileShader(shader);
        if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
            console.error(gl!.getShaderInfoLog(shader));
            gl!.deleteShader(shader);
            return null;
        }
        return shader;
    }

    const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vertexShader || !fragmentShader) return null;

    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        return null;
    }

    // Get locations
    const spawnLoc = gl.getAttribLocation(program, 'a_spawn');
    const velocityLoc = gl.getAttribLocation(program, 'a_velocity');
    const sizeLoc = gl.getAttribLocation(program, 'a_size');
    const colorLoc = gl.getAttribLocation(program, 'a_color');
    const lifeLoc = gl.getAttribLocation(program, 'a_lifespan');
    const phaseLoc = gl.getAttribLocation(program, 'a_phase');
    const resolutionLoc = gl.getUniformLocation(program, 'u_resolution');
    const timeLoc = gl.getUniformLocation(program, 'u_time');
    const gravityLoc = gl.getUniformLocation(program, 'u_gravity');
    const wrapModeLoc = gl.getUniformLocation(program, 'u_wrapMode');
    const fireModeLoc = gl.getUniformLocation(program, 'u_fireMode');
    const loopModeLoc = gl.getUniformLocation(program, 'u_loopMode');

    // Create buffers
    const spawns = new Float32Array(count * 2);
    const velocities = new Float32Array(count * 2);
    const sizes = new Float32Array(count);
    const particleColors = new Float32Array(count * 4);
    const lifeSpans = new Float32Array(count);
    const phases = new Float32Array(count);

    const rand = (min: number, max: number) => min + Math.random() * (max - min);
    const spreadScale = Math.max(0, spread);

    // Simulation profile per type
    const gravityByType: Record<string, [number, number]> = {
        shower: [0, 120],
        burst: [0, 35],
        float: [0, -8],
        firework: [0, 90],
        explosion: [0, 200],
        fire: [0, -18],
        ripple: [0, 0],
        spiral: [0, 0],
    };
    const wrapMode = type === 'shower' ? 1 : 0;
    const fireMode = type === 'fire' ? 1 : 0;
    const gravity = gravityByType[type] ?? [0, 40];

    // Looping effects stagger particles so they are spread across their
    // lifecycle from frame 0, preventing the initial burst glitch.
    const isLooping = type === 'fire' || type === 'shower' || type === 'float' || type === 'ripple';

    // Initialize particles
    function parseCssColor(color: string): [number, number, number] {
        const value = color.trim();

        // #rgb, #rgba, #rrggbb, #rrggbbaa
        if (value.startsWith('#')) {
            const hex = value.slice(1);
            if (hex.length === 3 || hex.length === 4) {
                const r = parseInt(hex[0] + hex[0], 16);
                const g = parseInt(hex[1] + hex[1], 16);
                const b = parseInt(hex[2] + hex[2], 16);
                if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
                    return [r / 255, g / 255, b / 255];
                }
            }
            if (hex.length >= 6) {
                const r = parseInt(hex.slice(0, 2), 16);
                const g = parseInt(hex.slice(2, 4), 16);
                const b = parseInt(hex.slice(4, 6), 16);
                if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
                    return [r / 255, g / 255, b / 255];
                }
            }
        }

        // rgb(...) / rgba(...)
        const rgb = value.match(/^rgba?\(([^)]+)\)$/i);
        if (rgb) {
            const parts = rgb[1].split(',').map(p => p.trim());
            if (parts.length >= 3) {
                const r = Math.max(0, Math.min(255, parseFloat(parts[0])));
                const g = Math.max(0, Math.min(255, parseFloat(parts[1])));
                const b = Math.max(0, Math.min(255, parseFloat(parts[2])));
                if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
                    return [r / 255, g / 255, b / 255];
                }
            }
        }

        return [1, 1, 1];
    }

    for (let i = 0; i < count; i++) {
        let phaseOffset = 0;
        // Spawn + velocity presets tuned per effect type.
        if (type === 'shower') {
            spawns[i * 2] = Math.random() * canvas.width;
            spawns[i * 2 + 1] = -rand(10, canvas.height * 0.4);
            velocities[i * 2] = rand(-30, 30);
            velocities[i * 2 + 1] = rand(Math.max(20, speed.min), Math.max(speed.min + 1, speed.max));
            lifeSpans[i] = rand(2.4, 4.2);
        } else if (type === 'float') {
            spawns[i * 2] = Math.random() * canvas.width;
            spawns[i * 2 + 1] = canvas.height + rand(0, canvas.height * 0.2);
            velocities[i * 2] = rand(-20, 20);
            velocities[i * 2 + 1] = -rand(Math.max(20, speed.min), Math.max(speed.min + 1, speed.max));
            lifeSpans[i] = rand(2.8, 5.2);
        } else if (type === 'firework') {
            const cluster = i % 24;
            const cx = canvas.width * rand(0.15, 0.85);
            const cy = canvas.height * rand(0.12, 0.42);
            const a = (cluster / 24) * Math.PI * 2 + rand(-0.2, 0.2);
            const v = rand(Math.max(80, speed.min), Math.max(speed.min + 1, speed.max));
            spawns[i * 2] = cx;
            spawns[i * 2 + 1] = cy;
            velocities[i * 2] = Math.cos(a) * v;
            velocities[i * 2 + 1] = Math.sin(a) * v;
            lifeSpans[i] = rand(1.2, 2.8);
        } else if (type === 'explosion') {
            const a = Math.random() * Math.PI * 2;
            const radialBias = Math.pow(Math.random(), 0.55);
            const v = speed.min + radialBias * (speed.max - speed.min) * 1.25;
            const jitter = rand(0, 14);
            spawns[i * 2] = canvas.width * 0.5 + Math.cos(a) * jitter;
            spawns[i * 2 + 1] = canvas.height * 0.5 + Math.sin(a) * jitter;
            velocities[i * 2] = Math.cos(a) * v;
            velocities[i * 2 + 1] = Math.sin(a) * v - rand(20, 90);
            lifeSpans[i] = rand(0.6, 1.4);
        } else if (type === 'fire') {
            // Spawn spread across a horizontal base, rising upward
            const baseSpread = (size.max ?? 8) * 6 * spreadScale;
            const hDrift = 20 * spreadScale;
            spawns[i * 2] = canvas.width * 0.5 + (Math.random() - 0.5) * baseSpread;
            spawns[i * 2 + 1] = canvas.height * 0.5;
            velocities[i * 2] = rand(-hDrift, hDrift);
            velocities[i * 2 + 1] = -rand(Math.max(20, speed.min), Math.max(speed.min + 1, speed.max));
            lifeSpans[i] = rand(0.9, 1.9);
        } else if (type === 'ripple') {
            // Expanding concentric ripple from center (deterministic radial motion).
            const ringCount = 5;
            const ringIdx = i % ringCount;
            const pointIdx = Math.floor(i / ringCount);
            const pointsPerRing = Math.max(1, Math.ceil(count / ringCount));
            const angle = (pointIdx / pointsPerRing) * Math.PI * 2;
            const ringRadius = ringIdx * 2.0;
            const ringSpeed = 65 + ringIdx * 12;

            spawns[i * 2] = canvas.width * 0.5 + Math.cos(angle) * ringRadius;
            spawns[i * 2 + 1] = canvas.height * 0.5 + Math.sin(angle) * ringRadius;
            velocities[i * 2] = Math.cos(angle) * ringSpeed;
            velocities[i * 2 + 1] = Math.sin(angle) * ringSpeed;
            lifeSpans[i] = 1.8 + ringIdx * 0.18;
            phaseOffset = lifeSpans[i] * (ringIdx / ringCount);
        } else if (type === 'spiral') {
            // Spiral galaxy-like motion with selectable rotation direction.
            const dir = spiralDirection === 'counterclockwise' ? -1 : 1;
            const t = count > 1 ? i / (count - 1) : 0.5;
            const a = t * Math.PI * 8;
            const r = t * Math.min(canvas.width, canvas.height) * 0.28;
            const spd = rand(Math.max(30, speed.min), Math.max(speed.min + 1, speed.max));
            spawns[i * 2] = canvas.width * 0.5 + Math.cos(a) * r;
            spawns[i * 2 + 1] = canvas.height * 0.5 + Math.sin(a) * r;
            velocities[i * 2] = Math.cos(a + (Math.PI / 2) * dir) * spd;
            velocities[i * 2 + 1] = Math.sin(a + (Math.PI / 2) * dir) * spd;
            lifeSpans[i] = rand(1.8, 3.0);
        } else {
            // burst/default
            const a = Math.random() * Math.PI * 2;
            const v = rand(Math.max(30, speed.min), Math.max(speed.min + 1, speed.max));
            spawns[i * 2] = canvas.width * 0.5;
            spawns[i * 2 + 1] = canvas.height * 0.5;
            velocities[i * 2] = Math.cos(a) * v;
            velocities[i * 2 + 1] = Math.sin(a) * v;
            lifeSpans[i] = rand(1.1, 2.3);
        }

            // Phase offset: looping effects spread evenly; ripple is ring-phased.
            phases[i] = type === 'ripple'
                ? phaseOffset
                : (isLooping ? lifeSpans[i] * (i / count) : 0);

        sizes[i] = size.min + Math.random() * (size.max - size.min);
        
        const color = parseCssColor(colors[Math.floor(Math.random() * colors.length)]);
        particleColors[i * 4] = color[0];
        particleColors[i * 4 + 1] = color[1];
        particleColors[i * 4 + 2] = color[2];
        particleColors[i * 4 + 3] = 0.8;
    }

    // Create and fill buffers
    const spawnBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, spawnBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, spawns, gl.STATIC_DRAW);

    const velBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, velBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, velocities, gl.STATIC_DRAW);

    const sizeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sizes, gl.STATIC_DRAW);

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, particleColors, gl.STATIC_DRAW);

    const lifeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, lifeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, lifeSpans, gl.STATIC_DRAW);

    const phaseBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, phaseBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, phases, gl.STATIC_DRAW);

    let animationLoop: AnimationLoop | null = null;

    return {
        start() {
            gl!.enable(gl!.BLEND);
            gl!.blendFunc(gl!.SRC_ALPHA, gl!.ONE_MINUS_SRC_ALPHA);

            animationLoop = createAnimationLoop((dt, elapsed) => {
                gl!.viewport(0, 0, canvas.width, canvas.height);
                gl!.clearColor(0, 0, 0, 0);
                gl!.clear(gl!.COLOR_BUFFER_BIT);

                gl!.useProgram(program);
                gl!.uniform2f(resolutionLoc, canvas.width, canvas.height);
                gl!.uniform1f(timeLoc, elapsed);
                gl!.uniform2f(gravityLoc, gravity[0], gravity[1]);
                gl!.uniform1f(wrapModeLoc, wrapMode);
                gl!.uniform1f(fireModeLoc, fireMode);
                gl!.uniform1f(loopModeLoc, loop ? 1 : 0);

                // Bind attributes
                gl!.bindBuffer(gl!.ARRAY_BUFFER, spawnBuffer);
                gl!.enableVertexAttribArray(spawnLoc);
                gl!.vertexAttribPointer(spawnLoc, 2, gl!.FLOAT, false, 0, 0);

                gl!.bindBuffer(gl!.ARRAY_BUFFER, velBuffer);
                gl!.enableVertexAttribArray(velocityLoc);
                gl!.vertexAttribPointer(velocityLoc, 2, gl!.FLOAT, false, 0, 0);

                gl!.bindBuffer(gl!.ARRAY_BUFFER, sizeBuffer);
                gl!.enableVertexAttribArray(sizeLoc);
                gl!.vertexAttribPointer(sizeLoc, 1, gl!.FLOAT, false, 0, 0);

                gl!.bindBuffer(gl!.ARRAY_BUFFER, colorBuffer);
                gl!.enableVertexAttribArray(colorLoc);
                gl!.vertexAttribPointer(colorLoc, 4, gl!.FLOAT, false, 0, 0);

                gl!.bindBuffer(gl!.ARRAY_BUFFER, lifeBuffer);
                gl!.enableVertexAttribArray(lifeLoc);
                gl!.vertexAttribPointer(lifeLoc, 1, gl!.FLOAT, false, 0, 0);

                gl!.bindBuffer(gl!.ARRAY_BUFFER, phaseBuffer);
                gl!.enableVertexAttribArray(phaseLoc);
                gl!.vertexAttribPointer(phaseLoc, 1, gl!.FLOAT, false, 0, 0);

                gl!.drawArrays(gl!.POINTS, 0, count);
            });

            animationLoop.start();
        },
        stop() {
            animationLoop?.stop();
        },
        destroy() {
            animationLoop?.stop();
            gl!.deleteProgram(program);
            gl!.deleteShader(vertexShader);
            gl!.deleteShader(fragmentShader);
            gl!.deleteBuffer(spawnBuffer);
            gl!.deleteBuffer(velBuffer);
            gl!.deleteBuffer(sizeBuffer);
            gl!.deleteBuffer(colorBuffer);
            gl!.deleteBuffer(lifeBuffer);
            gl!.deleteBuffer(phaseBuffer);
        }
    };
}

// ============================================
// CSS Animation Injection
// ============================================

const injectedAnimations = new Set<string>();

/**
 * Inject keyframe animation into document (once)
 * These run entirely on GPU via compositor
 */
export function injectKeyframes(name: string, keyframes: string): void {
    if (injectedAnimations.has(name)) return;
    
    const style = document.createElement('style');
    style.textContent = `@keyframes ${name} { ${keyframes} }`;
    document.head.appendChild(style);
    injectedAnimations.add(name);
}

/**
 * Common GPU-accelerated keyframe animations
 */
export function injectCommonAnimations(): void {
    injectKeyframes('nc-fade-in', `
        from { opacity: 0; }
        to { opacity: 1; }
    `);
    
    injectKeyframes('nc-fade-out', `
        from { opacity: 1; }
        to { opacity: 0; }
    `);
    
    injectKeyframes('nc-slide-up', `
        from { transform: translate3d(0, 40px, 0); opacity: 0; }
        to { transform: translate3d(0, 0, 0); opacity: 1; }
    `);
    
    injectKeyframes('nc-slide-down', `
        from { transform: translate3d(0, -40px, 0); opacity: 0; }
        to { transform: translate3d(0, 0, 0); opacity: 1; }
    `);
    
    injectKeyframes('nc-scale-in', `
        from { transform: scale3d(0.8, 0.8, 1); opacity: 0; }
        to { transform: scale3d(1, 1, 1); opacity: 1; }
    `);
    
    injectKeyframes('nc-spin', `
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    `);
    
    injectKeyframes('nc-pulse', `
        0%, 100% { transform: scale3d(1, 1, 1); }
        50% { transform: scale3d(1.05, 1.05, 1); }
    `);
    
    injectKeyframes('nc-shake', `
        0%, 100% { transform: translate3d(0, 0, 0); }
        25% { transform: translate3d(-5px, 0, 0); }
        75% { transform: translate3d(5px, 0, 0); }
    `);
    
    injectKeyframes('nc-bounce', `
        0%, 100% { transform: translate3d(0, 0, 0); animation-timing-function: cubic-bezier(0.8, 0, 1, 1); }
        50% { transform: translate3d(0, -25px, 0); animation-timing-function: cubic-bezier(0, 0, 0.2, 1); }
    `);
}

// ============================================
// Passive Event Listener Utility
// ============================================

/**
 * Add passive event listener for scroll/touch performance
 */
export function addPassiveListener(
    element: HTMLElement | Window,
    event: string,
    handler: EventListener
): () => void {
    element.addEventListener(event, handler, { passive: true });
    return () => element.removeEventListener(event, handler);
}

/**
 * Throttle function for scroll/resize handlers
 */
export function throttle<T extends (...args: any[]) => void>(
    fn: T,
    limit: number
): T {
    let inThrottle = false;
    return ((...args: any[]) => {
        if (!inThrottle) {
            fn(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }) as T;
}

/**
 * RAF-based throttle for smooth animations
 */
export function rafThrottle<T extends (...args: any[]) => void>(fn: T): T {
    let rafId: number | null = null;
    return ((...args: any[]) => {
        if (rafId !== null) return;
        rafId = requestAnimationFrame(() => {
            fn(...args);
            rafId = null;
        });
    }) as T;
}

// Export all utilities
export const GPUAnimation = {
    setGPUTransform,
    setTransformVars,
    prepareForAnimation,
    cleanupAnimation,
    animate,
    fadeIn,
    fadeOut,
    slideIn,
    scaleIn,
    createAnimationLoop,
    createWebGLParticleSystem,
    injectKeyframes,
    injectCommonAnimations,
    addPassiveListener,
    throttle,
    rafThrottle
};

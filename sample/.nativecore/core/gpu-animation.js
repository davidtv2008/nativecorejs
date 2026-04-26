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
// ============================================
// GPU Transform Utilities
// ============================================
/**
 * Apply GPU-accelerated transform using translate3d
 * translate3d forces GPU layer creation even for 2D transforms
 */
export function setGPUTransform(element, x, y, z = 0, scale = 1, rotate = 0) {
    element.style.transform = `translate3d(${x}px, ${y}px, ${z}px) scale(${scale}) rotate(${rotate}deg)`;
}
/**
 * Apply transform using CSS custom properties
 * This allows CSS transitions to handle the animation on GPU
 */
export function setTransformVars(element, vars) {
    for (const [key, value] of Object.entries(vars)) {
        element.style.setProperty(`--${key}`, typeof value === 'number' ? `${value}px` : value);
    }
}
/**
 * Prepare element for GPU animation with proper hints
 */
export function prepareForAnimation(element, properties = ['transform', 'opacity']) {
    element.style.willChange = properties.join(', ');
    element.style.contain = 'layout style paint';
    element.style.backfaceVisibility = 'hidden';
    // Force GPU layer
    element.style.transform = element.style.transform || 'translateZ(0)';
}
/**
 * Clean up animation hints to free GPU memory
 */
export function cleanupAnimation(element) {
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
export function animate(element, keyframes, options = {}) {
    const { duration = 300, easing = 'cubic-bezier(0.4, 0, 0.2, 1)', delay = 0, fill = 'forwards', iterations = 1 } = options;
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
export function fadeIn(element, duration = 300) {
    prepareForAnimation(element, ['opacity']);
    return animate(element, [
        { opacity: 0 },
        { opacity: 1 }
    ], { duration });
}
export function fadeOut(element, duration = 300) {
    prepareForAnimation(element, ['opacity']);
    return animate(element, [
        { opacity: 1 },
        { opacity: 0 }
    ], { duration });
}
/**
 * GPU-accelerated slide animation
 */
export function slideIn(element, direction = 'up', distance = 40, duration = 400) {
    prepareForAnimation(element);
    const translations = {
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
export function scaleIn(element, duration = 300) {
    prepareForAnimation(element);
    return animate(element, [
        { transform: 'scale3d(0.8, 0.8, 1)', opacity: 0 },
        { transform: 'scale3d(1, 1, 1)', opacity: 1 }
    ], { duration, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });
}
/**
 * Create a high-performance animation loop with delta time
 * Automatically handles frame timing and cleanup
 */
export function createAnimationLoop(callback) {
    let rafId = null;
    let lastTime = 0;
    let startTime = 0;
    let running = false;
    const tick = (currentTime) => {
        if (!running)
            return;
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
        }
        else {
            running = false;
        }
    };
    return {
        start() {
            if (running)
                return;
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
export function createWebGLParticleSystem(canvas, config) {
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
        console.warn('[GPU Animation] WebGL not available, falling back to canvas');
        return null;
    }
    const { count, colors = ['#667eea', '#764ba2', '#f093fb'], size = { min: 2, max: 6 } } = config;
    // Vertex shader - positions computed on GPU
    const vertexShaderSource = `
        attribute vec2 a_position;
        attribute vec2 a_velocity;
        attribute float a_size;
        attribute vec4 a_color;
        attribute float a_life;
        
        uniform vec2 u_resolution;
        uniform float u_time;
        uniform float u_deltaTime;
        
        varying vec4 v_color;
        varying float v_life;
        
        void main() {
            vec2 pos = a_position + a_velocity * u_time;
            
            // Normalize to clip space
            vec2 clipSpace = (pos / u_resolution) * 2.0 - 1.0;
            gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
            gl_PointSize = a_size;
            
            v_color = a_color;
            v_life = a_life;
        }
    `;
    // Fragment shader - draws circular particles with alpha
    const fragmentShaderSource = `
        precision mediump float;
        
        varying vec4 v_color;
        varying float v_life;
        
        void main() {
            vec2 coord = gl_PointCoord - vec2(0.5);
            float dist = length(coord);
            
            if (dist > 0.5) discard;
            
            float alpha = smoothstep(0.5, 0.2, dist) * v_color.a * v_life;
            gl_FragColor = vec4(v_color.rgb, alpha);
        }
    `;
    // Compile shaders
    function createShader(type, source) {
        const shader = gl.createShader(type);
        if (!shader)
            return null;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }
    const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vertexShader || !fragmentShader)
        return null;
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        return null;
    }
    // Get locations
    const positionLoc = gl.getAttribLocation(program, 'a_position');
    const velocityLoc = gl.getAttribLocation(program, 'a_velocity');
    const sizeLoc = gl.getAttribLocation(program, 'a_size');
    const colorLoc = gl.getAttribLocation(program, 'a_color');
    const lifeLoc = gl.getAttribLocation(program, 'a_life');
    const resolutionLoc = gl.getUniformLocation(program, 'u_resolution');
    const timeLoc = gl.getUniformLocation(program, 'u_time');
    // Create buffers
    const positions = new Float32Array(count * 2);
    const velocities = new Float32Array(count * 2);
    const sizes = new Float32Array(count);
    const particleColors = new Float32Array(count * 4);
    const lives = new Float32Array(count);
    // Initialize particles
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16) / 255,
            parseInt(result[2], 16) / 255,
            parseInt(result[3], 16) / 255
        ] : [1, 1, 1];
    }
    for (let i = 0; i < count; i++) {
        positions[i * 2] = Math.random() * canvas.width;
        positions[i * 2 + 1] = Math.random() * -canvas.height;
        velocities[i * 2] = (Math.random() - 0.5) * 50;
        velocities[i * 2 + 1] = 50 + Math.random() * 100;
        sizes[i] = size.min + Math.random() * (size.max - size.min);
        const color = hexToRgb(colors[Math.floor(Math.random() * colors.length)]);
        particleColors[i * 4] = color[0];
        particleColors[i * 4 + 1] = color[1];
        particleColors[i * 4 + 2] = color[2];
        particleColors[i * 4 + 3] = 0.8;
        lives[i] = 1.0;
    }
    // Create and fill buffers
    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
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
    gl.bufferData(gl.ARRAY_BUFFER, lives, gl.STATIC_DRAW);
    let animationLoop = null;
    return {
        start() {
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            animationLoop = createAnimationLoop((dt, elapsed) => {
                gl.viewport(0, 0, canvas.width, canvas.height);
                gl.clearColor(0, 0, 0, 0);
                gl.clear(gl.COLOR_BUFFER_BIT);
                gl.useProgram(program);
                gl.uniform2f(resolutionLoc, canvas.width, canvas.height);
                gl.uniform1f(timeLoc, elapsed);
                // Update positions (wrap around)
                for (let i = 0; i < count; i++) {
                    positions[i * 2 + 1] += velocities[i * 2 + 1] * dt;
                    positions[i * 2] += velocities[i * 2] * dt;
                    if (positions[i * 2 + 1] > canvas.height) {
                        positions[i * 2 + 1] = -sizes[i];
                        positions[i * 2] = Math.random() * canvas.width;
                    }
                }
                gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
                gl.bufferSubData(gl.ARRAY_BUFFER, 0, positions);
                // Bind attributes
                gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
                gl.enableVertexAttribArray(positionLoc);
                gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
                gl.bindBuffer(gl.ARRAY_BUFFER, velBuffer);
                gl.enableVertexAttribArray(velocityLoc);
                gl.vertexAttribPointer(velocityLoc, 2, gl.FLOAT, false, 0, 0);
                gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer);
                gl.enableVertexAttribArray(sizeLoc);
                gl.vertexAttribPointer(sizeLoc, 1, gl.FLOAT, false, 0, 0);
                gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
                gl.enableVertexAttribArray(colorLoc);
                gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
                gl.bindBuffer(gl.ARRAY_BUFFER, lifeBuffer);
                gl.enableVertexAttribArray(lifeLoc);
                gl.vertexAttribPointer(lifeLoc, 1, gl.FLOAT, false, 0, 0);
                gl.drawArrays(gl.POINTS, 0, count);
            });
            animationLoop.start();
        },
        stop() {
            animationLoop?.stop();
        },
        destroy() {
            animationLoop?.stop();
            gl.deleteProgram(program);
            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);
            gl.deleteBuffer(posBuffer);
            gl.deleteBuffer(velBuffer);
            gl.deleteBuffer(sizeBuffer);
            gl.deleteBuffer(colorBuffer);
            gl.deleteBuffer(lifeBuffer);
        }
    };
}
// ============================================
// CSS Animation Injection
// ============================================
const injectedAnimations = new Set();
/**
 * Inject keyframe animation into document (once)
 * These run entirely on GPU via compositor
 */
export function injectKeyframes(name, keyframes) {
    if (injectedAnimations.has(name))
        return;
    const style = document.createElement('style');
    style.textContent = `@keyframes ${name} { ${keyframes} }`;
    document.head.appendChild(style);
    injectedAnimations.add(name);
}
/**
 * Common GPU-accelerated keyframe animations
 */
export function injectCommonAnimations() {
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
export function addPassiveListener(element, event, handler) {
    element.addEventListener(event, handler, { passive: true });
    return () => element.removeEventListener(event, handler);
}
/**
 * Throttle function for scroll/resize handlers
 */
export function throttle(fn, limit) {
    let inThrottle = false;
    return ((...args) => {
        if (!inThrottle) {
            fn(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    });
}
/**
 * RAF-based throttle for smooth animations
 */
export function rafThrottle(fn) {
    let rafId = null;
    return ((...args) => {
        if (rafId !== null)
            return;
        rafId = requestAnimationFrame(() => {
            fn(...args);
            rafId = null;
        });
    });
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

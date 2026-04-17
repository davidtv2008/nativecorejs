/**
 * nc-splash Component
 * 
 * Standalone full-screen splash screen with dissolve effect.
 * Shows branding then dissolves into particles.
 * Use anywhere without needing to wrap content.
 * 
 * Usage:
 * </nc-splash>
 * 
 * 
 */
import { Component, defineComponent } from '../core/component.js';
import { escapeHTML } from '../utils/templates.js';
import { useState } from '../core/state.js';
import { createAnimationLoop, type AnimationLoop } from '../core/gpu-animation.js';
import type { State } from '../core/state.js';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    alpha: number;
    rotation: number;
    rotationSpeed: number;
}

export class NcSplash extends Component {
    static useShadowDOM = true;
    
    private isComplete: State<boolean>;
    private canvas?: HTMLCanvasElement;
    private animationLoop?: AnimationLoop;
    
    static get observedAttributes() {
        return ['particles', 'duration', 'delay', 'title', 'subtitle'];
    }
    
    constructor() {
        super();
        this.isComplete = useState(false);
    }
    
    template() {
        const title = this.attr('title', 'NativeCore');
        const subtitle = this.attr('subtitle', '');
        return `
            <style>
                :host {
                    display: block;
                    position: fixed;
                    inset: 0;
                    width: auto;
                    height: auto;
                    z-index: 99999;
                }
                
                .splash-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.98) 100%);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    transition: opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1);
                }
                
                .splash-overlay.fade-out {
                    opacity: 0;
                    pointer-events: none;
                }
                
                .splash-overlay.hidden {
                    display: none;
                }
                
                .splash-content {
                    text-align: center;
                    z-index: 1;
                }
                
                .splash-prompt {
                    margin-top: 2.5rem;
                    font-size: 1.25rem;
                    color: #fff;
                    opacity: 0.85;
                    letter-spacing: 0.1em;
                    font-family: 'Fira Mono', 'Fira Code', monospace;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5em;
                    user-select: none;
                }
                
                .splash-cursor {
                    display: inline-block;
                    width: 1ch;
                    height: 1.2em;
                    background: none;
                    border-right: 2px solid #fff;
                    animation: blink-cursor 1s steps(1) infinite;
                    margin-left: 0.1em;
                }
                
                @keyframes blink-cursor {
                    0%, 49% { opacity: 1; }
                    50%, 100% { opacity: 0; }
                }
                
                .splash-title {
                    font-size: clamp(3rem, 12vw, 8rem);
                    font-weight: 800;
                    background: linear-gradient(135deg, #10b981 0%, #3b82f6 50%, #06b6d4 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    letter-spacing: -0.02em;
                    margin: 0;
                    text-shadow: 0 0 80px rgba(16, 185, 129, 0.5);
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                
                .splash-subtitle {
                    font-size: clamp(0.875rem, 2vw, 1.25rem);
                    color: rgba(255, 255, 255, 0.6);
                    margin-top: 1rem;
                    font-weight: 400;
                    letter-spacing: 0.2em;
                    text-transform: uppercase;
                }
                
                .splash-glow {
                    position: absolute;
                    width: 600px;
                    height: 600px;
                    background: radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%);
                    pointer-events: none;
                }
                
                .splash-canvas {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    z-index: 100000;
                }
            </style>
            
            <div class="splash-overlay" id="overlay">
                <div class="splash-glow"></div>
                <div class="splash-content" id="content">
                    <h1 class="splash-title">${escapeHTML(title)}</h1>
                    ${subtitle ? `<p class="splash-subtitle">${escapeHTML(subtitle)}</p>` : ''}
                    <div class="splash-prompt" id="prompt">
                        Click to start <span class="splash-cursor"></span>
                    </div>
                </div>
            </div>
        `;
    }

    onMount() {
        // Check if splash has already been shown this session
        const splashShown = sessionStorage.getItem('splash-shown');
        const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
        const shouldSkipSplash =
            window.matchMedia('(max-width: 768px)').matches ||
            window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
            connection?.saveData === true;
        
        if (splashShown === 'true' || shouldSkipSplash) {
            // Skip splash, hide component but keep in DOM for dev tools
            this.style.display = 'none';
            return;
        }
        
        const overlay = this.$('#overlay') as HTMLElement;
        const prompt = this.$('#prompt') as HTMLElement;
        if (overlay && prompt) {
            const clickHandler = () => {
                prompt.style.opacity = '0.5';
                prompt.style.pointerEvents = 'none';
                setTimeout(() => {
                    prompt.style.display = 'none';
                }, 300);
                this.startDissolve();
                overlay.removeEventListener('click', clickHandler);
                window.removeEventListener('keydown', keyHandler);
            };
            const keyHandler = (e: KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    clickHandler();
                }
            };
            overlay.addEventListener('click', clickHandler);
            window.addEventListener('keydown', keyHandler);
        }
    }
    
    private startDissolve() {
        const overlay = this.$('#overlay') as HTMLElement;
        const content = this.$('#content') as HTMLElement;
        
        if (!overlay || !content) return;
        
        const particleCount = parseInt(this.attr('particles', '10000') ?? '10000', 10);
        const duration = parseInt(this.attr('duration', '2500') ?? '2500', 10);
        
        // Get content bounding rect
        const rect = content.getBoundingClientRect();
        
        // Sample colors from the gradient (emerald green palette)
        const colors = [
            '#10b981', '#059669', '#34d399', '#14b8a6', 
            '#3b82f6', '#2563eb', '#06b6d4', '#0891b2'
        ];
        
        // Create canvas
        const dpr = window.devicePixelRatio || 1;
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'splash-canvas';
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.canvas.style.cssText = `position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:100000`;
        
        const ctx = this.canvas.getContext('2d', { alpha: true });
        if (!ctx) return;
        
        ctx.scale(dpr, dpr);
        
        // Create particles in a grid covering the content area
        const particles: Particle[] = [];
        const gridSize = Math.ceil(Math.sqrt(particleCount));
        const cellWidth = rect.width / gridSize;
        const cellHeight = rect.height / gridSize;
        
        for (let i = 0; i < particleCount; i++) {
            const row = Math.floor(i / gridSize);
            const col = i % gridSize;
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 4;
            
            particles.push({
                x: rect.left + col * cellWidth + cellWidth / 2 + (Math.random() - 0.5) * cellWidth * 0.5,
                y: rect.top + row * cellHeight + cellHeight / 2 + (Math.random() - 0.5) * cellHeight * 0.5,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 0.5, // slight upward bias
                size: Math.max(cellWidth, cellHeight) * (0.6 + Math.random() * 0.4),
                color: colors[Math.floor(Math.random() * colors.length)],
                alpha: 0.8 + Math.random() * 0.2,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.15
            });
        }
        
        // Hide original content, show canvas
        content.style.opacity = '0';
        this.shadowRoot?.appendChild(this.canvas);
        
        const startTime = performance.now();
        const fadeStart = duration * 0.4;
        
        this.animationLoop = createAnimationLoop((dt) => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
            
            for (const p of particles) {
                // Physics
                p.x += p.vx * dt * 60;
                p.y += p.vy * dt * 60;
                p.vy += 0.08 * dt * 60; // gravity
                p.rotation += p.rotationSpeed;
                
                // Fade out
                if (elapsed > fadeStart) {
                    p.alpha = Math.max(0, (1 - ((elapsed - fadeStart) / (duration - fadeStart))) * 0.9);
                }
                
                // Draw
                if (p.alpha > 0.01) {
                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate(p.rotation);
                    ctx.globalAlpha = p.alpha;
                    ctx.fillStyle = p.color;
                    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                    ctx.restore();
                }
            }
            
            if (progress >= 1) {
                return false;
            }
            return true;
        });
        
        this.animationLoop.start();
        
        // Start fading overlay
        setTimeout(() => {
            overlay.classList.add('fade-out');
        }, duration * 0.6);
        
        // Complete cleanup - mark as shown and hide component
        setTimeout(() => {
            this.animationLoop?.stop();
            this.canvas?.remove();
            overlay.classList.add('hidden');
            this.isComplete.value = true;
            
            // Mark splash as shown in sessionStorage
            sessionStorage.setItem('splash-shown', 'true');
            
            this.dispatchEvent(new CustomEvent('splash-complete', {
                bubbles: true,
                composed: true
            }));
            
            // Hide the component but keep in DOM for dev tools
            setTimeout(() => this.style.display = 'none', 100);
        }, duration + 800);
    }
    
    disconnectedCallback() {
        this.animationLoop?.stop();
        this.canvas?.remove();
    }
}

defineComponent('nc-splash', NcSplash);


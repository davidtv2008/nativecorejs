/**
 * Metrics Panel - Dev Performance Monitor
 *
 * Displays live performance metrics in the dev tools overlay:
 * - Custom component count on the page
 * - Navigation timing (page load / route change duration)
 * - JS heap memory usage (Chrome only)
 * - Approximate FPS via requestAnimationFrame
 *
 * SECURITY: Only active in development (localhost). Excluded from production
 * builds via tsconfig.build.json.
 */

export class MetricsPanel {
    private panel: HTMLElement | null = null;
    private tab: HTMLElement | null = null;
    private isOpen: boolean = false;
    private isVisible: boolean = true;
    private rafId: number | null = null;
    private fpsFrames: number = 0;
    private fpsLastTime: number = performance.now();
    private currentFps: number = 0;
    private routeStartTime: number = performance.now();
    private lastRouteDuration: number = 0;

    constructor() {
        this.injectStyles();
        this.createPanel();
        this.startFpsLoop();
        this.listenForRouteChanges();
    }

    // ------------------------------------------------------------------
    // Public API
    // ------------------------------------------------------------------

    setVisible(visible: boolean): void {
        this.isVisible = visible;
        this.applyVisibility();
    }

    destroy(): void {
        if (this.rafId !== null) cancelAnimationFrame(this.rafId);
        this.panel?.remove();
        this.tab?.remove();
    }

    // ------------------------------------------------------------------
    // DOM Construction
    // ------------------------------------------------------------------

    private injectStyles(): void {
        const id = 'nativecore-metrics-styles';
        if (document.getElementById(id)) return;

        const style = document.createElement('style');
        style.id = id;
        style.textContent = `
            .nc-metrics-panel {
                position: fixed;
                right: 0;
                bottom: 0;
                width: 260px;
                background: #0f1520;
                border-top: 1px solid #3a485b;
                border-left: 1px solid #3a485b;
                border-radius: 12px 0 0 0;
                box-shadow: -2px -2px 10px rgba(0,0,0,0.35);
                z-index: 999997;
                transition: transform 0.2s ease;
                display: flex;
                flex-direction: column;
                font-family: 'Fira Code', 'Courier New', monospace;
                font-size: 12px;
                color: #c9d4e0;
                overflow: hidden;
            }

            .nc-metrics-panel.closed {
                transform: translateY(calc(100% - 36px));
            }

            .nc-metrics-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 12px;
                background: #182130;
                border-bottom: 1px solid #3a485b;
                cursor: pointer;
                user-select: none;
                flex-shrink: 0;
            }

            .nc-metrics-header:hover {
                background: #1f2838;
            }

            .nc-metrics-title {
                font-size: 11px;
                font-weight: 700;
                color: #e7eef7;
                letter-spacing: 0.5px;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .nc-metrics-title-dot {
                width: 7px;
                height: 7px;
                border-radius: 50%;
                background: #22c55e;
                animation: nc-metrics-pulse 2s ease-in-out infinite;
            }

            @keyframes nc-metrics-pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.4; }
            }

            .nc-metrics-chevron {
                color: #6c7a8a;
                font-size: 10px;
                transition: transform 0.2s;
            }

            .nc-metrics-panel.closed .nc-metrics-chevron {
                transform: rotate(180deg);
            }

            .nc-metrics-body {
                padding: 10px 12px 12px;
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            .nc-metric-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 5px 8px;
                border-radius: 6px;
                background: #182130;
                border: 1px solid #232f3e;
            }

            .nc-metric-label {
                color: #6c7a8a;
                font-size: 11px;
                letter-spacing: 0.3px;
            }

            .nc-metric-value {
                font-weight: 700;
                font-size: 12px;
                color: #e7eef7;
                font-variant-numeric: tabular-nums;
            }

            .nc-metric-value.good  { color: #22c55e; }
            .nc-metric-value.warn  { color: #f59e0b; }
            .nc-metric-value.bad   { color: #ef4444; }

            .nc-metric-divider {
                height: 1px;
                background: #232f3e;
                margin: 2px 0;
            }
        `;
        document.head.appendChild(style);
    }

    private createPanel(): void {
        this.panel = document.createElement('div');
        this.panel.id = 'nativecore-metrics-panel';
        this.panel.className = 'nc-metrics-panel';

        this.panel.innerHTML = `
            <div class="nc-metrics-header" id="nc-metrics-toggle">
                <span class="nc-metrics-title">
                    <span class="nc-metrics-title-dot"></span>
                    METRICS
                </span>
                <span class="nc-metrics-chevron">&#9650;</span>
            </div>
            <div class="nc-metrics-body" id="nc-metrics-body">
                <div class="nc-metric-row">
                    <span class="nc-metric-label">Components</span>
                    <span class="nc-metric-value" id="nc-m-components">—</span>
                </div>
                <div class="nc-metric-row">
                    <span class="nc-metric-label">FPS</span>
                    <span class="nc-metric-value" id="nc-m-fps">—</span>
                </div>
                <div class="nc-metric-divider"></div>
                <div class="nc-metric-row">
                    <span class="nc-metric-label">Last route</span>
                    <span class="nc-metric-value" id="nc-m-route">—</span>
                </div>
                <div class="nc-metric-row">
                    <span class="nc-metric-label">Page load</span>
                    <span class="nc-metric-value" id="nc-m-load">—</span>
                </div>
                <div class="nc-metric-divider"></div>
                <div class="nc-metric-row">
                    <span class="nc-metric-label">JS heap</span>
                    <span class="nc-metric-value" id="nc-m-heap">—</span>
                </div>
                <div class="nc-metric-row">
                    <span class="nc-metric-label">Heap limit</span>
                    <span class="nc-metric-value" id="nc-m-heap-limit">—</span>
                </div>
            </div>
        `;

        document.body.appendChild(this.panel);

        this.panel.querySelector('#nc-metrics-toggle')!
            .addEventListener('click', () => this.toggleOpen());

        // Start open so metrics are visible immediately
        this.isOpen = true;
    }

    // ------------------------------------------------------------------
    // Metrics collection
    // ------------------------------------------------------------------

    private startFpsLoop(): void {
        const tick = (now: number) => {
            this.fpsFrames++;
            const elapsed = now - this.fpsLastTime;
            if (elapsed >= 1000) {
                this.currentFps = Math.round((this.fpsFrames * 1000) / elapsed);
                this.fpsFrames = 0;
                this.fpsLastTime = now;
                this.updateDisplay();
            }
            this.rafId = requestAnimationFrame(tick);
        };
        this.rafId = requestAnimationFrame(tick);
    }

    private listenForRouteChanges(): void {
        // Capture start of route change
        document.addEventListener('nc-route-start', () => {
            this.routeStartTime = performance.now();
        });

        // Capture end of route change
        document.addEventListener('nc-route-complete', () => {
            this.lastRouteDuration = performance.now() - this.routeStartTime;
            this.updateDisplay();
        });

        // Initial page load duration
        window.addEventListener('load', () => {
            this.updateDisplay();
        });
    }

    private countComponents(): number {
        // Count elements whose tag name contains a hyphen (custom elements)
        return document.querySelectorAll('*').length > 0
            ? Array.from(document.querySelectorAll('*')).filter(
                el => el.tagName.includes('-')
              ).length
            : 0;
    }

    private getHeapInfo(): { used: number; limit: number } | null {
        const mem = (performance as any).memory;
        if (!mem) return null;
        return {
            used: mem.usedJSHeapSize,
            limit: mem.jsHeapSizeLimit,
        };
    }

    private getPageLoadMs(): number | null {
        const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
        if (!nav) return null;
        return Math.round(nav.loadEventEnd - nav.startTime);
    }

    private updateDisplay(): void {
        if (!this.panel || !this.isOpen) return;

        const set = (id: string, text: string, cls: string = '') => {
            const el = this.panel!.querySelector<HTMLElement>(`#${id}`);
            if (!el) return;
            el.textContent = text;
            el.className = `nc-metric-value${cls ? ' ' + cls : ''}`;
        };

        // Component count
        const compCount = this.countComponents();
        set('nc-m-components', String(compCount));

        // FPS
        const fps = this.currentFps;
        const fpsClass = fps >= 55 ? 'good' : fps >= 30 ? 'warn' : fps > 0 ? 'bad' : '';
        set('nc-m-fps', fps > 0 ? `${fps}` : '—', fpsClass);

        // Last route duration
        if (this.lastRouteDuration > 0) {
            const rClass = this.lastRouteDuration < 100 ? 'good' : this.lastRouteDuration < 500 ? 'warn' : 'bad';
            set('nc-m-route', `${Math.round(this.lastRouteDuration)} ms`, rClass);
        }

        // Page load
        const loadMs = this.getPageLoadMs();
        if (loadMs !== null && loadMs > 0) {
            const lClass = loadMs < 1000 ? 'good' : loadMs < 3000 ? 'warn' : 'bad';
            set('nc-m-load', `${loadMs} ms`, lClass);
        }

        // Heap memory
        const heap = this.getHeapInfo();
        if (heap) {
            const heapMb = (heap.used / 1048576).toFixed(1);
            const limitMb = (heap.limit / 1048576).toFixed(0);
            const ratio = heap.used / heap.limit;
            const hClass = ratio < 0.5 ? 'good' : ratio < 0.8 ? 'warn' : 'bad';
            set('nc-m-heap', `${heapMb} MB`, hClass);
            set('nc-m-heap-limit', `${limitMb} MB`);
        } else {
            set('nc-m-heap', 'n/a');
            set('nc-m-heap-limit', 'n/a');
        }
    }

    // ------------------------------------------------------------------
    // Visibility / toggle
    // ------------------------------------------------------------------

    private toggleOpen(): void {
        this.isOpen = !this.isOpen;
        this.panel?.classList.toggle('closed', !this.isOpen);
        if (this.isOpen) this.updateDisplay();
    }

    private applyVisibility(): void {
        if (!this.panel) return;
        this.panel.style.display = this.isVisible ? '' : 'none';
    }
}

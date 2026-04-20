/**
 * NativeCore Dev Tools
 * 
 * SECURITY: This module is ONLY loaded in development mode (localhost).
 * It is completely excluded from production builds via tsconfig.build.json
 * 
 * Features:
 * - Component overlay with gear icons on hover
 * - Live edit modal for component properties
 * - Direct file modification via dev server API
 * - Real-time updates via HMR
 */

import { ComponentOverlay } from './component-overlay.js';
import { ComponentEditor } from './component-editor.js';
import { OutlinePanel } from './outline-panel.js';
import { DrawingOverlay } from './drawing-overlay.js';

class DevTools {
    private static readonly TOGGLE_STORAGE_KEY = 'nativecore-devtools-visible';
    private overlay: ComponentOverlay | null = null;
    private editor: ComponentEditor | null = null;
    private outlinePanel: OutlinePanel | null = null;
    private drawingOverlay: DrawingOverlay | null = null;
    private indicator: HTMLButtonElement | null = null;
    private enabled: boolean = false;
    private overlayVisible: boolean = true;

    /**
     * Initialize dev tools - only works on localhost
     */
    init(): void {
        // SECURITY: Triple-check we're in dev mode
        if (!this.isDevEnvironment()) {
            console.warn('[DevTools] Not in dev environment, refusing to initialize');
            return;
        }

        // console.log('[DevTools] Initializing NativeCore Dev Tools...');
        
        this.overlay = new ComponentOverlay(this.onEditComponent.bind(this));
        this.editor = new ComponentEditor();
        this.outlinePanel = new OutlinePanel(this.onEditComponent.bind(this));
        this.drawingOverlay = new DrawingOverlay();
        this.drawingOverlay.init();
        this.enabled = true;
        this.overlayVisible = this.loadOverlayVisibilityPreference();
        this.overlay.setVisible(this.overlayVisible);
        
        // Add dev mode indicator
        this.addDevIndicator();
        
        // console.log('[DevTools] Ready - hover over components to see edit options');
    }

    /**
     * Check if we're in a development environment
     */
    private isDevEnvironment(): boolean {
        const hostname = window.location.hostname;
        const isLocalhost = hostname === 'localhost' || 
                           hostname === '127.0.0.1' || 
                           hostname.startsWith('192.168.') ||
                           hostname.endsWith('.local');
        
        // Also check for explicit dev flag
        const hasDevFlag = (window as any).__NATIVECORE_DEV__ === true;
        
        return isLocalhost || hasDevFlag;
    }

    /**
     * Handle edit request from overlay
     */
    private async onEditComponent(element: HTMLElement, fromOutlineTree: boolean = false): Promise<void> {
        if (!this.editor) return;

        const tagName = element.tagName.toLowerCase();
        // console.log(`[DevTools] Opening editor for <${tagName}>`);
        
        try {
            // Fetch component metadata from server
            const metadata = await this.fetchComponentMetadata(tagName);
            
            // Open editor modal
            this.editor.open(element, metadata);
            
            // Only expand outline panel if clicked from page (not from tree)
            if (this.outlinePanel && !fromOutlineTree) {
                this.outlinePanel.showAndExpandTo(element);
            }
        } catch (error) {
            console.error('[DevTools] Failed to open editor:', error);
        }
    }

    /**
     * Fetch component file and parse metadata
     */
    private async fetchComponentMetadata(tagName: string): Promise<ComponentMetadata> {
        const response = await fetch(`/api/dev/component/${tagName}`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch metadata for ${tagName}`);
        }
        
        return response.json();
    }

    /**
     * Add visual indicator that dev mode is active
     */
    private addDevIndicator(): void {
        this.indicator?.remove();

        const indicator = document.createElement('button');
        indicator.id = 'nativecore-denc-indicator';
        indicator.type = 'button';
        indicator.setAttribute('aria-pressed', String(this.overlayVisible));
        indicator.innerHTML = `
            <style>
                #nativecore-denc-indicator {
                    position: fixed;
                    bottom: 20px;
                    left: 50%;
                    transform: translateX(calc(-50% + 120px));
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 6px 12px;
                    border-radius: 20px;
                    font-size: 11px;
                    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                    font-weight: 600;
                    z-index: 100;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                    transition: opacity 0.2s, transform 0.2s, box-shadow 0.2s;
                    opacity: 0.95;
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                #nativecore-denc-indicator:hover {
                    transform: translateX(calc(-50% + 120px)) translateY(-1px);
                    box-shadow: 0 6px 18px rgba(0,0,0,0.22);
                }

                #nativecore-denc-indicator.is-off {
                    background: linear-gradient(135deg, #475569 0%, #334155 100%);
                }

                #nativecore-denc-brush-btn {
                    background: rgba(255,255,255,0.15);
                    border: 1px solid rgba(255,255,255,0.25);
                    border-radius: 10px;
                    color: white;
                    font-size: 13px;
                    cursor: pointer;
                    padding: 1px 6px;
                    line-height: 1.4;
                    transition: background 0.15s;
                    display: none;
                }

                #nativecore-denc-indicator:not(.is-off) #nativecore-denc-brush-btn {
                    display: inline-block;
                }

                #nativecore-denc-brush-btn:hover {
                    background: rgba(255,255,255,0.28);
                }

                #nativecore-denc-brush-btn.drawing-on {
                    background: rgba(255,200,0,0.35);
                    border-color: rgba(255,200,0,0.6);
                }
            </style>
            <span id="nativecore-denc-label">DEV MODE: ${this.overlayVisible ? 'ON' : 'OFF'}</span>
            <button id="nativecore-denc-brush-btn" type="button" title="Toggle annotation drawing mode">🖌️</button>
        `;
        indicator.classList.toggle('is-off', !this.overlayVisible);
        indicator.addEventListener('click', () => this.toggleOverlayVisibility());

        // Brush button — stops propagation so it doesn't also toggle dev mode
        const brushBtn = indicator.querySelector('#nativecore-denc-brush-btn') as HTMLButtonElement | null;
        brushBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.drawingOverlay?.toggle();
            brushBtn.classList.toggle('drawing-on', this.drawingOverlay?.isOn ?? false);
        });
        
        document.body.appendChild(indicator);
        this.indicator = indicator;
    }

    private loadOverlayVisibilityPreference(): boolean {
        try {
            return localStorage.getItem(DevTools.TOGGLE_STORAGE_KEY) === 'true';
        } catch {
            return false;
        }
    }

    private saveOverlayVisibilityPreference(): void {
        try {
            localStorage.setItem(DevTools.TOGGLE_STORAGE_KEY, String(this.overlayVisible));
        } catch {
            // Ignore storage failures in dev mode.
        }
    }

    private toggleOverlayVisibility(): void {
        this.overlayVisible = !this.overlayVisible;

        if (!this.overlayVisible) {
            document.dispatchEvent(new CustomEvent('nc-close-editor'));
            // Clear all drawings and exit drawing mode when dev mode is turned off
            if (this.drawingOverlay) {
                this.drawingOverlay.setVisible(false);
                this.drawingOverlay.clear();
            }
        }

        this.overlay?.setVisible(this.overlayVisible);
        this.outlinePanel?.setVisible(this.overlayVisible);
        this.saveOverlayVisibilityPreference();
        this.addDevIndicator();

        document.dispatchEvent(new CustomEvent('nc-devtools-visibility', { detail: { visible: this.overlayVisible } }));
    }

    /**
     * Disable dev tools
     */
    destroy(): void {
        if (this.overlay) {
            this.overlay.destroy();
        }
        if (this.editor) {
            this.editor.destroy();
        }
        if (this.outlinePanel) {
            this.outlinePanel.destroy();
        }
        if (this.drawingOverlay) {
            this.drawingOverlay.destroy();
        }
        // Use dom.query for consistency
        const indicator = (window.dom?.query?.('#nativecore-denc-indicator') || document.getElementById('nativecore-denc-indicator')) as HTMLElement;
        if (indicator) {
            indicator.remove();
        }
        this.indicator = null;
        this.enabled = false;
    }
}

export interface ComponentMetadata {
    tagName: string;
    filePath: string;
    absoluteFilePath?: string;
    className: string;
    attributes: AttributeInfo[];
    cssVariables: CssVariableInfo[];
    slots: SlotInfo[];
    sourceCode: string;
}

export interface AttributeInfo {
    name: string;
    type: 'string' | 'number' | 'boolean';
    defaultValue: string;
    currentValue: string;
    line: number;
}

export interface CssVariableInfo {
    name: string;
    defaultValue: string;
    currentValue: string;
    line: number;
}

export interface SlotInfo {
    name: string;
    content: string;
}

// Export singleton
export const devTools = new DevTools();

// Auto-initialize if in dev mode
if (typeof window !== 'undefined') {
    // Wait for DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => devTools.init());
    } else {
        devTools.init();
    }
}

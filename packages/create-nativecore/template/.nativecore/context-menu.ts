/**
 * Context Menu System for Dev Tools
 * 
 * Adds a right-click context menu to custom components
 * with an option to open the dev tools sidebar.
 */

export class ContextMenu {
    private onEdit: (element: HTMLElement) => void;
    private observedComponents: Set<HTMLElement> = new Set();
    private mutationObserver: MutationObserver | null = null;
    private activeMenu: HTMLElement | null = null;

    constructor(onEdit: (element: HTMLElement) => void) {
        this.onEdit = onEdit;
        this.injectStyles();
        this.setupObserver();
        this.scanExistingComponents();
        
        // Close menu when clicking elsewhere
        document.addEventListener('click', () => this.hideMenu());
        document.addEventListener('contextmenu', (e) => {
            // If not on a custom component, let browser handle it
            const target = e.target as HTMLElement;
            if (!this.isCustomComponent(target)) {
                this.hideMenu();
            }
        });
        
        // Re-scan periodically for lazy-loaded components
        setInterval(() => this.scanExistingComponents(), 2000);
    }

    /**
     * Inject context menu styles
     */
    private injectStyles(): void {
        const styleId = 'nativecore-context-menu-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .nc-context-menu {
                position: fixed;
                background: white;
                border: 1px solid #ccc;
                border-radius: 4px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                padding: 4px 0;
                z-index: 999999;
                min-width: 180px;
                font-family: system-ui, -apple-system, sans-serif;
                font-size: 14px;
            }

            .nc-context-menu-item {
                padding: 8px 16px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: background 0.15s ease;
            }

            .nc-context-menu-item:hover {
                background: #f0f0f0;
            }

            .nc-context-menu-item.devtools {
                border-top: 1px solid #e0e0e0;
                color: #667eea;
                font-weight: 600;
            }

            .nc-context-menu-item.devtools:hover {
                background: #f5f3ff;
            }

            .nc-context-menu-icon {
                width: 16px;
                height: 16px;
                fill: currentColor;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Setup mutation observer
     */
    private setupObserver(): void {
        this.mutationObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        this.processElement(node as HTMLElement);
                        // Process children
                        (node as HTMLElement).querySelectorAll('*').forEach((child) => {
                            this.processElement(child as HTMLElement);
                        });
                    }
                });
            });
        });

        this.mutationObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Scan for existing components
     */
    private scanExistingComponents(): void {
        document.querySelectorAll('*').forEach((element) => {
            this.processElement(element as HTMLElement);
        });
    }

    /**
     * Check if element is a custom component
     */
    private isCustomComponent(element: HTMLElement): boolean {
        const tagName = element.tagName.toLowerCase();
        
        // Must have a hyphen (Web Component requirement)
        if (!tagName.includes('-')) return false;
        
        // Skip dev tools elements
        if (tagName.startsWith('nc-dev')) return false;
        
        // Skip common third-party prefixes
        if (tagName.startsWith('ion-') || tagName.startsWith('mat-')) return false;
        
        // Check if it's a registered custom element OR has shadowRoot
        return customElements.get(tagName) !== undefined || element.shadowRoot !== null;
    }

    /**
     * Process element and add context menu
     */
    private processElement(element: HTMLElement): void {
        if (!this.isCustomComponent(element)) return;
        if (this.observedComponents.has(element)) return;

        // Mark as observed
        this.observedComponents.add(element);
        
        // Add context menu listener
        element.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showMenu(e.clientX, e.clientY, element);
        });
    }

    /**
     * Show context menu
     */
    private showMenu(x: number, y: number, element: HTMLElement): void {
        this.hideMenu();

        const menu = document.createElement('div');
        menu.className = 'nc-context-menu';
        
        // Dev Tools option
        const devToolsItem = document.createElement('div');
        devToolsItem.className = 'nc-context-menu-item devtools';
        devToolsItem.innerHTML = `
            <svg class="nc-context-menu-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
            Edit Component
        `;
        devToolsItem.addEventListener('click', (e) => {
            e.stopPropagation();
            this.hideMenu();
            this.onEdit(element);
        });
        
        menu.appendChild(devToolsItem);
        
        // Position menu
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        
        // Adjust if off-screen
        document.body.appendChild(menu);
        const rect = menu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            menu.style.left = `${window.innerWidth - rect.width - 10}px`;
        }
        if (rect.bottom > window.innerHeight) {
            menu.style.top = `${window.innerHeight - rect.height - 10}px`;
        }
        
        this.activeMenu = menu;
    }

    /**
     * Hide context menu
     */
    private hideMenu(): void {
        if (this.activeMenu) {
            this.activeMenu.remove();
            this.activeMenu = null;
        }
    }

    /**
     * Destroy the context menu system
     */
    destroy(): void {
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
        }
        this.hideMenu();
        document.getElementById('nativecore-context-menu-styles')?.remove();
        this.observedComponents.clear();
    }
}

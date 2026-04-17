/**
 * Outline Panel - DOM Tree View
 * 
 * Shows a collapsible left-side panel with the full DOM tree
 * of the page, including both custom components and regular elements.
 */

export class OutlinePanel {
    private onEdit: (element: HTMLElement, fromOutlineTree?: boolean) => void;
    private panel: HTMLElement | null = null;
    private tab: HTMLElement | null = null;
    private isOpen: boolean = false;
    private isVisible: boolean = true;
    private mutationObserver: MutationObserver | null = null;
    private refreshTimeout: number | null = null;

    constructor(onEdit: (element: HTMLElement, fromOutlineTree?: boolean) => void) {
        this.onEdit = onEdit;
        this.injectStyles();
        this.createPanel();
        // Disable auto-refresh to prevent loops
        // this.setupMutationObserver();
        
        // Listen for current element from editor
        document.addEventListener('nc-current-element-response', (e: Event) => {
            const element = (e as CustomEvent).detail.element;
            if (element && this.isOpen) {
                this.expandToElement(element);
            }
        });
    }

    /**
     * Inject panel styles
     */
    private injectStyles(): void {
        const styleId = 'nativecore-outline-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .nc-outline-panel {
                position: fixed;
                left: 0;
                top: 0;
                height: 100vh;
                min-width: 280px;
                max-width: 600px;
                width: 280px;
                background: #0f1520;
                border-right: 1px solid #3a485b;
                box-shadow: 2px 0 10px rgba(0,0,0,0.3);
                z-index: 999998;
                transition: transform 0.2s ease, width 0.3s ease;
                display: flex;
                flex-direction: column;
            }

            .nc-outline-panel.closed {
                transform: translateX(-100%);
            }

            .nc-outline-tab {
                position: fixed;
                left: 0;
                top: 50%;
                transform: translateY(-50%);
                width: 40px;
                height: 140px;
                background: #182130;
                color: #e7eef7;
                border: 1px solid #3a485b;
                border-left: 0;
                border-radius: 0 12px 12px 0;
                box-shadow: 2px 2px 8px rgba(0,0,0,0.3);
                writing-mode: vertical-rl;
                text-orientation: mixed;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 700;
                font-size: 13px;
                letter-spacing: 2px;
                cursor: pointer;
                transition: all 0.2s ease;
                z-index: 999999;
                opacity: 1;
                pointer-events: auto;
            }

            .nc-outline-tab.hidden {
                opacity: 0;
                pointer-events: none;
                transform: translateY(-50%) translateX(-50px);
            }

            .nc-outline-tab:hover {
                background: #1f2838;
                transform: translateY(-50%) translateX(4px);
            }

            .nc-outline-content {
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                font-family: 'Fira Code', 'Courier New', monospace;
                font-size: 12px;
            }

            .nc-outline-header {
                position: sticky;
                top: 0;
                z-index: 10;
                background: #0f1520;
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px 20px 12px 20px;
                border-bottom: 1px solid #3a485b;
                white-space: nowrap;
                flex-shrink: 0;
            }

            .nc-outline-body {
                flex: 1;
                overflow-y: auto;
                overflow-x: hidden;
                padding: 10px 0;
                scrollbar-width: thin;
                scrollbar-color: #3a485b #0f1520;
            }

            .nc-outline-body::-webkit-scrollbar {
                width: 8px;
            }

            .nc-outline-body::-webkit-scrollbar-track {
                background: #0f1520;
            }

            .nc-outline-body::-webkit-scrollbar-thumb {
                background: #3a485b;
                border-radius: 4px;
                transition: background 0.2s;
            }

            .nc-outline-body::-webkit-scrollbar-thumb:hover {
                background: #4b5e75;
            }

            .nc-outline-title {
                font-size: 14px;
                font-weight: 700;
                color: #e7eef7;
            }

            .nc-outline-close {
                cursor: pointer;
                padding: 4px 8px;
                border-radius: 6px;
                background: transparent;
                color: #6c7a8a;
                transition: all 0.15s;
                font-size: 16px;
            }

            .nc-outline-close:hover {
                background: #182130;
                color: #e7eef7;
            }

            .nc-outline-tree {
                padding: 0 10px;
                width: max-content;
                min-width: 100%;
            }

            .nc-tree-node {
                font-size: 12px;
                padding: 5px 8px;
                border-radius: 6px;
                cursor: pointer;
                margin: 1px 0;
                transition: background 0.15s;
                user-select: none;
                color: #c9d4e0;
                display: flex;
                align-items: center;
                gap: 6px;
                white-space: nowrap;
            }

            .nc-tree-node:hover {
                background: #182130;
                cursor: pointer;
            }

            .nc-tree-node.custom-component {
                background: rgba(102,126,234,0.08);
            }

            .nc-tree-node.custom-component:hover {
                background: rgba(102,126,234,0.15);
                cursor: pointer;
            }

            @media (max-width: 768px) {
                .nc-outline-panel,
                .nc-outline-tab {
                    display: none !important;
                }
            }

            .nc-tree-toggle {
                width: 12px;
                height: 12px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                color: #6c7a8a;
                font-size: 10px;
                flex-shrink: 0;
                transition: transform 0.2s;
            }

            .nc-tree-toggle.collapsed {
                transform: rotate(-90deg);
            }

            .nc-tree-toggle:hover {
                color: #9ad1ff;
            }

            .nc-tree-content {
                display: flex;
                align-items: center;
                gap: 4px;
                flex: 1;
                min-width: 0;
            }

            .nc-tree-children {
                margin-left: 20px;
            }

            .nc-tree-children.hidden {
                display: none;
            }

            .nc-tree-tag {
                color: #9ad1ff;
                font-weight: 600;
            }

            .nc-tree-tag.custom {
                color: #b794f4;
            }

            .nc-tree-attr {
                color: #c9d4e0;
                opacity: 0.7;
                font-size: 11px;
                margin-left: 4px;
            }

            .nc-tree-gear {
                margin-left: 8px;
                width: 14px;
                height: 14px;
                fill: #5cc8ff;
                cursor: pointer;
                opacity: 0.5;
                transition: opacity 0.2s;
                vertical-align: middle;
                display: inline-block;
            }

            .nc-tree-gear:hover {
                opacity: 1;
            }
            
            /* Session Storage Section */
            .nc-storage-section {
                border-top: 1px solid rgba(255,255,255,0.1);
                margin-top: 1rem;
            }
            
            .nc-storage-header {
                padding: 12px 16px;
                display: flex;
                align-items: center;
                gap: 8px;
                cursor: pointer;
                background: rgba(255,255,255,0.03);
                transition: background 0.2s;
            }
            
            .nc-storage-header:hover {
                background: rgba(255,255,255,0.06);
            }
            
            .nc-storage-toggle {
                font-size: 10px;
                color: #5cc8ff;
                transition: transform 0.2s;
                flex-shrink: 0;
            }
            
            .nc-storage-toggle.collapsed {
                transform: rotate(-90deg);
            }
            
            .nc-storage-title {
                color: #fff;
                font-size: 11px;
                font-weight: 600;
                letter-spacing: 0.5px;
                text-transform: uppercase;
            }
            
            .nc-storage-content {
                padding: 8px 16px 16px 16px;
            }
            
            .nc-storage-content.hidden {
                display: none;
            }
            
            .nc-storage-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 12px;
                margin-bottom: 4px;
                background: rgba(255,255,255,0.05);
                border-radius: 4px;
                font-size: 11px;
            }
            
            .nc-storage-key {
                color: #5cc8ff;
                font-family: 'Fira Code', monospace;
                flex: 1;
                word-break: break-all;
            }
            
            .nc-storage-value {
                color: #a0aec0;
                margin-left: 8px;
                flex-shrink: 0;
            }
            
            .nc-storage-delete {
                margin-left: 8px;
                padding: 2px 8px;
                background: rgba(239, 68, 68, 0.2);
                color: #ef4444;
                border: none;
                border-radius: 3px;
                cursor: pointer;
                font-size: 10px;
                transition: background 0.2s;
                flex-shrink: 0;
            }
            
            .nc-storage-delete:hover {
                background: rgba(239, 68, 68, 0.4);
            }
            
            .nc-storage-empty {
                color: #718096;
                font-size: 11px;
                font-style: italic;
                padding: 12px;
            }
            
            .nc-storage-clear-all {
                width: 100%;
                padding: 8px;
                margin-top: 8px;
                background: rgba(239, 68, 68, 0.15);
                color: #ef4444;
                border: 1px solid rgba(239, 68, 68, 0.3);
                border-radius: 4px;
                cursor: pointer;
                font-size: 11px;
                transition: all 0.2s;
            }
            
            .nc-storage-clear-all:hover {
                background: rgba(239, 68, 68, 0.25);
            }
            
            /* Cache Control Section */
            .nc-cache-section {
                border-top: 1px solid rgba(255,255,255,0.1);
            }
            
            .nc-cache-header {
                padding: 12px 16px;
                display: flex;
                align-items: center;
                gap: 8px;
                cursor: pointer;
                background: rgba(255,255,255,0.03);
                transition: background 0.2s;
            }
            
            .nc-cache-header:hover {
                background: rgba(255,255,255,0.06);
            }
            
            .nc-cache-toggle {
                font-size: 10px;
                color: #5cc8ff;
                transition: transform 0.2s;
                flex-shrink: 0;
            }
            
            .nc-cache-toggle.collapsed {
                transform: rotate(-90deg);
            }
            
            .nc-cache-title {
                color: #fff;
                font-size: 11px;
                font-weight: 600;
                letter-spacing: 0.5px;
                text-transform: uppercase;
            }
            
            .nc-cache-content {
                padding: 8px 16px 16px 16px;
            }
            
            .nc-cache-content.hidden {
                display: none;
            }
            
            .nc-cache-button {
                width: 100%;
                padding: 10px;
                margin-bottom: 8px;
                background: rgba(92, 200, 255, 0.15);
                color: #5cc8ff;
                border: 1px solid rgba(92, 200, 255, 0.3);
                border-radius: 4px;
                cursor: pointer;
                font-size: 11px;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }
            
            .nc-cache-button:hover {
                background: rgba(92, 200, 255, 0.25);
            }
            
            .nc-cache-button.danger {
                background: rgba(239, 68, 68, 0.15);
                color: #ef4444;
                border-color: rgba(239, 68, 68, 0.3);
            }
            
            .nc-cache-button.danger:hover {
                background: rgba(239, 68, 68, 0.25);
            }
            
            .nc-cache-info {
                color: #718096;
                font-size: 10px;
                padding: 8px 12px;
                background: rgba(255,255,255,0.03);
                border-radius: 4px;
                margin-bottom: 8px;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Create the panel
     */
    private createPanel(): void {
        // Create tab
        const tab = document.createElement('div');
        tab.className = 'nc-outline-tab';
        tab.textContent = 'OUTLINE';
        tab.addEventListener('click', () => this.togglePanel());
        document.body.appendChild(tab);
        this.tab = tab;

        // Create panel
        const panel = document.createElement('div');
        panel.className = 'nc-outline-panel closed';
        
        const content = document.createElement('div');
        content.className = 'nc-outline-content';
        
        // Header
        const header = document.createElement('div');
        header.className = 'nc-outline-header';
        header.innerHTML = `
            <div class="nc-outline-title">Page Outline</div>
            <div class="nc-outline-close">✕</div>
        `;
        
        header.querySelector('.nc-outline-close')?.addEventListener('click', () => this.togglePanel());
        
        content.appendChild(header);
        
        // Body with tree
        const body = document.createElement('div');
        body.className = 'nc-outline-body';
        
        // Tree container
        const tree = document.createElement('div');
        tree.className = 'nc-outline-tree';
        body.appendChild(tree);
        
        // Cache Control Section
        const cacheSection = this.createCacheSection();
        body.appendChild(cacheSection);
        
        // Session Storage Section
        const sessionStorageSection = this.createStorageSection('session');
        body.appendChild(sessionStorageSection);
        
        // Local Storage Section
        const localStorageSection = this.createStorageSection('local');
        body.appendChild(localStorageSection);
        
        content.appendChild(body);
        panel.appendChild(content);
        document.body.appendChild(panel);
        
        this.panel = panel;
        this.refreshTree();
        this.applyVisibility();
    }

    public setVisible(visible: boolean): void {
        this.isVisible = visible;

        if (!visible && this.isOpen) {
            this.isOpen = false;
            this.panel?.classList.add('closed');
        }

        this.applyVisibility();
    }

    private applyVisibility(): void {
        if (!this.panel || !this.tab) {
            return;
        }

        if (!this.isVisible) {
            this.panel.style.display = 'none';
            this.tab.style.display = 'none';
            return;
        }

        this.panel.style.display = '';
        this.tab.style.display = this.isOpen ? 'none' : '';
    }

    /**
     * Create cache control section
     */
    private createCacheSection(): HTMLElement {
        const section = document.createElement('div');
        section.className = 'nc-cache-section nc-storage-section';
        
        // Header
        const header = document.createElement('div');
        header.className = 'nc-cache-header';
        header.innerHTML = `
            <span class="nc-cache-toggle collapsed">▼</span>
            <span class="nc-cache-title">Cache Control</span>
        `;
        
        // Content
        const content = document.createElement('div');
        content.className = 'nc-cache-content hidden';
        content.innerHTML = `
            <div class="nc-cache-info">
                Clear browser cache to see latest CSS/JS changes
            </div>
        `;
        
        // Hard Refresh Button
        const hardRefreshBtn = document.createElement('button');
        hardRefreshBtn.className = 'nc-cache-button';
        hardRefreshBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
            </svg>
            Hard Refresh (Ctrl+Shift+R)
        `;
        hardRefreshBtn.addEventListener('click', () => {
            location.reload();
        });
        content.appendChild(hardRefreshBtn);
        
        // Clear Cache & Reload Button
        const clearCacheBtn = document.createElement('button');
        clearCacheBtn.className = 'nc-cache-button';
        clearCacheBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            Clear Cache & Reload
        `;
        clearCacheBtn.addEventListener('click', async () => {
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
            }
            location.reload();
        });
        content.appendChild(clearCacheBtn);
        
        // Clear All Data Button
        const clearAllBtn = document.createElement('button');
        clearAllBtn.className = 'nc-cache-button danger';
        clearAllBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
            Clear All Data & Reload
        `;
        clearAllBtn.addEventListener('click', async () => {
            if (confirm('Clear all cache, storage, and reload? This will reset everything.')) {
                // Clear cache
                if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    await Promise.all(cacheNames.map(name => caches.delete(name)));
                }
                // Clear storage
                sessionStorage.clear();
                localStorage.clear();
                // Reload
                location.reload();
            }
        });
        content.appendChild(clearAllBtn);
        
        // Toggle functionality
        header.addEventListener('click', () => {
            const toggle = header.querySelector('.nc-cache-toggle');
            if (content.classList.contains('hidden')) {
                content.classList.remove('hidden');
                toggle?.classList.remove('collapsed');
            } else {
                content.classList.add('hidden');
                toggle?.classList.add('collapsed');
            }
        });
        
        section.appendChild(header);
        section.appendChild(content);
        
        return section;
    }

    /**
     * Create storage management section
     */
    private createStorageSection(type: 'session' | 'local'): HTMLElement {
        const section = document.createElement('div');
        section.className = 'nc-storage-section';
        
        const storageObj = type === 'session' ? sessionStorage : localStorage;
        const title = type === 'session' ? 'Session Storage' : 'Local Storage';
        const contentId = type === 'session' ? 'storageContent' : 'localStorageContent';
        
        // Header
        const header = document.createElement('div');
        header.className = 'nc-storage-header';
        header.innerHTML = `
            <span class="nc-storage-toggle collapsed">▼</span>
            <span class="nc-storage-title">${title}</span>
        `;
        
        // Content
        const content = document.createElement('div');
        content.className = 'nc-storage-content hidden';
        content.id = contentId;
        
        this.refreshStorageContent(content, storageObj);
        
        // Toggle functionality
        header.addEventListener('click', () => {
            const toggle = header.querySelector('.nc-storage-toggle');
            if (content.classList.contains('hidden')) {
                content.classList.remove('hidden');
                toggle?.classList.remove('collapsed');
            } else {
                content.classList.add('hidden');
                toggle?.classList.add('collapsed');
            }
        });
        
        section.appendChild(header);
        section.appendChild(content);
        
        return section;
    }
    
    /**
     * Refresh storage content
     */
    private refreshStorageContent(container: HTMLElement, storageObj: Storage): void {
        container.innerHTML = '';
        
        const items: Array<{key: string, value: string}> = [];
        for (let i = 0; i < storageObj.length; i++) {
            const key = storageObj.key(i);
            if (key) {
                items.push({
                    key,
                    value: storageObj.getItem(key) || ''
                });
            }
        }
        
        if (items.length === 0) {
            container.innerHTML = '<div class="nc-storage-empty">No items in storage</div>';
            return;
        }
        
        items.forEach(({key, value}) => {
            const item = document.createElement('div');
            item.className = 'nc-storage-item';
            
            const keySpan = document.createElement('span');
            keySpan.className = 'nc-storage-key';
            keySpan.textContent = key;
            
            const valueSpan = document.createElement('span');
            valueSpan.className = 'nc-storage-value';
            valueSpan.textContent = value.length > 20 ? value.substring(0, 20) + '...' : value;
            valueSpan.title = value; // Show full value on hover
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'nc-storage-delete';
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', () => {
                storageObj.removeItem(key);
                this.refreshStorageContent(container, storageObj);
            });
            
            item.appendChild(keySpan);
            item.appendChild(valueSpan);
            item.appendChild(deleteBtn);
            container.appendChild(item);
        });
        
        // Add clear all button
        if (items.length > 0) {
            const clearAllBtn = document.createElement('button');
            clearAllBtn.className = 'nc-storage-clear-all';
            clearAllBtn.textContent = `Clear All (${items.length} items)`;
            clearAllBtn.addEventListener('click', () => {
                if (confirm('Clear all items from this storage?')) {
                    storageObj.clear();
                    this.refreshStorageContent(container, storageObj);
                }
            });
            container.appendChild(clearAllBtn);
        }
    }

    /**
     * Toggle panel open/closed
     */
    private togglePanel(): void {
        if (!this.isVisible) {
            return;
        }

        this.isOpen = !this.isOpen;
        const tab = this.tab;
        
        if (this.isOpen) {
            this.panel?.classList.remove('closed');
            tab?.classList.add('hidden');
            this.refreshTree();
            
            // Refresh storage content when opening
            const storageContent = this.panel?.querySelector('#storageContent');
            if (storageContent) {
                this.refreshStorageContent(storageContent as HTMLElement, sessionStorage);
            }
            const localStorageContent = this.panel?.querySelector('#localStorageContent');
            if (localStorageContent) {
                this.refreshStorageContent(localStorageContent as HTMLElement, localStorage);
            }
            
            // Request current element from editor and expand to it
            setTimeout(() => {
                const event = new CustomEvent('nc-request-current-element');
                document.dispatchEvent(event);
            }, 100); // Small delay to ensure tree is rendered
        } else {
            this.panel?.classList.add('closed');
            tab?.classList.remove('hidden');
        }

        this.applyVisibility();
    }

    /**
     * Refresh the tree view
     */
    private refreshTree(): void {
        const tree = this.panel?.querySelector('.nc-outline-tree');
        if (!tree) return;

        tree.innerHTML = '';
        
        // Build tree starting from body itself to show complete DOM
        this.buildTree(document.body, tree as HTMLElement, -1);
    }

    /**
     * Check if element is a dev tool element that should be excluded from tree
     */
    private isDevToolElement(element: Element): boolean {
        const tagName = (element as HTMLElement).tagName?.toLowerCase();
        const classList = (element as HTMLElement).classList;
        const id = (element as HTMLElement).id?.toLowerCase();
        
        // Check tag names
        if (tagName?.startsWith('nc-dev') || 
            tagName?.startsWith('nc-outline') ||
            tagName?.startsWith('nc-editor') ||
            tagName === 'hmr-indicator' ||
            tagName === 'nativecore-denc-indicator') {
            return true;
        }
        
        // Check class names
        if (classList?.contains('nc-denc-overlay') ||
            classList?.contains('nc-editor-overlay') ||
            classList?.contains('nc-editor-modal') ||
            classList?.contains('nc-context-menu') ||
            classList?.contains('nc-component-overlay') ||
            classList?.contains('nc-outline-panel') ||
            classList?.contains('nc-outline-tab') ||
            classList?.contains('hmr-indicator') ||
            classList?.contains('nativecore-denc-indicator')) {
            return true;
        }
        
        // Check IDs
        if (id?.includes('nc-dev') ||
            id?.includes('nc-editor') ||
            id?.includes('nc-outline') ||
            id?.includes('hmr-') ||
            id?.includes('nativecore-dev') ||
            id?.includes('denc-indicator')) {
            return true;
        }
        
        // Check data attributes
        if ((element as HTMLElement).hasAttribute('data-nc-dev') ||
            (element as HTMLElement).hasAttribute('data-denc-tool')) {
            return true;
        }
        
        return false;
    }

    /**
     * Build tree recursively - collapsible nodes
     */
    private buildTree(element: Element, container: HTMLElement, level: number = 0): void {
        // Skip dev tools elements
        if (this.isDevToolElement(element)) {
            return;
        }

        // Skip script, style, noscript, link, meta
        const tagName = element.tagName.toLowerCase();
        if (['script', 'style', 'noscript', 'link', 'meta'].includes(tagName)) {
            return;
        }

        const isCustom = this.isCustomComponent(element as HTMLElement);
        const hasChildren = Array.from(element.children).some(child => {
            const childTag = child.tagName.toLowerCase();
            return !['script', 'style', 'noscript', 'link', 'meta'].includes(childTag) && 
                   !this.isDevToolElement(child);
        });
        
        // Create node wrapper
        const wrapper = document.createElement('div');
        
        // Create node row
        const nodeDiv = document.createElement('div');
        nodeDiv.className = `nc-tree-node ${isCustom ? 'custom-component' : ''}`;
        nodeDiv.style.paddingLeft = `${level * 14 + 8}px`;
        
        // Toggle arrow for nodes with children
        let toggle: HTMLSpanElement | null = null;
        if (hasChildren) {
            toggle = document.createElement('span');
            toggle.className = 'nc-tree-toggle';
            toggle.textContent = '▼';
            nodeDiv.appendChild(toggle);
        } else {
            // Spacer for alignment
            const spacer = document.createElement('span');
            spacer.style.width = '12px';
            spacer.style.display = 'inline-block';
            spacer.style.flexShrink = '0';
            nodeDiv.appendChild(spacer);
        }
        
        // Content wrapper
        const content = document.createElement('div');
        content.className = 'nc-tree-content';
        
        // Build content: <tag> #id .class
        const id = element.id ? `#${element.id}` : '';
        const firstClass = element.classList.length > 0 ? `.${element.classList[0]}` : '';
        
        // Only add gear icon for custom components
        const gearHtml = isCustom ? `
            <svg class="nc-tree-gear" viewBox="0 0 24 24">
                <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
        ` : '';
        
        content.innerHTML = `
            <span class="nc-tree-tag ${isCustom ? 'custom' : ''}">&lt;${tagName}&gt;</span>
            <span class="nc-tree-attr">${id}${firstClass}</span>
            ${gearHtml}
        `;
        
        // Gear icon click (only for custom components)
        if (isCustom) {
            const gear = content.querySelector('.nc-tree-gear');
            gear?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.onEdit(element as HTMLElement, true); // true = from outline tree
            });
        }
        
        nodeDiv.appendChild(content);
        wrapper.appendChild(nodeDiv);
        
        // Children container
        let childrenContainer: HTMLDivElement | null = null;
        if (hasChildren) {
            childrenContainer = document.createElement('div');
            childrenContainer.className = 'nc-tree-children hidden';
            
            // Build children recursively
            Array.from(element.children).forEach(child => {
                this.buildTree(child, childrenContainer!, level + 1);
            });
            
            wrapper.appendChild(childrenContainer);
            
            // Start collapsed by default
            if (toggle) {
                toggle.classList.add('collapsed');
                
                // Toggle functionality - clicking anywhere on the row expands/collapses
                nodeDiv.addEventListener('click', (e) => {
                    // Don't toggle if clicking the gear icon
                    if ((e.target as HTMLElement).closest('.nc-tree-gear')) {
                        return;
                    }
                    
                    e.stopPropagation();
                    const isCollapsed = toggle.classList.contains('collapsed');
                    if (isCollapsed) {
                        toggle.classList.remove('collapsed');
                        childrenContainer!.classList.remove('hidden');
                        // Expand panel width if needed for deep nesting
                        this.adjustPanelWidth();
                    } else {
                        toggle.classList.add('collapsed');
                        childrenContainer!.classList.add('hidden');
                        // Recalculate optimal width
                        this.adjustPanelWidth();
                    }
                });
            }
        }
        
        // Node click to highlight on page (for nodes without children)
        if (!hasChildren) {
            content.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // If this is a regular element (not custom component), close the editor panel
                if (!isCustom) {
                    // Dispatch event to close editor
                    document.dispatchEvent(new CustomEvent('nc-close-editor'));
                }
                
                // Highlight element on page
                (element as HTMLElement).style.outline = '2px solid #5cc8ff';
                (element as HTMLElement).style.outlineOffset = '2px';
                setTimeout(() => {
                    (element as HTMLElement).style.outline = '';
                    (element as HTMLElement).style.outlineOffset = '';
                }, 2000);
            });
        }
        
        container.appendChild(wrapper);
    }

    /**
     * Adjust panel width dynamically based on visible content
     */
    private adjustPanelWidth(): void {
        if (!this.panel) return;
        
        // Find the maximum depth of visible (non-hidden) nodes
        const tree = this.panel.querySelector('.nc-outline-tree');
        if (!tree) return;
        
        let maxDepth = 0;
        const visibleNodes = tree.querySelectorAll('.nc-tree-node');
        
        visibleNodes.forEach(node => {
            const parent = node.parentElement;
            // Check if any ancestor has 'hidden' class
            let current: HTMLElement | null = parent as HTMLElement;
            let isVisible = true;
            
            while (current && current !== tree) {
                if (current.classList?.contains('hidden')) {
                    isVisible = false;
                    break;
                }
                current = current.parentElement;
            }
            
            if (isVisible) {
                const paddingLeft = parseInt((node as HTMLElement).style.paddingLeft || '0');
                maxDepth = Math.max(maxDepth, paddingLeft);
            }
        });
        
        // Calculate optimal width: base + depth padding + buffer for gear icon
        const optimalWidth = Math.max(280, Math.min(600, 260 + maxDepth + 100));
        this.panel.style.width = `${optimalWidth}px`;
    }

    /**
     * Check if element is a custom component
     */
    private isCustomComponent(element: HTMLElement): boolean {
        const tagName = element.tagName.toLowerCase();
        return tagName.includes('-') && 
               !tagName.startsWith('nc-dev') && 
               !tagName.startsWith('ion-') && 
               !tagName.startsWith('mat-');
    }

    /**
     * Setup mutation observer to refresh tree on DOM changes
     */
    private setupMutationObserver(): void {
        this.mutationObserver = new MutationObserver((mutations) => {
            // Ignore mutations inside the outline panel itself
            const isOutlineChange = mutations.some(mutation => {
                const target = mutation.target as HTMLElement;
                return target.closest('.nc-outline-panel') || 
                       target.classList?.contains('nc-outline-panel') ||
                       target.classList?.contains('nc-outline-tab');
            });
            
            if (isOutlineChange) return;
            
            // Throttle refreshes
            if (this.isOpen && !this.refreshTimeout) {
                this.refreshTimeout = window.setTimeout(() => {
                    this.refreshTree();
                    this.refreshTimeout = null;
                }, 500);
            }
        });

        this.mutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'id']
        });
    }

    /**
     * Expand tree to show a specific element
     */
    /**
     * Expand the outline tree to show a specific element
     * Public method to be called when gear icon is clicked
     */
    public expandToElement(targetElement: HTMLElement): void {
        console.log('[OutlinePanel] Expanding to element:', targetElement.tagName);
        
        // Find all parent elements up to body
        const parents: Element[] = [];
        let current: Element | null = targetElement;
        
        while (current && current !== document.body) {
            parents.unshift(current);
            current = current.parentElement;
        }
        
        console.log('[OutlinePanel] Parents to expand:', parents.map(p => p.tagName));
        
        // Build a path of indices to identify the exact element
        const pathIndices: number[] = [];
        let elem: Element | null = targetElement;
        while (elem && elem !== document.body) {
            const parent = elem.parentElement;
            if (parent) {
                const siblings = Array.from(parent.children).filter(child => 
                    child.tagName === elem!.tagName
                );
                pathIndices.unshift(siblings.indexOf(elem));
            }
            elem = parent;
        }
        
        console.log('[OutlinePanel] Path indices:', pathIndices);
        
        // Expand each parent node in the tree
        parents.forEach((parent, _parentIndex) => {
            // Find the tree node for this element
            const treeNodes = this.panel?.querySelectorAll('.nc-tree-node');
            if (!treeNodes) {
                console.log('[OutlinePanel] No tree nodes found');
                return;
            }
            
            let matchCount = 0;
            treeNodes.forEach(node => {
                const content = node.querySelector('.nc-tree-content');
                if (!content) return;
                
                const tagSpan = content.querySelector('.nc-tree-tag');
                if (!tagSpan) return;
                
                const tagName = tagSpan.textContent?.replace(/[<>]/g, '') || '';
                const nodeId = content.querySelector('.nc-tree-attr')?.textContent?.match(/#([\w-]+)/)?.[1];
                const nodeClass = content.querySelector('.nc-tree-attr')?.textContent?.match(/\.([\w-]+)/)?.[1];
                
                // Check if this node matches the parent element
                const tagMatches = parent.tagName.toLowerCase() === tagName;
                const idMatches = !nodeId || !parent.id || parent.id === nodeId;
                const classMatches = !nodeClass || parent.classList.contains(nodeClass);
                
                const matches = tagMatches && idMatches && classMatches;
                
                if (matches) {
                    matchCount++;
                    console.log(`[OutlinePanel] Matched node for ${parent.tagName}:`, {tagName, nodeId, nodeClass});
                    
                    // Expand this node's children
                    const toggle = node.querySelector('.nc-tree-toggle');
                    const wrapper = node.parentElement;
                    const childrenContainer = wrapper?.querySelector('.nc-tree-children');
                    
                    if (toggle && childrenContainer) {
                        toggle.classList.remove('collapsed');
                        childrenContainer.classList.remove('hidden');
                        console.log('[OutlinePanel] Expanded node');
                    }
                    
                    // If this is the target element, highlight and scroll to it
                    if (parent === targetElement) {
                        console.log('[OutlinePanel] Highlighting target element');
                        (node as HTMLElement).style.backgroundColor = 'rgba(92, 200, 255, 0.2)';
                        node.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        
                        // Remove highlight after a moment
                        setTimeout(() => {
                            (node as HTMLElement).style.backgroundColor = '';
                        }, 2000);
                    }
                }
            });
            
            if (matchCount === 0) {
                console.log(`[OutlinePanel] No matches found for ${parent.tagName}`);
            }
        });
        
        // Adjust panel width after expanding to accommodate the new depth
        this.adjustPanelWidth();
    }

    /**
     * Show the outline panel and expand to a specific element
     * Public method to be called when gear icon is clicked
     */
    public showAndExpandTo(element: HTMLElement): void {
        if (!this.isVisible) {
            return;
        }

        // Open the panel if it's closed
        if (!this.isOpen) {
            this.togglePanel();
            // Wait longer for panel animation and tree rendering
            setTimeout(() => {
                this.expandToElement(element);
            }, 250);
        } else {
            // Panel is already open, refresh tree and expand
            this.refreshTree();
            setTimeout(() => {
                this.expandToElement(element);
            }, 100);
        }
    }

    /**
     * Destroy the panel
     */
    destroy(): void {
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
        }
        this.panel?.remove();
        this.tab?.remove();
        this.tab = null;
        document.getElementById('nativecore-outline-styles')?.remove();
    }
}

/**
 * Component Editor Drawer
 *
 * Right-side sliding drawer that dynamically displays
 * only the properties that exist in the component's source.
 */
import { dom } from '@core-utils/dom.js';
export class ComponentEditor {
    drawer = null;
    currentElement = null;
    currentMetadata = null;
    originalStyles = new Map();
    originalAttributes = new Map();
    componentSnapshot = null;
    constructor() {
        this.injectStyles();
        this.createDrawer();
    }
    injectStyles() {
        const styleId = 'nativecore-editor-styles';
        if ((window.dom?.query?.(`#${styleId}`) || document.getElementById(styleId)))
            return;
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .nc-editor-overlay {
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                z-index: 1000000;
                background: rgba(0, 0, 0, 0.15);
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.3s ease;
            }
            .nc-editor-overlay.active { 
                opacity: 1;
                visibility: visible;
            }
            .nc-editor-drawer {
                position: fixed;
                top: 0;
                right: 0;
                width: 400px;
                height: 100vh;
                background: #1e1e2e;
                box-shadow: -4px 0 24px rgba(0,0,0,0.3);
                display: flex;
                flex-direction: column;
                color: #cdd6f4;
                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                font-size: 11px;
                transform: translateX(100%);
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                pointer-events: auto;
            }
            .nc-editor-overlay.active .nc-editor-drawer {
                transform: translateX(0);
            }
            .nc-editor-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 16px 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                flex-shrink: 0;
                gap: 8px;
            }
            .nc-editor-title { 
                font-size: 14px; 
                font-weight: 600;
                flex: 1;
            }
            .nc-editor-file-path {
                font-size: 10px;
                font-weight: 400;
                color: rgba(255, 255, 255, 0.7);
                font-family: 'Fira Code', monospace;
                margin-top: 4px;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .nc-editor-file-path a {
                color: rgba(255, 255, 255, 0.9);
                text-decoration: none;
                transition: color 0.2s;
            }
            .nc-editor-file-path a:hover {
                color: white;
                text-decoration: underline;
            }
            .nc-editor-header-actions {
                display: flex;
                gap: 6px;
            }
            .nc-editor-icon-btn {
                background: rgba(255, 255, 255, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.3);
                color: white;
                width: 28px;
                height: 28px;
                border-radius: 4px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
                transition: all 0.2s;
            }
            .nc-editor-icon-btn:hover {
                background: rgba(255, 255, 255, 0.3);
            }
            .nc-editor-btn-danger {
                background: rgba(239, 68, 68, 0.2) !important;
                border-color: rgba(239, 68, 68, 0.4) !important;
            }
            .nc-editor-btn-danger:hover {
                background: rgba(239, 68, 68, 0.4) !important;
            }
            .nc-editor-btn-danger:disabled {
                opacity: 0.3;
                cursor: not-allowed;
            }
            .nc-editor-title code {
                background: rgba(255,255,255,0.2);
                padding: 3px 8px;
                border-radius: 4px;
                font-size: 12px;
                margin-left: 6px;
            }
            .nc-editor-mode-selector {
                display: flex;
                flex-direction: column;
                gap: 4px;
                padding: 16px 20px 12px 20px;
                background: #181825;
                border-bottom: 1px solid #313244;
            }
            .nc-editor-mode-label {
                font-size: 10px;
                color: #cdd6f4;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .nc-editor-mode-select {
                background: #313244;
                border: 1px solid #45475a;
                border-radius: 6px;
                padding: 8px 10px;
                color: #cdd6f4;
                font-size: 11px;
                cursor: pointer;
                outline: none;
            }
            .nc-editor-mode-select:focus {
                border-color: #89b4fa;
            }
            .nc-editor-mode-description {
                font-size: 10px;
                color: #cdd6f4;
                line-height: 1.4;
                margin-top: 4px;
            }
            .nc-editor-close {
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                width: 28px; 
                height: 28px;
                border-radius: 6px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                font-weight: 300;
                transition: background 0.2s;
            }
            .nc-editor-close:hover { background: rgba(255,255,255,0.3); }
            .nc-editor-body {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
            }
            .nc-editor-body::-webkit-scrollbar {
                width: 8px;
            }
            .nc-editor-body::-webkit-scrollbar-track {
                background: #181825;
            }
            .nc-editor-body::-webkit-scrollbar-thumb {
                background: #45475a;
                border-radius: 4px;
            }
            .nc-editor-body::-webkit-scrollbar-thumb:hover {
                background: #585b70;
            }
            .nc-editor-empty {
                text-align: center;
                padding: 40px 20px;
                color: #6c7086;
            }
            .nc-editor-section {
                margin-bottom: 16px;
                background: #181825;
                border-radius: 8px;
                overflow: hidden;
                border: 1px solid #313244;
            }
            .nc-editor-section-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px 16px;
                cursor: pointer;
                user-select: none;
            }
            .nc-editor-section-header:hover { background: rgba(255,255,255,0.03); }
            .nc-editor-section-title {
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: #a6adc8;
            }
            .nc-editor-section-count {
                font-size: 10px;
                background: #313244;
                padding: 2px 8px;
                border-radius: 10px;
                color: #6c7086;
            }
            .nc-editor-section-toggle {
                width: 14px; 
                height: 14px;
                fill: #6c7086;
                transition: transform 0.2s;
            }
            .nc-editor-section.collapsed .nc-editor-section-toggle { transform: rotate(-90deg); }
            .nc-editor-section-content { padding: 12px 16px 16px; }
            .nc-editor-section.collapsed .nc-editor-section-content { display: none; }
            .nc-editor-field {
                display: flex;
                flex-direction: column;
                gap: 6px;
                margin-bottom: 12px;
            }
            .nc-editor-field:last-child { margin-bottom: 0; }
            .nc-editor-label {
                font-size: 10px;
                color: #bac2de;
                font-weight: 500;
                font-family: 'Fira Code', monospace;
            }
            .nc-editor-input {
                background: #313244;
                border: 1px solid #45475a;
                border: 1px solid #45475a;
                border-radius: 6px;
                padding: 8px 10px;
                color: #cdd6f4;
                font-size: 11px;
                width: 100%;
            }
            .nc-editor-input:focus { 
                outline: none; 
                border-color: #89b4fa;
                background: #3a3d52;
            }
            .nc-editor-select {
                cursor: pointer;
            }
            .nc-editor-select option {
                background: #313244;
                color: #cdd6f4;
            }
            .nc-editor-slider-group {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            .nc-editor-slider-wrapper {
                display: flex;
                gap: 8px;
                align-items: center;
            }
            .nc-editor-slider {
                flex: 1;
            }
            .nc-editor-slider-value {
                background: #313244;
                border: 1px solid #45475a;
                border-radius: 4px;
                padding: 4px 8px;
                color: #cdd6f4;
                font-size: 11px;
                min-width: 50px;
                text-align: center;
            }
            .nc-editor-color-wrap {
                display: flex;
                gap: 8px;
                align-items: center;
            }
            .nc-editor-color-wrap input[type="color"] {
                width: 40px; 
                height: 36px;
                border: 1px solid #45475a; 
                border-radius: 6px;
                cursor: pointer; 
                padding: 0;
            }
            .nc-editor-footer {
                display: flex;
                justify-content: flex-end;
                padding: 16px 20px;
                background: #181825;
                border-top: 1px solid #313244;
                gap: 10px;
                flex-shrink: 0;
            }
            .nc-editor-btn {
                padding: 8px 16px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 600;
                cursor: pointer;
                border: none;
                transition: all 0.2s;
            }
            .nc-editor-btn-secondary { 
                background: #313244; 
                color: #cdd6f4; 
            }
            .nc-editor-btn-secondary:hover { background: #45475a; }
            .nc-editor-footer {
                position: sticky;
                bottom: 0;
                left: 0;
                right: 0;
                display: flex;
                justify-content: flex-end;
                gap: 8px;
                padding: 16px 20px;
                background: #1e1e2e;
                border-top: 1px solid #313244;
                flex-shrink: 0;
                z-index: 10;
                box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.2);
            }
            .nc-editor-btn {
                padding: 8px 16px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 600;
                cursor: pointer;
                border: none;
                transition: all 0.2s;
            }
            .nc-editor-btn-primary {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }
            .nc-editor-btn-primary:hover { 
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                transform: translateY(-1px);
            }
            input[type="range"] {
                height: 6px;
                -webkit-appearance: none;
                background: #45475a;
                border-radius: 3px;
                width: 100%;
            }
            input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 16px; 
                height: 16px;
                background: #667eea;
                border-radius: 50%;
                cursor: pointer;
            }
            .nc-editor-checkbox {
                width: 18px; 
                height: 18px;
                accent-color: #667eea;
                cursor: pointer;
            }
            
            /* Confirmation Modal */
            .nc-editor-modal {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(4px);
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 1000002;
                animation: fadeIn 0.15s ease;
            }
            .nc-editor-modal.active {
                display: flex;
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            .nc-editor-modal-content {
                background: #1e1e2e;
                border-radius: 12px;
                width: 90%;
                max-width: 420px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                border: 1px solid #313244;
                animation: slideUp 0.2s ease;
            }
            @keyframes slideUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            .nc-editor-modal-header {
                padding: 20px;
                border-radius: 12px 12px 0 0;
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .nc-editor-modal-icon {
                width: 32px;
                height: 32px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
            }
            .nc-editor-modal-title {
                font-size: 16px;
                font-weight: 600;
                color: white;
            }
            .nc-editor-modal-body {
                padding: 24px;
                color: #cdd6f4;
                line-height: 1.6;
            }
            .nc-editor-modal-component {
                font-family: 'Fira Code', monospace;
                background: #181825;
                padding: 8px 12px;
                border-radius: 6px;
                color: #89b4fa;
                margin: 12px 0;
                border: 1px solid #313244;
            }
            .nc-editor-modal-footer {
                padding: 16px 24px;
                display: flex;
                gap: 12px;
                justify-content: flex-end;
                border-top: 1px solid #313244;
            }
            .nc-editor-modal-btn {
                padding: 10px 20px;
                border-radius: 8px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                border: none;
                transition: all 0.2s;
            }
            .nc-editor-modal-btn-cancel {
                background: #313244;
                color: #cdd6f4;
            }
            .nc-editor-modal-btn-cancel:hover {
                background: #45475a;
            }
            .nc-editor-modal-btn-delete {
                background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);
                color: white;
            }
            .nc-editor-modal-btn-delete:hover {
                box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
                transform: translateY(-1px);
            }
        `;
        document.head.appendChild(style);
    }
    createDrawer() {
        this.drawer = document.createElement('div');
        this.drawer.className = 'nc-editor-overlay';
        this.drawer.innerHTML = `
            <div class="nc-editor-drawer" id="ncEditorDrawer">
                <div class="nc-editor-header">
                    <div style="flex: 1;">
                        <div class="nc-editor-title">Edit Component<code id="ncEditorTagName"></code></div>
                        <div class="nc-editor-file-path" id="ncEditorFilePath"></div>
                    </div>
                    <div class="nc-editor-header-actions">
                        <button class="nc-editor-icon-btn" id="ncEditorCopy" title="Copy Component Values">📋</button>
                        <button class="nc-editor-icon-btn" id="ncEditorPaste" title="Paste Component Values">📄</button>
                        <button class="nc-editor-icon-btn" id="ncEditorReset" title="Reset to Default">↺</button>
                        <button class="nc-editor-icon-btn nc-editor-btn-danger" id="ncEditorDelete" title="Delete Instance">🗑️</button>
                        <button class="nc-editor-icon-btn" id="ncEditorCloseBtn" title="Close" style="margin-left: 8px;">✕</button>
                    </div>
                </div>
                <div class="nc-editor-body" id="ncEditorContent"></div>
                <div class="nc-editor-footer">
                    <button class="nc-editor-btn nc-editor-btn-secondary" id="ncEditorClose">Close</button>
                    <button class="nc-editor-btn nc-editor-btn-primary" id="ncEditorSave">Apply Changes</button>
                </div>
            </div>
        `;
        this.drawer.querySelector('#ncEditorClose')?.addEventListener('click', () => this.close());
        this.drawer.querySelector('#ncEditorCloseBtn')?.addEventListener('click', () => this.close());
        this.drawer.querySelector('#ncEditorSave')?.addEventListener('click', () => this.save());
        this.drawer.querySelector('#ncEditorCopy')?.addEventListener('click', () => this.copyValues());
        this.drawer.querySelector('#ncEditorPaste')?.addEventListener('click', () => this.pasteValues());
        this.drawer.querySelector('#ncEditorReset')?.addEventListener('click', () => this.resetToDefault());
        this.drawer.querySelector('#ncEditorDelete')?.addEventListener('click', () => this.deleteInstance());
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.drawer?.classList.contains('active'))
                this.close();
        });
        // Listen for close editor event from outline panel
        document.addEventListener('nc-close-editor', () => {
            if (this.drawer?.classList.contains('active')) {
                this.close();
            }
        });
        // Listen for requests for current element from outline panel
        document.addEventListener('nc-request-current-element', () => {
            if (this.currentElement) {
                document.dispatchEvent(new CustomEvent('nc-current-element-response', {
                    detail: { element: this.currentElement }
                }));
            }
        });
        document.body.appendChild(this.drawer);
        // Create confirmation modal
        this.createConfirmModal();
    }
    createConfirmModal() {
        const modal = document.createElement('div');
        modal.className = 'nc-editor-modal';
        modal.id = 'ncEditorModal';
        modal.innerHTML = `
            <div class="nc-editor-modal-content">
                <div class="nc-editor-modal-header">
                    <div class="nc-editor-modal-icon">🗑️</div>
                    <div class="nc-editor-modal-title">Delete Component Instance</div>
                </div>
                <div class="nc-editor-modal-body">
                    <p>Are you sure you want to delete this component instance?</p>
                    <div class="nc-editor-modal-component" id="ncModalComponentName"></div>
                    <p style="color: #ef4444; font-size: 12px; margin-top: 16px;">
                        ⚠️ This will permanently remove it from the HTML file. This action cannot be undone.
                    </p>
                </div>
                <div class="nc-editor-modal-footer">
                    <button class="nc-editor-modal-btn nc-editor-modal-btn-cancel" id="ncModalCancel">Cancel</button>
                    <button class="nc-editor-modal-btn nc-editor-modal-btn-delete" id="ncModalConfirm">Delete</button>
                </div>
            </div>
        `;
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
        document.body.appendChild(modal);
    }
    showConfirmModal(componentName) {
        return new Promise((resolve) => {
            const modal = document.getElementById('ncEditorModal');
            const nameEl = document.getElementById('ncModalComponentName');
            const cancelBtn = document.getElementById('ncModalCancel');
            const confirmBtn = document.getElementById('ncModalConfirm');
            if (!modal || !nameEl || !cancelBtn || !confirmBtn) {
                resolve(false);
                return;
            }
            nameEl.textContent = `<${componentName}>`;
            modal.classList.add('active');
            const cleanup = () => {
                modal.classList.remove('active');
                cancelBtn.removeEventListener('click', handleCancel);
                confirmBtn.removeEventListener('click', handleConfirm);
                document.removeEventListener('keydown', handleEscape);
            };
            const handleCancel = () => {
                cleanup();
                resolve(false);
            };
            const handleConfirm = () => {
                cleanup();
                resolve(true);
            };
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    handleCancel();
                }
            };
            cancelBtn.addEventListener('click', handleCancel);
            confirmBtn.addEventListener('click', handleConfirm);
            document.addEventListener('keydown', handleEscape);
        });
    }
    /**
     * Copy component values to clipboard (Unity-like)
     */
    copyValues() {
        if (!this.currentElement || !this.currentMetadata)
            return;
        const snapshot = {
            tagName: this.currentMetadata.tagName,
            attributes: {},
            styles: {}
        };
        // Copy attributes
        this.currentMetadata.attributes?.forEach(attr => {
            const value = this.currentElement.getAttribute(attr.name);
            if (value !== null) {
                snapshot.attributes[attr.name] = value;
            }
        });
        // Copy inline styles
        const styleProps = ['color', 'backgroundColor', 'padding', 'margin', 'borderRadius',
            'borderWidth', 'borderColor', 'fontSize', 'width', 'height'];
        styleProps.forEach(prop => {
            const value = this.currentElement.style[prop];
            if (value) {
                snapshot.styles[prop] = value;
            }
        });
        this.componentSnapshot = snapshot;
        this.showToast('Values copied to clipboard');
    }
    /**
     * Paste component values (Unity-like)
     */
    pasteValues() {
        if (!this.componentSnapshot || !this.currentElement) {
            this.showToast('No values to paste', 'warning');
            return;
        }
        // Apply attributes
        for (const [key, value] of Object.entries(this.componentSnapshot.attributes || {})) {
            this.currentElement.setAttribute(key, value);
        }
        // Apply styles
        for (const [key, value] of Object.entries(this.componentSnapshot.styles || {})) {
            this.currentElement.style[key] = value;
        }
        this.showToast('Values pasted successfully');
    }
    /**
     * Reset component to default values (Unity-like)
     */
    resetToDefault() {
        if (!this.currentElement || !this.currentMetadata)
            return;
        // Reset attributes to original values
        this.originalAttributes.forEach((value, key) => {
            if (value) {
                this.currentElement.setAttribute(key, value);
            }
            else {
                this.currentElement.removeAttribute(key);
            }
        });
        // Reset styles to original values
        this.originalStyles.forEach((value, key) => {
            if (value) {
                this.currentElement.style[key] = value;
            }
            else {
                this.currentElement.style[key] = '';
            }
        });
        this.showToast('Reset to default values');
        // Refresh the editor UI
        this.close();
        setTimeout(() => this.open(this.currentElement, this.currentMetadata), 100);
    }
    /**
     * Show toast notification
     */
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'warning' ? '#f59e0b' : '#ef4444'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            z-index: 1000003;
            animation: slideIn 0.3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
    /**
     * Delete component instance from HTML (Instance mode only)
     */
    async deleteInstance() {
        if (!this.currentElement || !this.currentMetadata)
            return;
        const tagName = this.currentMetadata.tagName;
        // Show custom confirmation modal
        const confirmed = await this.showConfirmModal(tagName);
        if (!confirmed)
            return;
        try {
            const viewPath = window.location.pathname.replace(/^\//, '');
            const htmlPath = viewPath === '' ? 'views/public/home.html' : `views/${viewPath}.html`;
            const response = await fetch('/api/dev/component/delete-instance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tagName,
                    htmlPath: `src/${htmlPath}`,
                    outerHTML: this.currentElement.outerHTML
                })
            });
            const result = await response.json();
            if (result.success) {
                this.showToast('Instance deleted successfully');
                this.currentElement.remove();
                this.close();
            }
            else {
                this.showToast(result.error || 'Failed to delete instance', 'error');
            }
        }
        catch (error) {
            console.error('[DevTools] Delete failed:', error);
            this.showToast('Delete failed', 'error');
        }
    }
    open(element, metadata) {
        if (!this.drawer)
            return;
        // Clean up previous element's outline before switching to new element
        if (this.currentElement && this.currentElement !== element) {
            this.currentElement.style.outline = '';
            this.currentElement.style.outlineOffset = '';
        }
        this.currentElement = element;
        this.currentMetadata = metadata;
        this.originalStyles.clear();
        this.originalAttributes.clear();
        // Store original attribute values
        metadata.attributes?.forEach(attr => {
            const currentValue = element.getAttribute(attr.name);
            this.originalAttributes.set(attr.name, currentValue || '');
        });
        const tagNameEl = this.drawer.querySelector('#ncEditorTagName');
        if (tagNameEl)
            tagNameEl.textContent = `<${metadata.tagName}>`;
        // Display file path
        const filePathEl = this.drawer.querySelector('#ncEditorFilePath');
        if (filePathEl && metadata.filePath) {
            filePathEl.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                    <polyline points="13 2 13 9 20 9"></polyline>
                </svg>
                <span>${metadata.filePath}</span>
            `;
        }
        const contentEl = this.drawer.querySelector('#ncEditorContent');
        if (contentEl) {
            contentEl.innerHTML = this.buildDynamicContent(element, metadata);
            this.attachListeners(contentEl, element);
        }
        this.drawer.classList.add('active');
        element.style.outline = '2px dashed rgba(102, 126, 234, 0.6)';
        element.style.outlineOffset = '4px';
    }
    buildDynamicContent(element, meta) {
        const chevron = '<svg class="nc-editor-section-toggle" viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>';
        let html = '';
        let sectionCount = 0;
        // Element Properties section
        sectionCount++;
        const elementId = element.getAttribute('id') || '';
        const elementClass = element.getAttribute('class') || '';
        html += this.buildSection('Element Properties', 2, chevron, sectionCount === 1, `
            <div class="nc-editor-field">
                <label class="nc-editor-label">id</label>
                <input type="text" class="nc-editor-input" data-attr="id" value="${elementId}" placeholder="element-id">
            </div>
            <div class="nc-editor-field">
                <label class="nc-editor-label">class</label>
                <input type="text" class="nc-editor-input" data-attr="class" value="${elementClass}" placeholder="class-names">
            </div>
        `);
        // Attributes section
        if (meta.attributes && meta.attributes.length > 0) {
            // Filter attributes based on conditions if they exist
            const componentClass = element.constructor;
            const conditions = componentClass.attributeConditions || {};
            const visibleAttributes = meta.attributes.filter(attr => {
                // If there's a condition for this attribute, check it
                if (conditions[attr.name]) {
                    return conditions[attr.name](element);
                }
                // If no condition, always show
                return true;
            });
            if (visibleAttributes.length > 0) {
                sectionCount++;
                html += this.buildSection('Attributes', visibleAttributes.length, chevron, sectionCount === 1, visibleAttributes.map(attr => this.buildAttributeField(element, attr)).join(''));
            }
        }
        // CSS Variables section
        if (meta.cssVariables && meta.cssVariables.length > 0) {
            sectionCount++;
            html += this.buildSection('CSS Variables', meta.cssVariables.length, chevron, sectionCount === 1, meta.cssVariables.map(v => this.buildCssVarField(element, v)).join(''));
        }
        // Host Styles section
        if (meta.hostStyles && meta.hostStyles.length > 0) {
            sectionCount++;
            html += this.buildSection('Host Styles', meta.hostStyles.length, chevron, sectionCount === 1, meta.hostStyles.map(s => this.buildHostStyleField(element, s)).join(''));
        }
        // Common styles section (always show for quick edits)
        sectionCount++;
        const cs = getComputedStyle(element);
        html += this.buildSection('Quick Styles', 4, chevron, sectionCount === 1 && html === '', `
            ${this.buildStyleField('color', 'color', cs.color)}
            ${this.buildStyleField('backgroundColor', 'bg-color', cs.backgroundColor)}
            ${this.buildStyleField('padding', 'padding', cs.padding)}
            ${this.buildStyleField('borderRadius', 'radius', cs.borderRadius)}
        `);
        // Nested Components section — scan shadow root for custom elements
        const shadowRoot = element.shadowRoot;
        if (shadowRoot) {
            const nested = Array.from(shadowRoot.querySelectorAll('*'))
                .filter(el => el.tagName.includes('-') && customElements.get(el.tagName.toLowerCase()))
                .reduce((acc, el) => {
                if (!acc.find(e => e.tagName === el.tagName))
                    acc.push(el);
                return acc;
            }, []);
            if (nested.length > 0) {
                sectionCount++;
                const nestedItems = nested.map(el => `
                    <div class="nc-editor-nested-item" data-nested-tag="${el.tagName.toLowerCase()}">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg>
                        <span>&lt;${el.tagName.toLowerCase()}&gt;</span>
                        <svg class="nc-editor-nested-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
                    </div>
                `).join('');
                html += this.buildSection('Nested Components', nested.length, chevron, false, `
                    <style>
                        .nc-editor-nested-item {
                            display: flex; align-items: center; gap: 8px;
                            padding: 8px 12px; cursor: pointer; border-radius: 6px;
                            color: #a6adc8; font-size: 12px; font-family: monospace;
                            transition: background 0.15s, color 0.15s;
                        }
                        .nc-editor-nested-item:hover { background: rgba(137,180,250,0.1); color: #89b4fa; }
                        .nc-editor-nested-arrow { margin-left: auto; opacity: 0.5; }
                    </style>
                    ${nestedItems}
                `);
            }
        }
        if (html === '') {
            html = '<div class="nc-editor-empty">No editable properties found</div>';
        }
        return html;
    }
    buildSection(title, count, chevron, expanded, content) {
        return `
            <div class="nc-editor-section ${expanded ? '' : 'collapsed'}">
                <div class="nc-editor-section-header">
                    <span class="nc-editor-section-title">${title}</span>
                    <span class="nc-editor-section-count">${count}</span>
                    ${chevron}
                </div>
                <div class="nc-editor-section-content">${content}</div>
            </div>
        `;
    }
    buildAttributeField(element, attr) {
        const currentValue = element.getAttribute(attr.name) || attr.defaultValue || '';
        if (attr.type === 'boolean') {
            const checked = element.hasAttribute(attr.name) ? 'checked' : '';
            return `<div class="nc-editor-field">
                <label class="nc-editor-label">${attr.name}</label>
                <input type="checkbox" class="nc-editor-checkbox" data-attr="${attr.name}" ${checked}>
            </div>`;
        }
        if (attr.type === 'number') {
            // Slider for numbers with visual value display
            const numValue = parseInt(currentValue) || 0;
            return `<div class="nc-editor-field">
                <label class="nc-editor-label">${attr.name}</label>
                <div class="nc-editor-slider-group">
                    <div class="nc-editor-slider-wrapper">
                        <input type="range" class="nc-editor-input nc-editor-slider" 
                               data-attr="${attr.name}" 
                               data-attr-type="number-slider"
                               value="${numValue}" 
                               min="0" max="100" step="1">
                        <span class="nc-editor-slider-value" data-slider-display="${attr.name}">${numValue}</span>
                    </div>
                    <input type="number" class="nc-editor-input" 
                           data-attr="${attr.name}" 
                           data-attr-type="number-input"
                           value="${numValue}" 
                           style="margin-top: 4px;">
                </div>
            </div>`;
        }
        // Variant dropdown
        if (attr.type === 'variant' && attr.variantOptions && attr.variantOptions.length > 0) {
            const emptyOption = `<option value="" ${!currentValue ? 'selected' : ''}>(none)</option>`;
            const options = attr.variantOptions.map(opt => `<option value="${opt}" ${opt === currentValue ? 'selected' : ''}>${opt}</option>`).join('');
            return `<div class="nc-editor-field">
                <label class="nc-editor-label">${attr.name}</label>
                <select class="nc-editor-input nc-editor-select" data-attr="${attr.name}">
                    ${emptyOption}
                    ${options}
                </select>
            </div>`;
        }
        // Color attribute detection
        if (attr.name.includes('color') || attr.name.includes('bg')) {
            return `<div class="nc-editor-field">
                <label class="nc-editor-label">${attr.name}</label>
                <div class="nc-editor-color-wrap">
                    <input type="color" data-attr="${attr.name}" value="${currentValue || '#000000'}">
                    <input type="text" class="nc-editor-input" data-attr-text="${attr.name}" value="${currentValue}">
                </div>
            </div>`;
        }
        // Get placeholder from component's static attributePlaceholders property
        const componentClass = element.constructor;
        const placeholder = componentClass.attributePlaceholders?.[attr.name] || '';
        return `<div class="nc-editor-field">
            <label class="nc-editor-label">${attr.name}</label>
            <input type="text" class="nc-editor-input" data-attr="${attr.name}" value="${currentValue}" placeholder="${placeholder}">
        </div>`;
    }
    buildCssVarField(element, cssVar) {
        const isColor = cssVar.name.includes('color') || cssVar.defaultValue.startsWith('#') || cssVar.defaultValue.startsWith('rgb');
        if (isColor) {
            const hex = this.rgbToHex(cssVar.defaultValue);
            return `<div class="nc-editor-field">
                <span class="nc-editor-label">${cssVar.name.replace('--', '')}</span>
                <div class="nc-editor-color-wrap">
                    <input type="color" data-cssvar="${cssVar.name}" value="${hex}">
                    <input type="text" class="nc-editor-input" data-cssvar-text="${cssVar.name}" value="${cssVar.defaultValue}">
                </div>
            </div>`;
        }
        return `<div class="nc-editor-field">
            <span class="nc-editor-label">${cssVar.name.replace('--', '')}</span>
            <input type="text" class="nc-editor-input" data-cssvar="${cssVar.name}" value="${cssVar.defaultValue}">
        </div>`;
    }
    buildHostStyleField(element, style) {
        const isColor = style.property.includes('color') || style.value.startsWith('#') || style.value.startsWith('rgb');
        if (isColor) {
            const hex = this.rgbToHex(style.value);
            return `<div class="nc-editor-field">
                <span class="nc-editor-label">${style.property}</span>
                <div class="nc-editor-color-wrap">
                    <input type="color" data-host-style="${style.property}" value="${hex}">
                    <input type="text" class="nc-editor-input" data-host-style-text="${style.property}" value="${style.value}">
                </div>
            </div>`;
        }
        const numValue = parseFloat(style.value);
        if (!isNaN(numValue) && style.value.includes('px')) {
            return `<div class="nc-editor-field">
                <span class="nc-editor-label">${style.property}</span>
                <input type="range" data-host-style="${style.property}" value="${numValue}" min="0" max="50">
                <input type="number" class="nc-editor-input" data-host-style-num="${style.property}" value="${numValue}" style="width:45px;">
            </div>`;
        }
        return `<div class="nc-editor-field">
            <span class="nc-editor-label">${style.property}</span>
            <input type="text" class="nc-editor-input" data-host-style="${style.property}" value="${style.value}">
        </div>`;
    }
    buildStyleField(prop, label, value) {
        const isColor = prop.includes('color') || prop.includes('Color');
        if (isColor) {
            const hex = this.rgbToHex(value);
            return `<div class="nc-editor-field">
                <span class="nc-editor-label">${label}</span>
                <div class="nc-editor-color-wrap">
                    <input type="color" data-style="${prop}" value="${hex}">
                    <input type="text" class="nc-editor-input" data-style-text="${prop}" value="${value}">
                </div>
            </div>`;
        }
        const numValue = parseFloat(value) || 0;
        return `<div class="nc-editor-field">
            <span class="nc-editor-label">${label}</span>
            <input type="range" data-style="${prop}" value="${numValue}" min="0" max="50">
            <input type="number" class="nc-editor-input" data-style-num="${prop}" value="${numValue}" style="width:45px;">
        </div>`;
    }
    attachListeners(container, element) {
        // Section toggles
        container.querySelectorAll('.nc-editor-section-header').forEach(h => {
            h.addEventListener('click', () => h.parentElement?.classList.toggle('collapsed'));
        });
        // Attribute inputs
        container.querySelectorAll('[data-attr]').forEach(input => {
            const eventType = input.type === 'range' ? 'input' : 'change';
            input.addEventListener(eventType, (e) => {
                const t = e.target;
                const attrType = t.dataset.attrType;
                const attrName = t.dataset.attr;
                if (t.type === 'checkbox') {
                    if (t.checked)
                        element.setAttribute(attrName, '');
                    else
                        element.removeAttribute(attrName);
                }
                else if (attrType === 'number-slider') {
                    // Update both slider and number input
                    element.setAttribute(attrName, t.value);
                    const display = container.querySelector(`[data-slider-display="${attrName}"]`);
                    if (display)
                        display.textContent = t.value;
                    const numberInput = container.querySelector(`[data-attr="${attrName}"][data-attr-type="number-input"]`);
                    if (numberInput)
                        numberInput.value = t.value;
                }
                else if (attrType === 'number-input') {
                    // Update both number input and slider
                    element.setAttribute(attrName, t.value);
                    const slider = container.querySelector(`[data-attr="${attrName}"][data-attr-type="number-slider"]`);
                    if (slider)
                        slider.value = t.value;
                    const display = container.querySelector(`[data-slider-display="${attrName}"]`);
                    if (display)
                        display.textContent = t.value;
                }
                else if (t.type === 'color') {
                    // Update color and text input
                    element.setAttribute(attrName, t.value);
                    const textInput = container.querySelector(`[data-attr-text="${attrName}"]`);
                    if (textInput)
                        textInput.value = t.value;
                }
                else {
                    // For dropdowns and text inputs
                    if (t.value === '') {
                        element.removeAttribute(attrName);
                    }
                    else {
                        element.setAttribute(attrName, t.value);
                    }
                }
                // Check if this attribute change should trigger a rebuild (for conditional attributes)
                const componentClass = element.constructor;
                const conditions = componentClass.attributeConditions || {};
                // If any other attribute has a condition that depends on this one, rebuild
                if (Object.keys(conditions).some(key => key !== attrName)) {
                    // Check if changing this attribute affects visibility of other attributes
                    // by testing if this is something conditions check (like 'layout')
                    if (attrName === 'layout' || Object.values(conditions).some((fn) => {
                        // Simple heuristic: if condition function mentions this attribute
                        return fn.toString().includes(`'${attrName}'`);
                    })) {
                        // Save section states before rebuilding
                        const contentEl = this.drawer?.querySelector('#ncEditorContent');
                        const sectionStates = new Map();
                        if (contentEl) {
                            contentEl.querySelectorAll('.nc-editor-section').forEach((section) => {
                                const title = section.querySelector('.nc-editor-section-title')?.textContent || '';
                                const isCollapsed = section.classList.contains('collapsed');
                                sectionStates.set(title, isCollapsed);
                            });
                        }
                        // Rebuild the editor content with new conditional visibility
                        setTimeout(() => {
                            if (this.currentElement && this.currentMetadata) {
                                const contentEl = this.drawer?.querySelector('#ncEditorContent');
                                if (contentEl) {
                                    contentEl.innerHTML = this.buildDynamicContent(this.currentElement, this.currentMetadata);
                                    this.attachListeners(contentEl, this.currentElement);
                                    // Restore section states
                                    contentEl.querySelectorAll('.nc-editor-section').forEach((section) => {
                                        const title = section.querySelector('.nc-editor-section-title')?.textContent || '';
                                        const wasCollapsed = sectionStates.get(title);
                                        if (wasCollapsed === true) {
                                            section.classList.add('collapsed');
                                        }
                                        else if (wasCollapsed === false) {
                                            section.classList.remove('collapsed');
                                        }
                                    });
                                }
                            }
                        }, 50);
                    }
                }
            });
        });
        // Color text inputs
        container.querySelectorAll('[data-attr-text]').forEach(input => {
            input.addEventListener('change', (e) => {
                const t = e.target;
                const attrName = t.dataset.attrText;
                element.setAttribute(attrName, t.value);
                const colorInput = container.querySelector(`[data-attr="${attrName}"][type="color"]`);
                if (colorInput && /^#[0-9A-F]{6}$/i.test(t.value)) {
                    colorInput.value = t.value;
                }
            });
        });
        // CSS Variable inputs
        container.querySelectorAll('[data-cssvar]').forEach(input => {
            input.addEventListener('input', (e) => {
                const t = e.target;
                element.style.setProperty(t.dataset.cssvar, t.value);
                const txt = container.querySelector(`[data-cssvar-text="${t.dataset.cssvar}"]`);
                if (txt)
                    txt.value = t.value;
            });
        });
        // Host style inputs
        container.querySelectorAll('[data-host-style]').forEach(input => {
            input.addEventListener('input', (e) => {
                const t = e.target;
                const prop = t.dataset.hostStyle;
                const val = t.type === 'range' ? t.value + 'px' : t.value;
                element.style[prop] = val;
                const num = container.querySelector(`[data-host-style-num="${prop}"]`);
                if (num && t.type === 'range')
                    num.value = t.value;
                const txt = container.querySelector(`[data-host-style-text="${prop}"]`);
                if (txt)
                    txt.value = val;
            });
        });
        container.querySelectorAll('[data-host-style-num]').forEach(input => {
            input.addEventListener('input', (e) => {
                const t = e.target;
                const prop = t.dataset.hostStyleNum;
                element.style[prop] = t.value + 'px';
                const range = container.querySelector(`[data-host-style="${prop}"]`);
                if (range)
                    range.value = t.value;
            });
        });
        // Quick style inputs
        container.querySelectorAll('[data-style]').forEach(input => {
            input.addEventListener('input', (e) => {
                const t = e.target;
                const prop = t.dataset.style;
                const val = t.type === 'range' ? t.value + 'px' : t.value;
                element.style[prop] = val;
                const num = container.querySelector(`[data-style-num="${prop}"]`);
                if (num && t.type === 'range')
                    num.value = t.value;
                const txt = container.querySelector(`[data-style-text="${prop}"]`);
                if (txt)
                    txt.value = val;
            });
        });
        container.querySelectorAll('[data-style-num]').forEach(input => {
            input.addEventListener('input', (e) => {
                const t = e.target;
                const prop = t.dataset.styleNum;
                element.style[prop] = t.value + 'px';
                const range = container.querySelector(`[data-style="${prop}"]`);
                if (range)
                    range.value = t.value;
            });
        });
        // Nested component drill-down
        container.querySelectorAll('[data-nested-tag]').forEach(item => {
            item.addEventListener('click', async () => {
                const tagName = item.dataset.nestedTag;
                const shadowRoot = element.shadowRoot;
                if (!shadowRoot)
                    return;
                const nestedEl = shadowRoot.querySelector(tagName);
                if (!nestedEl)
                    return;
                try {
                    const response = await fetch(`/api/dev/component/${tagName}`);
                    if (!response.ok)
                        return;
                    const metadata = await response.json();
                    this.open(nestedEl, metadata);
                }
                catch (e) {
                    console.warn('[DevTools] Could not load nested component metadata:', tagName, e);
                }
            });
        });
    }
    rgbToHex(rgb) {
        if (rgb.startsWith('#'))
            return rgb;
        if (rgb === 'transparent' || rgb === 'rgba(0, 0, 0, 0)')
            return '#ffffff';
        const m = rgb.match(/\d+/g);
        if (!m || m.length < 3)
            return '#000000';
        return '#' + m.slice(0, 3).map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
    }
    async save() {
        if (!this.currentMetadata || !this.currentElement)
            return;
        await this.saveInstanceChanges();
    }
    async saveInstanceChanges() {
        if (!this.currentElement || !this.currentMetadata)
            return;
        // Collect ALL current attribute values (not just from metadata)
        const attributes = {};
        const attrs = this.currentElement.attributes;
        for (let i = 0; i < attrs.length; i++) {
            const attr = attrs[i];
            if (attr.name !== 'style' && attr.name !== 'class') {
                attributes[attr.name] = attr.value;
            }
        }
        // NO inline styles - attributes only!
        const payload = {
            tagName: this.currentMetadata.tagName,
            viewPath: window.location.pathname,
            attributes,
            elementIndex: this.getElementIndex()
        };
        console.log('[DevTools] Saving instance changes:', payload);
        try {
            const response = await fetch('/api/dev/component/save-instance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                const result = await response.json();
                console.log('[DevTools] Save successful:', result);
                this.close();
            }
            else {
                const error = await response.json();
                console.error('[DevTools] Failed to save instance changes:', error);
                alert(`Failed to save: ${error.message || 'Unknown error'}`);
            }
        }
        catch (error) {
            console.error('[DevTools] Error saving instance changes:', error);
            alert(`Error saving: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    getElementIndex() {
        if (!this.currentElement || !this.currentMetadata)
            return 0;
        const allElements = Array.from(dom.queryAll(this.currentMetadata.tagName));
        return allElements.indexOf(this.currentElement);
    }
    async saveOld() {
        if (!this.currentMetadata || !this.currentElement)
            return;
        const changes = {
            tagName: this.currentMetadata.tagName,
            filePath: this.currentMetadata.filePath,
            styleChanges: {},
            attributeChanges: {},
            cssVarChanges: {}
        };
        // Collect style changes from the element
        const el = this.currentElement;
        ['color', 'backgroundColor', 'padding', 'margin', 'borderRadius', 'borderWidth', 'borderColor'].forEach(prop => {
            const val = el.style[prop];
            if (val)
                changes.styleChanges[prop] = val;
        });
        try {
            await fetch('/api/dev/component/edit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(changes)
            });
            setTimeout(() => this.close(), 500);
        }
        catch (e) {
            //console.error('[ComponentEditor] Save failed:', e);
        }
    }
    close() {
        this.drawer?.classList.remove('active');
        document.getElementById('ncEditorModal')?.classList.remove('active');
        if (this.currentElement) {
            this.currentElement.style.outline = '';
            this.currentElement.style.outlineOffset = '';
        }
        this.currentElement = null;
        this.currentMetadata = null;
    }
    destroy() {
        this.drawer?.remove();
        (window.dom?.query?.('#nativecore-editor-styles') || document.getElementById('nativecore-editor-styles'))?.remove();
    }
}

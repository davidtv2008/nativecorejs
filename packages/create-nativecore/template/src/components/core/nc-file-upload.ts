/**
 * NcFileUpload Component
 *
 * NativeCore Framework Core Component
 *
 * Attributes:
 *   - name: string â€” form field name
 *   - accept: string â€” file types (e.g. "image/*,.pdf")
 *   - multiple: boolean â€” allow multiple file selection
 *   - disabled: boolean â€” disabled state
 *   - max-size: number â€” max file size in MB (default: no limit)
 *   - variant: 'default' | 'compact' (default: 'default')
 *
 * Events:
 *   - change: CustomEvent<{ files: File[]; name: string }>
 *   - error: CustomEvent<{ message: string; files: File[] }>
 *
 * Usage:
 *   <nc-file-upload name="avatar" accept="image/*"></nc-file-upload>
 *   <nc-file-upload name="docs" accept=".pdf,.docx" multiple max-size="10"></nc-file-upload>
 */

import { CoreComponent } from '@core/component.js';
import { css } from '@core-utils/templates.js';

export class NcFileUpload extends CoreComponent {
    static useShadowDOM = true;
    static observedAttributes = ['name', 'accept', 'multiple', 'disabled', 'max-size', 'variant'];
    static attributeOptions   = { variant: ['default', 'compact'] };
    static attributeOrder     = ['name', 'accept', 'multiple', 'max-size', 'variant', 'disabled'];

    // -- Refs -----------------------------------------------------------------
    declare dropZoneEl:  HTMLDivElement;
    declare fileInputEl: HTMLInputElement;
    declare uploadIconEl: HTMLSpanElement;
    declare dropLabelEl: HTMLSpanElement;
    declare subTextEl:   HTMLSpanElement;
    declare fileListEl:  HTMLDivElement;

    private _files: File[] = [];

    static styles = css`
        :host { display: block; font-family: var(--nc-font-family); width: 100%; }

        .drop-zone {
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            gap: var(--nc-spacing-sm);
            border: 2px dashed var(--nc-border-dark);
            border-radius: var(--nc-radius-lg);
            padding: var(--nc-spacing-2xl) var(--nc-spacing-xl);
            cursor: pointer;
            transition: border-color var(--nc-transition-fast), background var(--nc-transition-fast);
            background: var(--nc-bg-secondary);
            text-align: center; position: relative;
        }
        :host([variant="compact"]) .drop-zone {
            padding: var(--nc-spacing-md) var(--nc-spacing-lg);
        }
        :host([disabled]) .drop-zone { opacity: 0.5; cursor: not-allowed; }
        .drop-zone.dragging { border-color: var(--nc-primary); background: rgba(16,185,129,0.06); }
        .drop-zone:hover:not(.disabled) { border-color: var(--nc-primary); background: rgba(16,185,129,0.04); }

        .upload-icon { color: var(--nc-text-muted); flex-shrink: 0; }
        .drop-zone.dragging .upload-icon { color: var(--nc-primary); }

        .drop-label { font-size: var(--nc-font-size-base); color: var(--nc-text); font-weight: var(--nc-font-weight-medium); }
        .drop-sub   { font-size: var(--nc-font-size-sm); color: var(--nc-text-muted); }
        .browse-link { color: var(--nc-primary); font-weight: var(--nc-font-weight-semibold); cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }

        /* Hidden native input */
        input[type="file"] {
            position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%;
        }
        :host([disabled]) input[type="file"] { cursor: not-allowed; }

        /* File list */
        .file-list { display: flex; flex-direction: column; gap: var(--nc-spacing-xs); margin-top: var(--nc-spacing-sm); }
        [hidden] .file-list, .file-list:empty { display: none; }
        .file-item {
            display: flex; align-items: center; gap: var(--nc-spacing-sm);
            padding: var(--nc-spacing-xs) var(--nc-spacing-sm);
            background: var(--nc-bg); border: 1px solid var(--nc-border);
            border-radius: var(--nc-radius-md); font-size: var(--nc-font-size-sm);
        }
        .file-icon  { color: var(--nc-primary); flex-shrink: 0; display: flex; }
        .file-name  { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--nc-text); }
        .file-size  { color: var(--nc-text-muted); flex-shrink: 0; font-size: var(--nc-font-size-xs); }
        .file-remove {
            background: none; border: none; cursor: pointer; color: var(--nc-text-muted);
            display: flex; align-items: center; padding: 2px;
            border-radius: var(--nc-radius-sm);
            transition: color var(--nc-transition-fast), background var(--nc-transition-fast);
            flex-shrink: 0;
        }
        .file-remove:hover { color: var(--nc-danger); background: rgba(239,68,68,0.08); }

        /* Icon size by variant */
        .upload-icon svg { width: 32px; height: 32px; }
        :host([variant="compact"]) .upload-icon svg { width: 20px; height: 20px; }

        .sub-text { font-size: var(--nc-font-size-xs); color: var(--nc-text-muted); margin-top: var(--nc-spacing-xs); }
        [hidden] { display: none !important; }
    `;

    template() {
        return `            <div ref="dropZoneEl" class="drop-zone">
                <input ref="fileInputEl" type="file" tabindex="-1" />
                <span ref="uploadIconEl" class="upload-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <polyline points="17 8 12 3 7 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                </span>
                <span ref="dropLabelEl" class="drop-label"></span>
                <span ref="subTextEl" class="drop-sub" hidden></span>
            </div>
            <div ref="fileListEl" class="file-list" hidden></div>
        `;
    }

    onMount() {
        this._syncFromAttrs();

        // Native input change
        this.on(this.fileInputEl, 'change', () => {
            if (this.fileInputEl.files) this._handleFiles(Array.from(this.fileInputEl.files));
        });

        // Drag events â€” mutate classList directly, no re-render
        this.on(this.dropZoneEl, 'dragover', (e: DragEvent) => {
            e.preventDefault();
            this.dropZoneEl.classList.add('dragging');
        });
        this.on(this.dropZoneEl, 'dragleave', (e: DragEvent) => {
            if (!e.relatedTarget || !this.dropZoneEl.contains(e.relatedTarget as Node)) {
                this.dropZoneEl.classList.remove('dragging');
            }
        });
        this.on(this.dropZoneEl, 'drop', (e: DragEvent) => {
            e.preventDefault();
            this.dropZoneEl.classList.remove('dragging');
            if (e.dataTransfer?.files) this._handleFiles(Array.from(e.dataTransfer.files));
        });

        // Remove file â€” event delegation
        this.on(this.shadowRoot!, 'click', (e: MouseEvent) => {
            const btn = (e.target as HTMLElement).closest<HTMLElement>('.file-remove');
            if (!btn) return;
            this._removeFile(Number(btn.dataset.index));
        });
    }

    protected _handleAttributeUpdate(_name: string, _val: string | null) {
        this._syncFromAttrs();
    }

    private _syncFromAttrs() {
        const isCompact = this.getAttribute('variant') === 'compact';
        const accept    = this.getAttribute('accept') ?? '';
        const multiple  = this.hasAttribute('multiple');
        const disabled  = this.hasAttribute('disabled');
        const maxSize   = this.getAttribute('max-size') ?? '';

        // File input attrs
        if (accept)    this.fileInputEl.accept   = accept;
        this.fileInputEl.multiple  = multiple;
        this.fileInputEl.disabled  = disabled;
        this.fileInputEl.name      = this.getAttribute('name') ?? '';

        // Label text
        if (isCompact) {
            this.dropLabelEl.innerHTML = '<span class="browse-link">Browse</span> or drop files here';
        } else {
            this.dropLabelEl.innerHTML = 'Drop files here or <span class="browse-link">browse</span>';
        }

        // Sub-text (accept / max-size hint)
        const subParts = [accept ? `Accepted: ${accept}` : '', maxSize ? `Max ${maxSize} MB` : ''].filter(Boolean);
        if (!isCompact && subParts.length > 0) {
            this.subTextEl.hidden = false;
            this.subTextEl.textContent = subParts.join(' Â· ');
        } else {
            this.subTextEl.hidden = true;
        }
    }

    private _renderFileList() {
        if (!this._files.length) {
            this.fileListEl.hidden = true;
            this.fileListEl.innerHTML = '';
            return;
        }
        this.fileListEl.innerHTML = this._files.map((f, i) => `
            <div class="file-item" data-index="${i}">
                <span class="file-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" width="14" height="14">
                        <path d="M9 1H4a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V6L9 1z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
                        <path d="M9 1v5h5" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
                    </svg>
                </span>
                <span class="file-name">${this._esc(f.name)}</span>
                <span class="file-size">${this._formatSize(f.size)}</span>
                <button class="file-remove" data-index="${i}" aria-label="Remove ${this._esc(f.name)}" type="button">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="none" width="12" height="12">
                        <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>
        `).join('');
        this.fileListEl.hidden = false;
    }

    private _handleFiles(incoming: File[]) {
        const maxSizeAttr = this.getAttribute('max-size');
        const maxBytes    = maxSizeAttr ? Number(maxSizeAttr) * 1024 * 1024 : Infinity;
        const accept      = this.getAttribute('accept') ?? '';
        const multiple    = this.hasAttribute('multiple');

        const oversized: File[] = [];
        let valid = incoming.filter(f => {
            if (f.size > maxBytes) { oversized.push(f); return false; }
            return true;
        });
        if (accept) {
            const patterns = accept.split(',').map(p => p.trim());
            valid = valid.filter(f => this._matchesAccept(f, patterns));
        }
        if (oversized.length) {
            this.emit('error', {
                message: `${oversized.map(f => f.name).join(', ')} exceed${oversized.length === 1 ? 's' : ''} the ${maxSizeAttr} MB limit.`,
                files: oversized,
            });
        }
        if (!valid.length) return;

        this._files = multiple ? [...this._files, ...valid] : [valid[0]];
        this._renderFileList();
        this.emit('change', { files: this._files, name: this.getAttribute('name') ?? '' });
    }

    private _removeFile(index: number) {
        this._files.splice(index, 1);
        this._renderFileList();
    }

    private _matchesAccept(file: File, patterns: string[]): boolean {
        return patterns.some(p => {
            if (p.startsWith('.')) return file.name.toLowerCase().endsWith(p.toLowerCase());
            if (p.endsWith('/*'))  return file.type.startsWith(p.slice(0, -2));
            return file.type === p;
        });
    }

    private _formatSize(bytes: number): string {
        if (bytes < 1024)        return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    private _esc(s: string) {
        return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
}

if (!customElements.get('nc-file-upload')) customElements.define('nc-file-upload', NcFileUpload);

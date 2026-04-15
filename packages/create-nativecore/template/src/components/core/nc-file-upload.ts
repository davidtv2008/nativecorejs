/**
 * NcFileUpload Component
 *
 * NativeCore Framework Core Component
 *
 * Attributes:
 *   - name: string — form field name
 *   - accept: string — file types (e.g. "image/*,.pdf")
 *   - multiple: boolean — allow multiple file selection
 *   - disabled: boolean — disabled state
 *   - max-size: number — max file size in MB (default: no limit)
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

import { Component, defineComponent } from '@core/component.js';

export class NcFileUpload extends Component {
    static useShadowDOM = true;

    static attributeOptions = {
        variant: ['default', 'compact']
    };

    static get observedAttributes() {
        return ['name', 'accept', 'multiple', 'disabled', 'max-size', 'variant'];
    }

    private _files: File[] = [];
    private _dragging = false;

    constructor() {
        super();
    }

    template() {
        const disabled = this.hasAttribute('disabled');
        const multiple = this.hasAttribute('multiple');
        const accept = this.getAttribute('accept') || '';
        const maxSize = this.getAttribute('max-size');
        const variant = this.getAttribute('variant') || 'default';
        const isCompact = variant === 'compact';

        const fileList = this._files.length
            ? this._files.map((f, i) => `
                <div class="file-item" data-index="${i}">
                    <span class="file-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" width="14" height="14">
                            <path d="M9 1H4a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V6L9 1z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
                            <path d="M9 1v5h5" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
                        </svg>
                    </span>
                    <span class="file-name">${f.name}</span>
                    <span class="file-size">${this._formatSize(f.size)}</span>
                    <button class="file-remove" data-index="${i}" aria-label="Remove ${f.name}" type="button">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="none" width="12" height="12">
                            <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>
            `).join('')
            : '';

        return `
            <style>
                :host {
                    display: block;
                    font-family: var(--nc-font-family);
                    width: 100%;
                }

                .drop-zone {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: var(--nc-spacing-sm);
                    border: 2px dashed var(--nc-border-dark);
                    border-radius: var(--nc-radius-lg);
                    padding: ${isCompact ? 'var(--nc-spacing-md) var(--nc-spacing-lg)' : 'var(--nc-spacing-2xl) var(--nc-spacing-xl)'};
                    cursor: ${disabled ? 'not-allowed' : 'pointer'};
                    transition: border-color var(--nc-transition-fast), background var(--nc-transition-fast);
                    background: var(--nc-bg-secondary);
                    opacity: ${disabled ? '0.5' : '1'};
                    text-align: center;
                    position: relative;
                }

                .drop-zone.dragging {
                    border-color: var(--nc-primary);
                    background: rgba(16, 185, 129, 0.06);
                }

                .drop-zone:hover:not(.disabled) {
                    border-color: var(--nc-primary);
                    background: rgba(16, 185, 129, 0.04);
                }

                .upload-icon {
                    color: var(--nc-text-muted);
                    flex-shrink: 0;
                }

                .drop-zone.dragging .upload-icon {
                    color: var(--nc-primary);
                }

                .drop-label {
                    font-size: var(--nc-font-size-base);
                    color: var(--nc-text);
                    font-weight: var(--nc-font-weight-medium);
                }

                .drop-sub {
                    font-size: var(--nc-font-size-sm);
                    color: var(--nc-text-muted);
                }

                .browse-link {
                    color: var(--nc-primary);
                    font-weight: var(--nc-font-weight-semibold);
                    cursor: pointer;
                    text-decoration: underline;
                    text-underline-offset: 2px;
                }

                /* Hidden native input */
                input[type="file"] {
                    position: absolute;
                    inset: 0;
                    opacity: 0;
                    cursor: ${disabled ? 'not-allowed' : 'pointer'};
                    width: 100%;
                    height: 100%;
                }

                /* File list */
                .file-list {
                    display: flex;
                    flex-direction: column;
                    gap: var(--nc-spacing-xs);
                    margin-top: ${this._files.length ? 'var(--nc-spacing-sm)' : '0'};
                }

                .file-item {
                    display: flex;
                    align-items: center;
                    gap: var(--nc-spacing-sm);
                    padding: var(--nc-spacing-xs) var(--nc-spacing-sm);
                    background: var(--nc-bg);
                    border: 1px solid var(--nc-border);
                    border-radius: var(--nc-radius-md);
                    font-size: var(--nc-font-size-sm);
                }

                .file-icon {
                    color: var(--nc-primary);
                    flex-shrink: 0;
                    display: flex;
                }

                .file-name {
                    flex: 1;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    color: var(--nc-text);
                }

                .file-size {
                    color: var(--nc-text-muted);
                    flex-shrink: 0;
                    font-size: var(--nc-font-size-xs);
                }

                .file-remove {
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: var(--nc-text-muted);
                    display: flex;
                    align-items: center;
                    padding: 2px;
                    border-radius: var(--nc-radius-sm);
                    transition: color var(--nc-transition-fast), background var(--nc-transition-fast);
                    flex-shrink: 0;
                }

                .file-remove:hover {
                    color: var(--nc-danger);
                    background: rgba(239, 68, 68, 0.08);
                }

                .accept-hint {
                    font-size: var(--nc-font-size-xs);
                    color: var(--nc-text-muted);
                    margin-top: var(--nc-spacing-xs);
                }
            </style>

            <div class="drop-zone${this._dragging ? ' dragging' : ''}${disabled ? ' disabled' : ''}">
                <input
                    type="file"
                    ${accept ? `accept="${accept}"` : ''}
                    ${multiple ? 'multiple' : ''}
                    ${disabled ? 'disabled' : ''}
                    name="${this.getAttribute('name') || ''}"
                    tabindex="-1"
                />

                <span class="upload-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                        width="${isCompact ? '20' : '32'}" height="${isCompact ? '20' : '32'}">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <polyline points="17 8 12 3 7 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                </span>

                ${isCompact
                    ? `<span class="drop-label"><span class="browse-link">Browse</span> or drop files here</span>`
                    : `<span class="drop-label">Drop files here or <span class="browse-link">browse</span></span>
                       <span class="drop-sub">${[accept ? `Accepted: ${accept}` : '', maxSize ? `Max ${maxSize} MB` : ''].filter(Boolean).join(' &bull; ') || 'Any file type accepted'}</span>`
                }
            </div>

            ${this._files.length ? `<div class="file-list">${fileList}</div>` : ''}
        `;
    }

    onMount() {
        this._bindEvents();
    }

    private _bindEvents() {
        const sr = this.shadowRoot!;
        const dropZone = sr.querySelector('.drop-zone')!;
        const input = sr.querySelector<HTMLInputElement>('input[type="file"]')!;

        // Native input change
        input.addEventListener('change', () => {
            if (input.files) this._handleFiles(Array.from(input.files));
        });

        // Drag events — update _dragging state directly on the element, re-render only needed for file list
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (!this._dragging) {
                this._dragging = true;
                dropZone.classList.add('dragging');
                sr.querySelector('.upload-icon')?.classList.add('dragging');
            }
        });

        dropZone.addEventListener('dragleave', (e) => {
            // Only clear if leaving the drop zone entirely
            if (!(e as DragEvent).relatedTarget || !dropZone.contains((e as DragEvent).relatedTarget as Node)) {
                this._dragging = false;
                dropZone.classList.remove('dragging');
            }
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this._dragging = false;
            dropZone.classList.remove('dragging');
            const dt = (e as DragEvent).dataTransfer;
            if (dt?.files) this._handleFiles(Array.from(dt.files));
        });

        // Remove file button — event delegation
        sr.addEventListener('click', (ev) => {
            const btn = (ev.target as HTMLElement).closest('.file-remove') as HTMLElement | null;
            if (!btn) return;
            const idx = Number(btn.dataset.index);
            this._removeFile(idx);
        });
    }

    private _handleFiles(incoming: File[]) {
        const maxSizeAttr = this.getAttribute('max-size');
        const maxBytes = maxSizeAttr ? Number(maxSizeAttr) * 1024 * 1024 : Infinity;
        const accept = this.getAttribute('accept') || '';
        const multiple = this.hasAttribute('multiple');

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
            this.dispatchEvent(new CustomEvent('error', {
                bubbles: true, composed: true,
                detail: {
                    message: `${oversized.map(f => f.name).join(', ')} exceed${oversized.length === 1 ? 's' : ''} the ${maxSizeAttr} MB limit.`,
                    files: oversized
                }
            }));
        }

        if (!valid.length) return;

        this._files = multiple ? [...this._files, ...valid] : [valid[0]];
        this.render();
        this._bindEvents();

        this.dispatchEvent(new CustomEvent('change', {
            bubbles: true, composed: true,
            detail: { files: this._files, name: this.getAttribute('name') || '' }
        }));
    }

    private _removeFile(index: number) {
        this._files.splice(index, 1);
        this.render();
        this._bindEvents();
    }

    private _matchesAccept(file: File, patterns: string[]): boolean {
        return patterns.some(p => {
            if (p.startsWith('.')) return file.name.toLowerCase().endsWith(p.toLowerCase());
            if (p.endsWith('/*')) return file.type.startsWith(p.slice(0, -2));
            return file.type === p;
        });
    }

    private _formatSize(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue !== newValue && this._mounted) {
            this.render();
            this._bindEvents();
        }
    }
}

defineComponent('nc-file-upload', NcFileUpload);

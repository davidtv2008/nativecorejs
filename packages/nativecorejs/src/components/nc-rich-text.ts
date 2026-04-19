/**
 * NcRichText Component
 *
 * A lightweight rich text editor built on contenteditable + execCommand,
 * with a toolbar, HTML output, and zero external dependencies.
 *
 * Attributes:
 *   - name: string - for use in nc-form (emits HTML string as value)
 *   - value: string - initial HTML content
 *   - placeholder: string (default: 'Start typing...')
 *   - disabled: boolean
 *   - readonly: boolean
 *   - toolbar: string - comma-separated list of toolbar buttons to show.
 *       Full list: 'bold,italic,underline,strike,|,h1,h2,h3,|,ul,ol,|,blockquote,code,|,link,|,align-left,align-center,align-right,|,clear'
 *       Default: all of the above
 *   - min-height: string - CSS min-height of editable area (default: '120px')
 *   - max-height: string - CSS max-height of editable area (default: '400px')
 *
 * Events:
 *   - input:  CustomEvent<{ value: string; name: string }>
 *   - change: CustomEvent<{ value: string; name: string }>
 *
 * Usage:
 *   <nc-rich-text name="body" placeholder="Write something..." min-height="200px"></nc-rich-text>
 *   <nc-rich-text name="notes" toolbar="bold,italic,underline,|,ul,ol"></nc-rich-text>
 */

import { Component, defineComponent } from '../../.nativecore/core/component.js';
import { html, raw, sanitizeURL } from '../../.nativecore/utils/templates.js';

const ICONS: Record<string, string> = {
    bold:         `<svg viewBox="0 0 16 16" fill="none" width="14" height="14"><text x="3" y="13" font-family="Georgia,serif" font-size="13" font-weight="bold" fill="currentColor">B</text></svg>`,
    italic:       `<svg viewBox="0 0 16 16" fill="none" width="14" height="14"><text x="4" y="13" font-family="Georgia,serif" font-size="13" font-style="italic" fill="currentColor">I</text></svg>`,
    underline:    `<svg viewBox="0 0 16 16" fill="none" width="14" height="14"><text x="3" y="11" font-family="Arial,sans-serif" font-size="12" text-decoration="underline" fill="currentColor">U</text><line x1="2" y1="14" x2="14" y2="14" stroke="currentColor" stroke-width="1.5"/></svg>`,
    strike:       `<svg viewBox="0 0 16 16" fill="none" width="14" height="14"><line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" stroke-width="1.5"/><text x="3" y="7" font-family="Arial" font-size="9" fill="currentColor">S</text></svg>`,
    h1:           `<svg viewBox="0 0 20 16" fill="none" width="18" height="14"><text x="1" y="13" font-family="Arial" font-size="13" font-weight="bold" fill="currentColor">H1</text></svg>`,
    h2:           `<svg viewBox="0 0 20 16" fill="none" width="18" height="14"><text x="1" y="13" font-family="Arial" font-size="13" font-weight="bold" fill="currentColor">H2</text></svg>`,
    h3:           `<svg viewBox="0 0 20 16" fill="none" width="18" height="14"><text x="1" y="13" font-family="Arial" font-size="13" font-weight="bold" fill="currentColor">H3</text></svg>`,
    ul:           `<svg viewBox="0 0 16 16" fill="none" width="14" height="14" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><circle cx="3" cy="5" r="1" fill="currentColor" stroke="none"/><line x1="6" y1="5" x2="14" y2="5"/><circle cx="3" cy="9" r="1" fill="currentColor" stroke="none"/><line x1="6" y1="9" x2="14" y2="9"/><circle cx="3" cy="13" r="1" fill="currentColor" stroke="none"/><line x1="6" y1="13" x2="14" y2="13"/></svg>`,
    ol:           `<svg viewBox="0 0 16 16" fill="none" width="14" height="14" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><text x="1" y="6" font-family="Arial" font-size="5" fill="currentColor" stroke="none">1.</text><line x1="6" y1="5" x2="14" y2="5"/><text x="1" y="10" font-family="Arial" font-size="5" fill="currentColor" stroke="none">2.</text><line x1="6" y1="9" x2="14" y2="9"/><text x="1" y="14" font-family="Arial" font-size="5" fill="currentColor" stroke="none">3.</text><line x1="6" y1="13" x2="14" y2="13"/></svg>`,
    blockquote:   `<svg viewBox="0 0 16 16" fill="none" width="14" height="14"><text x="1" y="13" font-family="Georgia,serif" font-size="16" fill="currentColor" opacity=".6">"</text></svg>`,
    code:         `<svg viewBox="0 0 16 16" fill="none" width="14" height="14" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M5 4L1 8l4 4M11 4l4 4-4 4"/></svg>`,
    link:         `<svg viewBox="0 0 16 16" fill="none" width="14" height="14" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M6.5 9.5a3.5 3.5 0 005 0l2-2a3.5 3.5 0 00-5-5l-1 1"/><path d="M9.5 6.5a3.5 3.5 0 00-5 0l-2 2a3.5 3.5 0 005 5l1-1"/></svg>`,
    'align-left':   `<svg viewBox="0 0 16 16" fill="none" width="14" height="14" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><line x1="2" y1="4" x2="14" y2="4"/><line x1="2" y1="8" x2="10" y2="8"/><line x1="2" y1="12" x2="14" y2="12"/></svg>`,
    'align-center': `<svg viewBox="0 0 16 16" fill="none" width="14" height="14" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><line x1="2" y1="4" x2="14" y2="4"/><line x1="4" y1="8" x2="12" y2="8"/><line x1="2" y1="12" x2="14" y2="12"/></svg>`,
    'align-right':  `<svg viewBox="0 0 16 16" fill="none" width="14" height="14" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><line x1="2" y1="4" x2="14" y2="4"/><line x1="6" y1="8" x2="14" y2="8"/><line x1="2" y1="12" x2="14" y2="12"/></svg>`,
    clear:          `<svg viewBox="0 0 16 16" fill="none" width="14" height="14" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg>`,
};

export class NcRichText extends Component {
    static useShadowDOM = true;

    static get observedAttributes() {
        return ['name', 'value', 'placeholder', 'disabled', 'readonly', 'toolbar', 'min-height', 'max-height'];
    }

    private _value = '';

    constructor() { super(); }

    private _getToolbarItems(): string[] {
        const raw = this.getAttribute('toolbar');
        if (raw) return raw.split(',').map(s => s.trim());
        return ['bold','italic','underline','strike','|','h1','h2','h3','|','ul','ol','|','blockquote','code','|','link','|','align-left','align-center','align-right','|','clear'];
    }

    template() {
        if (!this._mounted) {
            this._value = this.getAttribute('value') || '';
        }
        const placeholder = this.getAttribute('placeholder') || 'Start typing...';
        const disabled = this.hasAttribute('disabled');
        const readonly = this.hasAttribute('readonly');
        const minHeight = this.getAttribute('min-height') || '120px';
        const maxHeight = this.getAttribute('max-height') || '400px';
        const items = this._getToolbarItems();

        const toolbarHtml = items.map(id => {
            if (id === '|') return html`<span class="tb-sep"></span>`;
            const icon = ICONS[id] ?? '';
            return `<button class="tb-btn" type="button" data-cmd="${id}" title="${id}" tabindex="-1">${icon}</button>`;
        }).join('');

        return `
            <style>
                :host { display: block; font-family: var(--nc-font-family); }

                .editor-wrap {
                    border: var(--nc-input-border);
                    border-radius: var(--nc-input-radius);
                    background: var(--nc-bg);
                    overflow: hidden;
                    opacity: ${disabled ? '0.5' : '1'};
                    pointer-events: ${disabled ? 'none' : 'auto'};
                    transition: border-color var(--nc-transition-fast), box-shadow var(--nc-transition-fast);
                }
                .editor-wrap:focus-within { border-color: var(--nc-input-focus-border); box-shadow: 0 0 0 3px rgba(16,185,129,.15); }

                .toolbar {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    gap: 2px;
                    padding: 6px 8px;
                    border-bottom: 1px solid var(--nc-border);
                    background: var(--nc-bg-secondary);
                    user-select: none;
                }

                .tb-btn {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 4px 6px;
                    border-radius: var(--nc-radius-sm, 4px);
                    color: var(--nc-text);
                    transition: background var(--nc-transition-fast), color var(--nc-transition-fast);
                    line-height: 1;
                }
                .tb-btn:hover { background: var(--nc-bg-tertiary); }
                .tb-btn.active { background: var(--nc-primary); color: #fff; }

                .tb-sep {
                    width: 1px;
                    height: 18px;
                    background: var(--nc-border);
                    margin: 0 4px;
                    flex-shrink: 0;
                }

                .editable {
                    padding: var(--nc-spacing-md);
                    min-height: ${minHeight};
                    max-height: ${maxHeight};
                    overflow-y: auto;
                    outline: none;
                    font-size: var(--nc-font-size-base);
                    line-height: var(--nc-line-height-relaxed, 1.7);
                    color: var(--nc-text);
                    word-break: break-word;
                }

                .editable:empty::before {
                    content: attr(data-placeholder);
                    color: var(--nc-text-muted);
                    pointer-events: none;
                }

                /* Content styles */
                .editable h1 { font-size: 1.8em; font-weight: 700; margin: 0.5em 0 0.25em; }
                .editable h2 { font-size: 1.4em; font-weight: 700; margin: 0.5em 0 0.25em; }
                .editable h3 { font-size: 1.1em; font-weight: 700; margin: 0.5em 0 0.25em; }
                .editable ul, .editable ol { padding-left: 1.5em; margin: 0.4em 0; }
                .editable blockquote { border-left: 3px solid var(--nc-primary); padding-left: var(--nc-spacing-md); margin: 0.4em 0; color: var(--nc-text-muted); font-style: italic; }
                .editable code, .editable pre { background: var(--nc-bg-tertiary); border-radius: 4px; font-family: monospace; font-size: 0.9em; padding: 1px 5px; }
                .editable a { color: var(--nc-primary); text-decoration: underline; }
            </style>
            <div class="editor-wrap">
                <div class="toolbar">${raw(toolbarHtml)}</div>
                <div
                    class="editable"
                    contenteditable="${!disabled && !readonly ? 'true' : 'false'}"
                    data-placeholder="${placeholder}"
                    role="textbox"
                    aria-multiline="true"
                    aria-label="${placeholder}"
                >${this._value}</div>
            </div>
            <input type="hidden" name="${this.getAttribute('name') || ''}" value="" />
        `;
    }

    onMount() {
        this._bindEvents();
        // Sync hidden input with initial value
        const hidden = this.$<HTMLInputElement>('input[type="hidden"]')!;
        hidden.value = this._value;
    }

    private _exec(cmd: string) {
        const editable = this.$<HTMLElement>('.editable')!;
        editable.focus();

        switch (cmd) {
            case 'bold':         document.execCommand('bold', false); break;
            case 'italic':       document.execCommand('italic', false); break;
            case 'underline':    document.execCommand('underline', false); break;
            case 'strike':       document.execCommand('strikeThrough', false); break;
            case 'h1':           document.execCommand('formatBlock', false, 'h1'); break;
            case 'h2':           document.execCommand('formatBlock', false, 'h2'); break;
            case 'h3':           document.execCommand('formatBlock', false, 'h3'); break;
            case 'ul':           document.execCommand('insertUnorderedList', false); break;
            case 'ol':           document.execCommand('insertOrderedList', false);  break;
            case 'blockquote':   document.execCommand('formatBlock', false, 'blockquote'); break;
            case 'code':         document.execCommand('formatBlock', false, 'pre'); break;
            case 'align-left':   document.execCommand('justifyLeft', false); break;
            case 'align-center': document.execCommand('justifyCenter', false); break;
            case 'align-right':  document.execCommand('justifyRight', false); break;
            case 'clear':        document.execCommand('removeFormat', false); break;
            case 'link': {
                const url = prompt('Enter URL:');
                const safeUrl = sanitizeURL(url);
                if (safeUrl) document.execCommand('createLink', false, safeUrl);
                break;
            }
        }
        this._onContentChange();
        this._updateToolbarState();
    }

    private _onContentChange() {
        const editable = this.$<HTMLElement>('.editable')!;
        const html = editable.innerHTML;
        this._value = html;
        const hidden = this.$<HTMLInputElement>('input[type="hidden"]');
        if (hidden) hidden.value = html;
        const name = this.getAttribute('name') || '';
        this.dispatchEvent(new CustomEvent('input', {
            bubbles: true, composed: true,
            detail: { value: html, name }
        }));
    }

    private _updateToolbarState() {
        this.shadowRoot!.querySelectorAll<HTMLButtonElement>('.tb-btn').forEach(btn => {
            const cmd = btn.dataset.cmd ?? '';
            let active = false;
            switch (cmd) {
                case 'bold':      active = document.queryCommandState('bold'); break;
                case 'italic':    active = document.queryCommandState('italic'); break;
                case 'underline': active = document.queryCommandState('underline'); break;
                case 'strike':    active = document.queryCommandState('strikeThrough'); break;
            }
            btn.classList.toggle('active', active);
        });
    }

    private _bindEvents() {
        const toolbar = this.$<HTMLElement>('.toolbar')!;
        const editable = this.$<HTMLElement>('.editable')!;

        toolbar.addEventListener('mousedown', (e) => {
            // Prevent losing selection when clicking toolbar buttons
            e.preventDefault();
        });
        toolbar.addEventListener('click', (e) => {
            const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-cmd]');
            if (btn) this._exec(btn.dataset.cmd!);
        });

        editable.addEventListener('input', () => this._onContentChange());
        editable.addEventListener('blur', () => {
            this.dispatchEvent(new CustomEvent('change', {
                bubbles: true, composed: true,
                detail: { value: this._value, name: this.getAttribute('name') || '' }
            }));
        });
        editable.addEventListener('keyup', () => this._updateToolbarState());
        editable.addEventListener('mouseup', () => this._updateToolbarState());
    }

    getValue(): string { return this._value; }

    setValue(html: string) {
        this._value = html;
        const editable = this.$<HTMLElement>('.editable');
        if (editable) editable.innerHTML = html;
        const hidden = this.$<HTMLInputElement>('input[type="hidden"]');
        if (hidden) hidden.value = html;
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue === newValue) return;
        if (name === 'value' && this._mounted) {
            this.setValue(newValue || '');
            return;
        }
        if (this._mounted) { this.render(); }
        // Do not re-call _bindEvents() — the .toolbar and .editable delegation survives re-renders
    }
}

defineComponent('nc-rich-text', NcRichText);




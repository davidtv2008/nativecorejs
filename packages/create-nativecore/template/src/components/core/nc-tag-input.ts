/**
 * NcTagInput Component â€” text input that creates dismissible tag chips
 *
 * Attributes:
 *   placeholder  â€” input placeholder text
 *   value        â€” comma-separated initial tags (e.g. "react,vue,svelte")
 *   max          â€” maximum number of tags allowed
 *   min-length   â€” minimum character length for a tag (default: 1)
 *   max-length   â€” maximum character length per tag
 *   delimiter    â€” character(s) that trigger tag creation in addition to Enter (default: ',')
 *   disabled     â€” boolean
 *   readonly     â€” boolean â€” show tags but cannot add/remove
 *   duplicate    â€” boolean â€” allow duplicate tags (default: false)
 *   variant      â€” 'default'|'filled' (default: 'default')
 *   label        â€” visible label text
 *   hint         â€” helper text below input
 *   error        â€” error message (shown in red)
 *
 * Events:
 *   change    â€” CustomEvent<{ tags: string[] }> â€” tag list changed
 *   add       â€” CustomEvent<{ tag: string }>
 *   remove    â€” CustomEvent<{ tag: string; index: number }>
 *   max-reached â€” CustomEvent â€” fired when max is exceeded
 *
 * Methods:
 *   el.getTags()          â€” string[]
 *   el.setTags(tags)      â€” replace all tags
 *   el.addTag(tag)        â€” programmatic add
 *   el.removeTag(index)   â€” programmatic remove
 *   el.clear()            â€” remove all tags
 */
import { CoreComponent } from '@core/component.js';
import { css } from '@core-utils/templates.js';

export class NcTagInput extends CoreComponent {
    static useShadowDOM = true;
    static observedAttributes = ['value', 'disabled', 'readonly', 'error', 'placeholder', 'label', 'hint'];
    static attributeOptions   = { variant: ['default', 'filled'] };
    static attributeOrder     = ['value', 'placeholder', 'label', 'hint', 'error', 'variant', 'max', 'min-length', 'max-length', 'delimiter', 'duplicate', 'disabled', 'readonly'];

    // -- Refs -----------------------------------------------------------------
    declare labelEl:    HTMLLabelElement;
    declare fieldEl:    HTMLDivElement;
    declare tagsAreaEl: HTMLSpanElement;
    declare inputEl:    HTMLInputElement;
    declare statusEl:   HTMLParagraphElement;

    private _tags: string[] = [];

    static styles = css`
        :host { display: block; font-family: var(--nc-font-family); }
        .label {
            display: block;
            font-size: var(--nc-font-size-sm); font-weight: var(--nc-font-weight-medium);
            color: var(--nc-text); margin-bottom: 6px;
        }
        .field {
            display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
            padding: 8px 10px;
            background: var(--nc-bg);
            border: 1px solid var(--nc-border);
            border-radius: var(--nc-radius-md);
            min-height: 42px; cursor: text;
            transition: border-color var(--nc-transition-fast), box-shadow var(--nc-transition-fast);
        }
        :host([variant="filled"]) .field { background: var(--nc-bg-secondary); }
        :host([disabled]) .field { opacity: 0.5; cursor: not-allowed; }
        :host([error]) .field { border-color: var(--nc-danger); }
        .field:focus-within {
            border-color: var(--nc-primary);
            box-shadow: 0 0 0 3px rgba(var(--nc-primary-rgb, 99,102,241),.15);
        }
        :host([error]) .field:focus-within { border-color: var(--nc-danger); box-shadow: 0 0 0 3px rgba(239,68,68,.15); }
        .tags-area { display: contents; }
        .tag {
            display: inline-flex; align-items: center; gap: 4px;
            background: var(--nc-primary); color: var(--nc-white);
            border-radius: var(--nc-radius-sm); padding: 2px 8px;
            font-size: var(--nc-font-size-xs); font-weight: var(--nc-font-weight-medium);
            line-height: 1.6; white-space: nowrap; max-width: 200px;
        }
        .tag-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .tag-remove {
            background: none; border: none; padding: 0; cursor: pointer;
            color: inherit; opacity: 0.7; display: flex; align-items: center;
            line-height: 1; flex-shrink: 0;
        }
        .tag-remove:hover { opacity: 1; }
        input {
            flex: 1 1 80px; min-width: 80px; border: none; outline: none;
            background: transparent; font-family: inherit;
            font-size: var(--nc-font-size-sm); color: var(--nc-text);
            padding: 0; caret-color: var(--nc-primary);
        }
        input::placeholder { color: var(--nc-text-muted); }
        :host([disabled]) input { cursor: not-allowed; }
        .hint  { font-size: var(--nc-font-size-xs); color: var(--nc-text-muted); margin-top: 5px; }
        .error { font-size: var(--nc-font-size-xs); color: var(--nc-danger);      margin-top: 5px; }
        [hidden] { display: none !important; }
    `;

    template() {
        return `            <label ref="labelEl" class="label" hidden></label>
            <div ref="fieldEl" class="field" id="field">
                <span ref="tagsAreaEl" class="tags-area"></span>
                <input ref="inputEl" type="text" autocomplete="off" spellcheck="false" />
            </div>
            <p ref="statusEl" class="hint" hidden></p>
        `;
    }

    onMount() {
        // Init tags from value attribute
        const raw = this.getAttribute('value') ?? '';
        if (raw) this._tags = raw.split(',').map(t => t.trim()).filter(Boolean);

        this._syncFromAttrs();
        this._renderTags();
        this._bindEvents();
    }

    protected _handleAttributeUpdate(name: string, val: string | null) {
        if (name === 'value') {
            this._tags = (val ?? '').split(',').map(t => t.trim()).filter(Boolean);
            this._renderTags();
            return;
        }
        this._syncFromAttrs();
    }

    private _syncFromAttrs() {
        const label    = this.getAttribute('label') ?? '';
        const hint     = this.getAttribute('hint') ?? '';
        const error    = this.getAttribute('error') ?? '';
        const disabled = this.hasAttribute('disabled');
        const readonly = this.hasAttribute('readonly');
        const placeholder = this.getAttribute('placeholder') ?? 'Add tag...';

        // Label
        this.labelEl.hidden = !label;
        if (label) this.labelEl.textContent = label;

        // Input
        this.inputEl.placeholder = this._tags.length === 0 ? placeholder : '';
        this.inputEl.disabled    = disabled;
        if (readonly || disabled) this.inputEl.style.display = 'none';
        else                      this.inputEl.style.display = '';

        // Status
        this.statusEl.hidden = !error && !hint;
        if (error) {
            this.statusEl.className = 'error';
            this.statusEl.textContent = error;
        } else if (hint) {
            this.statusEl.className = 'hint';
            this.statusEl.textContent = hint;
        }
    }

    private _renderTags() {
        const disabled = this.hasAttribute('disabled');
        const readonly = this.hasAttribute('readonly');
        this.tagsAreaEl.innerHTML = this._tags.map((tag, i) => `
            <span class="tag" data-index="${i}">
                <span class="tag-text">${this._esc(tag)}</span>
                ${!disabled && !readonly
                    ? `<button class="tag-remove" type="button" data-index="${i}" aria-label="Remove ${this._esc(tag)}">
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 12 12" fill="none">
                              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                          </svg>
                       </button>`
                    : ''}
            </span>
        `).join('');
        // Update placeholder
        this.inputEl.placeholder = this._tags.length === 0 ? (this.getAttribute('placeholder') ?? 'Add tag...') : '';
    }

    private _bindEvents() {
        const delimiter = () => this.getAttribute('delimiter') ?? ',';

        this.on(this.inputEl, 'keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter' || (delimiter() && e.key === delimiter())) {
                e.preventDefault();
                const val = this.inputEl.value.trim();
                if (val) { this.addTag(val); this.inputEl.value = ''; }
            } else if (e.key === 'Backspace' && this.inputEl.value === '' && this._tags.length > 0) {
                this.removeTag(this._tags.length - 1);
            }
        });

        this.on(this.inputEl, 'input', () => {
            const val   = this.inputEl.value;
            const delim = delimiter();
            if (delim && val.endsWith(delim)) {
                const tag = val.slice(0, -delim.length).trim();
                if (tag) { this.addTag(tag); this.inputEl.value = ''; }
            }
        });

        // Click on field â†’ focus input
        this.on(this.fieldEl, 'click', (e: MouseEvent) => {
            if (!(e.target as HTMLElement).closest('.tag-remove')) {
                this.inputEl.focus();
            }
        });

        // Remove tag via delegation
        this.on(this.shadowRoot!, 'click', (e: MouseEvent) => {
            const btn = (e.target as HTMLElement).closest<HTMLElement>('.tag-remove');
            if (btn) {
                const idx = parseInt(btn.dataset.index ?? '-1', 10);
                if (idx >= 0) this.removeTag(idx);
            }
        });
    }

    // â”€â”€ Public API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    getTags(): string[] { return [...this._tags]; }

    setTags(tags: string[]) {
        this._tags = [...tags];
        this._renderTags();
        this._emit('change');
    }

    addTag(tag: string) {
        const maxAttr  = this.getAttribute('max');
        const minLen   = parseInt(this.getAttribute('min-length') ?? '1', 10);
        const maxLen   = this.getAttribute('max-length');
        const allowDup = this.hasAttribute('duplicate');

        tag = tag.trim();
        if (!tag || tag.length < minLen) return;
        if (maxLen && tag.length > parseInt(maxLen, 10)) return;
        if (!allowDup && this._tags.includes(tag)) return;
        if (maxAttr && this._tags.length >= parseInt(maxAttr, 10)) {
            this.emit('max-reached');
            return;
        }
        this._tags.push(tag);
        this._renderTags();
        this.emit('add', { tag });
        this._emit('change');
    }

    removeTag(index: number) {
        const tag = this._tags[index];
        if (tag === undefined) return;
        this._tags.splice(index, 1);
        this._renderTags();
        this.emit('remove', { tag, index });
        this._emit('change');
        this.inputEl.focus();
    }

    clear() { this.setTags([]); }

    private _emit(event: string) {
        this.emit(event, { tags: [...this._tags] });
    }

    private _esc(s: string) {
        return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
}

if (!customElements.get('nc-tag-input')) customElements.define('nc-tag-input', NcTagInput);

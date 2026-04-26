/**
 * NcTagInput Component — text input that creates dismissible tag chips
 *
 * Attributes:
 *   placeholder  — input placeholder text
 *   value        — comma-separated initial tags (e.g. "react,vue,svelte")
 *   max          — maximum number of tags allowed
 *   min-length   — minimum character length for a tag (default: 1)
 *   max-length   — maximum character length per tag
 *   delimiter    — character(s) that trigger tag creation in addition to Enter (default: ',')
 *   disabled     — boolean
 *   readonly     — boolean — show tags but cannot add/remove
 *   duplicate    — boolean — allow duplicate tags (default: false)
 *   variant      — 'default'|'filled' (default: 'default')
 *   label        — visible label text
 *   hint         — helper text below input
 *   error        — error message (shown in red)
 *
 * Events:
 *   change    — CustomEvent<{ tags: string[] }> — tag list changed
 *   add       — CustomEvent<{ tag: string }>
 *   remove    — CustomEvent<{ tag: string; index: number }>
 *   max-reached — CustomEvent — fired when max is exceeded
 *
 * Methods:
 *   el.getTags()          — string[]
 *   el.setTags(tags)      — replace all tags
 *   el.addTag(tag)        — programmatic add
 *   el.removeTag(index)   — programmatic remove
 *   el.clear()            — remove all tags
 */
import { Component, defineComponent } from '@core/component.js';
import { html, trusted } from '@core-utils/templates.js';
export class NcTagInput extends Component {
    static useShadowDOM = true;
    _tags = [];
    static get observedAttributes() {
        return ['value', 'disabled', 'readonly', 'error'];
    }
    connectedCallback() {
        super.connectedCallback?.();
        const raw = this.getAttribute('value') ?? '';
        if (raw)
            this._tags = raw.split(',').map(t => t.trim()).filter(Boolean);
    }
    template() {
        const placeholder = this.getAttribute('placeholder') ?? 'Add tag...';
        const label = this.getAttribute('label') ?? '';
        const hint = this.getAttribute('hint') ?? '';
        const error = this.getAttribute('error') ?? '';
        const disabled = this.hasAttribute('disabled');
        const readonly = this.hasAttribute('readonly');
        const variant = this.getAttribute('variant') ?? 'default';
        const bg = variant === 'filled' ? 'var(--nc-bg-secondary)' : 'var(--nc-bg)';
        const border = error ? 'var(--nc-danger)' : 'var(--nc-border)';
        const tagsHtml = this._tags.map((tag, i) => `
            <span class="tag" data-index="${i}">
                <span class="tag-text">${this._escape(tag)}</span>
                ${!disabled && !readonly
            ? `<button class="tag-remove" type="button" data-index="${i}" aria-label="Remove ${this._escape(tag)}">
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 12 12" fill="none">
                              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                          </svg>
                       </button>`
            : ''}
            </span>
        `).join('');
        return html `
            <style>
                :host { display: block; font-family: var(--nc-font-family); }
                .label {
                    display: block;
                    font-size: var(--nc-font-size-sm);
                    font-weight: var(--nc-font-weight-medium);
                    color: var(--nc-text);
                    margin-bottom: 6px;
                }
                .field {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    gap: 6px;
                    padding: 8px 10px;
                    background: ${bg};
                    border: 1px solid ${border};
                    border-radius: var(--nc-radius-md);
                    min-height: 42px;
                    cursor: ${disabled ? 'not-allowed' : 'text'};
                    transition: border-color var(--nc-transition-fast), box-shadow var(--nc-transition-fast);
                    opacity: ${disabled ? 0.5 : 1};
                }
                .field:focus-within {
                    border-color: var(--nc-primary);
                    box-shadow: 0 0 0 3px rgba(var(--nc-primary-rgb, 99,102,241),.15);
                }
                .tag {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    background: var(--nc-primary);
                    color: var(--nc-white);
                    border-radius: var(--nc-radius-sm);
                    padding: 2px 8px;
                    font-size: var(--nc-font-size-xs);
                    font-weight: var(--nc-font-weight-medium);
                    line-height: 1.6;
                    white-space: nowrap;
                    max-width: 200px;
                }
                .tag-text {
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .tag-remove {
                    background: none;
                    border: none;
                    padding: 0;
                    cursor: pointer;
                    color: inherit;
                    opacity: 0.7;
                    display: flex;
                    align-items: center;
                    line-height: 1;
                    flex-shrink: 0;
                }
                .tag-remove:hover { opacity: 1; }
                input {
                    flex: 1 1 80px;
                    min-width: 80px;
                    border: none;
                    outline: none;
                    background: transparent;
                    font-family: inherit;
                    font-size: var(--nc-font-size-sm);
                    color: var(--nc-text);
                    padding: 0;
                    caret-color: var(--nc-primary);
                }
                input::placeholder { color: var(--nc-text-muted); }
                input:disabled { cursor: not-allowed; }
                .hint  { font-size: var(--nc-font-size-xs); color: var(--nc-text-muted); margin-top: 5px; }
                .error { font-size: var(--nc-font-size-xs); color: var(--nc-danger);      margin-top: 5px; }
            </style>
            ${trusted(label ? `<label class="label">${label}</label>` : '')}
            <div class="field" id="field">
                ${trusted(tagsHtml)}
                ${trusted(!readonly
            ? `<input
                        type="text"
                        id="input"
                        placeholder="${this._tags.length === 0 ? placeholder : ''}"
                        ${disabled ? 'disabled' : ''}
                        autocomplete="off"
                        spellcheck="false"
                      />`
            : '')}
            </div>
            ${trusted(error ? `<p class="error">${error}</p>` : hint ? `<p class="hint">${hint}</p>` : '')}
        `;
    }
    onMount() {
        this._bindEvents();
    }
    _bindEvents() {
        const input = this.$('#input');
        if (!input)
            return;
        const delimiter = this.getAttribute('delimiter') ?? ',';
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || (delimiter && e.key === delimiter)) {
                e.preventDefault();
                const val = input.value.trim();
                if (val) {
                    this.addTag(val);
                    input.value = '';
                }
            }
            else if (e.key === 'Backspace' && input.value === '' && this._tags.length > 0) {
                this.removeTag(this._tags.length - 1);
            }
        });
        input.addEventListener('input', () => {
            const val = input.value;
            const delim = this.getAttribute('delimiter') ?? ',';
            if (delim && val.endsWith(delim)) {
                const tag = val.slice(0, -delim.length).trim();
                if (tag) {
                    this.addTag(tag);
                    input.value = '';
                }
            }
        });
        // Clicking the field focuses the input
        this.$('#field')?.addEventListener('click', (e) => {
            if (e.target.closest('.tag-remove'))
                return;
            input.focus();
        });
        this.shadowRoot.addEventListener('click', (e) => {
            const btn = e.target.closest('.tag-remove');
            if (btn) {
                const idx = parseInt(btn.dataset.index ?? '-1', 10);
                if (idx >= 0)
                    this.removeTag(idx);
            }
        });
    }
    // ── Public API ─────────────────────────────────────────────────────────────
    getTags() { return [...this._tags]; }
    setTags(tags) {
        this._tags = [...tags];
        this.render();
        this._bindEvents();
        this._emit('change');
    }
    addTag(tag) {
        const maxAttr = this.getAttribute('max');
        const minLen = parseInt(this.getAttribute('min-length') ?? '1', 10);
        const maxLen = this.getAttribute('max-length');
        const allowDup = this.hasAttribute('duplicate');
        tag = tag.trim();
        if (!tag || tag.length < minLen)
            return;
        if (maxLen && tag.length > parseInt(maxLen, 10))
            return;
        if (!allowDup && this._tags.includes(tag))
            return;
        if (maxAttr && this._tags.length >= parseInt(maxAttr, 10)) {
            this.dispatchEvent(new CustomEvent('max-reached', { bubbles: true, composed: true }));
            return;
        }
        this._tags.push(tag);
        this.render();
        this._bindEvents();
        this.dispatchEvent(new CustomEvent('add', { detail: { tag }, bubbles: true, composed: true }));
        this._emit('change');
    }
    removeTag(index) {
        const tag = this._tags[index];
        if (tag === undefined)
            return;
        this._tags.splice(index, 1);
        this.render();
        this._bindEvents();
        this.dispatchEvent(new CustomEvent('remove', { detail: { tag, index }, bubbles: true, composed: true }));
        this._emit('change');
        this.$('#input')?.focus();
    }
    clear() { this.setTags([]); }
    _emit(event) {
        this.dispatchEvent(new CustomEvent(event, {
            detail: { tags: [...this._tags] }, bubbles: true, composed: true,
        }));
    }
    _escape(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    attributeChangedCallback(name, oldVal, newVal) {
        if (oldVal === newVal || !this._mounted)
            return;
        if (name === 'value') {
            this._tags = (newVal ?? '').split(',').map(t => t.trim()).filter(Boolean);
        }
        this.render();
        this._bindEvents();
    }
}
defineComponent('nc-tag-input', NcTagInput);

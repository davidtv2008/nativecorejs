/**
 * NcCode Component - syntax-highlighted code block with copy button
 *
 * Performs simple tokenization for common languages so it works
 * without a runtime dependency (zero JS syntax libraries).
 *
 * Attributes:
 *   language  - 'typescript'|'javascript'|'html'|'css'|'json'|'bash'|'text' (default: 'text')
 *   label     - optional filename / caption shown in header bar
 *   no-copy   - boolean - hide the copy button
 *   no-lines  - boolean - hide line numbers
 *   max-height - CSS value e.g. '400px' - sets overflow-y: auto
 *   highlight - comma-separated 1-based line numbers to highlight (e.g. "2,4,6")
 *   wrap      - boolean - enable word wrap
 *
 * Slots:
 *   (default) - code content (plain text; HTML will be escaped automatically)
 *               OR use the `code` attribute for programmatic use.
 *
 * code property:
 *   el.code = '...' - set code programmatically (overrides slot content)
 *
 * Usage:
 *   <nc-code language="typescript" label="app.ts">
 *     const x = useState(0);
 *   </nc-code>
 */
import { Component, defineComponent } from '../../.nativecore/core/component.js';

// -- Simple tokenizer ---------------------------------------------------------

const KEYWORDS_JS  = new Set(['const','let','var','function','return','import','export','default','class','extends','new','this','super','if','else','for','while','do','switch','case','break','continue','try','catch','finally','throw','typeof','instanceof','in','of','async','await','yield','static','get','set','null','undefined','true','false','void','delete']);
const KEYWORDS_TS  = new Set([...KEYWORDS_JS,'type','interface','enum','namespace','declare','abstract','as','from','implements','keyof','readonly','infer','never','unknown','any','string','number','boolean','object','symbol','bigint']);
function escHtml(s: string): string {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function tokenize(code: string, lang: string): string {
    if (lang === 'json') return tokenizeJson(code);
    if (lang === 'html') return tokenizeHtml(code);
    if (lang === 'css')  return tokenizeCss(code);
    if (lang === 'bash' || lang === 'text') return escHtml(code);
    // JS / TS
    const kw = lang === 'typescript' ? KEYWORDS_TS : KEYWORDS_JS;
    let result = '';
    let i = 0;
    const src = code;
    while (i < src.length) {
        // Single-line comment
        if (src[i] === '/' && src[i+1] === '/') {
            const end = src.indexOf('\n', i);
            const chunk = end === -1 ? src.slice(i) : src.slice(i, end);
            result += `<span class="t-comment">${escHtml(chunk)}</span>`;
            i += chunk.length; continue;
        }
        // Multi-line comment
        if (src[i] === '/' && src[i+1] === '*') {
            const end = src.indexOf('*/', i+2);
            const chunk = end === -1 ? src.slice(i) : src.slice(i, end+2);
            result += `<span class="t-comment">${escHtml(chunk)}</span>`;
            i += chunk.length; continue;
        }
        // Template literal
        if (src[i] === '`') {
            let j = i+1;
            while (j < src.length && src[j] !== '`') {
                if (src[j] === '\\') j++;
                j++;
            }
            const chunk = src.slice(i, j+1);
            result += `<span class="t-string">${escHtml(chunk)}</span>`;
            i = j+1; continue;
        }
        // String
        if (src[i] === '"' || src[i] === "'") {
            const q = src[i]; let j = i+1;
            while (j < src.length && src[j] !== q) {
                if (src[j] === '\\') j++;
                j++;
            }
            const chunk = src.slice(i, j+1);
            result += `<span class="t-string">${escHtml(chunk)}</span>`;
            i = j+1; continue;
        }
        // Number
        if (/[0-9]/.test(src[i]) && (i === 0 || !/\w/.test(src[i-1]))) {
            let j = i;
            while (j < src.length && /[0-9_.xXeEbBoO]/.test(src[j])) j++;
            result += `<span class="t-number">${escHtml(src.slice(i, j))}</span>`;
            i = j; continue;
        }
        // Identifier / keyword
        if (/[a-zA-Z_$]/.test(src[i])) {
            let j = i;
            while (j < src.length && /\w/.test(src[j])) j++;
            const word = src.slice(i, j);
            if (kw.has(word)) {
                result += `<span class="t-keyword">${escHtml(word)}</span>`;
            } else if (/^[A-Z]/.test(word)) {
                result += `<span class="t-class">${escHtml(word)}</span>`;
            } else {
                result += escHtml(word);
            }
            i = j; continue;
        }
        // Operator chars
        if (/[=><!+\-*/%&|^~?:]/.test(src[i])) {
            result += `<span class="t-op">${escHtml(src[i])}</span>`;
            i++; continue;
        }
        result += escHtml(src[i]); i++;
    }
    return result;
}

function tokenizeJson(code: string): string {
    return escHtml(code)
        .replace(/("(?:[^"\\]|\\.)*")\s*:/g, '<span class="t-attr">$1</span>:')
        .replace(/:\s*("(?:[^"\\]|\\.)*")/g, ': <span class="t-string">$1</span>')
        .replace(/:\s*(-?[0-9]+(?:\.[0-9]+)?)/g, ': <span class="t-number">$1</span>')
        .replace(/:\s*(true|false|null)/g, ': <span class="t-keyword">$1</span>');
}

function tokenizeHtml(code: string): string {
    return escHtml(code)
        .replace(/&lt;!--[\s\S]*?--&gt;/g, m => `<span class="t-comment">${m}</span>`)
        .replace(/(&lt;\/?)([\w:-]+)/g, (_, lt, tag) => `${lt}<span class="t-keyword">${tag}</span>`)
        .replace(/([\w:-]+)=(&quot;[^&]*&quot;)/g, `<span class="t-attr">$1</span>=<span class="t-string">$2</span>`);
}

function tokenizeCss(code: string): string {
    return escHtml(code)
        .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="t-comment">$1</span>')
        .replace(/(#[0-9a-fA-F]{3,8})/g, '<span class="t-number">$1</span>')
        .replace(/([.#]?[\w:-]+)\s*{/g, '<span class="t-class">$1</span> {')
        .replace(/([\w-]+)\s*:/g, '<span class="t-attr">$1</span>:');
}

// -- Component -----------------------------------------------------------------

export class NcCode extends Component {
    static useShadowDOM = true;

    private _code: string | null = null;

    get code(): string { return this._code ?? ''; }
    set code(v: string) { this._code = v; if (this._mounted) this.render(); }

    template() {
        const lang       = this.getAttribute('language') ?? 'text';
        const label      = this.getAttribute('label') ?? '';
        const noCopy     = this.hasAttribute('no-copy');
        const noLines    = this.hasAttribute('no-lines');
        const maxH       = this.getAttribute('max-height') ?? '';
        const wrap       = this.hasAttribute('wrap');
        const hlLines    = new Set((this.getAttribute('highlight') ?? '').split(',').map(s => parseInt(s.trim(), 10)).filter(Boolean));

        // Get code from property, attribute, or slot text
        let raw = this._code ?? '';
        if (!raw) {
            const slot = this.shadowRoot?.querySelector('slot');
            if (slot) {
                raw = slot.assignedNodes({ flatten: true })
                    .map(n => n.textContent ?? '').join('');
            }
        }
        raw = raw.replace(/^\n/, '').replace(/\n$/, '');

        const tokens = tokenize(raw, lang);
        const tokenLines = tokens.split('\n');

        const linesHtml = tokenLines.map((line, i) => {
            const lineNum = i + 1;
            const hl = hlLines.has(lineNum) ? ' class="hl"' : '';
            const lnHtml = noLines ? '' : `<span class="ln" aria-hidden="true">${lineNum}</span>`;
            return `<span${hl}>${lnHtml}<span class="lc">${line || '&ZeroWidthSpace;'}</span></span>`;
        }).join('\n');

        const langLabels: Record<string, string> = {
            typescript: 'TypeScript', javascript: 'JavaScript', html: 'HTML',
            css: 'CSS', json: 'JSON', bash: 'Bash', text: 'Plain text',
        };

        return `
            <style>
                :host {
                    display: block;
                    border-radius: var(--nc-radius-lg);
                    overflow: hidden;
                    background: var(--nc-code-bg, #1a1b26);
                    font-family: var(--nc-font-family-mono, 'SFMono-Regular', Consolas, monospace);
                    font-size: var(--nc-font-size-sm);
                    line-height: 1.6;
                }
                .header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px 14px;
                    background: rgba(255,255,255,.04);
                    border-bottom: 1px solid rgba(255,255,255,.06);
                    font-size: 12px;
                    color: rgba(255,255,255,.5);
                    user-select: none;
                }
                .lang-badge {
                    font-size: 10px;
                    background: rgba(255,255,255,.08);
                    border-radius: 4px;
                    padding: 1px 7px;
                    color: rgba(255,255,255,.6);
                    text-transform: uppercase;
                    letter-spacing: .04em;
                }
                .copy-btn {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    background: none;
                    border: 1px solid rgba(255,255,255,.15);
                    border-radius: 5px;
                    color: rgba(255,255,255,.6);
                    cursor: pointer;
                    font-family: inherit;
                    font-size: 11px;
                    padding: 3px 9px;
                    transition: background .15s, color .15s;
                    outline: none;
                }
                .copy-btn:hover { background: rgba(255,255,255,.08); color: #fff; }
                .copy-btn.done  { color: #4ade80; border-color: #4ade80; }
                pre {
                    margin: 0;
                    padding: 14px 0;
                    overflow-x: auto;
                    ${maxH ? `max-height: ${maxH}; overflow-y: auto;` : ''}
                    ${wrap ? 'white-space: pre-wrap; word-break: break-word;' : ''}
                    scrollbar-width: thin;
                    scrollbar-color: rgba(255,255,255,.12) transparent;
                }
                code {
                    display: block;
                    color: var(--nc-code-text, #c0caf5);
                }
                code > span {
                    display: block;
                    padding: 0 14px;
                    min-height: 1.6em;
                }
                code > span.hl {
                    background: rgba(255,255,200,.07);
                    border-left: 3px solid #fbbf24;
                    padding-left: 11px;
                }
                .ln {
                    display: inline-block;
                    min-width: 30px;
                    color: rgba(255,255,255,.2);
                    user-select: none;
                    font-size: .9em;
                    margin-right: 12px;
                    text-align: right;
                }
                .t-keyword { color: #9d7cd8; }
                .t-string  { color: #9ece6a; }
                .t-number  { color: #ff9e64; }
                .t-comment { color: #565f89; font-style: italic; }
                .t-class   { color: #7dcfff; }
                .t-attr    { color: #f7768e; }
                .t-op      { color: #89ddff; }
                .hidden-slot { display: none; }
            </style>
            <div class="header">
                <span>${label || '&nbsp;'}</span>
                <div style="display:flex;gap:8px;align-items:center">
                    <span class="lang-badge">${langLabels[lang] ?? lang}</span>
                    ${!noCopy ? `<button class="copy-btn" id="copy-btn" type="button">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                        Copy
                    </button>` : ''}
                </div>
            </div>
            <pre><code id="code">${linesHtml}</code></pre>
            <div class="hidden-slot"><slot></slot></div>
        `;
    }

    onMount() {
        this.shadowRoot!.querySelector('slot')?.addEventListener('slotchange', () => {
            if (!this._code) this.render();
        });

        const copyBtn = this.$<HTMLButtonElement>('#copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this._copy(copyBtn));
        }
    }

    private _copy(btn: HTMLButtonElement) {
        const raw = this._code ?? this.$<HTMLElement>('#code')?.textContent?.replace(/\u200B/g, '') ?? '';
        navigator.clipboard.writeText(raw).then(() => {
            btn.textContent = 'Copied!';
            btn.classList.add('done');
            setTimeout(() => {
                btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`;
                btn.classList.remove('done');
            }, 2000);
        });
    }
}

defineComponent('nc-code', NcCode);



/**
 * Minimal markdown renderer for the NativeCore docs page.
 *
 * Scope:
 * - headings (#, ##, ###, ####)
 * - paragraphs
 * - unordered / ordered lists
 * - blockquotes
 * - fenced code blocks
 * - horizontal rules
 * - inline code, links, bold, italics
 *
 * This intentionally avoids external runtime dependencies.
 */
function escapeHtml(input) {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
function slugify(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}
function renderInline(text) {
    let out = escapeHtml(text);
    out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    return out;
}
export function renderMarkdown(markdown, options = {}) {
    const lines = markdown.replace(/\r\n/g, '\n').split('\n');
    const html = [];
    const headings = [];
    const headingIdCounts = options.headingIdCounts ?? new Map();
    let paragraphBuffer = [];
    let inCodeBlock = false;
    let codeLang = '';
    let codeLines = [];
    let inUl = false;
    let inOl = false;
    let inBlockquote = false;
    const flushParagraph = () => {
        if (paragraphBuffer.length === 0)
            return;
        const text = paragraphBuffer.join(' ').trim();
        if (text)
            html.push(`<p>${renderInline(text)}</p>`);
        paragraphBuffer = [];
    };
    const closeLists = () => {
        if (inUl) {
            html.push('</ul>');
            inUl = false;
        }
        if (inOl) {
            html.push('</ol>');
            inOl = false;
        }
    };
    const closeBlockquote = () => {
        if (inBlockquote) {
            html.push('</blockquote>');
            inBlockquote = false;
        }
    };
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('```')) {
            flushParagraph();
            closeLists();
            closeBlockquote();
            if (!inCodeBlock) {
                inCodeBlock = true;
                codeLang = trimmed.slice(3).trim();
                codeLines = [];
            }
            else {
                const className = codeLang ? ` class="language-${escapeHtml(codeLang)}"` : '';
                html.push(`<pre><code${className}>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
                inCodeBlock = false;
                codeLang = '';
                codeLines = [];
            }
            continue;
        }
        if (inCodeBlock) {
            codeLines.push(line);
            continue;
        }
        if (!trimmed) {
            flushParagraph();
            closeLists();
            closeBlockquote();
            continue;
        }
        const headingMatch = /^(#{1,4})\s+(.+)$/.exec(trimmed);
        if (headingMatch) {
            flushParagraph();
            closeLists();
            closeBlockquote();
            const level = headingMatch[1].length;
            const text = headingMatch[2].trim();
            const baseId = slugify(text) || 'section';
            const nextCount = (headingIdCounts.get(baseId) || 0) + 1;
            headingIdCounts.set(baseId, nextCount);
            const id = nextCount === 1 ? baseId : `${baseId}-${nextCount}`;
            headings.push({ level, text, id });
            html.push(`<h${level} id="${id}">${renderInline(text)}</h${level}>`);
            continue;
        }
        if (/^---+$/.test(trimmed) || /^\*\*\*+$/.test(trimmed)) {
            flushParagraph();
            closeLists();
            closeBlockquote();
            html.push('<hr>');
            continue;
        }
        const ulMatch = /^[-*]\s+(.+)$/.exec(trimmed);
        if (ulMatch) {
            flushParagraph();
            closeBlockquote();
            if (inOl) {
                html.push('</ol>');
                inOl = false;
            }
            if (!inUl) {
                html.push('<ul>');
                inUl = true;
            }
            html.push(`<li>${renderInline(ulMatch[1])}</li>`);
            continue;
        }
        const olMatch = /^\d+\.\s+(.+)$/.exec(trimmed);
        if (olMatch) {
            flushParagraph();
            closeBlockquote();
            if (inUl) {
                html.push('</ul>');
                inUl = false;
            }
            if (!inOl) {
                html.push('<ol>');
                inOl = true;
            }
            html.push(`<li>${renderInline(olMatch[1])}</li>`);
            continue;
        }
        const quoteMatch = /^>\s?(.*)$/.exec(trimmed);
        if (quoteMatch) {
            flushParagraph();
            closeLists();
            if (!inBlockquote) {
                html.push('<blockquote>');
                inBlockquote = true;
            }
            html.push(`<p>${renderInline(quoteMatch[1])}</p>`);
            continue;
        }
        paragraphBuffer.push(trimmed);
    }
    flushParagraph();
    closeLists();
    closeBlockquote();
    if (inCodeBlock) {
        const className = codeLang ? ` class="language-${escapeHtml(codeLang)}"` : '';
        html.push(`<pre><code${className}>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
    }
    return {
        html: html.join('\n'),
        headings,
    };
}
export function renderMarkdownToc(headings) {
    const items = headings
        .filter(heading => heading.level >= 2 && heading.level <= 4)
        .map(heading => `
            <a class="docs-toc__link docs-toc__link--h${heading.level}" href="#${heading.id}">${escapeHtml(heading.text)}</a>
        `)
        .join('');
    return items || '<span class="docs-toc__empty">No headings found.</span>';
}
export function splitMarkdownIntoSections(markdown) {
    const lines = markdown.replace(/\r\n/g, '\n').split('\n');
    const chapterLinkAliases = new Map();
    const chapterStarts = lines.reduce((sections, line, index) => {
        const headingMatch = /^##\s+(.+)$/.exec(line.trim());
        if (headingMatch && headingMatch[1].trim().startsWith('Chapter ')) {
            sections.push({ index, title: headingMatch[1].trim() });
        }
        return sections;
    }, []);
    for (const match of markdown.matchAll(/\[[^\]]+\]\(#(chapter-(\d+)[^)]+)\)/g)) {
        const alias = match[1];
        const chapterNumber = match[2];
        if (!chapterLinkAliases.has(chapterNumber)) {
            chapterLinkAliases.set(chapterNumber, alias);
        }
    }
    if (chapterStarts.length === 0) {
        const rendered = renderMarkdown(markdown);
        return [{
                id: rendered.headings[0]?.id ?? 'overview',
                title: rendered.headings.find(heading => heading.level <= 2)?.text ?? 'Overview',
                html: rendered.html,
                headings: rendered.headings,
                isChapter: false,
                aliases: [],
            }];
    }
    const sharedHeadingIdCounts = new Map();
    const sections = [];
    const overviewMarkdown = lines.slice(0, chapterStarts[0].index).join('\n').trim();
    if (overviewMarkdown) {
        const renderedOverview = renderMarkdown(overviewMarkdown, { headingIdCounts: sharedHeadingIdCounts });
        sections.push({
            id: 'overview',
            title: 'Overview',
            html: renderedOverview.html,
            headings: renderedOverview.headings,
            isChapter: false,
            aliases: [],
        });
    }
    chapterStarts.forEach((chapterStart, index) => {
        const chapterEnd = chapterStarts[index + 1]?.index ?? lines.length;
        const chapterMarkdown = lines.slice(chapterStart.index, chapterEnd).join('\n').trim();
        const renderedChapter = renderMarkdown(chapterMarkdown, { headingIdCounts: sharedHeadingIdCounts });
        const chapterHeading = renderedChapter.headings.find(heading => heading.level === 2) ?? renderedChapter.headings[0];
        const chapterNumber = /^Chapter\s+(\d+)/i.exec(chapterHeading?.text ?? chapterStart.title)?.[1];
        const chapterAlias = chapterNumber ? chapterLinkAliases.get(chapterNumber) : undefined;
        const sectionId = chapterAlias ?? chapterHeading?.id ?? slugify(chapterStart.title);
        const aliases = chapterHeading?.id && chapterHeading.id !== sectionId ? [chapterHeading.id] : [];
        sections.push({
            id: sectionId,
            title: chapterHeading?.text ?? chapterStart.title,
            html: renderedChapter.html,
            headings: renderedChapter.headings,
            isChapter: true,
            aliases,
        });
    });
    return sections;
}

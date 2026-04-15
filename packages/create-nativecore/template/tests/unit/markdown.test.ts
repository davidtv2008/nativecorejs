import { describe, expect, it } from 'vitest';
import { renderMarkdown, renderMarkdownToc, splitMarkdownIntoSections } from '../../src/utils/markdown.js';

describe('utils/markdown', () => {
    it('creates stable unique ids for duplicate headings', () => {
        const result = renderMarkdown(`
## Chapter 1
### Routing
### Routing
        `);

        expect(result.headings.map(heading => heading.id)).toEqual([
            'chapter-1',
            'routing',
            'routing-2',
        ]);
        expect(result.html).toContain('<h3 id="routing">Routing</h3>');
        expect(result.html).toContain('<h3 id="routing-2">Routing</h3>');
    });

    it('includes level 4 headings in the table of contents', () => {
        const toc = renderMarkdownToc([
            { level: 2, text: 'Chapter 6: Client-Side Routing', id: 'chapter-6-client-side-routing' },
            { level: 4, text: 'Query Strings and Search Parameters', id: 'query-strings-and-search-parameters' },
        ]);

        expect(toc).toContain('docs-toc__link--h2');
        expect(toc).toContain('docs-toc__link--h4');
        expect(toc).toContain('#query-strings-and-search-parameters');
    });

    it('splits handbook markdown into overview and chapter sections', () => {
        const sections = splitMarkdownIntoSections(`
# NativeCore Handbook

## Preface

[Getting Started](#chapter-1-start)

Welcome.

## Chapter 1: Getting Started with NativeCore

### Setup

## Chapter 2: Routing

### Setup
        `);

        expect(sections.map(section => section.title)).toEqual([
            'Overview',
            'Chapter 1: Getting Started with NativeCore',
            'Chapter 2: Routing',
        ]);
        expect(sections[0].isChapter).toBe(false);
        expect(sections[1].id).toBe('chapter-1-start');
        expect(sections[1].aliases).toEqual(['chapter-1-getting-started-with-nativecore']);
        expect(sections[1].headings[1].id).toBe('setup');
        expect(sections[2].headings[1].id).toBe('setup-2');
    });
});

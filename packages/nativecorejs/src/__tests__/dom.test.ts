import { describe, it, expect, vi, afterEach } from 'vitest';
import { dom, type AttrMap } from '../../.nativecore/utils/dom.js';

describe('dom.create', () => {
    afterEach(() => {
        document.body.replaceChildren();
    });

    it('sets class and text from a flat attribute map', () => {
        const el = dom.create('div', { class: 'x' }, 'hi');
        expect(el.tagName).toBe('DIV');
        expect(el.className).toBe('x');
        expect(el.textContent).toBe('hi');
    });

    it('treats a third-argument element as a child, not props', () => {
        const child = document.createElement('span');
        child.textContent = 'inner';
        const wrap = dom.create('div', { class: 'x' }, child);
        expect(wrap.firstElementChild).toBe(child);
        expect(wrap.textContent).toBe('inner');
    });

    it('writes boolean attributes as present/absent', () => {
        const hidden = dom.create('div', { hidden: true });
        expect(hidden.hasAttribute('hidden')).toBe(true);
        expect(hidden.getAttribute('hidden')).toBe('');

        const shown = dom.create('div', { hidden: false });
        expect(shown.hasAttribute('hidden')).toBe(false);
    });

    it('skips null attribute values', () => {
        const el = dom.create('div', { title: null, id: 'keep' });
        expect(el.hasAttribute('title')).toBe(false);
        expect(el.id).toBe('keep');
    });

    it('throws when a flat attr map value is an object', () => {
        expect(() => {
            dom.create('div', { data: { a: 1 } } as unknown as AttrMap);
        }).toThrow(/attribute "data"/);
    });

    it('sets attrs and props from an options bag', () => {
        const frame = dom.create('iframe', {
            attrs: {
                title: 'Preview',
                allow: 'autoplay; fullscreen; picture-in-picture',
                allowfullscreen: '',
            },
            props: {
                src: 'https://example.com/video',
                allowFullscreen: true,
            },
        });

        expect(frame.getAttribute('title')).toBe('Preview');
        expect(frame.getAttribute('allowfullscreen')).toBe('');
        expect(frame.src).toContain('https://example.com/video');
        expect(frame.allowFullscreen).toBe(true);
    });

    it('assigns custom-element properties by reference', () => {
        class QuizEl extends HTMLElement {
            questions: unknown = null;
            open = false;
        }
        if (!customElements.get('test-quiz-el')) {
            customElements.define('test-quiz-el', QuizEl);
        }

        const questions = [{ number: 1 }];
        const el = dom.create('test-quiz-el', {
            props: { questions, open: true },
        }) as QuizEl;

        expect(el.questions).toBe(questions);
        expect(el.open).toBe(true);
        expect(el.getAttribute('questions')).toBeNull();
    });

    it('treats a string attrs value as a legacy attribute, not an options bag', () => {
        const el = dom.create('div', { attrs: 'legacy' });
        expect(el.getAttribute('attrs')).toBe('legacy');
    });

    it('creates SVG elements when ns is svg', () => {
        const svg = dom.create('svg', { ns: 'svg', attrs: { viewBox: '0 0 16 16' } });
        expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg');
        expect(svg).toBeInstanceOf(SVGElement);
        expect(svg.getAttribute('viewBox')).toBe('0 0 16 16');
    });

    it('writes onclick as an attribute, not addEventListener', () => {
        const spy = vi.spyOn(Element.prototype, 'addEventListener');
        const btn = dom.create('button', { onclick: 'alert(1)' });
        expect(btn.getAttribute('onclick')).toBe('alert(1)');
        expect(spy).not.toHaveBeenCalled();
        spy.mockRestore();
    });

    it('ignores null children and appends rest children after options.children', () => {
        const extra = document.createElement('em');
        extra.textContent = 'B';
        const el = dom.create('p', {
            attrs: { class: 'lead' },
            children: ['A', null, false],
        }, extra);
        expect(el.textContent).toBe('AB');
        expect(el.className).toBe('lead');
    });

    it('lets attrs win over dataset for the same data attribute', () => {
        const el = dom.create('div', {
            attrs: { 'data-quiz-name': 'from-attrs' },
            dataset: { quizName: 'from-dataset' },
        });
        expect(el.getAttribute('data-quiz-name')).toBe('from-attrs');
    });
});

describe('dom attribute and property helpers', () => {
    afterEach(() => {
        document.body.replaceChildren();
    });

    it('removeAttrs removes existing names and ignores missing ones', () => {
        const el = dom.create('button', { disabled: '', 'aria-busy': 'true', type: 'button' });
        const result = dom.removeAttrs(el, 'disabled', 'aria-busy', 'missing');
        expect(result).toBe(el);
        expect(el.hasAttribute('disabled')).toBe(false);
        expect(el.hasAttribute('aria-busy')).toBe(false);
        expect(el.getAttribute('type')).toBe('button');
    });

    it('setProps skips undefined and assigns null', () => {
        const el = document.createElement('div') as HTMLDivElement & {
            questions: unknown;
            open: boolean | null;
        };
        el.questions = [1];
        el.open = true;

        dom.setProps(el, { questions: undefined, open: null });
        expect(el.questions).toEqual([1]);
        expect(el.open).toBeNull();
    });

    it('setAttrs applies boolean and numeric values', () => {
        const el = document.createElement('input');
        document.body.appendChild(el);
        el.id = 'dom-input';
        dom.setAttrs('#dom-input', { disabled: true, maxlength: 8 });
        expect(el.hasAttribute('disabled')).toBe(true);
        expect(el.getAttribute('maxlength')).toBe('8');
    });

    it('assign mutates an existing element without changing namespace', () => {
        const el = document.createElement('div') as HTMLDivElement & { open: boolean };
        dom.assign(el, {
            class: 'card',
            dataset: { hook: 'list' },
            attrs: { hidden: true },
            props: { open: true },
        });
        expect(el.className).toBe('card');
        expect(el.dataset.hook).toBe('list');
        expect(el.hasAttribute('hidden')).toBe(true);
        expect(el.open).toBe(true);
    });

    it('returns null when the target selector is missing', () => {
        expect(dom.setAttrs('#missing-el', { id: 'x' })).toBeNull();
        expect(dom.removeAttrs('#missing-el', 'id')).toBeNull();
        expect(dom.setProps('#missing-el', { open: true })).toBeNull();
        expect(dom.assign('#missing-el', { attrs: { class: 'x' } })).toBeNull();
    });
});

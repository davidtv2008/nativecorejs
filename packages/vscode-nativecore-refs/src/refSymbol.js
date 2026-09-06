'use strict';

/**
 * Detect a NativeCore ref symbol under the cursor.
 * Supports:
 *   - HTML / template: ref="name" | ref='name'
 *   - JS/TS: this.name | this['name'] | this["name"]
 *   - assertRefs('name', ...) / assertRefs("name", ...)
 */

const REF_ATTR_RE = /\bref\s*=\s*(["'])([A-Za-z_$][\w$]*)\1/g;
const THIS_MEMBER_RE = /\bthis\.([A-Za-z_$][\w$]*)\b/g;
const THIS_BRACKET_RE = /\bthis\[\s*(["'])([A-Za-z_$][\w$]*)\1\s*\]/g;
const ASSERT_REFS_RE = /\bassertRefs\s*\(([^)]*)\)/g;
const ASSERT_ARG_RE = /(["'])([A-Za-z_$][\w$]*)\1/g;

/**
 * @param {import('vscode').TextDocument} document
 * @param {import('vscode').Position} position
 * @returns {{ name: string, kind: 'attr' | 'member' | 'assert', range: import('vscode').Range } | null}
 */
function getRefSymbolAtPosition(document, position) {
    const line = document.lineAt(position.line).text;
    const offset = position.character;

    const fromAttr = matchOnLine(line, offset, REF_ATTR_RE, (m) => ({
        name: m[2],
        kind: /** @type {const} */ ('attr'),
        start: m.index + m[0].indexOf(m[2]),
        end: m.index + m[0].indexOf(m[2]) + m[2].length,
    }));
    if (fromAttr) {
        return toSymbol(document, position.line, fromAttr);
    }

    const fromMember = matchOnLine(line, offset, THIS_MEMBER_RE, (m) => ({
        name: m[1],
        kind: /** @type {const} */ ('member'),
        start: m.index + m[0].indexOf(m[1]),
        end: m.index + m[0].indexOf(m[1]) + m[1].length,
    }));
    if (fromMember) {
        return toSymbol(document, position.line, fromMember);
    }

    const fromBracket = matchOnLine(line, offset, THIS_BRACKET_RE, (m) => ({
        name: m[2],
        kind: /** @type {const} */ ('member'),
        start: m.index + m[0].indexOf(m[2]),
        end: m.index + m[0].indexOf(m[2]) + m[2].length,
    }));
    if (fromBracket) {
        return toSymbol(document, position.line, fromBracket);
    }

    const fromAssert = findAssertArg(line, offset);
    if (fromAssert) {
        return toSymbol(document, position.line, fromAssert);
    }

    return null;
}

/**
 * @param {string} line
 * @param {number} offset
 * @param {RegExp} re
 * @param {(m: RegExpExecArray) => { name: string, kind: 'attr' | 'member' | 'assert', start: number, end: number }} map
 */
function matchOnLine(line, offset, re, map) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(line)) !== null) {
        const hit = map(m);
        if (offset >= hit.start && offset <= hit.end) {
            return hit;
        }
    }
    return null;
}

/**
 * @param {string} line
 * @param {number} offset
 */
function findAssertArg(line, offset) {
    ASSERT_REFS_RE.lastIndex = 0;
    let call;
    while ((call = ASSERT_REFS_RE.exec(line)) !== null) {
        const args = call[1];
        const argsStart = call.index + call[0].indexOf('(') + 1;
        ASSERT_ARG_RE.lastIndex = 0;
        let arg;
        while ((arg = ASSERT_ARG_RE.exec(args)) !== null) {
            const start = argsStart + arg.index + 1; // skip quote
            const end = start + arg[2].length;
            if (offset >= start && offset <= end) {
                return {
                    name: arg[2],
                    kind: /** @type {const} */ ('assert'),
                    start,
                    end,
                };
            }
        }
    }
    return null;
}

/**
 * @param {import('vscode').TextDocument} document
 * @param {number} line
 * @param {{ name: string, kind: 'attr' | 'member' | 'assert', start: number, end: number }} hit
 */
function toSymbol(document, line, hit) {
    const vscode = require('vscode');
    return {
        name: hit.name,
        kind: hit.kind,
        range: new vscode.Range(line, hit.start, line, hit.end),
    };
}

module.exports = {
    getRefSymbolAtPosition,
    REF_ATTR_RE,
    THIS_MEMBER_RE,
    THIS_BRACKET_RE,
    ASSERT_REFS_RE,
    ASSERT_ARG_RE,
};

'use strict';

const vscode = require('vscode');

const SELECTOR = [
    { language: 'javascript', scheme: 'file' },
    { language: 'typescript', scheme: 'file' },
];

// this.foo = this.state(...)  |  this.foo = this.signal(...)  |  this.foo = this.compute(...)
const DECL_RE = /\bthis\.([A-Za-z_$][\w$]*)\s*=\s*this\.(state|signal|compute|memo)\s*\(/g;
// this.foo.value
const VALUE_RE = /\bthis\.([A-Za-z_$][\w$]*)\.value\b/g;
// this.bind(this.foo
const BIND_RE = /\bthis\.bind\s*\(\s*this\.([A-Za-z_$][\w$]*)\b/g;
// bare this.foo when known as signal (handled via index)
const MEMBER_RE = /\bthis\.([A-Za-z_$][\w$]*)\b/g;

/**
 * @param {import('vscode').ExtensionContext} context
 */
function activate(context) {
    context.subscriptions.push(
        vscode.languages.registerDefinitionProvider(SELECTOR, {
            provideDefinition(document, position) {
                return resolve(document, position, 'definition');
            },
        }),
        vscode.languages.registerReferenceProvider(SELECTOR, {
            provideReferences(document, position) {
                return resolve(document, position, 'references') || [];
            },
        }),
        vscode.languages.registerRenameProvider(SELECTOR, {
            prepareRename(document, position) {
                const hit = symbolAt(document, position);
                if (!hit || !isSignalName(document, hit.name)) {
                    throw new Error('Not a NativeCore signal member.');
                }
                return { range: hit.range, placeholder: hit.name };
            },
            provideRenameEdits(document, position, newName) {
                if (!/^[A-Za-z_$][\w$]*$/.test(newName)) {
                    throw new Error('Invalid identifier.');
                }
                const locs = resolve(document, position, 'references') || [];
                const edit = new vscode.WorkspaceEdit();
                const seen = new Set();
                for (const loc of locs) {
                    const k = `${loc.uri.toString()}:${loc.range.start.line}:${loc.range.start.character}`;
                    if (seen.has(k)) continue;
                    seen.add(k);
                    edit.replace(loc.uri, loc.range, newName);
                }
                return edit;
            },
        })
    );
}

function deactivate() {}

function isEnabled() {
    return vscode.workspace.getConfiguration('nativecoreSignals').get('enabled', true);
}

/**
 * @param {import('vscode').TextDocument} document
 * @returns {Set<string>}
 */
function signalNamesInDoc(document) {
    const text = document.getText();
    const names = new Set();
    DECL_RE.lastIndex = 0;
    let m;
    while ((m = DECL_RE.exec(text)) !== null) {
        names.add(m[1]);
    }
    // also this.foo = useState via assignment from this.state stored earlier — DECL covers main case
    return names;
}

/**
 * @param {import('vscode').TextDocument} document
 * @param {string} name
 */
function isSignalName(document, name) {
    return signalNamesInDoc(document).has(name);
}

/**
 * @param {import('vscode').TextDocument} document
 * @param {import('vscode').Position} position
 */
function symbolAt(document, position) {
    const line = document.lineAt(position.line).text;
    const offset = position.character;

    // Prefer .value member name
    VALUE_RE.lastIndex = 0;
    let m;
    while ((m = VALUE_RE.exec(line)) !== null) {
        const start = m.index + 'this.'.length;
        const end = start + m[1].length;
        if (offset >= start && offset <= end) {
            return {
                name: m[1],
                range: new vscode.Range(position.line, start, position.line, end),
                kind: 'value',
            };
        }
    }

    BIND_RE.lastIndex = 0;
    while ((m = BIND_RE.exec(line)) !== null) {
        const start = m.index + m[0].lastIndexOf(m[1]);
        const end = start + m[1].length;
        if (offset >= start && offset <= end) {
            return {
                name: m[1],
                range: new vscode.Range(position.line, start, position.line, end),
                kind: 'bind',
            };
        }
    }

    DECL_RE.lastIndex = 0;
    while ((m = DECL_RE.exec(line)) !== null) {
        const start = m.index + 'this.'.length;
        const end = start + m[1].length;
        if (offset >= start && offset <= end) {
            return {
                name: m[1],
                range: new vscode.Range(position.line, start, position.line, end),
                kind: 'decl',
            };
        }
    }

    MEMBER_RE.lastIndex = 0;
    while ((m = MEMBER_RE.exec(line)) !== null) {
        const start = m.index + 'this.'.length;
        const end = start + m[1].length;
        if (offset >= start && offset <= end) {
            return {
                name: m[1],
                range: new vscode.Range(position.line, start, position.line, end),
                kind: 'member',
            };
        }
    }
    return null;
}

/**
 * @param {import('vscode').TextDocument} document
 * @param {import('vscode').Position} position
 * @param {'definition' | 'references'} mode
 */
function resolve(document, position, mode) {
    if (!isEnabled()) return null;
    if (!/\/(controllers|components)\//i.test(document.uri.fsPath.replace(/\\/g, '/'))) {
        // Still allow any file that declares this.state
    }

    const hit = symbolAt(document, position);
    if (!hit) return null;
    if (!isSignalName(document, hit.name) && hit.kind !== 'decl') {
        return null;
    }

    const locs = findAll(document, hit.name);
    if (mode === 'definition') {
        const decl = locs.find((l) => l.isDecl) || locs[0];
        return decl ? new vscode.Location(document.uri, decl.range) : null;
    }
    return locs.map((l) => new vscode.Location(document.uri, l.range));
}

/**
 * @param {import('vscode').TextDocument} document
 * @param {string} name
 */
function findAll(document, name) {
    const text = document.getText();
    const lines = text.split(/\r?\n/);
    /** @type {{ range: vscode.Range, isDecl: boolean }[]} */
    const out = [];

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        const line = lines[lineNum];

        DECL_RE.lastIndex = 0;
        let m;
        while ((m = DECL_RE.exec(line)) !== null) {
            if (m[1] !== name) continue;
            const start = m.index + 'this.'.length;
            out.push({
                range: new vscode.Range(lineNum, start, lineNum, start + name.length),
                isDecl: true,
            });
        }

        VALUE_RE.lastIndex = 0;
        while ((m = VALUE_RE.exec(line)) !== null) {
            if (m[1] !== name) continue;
            const start = m.index + 'this.'.length;
            out.push({
                range: new vscode.Range(lineNum, start, lineNum, start + name.length),
                isDecl: false,
            });
        }

        BIND_RE.lastIndex = 0;
        while ((m = BIND_RE.exec(line)) !== null) {
            if (m[1] !== name) continue;
            const start = m.index + m[0].lastIndexOf(name);
            out.push({
                range: new vscode.Range(lineNum, start, lineNum, start + name.length),
                isDecl: false,
            });
        }

        // other this.name (not .value / not decl) — skip common non-signals if not in set
        MEMBER_RE.lastIndex = 0;
        while ((m = MEMBER_RE.exec(line)) !== null) {
            if (m[1] !== name) continue;
            const start = m.index + 'this.'.length;
            const end = start + name.length;
            // skip if already captured
            if (out.some((o) => o.range.start.line === lineNum && o.range.start.character === start)) {
                continue;
            }
            // skip this.name( calls that aren't signals
            const after = line.slice(end, end + 8);
            if (after.startsWith('(') && !after.startsWith('.value')) {
                // could be method — only include if declared as signal
                continue;
            }
            out.push({
                range: new vscode.Range(lineNum, start, lineNum, end),
                isDecl: false,
            });
        }
    }

    return out;
}

module.exports = { activate, deactivate };

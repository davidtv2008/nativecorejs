'use strict';

const vscode = require('vscode');

const DIAG_CODE = 'nc-prefer-html-tag';
const HTML_IMPORT = "import { html } from '@core-utils/templates.js';";
const SELECTOR = [
    { language: 'javascript', scheme: 'file' },
    { language: 'typescript', scheme: 'file' },
    { language: 'javascriptreact', scheme: 'file' },
    { language: 'typescriptreact', scheme: 'file' },
];

const collection = vscode.languages.createDiagnosticCollection('nativecoreTemplates');

/**
 * @param {import('vscode').ExtensionContext} context
 */
function activate(context) {
    context.subscriptions.push(
        collection,
        vscode.workspace.onDidOpenTextDocument(refresh),
        vscode.workspace.onDidChangeTextDocument((e) => refresh(e.document)),
        vscode.workspace.onDidCloseTextDocument((doc) => collection.delete(doc.uri)),
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('nativecoreTemplates')) {
                vscode.workspace.textDocuments.forEach(refresh);
            }
        }),
        vscode.languages.registerCodeActionsProvider(SELECTOR, new PreferHtmlCodeActionProvider(), {
            providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
        })
    );
    vscode.workspace.textDocuments.forEach(refresh);
}

function deactivate() {
    collection.dispose();
}

/**
 * @param {import('vscode').TextDocument} doc
 */
function refresh(doc) {
    if (!doc || doc.uri.scheme !== 'file') {
        return;
    }
    if (!['javascript', 'typescript', 'javascriptreact', 'typescriptreact'].includes(doc.languageId)) {
        return;
    }

    const warn = vscode.workspace
        .getConfiguration('nativecoreTemplates')
        .get('warnUntaggedTemplate', true);
    if (!warn) {
        collection.delete(doc.uri);
        return;
    }

    const text = doc.getText();
    /** @type {import('vscode').Diagnostic[]} */
    const out = [];

    const fnRe = /template\s*\(\s*\)\s*\{/g;
    let m;
    while ((m = fnRe.exec(text)) !== null) {
        const bodyStart = m.index + m[0].length;
        const bodyEnd = findMatchingBrace(text, bodyStart - 1);
        if (bodyEnd < 0) {
            continue;
        }
        const body = text.slice(bodyStart, bodyEnd);
        const ret = /\breturn\s+(?!html\b|svg\b)(`)/.exec(body);
        if (!ret) {
            continue;
        }
        const abs = bodyStart + ret.index + ret[0].length - 1;
        const after = text.slice(abs + 1, abs + 80);
        if (!/^\s*(?:<!--|<!DOCTYPE\b|<[!?]?\/?[A-Za-z])/.test(after)) {
            continue;
        }
        const pos = doc.positionAt(abs);
        const range = new vscode.Range(pos, pos.translate(0, 1));
        const d = new vscode.Diagnostic(
            range,
            'NativeCore: prefer html`...` in template() so markup is sanitized (highlighting still works without the tag).',
            vscode.DiagnosticSeverity.Information
        );
        d.source = 'NativeCore Templates';
        d.code = DIAG_CODE;
        out.push(d);
    }

    collection.set(doc.uri, out);
}

class PreferHtmlCodeActionProvider {
    /**
     * @param {import('vscode').TextDocument} document
     * @param {import('vscode').Range} _range
     * @param {import('vscode').CodeActionContext} context
     */
    provideCodeActions(document, _range, context) {
        /** @type {import('vscode').CodeAction[]} */
        const actions = [];
        for (const diagnostic of context.diagnostics) {
            if (diagnostic.source !== 'NativeCore Templates' || diagnostic.code !== DIAG_CODE) {
                continue;
            }
            const action = new vscode.CodeAction(
                "Add html` tag",
                vscode.CodeActionKind.QuickFix
            );
            action.diagnostics = [diagnostic];
            action.isPreferred = true;
            action.edit = buildHtmlTagEdit(document, diagnostic.range);
            actions.push(action);
        }
        return actions;
    }
}

/**
 * @param {import('vscode').TextDocument} document
 * @param {import('vscode').Range} backtickRange
 */
function buildHtmlTagEdit(document, backtickRange) {
    const edit = new vscode.WorkspaceEdit();
    edit.insert(document.uri, backtickRange.start, 'html');

    const text = document.getText();
    if (hasHtmlImport(text)) {
        return edit;
    }

    // Merge into existing: import { css } from '@core-utils/templates.js'
    const templatesImport =
        /import\s*\{([^}]*)\}\s*from\s*(['"][^'"]*templates\.js['"])\s*;?/.exec(text);
    if (templatesImport) {
        const names = templatesImport[1];
        const from = templatesImport[2];
        const full = templatesImport[0];
        const start = document.positionAt(templatesImport.index);
        const end = document.positionAt(templatesImport.index + full.length);
        const trimmed = names.trim();
        const nextNames = trimmed ? `${trimmed.replace(/\s+$/, '')}, html` : 'html';
        const semi = /;\s*$/.test(full) ? ';' : '';
        edit.replace(
            document.uri,
            new vscode.Range(start, end),
            `import { ${nextNames} } from ${from}${semi}`
        );
        return edit;
    }

    const insertAt = findImportInsertPosition(document, text);
    edit.insert(document.uri, insertAt, `${HTML_IMPORT}\n`);
    return edit;
}

/**
 * @param {string} text
 */
function hasHtmlImport(text) {
    const re = /import\s*\{([^}]*)\}\s*from\s*['"][^'"]*templates\.js['"]/g;
    let m;
    while ((m = re.exec(text)) !== null) {
        if (/(^|,)\s*html\s*(,|$)/.test(m[1])) {
            return true;
        }
    }
    return /import\s+html\s+from\s*['"][^'"]*templates\.js['"]/.test(text);
}

/**
 * @param {import('vscode').TextDocument} document
 * @param {string} text
 */
function findImportInsertPosition(document, text) {
    let lastImportEnd = 0;
    const importRe = /^import\s.+?;?\s*$/gm;
    let m;
    while ((m = importRe.exec(text)) !== null) {
        lastImportEnd = m.index + m[0].length;
    }
    if (lastImportEnd > 0) {
        const pos = document.positionAt(lastImportEnd);
        return new vscode.Position(pos.line + 1, 0);
    }
    return new vscode.Position(0, 0);
}

/**
 * @param {string} src
 * @param {number} openIdx index of '{'
 */
function findMatchingBrace(src, openIdx) {
    if (src[openIdx] !== '{') {
        return -1;
    }
    let depth = 0;
    for (let i = openIdx; i < src.length; i++) {
        const ch = src[i];
        if (ch === '"' || ch === "'" || ch === '`') {
            const q = ch;
            i++;
            while (i < src.length) {
                if (src[i] === '\\') {
                    i += 2;
                    continue;
                }
                if (src[i] === q) {
                    break;
                }
                i++;
            }
            continue;
        }
        if (ch === '{') {
            depth++;
        } else if (ch === '}') {
            depth--;
            if (depth === 0) {
                return i;
            }
        }
    }
    return -1;
}

module.exports = { activate, deactivate };

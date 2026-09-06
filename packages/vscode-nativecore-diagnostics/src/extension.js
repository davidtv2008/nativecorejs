'use strict';

const vscode = require('vscode');

const collection = vscode.languages.createDiagnosticCollection('nativecore');

/**
 * @param {import('vscode').ExtensionContext} context
 */
function activate(context) {
    context.subscriptions.push(collection);

    const refresh = (doc) => {
        if (!doc || !isEnabled()) {
            return;
        }
        if (!isRelevant(doc)) {
            collection.delete(doc.uri);
            return;
        }
        collection.set(doc.uri, analyze(doc));
    };

    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(refresh),
        vscode.workspace.onDidChangeTextDocument((e) => refresh(e.document)),
        vscode.workspace.onDidCloseTextDocument((doc) => collection.delete(doc.uri)),
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('nativecoreDiagnostics')) {
                vscode.workspace.textDocuments.forEach(refresh);
            }
        })
    );

    vscode.workspace.textDocuments.forEach(refresh);
}

function deactivate() {
    collection.clear();
    collection.dispose();
}

function isEnabled() {
    return vscode.workspace.getConfiguration('nativecoreDiagnostics').get('enabled', true);
}

/**
 * @param {import('vscode').TextDocument} doc
 */
function isRelevant(doc) {
    if (doc.uri.scheme !== 'file') {
        return false;
    }
    const p = doc.uri.fsPath.replace(/\\/g, '/');
    if (p.includes('/node_modules/') || p.includes('/.nativecore/')) {
        return false;
    }
    return (
        doc.languageId === 'html' ||
        doc.languageId === 'javascript' ||
        doc.languageId === 'typescript'
    );
}

/**
 * @param {import('vscode').TextDocument} doc
 * @returns {import('vscode').Diagnostic[]}
 */
function analyze(doc) {
    const cfg = vscode.workspace.getConfiguration('nativecoreDiagnostics');
    /** @type {import('vscode').Diagnostic[]} */
    const out = [];
    const text = doc.getText();
    const path = doc.uri.fsPath.replace(/\\/g, '/');

    if (doc.languageId === 'html' && cfg.get('viewForbiddenTags', true) && /\/views\//i.test(path)) {
        scanForbiddenTags(doc, text, out);
        scanMissingDataView(doc, text, out);
    }

    if (
        (doc.languageId === 'javascript' || doc.languageId === 'typescript') &&
        cfg.get('importJsExtension', true)
    ) {
        scanImportExtensions(doc, text, out);
    }

    if (
        (doc.languageId === 'javascript' || doc.languageId === 'typescript') &&
        cfg.get('topLevelControllers', true) &&
        /\/routes\/routes\.(js|ts)$/i.test(path)
    ) {
        scanTopLevelControllerImports(doc, text, out);
    }

    return out;
}

/**
 * @param {import('vscode').TextDocument} doc
 * @param {string} text
 * @param {import('vscode').Diagnostic[]} out
 */
function scanForbiddenTags(doc, text, out) {
    const re = /<\/?(style|script)\b[^>]*>/gi;
    let m;
    while ((m = re.exec(text)) !== null) {
        const start = doc.positionAt(m.index);
        const end = doc.positionAt(m.index + m[0].length);
        out.push(
            make(
                new vscode.Range(start, end),
                `NativeCore views should be markup only — remove <${m[1].toLowerCase()}> (put CSS/JS in component or global styles).`,
                vscode.DiagnosticSeverity.Warning,
                'nc-view-no-style-script'
            )
        );
    }
}

/**
 * @param {import('vscode').TextDocument} doc
 * @param {string} text
 * @param {import('vscode').Diagnostic[]} out
 */
function scanMissingDataView(doc, text, out) {
    if (!/<div\b/i.test(text)) {
        return;
    }
    if (/\bdata-view\s*=/.test(text)) {
        return;
    }
    out.push(
        make(
            new vscode.Range(0, 0, 0, 1),
            'NativeCore views usually include data-view="…" on the root element.',
            vscode.DiagnosticSeverity.Information,
            'nc-view-data-view'
        )
    );
}

/**
 * @param {import('vscode').TextDocument} doc
 * @param {string} text
 * @param {import('vscode').Diagnostic[]} out
 */
function scanImportExtensions(doc, text, out) {
    const re =
        /\bfrom\s+(['"])(@(?:core|core-utils|core-types|components|services|utils|stores|middleware|routes|config|types|constants|testing|dev)\/[^'"]+|(\.\.?\/[^'"]+))\1/g;
    let m;
    while ((m = re.exec(text)) !== null) {
        const spec = m[2];
        if (/\.(js|ts|json|css|html)(['"])?$/.test(spec) || spec.endsWith('.js')) {
            continue;
        }
        // allow bare package imports without path? filtered by @alias or relative only
        if (!spec.startsWith('@') && !spec.startsWith('.')) {
            continue;
        }
        if (spec.startsWith('@') || spec.startsWith('.')) {
            if (/\.js$/.test(spec)) {
                continue;
            }
            const start = doc.positionAt(m.index + m[0].indexOf(spec));
            const end = doc.positionAt(m.index + m[0].indexOf(spec) + spec.length);
            out.push(
                make(
                    new vscode.Range(start, end),
                    'NativeCore imports should include the .js extension.',
                    vscode.DiagnosticSeverity.Warning,
                    'nc-import-js-ext'
                )
            );
        }
    }
}

/**
 * @param {import('vscode').TextDocument} doc
 * @param {string} text
 * @param {import('vscode').Diagnostic[]} out
 */
function scanTopLevelControllerImports(doc, text, out) {
    const re = /^\s*import\s+.+from\s+(['"])([^'"]*controllers\/[^'"]+)\1/gm;
    let m;
    while ((m = re.exec(text)) !== null) {
        const start = doc.positionAt(m.index);
        const end = doc.positionAt(m.index + m[0].length);
        out.push(
            make(
                new vscode.Range(start, end),
                'Do not import controllers at top level in routes — use createLazyController(…).',
                vscode.DiagnosticSeverity.Warning,
                'nc-no-toplevel-controller-import'
            )
        );
    }
}

/**
 * @param {import('vscode').Range} range
 * @param {string} message
 * @param {import('vscode').DiagnosticSeverity} severity
 * @param {string} code
 */
function make(range, message, severity, code) {
    const d = new vscode.Diagnostic(range, message, severity);
    d.source = 'NativeCore';
    d.code = code;
    return d;
}

module.exports = {
    activate,
    deactivate,
};

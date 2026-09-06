'use strict';

const path = require('path');
const vscode = require('vscode');

const diagnostics = vscode.languages.createDiagnosticCollection('nativecoreParams');

/**
 * @typedef {{
 *   routePath: string,
 *   params: string[],
 *   controllerAbs: string,
 *   routesUri: vscode.Uri,
 *   pathRange: vscode.Range,
 *   projectRoot: string,
 * }} ParamRoute
 */

/** @type {ParamRoute[]} */
let routes = [];

/**
 * @param {import('vscode').ExtensionContext} context
 */
function activate(context) {
    context.subscriptions.push(diagnostics);

    const refresh = async () => {
        await rebuild();
        for (const doc of vscode.workspace.textDocuments) {
            lintDocument(doc);
        }
        vscode.window.setStatusBarMessage('NativeCore Params: index refreshed', 2000);
    };

    context.subscriptions.push(
        vscode.commands.registerCommand('nativecoreParams.refresh', refresh),
        vscode.languages.registerCompletionItemProvider(
            [
                { language: 'javascript', scheme: 'file' },
                { language: 'typescript', scheme: 'file' },
            ],
            { provideCompletionItems },
            '.',
            's' // params
        ),
        vscode.languages.registerDefinitionProvider(
            [
                { language: 'javascript', scheme: 'file' },
                { language: 'typescript', scheme: 'file' },
            ],
            { provideDefinition }
        ),
        vscode.workspace.onDidOpenTextDocument(lintDocument),
        vscode.workspace.onDidChangeTextDocument((e) => lintDocument(e.document)),
        vscode.workspace.onDidCloseTextDocument((doc) => diagnostics.delete(doc.uri)),
        vscode.workspace.onDidSaveTextDocument(async (doc) => {
            if (/routes\.(js|ts)$/i.test(doc.fileName)) {
                await rebuild();
            }
            lintDocument(doc);
        })
    );

    refresh();
}

function deactivate() {
    diagnostics.clear();
    diagnostics.dispose();
}

function isEnabled() {
    return vscode.workspace.getConfiguration('nativecoreParams').get('enabled', true);
}

function norm(p) {
    return String(p).replace(/\\/g, '/').toLowerCase();
}

async function rebuild() {
    routes = [];
    if (!isEnabled()) return;

    const files = await vscode.workspace.findFiles(
        '**/src/routes/routes.{js,ts}',
        '{**/node_modules/**,**/.nativecore/**,**/dist/**}',
        20
    );

    for (const uri of files) {
        let text;
        try {
            text = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8');
        } catch {
            continue;
        }
        const routesDir = path.dirname(uri.fsPath);
        const projectRoot = findProjectRoot(uri.fsPath);
        const lines = text.split(/\r?\n/);

        for (let i = 0; i < lines.length; i++) {
            if (!/r\.register\s*\(/.test(lines[i])) continue;
            let window = lines[i];
            let j = 1;
            while (j <= 8 && i + j < lines.length && !/lazyController\s*\(/.test(window)) {
                window += '\n' + lines[i + j];
                j++;
            }
            const m =
                /r\.register\(\s*(['"`])([^'"`]+)\1\s*,\s*(['"`])([^'"`]+)\3\s*,\s*lazyController\(\s*(['"`])([^'"`]+)\5\s*,\s*(['"`])([^'"`]+)\7/.exec(
                    window
                );
            if (!m) continue;

            const routePath = m[2];
            const params = [...routePath.matchAll(/:([A-Za-z_][\w]*)/g)].map((x) => x[1]);
            if (!params.length) continue;

            const ctrlAbs = path.resolve(routesDir, m[8]);
            const pathStartInWindow = window.indexOf(routePath);
            const absOffset = windowOffsetToAbs(lines, i, pathStartInWindow);
            const start = offsetToPos(text, absOffset);
            const end = start.translate(0, routePath.length);

            routes.push({
                routePath,
                params,
                controllerAbs: ctrlAbs,
                routesUri: uri,
                pathRange: new vscode.Range(start, end),
                projectRoot,
            });
            // also .ts twin
            routes.push({
                routePath,
                params,
                controllerAbs: ctrlAbs.replace(/\.js$/i, '.ts'),
                routesUri: uri,
                pathRange: new vscode.Range(start, end),
                projectRoot,
            });
        }
    }
}

/**
 * @param {string} routeFilePath
 */
function findProjectRoot(routeFilePath) {
    let dir = path.dirname(routeFilePath);
    if (path.basename(dir) === 'routes') dir = path.dirname(dir);
    if (path.basename(dir) === 'src') dir = path.dirname(dir);
    return dir;
}

/**
 * @param {string[]} lines
 * @param {number} startLine
 * @param {number} offsetInWindow
 */
function windowOffsetToAbs(lines, startLine, offsetInWindow) {
    let remaining = offsetInWindow;
    for (let i = startLine; i < lines.length; i++) {
        if (remaining <= lines[i].length) {
            let abs = 0;
            for (let k = 0; k < i; k++) abs += lines[k].length + 1;
            return abs + remaining;
        }
        remaining -= lines[i].length + 1;
    }
    return 0;
}

/**
 * @param {string} text
 * @param {number} offset
 */
function offsetToPos(text, offset) {
    const before = text.slice(0, Math.max(0, offset));
    const parts = before.split(/\r?\n/);
    return new vscode.Position(parts.length - 1, parts[parts.length - 1].length);
}

/**
 * @param {string} fsPath
 * @returns {ParamRoute[]}
 */
function routesForController(fsPath) {
    const key = norm(fsPath);
    return routes.filter((r) => norm(r.controllerAbs) === key);
}

/**
 * @param {import('vscode').TextDocument} document
 * @param {import('vscode').Position} position
 */
function provideCompletionItems(document, position) {
    if (!isEnabled()) return null;
    if (!/\.controller\.(js|ts)$/i.test(document.uri.fsPath)) return null;

    const line = document.lineAt(position.line).text;
    const prefix = line.slice(0, position.character);
    if (!/params(?:\s*\|\|\s*\{\})?\s*\.\s*$/.test(prefix) && !/params\s*\.\s*[A-Za-z_]*$/.test(prefix)) {
        return null;
    }

    const matched = routesForController(document.uri.fsPath);
    if (!matched.length) return null;

    const names = new Set();
    for (const r of matched) {
        for (const p of r.params) names.add(p);
    }

    return [...names].map((name) => {
        const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Field);
        item.detail = 'route param';
        item.documentation = matched
            .filter((r) => r.params.includes(name))
            .map((r) => r.routePath)
            .join('\n');
        return item;
    });
}

/**
 * @param {import('vscode').TextDocument} document
 * @param {import('vscode').Position} position
 */
function provideDefinition(document, position) {
    if (!isEnabled()) return null;
    const range = document.getWordRangeAtPosition(position, /[A-Za-z_][\w]*/);
    if (!range) return null;
    const line = document.lineAt(position.line).text;
    const name = document.getText(range);
    if (!new RegExp(`params\\s*\\.\\s*${name}\\b`).test(line)) return null;

    const matched = routesForController(document.uri.fsPath).filter((r) => r.params.includes(name));
    if (!matched.length) return null;
    return matched.map((r) => new vscode.Location(r.routesUri, r.pathRange));
}

/**
 * @param {import('vscode').TextDocument} doc
 */
function lintDocument(doc) {
    if (!isEnabled()) return;
    if (!vscode.workspace.getConfiguration('nativecoreParams').get('warnUnknown', true)) {
        diagnostics.delete(doc.uri);
        return;
    }
    if (doc.uri.scheme !== 'file' || !/\.controller\.(js|ts)$/i.test(doc.uri.fsPath)) {
        diagnostics.delete(doc.uri);
        return;
    }

    const matched = routesForController(doc.uri.fsPath);
    if (!matched.length) {
        diagnostics.delete(doc.uri);
        return;
    }

    const allowed = new Set();
    for (const r of matched) {
        for (const p of r.params) allowed.add(p);
    }

    /** @type {import('vscode').Diagnostic[]} */
    const out = [];
    const text = doc.getText();
    const re = /\bparams\.([A-Za-z_][\w]*)\b/g;
    let m;
    while ((m = re.exec(text)) !== null) {
        if (allowed.has(m[1])) continue;
        const start = doc.positionAt(m.index + 'params.'.length);
        const end = doc.positionAt(m.index + m[0].length);
        const d = new vscode.Diagnostic(
            new vscode.Range(start, end),
            `Unknown route param "${m[1]}" — route defines: ${[...allowed].join(', ') || '(none)'}`,
            vscode.DiagnosticSeverity.Warning
        );
        d.source = 'NativeCore Params';
        d.code = 'nc-params-unknown';
        out.push(d);
    }
    diagnostics.set(doc.uri, out);
}

module.exports = { activate, deactivate };

'use strict';

const vscode = require('vscode');
const path = require('path');

/**
 * @typedef {{ name: string, fileBase: string, uri: vscode.Uri, exportName: string | null }} MiddlewareEntry
 */

/** @type {MiddlewareEntry[]} */
let middleware = [];

/**
 * @param {import('vscode').ExtensionContext} context
 */
function activate(context) {
    const refresh = async () => {
        await rebuildIndex();
        vscode.window.setStatusBarMessage('NativeCore Middleware: index refreshed', 2000);
    };

    context.subscriptions.push(
        vscode.commands.registerCommand('nativecoreMiddleware.refresh', refresh),
        vscode.languages.registerDefinitionProvider(
            [
                { language: 'javascript', scheme: 'file' },
                { language: 'typescript', scheme: 'file' },
            ],
            { provideDefinition }
        ),
        vscode.languages.registerCompletionItemProvider(
            [
                { language: 'javascript', scheme: 'file' },
                { language: 'typescript', scheme: 'file' },
            ],
            { provideCompletionItems },
            "'",
            '"',
            '['
        ),
        vscode.workspace.onDidSaveTextDocument(async (doc) => {
            if (/middleware/i.test(norm(doc.uri.fsPath)) || /routes\.(js|ts)$/i.test(norm(doc.uri.fsPath))) {
                await rebuildIndex();
            }
        })
    );

    refresh();
}

function deactivate() {}

function isEnabled() {
    return vscode.workspace.getConfiguration('nativecoreMiddleware').get('enabled', true);
}

function norm(p) {
    return String(p).replace(/\\/g, '/');
}

async function rebuildIndex() {
    middleware = [];
    if (!isEnabled()) return;

    const files = await vscode.workspace.findFiles(
        '**/src/middleware/**/*.{js,ts}',
        '{**/node_modules/**,**/.nativecore/**}',
        50
    );
    for (const uri of files) {
        const base = path.basename(uri.fsPath).replace(/\.middleware\.(js|ts)$/i, '').replace(/\.(js|ts)$/i, '');
        let text = '';
        try {
            text = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8');
        } catch {
            continue;
        }
        const exportFn = /export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/.exec(text);
        const exportConst = /export\s+(?:async\s+)?(?:const|let)\s+([A-Za-z_$][\w$]*)/.exec(text);
        const exportName = (exportFn && exportFn[1]) || (exportConst && exportConst[1]) || null;

        middleware.push({
            name: base,
            fileBase: base,
            uri,
            exportName,
        });
        // Also index camelCase without "Middleware" suffix aliases
        if (exportName && exportName !== base) {
            middleware.push({
                name: exportName,
                fileBase: base,
                uri,
                exportName,
            });
            // authMiddleware → auth
            const short = exportName.replace(/Middleware$/, '');
            if (short && short !== exportName) {
                middleware.push({ name: short, fileBase: base, uri, exportName });
            }
        }
    }
}

/**
 * @param {import('vscode').TextDocument} document
 * @param {import('vscode').Position} position
 */
async function provideDefinition(document, position) {
    if (!isEnabled()) return null;
    if (!middleware.length) await rebuildIndex();

    const line = document.lineAt(position.line).text;
    // middleware: ['auth'] or middleware: [authMiddleware]
    const strRange = document.getWordRangeAtPosition(position, /['"][A-Za-z_$][\w$-]*['"]/);
    const idRange = document.getWordRangeAtPosition(position, /[A-Za-z_$][\w$]*/);

    let name = null;
    if (strRange && /middleware/i.test(line)) {
        name = document.getText(strRange).replace(/['"]/g, '');
    } else if (idRange) {
        name = document.getText(idRange);
        if (!/middleware/i.test(name) && !/middleware/i.test(line)) {
            // Still allow when import path mentions middleware
            if (!/middleware/i.test(document.getText())) {
                // Only resolve *Middleware identifiers or known index names
                if (!middleware.some((m) => m.name === name)) return null;
            }
        }
    }
    if (!name) return null;

    const hit = middleware.find((m) => m.name === name || m.fileBase === name || m.exportName === name);
    if (!hit) return null;
    return new vscode.Location(hit.uri, new vscode.Position(0, 0));
}

/**
 * @param {import('vscode').TextDocument} document
 * @param {import('vscode').Position} position
 */
async function provideCompletionItems(document, position) {
    if (!isEnabled()) return null;
    if (!/routes\.(js|ts)$/i.test(norm(document.uri.fsPath))) return null;
    if (!middleware.length) await rebuildIndex();

    const line = document.lineAt(position.line).text;
    if (!/middleware\s*:/.test(line) && !/middleware\s*:\s*\[/.test(document.getText())) {
        // Soft: only when current line mentions middleware
        if (!/middleware/i.test(line)) return null;
    }

    const seen = new Set();
    /** @type {import('vscode').CompletionItem[]} */
    const items = [];
    for (const m of middleware) {
        if (seen.has(m.fileBase)) continue;
        seen.add(m.fileBase);
        const item = new vscode.CompletionItem(m.fileBase, vscode.CompletionItemKind.Reference);
        item.detail = 'NativeCore middleware';
        item.insertText = m.fileBase;
        item.documentation = m.exportName
            ? `File: ${path.basename(m.uri.fsPath)} (export ${m.exportName})`
            : path.basename(m.uri.fsPath);
        items.push(item);
    }
    return items;
}

module.exports = { activate, deactivate };

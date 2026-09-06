'use strict';

const vscode = require('vscode');

const diagnostics = vscode.languages.createDiagnosticCollection('nativecoreStores');

/**
 * @typedef {{ name: string, uri: vscode.Uri, range: vscode.Range }} StoreExport
 */

/** @type {StoreExport[]} */
let stores = [];

/**
 * @param {import('vscode').ExtensionContext} context
 */
function activate(context) {
    context.subscriptions.push(diagnostics);

    const refresh = async () => {
        await rebuildIndex();
        await lintUnused();
        vscode.window.setStatusBarMessage('NativeCore Stores: index refreshed', 2000);
    };

    context.subscriptions.push(
        vscode.commands.registerCommand('nativecoreStores.refresh', refresh),
        vscode.languages.registerDefinitionProvider(
            [
                { language: 'javascript', scheme: 'file' },
                { language: 'typescript', scheme: 'file' },
            ],
            { provideDefinition }
        ),
        vscode.workspace.onDidSaveTextDocument(async (doc) => {
            if (/\/stores\//i.test(norm(doc.uri.fsPath))) {
                await refresh();
            }
        })
    );

    refresh();
}

function deactivate() {
    diagnostics.clear();
    diagnostics.dispose();
}

function isEnabled() {
    return vscode.workspace.getConfiguration('nativecoreStores').get('enabled', true);
}

function norm(p) {
    return String(p).replace(/\\/g, '/');
}

async function rebuildIndex() {
    stores = [];
    if (!isEnabled()) return;

    const files = await vscode.workspace.findFiles(
        '**/src/stores/**/*.{js,ts}',
        '{**/node_modules/**,**/.nativecore/**}',
        100
    );
    for (const uri of files) {
        let text;
        try {
            text = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8');
        } catch {
            continue;
        }
        const doc = await vscode.workspace.openTextDocument(uri);
        const re = /export\s+const\s+([A-Za-z_$][\w$]*Store)\b/g;
        let m;
        while ((m = re.exec(text)) !== null) {
            const name = m[1];
            const start = doc.positionAt(m.index + m[0].indexOf(name));
            const end = doc.positionAt(m.index + m[0].indexOf(name) + name.length);
            stores.push({ name, uri, range: new vscode.Range(start, end) });
        }
        // Also: export { appStore }
        const re2 = /export\s*\{([^}]+)\}/g;
        while ((m = re2.exec(text)) !== null) {
            const parts = m[1].split(',');
            for (const part of parts) {
                const name = part.trim().split(/\s+as\s+/).pop()?.trim();
                if (!name || !/Store$/.test(name)) continue;
                if (stores.some((s) => s.name === name && s.uri.toString() === uri.toString())) {
                    continue;
                }
                const idx = text.indexOf(name, m.index);
                if (idx < 0) continue;
                const start = doc.positionAt(idx);
                const end = doc.positionAt(idx + name.length);
                stores.push({ name, uri, range: new vscode.Range(start, end) });
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
    if (!stores.length) await rebuildIndex();

    const range = document.getWordRangeAtPosition(position, /[A-Za-z_$][\w$]*/);
    if (!range) return null;
    const name = document.getText(range);
    const hit = stores.find((s) => s.name === name);
    if (!hit) return null;
    return new vscode.Location(hit.uri, hit.range);
}

async function lintUnused() {
    if (!vscode.workspace.getConfiguration('nativecoreStores').get('warnUnused', true)) {
        diagnostics.clear();
        return;
    }
    diagnostics.clear();

    for (const store of stores) {
        const used = await isStoreReferenced(store.name, store.uri);
        if (used) continue;

        const d = new vscode.Diagnostic(
            store.range,
            `Store "${store.name}" is never imported elsewhere`,
            vscode.DiagnosticSeverity.Hint
        );
        d.source = 'NativeCore Stores';
        d.code = 'nc-store-unused';
        const existing = diagnostics.get(store.uri) || [];
        diagnostics.set(store.uri, [...existing, d]);
    }
}

/**
 * @param {string} name
 * @param {import('vscode').Uri} selfUri
 */
async function isStoreReferenced(name, selfUri) {
    const files = await vscode.workspace.findFiles(
        '**/src/**/*.{js,ts}',
        '{**/node_modules/**,**/.nativecore/**,**/src/stores/**}',
        400
    );
    const re = new RegExp(`\\b${escapeRegExp(name)}\\b`);
    for (const uri of files) {
        if (uri.toString() === selfUri.toString()) continue;
        let text;
        try {
            text = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8');
        } catch {
            continue;
        }
        if (re.test(text)) return true;
    }
    return false;
}

function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { activate, deactivate };

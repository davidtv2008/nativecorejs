'use strict';

const vscode = require('vscode');
const path = require('path');

const diagnostics = vscode.languages.createDiagnosticCollection('nativecoreRegistry');

/**
 * @typedef {{ tag: string, relPath: string, uri: vscode.Uri, range: vscode.Range }} RegistryEntry
 */

/** @type {RegistryEntry[]} */
let registry = [];

const BUILTIN_TAGS = new Set([
    'data-view',
    'slot',
    'template',
    'script',
    'style',
]);

/**
 * @param {import('vscode').ExtensionContext} context
 */
function activate(context) {
    context.subscriptions.push(diagnostics);

    const refresh = async () => {
        await rebuildIndex();
        await lintOpenViews();
        vscode.window.setStatusBarMessage('NativeCore Registry: index refreshed', 2000);
    };

    context.subscriptions.push(
        vscode.commands.registerCommand('nativecoreRegistry.refresh', refresh),
        vscode.languages.registerDefinitionProvider(
            [
                { language: 'html', scheme: 'file' },
                { language: 'javascript', scheme: 'file' },
                { language: 'typescript', scheme: 'file' },
            ],
            { provideDefinition }
        ),
        vscode.workspace.onDidOpenTextDocument((doc) => lintView(doc)),
        vscode.workspace.onDidChangeTextDocument((e) => lintView(e.document)),
        vscode.workspace.onDidCloseTextDocument((doc) => diagnostics.delete(doc.uri)),
        vscode.workspace.onDidSaveTextDocument(async (doc) => {
            if (/Registry\.(js|ts)$/i.test(norm(doc.uri.fsPath)) || /\/components\//i.test(norm(doc.uri.fsPath))) {
                await rebuildIndex();
            }
            lintView(doc);
        })
    );

    refresh();
}

function deactivate() {
    diagnostics.clear();
    diagnostics.dispose();
}

function isEnabled() {
    return vscode.workspace.getConfiguration('nativecoreRegistry').get('enabled', true);
}

function norm(p) {
    return String(p).replace(/\\/g, '/');
}

async function rebuildIndex() {
    registry = [];
    if (!isEnabled()) return;

    const files = await vscode.workspace.findFiles(
        '**/src/components/**/*Registry*.{js,ts}',
        '{**/node_modules/**,**/.nativecore/**}',
        40
    );
    // Also any file that calls componentRegistry.register / defineComponent
    const more = await vscode.workspace.findFiles(
        '**/src/components/**/*.{js,ts}',
        '{**/node_modules/**,**/.nativecore/**}',
        200
    );

    const seen = new Set();
    for (const uri of [...files, ...more]) {
        if (seen.has(uri.toString())) continue;
        seen.add(uri.toString());
        await indexFile(uri);
    }
}

/**
 * @param {import('vscode').Uri} uri
 */
async function indexFile(uri) {
    let text;
    try {
        text = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8');
    } catch {
        return;
    }
    if (!/register\s*\(|defineComponent\s*\(/.test(text)) return;

    const doc = await vscode.workspace.openTextDocument(uri);
    const folder = vscode.workspace.getWorkspaceFolder(uri);

    // componentRegistry.register('tag', './path.js')
    const regRe = /\.register\s*\(\s*(['"])([a-z][\w-]*)\1\s*,\s*(['"])([^'"]+)\3/g;
    let m;
    while ((m = regRe.exec(text)) !== null) {
        const tag = m[2];
        const relPath = m[4];
        const tagStart = m.index + m[0].indexOf(tag);
        const start = doc.positionAt(tagStart);
        const end = doc.positionAt(tagStart + tag.length);
        const componentUri = resolveComponentUri(uri, relPath, folder);
        registry.push({
            tag,
            relPath,
            uri: componentUri || uri,
            range: new vscode.Range(start, end),
        });
    }

    // defineComponent('tag', Class)
    const defRe = /\bdefineComponent\s*\(\s*(['"])([a-z][\w-]*)\1/g;
    while ((m = defRe.exec(text)) !== null) {
        const tag = m[2];
        if (registry.some((r) => r.tag === tag)) continue;
        const tagStart = m.index + m[0].indexOf(tag);
        const start = doc.positionAt(tagStart);
        const end = doc.positionAt(tagStart + tag.length);
        registry.push({
            tag,
            relPath: path.basename(uri.fsPath),
            uri,
            range: new vscode.Range(start, end),
        });
    }
}

/**
 * @param {import('vscode').Uri} fromUri
 * @param {string} relPath
 * @param {import('vscode').WorkspaceFolder | undefined} folder
 */
function resolveComponentUri(fromUri, relPath, folder) {
    try {
        if (relPath.startsWith('.')) {
            return vscode.Uri.file(path.resolve(path.dirname(fromUri.fsPath), relPath));
        }
        if (folder) {
            // @components/… style unlikely in register string; treat as relative to components/
            return vscode.Uri.joinPath(folder.uri, 'src/components', relPath.replace(/^\.\//, ''));
        }
    } catch {
        /* ignore */
    }
    return null;
}

/**
 * @param {import('vscode').TextDocument} document
 * @param {import('vscode').Position} position
 */
async function provideDefinition(document, position) {
    if (!isEnabled()) return null;
    if (!registry.length) await rebuildIndex();

    let tag = null;
    if (document.languageId === 'html') {
        const range = document.getWordRangeAtPosition(position, /[a-z][\w-]*/);
        if (!range) return null;
        tag = document.getText(range);
    } else {
        const line = document.lineAt(position.line).text;
        const strRange = document.getWordRangeAtPosition(position, /['"][a-z][\w-]*['"]/);
        if (strRange) {
            tag = document.getText(strRange).replace(/['"]/g, '');
        } else {
            const range = document.getWordRangeAtPosition(position, /[a-z][\w-]*/);
            if (range) tag = document.getText(range);
        }
        if (!tag) return null;
        // Prefer when near register/defineComponent or custom tag usage
        if (!/register|defineComponent|<[a-z][\w-]+/.test(line) && !tag.includes('-')) {
            return null;
        }
    }

    if (!tag || !tag.includes('-')) return null;
    const hit = registry.find((r) => r.tag === tag);
    if (!hit) return null;
    return new vscode.Location(hit.uri, new vscode.Position(0, 0));
}

async function lintOpenViews() {
    for (const doc of vscode.workspace.textDocuments) {
        lintView(doc);
    }
}

/**
 * @param {import('vscode').TextDocument} doc
 */
function lintView(doc) {
    if (!isEnabled()) return;
    if (!vscode.workspace.getConfiguration('nativecoreRegistry').get('warnUnregistered', true)) {
        diagnostics.delete(doc.uri);
        return;
    }
    if (doc.uri.scheme !== 'file') return;
    const p = norm(doc.uri.fsPath);
    if (doc.languageId !== 'html' || !/\/views\//i.test(p)) {
        return;
    }

    const tags = new Set(registry.map((r) => r.tag));
    /** @type {import('vscode').Diagnostic[]} */
    const out = [];
    const text = doc.getText();
    const re = /<\/?([a-z][a-z0-9]*-[a-z0-9-]*)\b/gi;
    let m;
    const seen = new Set();
    while ((m = re.exec(text)) !== null) {
        const tag = m[1].toLowerCase();
        if (BUILTIN_TAGS.has(tag) || seen.has(tag + '@' + m.index)) continue;
        seen.add(tag + '@' + m.index);
        if (tags.has(tag)) continue;
        // Skip known non-app tags
        if (tag.startsWith('native-') || tag.startsWith('ion-')) continue;
        const start = doc.positionAt(m.index + m[0].indexOf(m[1]));
        const end = doc.positionAt(m.index + m[0].indexOf(m[1]) + m[1].length);
        const d = new vscode.Diagnostic(
            new vscode.Range(start, end),
            `Custom element <${tag}> is not in the component registry`,
            vscode.DiagnosticSeverity.Warning
        );
        d.source = 'NativeCore Registry';
        d.code = 'nc-registry-unregistered';
        out.push(d);
    }
    diagnostics.set(doc.uri, out);
}

module.exports = { activate, deactivate };

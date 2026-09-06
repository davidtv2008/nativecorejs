'use strict';

const path = require('path');
const vscode = require('vscode');

/**
 * @typedef {{
 *   path: string,
 *   view: string,
 *   controllerExport: string,
 *   controllerRel: string,
 *   projectRoot: string,
 *   routesDir: string,
 *   routesUri: vscode.Uri,
 *   registerLine: number,
 * }} RouteEntry
 */

/** @type {RouteEntry[]} */
let routes = [];
let builtAt = 0;

/**
 * @param {import('vscode').ExtensionContext} context
 */
function activate(context) {
    const refresh = async () => {
        await rebuildIndex();
        vscode.window.setStatusBarMessage('NativeCore Pair: index refreshed', 2000);
    };

    context.subscriptions.push(
        vscode.commands.registerCommand('nativecorePair.refresh', refresh),
        vscode.commands.registerCommand('nativecorePair.openPair', () => openPair(false)),
        vscode.commands.registerCommand('nativecorePair.openRoute', () => openRoute()),
        vscode.commands.registerCommand('nativecorePair.cycle', () => openPair(true)),
        vscode.workspace.onDidSaveTextDocument(async (doc) => {
            if (/routes\.(js|ts)$/i.test(doc.fileName)) {
                await rebuildIndex();
            }
        })
    );

    refresh();
}

function deactivate() {}

function isEnabled() {
    return vscode.workspace.getConfiguration('nativecorePair').get('enabled', true);
}

function norm(p) {
    return String(p).replace(/\\/g, '/').toLowerCase();
}

async function rebuildIndex() {
    routes = [];
    builtAt = Date.now();
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
        for (const r of parseRoutes(text)) {
            routes.push({
                ...r,
                projectRoot,
                routesDir,
                routesUri: uri,
            });
        }
    }
}

/**
 * @param {string} text
 */
function parseRoutes(text) {
    /** @type {Omit<RouteEntry, 'projectRoot' | 'routesDir' | 'routesUri'>[]} */
    const out = [];
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!/r\.register\s*\(/.test(line)) continue;
        let window = line;
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
        out.push({
            path: m[2],
            view: m[4],
            controllerExport: m[6],
            controllerRel: m[8],
            registerLine: i,
        });
    }
    return out;
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
 * @param {boolean} cycle
 */
async function openPair(cycle) {
    if (!isEnabled()) return;
    if (!routes.length || Date.now() - builtAt > 30000) await rebuildIndex();

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showInformationMessage('Open a view, controller, or routes file first.');
        return;
    }

    const fsPath = editor.document.uri.fsPath;
    const kind = classify(fsPath);
    const entry = findEntryForFile(fsPath);

    if (kind === 'routes') {
        // Prefer pair under cursor register, else first
        const line = editor.selection.active.line;
        const near = routes.find(
            (r) =>
                r.routesUri.toString() === editor.document.uri.toString() &&
                Math.abs(r.registerLine - line) <= 8
        );
        const target = near || entry;
        if (!target) {
            vscode.window.showInformationMessage('No route registration under cursor.');
            return;
        }
        await openFile(path.join(target.projectRoot, target.view));
        return;
    }

    if (!entry) {
        const guessed = await guessPair(fsPath, kind);
        if (guessed) {
            await openUri(guessed);
            return;
        }
        vscode.window.showInformationMessage('No paired view/controller found for this file.');
        return;
    }

    if (cycle) {
        const order = ['view', 'controller', 'routes'];
        const next = order[(order.indexOf(kind === 'other' ? 'view' : kind) + 1) % order.length];
        if (next === 'view') {
            await openFile(path.join(entry.projectRoot, entry.view));
        } else if (next === 'controller') {
            await openFile(path.resolve(entry.routesDir, entry.controllerRel));
        } else {
            await openUri(entry.routesUri, entry.registerLine);
        }
        return;
    }

    // Toggle view ↔ controller
    if (kind === 'view') {
        await openFile(path.resolve(entry.routesDir, entry.controllerRel));
    } else {
        await openFile(path.join(entry.projectRoot, entry.view));
    }
}

async function openRoute() {
    if (!isEnabled()) return;
    if (!routes.length) await rebuildIndex();

    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const entry = findEntryForFile(editor.document.uri.fsPath);
    if (!entry) {
        vscode.window.showInformationMessage('No route registration found for this file.');
        return;
    }
    await openUri(entry.routesUri, entry.registerLine);
}

/**
 * @param {string} fsPath
 */
function classify(fsPath) {
    const n = norm(fsPath);
    if (/\/src\/routes\/routes\.(js|ts)$/.test(n)) return 'routes';
    if (/\.html$/.test(n) && /\/views\//.test(n)) return 'view';
    if (/\.controller\.(js|ts)$/.test(n)) return 'controller';
    return 'other';
}

/**
 * @param {string} fsPath
 * @returns {RouteEntry | undefined}
 */
function findEntryForFile(fsPath) {
    const key = norm(fsPath);
    for (const r of routes) {
        const viewAbs = norm(path.join(r.projectRoot, r.view));
        const ctrlAbs = norm(path.resolve(r.routesDir, r.controllerRel));
        const routesAbs = norm(r.routesUri.fsPath);
        if (key === viewAbs || key === ctrlAbs || key === routesAbs) {
            return r;
        }
    }
    return undefined;
}

/**
 * @param {string} fsPath
 * @param {string} kind
 */
async function guessPair(fsPath, kind) {
    const base = path.basename(fsPath);
    const ext = path.extname(base);
    let stem = base.slice(0, -ext.length);
    if (kind === 'controller' || /\.controller\./i.test(base)) {
        stem = stem.replace(/\.controller$/i, '');
        const hits = await vscode.workspace.findFiles(
            `**/views/**/${stem}.html`,
            '{**/node_modules/**,**/.nativecore/**,**/dist/**}',
            5
        );
        return hits[0] || null;
    }
    if (kind === 'view' || ext === '.html') {
        const hits = await vscode.workspace.findFiles(
            `**/controllers/**/${stem}.controller.{js,ts}`,
            '{**/node_modules/**,**/.nativecore/**,**/dist/**}',
            5
        );
        return hits[0] || null;
    }
    return null;
}

/**
 * @param {string} fsPath
 * @param {number} [line]
 */
async function openFile(fsPath, line) {
    try {
        await vscode.workspace.fs.stat(vscode.Uri.file(fsPath));
    } catch {
        vscode.window.showWarningMessage(`File not found: ${fsPath}`);
        return;
    }
    await openUri(vscode.Uri.file(fsPath), line);
}

/**
 * @param {import('vscode').Uri} uri
 * @param {number} [line]
 */
async function openUri(uri, line) {
    const doc = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(doc, { preview: false });
    if (typeof line === 'number' && line >= 0) {
        const pos = new vscode.Position(line, 0);
        editor.selection = new vscode.Selection(pos, pos);
        editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
    }
}

module.exports = { activate, deactivate };

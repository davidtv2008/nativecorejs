'use strict';

const fs = require('fs');
const path = require('path');
const vscode = require('vscode');

const diagnostics = vscode.languages.createDiagnosticCollection('nativecoreOrphans');

/**
 * @typedef {{
 *   path: string,
 *   view: string,
 *   controllerRel: string,
 *   middleware: string[],
 *   projectRoot: string,
 *   routesDir: string,
 *   routesUri: vscode.Uri,
 *   registerLine: number,
 *   viewRange: vscode.Range,
 *   controllerRange: vscode.Range,
 * }} RouteEntry
 */

/** @type {{ routes: RouteEntry[], report: { label: string, uri: vscode.Uri, detail: string }[] }} */
let state = { routes: [], report: [] };

/**
 * @param {import('vscode').ExtensionContext} context
 */
function activate(context) {
    context.subscriptions.push(diagnostics);

    const refresh = async () => {
        await rebuild();
        vscode.window.setStatusBarMessage(
            `NativeCore Orphans: ${state.report.length} issue(s)`,
            3000
        );
    };

    context.subscriptions.push(
        vscode.commands.registerCommand('nativecoreOrphans.refresh', refresh),
        vscode.commands.registerCommand('nativecoreOrphans.show', showReport),
        vscode.workspace.onDidSaveTextDocument(async (doc) => {
            const n = norm(doc.uri.fsPath);
            if (
                /routes\.(js|ts)$/i.test(n) ||
                /\/controllers\//i.test(n) ||
                /\/views\//i.test(n) ||
                /\/middleware\//i.test(n) ||
                /Registry\.(js|ts)$/i.test(n)
            ) {
                await rebuild();
            }
        }),
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('nativecoreOrphans')) {
                refresh();
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
    return vscode.workspace.getConfiguration('nativecoreOrphans').get('enabled', true);
}

function cfg() {
    return vscode.workspace.getConfiguration('nativecoreOrphans');
}

function norm(p) {
    return String(p).replace(/\\/g, '/');
}

function keyPath(p) {
    return norm(p).toLowerCase();
}

async function rebuild() {
    state = { routes: [], report: [] };
    diagnostics.clear();
    if (!isEnabled()) return;

    const routeFiles = await vscode.workspace.findFiles(
        '**/src/routes/routes.{js,ts}',
        '{**/node_modules/**,**/.nativecore/**,**/dist/**}',
        20
    );

    /** @type {Map<string, import('vscode').Diagnostic[]>} */
    const byUri = new Map();

    for (const uri of routeFiles) {
        let text;
        try {
            text = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8');
        } catch {
            continue;
        }
        const routesDir = path.dirname(uri.fsPath);
        const projectRoot = findProjectRoot(uri.fsPath);
        const parsed = parseRoutes(text, uri);
        for (const r of parsed) {
            const entry = { ...r, projectRoot, routesDir, routesUri: uri };
            state.routes.push(entry);

            if (cfg().get('warnMissingTargets', true)) {
                const viewAbs = path.join(projectRoot, r.view);
                if (!exists(viewAbs)) {
                    pushDiag(byUri, uri, r.viewRange, `Missing view file: ${r.view}`, 'nc-orphan-missing-view');
                    state.report.push({
                        label: `Missing view: ${r.view}`,
                        uri,
                        detail: r.path,
                    });
                }
                const ctrlAbs = path.resolve(routesDir, r.controllerRel);
                if (!exists(ctrlAbs) && !exists(ctrlAbs.replace(/\.js$/i, '.ts'))) {
                    pushDiag(
                        byUri,
                        uri,
                        r.controllerRange,
                        `Missing controller: ${r.controllerRel}`,
                        'nc-orphan-missing-controller'
                    );
                    state.report.push({
                        label: `Missing controller: ${r.controllerRel}`,
                        uri,
                        detail: r.path,
                    });
                }
            }
        }
    }

    const referencedViews = new Set();
    const referencedControllers = new Set();
    const referencedMw = new Set();

    for (const r of state.routes) {
        referencedViews.add(keyPath(path.join(r.projectRoot, r.view)));
        referencedControllers.add(keyPath(path.resolve(r.routesDir, r.controllerRel)));
        referencedControllers.add(
            keyPath(path.resolve(r.routesDir, r.controllerRel).replace(/\.js$/i, '.ts'))
        );
        for (const name of r.middleware) {
            referencedMw.add(name.toLowerCase());
        }
    }

    if (cfg().get('warnOrphanViews', true)) {
        const views = await vscode.workspace.findFiles(
            '**/src/views/**/*.html',
            '{**/node_modules/**,**/.nativecore/**,**/dist/**}',
            500
        );
        for (const uri of views) {
            if (referencedViews.has(keyPath(uri.fsPath))) continue;
            // Skip partials/includes heuristics
            const base = path.basename(uri.fsPath).toLowerCase();
            if (base.startsWith('_')) continue;
            pushFileHint(byUri, uri, `Orphan view — not referenced in routes.js`, 'nc-orphan-view');
            state.report.push({ label: `Orphan view: ${vscode.workspace.asRelativePath(uri)}`, uri, detail: 'unreferenced' });
        }
    }

    if (cfg().get('warnOrphanControllers', true)) {
        const controllers = await vscode.workspace.findFiles(
            '**/src/controllers/**/*.controller.{js,ts}',
            '{**/node_modules/**,**/.nativecore/**,**/dist/**}',
            500
        );
        for (const uri of controllers) {
            if (referencedControllers.has(keyPath(uri.fsPath))) continue;
            // Shared helpers often live under controllers/ without being routes
            const base = path.basename(uri.fsPath);
            if (!/\.controller\.(js|ts)$/i.test(base)) continue;
            pushFileHint(byUri, uri, `Orphan controller — not referenced in routes.js`, 'nc-orphan-controller');
            state.report.push({
                label: `Orphan controller: ${vscode.workspace.asRelativePath(uri)}`,
                uri,
                detail: 'unreferenced',
            });
        }
    }

    if (cfg().get('warnOrphanMiddleware', true)) {
        const mws = await vscode.workspace.findFiles(
            '**/src/middleware/**/*.{js,ts}',
            '{**/node_modules/**,**/.nativecore/**,**/dist/**}',
            100
        );
        for (const uri of mws) {
            const base = path.basename(uri.fsPath).replace(/\.middleware\.(js|ts)$/i, '').replace(/\.(js|ts)$/i, '');
            if (referencedMw.has(base.toLowerCase())) continue;
            // Also check if imported anywhere in routes
            const usedInRoutes = state.routes.some((r) =>
                r.middleware.some((m) => m.toLowerCase() === base.toLowerCase())
            );
            if (usedInRoutes) continue;
            pushFileHint(byUri, uri, `Orphan middleware — not listed on any route group`, 'nc-orphan-middleware');
            state.report.push({
                label: `Orphan middleware: ${vscode.workspace.asRelativePath(uri)}`,
                uri,
                detail: 'unreferenced',
            });
        }
    }

    if (cfg().get('warnOrphanComponents', false)) {
        await lintOrphanComponents(byUri);
    }

    for (const [uriStr, diags] of byUri) {
        diagnostics.set(vscode.Uri.parse(uriStr), diags);
    }
}

/**
 * @param {Map<string, import('vscode').Diagnostic[]>} byUri
 */
async function lintOrphanComponents(byUri) {
    const registryFiles = await vscode.workspace.findFiles(
        '**/src/components/**/*Registry*.{js,ts}',
        '{**/node_modules/**,**/.nativecore/**,**/dist/**}',
        40
    );
    /** @type {Set<string>} */
    const registered = new Set();
    for (const uri of registryFiles) {
        let text;
        try {
            text = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8');
        } catch {
            continue;
        }
        const re = /\.register\s*\(\s*['"][^'"]+['"]\s*,\s*['"]([^'"]+)['"]/g;
        let m;
        while ((m = re.exec(text)) !== null) {
            const resolved = path.resolve(path.dirname(uri.fsPath), m[1]);
            registered.add(keyPath(resolved));
            registered.add(keyPath(resolved.replace(/\.js$/i, '.ts')));
        }
    }

    const components = await vscode.workspace.findFiles(
        '**/src/components/{ui,core,app}/**/*.{js,ts}',
        '{**/node_modules/**,**/.nativecore/**,**/dist/**,**/*Registry*}',
        400
    );
    for (const uri of components) {
        if (registered.has(keyPath(uri.fsPath))) continue;
        if (/Registry\.(js|ts)$/i.test(uri.fsPath)) continue;
        pushFileHint(byUri, uri, `Component file not referenced in any *Registry`, 'nc-orphan-component');
        state.report.push({
            label: `Orphan component: ${vscode.workspace.asRelativePath(uri)}`,
            uri,
            detail: 'unregistered',
        });
    }
}

/**
 * @param {string} text
 * @param {import('vscode').Uri} uri
 */
function parseRoutes(text, uri) {
    /** @type {Omit<RouteEntry, 'projectRoot' | 'routesDir' | 'routesUri'>[]} */
    const out = [];
    const lines = text.split(/\r?\n/);
    /** @type {string[]} */
    let stackMw = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const g = /r\.group\(\s*\{([^}]*)\}/.exec(line);
        if (g) {
            const mwMatch = /middleware\s*:\s*\[([^\]]*)\]/.exec(g[1]);
            if (mwMatch) {
                stackMw = mwMatch[1]
                    .split(',')
                    .map((s) => s.trim().replace(/^['"`]|['"`]$/g, ''))
                    .filter(Boolean);
            } else if (!/middleware/.test(g[1])) {
                stackMw = [];
            }
        }

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

        const viewStartInWindow = window.indexOf(m[4]);
        const ctrlStartInWindow = window.lastIndexOf(m[8]);
        const absView = offsetToPos(text, windowOffsetToAbs(lines, i, viewStartInWindow));
        const absCtrl = offsetToPos(text, windowOffsetToAbs(lines, i, ctrlStartInWindow));

        out.push({
            path: m[2],
            view: m[4],
            controllerRel: m[8],
            middleware: [...stackMw],
            registerLine: i,
            viewRange: new vscode.Range(absView, absView.translate(0, m[4].length)),
            controllerRange: new vscode.Range(absCtrl, absCtrl.translate(0, m[8].length)),
        });
    }
    return out;
}

/**
 * @param {string[]} lines
 * @param {number} startLine
 * @param {number} offsetInWindow
 */
function windowOffsetToAbs(lines, startLine, offsetInWindow) {
    let remaining = offsetInWindow;
    for (let i = startLine; i < lines.length; i++) {
        const len = lines[i].length + 1;
        if (remaining < lines[i].length) {
            // compute absolute char offset
            let abs = 0;
            for (let k = 0; k < i; k++) abs += lines[k].length + 1;
            return abs + remaining;
        }
        remaining -= len;
    }
    return 0;
}

/**
 * @param {string} text
 * @param {number} offset
 */
function offsetToPos(text, offset) {
    const before = text.slice(0, Math.max(0, offset));
    const lines = before.split(/\r?\n/);
    const line = lines.length - 1;
    const character = lines[lines.length - 1].length;
    return new vscode.Position(line, character);
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

function exists(p) {
    try {
        return fs.existsSync(p);
    } catch {
        return false;
    }
}

/**
 * @param {Map<string, import('vscode').Diagnostic[]>} byUri
 * @param {import('vscode').Uri} uri
 * @param {import('vscode').Range} range
 * @param {string} message
 * @param {string} code
 */
function pushDiag(byUri, uri, range, message, code) {
    const key = uri.toString();
    if (!byUri.has(key)) byUri.set(key, []);
    const d = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Warning);
    d.source = 'NativeCore Orphans';
    d.code = code;
    byUri.get(key).push(d);
}

/**
 * @param {Map<string, import('vscode').Diagnostic[]>} byUri
 * @param {import('vscode').Uri} uri
 * @param {string} message
 * @param {string} code
 */
function pushFileHint(byUri, uri, message, code) {
    const key = uri.toString();
    if (!byUri.has(key)) byUri.set(key, []);
    const d = new vscode.Diagnostic(
        new vscode.Range(0, 0, 0, 1),
        message,
        vscode.DiagnosticSeverity.Hint
    );
    d.source = 'NativeCore Orphans';
    d.code = code;
    byUri.get(key).push(d);
}

async function showReport() {
    if (!state.report.length) {
        await rebuild();
    }
    if (!state.report.length) {
        vscode.window.showInformationMessage('No NativeCore orphans found.');
        return;
    }
    const pick = await vscode.window.showQuickPick(
        state.report.map((r) => ({
            label: r.label,
            description: r.detail,
            uri: r.uri,
        })),
        { placeHolder: `${state.report.length} orphan / missing target issue(s)` }
    );
    if (!pick) return;
    const doc = await vscode.workspace.openTextDocument(pick.uri);
    await vscode.window.showTextDocument(doc);
}

module.exports = { activate, deactivate };

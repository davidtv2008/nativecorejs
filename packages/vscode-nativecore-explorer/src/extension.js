'use strict';

const path = require('path');
const vscode = require('vscode');

/**
 * @typedef {{
 *   path: string,
 *   view: string,
 *   controllerExport: string,
 *   controllerRel: string,
 *   middleware: string[],
 *   projectRoot: string,
 *   routesDir: string,
 * }} RouteEntry
 */

class RouteTreeProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        /** @type {RouteEntry[]} */
        this.routes = [];
    }

    refresh() {
        this._onDidChangeTreeData.fire();
    }

    /**
     * @param {RouteItem | undefined} element
     */
    getTreeItem(element) {
        return element;
    }

    /**
     * @param {RouteItem | undefined} element
     */
    async getChildren(element) {
        if (!element) {
            await this.loadRoutes();
            if (!this.routes.length) {
                return [
                    new RouteItem(
                        'No routes found (open a NativeCore app with src/routes/routes.js)',
                        vscode.TreeItemCollapsibleState.None,
                        'empty'
                    ),
                ];
            }
            return this.routes.map(
                (r) =>
                    new RouteItem(
                        r.path,
                        vscode.TreeItemCollapsibleState.Collapsed,
                        'route',
                        r
                    )
            );
        }

        if (element.kind === 'route' && element.route) {
            const r = element.route;
            /** @type {RouteItem[]} */
            const children = [];
            if (r.middleware && r.middleware.length) {
                for (const name of r.middleware) {
                    children.push(
                        new RouteItem(
                            `middleware: ${name}`,
                            vscode.TreeItemCollapsibleState.None,
                            'middleware',
                            r,
                            name
                        )
                    );
                }
            } else {
                children.push(
                    new RouteItem(
                        'middleware: (none)',
                        vscode.TreeItemCollapsibleState.None,
                        'meta',
                        r
                    )
                );
            }
            children.push(
                new RouteItem(`view: ${r.view}`, vscode.TreeItemCollapsibleState.None, 'view', r),
                new RouteItem(
                    `controller: ${r.controllerExport}`,
                    vscode.TreeItemCollapsibleState.None,
                    'controller',
                    r
                )
            );
            return children;
        }

        return [];
    }

    async loadRoutes() {
        const routeFiles = await vscode.workspace.findFiles(
            '**/src/routes/routes.{js,ts}',
            '{**/node_modules/**,**/.nativecore/**}',
            20
        );
        /** @type {RouteEntry[]} */
        const all = [];

        for (const uri of routeFiles) {
            let text;
            try {
                text = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8');
            } catch {
                continue;
            }
            const routesDir = path.dirname(uri.fsPath);
            const projectRoot = findProjectRoot(uri.fsPath);
            const parsed = parseRoutes(text).map((r) => ({
                ...r,
                projectRoot,
                routesDir,
            }));
            all.push(...parsed);
        }

        all.sort((a, b) => a.path.localeCompare(b.path));
        this.routes = all;
    }
}

class RouteItem extends vscode.TreeItem {
    /**
     * @param {string} label
     * @param {vscode.TreeItemCollapsibleState} collapsibleState
     * @param {'route' | 'view' | 'controller' | 'meta' | 'middleware' | 'empty'} kind
     * @param {RouteEntry} [route]
     * @param {string} [middlewareName]
     */
    constructor(label, collapsibleState, kind, route, middlewareName) {
        super(label, collapsibleState);
        this.kind = kind;
        this.route = route;
        this.middlewareName = middlewareName;
        this.contextValue = kind;

        if (kind === 'route') {
            this.iconPath = new vscode.ThemeIcon('symbol-method');
            this.tooltip = route
                ? `${route.path}\n${route.view}\n${route.controllerExport}\n${route.projectRoot}`
                : label;
        } else if (kind === 'view' || kind === 'controller') {
            this.iconPath = new vscode.ThemeIcon(
                kind === 'view' ? 'file-code' : 'symbol-class'
            );
            this.command = {
                command: 'nativecoreExplorer.openFile',
                title: kind === 'view' ? 'Open view' : 'Open controller',
                arguments: [kind, route],
            };
        } else if (kind === 'middleware') {
            this.iconPath = new vscode.ThemeIcon('shield');
            this.tooltip = middlewareName
                ? `Open src/middleware/${middlewareName}.middleware.js`
                : label;
            this.command = {
                command: 'nativecoreExplorer.openFile',
                title: 'Open middleware',
                arguments: ['middleware', route, middlewareName],
            };
        } else if (kind === 'meta') {
            this.iconPath = new vscode.ThemeIcon('shield');
        }
    }
}

/**
 * @param {string} text
 * @returns {Omit<RouteEntry, 'projectRoot' | 'routesDir'>[]}
 */
function parseRoutes(text) {
    /** @type {Omit<RouteEntry, 'projectRoot' | 'routesDir'>[]} */
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
        if (!m) {
            continue;
        }
        if (!/r\.register\s*\(/.test(line)) {
            continue;
        }

        out.push({
            path: m[2],
            view: m[4],
            controllerExport: m[6],
            controllerRel: m[8],
            middleware: [...stackMw],
        });
    }

    const seen = new Set();
    return out.filter((r) => {
        const k = `${r.path}|${r.view}|${r.controllerRel}`;
        if (seen.has(k)) {
            return false;
        }
        seen.add(k);
        return true;
    });
}

/**
 * @param {string} routeFilePath
 */
function findProjectRoot(routeFilePath) {
    let dir = path.dirname(routeFilePath);
    if (path.basename(dir) === 'routes') {
        dir = path.dirname(dir);
    }
    if (path.basename(dir) === 'src') {
        dir = path.dirname(dir);
    }
    return dir;
}

/**
 * @param {'view' | 'controller' | 'middleware'} kind
 * @param {RouteEntry} route
 * @param {string} [middlewareName]
 */
function resolveTarget(kind, route, middlewareName) {
    if (kind === 'view') {
        return path.normalize(path.join(route.projectRoot, route.view));
    }
    if (kind === 'controller') {
        return path.normalize(path.resolve(route.routesDir, route.controllerRel));
    }
    if (kind === 'middleware') {
        const name = middlewareName || 'unknown';
        return path.normalize(
            path.join(route.projectRoot, 'src', 'middleware', `${name}.middleware.js`)
        );
    }
    return null;
}

/**
 * Prefer .js middleware; fall back to .ts if present.
 * @param {string} jsPath
 */
async function resolveExistingMiddlewarePath(jsPath) {
    const candidates = [
        jsPath,
        jsPath.replace(/\.js$/i, '.ts'),
        jsPath.replace(/\.middleware\.js$/i, '.js'),
        jsPath.replace(/\.middleware\.js$/i, '.ts'),
    ];
    for (const candidate of candidates) {
        try {
            await vscode.workspace.fs.stat(vscode.Uri.file(candidate));
            return candidate;
        } catch {
            // try next
        }
    }
    return null;
}

/**
 * @param {import('vscode').ExtensionContext} context
 */
function activate(context) {
    const provider = new RouteTreeProvider();
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('nativecoreExplorer.routes', provider),
        vscode.commands.registerCommand('nativecoreExplorer.refresh', () => provider.refresh()),
        vscode.commands.registerCommand(
            'nativecoreExplorer.openFile',
            async (kind, route, middlewareName) => {
                // Tree clicks sometimes pass the TreeItem as the only arg
                if (kind && typeof kind === 'object' && kind.kind) {
                    middlewareName = kind.middlewareName;
                    route = kind.route;
                    kind = kind.kind;
                }
                if (
                    !route ||
                    (kind !== 'view' && kind !== 'controller' && kind !== 'middleware')
                ) {
                    vscode.window.showWarningMessage(
                        'NativeCore Explorer: missing route target (try Refresh).'
                    );
                    return;
                }
                if (!route.projectRoot || !route.routesDir) {
                    vscode.window.showWarningMessage(
                        'NativeCore Explorer: route is missing project paths (try Refresh).'
                    );
                    return;
                }

                let target = resolveTarget(kind, route, middlewareName);
                if (!target) {
                    return;
                }

                if (kind === 'middleware') {
                    const found = await resolveExistingMiddlewarePath(target);
                    if (!found) {
                        // Fallback: createMiddleware('auth'…) in app.js / app.ts
                        const appJs = path.join(route.projectRoot, 'src', 'app.js');
                        const appTs = path.join(route.projectRoot, 'src', 'app.ts');
                        for (const appPath of [appJs, appTs]) {
                            try {
                                await vscode.workspace.fs.stat(vscode.Uri.file(appPath));
                                const doc = await vscode.workspace.openTextDocument(
                                    vscode.Uri.file(appPath)
                                );
                                const text = doc.getText();
                                const needle = middlewareName
                                    ? new RegExp(
                                          `createMiddleware\\(\\s*['\`]${escapeRegExp(middlewareName)}['\`]`
                                      )
                                    : null;
                                let line = 0;
                                if (needle) {
                                    const idx = text.search(needle);
                                    if (idx >= 0) {
                                        line = doc.positionAt(idx).line;
                                    }
                                }
                                await vscode.window.showTextDocument(doc, {
                                    selection: new vscode.Range(line, 0, line, 0),
                                });
                                return;
                            } catch {
                                // continue
                            }
                        }
                        vscode.window.showWarningMessage(
                            `NativeCore Explorer: middleware "${middlewareName}" not found under src/middleware/`
                        );
                        return;
                    }
                    target = found;
                }

                try {
                    const uri = vscode.Uri.file(target);
                    await vscode.workspace.fs.stat(uri);
                    const doc = await vscode.workspace.openTextDocument(uri);
                    await vscode.window.showTextDocument(doc);
                } catch (err) {
                    const msg = err && err.message ? String(err.message) : String(err);
                    vscode.window.showWarningMessage(
                        `NativeCore Explorer: could not open ${target} (${msg})`
                    );
                }
            }
        ),
        vscode.workspace.onDidSaveTextDocument((doc) => {
            if (/routes\.(js|ts)$/i.test(doc.fileName)) {
                provider.refresh();
            }
        })
    );
}

/**
 * @param {string} s
 */
function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function deactivate() {}

module.exports = {
    activate,
    deactivate,
};

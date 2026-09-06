'use strict';

const path = require('path');
const vscode = require('vscode');

/**
 * @typedef {{ path: string, kind: 'ssg' | 'protected' | 'dynamic', view: string, projectRoot: string }} SsgRoute
 */

class SsgTreeProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        /** @type {SsgRoute[]} */
        this.routes = [];
    }

    refresh() {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element) {
        return element;
    }

    async getChildren(element) {
        if (element) {
            if (element.kind === 'group') {
                return this.routes
                    .filter((r) => r.kind === element.groupKind)
                    .map((r) => new SsgItem(r.path, 'route', r));
            }
            return [];
        }

        await this.load();
        const ssg = this.routes.filter((r) => r.kind === 'ssg').length;
        const prot = this.routes.filter((r) => r.kind === 'protected').length;
        const dyn = this.routes.filter((r) => r.kind === 'dynamic').length;

        return [
            new SsgItem(`SSG-eligible (${ssg})`, 'group', null, 'ssg'),
            new SsgItem(`Protected / skipped (${prot})`, 'group', null, 'protected'),
            new SsgItem(`Dynamic / skipped (${dyn})`, 'group', null, 'dynamic'),
        ];
    }

    async load() {
        const files = await vscode.workspace.findFiles(
            '**/src/routes/routes.{js,ts}',
            '{**/node_modules/**,**/.nativecore/**}',
            20
        );
        /** @type {SsgRoute[]} */
        const all = [];
        for (const uri of files) {
            let text;
            try {
                text = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8');
            } catch {
                continue;
            }
            const projectRoot = findProjectRoot(uri.fsPath);
            all.push(...classifyRoutes(text, projectRoot));
        }
        all.sort((a, b) => a.path.localeCompare(b.path));
        this.routes = all;
    }
}

class SsgItem extends vscode.TreeItem {
    /**
     * @param {string} label
     * @param {'group' | 'route'} kind
     * @param {SsgRoute | null} route
     * @param {'ssg' | 'protected' | 'dynamic'} [groupKind]
     */
    constructor(label, kind, route, groupKind) {
        super(
            label,
            kind === 'group'
                ? vscode.TreeItemCollapsibleState.Expanded
                : vscode.TreeItemCollapsibleState.None
        );
        this.kind = kind;
        this.route = route;
        this.groupKind = groupKind;

        if (kind === 'group') {
            this.iconPath = new vscode.ThemeIcon(
                groupKind === 'ssg'
                    ? 'pass'
                    : groupKind === 'protected'
                      ? 'lock'
                      : 'symbol-parameter'
            );
        } else if (route) {
            this.iconPath = new vscode.ThemeIcon('link');
            this.tooltip = `${route.path}\n${route.view}\n${route.kind}`;
            this.command = {
                command: 'vscode.open',
                title: 'Open view',
                arguments: [vscode.Uri.file(path.join(route.projectRoot, route.view))],
            };
            this.description = route.view.split('/').pop();
        }
    }
}

/**
 * @param {string} text
 * @param {string} projectRoot
 * @returns {SsgRoute[]}
 */
function classifyRoutes(text, projectRoot) {
    /** @type {SsgRoute[]} */
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
        if (!/r\.register\s*\(/.test(line)) {
            continue;
        }
        const m =
            /r\.register\(\s*(['"`])([^'"`]+)\1\s*,\s*(['"`])([^'"`]+)\3/.exec(window);
        if (!m) {
            continue;
        }
        const routePath = m[2];
        const view = m[4];
        const dynamic = /[:*]/.test(routePath);
        const protectedMw = stackMw.length > 0;
        /** @type {'ssg' | 'protected' | 'dynamic'} */
        let kind = 'ssg';
        if (dynamic) {
            kind = 'dynamic';
        } else if (protectedMw) {
            kind = 'protected';
        }
        out.push({ path: routePath, kind, view, projectRoot });
    }

    const seen = new Set();
    return out.filter((r) => {
        const k = `${r.projectRoot}|${r.path}|${r.view}`;
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
 * @param {import('vscode').ExtensionContext} context
 */
function activate(context) {
    const provider = new SsgTreeProvider();
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('nativecoreSsg.routes', provider),
        vscode.commands.registerCommand('nativecoreSsg.refresh', () => provider.refresh()),
        vscode.workspace.onDidSaveTextDocument((doc) => {
            if (/routes\.(js|ts)$/i.test(doc.fileName)) {
                provider.refresh();
            }
        })
    );
}

function deactivate() {}

module.exports = { activate, deactivate };

'use strict';

const path = require('path');
const vscode = require('vscode');

/** @type {ContractIndex} */
let index = emptyIndex();
const diagnostics = vscode.languages.createDiagnosticCollection('nativecoreContract');

/**
 * @typedef {{ key: string, template: string, range?: import('vscode').Range, uri?: import('vscode').Uri }} EndpointDef
 * @typedef {{
 *   method: string,
 *   path: string,
 *   template: string,
 *   uri: import('vscode').Uri,
 *   line: number,
 *   controllerClass: string | null,
 *   controllerMethod: string | null,
 *   controllerFqcn: string | null,
 * }} LaravelRoute
 * @typedef {{
 *   endpoints: Map<string, EndpointDef>,
 *   laravel: LaravelRoute[],
 *   controllerFiles: Map<string, import('vscode').Uri>,
 *   loadedAt: number,
 * }} ContractIndex
 */

function emptyIndex() {
    return {
        endpoints: new Map(),
        laravel: [],
        controllerFiles: new Map(),
        loadedAt: 0,
    };
}

/**
 * @param {import('vscode').ExtensionContext} context
 */
function activate(context) {
    const selector = [
        { language: 'javascript', scheme: 'file' },
        { language: 'typescript', scheme: 'file' },
        { language: 'php', scheme: 'file' },
    ];

    context.subscriptions.push(
        diagnostics,
        vscode.languages.registerDefinitionProvider(selector, {
            provideDefinition(document, position) {
                if (!enabled()) {
                    return null;
                }
                return resolveDefinition(document, position);
            },
        }),
        vscode.commands.registerCommand('nativecoreContract.refresh', async () => {
            await rebuildIndex();
            vscode.window.showInformationMessage(
                `NativeCore Contract: ${index.endpoints.size} endpoints, ${index.laravel.length} Laravel routes, ${index.controllerFiles.size} controllers`
            );
            await refreshDiagnostics();
        }),
        vscode.workspace.onDidSaveTextDocument(async (doc) => {
            const p = doc.fileName.replace(/\\/g, '/');
            if (
                /apiEndpoints\.(js|ts)$/i.test(p) ||
                /routes\/api\.php$/i.test(p) ||
                /Http\/Controllers\/.+\.php$/i.test(p)
            ) {
                await rebuildIndex();
                await refreshDiagnostics();
            }
        })
    );

    rebuildIndex().then(() => refreshDiagnostics());
}

function deactivate() {
    diagnostics.dispose();
}

function enabled() {
    return vscode.workspace.getConfiguration('nativecoreContract').get('enabled', true);
}

async function rebuildIndex() {
    const cfg = vscode.workspace.getConfiguration('nativecoreContract');
    const endpointsGlob = cfg.get('endpointsGlob', '**/src/constants/apiEndpoints.{js,ts}');
    const apiPhpGlob = cfg.get('apiPhpGlob', '**/routes/api.php');

    const endpointFiles = await vscode.workspace.findFiles(
        endpointsGlob,
        '{**/node_modules/**,**/.nativecore/**,**/vendor/**}',
        20
    );
    const apiFiles = await vscode.workspace.findFiles(
        apiPhpGlob,
        '{**/node_modules/**,**/vendor/**}',
        20
    );
    const controllerFiles = await vscode.workspace.findFiles(
        '**/app/Http/Controllers/**/*.php',
        '{**/vendor/**,**/node_modules/**}',
        500
    );

    /** @type {Map<string, EndpointDef>} */
    const endpoints = new Map();
    for (const uri of endpointFiles) {
        const text = await readText(uri);
        for (const def of parseEndpoints(text, uri)) {
            endpoints.set(def.key, def);
        }
    }

    /** @type {LaravelRoute[]} */
    const laravel = [];
    for (const uri of apiFiles) {
        const text = await readText(uri);
        laravel.push(...parseLaravelRoutes(text, uri));
    }

    /** @type {Map<string, import('vscode').Uri>} */
    const controllers = new Map();
    for (const uri of controllerFiles) {
        const base = path.basename(uri.fsPath, '.php');
        controllers.set(base, uri);
        // Also key by relative App\Http\Controllers\...
        const norm = uri.fsPath.replace(/\\/g, '/');
        const idx = norm.toLowerCase().lastIndexOf('/app/http/controllers/');
        if (idx >= 0) {
            const rel = norm.slice(idx + '/app/http/controllers/'.length).replace(/\.php$/i, '');
            const fqcn = 'App\\Http\\Controllers\\' + rel.replace(/\//g, '\\');
            controllers.set(fqcn, uri);
            controllers.set(rel.replace(/\//g, '\\'), uri);
        }
    }

    index = {
        endpoints,
        laravel,
        controllerFiles: controllers,
        loadedAt: Date.now(),
    };
}

/**
 * @param {import('vscode').Uri} uri
 */
async function readText(uri) {
    return Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8');
}

/**
 * @param {string} text
 * @param {import('vscode').Uri} uri
 * @returns {EndpointDef[]}
 */
function parseEndpoints(text, uri) {
    /** @type {EndpointDef[]} */
    const out = [];
    const lines = text.split(/\r?\n/);
    let nestedPrefix = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const nestOpen = /^\s*([A-Za-z_$][\w$]*)\s*:\s*\{\s*$/.exec(line);
        if (nestOpen && nestOpen[1] !== 'default') {
            nestedPrefix = nestOpen[1] + '.';
            continue;
        }
        if (/^\s*\},?\s*$/.test(line) && nestedPrefix) {
            nestedPrefix = '';
            continue;
        }

        const staticM = /^\s*([A-Za-z_$][\w$]*)\s*:\s*(['"`])([^'"`]+)\2/.exec(line);
        if (staticM) {
            const key = nestedPrefix + staticM[1];
            out.push({
                key,
                template: normalizeTemplate(staticM[3]),
                uri,
                range: new vscode.Range(
                    i,
                    line.indexOf(staticM[1]),
                    i,
                    line.indexOf(staticM[1]) + staticM[1].length
                ),
            });
            continue;
        }

        const fnM =
            /^\s*([A-Za-z_$][\w$]*)\s*:\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*(['"`])([\s\S]*?)\2/.exec(
                line
            );
        if (fnM) {
            const key = nestedPrefix + fnM[1];
            out.push({
                key,
                template: normalizeTemplate(fnM[3]),
                uri,
                range: new vscode.Range(
                    i,
                    line.indexOf(fnM[1]),
                    i,
                    line.indexOf(fnM[1]) + fnM[1].length
                ),
            });
            continue;
        }

        const fnStart = /^\s*([A-Za-z_$][\w$]*)\s*:\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*$/.exec(
            line
        );
        if (fnStart) {
            let body = '';
            for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
                body += lines[j];
                const qm = /(['"`])([\s\S]*?)\1/.exec(body);
                if (qm) {
                    const key = nestedPrefix + fnStart[1];
                    out.push({
                        key,
                        template: normalizeTemplate(qm[2]),
                        uri,
                        range: new vscode.Range(
                            i,
                            line.indexOf(fnStart[1]),
                            i,
                            line.indexOf(fnStart[1]) + fnStart[1].length
                        ),
                    });
                    break;
                }
            }
        }
    }

    return out;
}

/**
 * @param {string} raw
 */
function normalizeTemplate(raw) {
    let s = raw
        .replace(/\$\{encodeURIComponent\(([^)]+)\)\}/g, '{$1}')
        .replace(/\$\{([^}]+)\}/g, '{$1}');
    s = s.replace(/\{([^}]+)\}/g, (_, name) => {
        const n = String(name).split('.').pop().trim();
        if (/package/i.test(n)) {
            return '{package}';
        }
        if (/module/i.test(n)) {
            return '{module}';
        }
        if (/^slug$/i.test(n) || /courseSlug/i.test(n)) {
            return '{slug}';
        }
        if (/number|quiz/i.test(n) && !/legacy/i.test(n)) {
            return '{number}';
        }
        return `{${n}}`;
    });
    if (!s.startsWith('/')) {
        s = '/' + s;
    }
    return s;
}

/**
 * @param {string} text
 * @param {import('vscode').Uri} uri
 * @returns {LaravelRoute[]}
 */
function parseLaravelRoutes(text, uri) {
    /** @type {Map<string, string>} short class → FQCN */
    const uses = new Map();
    const useRe = /^use\s+(App\\Http\\Controllers\\[A-Za-z0-9_\\]+)\s*;/gm;
    let um;
    while ((um = useRe.exec(text)) !== null) {
        const fqcn = um[1];
        const short = fqcn.split('\\').pop();
        if (short) {
            uses.set(short, fqcn);
        }
        uses.set(fqcn, fqcn);
    }

    /** @type {LaravelRoute[]} */
    const out = [];
    const lines = text.split(/\r?\n/);
    /** @type {string[]} */
    const prefixStack = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        const pref = /Route::prefix\(\s*(['"`])([^'"`]+)\1\s*\)/.exec(line);
        if (pref) {
            prefixStack.push(pref[2].replace(/^\/|\/$/g, ''));
        }
        if (/^\s*\}\);\s*$/.test(line) && prefixStack.length) {
            prefixStack.pop();
        }

        let window = line;
        for (let j = 1; j <= 4 && i + j < lines.length; j++) {
            if (/Route::/.test(lines[i + j])) {
                break;
            }
            window += ' ' + lines[i + j].trim();
            if (/::class/.test(window)) {
                break;
            }
        }

        const m =
            /Route::(get|post|put|patch|delete|options|any)\(\s*(['"`])([^'"`]+)\2\s*,\s*(.+)$/.exec(
                window
            );
        if (!m) {
            continue;
        }

        const method = m[1].toUpperCase();
        let p = m[3];
        if (!p.startsWith('/')) {
            p = '/' + p;
        }
        const prefJoin = prefixStack.length ? '/' + prefixStack.join('/') : '';
        const full =
            prefJoin && !p.startsWith(prefJoin + '/') && p !== prefJoin ? prefJoin + p : p;

        const handler = parseHandler(m[4], uses);

        out.push({
            method,
            path: full,
            template: toMatchTemplate(full),
            uri,
            line: i,
            controllerClass: handler.short,
            controllerMethod: handler.method,
            controllerFqcn: handler.fqcn,
        });
    }

    return out;
}

/**
 * @param {string} rest
 * @param {Map<string, string>} uses
 */
function parseHandler(rest, uses) {
    // [FooController::class, 'show']
    const arr = /\[\s*([A-Za-z_][\w\\]*)::class\s*,\s*['"](\w+)['"]\s*\]/.exec(rest);
    if (arr) {
        const short = arr[1].split('\\').pop() || arr[1];
        const fqcn = uses.get(arr[1]) || uses.get(short) || arr[1];
        return { short, method: arr[2], fqcn };
    }
    // FooController::class (invokable)
    const inv = /([A-Za-z_][\w\\]*)::class/.exec(rest);
    if (inv) {
        const short = inv[1].split('\\').pop() || inv[1];
        const fqcn = uses.get(inv[1]) || uses.get(short) || inv[1];
        return { short, method: '__invoke', fqcn };
    }
    return { short: null, method: null, fqcn: null };
}

/**
 * @param {string} laravelPath
 */
function toMatchTemplate(laravelPath) {
    return laravelPath.replace(/\{[^}]+\}/g, (seg) => {
        const inner = seg.slice(1, -1);
        if (/package/i.test(inner)) {
            return '{package}';
        }
        if (/module/i.test(inner)) {
            return '{module}';
        }
        if (/slug/i.test(inner)) {
            return '{slug}';
        }
        if (/number|quiz/i.test(inner)) {
            return '{number}';
        }
        return '{param}';
    });
}

/**
 * @param {string} a
 * @param {string} b
 */
function templatesMatch(a, b) {
    const norm = (t) =>
        t
            .replace(/\{[^}]+\}/g, '{param}')
            .replace(/\/+/g, '/')
            .replace(/\/$/, '')
            .toLowerCase();
    return norm(a) === norm(b);
}

/**
 * @param {import('vscode').TextDocument} document
 * @param {import('vscode').Position} position
 */
async function resolveDefinition(document, position) {
    if (Date.now() - index.loadedAt > 30000) {
        await rebuildIndex();
    }

    const line = document.lineAt(position.line).text;
    const hit = symbolAt(line, position.character);
    if (!hit) {
        return null;
    }

    const def = index.endpoints.get(hit.key);
    if (!def) {
        return null;
    }

    const httpMethod = hit.httpMethod || inferHttpMethodNear(document, position.line);
    let laravelHits = index.laravel.filter((r) => templatesMatch(r.template, def.template));
    if (httpMethod && laravelHits.length > 1) {
        const filtered = laravelHits.filter(
            (r) => r.method === httpMethod || r.method === 'ANY'
        );
        if (filtered.length) {
            laravelHits = filtered;
        }
    }

    if (!laravelHits.length) {
        if (def.uri && def.range) {
            return new vscode.Location(def.uri, def.range);
        }
        return null;
    }

    /** @type {import('vscode').Location[]} */
    const locations = [];
    for (const r of laravelHits) {
        const controllerLoc = await resolveControllerLocation(r);
        if (controllerLoc) {
            locations.push(controllerLoc);
        } else {
            locations.push(new vscode.Location(r.uri, new vscode.Position(r.line, 0)));
        }
    }
    return locations.length === 1 ? locations[0] : locations;
}

/**
 * @param {string} line
 * @param {number} character
 * @returns {{ key: string, httpMethod: string | null } | null}
 */
function symbolAt(line, character) {
    const re = /\bAPI_ENDPOINTS\.((?:[A-Za-z_$][\w$]*\.)*[A-Za-z_$][\w$]*)/g;
    let m;
    while ((m = re.exec(line)) !== null) {
        const start = m.index + 'API_ENDPOINTS.'.length;
        const end = start + m[1].length;
        if (character >= start && character <= end) {
            const httpMethod = inferHttpMethodFromLine(line);
            return { key: m[1], httpMethod };
        }
    }
    return null;
}

/**
 * @param {string} line
 */
function inferHttpMethodFromLine(line) {
    const m = /\bapi\.(getCached|get|post|put|patch|delete)\s*\(/.exec(line);
    if (!m) {
        return null;
    }
    const verb = m[1];
    if (verb === 'getCached' || verb === 'get') {
        return 'GET';
    }
    return verb.toUpperCase();
}

/**
 * Look a few lines above for api.get( when call is split across lines.
 * @param {import('vscode').TextDocument} document
 * @param {number} lineNo
 */
function inferHttpMethodNear(document, lineNo) {
    for (let i = lineNo; i >= Math.max(0, lineNo - 5); i--) {
        const method = inferHttpMethodFromLine(document.lineAt(i).text);
        if (method) {
            return method;
        }
    }
    return null;
}

/**
 * @param {LaravelRoute} route
 */
async function resolveControllerLocation(route) {
    if (!route.controllerClass && !route.controllerFqcn) {
        return null;
    }

    let fileUri =
        (route.controllerFqcn && index.controllerFiles.get(route.controllerFqcn)) ||
        (route.controllerClass && index.controllerFiles.get(route.controllerClass)) ||
        null;

    if (!fileUri && route.controllerClass) {
        const hits = await vscode.workspace.findFiles(
            `**/Http/Controllers/**/${route.controllerClass}.php`,
            '{**/vendor/**}',
            5
        );
        fileUri = hits[0] || null;
    }

    if (!fileUri) {
        return null;
    }

    const text = await readText(fileUri);
    const method = route.controllerMethod || '__invoke';
    const line = findPhpMethodLine(text, method);
    return new vscode.Location(fileUri, new vscode.Position(Math.max(0, line), 0));
}

/**
 * @param {string} php
 * @param {string} method
 */
function findPhpMethodLine(php, method) {
    const lines = php.split(/\r?\n/);
    // public function show(
    const re = new RegExp(
        `function\\s+${method === '__invoke' ? '__invoke' : escapeRegExp(method)}\\s*\\(`
    );
    for (let i = 0; i < lines.length; i++) {
        if (re.test(lines[i])) {
            return i;
        }
    }
    // Invokable sometimes only has __invoke — fallback class opening
    if (method === '__invoke') {
        for (let i = 0; i < lines.length; i++) {
            if (/^\s*class\s+\w+/.test(lines[i])) {
                return i;
            }
        }
    }
    return 0;
}

/**
 * @param {string} s
 */
function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function refreshDiagnostics() {
    if (!enabled()) {
        diagnostics.clear();
        return;
    }
    if (
        !vscode.workspace
            .getConfiguration('nativecoreContract')
            .get('warnMissingBackend', true)
    ) {
        diagnostics.clear();
        return;
    }
    if (!index.laravel.length || !index.endpoints.size) {
        diagnostics.clear();
        return;
    }

    /** @type {Map<string, import('vscode').Diagnostic[]>} */
    const byUri = new Map();

    for (const def of index.endpoints.values()) {
        if (!def.uri || !def.range) {
            continue;
        }
        const hit = index.laravel.some((r) => templatesMatch(r.template, def.template));
        if (hit) {
            continue;
        }
        const key = def.uri.toString();
        const list = byUri.get(key) || [];
        const d = new vscode.Diagnostic(
            def.range,
            `No matching Laravel route found for ${def.key} → ${def.template}`,
            vscode.DiagnosticSeverity.Information
        );
        d.source = 'NativeCore Contract';
        d.code = 'nc-missing-backend-route';
        list.push(d);
        byUri.set(key, list);
    }

    diagnostics.clear();
    for (const [uriStr, list] of byUri) {
        diagnostics.set(vscode.Uri.parse(uriStr), list);
    }
}

module.exports = {
    activate,
    deactivate,
};

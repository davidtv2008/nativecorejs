'use strict';

const vscode = require('vscode');
const path = require('path');

const diagnostics = vscode.languages.createDiagnosticCollection('nativecoreFixtures');

/**
 * @typedef {{ pathTemplate: string, keyPath: string, range: vscode.Range, uri: vscode.Uri }} EndpointHit
 * @typedef {{ path: string, uri: vscode.Uri, line: number }} MockHit
 */

/** @type {{ endpoints: EndpointHit[], mocks: MockHit[], fixtures: Map<string, vscode.Uri>, builtAt: number }} */
let index = { endpoints: [], mocks: [], fixtures: new Map(), builtAt: 0 };

/**
 * @param {import('vscode').ExtensionContext} context
 */
function activate(context) {
    context.subscriptions.push(diagnostics);

    const refresh = async () => {
        await rebuildIndex();
        lintEndpoints();
        vscode.window.setStatusBarMessage('NativeCore Fixtures: index refreshed', 2000);
    };

    context.subscriptions.push(
        vscode.commands.registerCommand('nativecoreFixtures.refresh', refresh),
        vscode.commands.registerCommand('nativecoreFixtures.createFixture', createFixtureForSelection),
        vscode.languages.registerDefinitionProvider(
            [
                { language: 'javascript', scheme: 'file' },
                { language: 'typescript', scheme: 'file' },
            ],
            {
                provideDefinition(document, position) {
                    return provideDefinition(document, position);
                },
            }
        ),
        vscode.workspace.onDidSaveTextDocument(async (doc) => {
            const p = norm(doc.uri.fsPath);
            if (
                /apiEndpoints\.(js|ts)$/i.test(p) ||
                /\/api\//i.test(p) ||
                /fixtures/i.test(p) ||
                /mockApi/i.test(p) ||
                /server\.js$/i.test(p)
            ) {
                await rebuildIndex();
                lintEndpoints();
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
    return vscode.workspace.getConfiguration('nativecoreFixtures').get('enabled', true);
}

function norm(p) {
    return String(p).replace(/\\/g, '/');
}

async function rebuildIndex() {
    index = { endpoints: [], mocks: [], fixtures: new Map(), builtAt: Date.now() };
    if (!isEnabled()) return;

    const endpointFiles = await vscode.workspace.findFiles(
        '**/src/constants/apiEndpoints.{js,ts}',
        '{**/node_modules/**,**/.nativecore/**}',
        10
    );
    for (const uri of endpointFiles) {
        await indexEndpointsFile(uri);
    }

    const mockFiles = await vscode.workspace.findFiles(
        '{**/api/**/*.{js,ts},**/server.js,**/mockApi.js}',
        '{**/node_modules/**,**/.nativecore/**}',
        80
    );
    for (const uri of mockFiles) {
        await indexMockFile(uri);
    }

    const fixtureFiles = await vscode.workspace.findFiles(
        '{**/api/fixtures/**/*.json,**/fixtures/**/*.json,**/mocks/**/*.json}',
        '{**/node_modules/**}',
        200
    );
    for (const uri of fixtureFiles) {
        const rel = vscode.workspace.asRelativePath(uri, false);
        const base = path.basename(uri.fsPath, '.json').toLowerCase();
        index.fixtures.set(base, uri);
        index.fixtures.set(norm(rel).toLowerCase(), uri);
    }
}

/**
 * @param {import('vscode').Uri} uri
 */
async function indexEndpointsFile(uri) {
    let text;
    try {
        text = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8');
    } catch {
        return;
    }
    const doc = await vscode.workspace.openTextDocument(uri);

    // KEY: '/path' or KEY: (id) => `/path/${id}`
    const assignRe =
        /(?:^|\n)\s*(?:export\s+)?(?:const\s+)?([A-Za-z_$][\w$]*)\s*[:=]\s*(?:(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*)?([`'"])([^`'"]+)\2/g;
    let m;
    while ((m = assignRe.exec(text)) !== null) {
        const key = m[1];
        const rawPath = m[3];
        const pathTemplate = normalizePathTemplate(rawPath);
        if (!pathTemplate || pathTemplate.startsWith('http')) continue;
        const pathStart = m.index + m[0].lastIndexOf(rawPath);
        const start = doc.positionAt(pathStart);
        const end = doc.positionAt(pathStart + rawPath.length);
        index.endpoints.push({
            pathTemplate,
            keyPath: key,
            range: new vscode.Range(start, end),
            uri,
        });
    }

    // Nested: cePackage: (id) => `/ce/packages/${id}`
    const nestedRe =
        /([A-Za-z_$][\w$]*)\s*:\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*([`'"])([^`'"]+)\2/g;
    while ((m = nestedRe.exec(text)) !== null) {
        const key = m[1];
        const rawPath = m[3];
        const pathTemplate = normalizePathTemplate(rawPath);
        if (!pathTemplate) continue;
        if (index.endpoints.some((e) => e.keyPath === key && e.uri.toString() === uri.toString())) {
            continue;
        }
        const pathStart = m.index + m[0].lastIndexOf(rawPath);
        const start = doc.positionAt(pathStart);
        const end = doc.positionAt(pathStart + rawPath.length);
        index.endpoints.push({
            pathTemplate,
            keyPath: key,
            range: new vscode.Range(start, end),
            uri,
        });
    }
}

/**
 * @param {string} raw
 */
function normalizePathTemplate(raw) {
    let p = raw.trim();
    // Strip template ${...} → :param
    p = p.replace(/\$\{[^}]+\}/g, ':param');
    p = p.replace(/\/+/g, '/');
    if (!p.startsWith('/')) {
        p = '/' + p;
    }
    // Drop leading /api if present for matching flexibility
    return p;
}

/**
 * @param {import('vscode').Uri} uri
 */
async function indexMockFile(uri) {
    let text;
    try {
        text = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8');
    } catch {
        return;
    }
    const lines = text.split(/\r?\n/);
    const pathLit = /['"`](\/[A-Za-z0-9_./:{}$-]*)['"`]/g;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!/(pathname|path|url|route|===|==|startsWith|endsWith|includes)\b/i.test(line)
            && !/\/api\//.test(line)) {
            // Still capture DEV_*_PATH constants
            if (!/_PATH\s*=/.test(line) && !/pathname/.test(line)) continue;
        }
        pathLit.lastIndex = 0;
        let m;
        while ((m = pathLit.exec(line)) !== null) {
            const p = normalizePathTemplate(m[1]);
            if (p.length < 2) continue;
            index.mocks.push({ path: p, uri, line: i });
        }
    }
}

function lintEndpoints() {
    if (!vscode.workspace.getConfiguration('nativecoreFixtures').get('warnMissing', true)) {
        diagnostics.clear();
        return;
    }
    /** @type {Map<string, import('vscode').Diagnostic[]>} */
    const byUri = new Map();

    for (const ep of index.endpoints) {
        if (hasMockOrFixture(ep.pathTemplate, ep.keyPath)) continue;
        const key = ep.uri.toString();
        if (!byUri.has(key)) byUri.set(key, []);
        const d = new vscode.Diagnostic(
            ep.range,
            `No mock handler or fixture found for ${ep.pathTemplate}`,
            vscode.DiagnosticSeverity.Information
        );
        d.source = 'NativeCore Fixtures';
        d.code = 'nc-fixture-missing';
        byUri.get(key).push(d);
    }

    diagnostics.clear();
    for (const [uriStr, diags] of byUri) {
        diagnostics.set(vscode.Uri.parse(uriStr), diags);
    }
}

/**
 * @param {string} pathTemplate
 * @param {string} keyPath
 */
function hasMockOrFixture(pathTemplate, keyPath) {
    const slug = keyPath.toLowerCase();
    if (index.fixtures.has(slug)) return true;

    const compact = pathTemplate.replace(/:[^/]+/g, ':param').toLowerCase();
    for (const mock of index.mocks) {
        if (pathsCompatible(compact, mock.path.toLowerCase())) return true;
    }

    // Fixture named after last segment
    const last = pathTemplate.split('/').filter(Boolean).pop() || '';
    if (last && index.fixtures.has(last.replace(/:.*/, '').toLowerCase())) return true;

    return false;
}

/**
 * @param {string} a
 * @param {string} b
 */
function pathsCompatible(a, b) {
    const na = a.replace(/^\/api/, '') || '/';
    const nb = b.replace(/^\/api/, '') || '/';
    if (na === nb) return true;
    const ra = na.replace(/:[^/]+/g, '[^/]+');
    try {
        return new RegExp('^' + ra + '$').test(nb) || new RegExp('^' + nb.replace(/:[^/]+/g, '[^/]+') + '$').test(na);
    } catch {
        return false;
    }
}

/**
 * @param {import('vscode').TextDocument} document
 * @param {import('vscode').Position} position
 */
async function provideDefinition(document, position) {
    if (!isEnabled()) return null;
    if (!index.endpoints.length) await rebuildIndex();

    const wordRange =
        document.getWordRangeAtPosition(position, /[A-Za-z_$][\w$]*/) ||
        document.getWordRangeAtPosition(position, /\/[A-Za-z0-9_./:{}$-]*/);
    if (!wordRange) return null;

    const line = document.lineAt(position.line).text;
    const apiEp = /\bAPI_ENDPOINTS\.((?:[A-Za-z_$][\w$]*\.)*[A-Za-z_$][\w$]*)/.exec(line);
    let key = null;
    if (apiEp) {
        const full = apiEp[1];
        const start = line.indexOf(full, apiEp.index);
        const end = start + full.length;
        if (position.character >= start && position.character <= end) {
            key = full.split('.').pop();
        }
    }
    if (!key) {
        key = document.getText(wordRange);
    }

    const ep = index.endpoints.find((e) => e.keyPath === key || e.keyPath.endsWith('.' + key));
    /** @type {import('vscode').Location[]} */
    const locs = [];

    if (ep) {
        for (const mock of index.mocks) {
            if (pathsCompatible(ep.pathTemplate.toLowerCase(), mock.path.toLowerCase())) {
                locs.push(new vscode.Location(mock.uri, new vscode.Position(mock.line, 0)));
            }
        }
        const slug = ep.keyPath.toLowerCase();
        const fix = index.fixtures.get(slug);
        if (fix) {
            locs.push(new vscode.Location(fix, new vscode.Position(0, 0)));
        }
    }

    // Also: F12 on path string in apiEndpoints → mock
    const pathHit = index.endpoints.find(
        (e) =>
            e.uri.toString() === document.uri.toString() &&
            e.range.contains(position)
    );
    if (pathHit) {
        for (const mock of index.mocks) {
            if (pathsCompatible(pathHit.pathTemplate.toLowerCase(), mock.path.toLowerCase())) {
                locs.push(new vscode.Location(mock.uri, new vscode.Position(mock.line, 0)));
            }
        }
    }

    return locs.length ? locs : null;
}

async function createFixtureForSelection() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showInformationMessage('Open an apiEndpoints file or place cursor on an endpoint key.');
        return;
    }
    if (!index.endpoints.length) await rebuildIndex();

    const pos = editor.selection.active;
    const word = editor.document.getWordRangeAtPosition(pos, /[A-Za-z_$][\w$]*/);
    const key = word ? editor.document.getText(word) : null;
    let ep = key ? index.endpoints.find((e) => e.keyPath === key) : null;
    if (!ep) {
        ep = index.endpoints.find(
            (e) => e.uri.toString() === editor.document.uri.toString() && e.range.contains(pos)
        );
    }
    if (!ep) {
        const pick = await vscode.window.showQuickPick(
            index.endpoints.map((e) => ({ label: e.keyPath, description: e.pathTemplate, ep: e })),
            { placeHolder: 'Select endpoint to create a fixture for' }
        );
        if (!pick) return;
        ep = pick.ep;
    }

    const folder = vscode.workspace.getWorkspaceFolder(ep.uri);
    if (!folder) return;

    const relDir = vscode.workspace
        .getConfiguration('nativecoreFixtures')
        .get('fixtureDir', 'api/fixtures');
    const fileName = `${ep.keyPath}.json`;
    const target = vscode.Uri.joinPath(folder.uri, relDir, fileName);

    try {
        await vscode.workspace.fs.stat(target);
        const doc = await vscode.workspace.openTextDocument(target);
        await vscode.window.showTextDocument(doc);
        return;
    } catch {
        /* create */
    }

    const body = Buffer.from(
        JSON.stringify(
            {
                _comment: `Fixture for ${ep.keyPath} (${ep.pathTemplate})`,
                ok: true,
                data: {},
            },
            null,
            2
        ) + '\n',
        'utf8'
    );
    await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(folder.uri, relDir));
    await vscode.workspace.fs.writeFile(target, body);
    index.fixtures.set(ep.keyPath.toLowerCase(), target);
    const doc = await vscode.workspace.openTextDocument(target);
    await vscode.window.showTextDocument(doc);
    lintEndpoints();
}

module.exports = { activate, deactivate };

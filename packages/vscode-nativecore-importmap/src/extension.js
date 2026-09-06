'use strict';

const fs = require('fs');
const path = require('path');
const vscode = require('vscode');

const diagnostics = vscode.languages.createDiagnosticCollection('nativecoreImportmap');

const DEFAULT_ALIASES = {
    '@core': '.nativecore/core',
    '@core-utils': '.nativecore/utils',
    '@core-types': '.nativecore/types',
    '@dev': '.nativecore/dev',
    '@testing': '.nativecore/testing',
    '@components': 'src/components',
    '@services': 'src/services',
    '@utils': 'src/utils',
    '@stores': 'src/stores',
    '@middleware': 'src/middleware',
    '@routes': 'src/routes',
    '@config': 'src/config',
    '@types': 'src/types',
    '@constants': 'src/constants',
};

/**
 * @typedef {{ root: string, aliases: Map<string, string> }} ProjectAliases
 */

/** @type {Map<string, ProjectAliases>} */
const byRoot = new Map();

/**
 * @param {import('vscode').ExtensionContext} context
 */
function activate(context) {
    context.subscriptions.push(diagnostics);

    const refresh = async () => {
        await rebuildAliasIndex();
        for (const doc of vscode.workspace.textDocuments) {
            lintDocument(doc);
        }
        vscode.window.setStatusBarMessage('NativeCore Import Guard: index refreshed', 2000);
    };

    context.subscriptions.push(
        vscode.commands.registerCommand('nativecoreImportmap.refresh', refresh),
        vscode.workspace.onDidOpenTextDocument(lintDocument),
        vscode.workspace.onDidChangeTextDocument((e) => lintDocument(e.document)),
        vscode.workspace.onDidCloseTextDocument((doc) => diagnostics.delete(doc.uri)),
        vscode.workspace.onDidSaveTextDocument(async (doc) => {
            const n = norm(doc.uri.fsPath);
            if (/tsconfig\.json$/i.test(n) || /nativecore\.config\.json$/i.test(n)) {
                await rebuildAliasIndex();
            }
            lintDocument(doc);
        }),
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('nativecoreImportmap')) {
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
    return vscode.workspace.getConfiguration('nativecoreImportmap').get('enabled', true);
}

function cfg() {
    return vscode.workspace.getConfiguration('nativecoreImportmap');
}

function norm(p) {
    return String(p).replace(/\\/g, '/');
}

async function rebuildAliasIndex() {
    byRoot.clear();
    const configs = await vscode.workspace.findFiles(
        '**/nativecore.config.json',
        '{**/node_modules/**,**/.nativecore/**,**/dist/**}',
        20
    );
    const roots = new Set();
    for (const uri of configs) {
        roots.add(path.dirname(uri.fsPath));
    }
    const tscfgs = await vscode.workspace.findFiles(
        '**/tsconfig.json',
        '{**/node_modules/**,**/.nativecore/**,**/dist/**}',
        20
    );
    for (const uri of tscfgs) {
        const root = path.dirname(uri.fsPath);
        if (await looksLikeNativeCore(root)) {
            roots.add(root);
        }
    }

    for (const root of roots) {
        const aliases = new Map();
        for (const [k, v] of Object.entries(DEFAULT_ALIASES)) {
            aliases.set(k, v);
        }
        await mergeTsconfigPaths(root, aliases);
        byRoot.set(norm(root).toLowerCase(), { root, aliases });
    }
}

/**
 * @param {string} root
 */
async function looksLikeNativeCore(root) {
    try {
        await vscode.workspace.fs.stat(vscode.Uri.file(path.join(root, 'nativecore.config.json')));
        return true;
    } catch {
        try {
            await vscode.workspace.fs.stat(vscode.Uri.file(path.join(root, 'src', 'app.js')));
            return true;
        } catch {
            try {
                await vscode.workspace.fs.stat(vscode.Uri.file(path.join(root, 'src', 'app.ts')));
                return true;
            } catch {
                return false;
            }
        }
    }
}

/**
 * @param {string} root
 * @param {Map<string, string>} aliases
 */
async function mergeTsconfigPaths(root, aliases) {
    const uri = vscode.Uri.file(path.join(root, 'tsconfig.json'));
    let text;
    try {
        text = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8');
    } catch {
        return;
    }
    const jsonish = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    let data;
    try {
        data = JSON.parse(jsonish);
    } catch {
        return;
    }
    const paths = data?.compilerOptions?.paths;
    if (!paths || typeof paths !== 'object') return;

    for (const [key, targets] of Object.entries(paths)) {
        if (!Array.isArray(targets) || !targets[0]) continue;
        const alias = key.replace(/\/\*$/, '');
        const target = String(targets[0]).replace(/\/\*$/, '');
        if (alias.startsWith('@') || alias.startsWith('nativecorejs')) {
            aliases.set(alias, target);
        }
    }
}

/**
 * @param {import('vscode').Uri} uri
 * @returns {ProjectAliases | null}
 */
function projectFor(uri) {
    const file = norm(uri.fsPath).toLowerCase();
    let best = null;
    let bestLen = -1;
    for (const [rootKey, proj] of byRoot) {
        if (file.startsWith(rootKey + '/') || file === rootKey) {
            if (rootKey.length > bestLen) {
                best = proj;
                bestLen = rootKey.length;
            }
        }
    }
    return best;
}

/**
 * @param {import('vscode').TextDocument} doc
 */
function lintDocument(doc) {
    if (!isEnabled() || doc.uri.scheme !== 'file') return;
    if (doc.languageId !== 'javascript' && doc.languageId !== 'typescript') {
        diagnostics.delete(doc.uri);
        return;
    }
    const n = norm(doc.uri.fsPath);
    if (n.includes('/node_modules/') || n.includes('/.nativecore/') || n.includes('/dist/')) {
        diagnostics.delete(doc.uri);
        return;
    }
    if (!/\/src\//i.test(n)) {
        diagnostics.delete(doc.uri);
        return;
    }

    const proj = projectFor(doc.uri);
    if (!proj) {
        diagnostics.delete(doc.uri);
        return;
    }

    /** @type {import('vscode').Diagnostic[]} */
    const out = [];
    const text = doc.getText();
    const importRe =
        /(?:from\s+|import\s*\(\s*|export\s*\*\s*from\s+)['"](@[^'"]+)['"]/g;

    let m;
    while ((m = importRe.exec(text)) !== null) {
        const spec = m[1];
        const specStart = m.index + m[0].lastIndexOf(spec);
        lintSpec(doc, out, proj, spec, specStart);
    }

    diagnostics.set(doc.uri, out);
}

/**
 * @param {import('vscode').TextDocument} doc
 * @param {import('vscode').Diagnostic[]} out
 * @param {ProjectAliases} proj
 * @param {string} spec
 * @param {number} offset
 */
function lintSpec(doc, out, proj, spec, offset) {
    const slash = spec.indexOf('/');
    const alias = slash === -1 ? spec : spec.slice(0, slash);
    const rest = slash === -1 ? '' : spec.slice(slash + 1);

    if (alias.startsWith('@') && !proj.aliases.has(alias)) {
        if (cfg().get('warnUnknownAlias', true)) {
            out.push(
                diag(
                    doc,
                    offset,
                    spec.length,
                    `Unknown alias "${alias}" — not in tsconfig paths / NativeCore defaults`,
                    'nc-import-unknown-alias'
                )
            );
        }
        return;
    }

    if (!proj.aliases.has(alias)) return;

    if (
        cfg().get('warnMissingJsExt', true) &&
        rest &&
        !/\.(js|ts|json|css|wasm)$/i.test(rest) &&
        !rest.endsWith('/')
    ) {
        out.push(
            diag(
                doc,
                offset,
                spec.length,
                `NativeCore alias imports should include the .js extension`,
                'nc-import-missing-js'
            )
        );
    }

    if (!cfg().get('warnMissingAliasTarget', true) || !rest) return;

    const base = proj.aliases.get(alias);
    const candidates = [
        path.join(proj.root, base, rest),
        path.join(proj.root, base, rest.replace(/\.js$/i, '.ts')),
        path.join(proj.root, base, rest.replace(/\.js$/i, '.js')),
    ];
    // Bare @testing → index
    if (!rest.includes('/')) {
        candidates.push(
            path.join(proj.root, base, 'index.js'),
            path.join(proj.root, base, 'index.ts'),
            path.join(proj.root, base, rest + '.js'),
            path.join(proj.root, base, rest + '.ts')
        );
    }

    const exists = candidates.some((c) => {
        try {
            return fs.existsSync(c);
        } catch {
            return false;
        }
    });
    if (!exists) {
        out.push(
            diag(
                doc,
                offset,
                spec.length,
                `Alias import target not found for ${spec}`,
                'nc-import-missing-target'
            )
        );
    }
}

/**
 * @param {import('vscode').TextDocument} doc
 * @param {number} offset
 * @param {number} length
 * @param {string} message
 * @param {string} code
 */
function diag(doc, offset, length, message, code) {
    const start = doc.positionAt(offset);
    const end = doc.positionAt(offset + length);
    const d = new vscode.Diagnostic(new vscode.Range(start, end), message, vscode.DiagnosticSeverity.Warning);
    d.source = 'NativeCore Import';
    d.code = code;
    return d;
}

module.exports = { activate, deactivate };

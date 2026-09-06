'use strict';

const vscode = require('vscode');

const diagnostics = vscode.languages.createDiagnosticCollection('nativecoreEnv');

/** @type {{ keys: Set<string>, props: Set<string>, featureKeys: Set<string>, uri: vscode.Uri | null, mtime: number }} */
let index = { keys: new Set(), props: new Set(), featureKeys: new Set(), uri: null, mtime: 0 };

/**
 * @param {import('vscode').ExtensionContext} context
 */
function activate(context) {
    context.subscriptions.push(diagnostics);

    const refreshAll = async () => {
        await rebuildIndex();
        for (const doc of vscode.workspace.textDocuments) {
            lintDocument(doc);
        }
    };

    context.subscriptions.push(
        vscode.commands.registerCommand('nativecoreEnv.refresh', refreshAll),
        vscode.workspace.onDidOpenTextDocument(lintDocument),
        vscode.workspace.onDidChangeTextDocument((e) => lintDocument(e.document)),
        vscode.workspace.onDidCloseTextDocument((doc) => diagnostics.delete(doc.uri)),
        vscode.workspace.onDidSaveTextDocument(async (doc) => {
            if (/\/src\/config\/env\.(js|ts)$/i.test(norm(doc.uri.fsPath))) {
                await rebuildIndex();
            }
            lintDocument(doc);
        }),
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('nativecoreEnv')) {
                refreshAll();
            }
        })
    );

    refreshAll();
}

function deactivate() {
    diagnostics.clear();
    diagnostics.dispose();
}

function isEnabled() {
    return vscode.workspace.getConfiguration('nativecoreEnv').get('enabled', true);
}

function cfg() {
    return vscode.workspace.getConfiguration('nativecoreEnv');
}

function norm(p) {
    return p.replace(/\\/g, '/');
}

async function rebuildIndex() {
    const glob = cfg().get('envGlob', '**/src/config/env.{js,ts}');
    const files = await vscode.workspace.findFiles(glob, '{**/node_modules/**,**/.nativecore/**}', 20);
    index = { keys: new Set(), props: new Set(), featureKeys: new Set(), uri: null, mtime: Date.now() };

    for (const uri of files) {
        let text;
        try {
            text = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8');
        } catch {
            continue;
        }
        index.uri = uri;
        parseEnvModule(text, index);
    }

    // Also allowlist keys from .env.example (NC_PUBLIC_* stripped)
    const envExamples = await vscode.workspace.findFiles(
        '**/.env.example',
        '{**/node_modules/**}',
        10
    );
    for (const uri of envExamples) {
        try {
            const text = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8');
            for (const line of text.split(/\r?\n/)) {
                const m = /^\s*(?:NC_PUBLIC_)?([A-Z][A-Z0-9_]*)\s*=/.exec(line);
                if (m) {
                    index.keys.add(m[1]);
                }
            }
        } catch {
            /* ignore */
        }
    }
}

/**
 * @param {string} text
 * @param {typeof index} into
 */
function parseEnvModule(text, into) {
    // defaults: { KEY: ... }
    const defaultsBlock = /const\s+defaults\s*=\s*\{([\s\S]*?)\n\s*\};/.exec(text);
    if (defaultsBlock) {
        const keyRe = /^\s*([A-Z][A-Z0-9_]*)\s*:/gm;
        let m;
        while ((m = keyRe.exec(defaultsBlock[1])) !== null) {
            into.keys.add(m[1]);
        }
    }

    // export const env = { apiBaseUrl, features: { analytics }, get, raw }
    const envBlock = /export\s+const\s+env\s*=\s*Object\.freeze\(\{([\s\S]*?)\n\}\);/.exec(text)
        || /export\s+const\s+env\s*=\s*\{([\s\S]*?)\n\};/.exec(text);
    if (envBlock) {
        const body = envBlock[1];
        const propRe = /^\s*([A-Za-z_$][\w$]*)\s*[:(]/gm;
        let m;
        while ((m = propRe.exec(body)) !== null) {
            const name = m[1];
            if (name === 'Object' || name === 'freeze') continue;
            into.props.add(name);
        }
        const feat = /features\s*:\s*Object\.freeze\(\{([\s\S]*?)\}\)/.exec(body)
            || /features\s*:\s*\{([\s\S]*?)\}/.exec(body);
        if (feat) {
            const fRe = /^\s*([A-Za-z_$][\w$]*)\s*:/gm;
            let fm;
            while ((fm = fRe.exec(feat[1])) !== null) {
                into.featureKeys.add(fm[1]);
            }
        }
    }

    // Always allow get / raw
    into.props.add('get');
    into.props.add('raw');
    into.props.add('features');
}

/**
 * @param {import('vscode').TextDocument} doc
 */
function lintDocument(doc) {
    if (!isEnabled() || doc.uri.scheme !== 'file') {
        return;
    }
    const p = norm(doc.uri.fsPath);
    if (p.includes('/node_modules/') || p.includes('/.nativecore/')) {
        diagnostics.delete(doc.uri);
        return;
    }
    if (doc.languageId !== 'javascript' && doc.languageId !== 'typescript') {
        diagnostics.delete(doc.uri);
        return;
    }
    if (/\/src\/config\/env\.(js|ts)$/i.test(p)) {
        diagnostics.delete(doc.uri);
        return;
    }
    if (!/\/src\//i.test(p)) {
        diagnostics.delete(doc.uri);
        return;
    }

    /** @type {import('vscode').Diagnostic[]} */
    const out = [];
    const text = doc.getText();

    if (cfg().get('warnUnknownKeys', true) && (index.props.size || index.keys.size)) {
        scanUnknownEnv(doc, text, out);
    }
    if (cfg().get('warnSecrets', true)) {
        scanSecrets(doc, text, out);
    }

    diagnostics.set(doc.uri, out);
}

/**
 * @param {import('vscode').TextDocument} doc
 * @param {string} text
 * @param {import('vscode').Diagnostic[]} out
 */
function scanUnknownEnv(doc, text, out) {
    // env.features.x
    const featRe = /\benv\.features\.([A-Za-z_$][\w$]*)/g;
    let m;
    while ((m = featRe.exec(text)) !== null) {
        if (index.featureKeys.size && !index.featureKeys.has(m[1])) {
            out.push(diag(doc, m.index + m[0].lastIndexOf(m[1]), m[1].length,
                `Unknown env.features.${m[1]} — not declared in env.js`, 'nc-env-unknown-feature'));
        }
    }

    // env.prop (not features/get/raw)
    const propRe = /\benv\.([A-Za-z_$][\w$]*)\b/g;
    while ((m = propRe.exec(text)) !== null) {
        const prop = m[1];
        if (prop === 'features') continue;
        if (index.props.size && !index.props.has(prop)) {
            out.push(diag(doc, m.index + 4, prop.length,
                `Unknown env.${prop} — not exported from env.js`, 'nc-env-unknown-prop'));
        }
    }

    // env.get('KEY') / env.get("KEY")
    const getRe = /\benv\.get\s*\(\s*(['"])([A-Z][A-Z0-9_]*)\1/g;
    while ((m = getRe.exec(text)) !== null) {
        const key = m[2];
        if (index.keys.size && !index.keys.has(key)) {
            const keyStart = m.index + m[0].indexOf(key);
            out.push(diag(doc, keyStart, key.length,
                `env.get('${key}') — key not in env.js defaults or .env.example`, 'nc-env-unknown-key'));
        }
    }
}

/**
 * @param {import('vscode').TextDocument} doc
 * @param {string} text
 * @param {import('vscode').Diagnostic[]} out
 */
function scanSecrets(doc, text, out) {
    const re = /\b(API_SECRET|SECRET_KEY|PRIVATE_KEY|AWS_SECRET|DATABASE_PASSWORD|DB_PASSWORD|JWT_SECRET|AUTH_SECRET)\b/g;
    let m;
    while ((m = re.exec(text)) !== null) {
        // Skip comments that mention the names
        const line = doc.lineAt(doc.positionAt(m.index)).text;
        if (/^\s*\/\//.test(line) || /^\s*\*/.test(line)) continue;
        out.push(diag(doc, m.index, m[1].length,
            `Possible secret identifier "${m[1]}" in client source — keep secrets server-side`, 'nc-env-secret',
            vscode.DiagnosticSeverity.Warning));
    }
}

/**
 * @param {import('vscode').TextDocument} doc
 * @param {number} offset
 * @param {number} length
 * @param {string} message
 * @param {string} code
 * @param {import('vscode').DiagnosticSeverity} [severity]
 */
function diag(doc, offset, length, message, code, severity = vscode.DiagnosticSeverity.Warning) {
    const start = doc.positionAt(offset);
    const end = doc.positionAt(offset + length);
    const d = new vscode.Diagnostic(new vscode.Range(start, end), message, severity);
    d.source = 'NativeCore Env';
    d.code = code;
    return d;
}

module.exports = { activate, deactivate };

'use strict';

const fs = require('fs');
const path = require('path');
const vscode = require('vscode');

/**
 * @param {import('vscode').ExtensionContext} context
 */
function activate(context) {
    context.subscriptions.push(
        vscode.commands.registerCommand('nativecoreDevtools.openFromClipboard', async () => {
            const text = await vscode.env.clipboard.readText();
            await openFromText(text);
        }),
        vscode.commands.registerCommand('nativecoreDevtools.openFromSelection', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showInformationMessage('No selection.');
                return;
            }
            const text = editor.document.getText(editor.selection) || editor.document.lineAt(editor.selection.active.line).text;
            await openFromText(text);
        }),
        vscode.commands.registerCommand('nativecoreDevtools.openPath', async () => {
            const input = await vscode.window.showInputBox({
                prompt: 'Path or stack frame (file:line:col)',
                placeHolder: 'src/controllers/home.controller.js:42:3',
            });
            if (input) await openFromText(input);
        }),
        vscode.window.registerUriHandler({
            handleUri(uri) {
                // vscode://NativeCoreJS.vscode-nativecore-devtools/open?path=...&line=...
                // or nativecore-devtools scheme if registered via asExternalUri usage
                const q = new URLSearchParams(uri.query);
                const filePath = q.get('path') || q.get('file') || uri.path.replace(/^\//, '');
                const line = Number(q.get('line') || 1);
                const col = Number(q.get('col') || q.get('column') || 1);
                return openResolved(filePath, line, col);
            },
        })
    );
}

function deactivate() {}

function isEnabled() {
    return vscode.workspace.getConfiguration('nativecoreDevtools').get('enabled', true);
}

/**
 * @param {string} text
 */
async function openFromText(text) {
    if (!isEnabled()) return;
    if (!text || !String(text).trim()) {
        vscode.window.showInformationMessage('Nothing to parse.');
        return;
    }

    const frames = parseFrames(String(text));
    if (!frames.length) {
        vscode.window.showWarningMessage('No file path / stack frame found.');
        return;
    }

    if (frames.length === 1) {
        await openResolved(frames[0].file, frames[0].line, frames[0].col);
        return;
    }

    const pick = await vscode.window.showQuickPick(
        frames.map((f, i) => ({
            label: path.basename(f.file),
            description: `${f.file}:${f.line}:${f.col}`,
            frame: f,
            picked: i === 0,
        })),
        { placeHolder: 'Select stack frame to open' }
    );
    if (pick) await openResolved(pick.frame.file, pick.frame.line, pick.frame.col);
}

/**
 * @param {string} text
 * @returns {{ file: string, line: number, col: number }[]}
 */
function parseFrames(text) {
    /** @type {{ file: string, line: number, col: number }[]} */
    const out = [];
    const seen = new Set();

    const patterns = [
        // at foo (C:\path\file.js:12:3)  or (file://...) 
        /\(?((?:[A-Za-z]:)?[^\s"'()<>]+\.(?:js|ts|jsx|tsx|mjs|cjs|html|css))(?::(\d+))?(?::(\d+))?\)?/g,
        // http://localhost:3000/src/foo.js:12:3
        /https?:\/\/[^/\s]+(\/[^\s:]+?\.(?:js|ts|jsx|tsx|mjs|cjs))(?::(\d+))?(?::(\d+))?/g,
        // webpack-internal or /dist/src/...
        /(\/(?:src|dist)\/[^\s:]+?\.(?:js|ts|jsx|tsx))(?::(\d+))?(?::(\d+))?/g,
        // plain relative
        /((?:src|dist|\.nativecore)\/[^\s:]+?\.(?:js|ts|jsx|tsx|html))(?::(\d+))?(?::(\d+))?/g,
    ];

    for (const re of patterns) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(text)) !== null) {
            let file = m[1];
            if (!file) continue;
            // URL path form
            if (file.startsWith('/') && !file.match(/^[A-Za-z]:/)) {
                // keep as workspace-relative-ish
                file = file.replace(/^\//, '');
            }
            file = file.replace(/^file:\/\//i, '').replace(/^\/([A-Za-z]:)/, '$1');
            const line = Math.max(1, Number(m[2] || 1));
            const col = Math.max(1, Number(m[3] || 1));
            const key = `${file}:${line}:${col}`;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push({ file, line, col });
        }
    }

    return out;
}

/**
 * @param {string} file
 * @param {number} line
 * @param {number} col
 */
async function openResolved(file, line, col) {
    const preferSrc = vscode.workspace
        .getConfiguration('nativecoreDevtools')
        .get('preferSrcOverDist', true);

    let candidate = file.replace(/\\/g, '/');
    if (preferSrc) {
        candidate = candidate.replace(/\/dist\/src\//, '/src/').replace(/^dist\/src\//, 'src/');
    }

    const uri = await resolveToUri(candidate);
    if (!uri) {
        vscode.window.showWarningMessage(`Could not resolve: ${file}`);
        return;
    }

    const doc = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(doc, { preview: false });
    const pos = new vscode.Position(Math.max(0, line - 1), Math.max(0, col - 1));
    editor.selection = new vscode.Selection(pos, pos);
    editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
}

/**
 * @param {string} file
 * @returns {Promise<vscode.Uri | null>}
 */
async function resolveToUri(file) {
    const normalized = file.replace(/\\/g, '/');

    // Absolute path
    if (/^[A-Za-z]:\//.test(normalized) || path.isAbsolute(file)) {
        if (fs.existsSync(file)) return vscode.Uri.file(file);
        if (fs.existsSync(normalized)) return vscode.Uri.file(normalized);
    }

    // Workspace relative
    for (const folder of vscode.workspace.workspaceFolders || []) {
        const abs = path.join(folder.uri.fsPath, normalized.replace(/^\//, ''));
        if (fs.existsSync(abs)) return vscode.Uri.file(abs);

        // Try stripping leading src already under folder
        const alt = path.join(folder.uri.fsPath, normalized.replace(/^.*?\/(src\/)/, '$1'));
        if (fs.existsSync(alt)) return vscode.Uri.file(alt);
    }

    // Glob basename search as last resort
    const base = path.basename(normalized);
    const hits = await vscode.workspace.findFiles(
        `**/${base}`,
        '{**/node_modules/**,**/.nativecore/**}',
        10
    );
    if (hits.length === 1) return hits[0];
    if (hits.length > 1) {
        // Prefer path suffix match
        const suffix = normalized.replace(/^.*?(src\/)/, 'src/');
        const best = hits.find((h) => h.fsPath.replace(/\\/g, '/').endsWith(suffix));
        return best || hits[0];
    }
    return null;
}

module.exports = { activate, deactivate };

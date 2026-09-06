'use strict';

const vscode = require('vscode');
const path = require('path');

/** @type {vscode.Terminal | undefined} */
let terminal;

/**
 * @param {import('vscode').ExtensionContext} context
 */
function activate(context) {
    context.subscriptions.push(
        vscode.commands.registerCommand('nativecoreTest.runFile', () => runCurrentFile()),
        vscode.commands.registerCommand('nativecoreTest.runWorkspace', () => runAll()),
        vscode.languages.registerCodeLensProvider(
            [
                { language: 'javascript', scheme: 'file', pattern: '**/*.{test,spec}.{js,ts,mjs,cjs}' },
                { language: 'typescript', scheme: 'file', pattern: '**/*.{test,spec}.{js,ts,mjs,cjs}' },
            ],
            {
                provideCodeLenses(document) {
                    return provideCodeLenses(document);
                },
            }
        )
    );
}

function deactivate() {
    /* terminal owned by VS Code */
}

function isEnabled() {
    return vscode.workspace.getConfiguration('nativecoreTest').get('enabled', true);
}

/**
 * @param {import('vscode').TextDocument} document
 */
function provideCodeLenses(document) {
    if (!isEnabled()) return [];
    if (!vscode.workspace.getConfiguration('nativecoreTest').get('codeLens', true)) {
        return [];
    }
    if (!isTestPath(document.uri.fsPath)) return [];

    /** @type {import('vscode').CodeLens[]} */
    const lenses = [];
    const top = new vscode.Range(0, 0, 0, 0);
    lenses.push(
        new vscode.CodeLens(top, {
            title: '$(play) Run NativeCore tests (this file)',
            command: 'nativecoreTest.runFile',
            arguments: [document.uri],
        })
    );

    const text = document.getText();
    const re = /^\s*(?:it|test|describe)\s*\(\s*(['"`])/gm;
    let m;
    let count = 0;
    while ((m = re.exec(text)) !== null && count < 40) {
        const pos = document.positionAt(m.index);
        lenses.push(
            new vscode.CodeLens(new vscode.Range(pos, pos), {
                title: 'Run file',
                command: 'nativecoreTest.runFile',
                arguments: [document.uri],
            })
        );
        count++;
    }
    return lenses;
}

/**
 * @param {string} fsPath
 */
function isTestPath(fsPath) {
    return /\.(test|spec)\.(js|ts|mjs|cjs)$/i.test(fsPath);
}

/**
 * @param {import('vscode').Uri} [uri]
 */
async function runCurrentFile(uri) {
    const target =
        uri ||
        vscode.window.activeTextEditor?.document.uri ||
        null;
    if (!target) {
        vscode.window.showInformationMessage('Open a *.test.js / *.spec.js file first.');
        return;
    }
    if (!isTestPath(target.fsPath)) {
        vscode.window.showInformationMessage('Current file is not a Vitest test file.');
        return;
    }
    const folder = vscode.workspace.getWorkspaceFolder(target);
    if (!folder) return;

    const rel = path.relative(folder.uri.fsPath, target.fsPath).replace(/\\/g, '/');
    const script = vscode.workspace.getConfiguration('nativecoreTest').get('npmScript', 'test');
    // Prefer vitest run for a single file
    const cmd = `npm.cmd run ${script} -- "${rel}"`;
    runInTerminal(folder.uri.fsPath, cmd);
}

async function runAll() {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) return;
    // Prefer folder that has nativecore.config.json
    let root = folder.uri.fsPath;
    const configs = await vscode.workspace.findFiles(
        '**/nativecore.config.json',
        '{**/node_modules/**}',
        5
    );
    if (configs[0]) {
        const wf = vscode.workspace.getWorkspaceFolder(configs[0]);
        if (wf) root = wf.uri.fsPath;
    }
    const script = vscode.workspace.getConfiguration('nativecoreTest').get('npmScript', 'test');
    runInTerminal(root, `npm.cmd run ${script}`);
}

/**
 * @param {string} cwd
 * @param {string} cmd
 */
function runInTerminal(cwd, cmd) {
    if (!terminal || terminal.exitStatus !== undefined) {
        terminal = vscode.window.createTerminal({
            name: 'NativeCore Tests',
            cwd,
        });
    } else {
        // Ensure cwd by cd
        terminal.sendText(`cd "${cwd}"`);
    }
    terminal.show(true);
    terminal.sendText(cmd);
}

module.exports = { activate, deactivate };

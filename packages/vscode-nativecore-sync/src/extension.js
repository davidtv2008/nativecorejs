'use strict';

const path = require('path');
const vscode = require('vscode');

/** @type {vscode.StatusBarItem | undefined} */
let statusBar;

/**
 * @param {import('vscode').ExtensionContext} context
 */
function activate(context) {
    statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 90);
    statusBar.command = 'nativecoreSync.check';
    statusBar.tooltip = 'NativeCore vendored runtime status';
    context.subscriptions.push(
        statusBar,
        vscode.commands.registerCommand('nativecoreSync.syncCore', () =>
            runScript('sync:core', ['latest'])
        ),
        vscode.commands.registerCommand('nativecoreSync.syncComponents', () =>
            runScript('sync:components', ['latest'])
        ),
        vscode.commands.registerCommand('nativecoreSync.syncImportMap', () =>
            runScript('sync:importmap', [])
        ),
        vscode.commands.registerCommand('nativecoreSync.check', () => checkRuntime(true)),
        vscode.workspace.onDidChangeWorkspaceFolders(() => checkRuntime(false))
    );

    checkRuntime(false);
}

function deactivate() {
    if (statusBar) {
        statusBar.dispose();
    }
}

/**
 * @param {boolean} showMessage
 */
async function checkRuntime(showMessage) {
    const folder = await pickNativeCoreFolder(false);
    if (!folder) {
        if (statusBar) {
            statusBar.hide();
        }
        return;
    }

    const coreUri = vscode.Uri.joinPath(folder.uri, '.nativecore', 'core');
    const utilsUri = vscode.Uri.joinPath(folder.uri, '.nativecore', 'utils');
    let ok = true;
    let detail = `${folder.name}: .nativecore OK`;
    try {
        await vscode.workspace.fs.stat(coreUri);
        await vscode.workspace.fs.stat(utilsUri);
    } catch {
        ok = false;
        detail = `${folder.name}: missing .nativecore/core or utils — run Sync Core`;
    }

    if (statusBar) {
        statusBar.text = ok ? '$(sync) NC Sync' : '$(warning) NC Sync';
        statusBar.backgroundColor = ok
            ? undefined
            : new vscode.ThemeColor('statusBarItem.warningBackground');
        statusBar.tooltip = detail;
        statusBar.show();
    }

    if (showMessage) {
        if (ok) {
            vscode.window
                .showInformationMessage(detail, 'Sync Core', 'Sync Components')
                .then((choice) => {
                    if (choice === 'Sync Core') {
                        vscode.commands.executeCommand('nativecoreSync.syncCore');
                    } else if (choice === 'Sync Components') {
                        vscode.commands.executeCommand('nativecoreSync.syncComponents');
                    }
                });
        } else {
            vscode.window
                .showWarningMessage(detail, 'Sync Core')
                .then((choice) => {
                    if (choice === 'Sync Core') {
                        vscode.commands.executeCommand('nativecoreSync.syncCore');
                    }
                });
        }
    }
}

/**
 * @param {boolean} required
 */
async function pickNativeCoreFolder(required) {
    const folders = vscode.workspace.workspaceFolders || [];
    const ncFolders = [];
    for (const f of folders) {
        try {
            await vscode.workspace.fs.stat(vscode.Uri.joinPath(f.uri, 'nativecore.config.json'));
            ncFolders.push(f);
        } catch {
            // skip
        }
    }
    if (!ncFolders.length) {
        if (required) {
            vscode.window.showWarningMessage(
                'NativeCore Sync: no workspace folder with nativecore.config.json'
            );
        }
        return undefined;
    }
    if (ncFolders.length === 1) {
        return ncFolders[0];
    }
    const pick = await vscode.window.showQuickPick(
        ncFolders.map((f) => ({ label: f.name, description: f.uri.fsPath, folder: f })),
        { placeHolder: 'Which NativeCore app?' }
    );
    return pick ? pick.folder : undefined;
}

/**
 * @param {string} script
 * @param {string[]} args
 */
async function runScript(script, args) {
    const folder = await pickNativeCoreFolder(true);
    if (!folder) {
        return;
    }
    const cwd = folder.uri.fsPath;
    const isWin = process.platform === 'win32';
    const npmBin = isWin ? 'npm.cmd' : 'npm';
    const extra = args.length ? ` -- ${args.join(' ')}` : '';
    const command = `${npmBin} run ${script}${extra}`;
    const term =
        vscode.window.terminals.find((t) => t.name === 'NativeCore Sync') ||
        vscode.window.createTerminal({ name: 'NativeCore Sync', cwd });
    term.show(true);
    term.sendText(`cd "${cwd}"`);
    term.sendText(command);
}

module.exports = { activate, deactivate };

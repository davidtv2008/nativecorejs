'use strict';

const path = require('path');
const vscode = require('vscode');

const MAKE_OPTIONS = [
    { label: 'view', script: 'make:view', detail: 'HTML view + controller + route', placeholder: 'profile or docs/getting-started' },
    { label: 'component', script: 'make:component', detail: 'UI web component', placeholder: 'my-card' },
    { label: 'core-component', script: 'make:core-component', detail: 'nc-* core component', placeholder: 'nc-widget' },
    { label: 'controller', script: 'make:controller', detail: 'Controller only', placeholder: 'profile' },
    { label: 'store', script: 'make:store', detail: 'App store module', placeholder: 'task' },
    { label: 'middleware', script: 'make:middleware', detail: 'Router middleware', placeholder: 'verified' },
];

const REMOVE_OPTIONS = [
    { label: 'view', script: 'remove:view', detail: 'Remove view (+ optional controller/route)', placeholder: 'profile', extraFlags: ['--yes'] },
    { label: 'component', script: 'remove:component', detail: 'Remove UI component', placeholder: 'my-card', extraFlags: ['--yes'] },
    { label: 'core-component', script: 'remove:core-component', detail: 'Remove nc-* component', placeholder: 'nc-widget', extraFlags: ['--yes'] },
    { label: 'store', script: 'remove:store', detail: 'Remove store', placeholder: 'task', extraFlags: ['--yes'] },
    { label: 'middleware', script: 'remove:middleware', detail: 'Remove middleware', placeholder: 'verified', extraFlags: ['--yes'] },
];

/**
 * @param {import('vscode').ExtensionContext} context
 */
function activate(context) {
    context.subscriptions.push(
        vscode.commands.registerCommand('nativecoreGenerators.make', () => runFlow(MAKE_OPTIONS, true)),
        vscode.commands.registerCommand('nativecoreGenerators.remove', () => runFlow(REMOVE_OPTIONS, false))
    );
}

function deactivate() {}

/**
 * @param {typeof MAKE_OPTIONS} options
 * @param {boolean} isMake
 */
async function runFlow(options, isMake) {
    const folder = await pickNativeCoreFolder();
    if (!folder) {
        return;
    }

    const picked = await vscode.window.showQuickPick(
        options.map((o) => ({
            label: o.label,
            description: o.script,
            detail: o.detail,
            option: o,
        })),
        { placeHolder: isMake ? 'What do you want to create?' : 'What do you want to remove?' }
    );
    if (!picked) {
        return;
    }

    const name = await vscode.window.showInputBox({
        prompt: `Name for ${picked.option.script}`,
        placeHolder: picked.option.placeholder,
        validateInput: (v) => (v && v.trim() ? null : 'Name is required'),
    });
    if (!name) {
        return;
    }

    const args = [name.trim(), '--defaults'];
    if (picked.option.extraFlags) {
        args.push(...picked.option.extraFlags);
    }

    await runNpmScript(folder, picked.option.script, args);
}

/**
 * @returns {Promise<import('vscode').WorkspaceFolder | undefined>}
 */
async function pickNativeCoreFolder() {
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
        vscode.window.showWarningMessage(
            'NativeCore Generators: no workspace folder with nativecore.config.json'
        );
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
 * @param {import('vscode').WorkspaceFolder} folder
 * @param {string} script
 * @param {string[]} args
 */
async function runNpmScript(folder, script, args) {
    const cwd = folder.uri.fsPath;
    const isWin = process.platform === 'win32';
    // Prefer npm.cmd on Windows so flags after -- are preserved
    const npmBin = isWin ? 'npm.cmd' : 'npm';
    const quotedArgs = args.map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(' ');
    const command = `${npmBin} run ${script} -- ${quotedArgs}`;

    const term =
        vscode.window.terminals.find((t) => t.name === 'NativeCore Generators') ||
        vscode.window.createTerminal({
            name: 'NativeCore Generators',
            cwd,
        });
    term.show(true);
    term.sendText(`cd "${cwd}"`);
    term.sendText(command);
    vscode.window.showInformationMessage(`Running ${script} ${args[0]}…`);
}

module.exports = { activate, deactivate };

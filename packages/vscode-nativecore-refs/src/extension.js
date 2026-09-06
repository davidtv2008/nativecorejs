'use strict';

const vscode = require('vscode');
const { registerProviders, resolve, setNativeCoreConfigPresent } = require('./providers');
const { clearRouteCache } = require('./pairing');
const { getRefSymbolAtPosition } = require('./refSymbol');

/**
 * @param {import('vscode').ExtensionContext} context
 */
async function activate(context) {
    const configs = await vscode.workspace.findFiles(
        '**/nativecore.config.json',
        '{**/node_modules/**,**/.nativecore/**}',
        5
    );
    setNativeCoreConfigPresent(configs.length > 0);

    registerProviders(context);

    context.subscriptions.push(
        vscode.commands.registerCommand('nativecoreRefs.findReferences', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                return;
            }
            const symbol = getRefSymbolAtPosition(editor.document, editor.selection.active);
            if (!symbol) {
                vscode.window.showInformationMessage('No NativeCore ref under cursor.');
                return;
            }
            const locs = await resolve(editor.document, editor.selection.active, 'references');
            if (!locs || !locs.length) {
                vscode.window.showInformationMessage(`No references found for ref "${symbol.name}".`);
                return;
            }
            await vscode.commands.executeCommand('editor.action.referenceSearch.trigger');
        }),
        vscode.workspace.onDidSaveTextDocument((doc) => {
            if (/routes\.(js|ts)$/i.test(doc.fileName)) {
                clearRouteCache();
            }
        })
    );
}

function deactivate() {
    clearRouteCache();
}

module.exports = {
    activate,
    deactivate,
};

'use strict';

const path = require('path');
const vscode = require('vscode');

const SELECTOR = [
    { language: 'javascript', scheme: 'file' },
    { language: 'typescript', scheme: 'file' },
];

/**
 * @param {import('vscode').ExtensionContext} context
 */
function activate(context) {
    context.subscriptions.push(
        vscode.languages.registerDefinitionProvider(SELECTOR, {
            provideDefinition(document, position) {
                if (!vscode.workspace.getConfiguration('nativecoreRoutes').get('enabled', true)) {
                    return null;
                }
                if (!/routes\.(js|ts)$/i.test(document.fileName)) {
                    return null;
                }
                return resolveRouteString(document, position);
            },
        })
    );
}

function deactivate() {}

/**
 * @param {import('vscode').TextDocument} document
 * @param {import('vscode').Position} position
 */
async function resolveRouteString(document, position) {
    const line = document.lineAt(position.line).text;
    const hit = stringAt(line, position.character);
    if (!hit) {
        return null;
    }

    const folder = vscode.workspace.getWorkspaceFolder(document.uri);
    const projectRoot = folder ? folder.uri.fsPath : findProjectRoot(document.uri.fsPath);
    const routesDir = path.dirname(document.uri.fsPath);

    /** @type {string | null} */
    let targetPath = null;

    if (/^src\/views\/.+\.html$/i.test(hit.value) || /^views\/.+\.html$/i.test(hit.value)) {
        const rel = hit.value.replace(/^\//, '');
        targetPath = path.normalize(path.join(projectRoot, rel.startsWith('src/') ? rel : path.join('src', rel)));
    } else if (/controllers\/.+\.controller\.(js|ts)$/i.test(hit.value) || /\.controller\.(js|ts)$/i.test(hit.value)) {
        targetPath = path.normalize(path.resolve(routesDir, hit.value));
    } else {
        return null;
    }

    try {
        await vscode.workspace.fs.stat(vscode.Uri.file(targetPath));
    } catch {
        // Try basename search under src/
        const guessed = await guessFile(projectRoot, path.basename(targetPath));
        if (!guessed) {
            return null;
        }
        targetPath = guessed;
    }

    return new vscode.Location(vscode.Uri.file(targetPath), new vscode.Position(0, 0));
}

/**
 * @param {string} line
 * @param {number} character
 */
function stringAt(line, character) {
    const re = /(['"])([^'"\n]+)\1/g;
    let m;
    while ((m = re.exec(line)) !== null) {
        const start = m.index + 1;
        const end = start + m[2].length;
        if (character >= start && character <= end) {
            return { value: m[2], start, end };
        }
    }
    return null;
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
 * @param {string} projectRoot
 * @param {string} basename
 */
async function guessFile(projectRoot, basename) {
    const folder = vscode.Uri.file(projectRoot);
    const hits = await vscode.workspace.findFiles(
        new vscode.RelativePattern(folder, `**/src/**/${basename}`),
        '{**/node_modules/**,**/.nativecore/**}',
        5
    );
    return hits[0] ? hits[0].fsPath : null;
}

module.exports = {
    activate,
    deactivate,
};

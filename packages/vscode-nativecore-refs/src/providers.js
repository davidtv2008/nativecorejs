'use strict';

const vscode = require('vscode');
const { getRefSymbolAtPosition } = require('./refSymbol');
const { getPairedUris } = require('./pairing');
const { findInUris, findInWorkspace, preferUris, uniqueLocations } = require('./search');

const SELECTOR = [
    { language: 'html', scheme: 'file' },
    { language: 'javascript', scheme: 'file' },
    { language: 'typescript', scheme: 'file' },
    { language: 'javascriptreact', scheme: 'file' },
    { language: 'typescriptreact', scheme: 'file' },
];

/** @type {boolean | null} */
let nativeCoreConfigPresent = null;

/**
 * @param {boolean} present
 */
function setNativeCoreConfigPresent(present) {
    nativeCoreConfigPresent = present;
}

function isEnabled() {
    const cfg = vscode.workspace.getConfiguration('nativecoreRefs');
    if (!cfg.get('enabled', true)) {
        return false;
    }
    if (cfg.get('requireConfig', false)) {
        return nativeCoreConfigPresent === true;
    }
    return true;
}

/**
 * @param {import('vscode').TextDocument} document
 * @param {import('vscode').Position} position
 * @param {'definition' | 'references'} mode
 */
async function resolve(document, position, mode) {
    if (!isEnabled()) {
        return null;
    }

    const symbol = getRefSymbolAtPosition(document, position);
    if (!symbol) {
        return null;
    }

    const name = symbol.name;
    const paired = await getPairedUris(document.uri);
    const searchUris = uniqueUris([document.uri, ...paired]);

    if (mode === 'definition') {
        if (symbol.kind === 'attr') {
            // From ref="x" → this.x / assertRefs in paired JS (or same file for components)
            let locs = await findInUris(name, searchUris, {
                includeAttr: false,
                includeMember: true,
                includeAssert: true,
            });
            locs = preferUris(locs, paired.length ? paired : [document.uri]);
            if (!locs.length) {
                locs = await findInWorkspace(name, document.uri, {
                    includeAttr: false,
                    includeMember: true,
                    includeAssert: true,
                });
            }
            return uniqueLocations(locs);
        }

        // From this.x / assertRefs → ref="x" markup
        let locs = await findInUris(name, searchUris, {
            includeAttr: true,
            includeMember: false,
            includeAssert: false,
        });
        locs = preferUris(locs, paired.length ? paired : [document.uri]);
        if (!locs.length) {
            locs = await findInWorkspace(name, document.uri, {
                includeAttr: true,
                includeMember: false,
                includeAssert: false,
            });
        }
        return uniqueLocations(locs);
    }

    // references: everything
    let locs = await findInUris(name, searchUris, {
        includeAttr: true,
        includeMember: true,
        includeAssert: true,
    });
    if (locs.length < 2) {
        const wider = await findInWorkspace(name, document.uri, {
            includeAttr: true,
            includeMember: true,
            includeAssert: true,
        });
        locs = uniqueLocations([...locs, ...wider]);
    } else {
        locs = uniqueLocations(locs);
    }
    return locs;
}

/**
 * @param {import('vscode').Uri[]} uris
 */
function uniqueUris(uris) {
    const seen = new Set();
    /** @type {import('vscode').Uri[]} */
    const out = [];
    for (const u of uris) {
        const k = u.fsPath.replace(/\\/g, '/').toLowerCase();
        if (seen.has(k)) {
            continue;
        }
        seen.add(k);
        out.push(u);
    }
    return out;
}

class RefDefinitionProvider {
    /**
     * @param {import('vscode').TextDocument} document
     * @param {import('vscode').Position} position
     * @param {import('vscode').CancellationToken} _token
     */
    async provideDefinition(document, position, _token) {
        const locs = await resolve(document, position, 'definition');
        if (!locs || !locs.length) {
            return null;
        }
        return locs.length === 1 ? locs[0] : locs;
    }
}

class RefReferenceProvider {
    /**
     * @param {import('vscode').TextDocument} document
     * @param {import('vscode').Position} position
     * @param {{ includeDeclaration: boolean }} _context
     * @param {import('vscode').CancellationToken} _token
     */
    async provideReferences(document, position, _context, _token) {
        const locs = await resolve(document, position, 'references');
        return locs && locs.length ? locs : [];
    }
}

class RefRenameProvider {
    /**
     * @param {import('vscode').TextDocument} document
     * @param {import('vscode').Position} position
     * @param {import('vscode').CancellationToken} _token
     */
    prepareRename(document, position, _token) {
        if (!isEnabled()) {
            throw new Error('NativeCore Refs rename is disabled.');
        }
        const symbol = getRefSymbolAtPosition(document, position);
        if (!symbol) {
            throw new Error('Not a NativeCore ref symbol.');
        }
        return { range: symbol.range, placeholder: symbol.name };
    }

    /**
     * @param {import('vscode').TextDocument} document
     * @param {import('vscode').Position} position
     * @param {string} newName
     * @param {import('vscode').CancellationToken} _token
     */
    async provideRenameEdits(document, position, newName, _token) {
        if (!isEnabled()) {
            return null;
        }
        if (!/^[A-Za-z_$][\w$]*$/.test(newName)) {
            throw new Error('Invalid ref name — use a JS identifier.');
        }
        const symbol = getRefSymbolAtPosition(document, position);
        if (!symbol) {
            return null;
        }
        const locs = await resolve(document, position, 'references');
        const edit = new vscode.WorkspaceEdit();
        const seen = new Set();
        // Always include the symbol under the cursor
        const all = [
            new vscode.Location(document.uri, symbol.range),
            ...(locs || []),
        ];
        for (const loc of all) {
            const key = `${loc.uri.toString()}:${loc.range.start.line}:${loc.range.start.character}`;
            if (seen.has(key)) continue;
            seen.add(key);
            edit.replace(loc.uri, loc.range, newName);
        }
        return edit;
    }
}

/**
 * @param {import('vscode').ExtensionContext} context
 */
function registerProviders(context) {
    context.subscriptions.push(
        vscode.languages.registerDefinitionProvider(SELECTOR, new RefDefinitionProvider()),
        vscode.languages.registerReferenceProvider(SELECTOR, new RefReferenceProvider()),
        vscode.languages.registerRenameProvider(SELECTOR, new RefRenameProvider())
    );
}

module.exports = {
    registerProviders,
    resolve,
    SELECTOR,
    setNativeCoreConfigPresent,
};

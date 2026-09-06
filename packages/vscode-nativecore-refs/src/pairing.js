'use strict';

const path = require('path');
const vscode = require('vscode');

/** @type {Map<string, { viewToController: Map<string, string[]>, controllerToView: Map<string, string[]>, loadedAt: number }>} */
const routeCache = new Map();
const CACHE_MS = 15000;

/**
 * Prefer paired files for a document (view ↔ controller, or same component file).
 * @param {import('vscode').Uri} uri
 * @returns {Promise<import('vscode').Uri[]>}
 */
async function getPairedUris(uri) {
    const fsPath = uri.fsPath;
    const base = path.basename(fsPath);
    const ext = path.extname(base).toLowerCase();
    const stem = base.slice(0, -ext.length);
    const paired = [];

    if (ext === '.html') {
        const fromRoutes = await controllersForView(uri);
        for (const c of fromRoutes) {
            paired.push(c);
        }
        if (paired.length === 0) {
            const guessed = await guessControllerForView(stem);
            paired.push(...guessed);
        }
    } else if (/\.(js|ts|jsx|tsx)$/i.test(ext)) {
        if (/\.controller\.(js|ts)$/i.test(base)) {
            const viewStem = stem.replace(/\.controller$/i, '');
            const fromRoutes = await viewsForController(uri);
            for (const v of fromRoutes) {
                paired.push(v);
            }
            if (paired.length === 0) {
                const guessed = await guessViewForController(viewStem);
                paired.push(...guessed);
            }
        } else {
            // Component / same-file template: prefer current file first (caller handles)
        }
    }

    return uniqueUris(paired);
}

/**
 * @param {string} viewStem e.g. ce-package
 */
async function guessControllerForView(viewStem) {
    const patterns = [
        `**/controllers/${viewStem}.controller.js`,
        `**/controllers/${viewStem}.controller.ts`,
        `**/controllers/**/${viewStem}.controller.js`,
        `**/controllers/**/${viewStem}.controller.ts`,
    ];
    return findFirstMatches(patterns);
}

/**
 * @param {string} viewStem
 */
async function guessViewForController(viewStem) {
    const patterns = [
        `**/views/**/${viewStem}.html`,
        `**/views/${viewStem}.html`,
    ];
    return findFirstMatches(patterns);
}

/**
 * @param {string[]} patterns
 */
async function findFirstMatches(patterns) {
    /** @type {import('vscode').Uri[]} */
    const out = [];
    for (const pattern of patterns) {
        const hits = await vscode.workspace.findFiles(pattern, '{**/node_modules/**,**/.nativecore/**,**/dist/**}', 20);
        out.push(...hits);
        if (out.length) {
            break;
        }
    }
    return uniqueUris(out);
}

/**
 * @param {import('vscode').Uri} viewUri
 */
async function controllersForView(viewUri) {
    const maps = await loadRouteMaps(viewUri);
    if (!maps) {
        return [];
    }
    const key = normalizeKey(viewUri.fsPath);
    const relKeys = relativeKeys(viewUri);
    /** @type {string[]} */
    let controllers = [];
    for (const k of [key, ...relKeys]) {
        const hit = maps.viewToController.get(k);
        if (hit) {
            controllers = hit;
            break;
        }
    }
    return controllers.map((p) => vscode.Uri.file(p));
}

/**
 * @param {import('vscode').Uri} controllerUri
 */
async function viewsForController(controllerUri) {
    const maps = await loadRouteMaps(controllerUri);
    if (!maps) {
        return [];
    }
    const key = normalizeKey(controllerUri.fsPath);
    const relKeys = relativeKeys(controllerUri);
    /** @type {string[]} */
    let views = [];
    for (const k of [key, ...relKeys]) {
        const hit = maps.controllerToView.get(k);
        if (hit) {
            views = hit;
            break;
        }
    }
    return views.map((p) => vscode.Uri.file(p));
}

/**
 * Parse routes.* for register(path, 'src/views/...html', lazyController(..., '../controllers/...'))
 * @param {import('vscode').Uri} nearUri
 */
async function loadRouteMaps(nearUri) {
    const folder = vscode.workspace.getWorkspaceFolder(nearUri);
    const root = folder ? folder.uri.fsPath : path.dirname(nearUri.fsPath);
    const cacheKey = root;
    const cached = routeCache.get(cacheKey);
    if (cached && Date.now() - cached.loadedAt < CACHE_MS) {
        return cached;
    }

    const routeFiles = await vscode.workspace.findFiles(
        new vscode.RelativePattern(folder || nearUri, '**/src/routes/routes.{js,ts}'),
        '{**/node_modules/**,**/.nativecore/**}',
        5
    );

    /** @type {Map<string, string[]>} */
    const viewToController = new Map();
    /** @type {Map<string, string[]>} */
    const controllerToView = new Map();

    for (const routeUri of routeFiles) {
        let text;
        try {
            text = Buffer.from(await vscode.workspace.fs.readFile(routeUri)).toString('utf8');
        } catch {
            continue;
        }
        const routeDir = path.dirname(routeUri.fsPath);
        const projectRoot = findProjectRoot(routeUri.fsPath);

        // Match view path + lazyController second arg (controller relative path)
        const pairRe =
            /['"](src\/views\/[^'"]+\.html)['"]\s*,\s*lazyController\s*\(\s*['"][^'"]+['"]\s*,\s*['"]([^'"]+)['"]/g;
        let m;
        while ((m = pairRe.exec(text)) !== null) {
            const viewRel = m[1].replace(/\//g, path.sep);
            const ctrlRel = m[2];
            const viewAbs = path.normalize(path.join(projectRoot, viewRel));
            const ctrlAbs = path.normalize(path.resolve(routeDir, ctrlRel));

            pushMap(viewToController, normalizeKey(viewAbs), ctrlAbs);
            pushMap(viewToController, normalizeKey(viewRel), ctrlAbs);
            pushMap(controllerToView, normalizeKey(ctrlAbs), viewAbs);
            pushMap(controllerToView, normalizeKey(path.basename(ctrlAbs)), viewAbs);
        }
    }

    const entry = { viewToController, controllerToView, loadedAt: Date.now() };
    routeCache.set(cacheKey, entry);
    return entry;
}

/**
 * @param {string} routeFilePath
 */
function findProjectRoot(routeFilePath) {
    // .../src/routes/routes.js → project root
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
 * @param {Map<string, string[]>} map
 * @param {string} key
 * @param {string} value
 */
function pushMap(map, key, value) {
    const k = normalizeKey(key);
    const list = map.get(k) || [];
    if (!list.includes(value)) {
        list.push(value);
    }
    map.set(k, list);
}

/**
 * @param {string} p
 */
function normalizeKey(p) {
    return p.replace(/\\/g, '/').toLowerCase();
}

/**
 * @param {import('vscode').Uri} uri
 */
function relativeKeys(uri) {
    const folder = vscode.workspace.getWorkspaceFolder(uri);
    if (!folder) {
        return [];
    }
    const rel = path.relative(folder.uri.fsPath, uri.fsPath);
    return [normalizeKey(rel), normalizeKey(path.basename(uri.fsPath))];
}

/**
 * @param {import('vscode').Uri[]} uris
 */
function uniqueUris(uris) {
    const seen = new Set();
    /** @type {import('vscode').Uri[]} */
    const out = [];
    for (const u of uris) {
        const k = normalizeKey(u.fsPath);
        if (seen.has(k)) {
            continue;
        }
        seen.add(k);
        out.push(u);
    }
    return out;
}

function clearRouteCache() {
    routeCache.clear();
}

module.exports = {
    getPairedUris,
    clearRouteCache,
};

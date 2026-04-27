/**
 * sync-importmap.mjs
 *
 * Reads the project's package.json `dependencies`, resolves each package's
 * best browser-suitable entry point from node_modules, and writes a
 * <script type="importmap"> block into index.html.
 *
 * CJS packages are automatically pre-bundled to ESM using esbuild and saved
 * to .nativecore/esm-shims/ so they work in the browser without any manual
 * setup. The import map points at the shim instead of the raw node_modules file.
 *
 * This runs automatically as part of `npm run dev` and `npm run compile` so
 * developers never have to manually edit the import map when adding an npm
 * package.
 *
 * Entry-point resolution priority (first match wins):
 *   1. package.json `exports["."]["browser"]`
 *   2. package.json `exports["."]["import"]`
 *   3. package.json `exports["."]["default"]`  (only if ends with .js)
 *   4. package.json `module`                   (ESM build field)
 *   5. package.json `browser`                  (string form)
 *   6. package.json `main`
 *
 * The generated block is delimited by sentinel comments so subsequent runs
 * replace it cleanly rather than appending.
 *
 * Usage:
 *   node .nativecore/scripts/sync-importmap.mjs
 */

import fs      from 'fs';
import path    from 'path';
import esbuild from 'esbuild';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, '..', '..');

// Shims are written here and served by the dev server at /.nativecore/esm-shims/
const SHIMS_DIR     = path.join(ROOT, '.nativecore', 'esm-shims');
const SHIMS_URL_BASE = '/.nativecore/esm-shims';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Resolve the best browser entry point for a package.
 * Returns a path relative to the package root (e.g. "dist/chart.umd.js"),
 * or null if no usable entry is found.
 */
function resolveEntry(pkgJson) {
    // 1. exports["."] variants
    const exp = pkgJson.exports?.['.'];
    if (exp && typeof exp === 'object') {
        const candidate =
            exp['browser'] ??
            exp['import']  ??
            (typeof exp['default'] === 'string' && exp['default'].endsWith('.js') ? exp['default'] : null);
        if (typeof candidate === 'string') return candidate;
    }

    // 2. Nested exports conditions (browser > import > default)
    if (exp && typeof exp === 'object') {
        for (const key of ['browser', 'import', 'default']) {
            if (typeof exp[key] === 'object') {
                const nested = exp[key]['browser'] ?? exp[key]['import'] ?? exp[key]['default'];
                if (typeof nested === 'string' && nested.endsWith('.js')) return nested;
            }
        }
    }

    // 3. module field (ESM build)
    if (typeof pkgJson.module === 'string') return pkgJson.module;

    // 4. browser field (string only — object form maps sub-paths, skip)
    if (typeof pkgJson.browser === 'string') return pkgJson.browser;

    // 5. main field
    if (typeof pkgJson.main === 'string') return pkgJson.main;

    return null;
}

/**
 * Return true if the file looks like a native ES module.
 */
function looksLikeESM(absPath) {
    try {
        const sample = fs.readFileSync(absPath, 'utf8').slice(0, 4096);
        return /\bexport\s+(default|const|function|class|\{)/.test(sample) ||
               /^import\s+/m.test(sample);
    } catch {
        return false;
    }
}

/**
 * Pre-bundle a CJS package to ESM using esbuild and save it to the shims dir.
 * Returns the URL path to serve the shim from, e.g. /.nativecore/esm-shims/crypto-js.js
 * Returns null if bundling fails.
 */
async function prebundleCJS(name, absEntry) {
    fs.mkdirSync(SHIMS_DIR, { recursive: true });

    // Use a safe filename: scoped packages like @scope/pkg → scope__pkg.js
    const safeName  = name.replace(/^@/, '').replace(/\//g, '__');
    const shimFile  = path.join(SHIMS_DIR, `${safeName}.js`);
    const shimUrl   = `${SHIMS_URL_BASE}/${safeName}.js`;

    // Skip rebuild if shim is already newer than the source file
    try {
        const shimMtime   = fs.statSync(shimFile).mtimeMs;
        const sourceMtime = fs.statSync(absEntry).mtimeMs;
        if (shimMtime > sourceMtime) return shimUrl;
    } catch {
        // shim doesn't exist yet — build it
    }

    try {
        await esbuild.build({
            entryPoints:    [absEntry],
            bundle:         true,
            format:         'esm',
            platform:       'browser',
            outfile:        shimFile,
            allowOverwrite: true,
            logLevel:       'silent',
        });
        console.log(`[sync-importmap] pre-bundled CJS: ${name} -> ${SHIMS_URL_BASE}/${safeName}.js`);
        return shimUrl;
    } catch (err) {
        console.warn(`[sync-importmap] could not pre-bundle ${name}: ${err.message}`);
        return null;
    }
}

// ── Main ──────────────────────────────────────────────────────────────────────

const pkgPath = path.join(ROOT, 'package.json');
if (!fs.existsSync(pkgPath)) {
    console.warn('[sync-importmap] package.json not found — skipping');
    process.exit(0);
}

// Recursively collect all runtime transitive dependencies starting from the
// app's `dependencies` (NOT devDependencies). This picks up packages like
// @kurkle/color that chart.js imports at runtime but are not listed in the
// app's own package.json, while excluding dev-only tools (eslint, vitest, etc.)
function collectRuntimeDeps(rootPkgPath, nodeModulesDir) {
    const visited = new Set();
    const queue   = [];

    // Seed with direct dependencies only
    try {
        const root = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
        for (const name of Object.keys(root.dependencies ?? {})) {
            if (name !== 'nativecorejs') queue.push(name);
        }
    } catch {
        return [];
    }

    while (queue.length > 0) {
        const name = queue.shift();
        if (visited.has(name)) continue;
        visited.add(name);

        const depPkgPath = path.join(nodeModulesDir, name, 'package.json');
        if (!fs.existsSync(depPkgPath)) continue;

        try {
            const depPkg = JSON.parse(fs.readFileSync(depPkgPath, 'utf8'));
            for (const transitive of Object.keys(depPkg.dependencies ?? {})) {
                if (!visited.has(transitive)) queue.push(transitive);
            }
        } catch {
            // unreadable package.json — skip transitive walk for this dep
        }
    }

    return [...visited];
}

const nodeModulesDir = path.join(ROOT, 'node_modules');
const runtimeDeps   = collectRuntimeDeps(pkgPath, nodeModulesDir);

const imports = {};

for (const name of runtimeDeps) {
    const depPkgPath = path.join(ROOT, 'node_modules', name, 'package.json');
    if (!fs.existsSync(depPkgPath)) continue;

    let depPkg;
    try {
        depPkg = JSON.parse(fs.readFileSync(depPkgPath, 'utf8'));
    } catch {
        continue;
    }

    const entry = resolveEntry(depPkg);
    if (!entry) continue;

    // Normalise — strip leading "./"
    const normalised = entry.replace(/^\.\//, '');
    const absEntry   = path.join(ROOT, 'node_modules', name, normalised);

    if (!fs.existsSync(absEntry)) continue;

    // If the resolved file is CJS, pre-bundle it to ESM so it works in the
    // browser without any manual setup. Point the import map at the shim.
    let url;
    if (!looksLikeESM(absEntry)) {
        const shimUrl = await prebundleCJS(name, absEntry);
        url = shimUrl ?? `/node_modules/${name}/${normalised}`;
    } else {
        url = `/node_modules/${name}/${normalised}`;
    }
    imports[name] = url;

    // Also register common sub-path aliases that packages document
    // (e.g. "chart.js/auto") pointing to the same resolved file
    const subPaths = Object.keys(depPkg.exports ?? {}).filter(k => k !== '.' && k.startsWith('./'));
    for (const sub of subPaths) {
        const subExp = depPkg.exports[sub];
        const subEntry =
            (typeof subExp === 'string' ? subExp : null) ??
            subExp?.['browser'] ??
            subExp?.['import']  ??
            subExp?.['default'];

        if (typeof subEntry !== 'string') continue;
        const normSub   = subEntry.replace(/^\.\//, '');
        const absSub    = path.join(ROOT, 'node_modules', name, normSub);
        if (!fs.existsSync(absSub)) continue;

        const subKey = `${name}${sub.slice(1)}`; // "./auto" → "chart.js/auto"
        if (!imports[subKey]) {
            imports[subKey] = `/node_modules/${name}/${normSub}`;
        }
        // Also register without .js extension so both styles work:
        //   import x from '@noble/hashes/sha256'    (no ext)
        //   import x from '@noble/hashes/sha256.js' (with ext)
        const subKeyNoExt = subKey.replace(/\.js$/, '');
        if (subKeyNoExt !== subKey && !imports[subKeyNoExt]) {
            imports[subKeyNoExt] = `/node_modules/${name}/${normSub}`;
        }
    }
}

// ── Patch index.html ──────────────────────────────────────────────────────────

const htmlPath = path.join(ROOT, 'index.html');
if (!fs.existsSync(htmlPath)) {
    console.warn('[sync-importmap] index.html not found — skipping');
    process.exit(0);
}

const OPEN_SENTINEL  = '<!-- __importmap-start__ -->';
const CLOSE_SENTINEL = '<!-- __importmap-end__ -->';

let html = fs.readFileSync(htmlPath, 'utf8');

const block = Object.keys(imports).length > 0
    ? [
        OPEN_SENTINEL,
        '    <script type="importmap">',
        '    ' + JSON.stringify({ imports }, null, 4).split('\n').join('\n    '),
        '    </script>',
        CLOSE_SENTINEL,
      ].join('\n')
    : `${OPEN_SENTINEL}${CLOSE_SENTINEL}`;

if (html.includes(OPEN_SENTINEL)) {
    // Replace existing block
    const re = new RegExp(`${escapeRegex(OPEN_SENTINEL)}[\\s\\S]*?${escapeRegex(CLOSE_SENTINEL)}`);
    html = html.replace(re, block);
} else {
    // Insert before the first <script type="module"> tag
    html = html.replace('<script type="module">', `${block}\n\n    <script type="module">`);
}

fs.writeFileSync(htmlPath, html, 'utf8');

const count = Object.keys(imports).length;
if (count > 0) {
    console.log(`[sync-importmap] ${count} entr${count === 1 ? 'y' : 'ies'} mapped in index.html`);
} else {
    console.log('[sync-importmap] no runtime dependencies found — import map cleared');
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

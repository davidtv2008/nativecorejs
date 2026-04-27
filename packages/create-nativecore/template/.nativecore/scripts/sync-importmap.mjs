/**
 * sync-importmap.mjs
 *
 * Reads the project's package.json `dependencies`, resolves each package's
 * best browser-suitable entry point from node_modules, and writes a
 * <script type="importmap"> block into index.html.
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
 * The resolved path is always written as `/node_modules/<pkg>/<file>` so the
 * dev server can serve it directly from disk without any bundling.
 *
 * The generated block is delimited by sentinel comments so subsequent runs
 * replace it cleanly rather than appending.
 *
 * Usage:
 *   node .nativecore/scripts/sync-importmap.mjs
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, '..', '..');

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
 * Return true if the file at `absPath` looks like an ES module
 * (contains `export ` or `import ` statements).
 * Used to prefer ESM over CJS when both exist.
 */
function looksLikeESM(absPath) {
    try {
        const sample = fs.readFileSync(absPath, 'utf8').slice(0, 4096);
        return /\bexport\s+(default|const|function|class|\{)/.test(sample) ||
               /\bimport\s+/.test(sample);
    } catch {
        return false;
    }
}

// ── Main ──────────────────────────────────────────────────────────────────────

const pkgPath = path.join(ROOT, 'package.json');
if (!fs.existsSync(pkgPath)) {
    console.warn('[sync-importmap] package.json not found — skipping');
    process.exit(0);
}

const appPkg      = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const dependencies = { ...appPkg.dependencies };

// Remove nativecorejs itself — it is served via path aliases, not import map
delete dependencies['nativecorejs'];

const imports = {};

for (const [name] of Object.entries(dependencies)) {
    const depPkgPath = path.join(ROOT, 'node_modules', name, 'package.json');
    if (!fs.existsSync(depPkgPath)) continue;

    let depPkg;
    try {
        depPkg = JSON.parse(fs.readFileSync(depPkgPath, 'utf8'));
    } catch {
        continue;
    }

    const entry = resolveEntry(depPkg);
    if (!entry) {
        console.warn(`[sync-importmap] ${name}: no resolvable entry point — skipping`);
        continue;
    }

    // Normalise — strip leading "./"
    const normalised = entry.replace(/^\.\//, '');
    const absEntry   = path.join(ROOT, 'node_modules', name, normalised);

    if (!fs.existsSync(absEntry)) {
        console.warn(`[sync-importmap] ${name}: resolved to "${normalised}" but file not found — skipping`);
        continue;
    }

    const url = `/node_modules/${name}/${normalised}`;
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
    console.log(`[sync-importmap] wrote ${count} entr${count === 1 ? 'y' : 'ies'} to index.html import map`);
    for (const [k, v] of Object.entries(imports)) {
        console.log(`  ${k} → ${v}`);
    }
} else {
    console.log('[sync-importmap] no dependencies to map — import map cleared');
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

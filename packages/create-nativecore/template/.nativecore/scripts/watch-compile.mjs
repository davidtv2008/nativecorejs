/**
 * watch-compile.mjs
 *
 * Replaces the old tsc --watch + tsc-alias two-step pipeline with a single
 * esbuild watch context. esbuild compiles TypeScript (or JavaScript) and
 * resolves path aliases (@core/*, @services/*, etc.) in one pass, then
 * writes the .hmr-ready sentinel so server.js fires exactly one browser reload.
 *
 * Type checking (tsc --noEmit) runs in a parallel child process and prints
 * errors to the terminal without blocking the browser reload.
 * In JavaScript mode (useTypeScript: false in nativecore.config.json), the
 * type-checker is skipped entirely.
 */

import esbuild from 'esbuild';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '..', '..');
const SENTINEL_PATH = path.join(ROOT, 'dist', '.hmr-ready');

// ─── Detect project language mode ────────────────────────────────────────────
// Read nativecore.config.json to determine whether this is a TS or JS project.

let useTypeScript = true;
try {
    const ncConfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'nativecore.config.json'), 'utf8'));
    if (ncConfig.useTypeScript === false) {
        useTypeScript = false;
    }
} catch {
    // Config not found or unreadable — fall back to TypeScript mode
}

const SOURCE_EXT_PATTERN = useTypeScript ? /\.(ts|tsx)$/ : /\.(ts|tsx|js|jsx)$/;
const SOURCE_LOADER = useTypeScript ? 'ts' : 'js';

// ─── Path-alias plugin ────────────────────────────────────────────────────────
// With bundle:false, esbuild transpiles each file individually and leaves
// import strings untouched — onResolve never fires for intra-file imports.
// Instead we use onLoad to rewrite alias imports to relative paths in the
// source text before esbuild processes each file. The output then has real
// relative paths that the browser can follow.
//
// Example: from a file at ROOT/src/controllers/home.controller.ts
//   import { useState } from '@core/state.js'
//   → import { useState } from '../../.nativecore/core/state.js'
// The relative path is calculated from the source file's directory, which
// maps correctly to the mirrored dist/ structure produced by outbase: ROOT.

// Read path aliases from tsconfig.json if present, otherwise use built-in defaults.
// The defaults mirror the standard NativeCore project layout so JS projects
// (which don't need tsconfig.json) still get correct alias resolution.

const DEFAULT_ALIAS_PAIRS = [
    ['@core-utils', path.join(ROOT, '.nativecore', 'utils')],
    ['@core-types', path.join(ROOT, '.nativecore', 'types')],
    ['@core', path.join(ROOT, '.nativecore', 'core')],
    ['@dev', path.join(ROOT, '.nativecore', 'dev')],
    ['@components', path.join(ROOT, 'src', 'components')],
    ['@config', path.join(ROOT, 'src', 'config')],
    ['@routes', path.join(ROOT, 'src', 'routes')],
    ['@services', path.join(ROOT, 'src', 'services')],
    ['@utils', path.join(ROOT, 'src', 'utils')],
    ['@stores', path.join(ROOT, 'src', 'stores')],
    ['@middleware', path.join(ROOT, 'src', 'middleware')],
    ['@types', path.join(ROOT, 'src', 'types')],
    ['@constants', path.join(ROOT, 'src', 'constants')],
];

let aliasPairs = DEFAULT_ALIAS_PAIRS;

const tsconfigPath = path.join(ROOT, 'tsconfig.json');
if (fs.existsSync(tsconfigPath)) {
    try {
        const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
        const rawPaths = tsconfig.compilerOptions?.paths ?? {};
        if (Object.keys(rawPaths).length > 0) {
            // Build [ [prefix, absoluteTarget], ... ] sorted longest-first so "@core-utils"
            // matches before "@core".
            aliasPairs = Object.entries(rawPaths)
                .filter(([, targets]) => targets.length > 0)
                .map(([pattern, targets]) => {
                    const prefix = pattern.replace(/\/\*$/, '');
                    const target = path.resolve(ROOT, targets[0].replace(/\/\*$/, ''));
                    return [prefix, target];
                })
                .sort((a, b) => b[0].length - a[0].length);
        }
    } catch {
        // Malformed tsconfig — use defaults
    }
}

const pathAliasPlugin = {
    name: 'path-alias',
    setup(build) {
        build.onLoad({ filter: SOURCE_EXT_PATTERN }, async (args) => {
            const source = await fs.promises.readFile(args.path, 'utf8');
            const currentDir = path.dirname(args.path);

            // Rewrite every import/export/dynamic-import string that starts
            // with a known alias prefix.
            const transformed = source.replace(
                /((?:from|import)\s*\(?\s*)(["'])(@[^"']+)(["'])/g,
                (match, keyword, q1, importPath, q2) => {
                    for (const [prefix, target] of aliasPairs) {
                        if (importPath === prefix || importPath.startsWith(prefix + '/')) {
                            const rest = importPath.slice(prefix.length); // e.g. '/state.js'
                            const absTarget = path.join(target, rest);
                            let rel = path.relative(currentDir, absTarget).replace(/\\/g, '/');
                            if (!rel.startsWith('.')) rel = './' + rel;
                            return `${keyword}${q1}${rel}${q2}`;
                        }
                    }
                    return match;
                }
            );

            return { contents: transformed, loader: SOURCE_LOADER };
        });
    },
};

// ─── Entry-point discovery ────────────────────────────────────────────────────
// Glob every .ts file under src/ and .nativecore/ as esbuild entry points.
// esbuild writes each file to dist/ preserving the directory structure,
// matching what tsc --outDir dist would produce.

function collectEntries(dir, base = dir) {
    const entries = [];
    if (!fs.existsSync(dir)) return entries;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            entries.push(...collectEntries(full, base));
        } else if (
            (entry.name.endsWith('.ts') || (!useTypeScript && entry.name.endsWith('.js')))
            && !entry.name.endsWith('.d.ts')
        ) {
            entries.push(full);
        }
    }
    return entries;
}

function getEntryPoints() {
    return [
        ...collectEntries(path.join(ROOT, 'src')),
        ...collectEntries(path.join(ROOT, '.nativecore')),
    ];
}

// ─── esbuild watch context ────────────────────────────────────────────────────

let currentCtx = null;
let distWatcherCleanup = null;

async function startEsbuild() {
    if (currentCtx) {
        await currentCtx.dispose();
        currentCtx = null;
    }
    if (distWatcherCleanup) {
        distWatcherCleanup();
        distWatcherCleanup = null;
    }

    const ctx = await esbuild.context({
        entryPoints: getEntryPoints(),
        outbase: ROOT,
        outdir: path.join(ROOT, 'dist'),
        bundle: false,          // preserve module boundaries — no bundling
        format: 'esm',
        target: 'es2020',
        platform: 'browser',
        sourcemap: true,
        plugins: [pathAliasPlugin],
        logLevel: 'info',
    });

    currentCtx = ctx;

    // esbuild watch: recompiles only changed files on each save.
    await ctx.watch();

    process.stdout.write('[esbuild] watching for changes…\n');

    // After each rebuild, write the sentinel so server.js fires one reload.
    const distDir = path.join(ROOT, 'dist');
    let debounceTimer = null;

    const distWatcher = fs.watch(distDir, { recursive: true }, (_, filename) => {
        if (!filename?.endsWith('.js') || filename.endsWith('.d.ts')) return;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            try { fs.writeFileSync(SENTINEL_PATH, String(Date.now())); } catch { /* ignore */ }
        }, 80);
    });

    distWatcherCleanup = () => { try { distWatcher.close(); } catch { /* ignore */ } };
}

// ─── New-file watcher ─────────────────────────────────────────────────────────
// When make:component / make:view / make:controller creates a new source file,
// esbuild's watch context doesn't know about it (entry points are fixed at
// context creation). We watch src/ for 'rename' events (= new file / new dir)
// and restart the esbuild context so it picks up the new entry point.

function watchForNewFiles() {
    const fileExtPattern = useTypeScript ? /\.ts$/ : /\.(ts|js)$/;
    let restartTimer = null;

    fs.watch(path.join(ROOT, 'src'), { recursive: true }, (eventType, filename) => {
        if (eventType !== 'rename') return;
        if (!filename || !fileExtPattern.test(filename)) return;
        const fullPath = path.join(ROOT, 'src', filename);
        // Only restart if the file was just created (not deleted).
        if (!fs.existsSync(fullPath)) return;

        clearTimeout(restartTimer);
        restartTimer = setTimeout(async () => {
            process.stdout.write(`[esbuild] new file detected: src/${filename.replace(/\\/g, '/')} — restarting context\n`);
            await startEsbuild();
        }, 200);
    });
}

// ─── Background type-checker ──────────────────────────────────────────────────
// Run tsc --noEmit --watch in the background. Errors print to the terminal
// but never block or delay the browser reload.
// Skipped in JavaScript mode (useTypeScript: false).

function startTypeChecker() {
    if (!useTypeScript) {
        return null;
    }
    const tsc = spawn('npx', ['tsc', '--noEmit', '--watch', '--preserveWatchOutput'], {
        stdio: 'inherit',
        shell: true,
        cwd: ROOT,
    });
    tsc.on('exit', code => {
        if (code && code !== 0) {
            process.stderr.write(`[typecheck] tsc exited with code ${code}\n`);
        }
    });
    return tsc;
}

// ─── Start ────────────────────────────────────────────────────────────────────
// Pass --once to do a single build and exit (used by `npm run compile`).
// Without --once the script enters watch mode (used by `npm run dev`).

const isOnce = process.argv.includes('--once');

if (isOnce) {
    // One-shot build for cold-start / CI
    try {
        await esbuild.build({
            entryPoints: getEntryPoints(),
            outbase: ROOT,
            outdir: path.join(ROOT, 'dist'),
            bundle: false,
            format: 'esm',
            target: 'es2020',
            platform: 'browser',
            sourcemap: true,
            plugins: [pathAliasPlugin],
            logLevel: 'info',
        });
        try { fs.writeFileSync(SENTINEL_PATH, String(Date.now())); } catch { /* ignore */ }
        process.stdout.write('[esbuild] build complete\n');
    } catch {
        process.exit(1);
    }
} else {
    process.on('SIGINT', async () => { if (currentCtx) await currentCtx.dispose(); process.exit(0); });
    process.on('SIGTERM', async () => { if (currentCtx) await currentCtx.dispose(); process.exit(0); });

    const tscProcess = startTypeChecker();
    await startEsbuild();
    watchForNewFiles();
    if (tscProcess) {
        tscProcess.on('exit', () => process.exit(0));
    }
}


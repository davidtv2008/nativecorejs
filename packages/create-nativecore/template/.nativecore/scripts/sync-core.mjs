#!/usr/bin/env node
/**
 * Sync vendored Core runtime from a published create-nativecore release (or a local template).
 *
 * Updates only:
 *   .nativecore/core
 *   .nativecore/utils
 *   .nativecore/testing  (when present)
 *
 * Never touches:
 *   .nativecore/dev
 *   .nativecore/scripts
 *   src/, server.js, index.html, etc.
 *
 * Usage:
 *   npm run sync:core
 *   npm run sync:core -- latest
 *   npm run sync:core -- 1.0.0-rc.14
 *   npm run sync:core -- ../path/to/create-nativecore/template
 *   set NC_SYNC_FROM=../path/to/template && npm run sync:core
 *
 * On Windows PowerShell, prefer a path positional or NC_SYNC_FROM — `--from` flags
 * are sometimes dropped by npm.cmd.
 *
 * Spec: create-nativecore@<version> on npm is the source of the scaffold's .nativecore tree.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const DEST = path.join(ROOT, '.nativecore');
const SYNC_DIRS = ['core', 'utils', 'testing'];

const args = process.argv.slice(2);

function looksLikePath(value) {
    if (!value || value.startsWith('-')) return false;
    if (value.includes('/') || value.includes('\\') || value === '.' || value.startsWith('.')) return true;
    try {
        return fs.existsSync(path.resolve(process.cwd(), value));
    } catch {
        return false;
    }
}

let fromPath = process.env.NC_SYNC_FROM || null;
const fromEq = args.find((a) => a.startsWith('--from='));
if (fromEq) {
    fromPath = fromEq.slice('--from='.length);
} else {
    const fromIdx = args.indexOf('--from');
    if (fromIdx >= 0) fromPath = args[fromIdx + 1] || null;
}

const positional = args.filter((a, i) => {
    if (a.startsWith('--')) return false;
    const fromIdx = args.indexOf('--from');
    if (fromIdx >= 0 && i === fromIdx + 1) return false;
    return true;
});

// npm/PowerShell sometimes drop `--from`; a path-like positional is treated as --from.
if (!fromPath && positional[0] && looksLikePath(positional[0])) {
    fromPath = positional[0];
}

const versionArg = positional.find((a) => !looksLikePath(a));
const version = versionArg || 'latest';

function rmrf(p) {
    fs.rmSync(p, { recursive: true, force: true });
}

function copyDir(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const from = path.join(src, entry.name);
        const to = path.join(dest, entry.name);
        if (entry.isDirectory()) copyDir(from, to);
        else fs.copyFileSync(from, to);
    }
}

function resolveSourceNativecore() {
    if (fromPath) {
        const abs = path.resolve(process.cwd(), fromPath);
        const candidates = [
            path.join(abs, '.nativecore'),
            abs.endsWith('.nativecore') ? abs : null,
            path.join(abs, 'template', '.nativecore'),
        ].filter(Boolean);

        for (const c of candidates) {
            if (fs.existsSync(path.join(c, 'core'))) {
                return { nativecore: c, label: `local:${c}` };
            }
        }
        throw new Error(
            `--from path did not contain .nativecore/core.\nTried: ${candidates.join(', ')}`
        );
    }

    const pkgSpec = `create-nativecore@${version}`;
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nc-sync-core-'));
    console.log(`[sync:core] Fetching ${pkgSpec} …`);

    const pack = spawnSync('npm', ['pack', pkgSpec, '--pack-destination', tmp], {
        encoding: 'utf8',
        shell: true,
    });
    if (pack.status !== 0) {
        rmrf(tmp);
        throw new Error(pack.stderr || pack.stdout || `npm pack failed for ${pkgSpec}`);
    }

    const tgzName = (pack.stdout || '')
        .trim()
        .split(/\r?\n/)
        .filter(Boolean)
        .pop();
    if (!tgzName) {
        rmrf(tmp);
        throw new Error('npm pack produced no tarball name');
    }

    const tgzPath = path.join(tmp, tgzName);
    const extractDir = path.join(tmp, 'extract');
    fs.mkdirSync(extractDir, { recursive: true });

    const tar = spawnSync('tar', ['-xzf', tgzPath, '-C', extractDir], {
        encoding: 'utf8',
        shell: true,
    });
    if (tar.status !== 0) {
        // Windows without tar: use npm's built-in via powershell Expand — try npx tar
        const tar2 = spawnSync(
            process.platform === 'win32' ? 'tar.exe' : 'tar',
            ['-xzf', tgzPath, '-C', extractDir],
            { encoding: 'utf8', shell: true }
        );
        if (tar2.status !== 0) {
            rmrf(tmp);
            throw new Error(
                `Failed to extract ${tgzName}. Install tar or sync with --from <local template>.\n${tar.stderr || tar2.stderr || ''}`
            );
        }
    }

    const nativecore = path.join(extractDir, 'package', 'template', '.nativecore');
    if (!fs.existsSync(path.join(nativecore, 'core'))) {
        rmrf(tmp);
        throw new Error(`Extracted package missing template/.nativecore/core under ${extractDir}`);
    }

    return { nativecore, label: pkgSpec, cleanup: () => rmrf(tmp) };
}

function main() {
    if (!fs.existsSync(DEST)) {
        throw new Error(`No .nativecore/ in project root: ${ROOT}`);
    }

    const source = resolveSourceNativecore();
    console.log(`[sync:core] Source: ${source.label}`);
    console.log(`[sync:core] Destination: ${DEST}`);

    const updated = [];
    for (const dir of SYNC_DIRS) {
        const from = path.join(source.nativecore, dir);
        const to = path.join(DEST, dir);
        if (!fs.existsSync(from)) {
            console.log(`[sync:core] skip missing ${dir}/`);
            continue;
        }
        rmrf(to);
        copyDir(from, to);
        updated.push(dir);
        console.log(`[sync:core] updated ${dir}/`);
    }

    if (source.cleanup) source.cleanup();

    console.log('');
    console.log(`[sync:core] Done. Updated: ${updated.join(', ') || '(nothing)'}`);
    console.log('[sync:core] Left untouched: .nativecore/dev, .nativecore/scripts, src/, server.js');
    console.log('[sync:core] Next: npm run compile && smoke-test your routes.');
}

try {
    main();
} catch (err) {
    console.error(`[sync:core] ${err.message || err}`);
    process.exit(1);
}

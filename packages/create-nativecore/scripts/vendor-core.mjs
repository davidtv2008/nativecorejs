/**
 * Vendor package-canonical Core into the create-nativecore template.
 *
 * Source of truth: packages/nativecorejs/.nativecore/
 * Destination:     packages/create-nativecore/template/.nativecore/
 *
 * Run from repo root or this package:
 *   node packages/create-nativecore/scripts/vendor-core.mjs
 *
 * Do not hand-edit vendored core in the template — change nativecorejs, then re-vendor.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const srcRoot = path.join(repoRoot, 'packages/nativecorejs/.nativecore');
const destRoot = path.join(repoRoot, 'packages/create-nativecore/template/.nativecore');

/** Paths under .nativecore that apps need from the package (Core runtime). */
const VENDOR_DIRS = ['core', 'utils', 'types', 'testing'];
// Note: scaffold-owned `dev/` and `scripts/` are never overwritten.

/** Keep scaffold-owned trees (generators, HMR, experimental Builder). */
const SKIP_DEST_ONLY = new Set(['dev', 'scripts']);

function copyDir(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const from = path.join(src, entry.name);
        const to = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDir(from, to);
        } else {
            fs.copyFileSync(from, to);
        }
    }
}

function rmDirContents(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        fs.rmSync(p, { recursive: true, force: true });
    }
}

if (!fs.existsSync(srcRoot)) {
    console.error(`[vendor-core] Missing source: ${srcRoot}`);
    process.exit(1);
}

for (const dir of VENDOR_DIRS) {
    const from = path.join(srcRoot, dir);
    const to = path.join(destRoot, dir);
    if (!fs.existsSync(from)) {
        console.warn(`[vendor-core] skip missing ${dir}`);
        continue;
    }
    rmDirContents(to);
    copyDir(from, to);
    console.log(`[vendor-core] vendored ${dir}/`);
}

// Preserve scaffold-only dirs notice
for (const keep of SKIP_DEST_ONLY) {
    const p = path.join(destRoot, keep);
    if (fs.existsSync(p)) {
        console.log(`[vendor-core] kept scaffold-owned ${keep}/`);
    }
}

console.log('[vendor-core] done. Package is canonical; template .nativecore core/utils/types/testing are vendored.');

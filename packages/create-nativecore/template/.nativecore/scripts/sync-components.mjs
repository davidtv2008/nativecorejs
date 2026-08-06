#!/usr/bin/env node
/**
 * Sync built-in nc-* UI components from a published create-nativecore release
 * (or a local template) into the app's src/components/core/.
 *
 * Updates (additive):
 *   - src/components/core/nc-*.{js,ts}  (overwrite framework files)
 *   - loading-spinner.* when present in the template
 *   - Missing registrations appended to frameworkRegistry / preloadRegistry
 *
 * Never deletes:
 *   - App-only files under src/components/core/
 *   - Custom registry entries
 *
 * Usage:
 *   npm run sync:components
 *   npm run sync:components -- latest
 *   npm run sync:components -- 2.0.1
 *   npm run sync:components -- ../nativecorejs/packages/create-nativecore/template
 *   set NC_SYNC_FROM=../path/to/template && npm run sync:components
 *
 * Runtime Core (router/state) is separate: npm run sync:core
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const DEST_CORE = path.join(ROOT, 'src', 'components', 'core');

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

if (!fromPath && positional[0] && looksLikePath(positional[0])) {
    fromPath = positional[0];
}

const versionArg = positional.find((a) => !looksLikePath(a));
const version = versionArg || 'latest';

function rmrf(p) {
    fs.rmSync(p, { recursive: true, force: true });
}

function resolveSourceTemplate() {
    if (fromPath) {
        const abs = path.resolve(process.cwd(), fromPath);
        const candidates = [
            path.join(abs, 'src', 'components', 'core'),
            path.join(abs, 'template', 'src', 'components', 'core'),
            abs.endsWith(`${path.sep}core`) || abs.endsWith('/core') ? abs : null,
        ].filter(Boolean);

        for (const c of candidates) {
            if (fs.existsSync(c) && fs.readdirSync(c).some((f) => f.startsWith('nc-'))) {
                const templateRoot = c.includes(`${path.sep}template${path.sep}`)
                    ? path.resolve(c, '../../..')
                    : path.resolve(c, '../../..');
                return { coreDir: c, templateRoot, label: `local:${c}` };
            }
        }
        throw new Error(
            `--from path did not contain src/components/core with nc-* files.\nTried: ${candidates.join(', ')}`
        );
    }

    const pkgSpec = `create-nativecore@${version}`;
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nc-sync-components-'));
    console.log(`[sync:components] Fetching ${pkgSpec} …`);

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

    const tar = spawnSync(
        process.platform === 'win32' ? 'tar.exe' : 'tar',
        ['-xzf', tgzPath, '-C', extractDir],
        { encoding: 'utf8', shell: true }
    );
    if (tar.status !== 0) {
        rmrf(tmp);
        throw new Error(`Failed to extract ${tgzName}.\n${tar.stderr || ''}`);
    }

    const templateRoot = path.join(extractDir, 'package', 'template');
    const coreDir = path.join(templateRoot, 'src', 'components', 'core');
    if (!fs.existsSync(coreDir)) {
        rmrf(tmp);
        throw new Error(`Extracted package missing template/src/components/core under ${extractDir}`);
    }

    return { coreDir, templateRoot, label: pkgSpec, cleanup: () => rmrf(tmp) };
}

function listComponentFiles(dir) {
    if (!fs.existsSync(dir)) return [];
    return fs
        .readdirSync(dir)
        .filter((name) => /^(nc-.+|loading-spinner)\.(js|ts)$/.test(name))
        .sort();
}

function detectExt(dir) {
    const files = listComponentFiles(dir);
    const ts = files.some((f) => f.endsWith('.ts'));
    const js = files.some((f) => f.endsWith('.js'));
    if (ts && !js) return 'ts';
    return 'js';
}

function mergeRegistry(registryPath, sourceRegistrations) {
    if (!fs.existsSync(registryPath) || sourceRegistrations.length === 0) {
        return { added: [] };
    }

    let content = fs.readFileSync(registryPath, 'utf8');
    const added = [];

    for (const { tag, modulePath } of sourceRegistrations) {
        const already = new RegExp(`register\\(\\s*['"]${tag}['"]`).test(content);
        if (already) continue;

        const line = `    componentRegistry.register('${tag}', '${modulePath}');\n`;
        if (/^}/m.test(content)) {
            content = content.replace(/\n}\s*$/, `\n${line}}\n`);
        } else if (content.includes('componentRegistry.register')) {
            const last = content.lastIndexOf('componentRegistry.register');
            const endLine = content.indexOf('\n', last);
            content = content.slice(0, endLine + 1) + line + content.slice(endLine + 1);
        } else {
            continue;
        }
        added.push(tag);
    }

    if (added.length) {
        fs.writeFileSync(registryPath, content, 'utf8');
    }
    return { added };
}

function extractRegistrations(registryFile) {
    if (!fs.existsSync(registryFile)) return [];
    const src = fs.readFileSync(registryFile, 'utf8');
    const out = [];
    const re = /componentRegistry\.register\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/g;
    let m;
    while ((m = re.exec(src))) {
        out.push({ tag: m[1], modulePath: m[2] });
    }
    return out;
}

async function main() {
    if (!fs.existsSync(path.join(ROOT, 'src', 'components'))) {
        throw new Error(`No src/components/ in project root: ${ROOT}`);
    }

    fs.mkdirSync(DEST_CORE, { recursive: true });

    const source = resolveSourceTemplate();
    console.log(`[sync:components] Source: ${source.label}`);
    console.log(`[sync:components] Destination: ${DEST_CORE}`);

    const srcFiles = listComponentFiles(source.coreDir);
    if (srcFiles.length === 0) {
        throw new Error(`No nc-* component files in ${source.coreDir}`);
    }

    const destExt = detectExt(DEST_CORE);
    const added = [];
    const updated = [];
    const seenBases = new Set();
    let esbuild = null;

    async function ensureEsbuild() {
        if (esbuild) return esbuild;
        try {
            esbuild = await import('esbuild');
            return esbuild;
        } catch {
            throw new Error(
                'Destination app is JavaScript but template components are TypeScript. ' +
                    'Install esbuild (devDependency) so sync:components can transpile, ' +
                    'or sync from a JS app tree with --from.'
            );
        }
    }

    for (const file of srcFiles) {
        const base = file.replace(/\.(js|ts)$/, '');
        if (seenBases.has(base)) continue;
        seenBases.add(base);

        const sourceHasDestExt = fs.existsSync(path.join(source.coreDir, `${base}.${destExt}`));
        const fromName = sourceHasDestExt ? `${base}.${destExt}` : file;
        const from = path.join(source.coreDir, fromName);
        const toName = `${base}.${destExt}`;
        const to = path.join(DEST_CORE, toName);
        const existed = fs.existsSync(to);

        if (fromName.endsWith(`.${destExt}`)) {
            fs.copyFileSync(from, to);
        } else if (fromName.endsWith('.ts') && destExt === 'js') {
            // Template on npm is TS; JS apps need a transpile pass.
            // eslint-disable-next-line no-await-in-loop
            const eb = await ensureEsbuild();
            const raw = fs.readFileSync(from, 'utf8');
            const result = eb.transformSync(raw, {
                loader: 'ts',
                format: 'esm',
                target: 'es2022',
            });
            fs.writeFileSync(to, result.code, 'utf8');
        } else if (fromName.endsWith('.js') && destExt === 'ts') {
            // Prefer keeping JS content as .ts only when types aren't required —
            // copy bytes; apps on TS usually already have .ts sources.
            fs.copyFileSync(from, to);
        } else {
            fs.copyFileSync(from, to);
        }

        if (existed) updated.push(toName);
        else added.push(toName);
    }

    const sourceRegistryPath = [
        path.join(source.templateRoot, 'src', 'components', 'frameworkRegistry.js'),
        path.join(source.templateRoot, 'src', 'components', 'frameworkRegistry.ts'),
    ].find((p) => fs.existsSync(p));

    const destRegistryPath = [
        path.join(ROOT, 'src', 'components', 'frameworkRegistry.js'),
        path.join(ROOT, 'src', 'components', 'frameworkRegistry.ts'),
    ].find((p) => fs.existsSync(p));

    let registryAdded = [];
    if (sourceRegistryPath && destRegistryPath) {
        const regs = extractRegistrations(sourceRegistryPath);
        registryAdded = mergeRegistry(destRegistryPath, regs).added;
    }

    // preloadRegistry — append missing preload lines when file exists
    const sourcePreload = [
        path.join(source.templateRoot, 'src', 'components', 'preloadRegistry.js'),
        path.join(source.templateRoot, 'src', 'components', 'preloadRegistry.ts'),
    ].find((p) => fs.existsSync(p));
    const destPreload = [
        path.join(ROOT, 'src', 'components', 'preloadRegistry.js'),
        path.join(ROOT, 'src', 'components', 'preloadRegistry.ts'),
    ].find((p) => fs.existsSync(p));

    let preloadAdded = [];
    if (sourcePreload && destPreload) {
        const regs = extractRegistrations(sourcePreload);
        // preload may use a different helper — only merge identical register() calls
        if (regs.length) {
            preloadAdded = mergeRegistry(destPreload, regs).added;
        }
    }

    if (source.cleanup) source.cleanup();

    console.log('');
    console.log(`[sync:components] Files added:   ${added.length ? added.join(', ') : '(none)'}`);
    console.log(`[sync:components] Files updated: ${updated.length ? updated.join(', ') : '(none)'}`);
    console.log(
        `[sync:components] Registry tags appended: ${registryAdded.length ? registryAdded.join(', ') : '(none)'}`
    );
    if (destPreload) {
        console.log(
            `[sync:components] Preload tags appended: ${preloadAdded.length ? preloadAdded.join(', ') : '(none)'}`
        );
    }
    console.log('[sync:components] App-only core files were left in place.');
    console.log('[sync:components] Next: npm run compile && smoke-test /components.');
}

try {
    await main();
} catch (err) {
    console.error(`[sync:components] ${err.message || err}`);
    process.exit(1);
}

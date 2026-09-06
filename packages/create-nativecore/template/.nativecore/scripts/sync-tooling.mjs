#!/usr/bin/env node
/**
 * Sync scaffold-owned editor/tooling config from a published create-nativecore
 * release (or local template) into an app, without clobbering developer-owned
 * root config.
 *
 * Supports additive merge/create for:
 *   - jsconfig.json / tsconfig.json (NativeCore path aliases)
 *   - .vscode/extensions.json       (recommended extensions)
 *
 * Never overwrites arbitrary app files. When an existing file cannot be parsed
 * or merged safely, it is skipped with a warning.
 *
 * Usage:
 *   npm run sync:tooling
 *   npm run sync:tooling -- latest
 *   npm run sync:tooling -- 1.0.0
 *   npm run sync:tooling -- ../path/to/create-nativecore/template
 *   set NC_SYNC_FROM=../path/to/template && npm run sync:tooling
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

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
    const rootIdx = args.indexOf('--root');
    if (rootIdx >= 0 && i === rootIdx + 1) return false;
    return true;
});

if (!fromPath && positional[0] && looksLikePath(positional[0])) {
    fromPath = positional[0];
}

const versionArg = positional.find((a) => !looksLikePath(a));
const version = versionArg || 'latest';
const rootEq = args.find((a) => a.startsWith('--root='));
const rootFlagIdx = args.indexOf('--root');
const rootArg = rootEq
    ? rootEq.slice('--root='.length)
    : rootFlagIdx >= 0
        ? args[rootFlagIdx + 1] || null
        : null;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(rootArg || process.env.NC_SYNC_ROOT || path.resolve(__dirname, '../..'));

function rmrf(targetPath) {
    fs.rmSync(targetPath, { recursive: true, force: true });
}

function writeJson(filePath, value) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function resolveSourceTemplate() {
    if (fromPath) {
        const abs = path.resolve(process.cwd(), fromPath);
        const candidates = [
            abs,
            path.join(abs, 'template'),
        ];

        for (const candidate of candidates) {
            if (fs.existsSync(path.join(candidate, 'tsconfig.json'))) {
                return { templateRoot: candidate, label: `local:${candidate}` };
            }
        }

        throw new Error(
            `--from path did not contain template files.\nTried: ${candidates.join(', ')}`
        );
    }

    const pkgSpec = `create-nativecore@${version}`;
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nc-sync-tooling-'));
    console.log(`[sync:tooling] Fetching ${pkgSpec} ...`);

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
    if (!fs.existsSync(path.join(templateRoot, 'tsconfig.json'))) {
        rmrf(tmp);
        throw new Error(`Extracted package missing template/tsconfig.json under ${extractDir}`);
    }

    return { templateRoot, label: pkgSpec, cleanup: () => rmrf(tmp) };
}

function loadSourceAliases(templateRoot) {
    const sourceTsconfig = readJson(path.join(templateRoot, 'tsconfig.json'));
    return sourceTsconfig?.compilerOptions?.paths ?? {};
}

function loadSourceRecommendations(templateRoot) {
    const filePath = path.join(templateRoot, '.vscode', 'extensions.json');
    if (!fs.existsSync(filePath)) return { recommendations: [], unwantedRecommendations: [] };

    const data = readJson(filePath);
    return {
        recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
        unwantedRecommendations: Array.isArray(data.unwantedRecommendations) ? data.unwantedRecommendations : [],
    };
}

function makeJsConfig(pathsConfig) {
    return {
        compilerOptions: {
            target: 'ES2020',
            module: 'ES2020',
            lib: ['ES2020', 'DOM', 'DOM.Iterable'],
            moduleResolution: 'node',
            allowJs: true,
            checkJs: false,
            baseUrl: '.',
            paths: pathsConfig,
        },
        include: [
            'src/**/*',
            '.nativecore/**/*',
        ],
        exclude: [
            'node_modules',
            'dist',
            'tests',
        ],
    };
}

function detectProjectLanguage(rootDir) {
    const configPath = path.join(rootDir, 'nativecore.config.json');
    if (fs.existsSync(configPath)) {
        try {
            const cfg = readJson(configPath);
            if (cfg.useTypeScript === true) return 'ts';
            if (cfg.useTypeScript === false) return 'js';
        } catch {
            // fall through to file-based detection
        }
    }

    if (fs.existsSync(path.join(rootDir, 'tsconfig.json'))) return 'ts';
    return 'js';
}

function mergeAliasConfig(filePath, pathsConfig, language) {
    if (!fs.existsSync(filePath)) {
        const created = language === 'js'
            ? makeJsConfig(pathsConfig)
            : { compilerOptions: { baseUrl: '.', paths: pathsConfig } };
        writeJson(filePath, created);
        return { status: 'created', added: Object.keys(pathsConfig) };
    }

    let data;
    try {
        data = readJson(filePath);
    } catch (error) {
        return { status: 'skipped', reason: `invalid JSON (${error.message})` };
    }

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return { status: 'skipped', reason: 'expected top-level JSON object' };
    }

    if (!data.compilerOptions || typeof data.compilerOptions !== 'object' || Array.isArray(data.compilerOptions)) {
        data.compilerOptions = {};
    }
    if (!data.compilerOptions.baseUrl) {
        data.compilerOptions.baseUrl = '.';
    }

    const existingPaths = data.compilerOptions.paths;
    if (existingPaths == null) {
        data.compilerOptions.paths = {};
    } else if (typeof existingPaths !== 'object' || Array.isArray(existingPaths)) {
        return { status: 'skipped', reason: 'compilerOptions.paths is not an object' };
    }

    const added = [];
    for (const [alias, targets] of Object.entries(pathsConfig)) {
        if (alias in data.compilerOptions.paths) continue;
        data.compilerOptions.paths[alias] = targets;
        added.push(alias);
    }

    if (added.length === 0) {
        return { status: 'unchanged', added: [] };
    }

    writeJson(filePath, data);
    return { status: 'merged', added };
}

function mergeExtensionsFile(filePath, sourceConfig) {
    if (!fs.existsSync(filePath)) {
        writeJson(filePath, sourceConfig);
        return {
            status: 'created',
            addedRecommendations: sourceConfig.recommendations,
            addedUnwanted: sourceConfig.unwantedRecommendations,
        };
    }

    let data;
    try {
        data = readJson(filePath);
    } catch (error) {
        return { status: 'skipped', reason: `invalid JSON (${error.message})` };
    }

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return { status: 'skipped', reason: 'expected top-level JSON object' };
    }

    if (data.recommendations == null) data.recommendations = [];
    if (data.unwantedRecommendations == null) data.unwantedRecommendations = [];
    if (!Array.isArray(data.recommendations)) {
        return { status: 'skipped', reason: 'recommendations is not an array' };
    }
    if (!Array.isArray(data.unwantedRecommendations)) {
        return { status: 'skipped', reason: 'unwantedRecommendations is not an array' };
    }

    const recommendationSet = new Set(data.recommendations);
    const unwantedSet = new Set(data.unwantedRecommendations);
    const addedRecommendations = [];
    const addedUnwanted = [];

    for (const item of sourceConfig.recommendations) {
        if (recommendationSet.has(item)) continue;
        data.recommendations.push(item);
        recommendationSet.add(item);
        addedRecommendations.push(item);
    }

    for (const item of sourceConfig.unwantedRecommendations) {
        if (unwantedSet.has(item)) continue;
        data.unwantedRecommendations.push(item);
        unwantedSet.add(item);
        addedUnwanted.push(item);
    }

    if (addedRecommendations.length === 0 && addedUnwanted.length === 0) {
        return { status: 'unchanged', addedRecommendations, addedUnwanted };
    }

    writeJson(filePath, data);
    return { status: 'merged', addedRecommendations, addedUnwanted };
}

function logOutcome(prefix, result, detailFormatter) {
    if (result.status === 'created' || result.status === 'merged') {
        console.log(`[sync:tooling] ${prefix}: ${detailFormatter(result)}`);
        return;
    }
    if (result.status === 'unchanged') {
        console.log(`[sync:tooling] ${prefix}: already up to date`);
        return;
    }
    console.warn(`[sync:tooling] ${prefix}: skipped - ${result.reason}`);
}

function main() {
    if (!fs.existsSync(path.join(ROOT, 'package.json'))) {
        throw new Error(`No package.json in project root: ${ROOT}`);
    }

    const source = resolveSourceTemplate();
    console.log(`[sync:tooling] Source: ${source.label}`);
    console.log(`[sync:tooling] Destination: ${ROOT}`);

    const language = detectProjectLanguage(ROOT);
    const aliases = loadSourceAliases(source.templateRoot);
    const recommendations = loadSourceRecommendations(source.templateRoot);

    const aliasTarget = language === 'ts'
        ? path.join(ROOT, 'tsconfig.json')
        : path.join(ROOT, 'jsconfig.json');

    const aliasResult = mergeAliasConfig(aliasTarget, aliases, language);
    logOutcome(path.basename(aliasTarget), aliasResult, (result) => {
        const action = result.status === 'created' ? 'created' : 'merged';
        return `${action} ${result.added.length} alias entr${result.added.length === 1 ? 'y' : 'ies'}`;
    });

    if (language === 'js' && fs.existsSync(path.join(ROOT, 'tsconfig.json'))) {
        const tsResult = mergeAliasConfig(path.join(ROOT, 'tsconfig.json'), aliases, 'ts');
        logOutcome('tsconfig.json', tsResult, (result) => {
            const action = result.status === 'created' ? 'created' : 'merged';
            return `${action} ${result.added.length} alias entr${result.added.length === 1 ? 'y' : 'ies'}`;
        });
    }

    const extResult = mergeExtensionsFile(path.join(ROOT, '.vscode', 'extensions.json'), recommendations);
    logOutcome('.vscode/extensions.json', extResult, (result) => {
        const count = result.addedRecommendations.length + result.addedUnwanted.length;
        const action = result.status === 'created' ? 'created' : 'merged';
        return `${action} ${count} recommendation entr${count === 1 ? 'y' : 'ies'}`;
    });

    if (source.cleanup) source.cleanup();

    console.log('');
    console.log('[sync:tooling] Done. Root tooling files were merged conservatively.');
    console.log('[sync:tooling] Left untouched: src/, server.js, env files, and custom app code.');
    console.log('[sync:tooling] Next: reload Cursor, then smoke-test F12 and alias imports.');
}

try {
    main();
} catch (err) {
    console.error(`[sync:tooling] ${err.message || err}`);
    process.exit(1);
}

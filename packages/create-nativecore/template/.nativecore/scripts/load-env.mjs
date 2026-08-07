/**
 * Load .env files into process.env (Vite-compatible cascade).
 *
 * Order (later overrides earlier; existing process.env always wins unless override):
 *   .env → .env.[mode] → .env.local → .env.[mode].local
 *
 * No dependency on the `dotenv` package — keeps scaffold installs lean.
 */
import fs from 'fs';
import path from 'path';

const DEFAULT_MODE = 'development';

/**
 * Parse a dotenv-style file body into a plain object.
 * @param {string} content
 * @returns {Record<string, string>}
 */
export function parseEnv(content) {
    /** @type {Record<string, string>} */
    const out = {};
    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;

        const exportPrefix = line.startsWith('export ') ? 'export '.length : 0;
        const eq = line.indexOf('=', exportPrefix);
        if (eq === -1) continue;

        const key = line.slice(exportPrefix, eq).trim();
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;

        let value = line.slice(eq + 1).trim();
        if (
            (value.startsWith('"') && value.endsWith('"'))
            || (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        } else {
            const hash = value.indexOf(' #');
            if (hash !== -1) value = value.slice(0, hash).trimEnd();
        }

        out[key] = value;
    }
    return out;
}

/**
 * @param {string} rootDir
 * @param {string} mode
 * @returns {string[]}
 */
export function envFileCandidates(rootDir, mode = DEFAULT_MODE) {
    return [
        path.join(rootDir, '.env'),
        path.join(rootDir, `.env.${mode}`),
        path.join(rootDir, '.env.local'),
        path.join(rootDir, `.env.${mode}.local`),
    ];
}

/**
 * @param {{ root?: string, mode?: string, override?: boolean }} [options]
 * @returns {{ loadedFiles: string[], values: Record<string, string> }}
 */
export function loadEnv(options = {}) {
    const root = options.root || process.cwd();
    const mode = options.mode || process.env.NODE_ENV || DEFAULT_MODE;
    const override = Boolean(options.override);

    /** @type {Record<string, string>} */
    const merged = {};
    /** @type {string[]} */
    const loadedFiles = [];

    for (const filePath of envFileCandidates(root, mode)) {
        if (!fs.existsSync(filePath)) continue;
        const parsed = parseEnv(fs.readFileSync(filePath, 'utf8'));
        Object.assign(merged, parsed);
        loadedFiles.push(filePath);
    }

    for (const [key, value] of Object.entries(merged)) {
        if (override || process.env[key] === undefined) {
            process.env[key] = value;
        }
    }

    if (!process.env.NODE_ENV) {
        process.env.NODE_ENV = mode;
    }

    return { loadedFiles, values: merged };
}

/**
 * Re-read env files when any candidate mtime changes (dev server).
 * @param {{ root?: string, mode?: string }} [options]
 */
export function createEnvReloader(options = {}) {
    const root = options.root || process.cwd();
    let lastStamp = '';

    function stamp() {
        const mode = options.mode || process.env.NODE_ENV || DEFAULT_MODE;
        return envFileCandidates(root, mode)
            .map((filePath) => {
                try {
                    return `${filePath}:${fs.statSync(filePath).mtimeMs}`;
                } catch {
                    return `${filePath}:missing`;
                }
            })
            .join('|');
    }

    return function reloadEnvIfChanged() {
        const next = stamp();
        if (next === lastStamp) return false;
        lastStamp = next;
        loadEnv({ root, mode: options.mode || process.env.NODE_ENV || DEFAULT_MODE, override: true });
        return true;
    };
}

#!/usr/bin/env node

/**
 * Store Generator Script
 *
 * Creates a module-level reactive store with typed state and actions.
 *
 * Usage:
 *   node .nativecore/scripts/make-store.mjs task
 *   npm run make:store task
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// ─── Detect project language mode ───────────────────────────────────────────
const ROOT = path.resolve(__dirname, '../..');
let useTypeScript = true;
try {
    const ncConfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'nativecore.config.json'), 'utf8'));
    if (ncConfig.useTypeScript === false) useTypeScript = false;
} catch { /* default to TypeScript */ }
const ext = useTypeScript ? 'ts' : 'js';

const storeArg = process.argv[2];

async function main() {
    console.log('NativeCore Store Generator\n');

    let storeName = storeArg;
    if (!storeName) {
        storeName = await question('Store name (e.g., "task", "user-profile"): ');
    }

    if (!storeName) {
        console.error('Error: Store name is required');
        rl.close();
        process.exit(1);
    }

    // Normalize to kebab-case
    const kebabName = storeName.toLowerCase().replace(/\s+/g, '-');
    const camelName = kebabName.replace(/-([a-z])/g, (_, g) => g.toUpperCase());
    const PascalName = camelName.charAt(0).toUpperCase() + camelName.slice(1);
    const titleName = kebabName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    const storesDir = path.resolve(ROOT, 'src', 'stores');
    const storeFile = path.join(storesDir, `${kebabName}.store.${ext}`);
    const indexFile = path.join(storesDir, `index.${ext}`);

    // Ensure stores directory exists
    if (!fs.existsSync(storesDir)) {
        fs.mkdirSync(storesDir, { recursive: true });
    }

    if (fs.existsSync(storeFile)) {
        console.error(`Error: Store "${kebabName}.store.${ext}" already exists`);
        rl.close();
        process.exit(1);
    }

    // ─── TypeScript template ─────────────────────────────────────────────────
    const tsTemplate = `/**
 * ${titleName} Store
 *
 * Module-level state: initialized once on first import, persists for the
 * entire app session, and is shared by every controller / component that
 * imports it.
 *
 * Pattern — wrap module-level state declarations between
 * pausePageCleanupCollection() and resumePageCleanupCollection() so the
 * Page Cleanup Registry does not tear them down on navigation.
 */
import { useState, computed, batch } from '@core/state.js';
import { pausePageCleanupCollection, resumePageCleanupCollection } from '@core/pageCleanupRegistry.js';
import api from '@services/api.service.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ${PascalName} {
    id: string;
    // TODO: add your fields here
    [key: string]: unknown;
}

// ── Module-level state ────────────────────────────────────────────────────────

pausePageCleanupCollection();

export const ${camelName}Items   = useState<${PascalName}[]>([]);
export const ${camelName}Loading = useState(false);
export const ${camelName}Error   = useState<string | null>(null);

resumePageCleanupCollection();

// ── Derived / computed ────────────────────────────────────────────────────────

export const ${camelName}Count = computed(() => ${camelName}Items.value.length);

// ── Actions ───────────────────────────────────────────────────────────────────

export async function load${PascalName}s(force = false): Promise<void> {
    if (${camelName}Loading.value) return;

    batch(() => {
        ${camelName}Loading.value = true;
        ${camelName}Error.value   = null;
    });

    try {
        const data = await api.getCached('/${kebabName}s', {
            ttl:        60_000,
            revalidate: !force,
            queryKey:   ['${kebabName}s', 'list'],
            tags:       ['${kebabName}s'],
        });
        batch(() => {
            ${camelName}Items.value   = data as ${PascalName}[];
            ${camelName}Loading.value = false;
        });
    } catch (err) {
        batch(() => {
            ${camelName}Error.value   = err instanceof Error ? err.message : 'Failed to load ${titleName.toLowerCase()}s';
            ${camelName}Loading.value = false;
        });
    }
}

export async function add${PascalName}(item: Omit<${PascalName}, 'id'>): Promise<void> {
    try {
        const created = await api.post('/${kebabName}s', item) as ${PascalName};
        ${camelName}Items.value = [...${camelName}Items.value, created];
        api.invalidateTags(['${kebabName}s']);
    } catch (err) {
        ${camelName}Error.value = err instanceof Error ? err.message : 'Failed to add ${titleName.toLowerCase()}';
    }
}

export async function remove${PascalName}(id: string): Promise<void> {
    const previous = ${camelName}Items.value;
    ${camelName}Items.value = previous.filter(item => item.id !== id);

    try {
        await api.delete(\`/${kebabName}s/\${id}\`);
        api.invalidateTags(['${kebabName}s']);
    } catch (err) {
        ${camelName}Items.value = previous;
        ${camelName}Error.value = err instanceof Error ? err.message : 'Failed to remove ${titleName.toLowerCase()}';
    }
}
`;

    // ─── JavaScript template ─────────────────────────────────────────────────
    const jsTemplate = `/**
 * ${titleName} Store
 *
 * Module-level state: initialized once on first import, persists for the
 * entire app session, and is shared by every controller / component that
 * imports it.
 */
import { useState, computed, batch } from '@core/state.js';
import { pausePageCleanupCollection, resumePageCleanupCollection } from '@core/pageCleanupRegistry.js';
import api from '@services/api.service.js';

// ── Module-level state ────────────────────────────────────────────────────────

pausePageCleanupCollection();

export const ${camelName}Items   = useState([]);
export const ${camelName}Loading = useState(false);
export const ${camelName}Error   = useState(null);

resumePageCleanupCollection();

// ── Derived / computed ────────────────────────────────────────────────────────

export const ${camelName}Count = computed(() => ${camelName}Items.value.length);

// ── Actions ───────────────────────────────────────────────────────────────────

export async function load${PascalName}s(force = false) {
    if (${camelName}Loading.value) return;

    batch(() => {
        ${camelName}Loading.value = true;
        ${camelName}Error.value   = null;
    });

    try {
        const data = await api.getCached('/${kebabName}s', {
            ttl:        60_000,
            revalidate: !force,
            queryKey:   ['${kebabName}s', 'list'],
            tags:       ['${kebabName}s'],
        });
        batch(() => {
            ${camelName}Items.value   = data;
            ${camelName}Loading.value = false;
        });
    } catch (err) {
        batch(() => {
            ${camelName}Error.value   = err instanceof Error ? err.message : 'Failed to load ${titleName.toLowerCase()}s';
            ${camelName}Loading.value = false;
        });
    }
}

export async function add${PascalName}(item) {
    try {
        const created = await api.post('/${kebabName}s', item);
        ${camelName}Items.value = [...${camelName}Items.value, created];
        api.invalidateTags(['${kebabName}s']);
    } catch (err) {
        ${camelName}Error.value = err instanceof Error ? err.message : 'Failed to add ${titleName.toLowerCase()}';
    }
}

export async function remove${PascalName}(id) {
    const previous = ${camelName}Items.value;
    ${camelName}Items.value = previous.filter(item => item.id !== id);

    try {
        await api.delete(\`/${kebabName}s/\${id}\`);
        api.invalidateTags(['${kebabName}s']);
    } catch (err) {
        ${camelName}Items.value = previous;
        ${camelName}Error.value = err instanceof Error ? err.message : 'Failed to remove ${titleName.toLowerCase()}';
    }
}
`;

    const storeTemplate = useTypeScript ? tsTemplate : jsTemplate;

    fs.writeFileSync(storeFile, storeTemplate);
    console.log(`\n✓ Created store: src/stores/${kebabName}.store.${ext}`);

    // Update index barrel
    if (fs.existsSync(indexFile)) {
        let indexContent = fs.readFileSync(indexFile, 'utf-8');
        const exportLine = `export * from './${kebabName}.store.js';`;
        if (!indexContent.includes(exportLine)) {
            indexContent = indexContent.trimEnd() + '\n' + exportLine + '\n';
            fs.writeFileSync(indexFile, indexContent);
            console.log(`✓ Exported from: src/stores/index.${ext}`);
        }
    } else {
        fs.writeFileSync(indexFile, `export * from './${kebabName}.store.js';\n`);
        console.log(`✓ Created barrel: src/stores/index.${ext}`);
    }

    console.log('\nNext steps:');
    console.log(`  1. Edit src/stores/${kebabName}.store.${ext} — add your types and fields`);
    console.log(`  2. Import in a controller:  import { load${PascalName}s, ${camelName}Items } from '@stores/${kebabName}.store.js';`);
    console.log(`  3. Call load${PascalName}s() in the controller setup`);

    rl.close();
}

main().catch(err => {
    console.error(err);
    rl.close();
    process.exit(1);
});


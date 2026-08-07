#!/usr/bin/env node
/**
 * Bake public env into index.html for static / production deploys.
 *
 * Dev server also injects on each HTML response so .env edits apply without
 * a full rebuild — this script keeps build artifacts and cold starts correct.
 *
 * Usage:
 *   node .nativecore/scripts/write-public-env.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadEnv } from './load-env.mjs';
import { getPublicEnv, injectPublicEnvIntoHtml } from './public-env.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

const { loadedFiles } = loadEnv({ root: rootDir });
const publicEnv = getPublicEnv();

const htmlPath = path.join(rootDir, 'index.html');
if (!fs.existsSync(htmlPath)) {
    console.error('[env] index.html not found — skipped public env write');
    process.exit(1);
}

const before = fs.readFileSync(htmlPath, 'utf8');
const after = injectPublicEnvIntoHtml(before, publicEnv);
if (after !== before) {
    fs.writeFileSync(htmlPath, after, 'utf8');
}

const keys = Object.keys(publicEnv).sort();
console.log(
    `[env] Public env baked into index.html (${keys.length} key${keys.length === 1 ? '' : 's'})`
);
if (loadedFiles.length) {
    console.log(`[env] Loaded: ${loadedFiles.map((f) => path.relative(rootDir, f)).join(', ')}`);
} else {
    console.log('[env] No .env file found — using process.env / empty public overlay');
}
if (keys.length) {
    console.log(`[env] Keys: ${keys.join(', ')}`);
}

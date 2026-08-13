#!/usr/bin/env node
/**
 * Clean only isolated production build outputs.
 *
 * The development server owns dist/, so production builds must never remove
 * or recreate that directory while the dev watcher is running.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '../..');
const targets = ['dist-prod', '_deploy'];

for (const target of targets) {
    const targetPath = path.join(rootDir, target);
    fs.rmSync(targetPath, { recursive: true, force: true });
}


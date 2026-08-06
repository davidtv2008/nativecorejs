#!/usr/bin/env node
/**
 * Remove a module store created by make:store.
 * Usage: npm run remove:store <name> -- --yes
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

let useTypeScript = false;
try {
    const ncConfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'nativecore.config.json'), 'utf8'));
    if (ncConfig.useTypeScript === true) useTypeScript = true;
} catch { /* default JS */ }
const ext = useTypeScript ? 'ts' : 'js';

const args = process.argv.slice(2);
const name = args.find((a) => !a.startsWith('--'));
const autoYes = args.includes('--yes') || args.includes('--defaults') || !process.stdin.isTTY;

if (!name) {
    console.error('Error: Store name is required');
    console.log('Usage: npm run remove:store <name> [-- --yes]');
    process.exit(1);
}

const file = path.join(ROOT, 'src', 'stores', `${name}.store.${ext}`);
const barrel = path.join(ROOT, 'src', 'stores', `index.${ext}`);

if (!autoYes) {
    console.log(`Will remove: ${file}`);
    console.log('Re-run with --yes to confirm.');
    process.exit(0);
}

if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    console.log(`Removed: ${file}`);
} else {
    console.log(`Not found: ${file}`);
}

if (fs.existsSync(barrel)) {
    let content = fs.readFileSync(barrel, 'utf8');
    const next = content
        .split('\n')
        .filter((line) => !line.includes(`./${name}.store.`) && !line.includes(`'./${name}.store`))
        .join('\n');
    if (next !== content) {
        fs.writeFileSync(barrel, next);
        console.log(`Updated: ${barrel}`);
    }
}

console.log('Done.');

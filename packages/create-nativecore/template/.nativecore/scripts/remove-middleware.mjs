#!/usr/bin/env node
/**
 * Remove middleware created by make:middleware.
 * Usage: npm run remove:middleware <name> -- --yes
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
const rawName = args.find((a) => !a.startsWith('--'));
const autoYes = args.includes('--yes') || args.includes('--defaults') || !process.stdin.isTTY;

if (!rawName) {
    console.error('Error: Middleware name is required');
    console.log('Usage: npm run remove:middleware <name> [-- --yes]');
    process.exit(1);
}

const kebab = rawName
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
const camel = kebab.split('-').map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1))).join('');

const file = path.join(ROOT, 'src', 'middleware', `${kebab}.middleware.${ext}`);
const appFile = path.join(ROOT, 'src', `app.${ext}`);

if (!autoYes) {
    console.log(`Will remove: ${file}`);
    console.log(`Will strip import/use of ${camel}Middleware from src/app.${ext}`);
    console.log('Re-run with --yes to confirm.');
    process.exit(0);
}

if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    console.log(`Removed: ${file}`);
} else {
    console.log(`Not found: ${file}`);
}

if (fs.existsSync(appFile)) {
    let content = fs.readFileSync(appFile, 'utf8');
    const before = content;
    content = content
        .split('\n')
        .filter((line) => {
            if (line.includes(`@middleware/${kebab}.middleware`)) return false;
            if (line.includes(`createMiddleware('${kebab}'`)) return false;
            if (line.includes(`${camel}Middleware`)) return false;
            return true;
        })
        .join('\n');
    if (content !== before) {
        fs.writeFileSync(appFile, content);
        console.log(`Updated: ${appFile}`);
    }
}

console.log('Done.');

#!/usr/bin/env node
/**
 * Bundle CSS files into a single optimized stylesheet
 * Combines multiple CSS files to reduce critical rendering path
 *
 * Resolves @import in each file (relative paths only) before concatenation.
 *
 * Usage: node bundle-css.mjs [--outdir dist-prod]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '../../');

// CSS files in order (order matters for cascading)
const cssFiles = [
    'src/styles/core-variables.css',
    'src/styles/core.css',
    'src/styles/variables.css',
    'src/styles/shell.css',
    'src/styles/main.css',
];

const IMPORT_RE = /@import\s+(?:url\(\s*['"]?([^'")]+)['"]?\s*\)|['"]([^'"]+)['"])\s*;/g;

/**
 * Recursively inline relative @import statements.
 * @param {string} content
 * @param {string} fileDir - absolute directory of the current file
 * @param {Set<string>} visited - cycle detection
 */
function resolveImports(content, fileDir, visited = new Set()) {
    return content.replace(IMPORT_RE, (_match, urlPath, quotePath) => {
        const importPath = (urlPath || quotePath).trim();
        if (/^(https?:|\/\/)/.test(importPath)) {
            return _match;
        }

        const absPath = path.resolve(fileDir, importPath);
        if (visited.has(absPath)) {
            throw new Error(`Circular @import: ${importPath}`);
        }
        if (!fs.existsSync(absPath)) {
            throw new Error(`@import not found: ${importPath} (resolved: ${absPath})`);
        }

        visited.add(absPath);
        const imported = fs.readFileSync(absPath, 'utf8');
        const resolved = resolveImports(imported, path.dirname(absPath), visited);
        visited.delete(absPath);

        const label = path.relative(rootDir, absPath).replace(/\\/g, '/');
        return `/* @import ${label} */\n${resolved}`;
    });
}

function readCssFile(relativePath) {
    const filePath = path.join(rootDir, relativePath);
    const content = fs.readFileSync(filePath, 'utf8');
    return resolveImports(content, path.dirname(filePath));
}

function getOutputRoot() {
    const outdirIndex = process.argv.indexOf('--outdir');
    const requestedOutdir = outdirIndex >= 0 ? process.argv[outdirIndex + 1] : null;
    return requestedOutdir
        ? path.resolve(rootDir, requestedOutdir)
        : path.join(rootDir, 'dist');
}

export async function bundleCSS(outputRoot = getOutputRoot()) {
    try {
        const outputPath = path.join(outputRoot, 'src/styles/bundle.css');

        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        let bundledContent = '/* Bundled CSS - Generated automatically */\n\n';

        for (const file of cssFiles) {
            const filePath = path.join(rootDir, file);

            if (!fs.existsSync(filePath)) {
                console.warn(`⚠️  CSS file not found: ${file}`);
                continue;
            }

            const content = readCssFile(file);
            bundledContent += `/* === ${path.basename(file)} === */\n${content}\n\n`;
        }

        fs.writeFileSync(outputPath, bundledContent, 'utf8');

        const stats = fs.statSync(outputPath);
        const sizeKb = (stats.size / 1024).toFixed(2);

        console.log(`✅ CSS bundled successfully`);
        const relativeOutput = path.relative(rootDir, outputPath).replace(/\\/g, '/');
        console.log(`   Output: ${relativeOutput} (${sizeKb} KB)`);

    } catch (error) {
        console.error('❌ CSS bundling failed:', error.message);
        process.exit(1);
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    bundleCSS();
}

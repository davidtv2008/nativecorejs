#!/usr/bin/env node
/**
 * Bundle CSS files into a single optimized stylesheet
 * Combines multiple CSS files to reduce critical rendering path
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
    'src/styles/main.css',
];

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

        // Ensure output directory exists
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Read and concatenate all CSS files
        let bundledContent = '/* Bundled CSS - Generated automatically */\n\n';
        
        for (const file of cssFiles) {
            const filePath = path.join(rootDir, file);
            
            if (!fs.existsSync(filePath)) {
                console.warn(`⚠️  CSS file not found: ${file}`);
                continue;
            }

            const content = fs.readFileSync(filePath, 'utf8');
            bundledContent += `/* === ${path.basename(file)} === */\n${content}\n\n`;
        }

        // Write bundled CSS
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

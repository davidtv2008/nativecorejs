#!/usr/bin/env node
/**
 * TypeScript Conversion Helper
 * Converts all remaining .js files to .ts with basic type annotations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, '..', 'src');

// Files to skip (already converted or special cases)
const skipFiles = new Set([
    'state.ts', 'component.ts', 'router.ts', 'http.ts',
    'auth.service.ts', 'api.service.ts', 'storage.service.ts'
]);

// Basic type inference rules
const typeInference = {
    'const.*=.*\\[\\]': 'any[]',
    'const.*=.*\\{\\}': 'Record<string, any>',
    'const.*=.*useState\\(': 'State',
    'const.*=.*computed\\(': 'ComputedState',
};

function convertJsToTs(content) {
    let tsContent = content;
    
    // Remove .js extensions from imports
    tsContent = tsContent.replace(/from ['"](.*)\.js['"]/g, "from '$1'");
    
    // Add basic type annotations to function parameters
    tsContent = tsContent.replace(
        /function\s+(\w+)\s*\(([^)]*)\)/g,
        (match, funcName, params) => {
            const typedParams = params
                .split(',')
                .map(p => p.trim())
                .filter(p => p)
                .map(p => {
                    if (p.includes('=')) {
                        const [name, defaultValue] = p.split('=').map(s => s.trim());
                        return `${name}: any = ${defaultValue}`;
                    }
                    return `${p}: any`;
                })
                .join(', ');
            return `function ${funcName}(${typedParams})`;
        }
    );
    
    // Add void return types to functions without returns
    tsContent = tsContent.replace(
        /(function\s+\w+\([^)]*\))\s*\{/g,
        '$1: void {'
    );
    
    return tsContent;
}

function processFile(filePath) {
    const ext = path.extname(filePath);
    const basename = path.basename(filePath);
    
    if (ext !== '.js' || skipFiles.has(basename)) {
        return;
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const tsContent = convertJsToTs(content);
    const tsPath = filePath.replace(/\.js$/, '.ts');
    
    fs.writeFileSync(tsPath, tsContent, 'utf-8');
    console.log(`✅ Converted: ${path.relative(srcDir, filePath)} → ${path.basename(tsPath)}`);
    
    // Delete old .js file
    fs.unlinkSync(filePath);
    console.log(`🗑️  Deleted: ${path.relative(srcDir, filePath)}`);
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            walkDir(filePath);
        } else if (stat.isFile()) {
            processFile(filePath);
        }
    }
}

console.log('🚀 Starting TypeScript conversion...\n');
walkDir(srcDir);
console.log('\n✨ Conversion complete!');
console.log('\n📝 Next steps:');
console.log('   1. Run: npm run typecheck');
console.log('   2. Fix any type errors');
console.log('   3. Add proper type annotations to converted files');

#!/usr/bin/env node

/**
 * Core Component Removal Script
 * Removes core component file and imports from preloadRegistry.ts
 * 
 * Usage:
 *   node scripts/remove-core-component.mjs nc-button
 *   npm run remove:core-component nc-button
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get component name from command line
const componentName = process.argv[2];

if (!componentName) {
  console.error('❌ Error: Component name is required');
  console.log('\nUsage:');
  console.log('  npm run remove:core-component <name>');
  console.log('\nExample:');
  console.log('  npm run remove:core-component nc-button');
  process.exit(1);
}

// Validate component name format
if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)+$/.test(componentName)) {
  console.error('❌ Error: Component name must be in kebab-case with at least one hyphen');
  process.exit(1);
}

// Paths
const componentsDir = path.resolve(__dirname, '..', 'src', 'components');
const coreDir = path.join(componentsDir, 'core');
const componentFile = path.join(coreDir, `${componentName}.ts`);
const preloadFile = path.join(componentsDir, 'preloadRegistry.ts');

console.log(`\n🗑️  Removing core component: ${componentName}\n`);

// Step 1: Check if component file exists
if (!fs.existsSync(componentFile)) {
  console.error(`❌ Error: Core component file "${componentName}.ts" does not exist`);
  console.log(`   Expected location: src/components/core/${componentName}.ts`);
  process.exit(1);
}

// Step 2: Remove from preloadRegistry.ts
let removedFromPreload = false;
if (fs.existsSync(preloadFile)) {
  let preloadContent = fs.readFileSync(preloadFile, 'utf-8');
  const preloadPattern = new RegExp(`import\\s+['\"]\\./core/${componentName}\\.js['\"];?\\s*\\n`, 'g');
  
  if (preloadPattern.test(preloadContent)) {
    preloadContent = preloadContent.replace(preloadPattern, '');
    fs.writeFileSync(preloadFile, preloadContent);
    console.log('✅ Removed from preloadRegistry.ts');
    removedFromPreload = true;
  } else {
    console.log('⚠️  Import not found in preloadRegistry.ts (may have been manually removed)');
  }
} else {
  console.log('⚠️  preloadRegistry.ts not found');
}

// Step 3: Find and list usages in codebase
console.log(`\n🔍 Searching for <${componentName}> usage in codebase...`);

const usagePattern = new RegExp(`<${componentName}[^>]*>`, 'g');
const closingPattern = new RegExp(`</${componentName}>`, 'g');
const usages = [];

// Search in specific directories
const searchDirs = [
  path.resolve(__dirname, '..', 'src', 'views', 'pages'),
  path.resolve(__dirname, '..', 'src', 'components'),
  path.resolve(__dirname, '..', 'src', 'controllers'),
  path.resolve(__dirname, '..', 'index.html'),
];

function searchDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  
  const stat = fs.statSync(dirPath);
  
  if (stat.isDirectory()) {
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const file of files) {
      const fullPath = path.join(dirPath, file.name);
      
      if (file.isDirectory()) {
        searchDirectory(fullPath);
      } else if (file.name.endsWith('.html') || file.name.endsWith('.ts')) {
        checkFileForUsage(fullPath);
      }
    }
  } else if (stat.isFile()) {
    checkFileForUsage(dirPath);
  }
}

function checkFileForUsage(filePath) {
  // Skip the component file itself
  if (filePath === componentFile) return;
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const openingMatches = content.match(usagePattern);
  const closingMatches = content.match(closingPattern);
  
  if (openingMatches || closingMatches) {
    const relativePath = path.relative(path.resolve(__dirname, '..'), filePath);
    usages.push({
      file: relativePath,
      count: (openingMatches?.length || 0) + (closingMatches?.length || 0)
    });
  }
}

searchDirs.forEach(searchDirectory);

// Step 4: Display usages and warning
if (usages.length > 0) {
  console.log(`\n⚠️  WARNING: Found usage in ${usages.length} file(s):\n`);
  
  for (const usage of usages) {
    console.log(`   - ${usage.file} (${usage.count} occurrence${usage.count > 1 ? 's' : ''})`);
  }
  
  console.log(`\n⚠️  Core components are framework components used across the app.`);
  console.log(`   Removing them may break functionality. Please review usages carefully.\n`);
  console.log(`❌ Aborting removal. Please manually remove usages first.\n`);
  process.exit(1);
}

// Step 5: Delete the component file
try {
  fs.unlinkSync(componentFile);
  console.log(`✅ Deleted component file: src/components/core/${componentName}.ts`);
} catch (error) {
  console.error(`❌ Error deleting component file: ${error.message}`);
  process.exit(1);
}

// Summary
console.log(`\n✅ Core component "${componentName}" removed successfully!\n`);
console.log('📝 Summary:');
console.log(`   ✓ Deleted: src/components/core/${componentName}.ts`);
if (removedFromPreload) {
  console.log(`   ✓ Removed from: src/components/preloadRegistry.ts`);
}
console.log('');

#!/usr/bin/env node

/**
 * Component Removal Script
 * Removes component file, import from registry.ts, and usage from codebase
 * 
 * Usage:
 *   node scripts/remove-component.mjs sample-component
 *   npm run remove:component sample-component
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
  console.log('  npm run clean:component <name>');
  console.log('\nExample:');
  console.log('  npm run clean:component my-card');
  process.exit(1);
}

// Validate component name format
if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)+$/.test(componentName)) {
  console.error('❌ Error: Component name must be in kebab-case with at least one hyphen');
  process.exit(1);
}

// Paths
const componentsDir = path.resolve(__dirname, '..', 'src', 'components');
const uiDir = path.join(componentsDir, 'ui');
const componentFile = path.join(uiDir, `${componentName}.ts`);
const registryFile = path.join(componentsDir, 'registry.ts');

console.log(`\n🗑️  Removing component: ${componentName}\n`);

// Step 1: Check if component file exists
if (!fs.existsSync(componentFile)) {
  console.error(`❌ Error: Component file "${componentName}.ts" does not exist`);
  console.log(`   Expected location: src/components/ui/${componentName}.ts`);
  process.exit(1);
}

// Step 2: Remove from registry.ts (lazy loading registration)
let removedFromIndex = false;
if (fs.existsSync(registryFile)) {
  let indexContent = fs.readFileSync(registryFile, 'utf-8');
  const registrationPattern = new RegExp(`componentRegistry\\.register\\('${componentName}'[^\\n]*\\n`, 'g');
  
  if (registrationPattern.test(indexContent)) {
    // Remove the registration line
    indexContent = indexContent.replace(registrationPattern, '');
    
    fs.writeFileSync(registryFile, indexContent);
    console.log('✅ Removed registration from registry.ts');
    removedFromIndex = true;
  } else {
    console.log('⚠️  Registration not found in registry.ts (may have been manually removed)');
  }
} else {
  console.log('⚠️  registry.ts not found');
}

// Step 2.5: Remove from preloadRegistry.ts if it exists
const preloadFile = path.join(componentsDir, 'preloadRegistry.ts');
let removedFromPreload = false;

if (fs.existsSync(preloadFile)) {
  let preloadContent = fs.readFileSync(preloadFile, 'utf-8');
  const preloadPattern = new RegExp(`import\\s+['\"]\\./ui/${componentName}\\.js['\"];?\\s*\\n`, 'g');
  
  if (preloadPattern.test(preloadContent)) {
    preloadContent = preloadContent.replace(preloadPattern, '');
    fs.writeFileSync(preloadFile, preloadContent);
    console.log('✅ Removed from preloadRegistry.ts');
    removedFromPreload = true;
  }
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
];

function searchDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  
  const files = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dirPath, file.name);
    
    if (file.isDirectory()) {
      searchDirectory(fullPath);
    } else if (file.name.endsWith('.html') || file.name.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const openingMatches = content.match(usagePattern);
      const closingMatches = content.match(closingPattern);
      
      if (openingMatches || closingMatches) {
        const relativePath = path.relative(path.resolve(__dirname, '..'), fullPath);
        usages.push({
          file: relativePath,
          count: (openingMatches?.length || 0) + (closingMatches?.length || 0)
        });
      }
    }
  }
}

searchDirs.forEach(searchDirectory);

// Step 4: Remove usages from files
if (usages.length > 0) {
  console.log(`\n📋 Found usage in ${usages.length} file(s):\n`);
  
  for (const usage of usages) {
    console.log(`   - ${usage.file} (${usage.count} occurrence${usage.count > 1 ? 's' : ''})`);
  }
  
  console.log(`\n🗑️  Removing <${componentName}> tags from files...`);
  
  for (const usage of usages) {
    const fullPath = path.resolve(__dirname, '..', usage.file);
    let content = fs.readFileSync(fullPath, 'utf-8');
    
    // Remove self-closing tags: <component-name />
    content = content.replace(new RegExp(`<${componentName}\\s*\\/?>`, 'g'), '');
    
    // Remove opening and closing tags: <component-name></component-name>
    content = content.replace(new RegExp(`<${componentName}[^>]*>[\\s\\S]*?<\\/${componentName}>`, 'g'), '');
    
    fs.writeFileSync(fullPath, content);
    console.log(`   ✅ Cleaned ${usage.file}`);
  }
} else {
  console.log('   No usages found ✨');
}

// Step 5: Delete the component file
fs.unlinkSync(componentFile);
console.log(`\n✅ Deleted component file: ${componentName}.ts`);

// Summary
console.log('\n✨ Component removed successfully!\n');
console.log('📊 Summary:');
console.log(`   🗑️  Deleted: src/components/ui/${componentName}.ts`);
console.log(`   ${removedFromIndex ? '✅' : '⚠️ '} Registry.ts: ${removedFromIndex ? 'Updated' : 'Not found'}`);
if (removedFromPreload) {
  console.log(`   ✅ PreloadRegistry.ts: Removed`);
}
console.log(`   📝 Files cleaned: ${usages.length}`);
console.log('');

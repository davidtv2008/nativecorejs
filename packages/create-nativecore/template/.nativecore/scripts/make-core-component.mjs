#!/usr/bin/env node

/**
 * Core Component Generator Script
 * Creates framework core components with --nc- variables
 * 
 * Usage:
 *   node scripts/make-core-component.mjs button
 *   npm run make:core-component button
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Detect project language mode ───────────────────────────────────────────
const ROOT = path.resolve(__dirname, '../..');
let useTypeScript = true;
try {
    const ncConfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'nativecore.config.json'), 'utf8'));
    if (ncConfig.useTypeScript === false) useTypeScript = false;
} catch { /* default to TypeScript */ }
const ext = useTypeScript ? 'ts' : 'js';

// Get component name from command line
const componentName = process.argv[2];

if (!componentName) {
  console.error('Error: Component name is required');
  console.log('\nUsage:');
  console.log('  npm run make:core-component <name>');
  console.log('\nExample:');
  console.log('  npm run make:core-component button');
  process.exit(1);
}

// Validate component name (no hyphen needed for core components - we add nc- prefix)
if (!/^[a-z][a-z0-9-]*$/.test(componentName)) {
  console.error('Error: Component name must be lowercase with optional hyphens');
  console.error('\nValid examples:');
  console.error('   - button');
  console.error('   - card');
  console.error('   - input');
  console.error('   - dropdown-menu');
  process.exit(1);
}

// Generate names
const tagName = `nc-${componentName}`; // e.g., nc-button
const className = tagName
  .split('-')
  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
  .join(''); // e.g., NcButton

// Component file path (in components/core folder)
const componentsDir = path.resolve(ROOT, 'src', 'components');
const coreDir = path.join(componentsDir, 'core');
const componentFile = path.join(coreDir, `${tagName}.${ext}`);
const preloadRegistryFile = path.join(componentsDir, `preloadRegistry.${ext}`);

// Ensure core directory exists
if (!fs.existsSync(coreDir)) {
  fs.mkdirSync(coreDir, { recursive: true });
}

// Check if component already exists
if (fs.existsSync(componentFile)) {
  console.error(`Error: Component "${tagName}.${ext}" already exists`);
  process.exit(1);
}

// ─── TypeScript template ────────────────────────────────────────────────────
const tsComponentTemplate = `/**
 * ${className} Component
 * 
 * NativeCore Framework Core Component
 * Generated on ${new Date().toLocaleDateString()}
 * 
 * FRAMEWORK INTERNAL COMPONENT
 * This component uses --nc- CSS variables from core-variables.css
 * for consistent styling across the framework.
 * 
 * ═══════════════════════════════════════════════════════════════════
 * DEV TOOLS INTEGRATION - How to make attributes editable in sidebar:
 * ═══════════════════════════════════════════════════════════════════
 * 
 * 1. ADD TO observedAttributes:
 *    static get observedAttributes() {
 *      return ['variant', 'size', 'disabled'];  // ← These become editable
 *    }
 * 
 * 2. USE getAttribute() IN template():
 *    const variant = this.getAttribute('variant') || 'primary';
 *    const size = this.getAttribute('size') || 'md';
 * 
 * 3. FOR DROPDOWN SELECTORS (variant/size):
 *    Name attributes 'variant' or 'size' AND use CSS patterns:
 * 
 *    Option A - :host() selectors (RECOMMENDED for core components):
 *      :host([variant="primary"]) { ... }
 *      :host([variant="secondary"]) { ... }
 *      :host([size="sm"]) { ... }
 *      :host([size="lg"]) { ... }
 * 
 *    Option B - Class selectors:
 *      .primary { ... }
 *      .secondary { ... }
 *      .btn-sm { ... }
 *      .btn-lg { ... }
 * 
 *    The dev tools will auto-detect these patterns and create dropdowns!
 * 
 * 4. ATTRIBUTE TYPES (auto-detected):
 *    - Boolean: disabled, loading, hidden, readonly → Checkbox
 *    - Variant/Size: variant, size (with CSS) → Dropdown
 *    - Number: count, max, min, step → Slider
 *    - Everything else → Text input
 * 
 * 5. LIVE UPDATES:
 *    Implement attributeChangedCallback for instant preview updates
 * 
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Usage:
 *   <${tagName} variant="primary"></${tagName}>
 *   <${tagName} variant="secondary" size="lg"></${tagName}>
 * 
 * Attributes:
 *   - variant: Component style variant
 *   - size: Component size (sm, md, lg)
 *   - disabled: Disabled state
 */

import { Component, defineComponent } from '@core/component.js';
import { html } from '@core-utils/templates.js';

export class ${className} extends Component {
    static useShadowDOM = true;
    
    // ═══ Define dropdown options for dev tools (auto-detected) ═══
    static attributeOptions = {
        variant: ['primary', 'secondary', 'success', 'danger'],
        size: ['sm', 'md', 'lg']
    };
    
    // ═══ Attributes listed here become editable in dev tools sidebar ═══
    static get observedAttributes() {
        return ['variant', 'size', 'disabled'];
    }
    
    constructor() {
        super();
    }
    
    template() {
        // ═══ Use getAttribute() - dev tools reads this to detect attributes ═══
        const variant = this.getAttribute('variant') || 'primary';
        const size = this.getAttribute('size') || 'md';
        const disabled = this.hasAttribute('disabled');
        
        return html\`
            <style>
                :host {
                    display: inline-block;
                    font-family: var(--nc-font-family);
                    padding: var(--nc-spacing-md);
                    border-radius: var(--nc-radius-md);
                    transition: all var(--nc-transition-fast);
                }
                
                /* ═══ Variant Options (auto-detected for dropdown) ═══ */
                /* Dev tools will scan :host([variant="..."]) patterns */
                
                :host([variant="primary"]) {
                    background: var(--nc-gradient-primary);
                    color: var(--nc-white);
                }
                
                :host([variant="secondary"]) {
                    background: var(--nc-bg-secondary);
                    color: var(--nc-text);
                    border: 1px solid var(--nc-border);
                }
                
                :host([variant="success"]) {
                    background: var(--nc-gradient-success);
                    color: var(--nc-white);
                }
                
                :host([variant="danger"]) {
                    background: var(--nc-gradient-danger);
                    color: var(--nc-white);
                }
                
                /* ═══ Size Options (auto-detected for dropdown) ═══ */
                /* Dev tools will scan :host([size="..."]) patterns */
                
                :host([size="sm"]) {
                    padding: var(--nc-spacing-sm);
                    font-size: var(--nc-font-size-sm);
                }
                
                :host([size="md"]) {
                    padding: var(--nc-spacing-md);
                    font-size: var(--nc-font-size-base);
                }
                
                :host([size="lg"]) {
                    padding: var(--nc-spacing-lg);
                    font-size: var(--nc-font-size-lg);
                }
                
                /* ═══ Disabled State (auto-detected as checkbox) ═══ */
                :host([disabled]) {
                    opacity: 0.5;
                    pointer-events: none;
                }
            </style>
            
            <slot></slot>
        \`;
    }
    
    onMount() {
        // this.on('click', '.btn', () => { ... });
    }
    
    // ═══ Makes changes instant in dev tools preview ═══
    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue !== newValue && this._mounted) {
            this.render();
        }
    }
}

defineComponent('${tagName}', ${className});
`;

// ─── JavaScript template ────────────────────────────────────────────────────
const jsComponentTemplate = `/**
 * ${className} Component
 * 
 * NativeCore Framework Core Component
 * Generated on ${new Date().toLocaleDateString()}
 * 
 * Usage:
 *   <${tagName} variant="primary"></${tagName}>
 *   <${tagName} variant="secondary" size="lg"></${tagName}>
 */

import { Component, defineComponent } from '@core/component.js';
import { html } from '@core-utils/templates.js';

export class ${className} extends Component {
    static useShadowDOM = true;
    
    static attributeOptions = {
        variant: ['primary', 'secondary', 'success', 'danger'],
        size: ['sm', 'md', 'lg']
    };
    
    static get observedAttributes() {
        return ['variant', 'size', 'disabled'];
    }
    
    constructor() {
        super();
    }
    
    template() {
        const variant = this.getAttribute('variant') || 'primary';
        const size = this.getAttribute('size') || 'md';
        const disabled = this.hasAttribute('disabled');
        
        return html\`
            <style>
                :host {
                    display: inline-block;
                    font-family: var(--nc-font-family);
                    padding: var(--nc-spacing-md);
                    border-radius: var(--nc-radius-md);
                    transition: all var(--nc-transition-fast);
                }
                :host([variant="primary"]) { background: var(--nc-gradient-primary); color: var(--nc-white); }
                :host([variant="secondary"]) { background: var(--nc-bg-secondary); color: var(--nc-text); border: 1px solid var(--nc-border); }
                :host([variant="success"]) { background: var(--nc-gradient-success); color: var(--nc-white); }
                :host([variant="danger"]) { background: var(--nc-gradient-danger); color: var(--nc-white); }
                :host([size="sm"]) { padding: var(--nc-spacing-sm); font-size: var(--nc-font-size-sm); }
                :host([size="md"]) { padding: var(--nc-spacing-md); font-size: var(--nc-font-size-base); }
                :host([size="lg"]) { padding: var(--nc-spacing-lg); font-size: var(--nc-font-size-lg); }
                :host([disabled]) { opacity: 0.5; pointer-events: none; }
            </style>
            <slot></slot>
        \`;
    }
    
    onMount() {
        // this.on('click', '.btn', () => { ... });
    }
    
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue && this._mounted) {
            this.render();
        }
    }
}

defineComponent('${tagName}', ${className});
`;

const componentTemplate = useTypeScript ? tsComponentTemplate : jsComponentTemplate;

// Create readline interface for prompts
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function main() {
  console.log(`\nCreating NativeCore framework component: ${tagName}\n`);
  
  // Ask about preloading
  const preload = await prompt('Preload this component? (Y/n): ');
  const shouldPreload = !preload || preload.toLowerCase() !== 'n';
  
  // Create component file
  fs.writeFileSync(componentFile, componentTemplate);
  console.log(`Created: src/components/core/${tagName}.${ext}`);
  
  // Add to preloadRegistry if requested
  if (shouldPreload) {
    if (fs.existsSync(preloadRegistryFile)) {
      let registryContent = fs.readFileSync(preloadRegistryFile, 'utf-8');
      
      // Find the import section for core components
      const coreImportSection = registryContent.indexOf('// Core framework components');
      
      if (coreImportSection !== -1) {
        // Find the next line after the comment
        const insertPosition = registryContent.indexOf('\n', coreImportSection) + 1;
        const importStatement = `import './core/${tagName}.js';\n`;
        
        // Check if import already exists
        if (!registryContent.includes(importStatement)) {
          registryContent = registryContent.slice(0, insertPosition) + 
                           importStatement + 
                           registryContent.slice(insertPosition);
          
          fs.writeFileSync(preloadRegistryFile, registryContent);
          console.log(`Added to: src/components/preloadRegistry.${ext}`);
        }
      } else {
        console.log(`Warning: Could not find core components section in preloadRegistry.${ext}`);
        console.log(`   Please manually add: import './core/${tagName}.js';`);
      }
    } else {
      console.log(`Warning: preloadRegistry.${ext} not found.`);
      console.log(`   Please manually add: import './core/${tagName}.js';`);
    }
  }
  
  console.log('\nFramework component created successfully!\n');
  console.log('Usage:');
  console.log(`  <${tagName} variant="primary">Content</${tagName}>`);
  console.log(`  <${tagName} variant="secondary" size="lg">Large</${tagName}>`);
  console.log('\nDev Tools Integration:');
  console.log('   • Attributes in observedAttributes → Editable in sidebar');
  console.log('   • :host([variant="..."]) patterns → Auto-detected dropdown');
  console.log('   • :host([size="..."]) patterns → Auto-detected dropdown');
  console.log('   • Boolean attrs (disabled, etc.) → Checkbox');
  console.log('   • attributeChangedCallback → Live preview updates');
  console.log('\nComponent uses --nc- variables from core-variables.css\n');
  
  rl.close();
}

main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});

#!/usr/bin/env node

/**
 * Component Generator Script
 * Like Laravel Artisan for vanilla JS components
 * 
 * Usage:
 *   node scripts/make-component.mjs counter
 *   npm run make:component counter
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get component name from command line
const componentName = process.argv[2];
const withTests = process.argv.includes('--with-tests');

if (!componentName) {
  console.error('Error: Component name is required');
  console.log('\nUsage:');
  console.log('  npm run make:component <name>');
  console.log('\nExample:');
  console.log('  npm run make:component my-card');
  process.exit(1);
}

// Validate component name (kebab-case with required hyphen)
if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)+$/.test(componentName)) {
  console.error('Error: Component name must be in kebab-case with at least one hyphen');
  console.error('   Custom elements require a hyphen to avoid conflicts with native HTML elements');
  console.error('\nValid examples:');
  console.error('   - my-card');
  console.error('   - user-profile');
  console.error('   - sample-component');
  console.error('\nInvalid examples:');
  console.error('   - card (no hyphen)');
  console.error('   - MyCard (not kebab-case)');
  process.exit(1);
}

// Generate class name (PascalCase)
const className = componentName
  .split('-')
  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
  .join('');

// Component file path (in components/ui folder by default)
const componentsDir = path.resolve(__dirname, '../..', 'src', 'components');
const uiDir = path.join(componentsDir, 'ui');
const componentFile = path.join(uiDir, `${componentName}.ts`);
const registryFile = path.join(componentsDir, 'appRegistry.ts');

// Ensure ui directory exists
if (!fs.existsSync(uiDir)) {
  fs.mkdirSync(uiDir, { recursive: true });
}

// Check if component already exists
if (fs.existsSync(componentFile)) {
  console.error(`Error: Component "${componentName}.ts" already exists`);
  process.exit(1);
}

// Template files
const jsTemplate = `import { Component, defineComponent } from '@core/component.js';
import { html } from '@core-utils/templates.js';
import { useState, computed } from '@core/state.js';
import type { State } from '@core/state.js';
import '@components/core/nc-button.js';

export class ${className} extends Component {
    static useShadowDOM = true;

    // Attributes listed here appear in the dev tools sidebar and trigger onAttributeChange.
    static observedAttributes = ['title', 'description'];

    // Internal state (not reflected as attributes) can be defined like this:
    titleState: State<string> = useState('');
    descriptionState: State<string> = useState('');
    titleDescComputed = computed(() => \`\${this.titleState.value} - \${this.descriptionState.value}\`);

    constructor() {
        super();
    }

    template() {
        return html\`
            <style>
                :host { display: block; }
                .${componentName} {}
                .${componentName}__header {}
                .${componentName}__title {}
                .${componentName}__description {}
            </style>
            <div class="${componentName}" data-view="${componentName}">
                <header class="${componentName}__header">
                    <h3 class="${componentName}__title" data-hook="title"></h3>
                </header>
                <p class="${componentName}__description" data-hook="description"></p>
                <p class="${componentName}__title-desc" data-hook="title-desc"></p> <!-- example of using a computed state -->
                <nc-button class="${componentName}__action" variant="outline" data-action="primary">Action</nc-button>
                <slot></slot>
            </div>
        \`;
    }

    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
        if (oldValue === newValue || !this._mounted) return;
        if (name === 'title') this.titleState.value = newValue ?? '';
        if (name === 'description') this.descriptionState.value = newValue ?? '';
    }

    onMount() {
        // Seed state from initial HTML attributes.
        this.titleState.value = this.getAttribute('title') ?? '';
        this.descriptionState.value = this.getAttribute('description') ?? '';

        // Wire up events and reactive bindings here.
        this.on('nc-button-click', '[data-action]', (e) => {
            this.emitEvent('${componentName}-action', { e });
        });

        this.bind(this.titleState, '[data-hook="title"]'); // surgically updates the element's textContent when state changes — no full re-render
        this.bind(this.descriptionState, '[data-hook="description"]'); // surgically updates the element's textContent when state changes — no full re-render
        this.bind(this.titleDescComputed, '[data-hook="title-desc"]'); // example of binding a computed state
    }

    onUnmount() {
        // Clean up after yourself — dispose any computed() instances here.
        // useState() is cleaned up automatically when this.bind() unsubscribes.
        this.titleDescComputed?.dispose();
    }
}

defineComponent('${componentName}', ${className});
`;

const readmeTemplate = `# ${className}

Custom element: \`<${componentName}>\`

## Usage

\`\`\`html
<${componentName}></${componentName}>
\`\`\`

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| - | - | - | - |

## Events

| Event | Description |
|-------|-------------|
| - | - |

## CSS Variables

| Variable | Description |
|----------|-------------|
| - | - |

## Example

\`\`\`html
<${componentName}></${componentName}>
\`\`\`
`;

// Write component file
fs.writeFileSync(componentFile, jsTemplate.trim());

// Prompt for prefetch
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\nPerformance optimization:');
console.log('   All components are lazy-loaded by default (loads on first use).');
console.log('   For critical layout components (header, sidebar, footer), prefetching improves performance.\n');

rl.question('Would you like to prefetch this component? (y/N): ', (answer) => {
  const shouldPreload = answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
  
  if (shouldPreload) {
    // Add import to preloadRegistry.ts
    const preloadFile = path.resolve(__dirname, '../..', 'src', 'components', 'preloadRegistry.ts');
    
    if (fs.existsSync(preloadFile)) {
      let preloadContent = fs.readFileSync(preloadFile, 'utf-8');
      const importStatement = `import './ui/${componentName}.js';`;
      
      // Check if not already imported
      if (!preloadContent.includes(importStatement)) {
        // Find the last import line and add after it
        const lines = preloadContent.split('\n');
        const lastImportIndex = lines.findLastIndex(line => 
          line.trim().startsWith("import './") && line.endsWith(".js';")
        );
        
        if (lastImportIndex !== -1) {
          // Add after last import
          lines.splice(lastImportIndex + 1, 0, importStatement);
        } else {
          // Add at the end of the file
          lines.push(importStatement);
        }
        
        preloadContent = lines.join('\n');
        fs.writeFileSync(preloadFile, preloadContent);
        console.log('Component will be preloaded (added to preloadRegistry.ts)\n');
      }
    } else {
      console.warn('preloadRegistry.ts not found - component will still be lazy-loaded\n');
    }
  } else {
    console.log('Component will be lazy-loaded (default behavior)\n');
  }

  // Add to registry.ts for lazy loading registration
  if (fs.existsSync(registryFile)) {
    let registryContent = fs.readFileSync(registryFile, 'utf-8');
  const registrationStatement = `componentRegistry.register('${componentName}', './ui/${componentName}.js');`;
  
  // Check if already registered
    if (!registryContent.includes(registrationStatement)) {
    // Find the last registration line and add after it
      const lines = registryContent.split('\n');
    const lastRegisterIndex = lines.findLastIndex(line => line.includes('componentRegistry.register'));
    
    if (lastRegisterIndex !== -1) {
      // Add after the last registration
      lines.splice(lastRegisterIndex + 1, 0, registrationStatement);
        registryContent = lines.join('\n');
    } else {
      // Add at the end if no registrations found
      registryContent = registryContent.trimEnd() + '\n' + registrationStatement + '\n';
    }
    
    fs.writeFileSync(registryFile, registryContent);
    console.log('Component registered in component registry\n');
    }
  } else {
    console.log('Note: src/components/registry.ts not found. Manual registration required.\n');
  }

  // Success message
  console.log(`Location: src/components/ui/${componentName}.ts`);
  console.log(`Registered in: src/components/appRegistry.ts`);
  if (shouldPreload) {
    console.log(`Preloaded in: src/components/preloadRegistry.ts`);
  }
  console.log('\nNext steps:');
  console.log(`   1. Edit src/components/ui/${componentName}.ts`);
  console.log(`   2. Use in your HTML: <${componentName}></${componentName}>`);
  console.log('\nComponent class:', className);
  console.log('Custom element:', `<${componentName}>`);
  
  // Generate test file if --with-tests flag is set
  if (withTests) {
    const testsDir = path.join(uiDir, '__tests__');
    if (!fs.existsSync(testsDir)) {
      fs.mkdirSync(testsDir, { recursive: true });
    }
    const testFile = path.join(testsDir, `${componentName}.test.ts`);
    if (!fs.existsSync(testFile)) {
      const testTemplate = `import { describe, it, expect, beforeEach } from 'vitest';
import { mountComponent, waitFor } from 'nativecorejs/testing';

describe('${componentName}', () => {
    let cleanup: () => void;

    beforeEach(() => {
        cleanup = () => {};
    });

    afterEach(() => {
        cleanup();
    });

    it('mounts without errors', async () => {
        const result = mountComponent('${componentName}');
        cleanup = result.cleanup;
        expect(result.element).toBeDefined();
        expect(result.element.tagName.toLowerCase()).toBe('${componentName}');
    });

    it('renders expected content', async () => {
        const result = mountComponent('${componentName}');
        cleanup = result.cleanup;
        await waitFor(() => result.element.shadowRoot !== null, 2000);
        expect(result.element.shadowRoot).not.toBeNull();
    });
});
`;
      fs.writeFileSync(testFile, testTemplate);
      console.log(`✓ Created test: src/components/ui/__tests__/${componentName}.test.ts`);
    }
  }

  rl.close();
});



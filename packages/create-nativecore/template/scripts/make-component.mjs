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
const componentsDir = path.resolve(__dirname, '..', 'src', 'components');
const uiDir = path.join(componentsDir, 'ui');
const componentFile = path.join(uiDir, `${componentName}.ts`);
const registryFile = path.join(componentsDir, 'registry.ts');

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
const jsTemplate = `/**
 * ${className} Component
 * Generated on ${new Date().toLocaleDateString()}
 * 
 * DEV MODE INTEGRATION:
 * - Define variant/size CSS classes for automatic dropdown detection
 * - Add attributes to observedAttributes for live editing
 * - Implement attributeChangedCallback for instant preview updates
 * - Changes can be saved to instance (HTML) or globally (component file)
 * 
 * REGISTRATION:
 * This component is automatically registered in src/components/registry.ts
 * Usage: <${componentName}></${componentName}>
 * 
 * PERFORMANCE:
 * - Lazy-loaded by default (loads on first use)
 * - For critical components: Add to src/components/preloadRegistry.ts
 */
import { Component, defineComponent } from '@core/component.js';
import { useState, computed } from '@core/state.js';
import type { State, ComputedState } from '@core/state.js';
import { html } from '@utils/templates.js';

export class ${className} extends Component {
    // ========== Shadow DOM ==========
    // Enable for CSS encapsulation and <slot> support
    static useShadowDOM = true;
    
    // ========== Dev Tools: Attribute Options ==========
    // Defines the dropdown values shown in the dev tools panel for each attribute.
    // This takes priority over automatic CSS class detection.
    // Add one entry per observed attribute that has a fixed set of valid values.
    // The variant values here must match your CSS class names below (e.g. .primary { ... })
    static attributeOptions = {
        variant: ['primary', 'secondary', 'success'],
        size: ['small', 'medium', 'large'],
    };
    
    // ========== Observed Attributes (Dev Tools Integration) ==========
    // Attributes listed here:
    // - Show up in dev tools sidebar
    // - Trigger attributeChangedCallback when changed
    static get observedAttributes() {
        return ['variant', 'size', 'disabled'];
    }
    
    // ========== Local State ==========
    private count?: State<number>;
    private name?: State<string>;
    
    // ========== Computed State ==========
    private doubleCount?: ComputedState<number>;
    private greeting?: ComputedState<string>;
    
    // ========== Watcher unsubscribes (call in onUnmount) ==========
    private _unwatchCount?: () => void;
    private _unwatchName?: () => void;
    
    constructor() {
        super();
        
        // ========== Initialize Local State ==========
        // this.count = useState(0);
        // this.name = useState('World');
        
        // ========== Initialize Computed Values ==========
        // Auto-updates when dependencies change
        // this.doubleCount = computed(() => this.count!.value * 2);
        // this.greeting = computed(() => \`Hello, \${this.name!.value}!\`);
    }
    
    template() {
        // ========== Get Attributes ==========
        const variant = this.attr('variant', 'primary');
        const size = this.attr('size', 'medium');
        const disabled = this.hasAttribute('disabled');
        
        // TIP: Keep attributeOptions.variant in sync with the CSS class names below.
        // Each value in the array needs a matching CSS rule (e.g. .primary { ... })
        //
        // CSS variables used below (var(--primary), var(--spacing-md), etc.) are
        // defined in src/styles/variables.css — edit that file to change tokens globally.
        
        return html\`
            <style>
                :host {
                    display: block;
                }
                
                .${componentName} {
                    padding: var(--spacing-md);
                    background: var(--bg-primary);
                    border-radius: var(--radius-md);
                }
                
                /* ========== Variant Examples ========== */
                /* Dev tools will detect these as dropdown options */
                .primary {
                    background: var(--primary);
                    color: white;
                }
                
                .secondary {
                    background: var(--secondary);
                    color: white;
                }
                
                .success {
                    background: var(--success);
                    color: white;
                }
                
                /* ========== Size Examples ========== */
                .small {
                    padding: var(--spacing-sm);
                    font-size: 0.875rem;
                }
                
                .medium {
                    padding: var(--spacing-md);
                    font-size: 1rem;
                }
                
                .large {
                    padding: var(--spacing-lg);
                    font-size: 1.125rem;
                }
            </style>
            
            <div class="${componentName} \${variant} \${size}" \${disabled ? 'disabled' : ''}>
                <h3>${className}</h3>
                <p>Your component content here</p>
                <slot></slot>
            </div>
        \`;
    }
    
    /**
     * Live attribute updates (Dev Tools Integration)
     * Called automatically when observed attributes change
     * Enables instant preview without full re-render
     */
    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
        if (!this._mounted) return;
        
        const container = this.$('.${componentName}') as HTMLElement;
        if (!container) return;
        
        switch (name) {
            case 'variant':
            case 'size':
                // Update classes instantly
                this.updateClasses(container);
                break;
                
            case 'disabled':
                // Update disabled state
                container.toggleAttribute('disabled', this.hasAttribute('disabled'));
                break;
        }
    }
    
    /**
     * Helper: Update element classes based on current attributes
     */
    private updateClasses(element: HTMLElement): void {
        const variant = this.attr('variant', 'primary');
        const size = this.attr('size', 'medium');
        element.className = \`${componentName} \${variant} \${size}\`;
    }
    
    onMount() {
        // ========== Event Delegation (Recommended Pattern) ==========
        // Handles clicks even after re-renders
        this.shadowRoot.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            
            // if (target.matches('.btn-increment')) {
            //     this.handleIncrement();
            // }
        });
        
        // ========== State Watchers ==========
        // Store the returned unsubscribe — call it in onUnmount
        // this._unwatchCount = this.count?.watch(value => {
        //     const display = this.shadowRoot.querySelector('#count-display');
        //     if (display) display.textContent = value.toString();
        // });
        
        // this._unwatchName = this.name?.watch(value => {
        //     const display = this.shadowRoot.querySelector('#greeting');
        //     if (display) display.textContent = value;
        // });
    }
    
    // ========== Event Handlers ==========
    // private handleIncrement(): void {
    //     if (this.count) {
    //         this.count.value++;
    //     }
    //     
    //     // Emit event to parent
    //     this.emitEvent('increment', { value: this.count?.value });
    // }
    
    // private handleDecrement(): void {
    //     if (this.count) {
    //         this.count.value--;
    //     }
    //     
    //     // Emit event to parent
    //     this.emitEvent('decrement', { value: this.count?.value });
    // }
    
    /**
     * Emit custom events to parent components
     * 
     * Usage in parent:
     * <${componentName}></${componentName}>
     * 
     * // In controller:
     * document.querySelector('${componentName}')
     *   .addEventListener('custom-event', (e) => {
     *     console.log(e.detail); // Your data here
     *   });
     */
    // emitEvent(name: string, detail: any = {}, options = {}) {
    //     this.dispatchEvent(new CustomEvent(name, {
    //         detail,
    //         bubbles: true,
    //         composed: true,
    //         ...options
    //     }));
    // }
    
    onUnmount() {
        // Unsubscribe all state watchers
        this._unwatchCount?.();
        this._unwatchName?.();
        
        // Dispose computed values to release dependency subscriptions
        this.doubleCount?.dispose();
        this.greeting?.dispose();
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
    const preloadFile = path.resolve(__dirname, '..', 'src', 'components', 'preloadRegistry.ts');
    
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
  console.log(`Registered in: src/components/registry.ts`);
  if (shouldPreload) {
    console.log(`Preloaded in: src/components/preloadRegistry.ts`);
  }
  console.log('\nNext steps:');
  console.log(`   1. Edit src/components/ui/${componentName}.ts`);
  console.log(`   2. Use in your HTML: <${componentName}></${componentName}>`);
  console.log('\nComponent class:', className);
  console.log('Custom element:', `<${componentName}>`);
  
  rl.close();
});

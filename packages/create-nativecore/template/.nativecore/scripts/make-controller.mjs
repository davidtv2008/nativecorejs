#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Get controller name from command line or prompt
const controllerArg = process.argv[2];

async function main() {
    console.log('NativeCore Controller Generator\n');
    
    // Get controller name
    let controllerName = controllerArg;
    if (!controllerName) {
        controllerName = await question('Controller name (e.g., "user-profile"): ');
    }
    
    if (!controllerName) {
        console.error('Error: Controller name is required');
        process.exit(1);
    }
    
    // Convert to kebab-case and camelCase
    const kebabName = controllerName.toLowerCase().replace(/\s+/g, '-');
    const camelName = kebabName.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    const titleName = kebabName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    
    // Paths
    const controllersDir = path.resolve(__dirname, '../..', 'src', 'controllers');
    const controllerFile = path.join(controllersDir, `${kebabName}.controller.ts`);
    const indexFile = path.join(controllersDir, 'index.ts');
    
    // Check if controller already exists
    if (fs.existsSync(controllerFile)) {
        console.error(`Error: Controller "${kebabName}.controller.ts" already exists`);
        rl.close();
        process.exit(1);
    }
    
    // Generate standardized controller template
    const controllerTemplate = `/**
 * ${titleName} Controller
 * Handles dynamic behavior for the ${titleName.toLowerCase()} route.
 */
import { trackEvents } from '@core-utils/events.js';
import { dom } from '@core-utils/dom.js';
import { useState, computed, effect } from '@core/state.js';
import auth from '@services/auth.service.js';
import api from '@services/api.service.js';

export async function ${camelName}Controller(params: Record<string, string> = {}): Promise<() => void> {

    // -- Setup ---------------------------------------------------------------
    const events    = trackEvents();
    const disposers: Array<() => void> = [];

    // -- DOM refs ------------------------------------------------------------
    // dom.view() scopes all queries to [data-view="${kebabName}"] — nothing leaks outside.
    const view      = dom.view('${kebabName}');
    const titleEl   = view.hook<HTMLElement>('title');
    const summaryEl = view.hook<HTMLElement>('summary');

    // -- State & computed ----------------------------------------------------
    const userState   = useState(auth.getUser());
    const titleText   = computed(() => userState.value?.name
        ? '${titleName} \u2014 ' + userState.value.name
        : '${titleName}');
    const summaryText = computed(() =>
        'Use dom helpers, signals, auth, and api services to wire this view.'
    );

    void params;

    // -- Reactive bindings ---------------------------------------------------
    // effect() auto-tracks every state it reads and re-runs on any change.
    // Collect the returned disposer — call it in the cleanup below.
    // No manual .watch() subscriptions or syncView() helpers needed.
    disposers.push(effect(() => {
        if (titleEl)   titleEl.textContent   = titleText.value;
        if (summaryEl) summaryEl.textContent = summaryText.value;
    }));

    // -- Events --------------------------------------------------------------
    // events.onClick is shorthand for click; use events.on for any other event type.
    events.onClick(view.actionSelector('primary'), () => {
        userState.value = auth.getUser();
    });

    // -- Cleanup -------------------------------------------------------------
    // NOTE: effect(), computed(), and trackEvents() are auto-registered with the
    // Page Cleanup Registry and will be torn down by the router on navigation even
    // if this return function is omitted.  Keep it anyway as an explicit contract
    // documenting everything this controller owns, and for any cleanup logic that
    // goes beyond the reactive primitives (e.g. timers, custom observers).
    return () => {
        titleText.dispose();
        summaryText.dispose();
        events.cleanup();
        disposers.forEach(d => d());
    };
}
`;
    
    // Create controller file
    fs.writeFileSync(controllerFile, controllerTemplate);
    console.log(`Created controller: src/controllers/${kebabName}.controller.ts`);
    
    // Update index.ts
    if (fs.existsSync(indexFile)) {
        let indexContent = fs.readFileSync(indexFile, 'utf-8');
        const exportLine = `export { ${camelName}Controller } from './${kebabName}.controller.js';\n`;
        
        // Check if already exported
        if (!indexContent.includes(`${camelName}Controller`)) {
            indexContent += exportLine;
            fs.writeFileSync(indexFile, indexContent);
            console.log(`Added export to controllers/index.ts`);
        }
    } else {
        // Create index file if it doesn't exist
        const indexContent = `export { ${camelName}Controller } from './${kebabName}.controller.js';\n`;
        fs.writeFileSync(indexFile, indexContent);
        console.log(`Created controllers/index.ts`);
    }
    
    console.log('\nController created successfully!');
    console.log(`\nNext steps:`);
    console.log(`1. Register in routes: lazyController('${camelName}Controller', '../controllers/${kebabName}.controller.js')`);
    console.log(`2. Add your logic to: src/controllers/${kebabName}.controller.ts`);
    
    rl.close();
}

main().catch(err => {
    console.error('Error:', err.message);
    rl.close();
    process.exit(1);
});



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

// ─── Detect project language mode ───────────────────────────────────────────
const ROOT = path.resolve(__dirname, '../..');
let useTypeScript = true;
try {
    const ncConfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'nativecore.config.json'), 'utf8'));
    if (ncConfig.useTypeScript === false) useTypeScript = false;
} catch { /* default to TypeScript */ }
const ext = useTypeScript ? 'ts' : 'js';

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
    const controllersDir = path.resolve(ROOT, 'src', 'controllers');
    const controllerFile = path.join(controllersDir, `${kebabName}.controller.${ext}`);
    const indexFile = path.join(controllersDir, `index.${ext}`);
    
    // Check if controller already exists
    if (fs.existsSync(controllerFile)) {
        console.error(`Error: Controller "${kebabName}.controller.${ext}" already exists`);
        rl.close();
        process.exit(1);
    }
    
    // ─── TypeScript template ─────────────────────────────────────────────────
    const tsTemplate = `/**
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
    disposers.push(effect(() => {
        if (titleEl)   titleEl.textContent   = titleText.value;
        if (summaryEl) summaryEl.textContent = summaryText.value;
    }));

    // -- Events --------------------------------------------------------------
    events.onClick(view.actionSelector('primary'), () => {
        userState.value = auth.getUser();
    });

    // -- Cleanup -------------------------------------------------------------
    return () => {
        titleText.dispose();
        summaryText.dispose();
        events.cleanup();
        disposers.forEach(d => d());
    };
}
`;

    // ─── JavaScript template ─────────────────────────────────────────────────
    const jsTemplate = `/**
 * ${titleName} Controller
 * Handles dynamic behavior for the ${titleName.toLowerCase()} route.
 */
import { trackEvents } from '@core-utils/events.js';
import { dom } from '@core-utils/dom.js';
import { useState, computed, effect } from '@core/state.js';
import auth from '@services/auth.service.js';
import api from '@services/api.service.js';

export async function ${camelName}Controller(params = {}) {

    // -- Setup ---------------------------------------------------------------
    const events    = trackEvents();
    const disposers = [];

    // -- DOM refs ------------------------------------------------------------
    const view      = dom.view('${kebabName}');
    const titleEl   = view.hook('title');
    const summaryEl = view.hook('summary');

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
    disposers.push(effect(() => {
        if (titleEl)   titleEl.textContent   = titleText.value;
        if (summaryEl) summaryEl.textContent = summaryText.value;
    }));

    // -- Events --------------------------------------------------------------
    events.onClick(view.actionSelector('primary'), () => {
        userState.value = auth.getUser();
    });

    // -- Cleanup -------------------------------------------------------------
    return () => {
        titleText.dispose();
        summaryText.dispose();
        events.cleanup();
        disposers.forEach(d => d());
    };
}
`;

    const controllerTemplate = useTypeScript ? tsTemplate : jsTemplate;
    
    // Create controller file
    fs.writeFileSync(controllerFile, controllerTemplate);
    console.log(`Created controller: src/controllers/${kebabName}.controller.${ext}`);
    
    // Update index file
    if (fs.existsSync(indexFile)) {
        let indexContent = fs.readFileSync(indexFile, 'utf-8');
        const exportLine = `export { ${camelName}Controller } from './${kebabName}.controller.js';\n`;
        
        // Check if already exported
        if (!indexContent.includes(`${camelName}Controller`)) {
            indexContent += exportLine;
            fs.writeFileSync(indexFile, indexContent);
            console.log(`Added export to controllers/index.${ext}`);
        }
    } else {
        // Create index file if it doesn't exist
        const indexContent = `export { ${camelName}Controller } from './${kebabName}.controller.js';\n`;
        fs.writeFileSync(indexFile, indexContent);
        console.log(`Created controllers/index.${ext}`);
    }
    
    console.log('\nController created successfully!');
    console.log(`\nNext steps:`);
    console.log(`1. Register in routes: lazyController('${camelName}Controller', '../controllers/${kebabName}.controller.js')`);
    console.log(`2. Add your logic to: src/controllers/${kebabName}.controller.${ext}`);
    
    rl.close();
}

main().catch(err => {
    console.error('Error:', err.message);
    rl.close();
    process.exit(1);
});

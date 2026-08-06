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
let useTypeScript = false;
try {
    const ncConfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'nativecore.config.json'), 'utf8'));
    if (ncConfig.useTypeScript === true) useTypeScript = true;
} catch { /* default to JavaScript (matches create-nativecore defaults) */ }
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
    const pascalName = camelName.charAt(0).toUpperCase() + camelName.slice(1);
    const tsTemplate = `import { CoreController } from '@core/controller.js';
import type { State } from '@core/controller.js';

export class ${pascalName}Controller extends CoreController {

    // ── Refs (populated from ref attributes in the view) ─────────────────
    private titleEl!: HTMLElement;

    // ── State ─────────────────────────────────────────────────────────────────
    private title!: State<string>;

    // ── Lifecycle ─────────────────────────────────────────────────────────────
    onMount() {
        // Refs are bound from ref= by _bootstrap(): ref="titleEl" → this.titleEl
        this.title = this.state('${titleName}');
        this.bind(this.title, this.titleEl);
    }
}

// Factory ─ called by the router via lazyController('${camelName}Controller', ...)
export function ${camelName}Controller(
    _params?: Record<string, string>,
    _state?: unknown,
    _loaderData?: unknown,
    rootElement?: HTMLElement
): () => void {
    const ctrl = new ${pascalName}Controller(rootElement);
    return () => ctrl.destroy();
}
`;

    // ─── JavaScript template ─────────────────────────────────────────────────
    const jsTemplate = `import { CoreController } from '@core/controller.js';

export class ${pascalName}Controller extends CoreController {

    onMount() {
        // Refs are bound from ref= by _bootstrap(): ref="titleEl" → this.titleEl
        this.title = this.state('${titleName}');
        this.bind(this.title, this.titleEl);
    }
}

// Factory ─ called by the router via lazyController('${camelName}Controller', ...)
export function ${camelName}Controller(_params, _state, _loaderData, rootElement) {
    const ctrl = new ${pascalName}Controller(rootElement);
    return () => ctrl.destroy();
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


const fs = require('fs');

function fix(path) {
    let c = fs.readFileSync(path, 'utf8');

    // ── function/method names ─────────────────────────────────────────────
    c = c.split('this.wireModels()').join('this.wireInputs()');
    c = c.split('this.wireBindings()').join('this.wireContents()');
    c = c.split('wireModels()').join('wireInputs()');
    c = c.split('wireBindings()').join('wireContents()');
    c = c.split('wireModels({').join('wireInputs({');
    c = c.split('wireBindings({').join('wireContents({');
    c = c.split('wireModels`').join('wireInputs`');
    // remaining bare references
    c = c.split('wireModels').join('wireInputs');
    c = c.split('wireBindings').join('wireContents');

    // ── HTML attribute names ──────────────────────────────────────────────
    c = c.split('nc-model').join('wire-input');
    c = c.split('nc-bind').join('wire-content');
    c = c.split('nc-attribute').join('wire-attribute');

    // ── import paths ──────────────────────────────────────────────────────
    // Individual imports → unified barrel
    c = c.replace(/import \{ wireContents \} from '@core-utils\/wireContents\.js';/g,
        "import { wireContents, wireInputs, wireAttributes } from '@core-utils/wires.js';");
    c = c.replace(/import \{ wireInputs \} from '@core-utils\/wireInputs\.js';/g,
        "import { wireContents, wireInputs, wireAttributes } from '@core-utils/wires.js';");
    c = c.replace(/import \{ wireAttributes \} from '@core-utils\/wireAttributes\.js';/g,
        "import { wireContents, wireInputs, wireAttributes } from '@core-utils/wires.js';");
    // Deduplicate if same import appears multiple times
    const unifiedImport = "import { wireContents, wireInputs, wireAttributes } from '@core-utils/wires.js';";
    while (c.split(unifiedImport).length > 2) {
        const idx = c.lastIndexOf(unifiedImport);
        c = c.slice(0, idx) + c.slice(idx + unifiedImport.length + 1);
    }

    fs.writeFileSync(path, c);
    console.log('Updated:', path.split(/[/\\]/).pop());
}

fix('c:/Users/DavidToledo/Documents/Personal/nativecorejs/docs/ebook/05-bind-api.md');
console.log('Done.');

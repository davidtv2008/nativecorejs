/**
 * migrate-html-tag.mjs
 *
 * Migrates all nc-* component template() methods from plain template literals to the
 * html tagged template system. Applies the following transforms per file:
 *
 * 1. Adds `html, raw` to the existing import from templates.js (if not already there).
 * 2. Changes the first `return`` (plain backtick) inside template() to `return html\``.
 * 3. Wraps already-escaped expressions so the html tag does not double-escape:
 *      ${escapeHTML(x)}    → ${raw(escapeHTML(x))}
 *      ${sanitizeURL(x)}   → ${raw(sanitizeURL(x))}
 * 4. Wraps raw HTML variable interpolations:
 *      ${varNameHTML}      → ${raw(varNameHTML)}
 *      ${varNameHtml}      → ${raw(varNameHtml)}
 *      ${varNameSvg}       → ${raw(varNameSvg)}
 *      ${varNameMarkup}    → ${raw(varNameMarkup)}
 *      ${varNameItems}     → ${raw(varNameItems)}   (when used in template context)
 *      etc.
 * 5. Wraps inline ternary/logical expressions that return backtick HTML literals:
 *      ${cond ? `<...>` : ''} → ${raw(cond ? `<...>` : '')}
 *
 * The script is idempotent — already migrated files are skipped.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const componentsDir = path.resolve(__dirname, '../src/components');

// Variable name suffixes that always hold raw HTML markup
const HTML_VAR_SUFFIXES = [
    'HTML', 'Html', 'html',
    'Svg', 'svg',
    'Markup', 'markup',
    'Content', 'content',
    'Items', 'items',
    'Options', 'options',
    'Rows', 'rows',
    'Cells', 'cells',
    'Tags', 'tags',
    'Chips', 'chips',
    'Buttons', 'buttons',
    'Labels', 'labels',
    'Steps', 'steps',
    'Dots', 'dots',
    'Parts', 'parts',
    'Slots', 'slots',
    'Lines', 'lines',
    'Days', 'days',
    'Hours', 'hours',
    'Minutes', 'minutes',
    'Boxes', 'boxes',
    'Toolbar', 'toolbar',
];

// Build regex for HTML variable names: ${varXXX} or ${varXXX.something}
// where XXX is one of the suffixes above
const htmlVarPattern = new RegExp(
    `\\$\\{([a-zA-Z_][a-zA-Z0-9_]*(${HTML_VAR_SUFFIXES.join('|')})(?:\\.[a-zA-Z0-9_.()]*)?)}`,
    'g'
);

function migrate(filePath) {
    let src = fs.readFileSync(filePath, 'utf8');
    const originalSrc = src;

    // Skip if already migrated
    if (/return html`/.test(src)) {
        console.log(`  SKIP (already migrated): ${path.basename(filePath)}`);
        return false;
    }

    // 1. Update import line to include html and raw
    src = src.replace(
        /import\s*\{([^}]+)\}\s*from\s*(['"][^'"]*\/templates\.js['"])/g,
        (match, imports, fromPart) => {
            const parts = imports.split(',').map(s => s.trim()).filter(Boolean);
            if (!parts.includes('html')) parts.unshift('html');
            if (!parts.includes('raw')) {
                // Insert raw after html
                const htmlIdx = parts.indexOf('html');
                parts.splice(htmlIdx + 1, 0, 'raw');
            }
            return `import { ${parts.join(', ')} } from ${fromPart}`;
        }
    );

    // 2. Change `return`` to `return html`` inside template() method only
    // Find the template() method and replace the first return` inside it
    src = src.replace(/(\btemplate\s*\(\s*\)[\s\S]*?)(return\s*)(`)/g, '$1return html`');

    // --- Now apply transforms ONLY inside the template literal ---
    // We need to find the template literal that starts with `return html`` and transform
    // its interpolations. Because nested backticks in template strings make full AST
    // parsing necessary for perfect accuracy, we use targeted regex replacements that
    // cover the patterns actually present in these components.

    // 3a. Wrap escapeHTML() calls → raw(escapeHTML())
    //     Pattern: ${escapeHTML(...)} or ${...escapeHTML(...)...} inside interpolations
    //     We target the simple direct form not already wrapped in raw()
    src = src.replace(
        /\$\{(?!raw\()([^}]*escapeHTML\([^)]+\)[^}]*)\}/g,
        (match, expr) => `\${raw(${expr})}`
    );

    // 3b. Wrap sanitizeURL() calls
    src = src.replace(
        /\$\{(?!raw\()([^}]*sanitizeURL\([^)]+\)[^}]*)\}/g,
        (match, expr) => `\${raw(${expr})}`
    );

    // 4. Wrap raw HTML variable interpolations (single identifier or member expression)
    src = src.replace(htmlVarPattern, (match, expr) => {
        // Skip if already wrapped in raw()
        if (match.startsWith('${raw(')) return match;
        return `\${raw(${expr})}`;
    });

    // 5. Wrap inline ternary/logical expressions that contain a backtick HTML literal
    //    Pattern: ${cond ? `...` : ''} or ${cond && `...`} or ${cond ? `...` : `...`}
    //    These are multi-line so we use a different strategy: find ${ followed by content
    //    that includes a nested backtick literal (inner `...`) and wrap it.
    //
    //    We match ${  EXPR  } where EXPR contains ` (backtick) indicating an HTML sub-template
    //    Only single-level nesting (common pattern in these components).
    src = src.replace(
        /\$\{(?!raw\()([^`{}]*`[^`]*`[^{}]*)\}/g,
        (match, expr) => `\${raw(${expr})}`
    );

    if (src === originalSrc) {
        console.log(`  NO CHANGE: ${path.basename(filePath)}`);
        return false;
    }

    fs.writeFileSync(filePath, src, 'utf8');
    console.log(`  MIGRATED: ${path.basename(filePath)}`);
    return true;
}

// Run on all component .ts files
const files = fs.readdirSync(componentsDir)
    .filter(f => f.endsWith('.ts') && !f.startsWith('index') && !f.startsWith('builtinRegistry'))
    .map(f => path.join(componentsDir, f));

let migrated = 0;
let skipped = 0;
let unchanged = 0;

for (const file of files) {
    const result = migrate(file);
    if (result === true) migrated++;
    else if (result === false) {
        // check if it was a skip or no-change
        const src = fs.readFileSync(file, 'utf8');
        if (/return html`/.test(src)) skipped++;
        else unchanged++;
    }
}

console.log(`\nDone. Migrated: ${migrated}  Already done: ${skipped}  No change: ${unchanged}`);

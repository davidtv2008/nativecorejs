#!/usr/bin/env node

/**
 * Middleware Generator Script
 *
 * Usage:
 *   npm run make:middleware <name>
 *
 * Examples:
 *   npm run make:middleware verified
 *   npm run make:middleware subscription
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawName = process.argv[2];

if (!rawName) {
  console.error('Error: Middleware name is required');
  console.log('\nUsage:');
  console.log('  npm run make:middleware <name>');
  console.log('\nExamples:');
  console.log('  npm run make:middleware verified');
  console.log('  npm run make:middleware subscription');
  process.exit(1);
}

function toKebab(value) {
  return value
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function toCamel(kebab) {
  return kebab.split('-').map((word, i) =>
    i === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
  ).join('');
}

function toTitle(kebab) {
  return kebab.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

const kebabName = toKebab(rawName);
const camelName = toCamel(kebabName);
const titleName = toTitle(kebabName);

const middlewareDir  = path.resolve(__dirname, '../..', 'src', 'middleware');
const middlewareFile = path.join(middlewareDir, `${kebabName}.middleware.ts`);
const appTsPath      = path.resolve(__dirname, '../..', 'src', 'app.ts');

if (fs.existsSync(middlewareFile)) {
  console.error(`Error: src/middleware/${kebabName}.middleware.ts already exists`);
  process.exit(1);
}

// ── Create middleware file ────────────────────────────────────────────────────

const middlewareTemplate = `/**
 * ${titleName} Middleware
 * Runs on every route tagged with the '${kebabName}' middleware group.
 *
 * Register it in app.ts:
 *   router.use(createMiddleware('${kebabName}', ${camelName}Middleware));
 *
 * Apply it to routes in routes.ts:
 *   r.group({ middleware: ['${kebabName}'] }, (r) => { ... });
 */
import router from '@core/router.js';
import type { RouteMatch } from '@core/router.js';

export async function ${camelName}Middleware(route: RouteMatch): Promise<boolean> {
    // TODO: implement your middleware logic here.
    // Return true  → allow navigation to proceed.
    // Return false → navigation is blocked (redirect inside this function).

    return true;
}
`;

fs.mkdirSync(middlewareDir, { recursive: true });
fs.writeFileSync(middlewareFile, middlewareTemplate);
console.log(`Created: src/middleware/${kebabName}.middleware.ts`);

// ── Wire into app.ts ──────────────────────────────────────────────────────────

if (!fs.existsSync(appTsPath)) {
  console.log('Note: src/app.ts not found — add the import and router.use() manually.');
  process.exit(0);
}

let appContent = fs.readFileSync(appTsPath, 'utf8');

// Add import after the last @middleware import line, or after createMiddleware import
const importLine = `import { ${camelName}Middleware } from '@middleware/${kebabName}.middleware.js';`;

if (appContent.includes(importLine)) {
  console.log('Note: Import already exists in app.ts');
} else {
  // Insert after the createMiddleware import line
  appContent = appContent.replace(
    /import \{ createMiddleware \} from '@core\/createMiddleware\.js';/,
    `import { createMiddleware } from '@core/createMiddleware.js';\n${importLine}`
  );
  console.log(`Added import to src/app.ts`);
}

// Insert router.use() after the @middleware sentinel comment block
const useStatement = `    router.use(createMiddleware('${kebabName}', ${camelName}Middleware));`;

if (appContent.includes(useStatement)) {
  console.log('Note: router.use() already exists in app.ts');
} else {
  // Find the @middleware sentinel and insert after the last router.use() in that block
  const sentinelPattern = /(    \/\/ @middleware[^\n]*\n(?:    router\.use\([^\n]+\n)*)/;
  const match = appContent.match(sentinelPattern);

  if (match) {
    const block = match[1];
    appContent = appContent.replace(block, `${block}    router.use(createMiddleware('${kebabName}', ${camelName}Middleware));\n`);
    console.log(`Added router.use(createMiddleware('${kebabName}', ${camelName}Middleware)) to src/app.ts`);
  } else {
    console.log(`Warning: Could not find // @middleware sentinel in app.ts — add manually:\n    ${useStatement}`);
  }
}

fs.writeFileSync(appTsPath, appContent);

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`
Done!

  Middleware:  src/middleware/${kebabName}.middleware.ts
  Tag name:    '${kebabName}'

Apply to routes in routes.ts:
  r.group({ middleware: ['${kebabName}'] }, (r) => {
      r.register('/your-path', ...);
  });
`);

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

// ─── Detect project language mode ───────────────────────────────────────────
const ROOT = path.resolve(__dirname, '../..');
let useTypeScript = false;
try {
    const ncConfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'nativecore.config.json'), 'utf8'));
    if (ncConfig.useTypeScript === true) useTypeScript = true;
} catch { /* default to JavaScript (matches create-nativecore defaults) */ }
const ext = useTypeScript ? 'ts' : 'js';

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

/** True only for a real top-level import line (ignores // comments). */
function hasTopLevelImport(source, importStatement) {
  const escaped = importStatement.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped}\\s*$`, 'm').test(source);
}

function insertImportLine(source, line) {
  if (hasTopLevelImport(source, line)) return source;
  const lines = source.split('\n');
  const routerIdx = lines.findIndex((l) => /^import\s/.test(l) && l.includes("@core/router.js"));
  const lastImportIdx = lines.findLastIndex((l) => /^import\s/.test(l));
  const insertAt = routerIdx !== -1 ? routerIdx + 1 : lastImportIdx !== -1 ? lastImportIdx + 1 : 0;
  lines.splice(insertAt, 0, line);
  return lines.join('\n');
}

const kebabName = toKebab(rawName);
const camelName = toCamel(kebabName);
const titleName = toTitle(kebabName);

const middlewareDir  = path.resolve(ROOT, 'src', 'middleware');
const middlewareFile = path.join(middlewareDir, `${kebabName}.middleware.${ext}`);
const appEntryPath   = path.resolve(ROOT, 'src', `app.${ext}`);

if (fs.existsSync(middlewareFile)) {
  console.error(`Error: src/middleware/${kebabName}.middleware.${ext} already exists`);
  process.exit(1);
}

// ── Create middleware file ────────────────────────────────────────────────────

const tsMiddlewareTemplate = `/**
 * ${titleName} Middleware
 * Runs on every route tagged with the '${kebabName}' middleware group.
 *
 * Register it in app.${ext}:
 *   router.use(createMiddleware('${kebabName}', ${camelName}Middleware));
 *
 * Apply it to routes in routes.${ext}:
 *   r.group({ middleware: ['${kebabName}'] }, (r) => { ... });
 */
import type { RouteMatch } from '@core/router.js';

export async function ${camelName}Middleware(route: RouteMatch): Promise<boolean> {
    // TODO: implement your middleware logic here.
    // Return true  → allow navigation to proceed.
    // Return false → navigation is blocked (redirect inside this function).

    return true;
}
`;

const jsMiddlewareTemplate = `/**
 * ${titleName} Middleware
 * Runs on every route tagged with the '${kebabName}' middleware group.
 *
 * Register it in app.${ext}:
 *   router.use(createMiddleware('${kebabName}', ${camelName}Middleware));
 *
 * Apply it to routes in routes.${ext}:
 *   r.group({ middleware: ['${kebabName}'] }, (r) => { ... });
 */

export async function ${camelName}Middleware(route) {
    // TODO: implement your middleware logic here.
    // Return true  → allow navigation to proceed.
    // Return false → navigation is blocked (redirect inside this function).

    return true;
}
`;

const middlewareTemplate = useTypeScript ? tsMiddlewareTemplate : jsMiddlewareTemplate;

fs.mkdirSync(middlewareDir, { recursive: true });
fs.writeFileSync(middlewareFile, middlewareTemplate);
console.log(`Created: src/middleware/${kebabName}.middleware.${ext}`);

// ── Wire into app entry file ──────────────────────────────────────────────────

if (!fs.existsSync(appEntryPath)) {
  console.log(`Note: src/app.${ext} not found — add the import and router.use() manually.`);
  process.exit(0);
}

let appContent = fs.readFileSync(appEntryPath, 'utf8');

const createMiddlewareImport = `import { createMiddleware } from '@core/createMiddleware.js';`;
const importLine = `import { ${camelName}Middleware } from '@middleware/${kebabName}.middleware.js';`;

if (!hasTopLevelImport(appContent, createMiddlewareImport)) {
  appContent = insertImportLine(appContent, createMiddlewareImport);
  console.log(`Added createMiddleware import to src/app.${ext}`);
}

if (hasTopLevelImport(appContent, importLine)) {
  console.log(`Note: Import already exists in app.${ext}`);
} else {
  // Prefer grouping under the real createMiddleware import line.
  const createImportLineRe = /^import \{ createMiddleware \} from '@core\/createMiddleware\.js';\s*$/m;
  if (createImportLineRe.test(appContent)) {
    appContent = appContent.replace(
      createImportLineRe,
      `${createMiddlewareImport}\n${importLine}`
    );
  } else {
    appContent = insertImportLine(appContent, importLine);
  }
  console.log(`Added import to src/app.${ext}`);
}

const useStatement = `    router.use(createMiddleware('${kebabName}', ${camelName}Middleware));`;

if (appContent.includes(useStatement)) {
  console.log(`Note: router.use() already exists in app.${ext}`);
} else {
  const sentinelPattern = /(    \/\/ @middleware[^\n]*\n(?:    router\.use\([^\n]+\n)*)/;
  const match = appContent.match(sentinelPattern);

  if (match) {
    const block = match[1];
    appContent = appContent.replace(block, `${block}${useStatement}\n`);
    console.log(`Added router.use(createMiddleware('${kebabName}', ${camelName}Middleware)) to src/app.${ext}`);
  } else {
    console.log(`Warning: Could not find // @middleware sentinel in app.${ext} — add manually:\n    ${useStatement}`);
  }
}

fs.writeFileSync(appEntryPath, appContent);

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`
Done!

  Middleware:  src/middleware/${kebabName}.middleware.${ext}
  Tag name:    '${kebabName}'

Apply to routes in routes.${ext}:
  r.group({ middleware: ['${kebabName}'] }, (r) => {
      r.register('/your-path', ...);
  });
`);

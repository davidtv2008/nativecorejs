#!/usr/bin/env node

/**
 * View Generator Script
 * Supports nested view paths and explicit route paths.
 *
 * Usage:
 *   node scripts/make-view.mjs profile
 *   node scripts/make-view.mjs docs/getting-started
 *   npm run make:view users/show
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { generateRouteRedirects } from './generate-route-redirects.mjs';

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

const rawViewPath = process.argv[2];

if (!rawViewPath) {
  console.error('Error: View path is required');
  console.log('\nUsage:');
  console.log('  npm run make:view <name>');
  console.log('\nExamples:');
  console.log('  npm run make:view profile');
  console.log('  npm run make:view docs/getting-started');
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function normalizeViewPath(value) {
  return value.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/');
}

function isValidViewPath(value) {
  const segmentPattern = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
  return value.split('/').every(segment => segmentPattern.test(segment));
}

function toFlatName(value) {
  return value.split('/').join('-');
}

function toControllerName(flatName) {
  return flatName.split('-').map((word, index) =>
    index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
  ).join('');
}

function toTitle(value) {
  const lastSegment = value.split('/').pop() || value;
  return lastSegment.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function normalizeRoutePath(value) {
  const trimmed = value.trim();
  if (!trimmed) return '/';
  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const collapsed = withLeadingSlash.replace(/\/+/g, '/');
  return collapsed.length > 1 ? collapsed.replace(/\/+$/g, '') : collapsed;
}

function isValidRoutePath(value) {
  if (!value.startsWith('/')) return false;
  if (value.includes('//')) return false;
  const segmentPattern = /^([a-z][a-z0-9-]*|:[a-z][a-z0-9-]*\??|\*)$/;
  return value
    .split('/')
    .filter(Boolean)
    .every(segment => segmentPattern.test(segment));
}

function createViewTemplate({ accessLabel, flatName, viewTitle, withController }) {
  if (withController) {
    return `<div class="${flatName}-page" data-view="${flatName}">
    <div class="scaffold-hero">
        <div class="scaffold-hero__inner">
            <span class="page-eyebrow">${accessLabel}</span>
            <h1 class="scaffold-hero__title" ref="titleEl">${viewTitle}</h1>
            <p class="scaffold-hero__desc" ref="summaryEl">Your controller is wired up and ready.</p>
        </div>
    </div>

    <div class="scaffold-body container">
        <div class="card-grid">
            <article class="card">
                <div class="card__icon">&#9670;</div>
                <h3 class="card__title">Reactive State with <code>ref=""</code></h3>
                <p class="card__body">Elements with <code>ref="fieldName"</code> auto-wire to <code>this.fieldName</code> in the controller. Combine with <code>this.state()</code> and <code>this.bind()</code> for reactive updates.</p>
            </article>
            <article class="card">
                <div class="card__icon">&#10022;</div>
                <h3 class="card__title">Event Listeners via <code>this.on()</code></h3>
                <p class="card__body">Attach listeners in <code>onMount()</code> using <code>this.on(this.primaryBtn, 'click', handler)</code>. Auto-cleanup on destroy.</p>
            </article>
        </div>

        <div class="page-actions">
            <nc-button ref="primaryBtn" data-action="primary-action" variant="primary">Primary Action</nc-button>
            <nc-button data-action="secondary-action" variant="outline">Secondary Action</nc-button>
        </div>
    </div>
</div>
`;
  }

  return `<div class="${flatName}-page">
    <div class="scaffold-hero">
        <div class="scaffold-hero__inner">
            <span class="page-eyebrow">${accessLabel}</span>
            <h1 class="scaffold-hero__title">${viewTitle}</h1>
            <p class="scaffold-hero__desc">Start building. Add your content below and connect a controller when the page needs interactivity.</p>
        </div>
    </div>

    <div class="scaffold-body container">
        <div class="card-grid">
            <article class="card">
                <div class="card__icon">&#9670;</div>
                <h3 class="card__title">Start with structure</h3>
                <p class="card__body">Add the markup this route needs here. Design around <code>data-hook</code> and <code>data-action</code> attributes from day one.</p>
            </article>
            <article class="card">
                <div class="card__icon">&#10022;</div>
                <h3 class="card__title">Stay within the system</h3>
                <p class="card__body">Re-use existing <code>.card</code>, <code>.card-grid</code>, and <code>.page-header</code> classes so every route feels native from the start.</p>
            </article>
        </div>
    </div>
</div>
`;
}

function createControllerTemplate({ flatName, viewTitle, controllerName }) {
  const PascalName = controllerName.charAt(0).toUpperCase() + controllerName.slice(1);
  if (useTypeScript) {
    return `import { CoreController } from '@core/controller.js';
import type { State } from '@core/controller.js';

export class ${PascalName}Controller extends CoreController {

  // ── Refs (auto-wired from ref attributes in the view) ────────────────────
    private titleEl!: HTMLElement;
    private summaryEl!: HTMLElement;
    private primaryBtn!: HTMLElement;

    // ── State ─────────────────────────────────────────────────────────────────
    private title!: State<string>;
    private summary!: State<string>;

    // ── Lifecycle ─────────────────────────────────────────────────────────────
    onMount() {
      this.assertRefs('titleEl', 'summaryEl', 'primaryBtn');

        // Reactive state
        this.title   = this.state('${viewTitle}');
        this.summary = this.state('Your controller is wired up and ready.');

        // Bindings — state → DOM, auto-updated on every .value change
        this.bind(this.title,   this.titleEl);
        this.bind(this.summary, this.summaryEl);

        // Event listeners (setup here after refs are wired, not in events())
        this.on(this.primaryBtn, 'click', () => {
            this.title.value   = '${viewTitle} — clicked!';
            this.summary.value = 'Primary action fired.';
        });
    }

    // ── Cleanup ───────────────────────────────────────────────────────────────
    onUnmount() {
        // this.on() listeners are auto-removed. Add manual teardown here if needed.
    }
}

// Factory — called by the router via lazyController('${controllerName}Controller', ...)
export function ${controllerName}Controller(
    _params?: Record<string, string>,
    _state?: unknown,
    _loaderData?: unknown,
    rootElement?: HTMLElement
): () => void {
    const ctrl = new ${PascalName}Controller(rootElement);
    return () => ctrl.destroy();
}
`;
  }
  return `import { CoreController } from '@core/controller.js';

export class ${PascalName}Controller extends CoreController {

    onMount() {
    this.assertRefs('titleEl', 'summaryEl', 'primaryBtn');
        this.title   = this.state('${viewTitle}');
        this.summary = this.state('Your controller is wired up and ready.');

        this.bind(this.title,   this.titleEl);
        this.bind(this.summary, this.summaryEl);

        this.on(this.primaryBtn, 'click', () => {
            this.title.value   = '${viewTitle} — clicked!';
            this.summary.value = 'Primary action fired.';
        });
    }

    onUnmount() {}
}

export function ${controllerName}Controller(_params, _state, _loaderData, rootElement) {
    const ctrl = new ${PascalName}Controller(rootElement);
    return () => ctrl.destroy();
}
`;
}

async function generateView() {
  try {
    const normalizedViewPath = normalizeViewPath(rawViewPath);

    if (!normalizedViewPath || !isValidViewPath(normalizedViewPath)) {
      console.error('Error: View path must use kebab-case segments separated by /.');
      console.error('\nValid examples:');
      console.error('  profile');
      console.error('  docs/getting-started');
      console.error('  dashboard/reports/detail');
      process.exit(1);
    }

    const flatName = toFlatName(normalizedViewPath);
    const controllerName = toControllerName(flatName);
    const viewTitle = toTitle(normalizedViewPath);
    const defaultRoutePath = `/${normalizedViewPath}`;

    const isProtectedAnswer = await question('Should this route require login? (y/n): ');
    const isProtected = isProtectedAnswer.toLowerCase().trim() === 'y';

    const routePathAnswer = await question(`Route path (${defaultRoutePath}): `);
    const routePath = normalizeRoutePath(routePathAnswer || defaultRoutePath);
    if (!isValidRoutePath(routePath)) {
      console.error('Error: Route path must start with / and use static segments, :params, optional :params?, or * wildcards.');
      rl.close();
      process.exit(1);
    }

    const createControllerAnswer = await question('Create a controller for this view? (y/n): ');
    const createController = createControllerAnswer.toLowerCase().trim() === 'y';

    rl.close();

    const accessFolder = isProtected ? 'protected' : 'public';
    const accessLabel = isProtected ? 'Protected Route' : 'Public Route';
    const viewsRootDir = path.resolve(ROOT, 'src', 'views', accessFolder);
    const viewFile = path.join(viewsRootDir, `${normalizedViewPath}.html`);
    const viewFileRelative = `src/views/${accessFolder}/${normalizedViewPath}.html`;

    if (fs.existsSync(viewFile)) {
      console.error(`Error: View "${normalizedViewPath}.html" already exists in ${accessFolder} folder`);
      process.exit(1);
    }

    fs.mkdirSync(path.dirname(viewFile), { recursive: true });
    fs.writeFileSync(viewFile, createViewTemplate({ accessLabel, flatName, viewTitle, withController: createController }));
    console.log(`Created view: ${viewFileRelative}`);

    if (createController) {
      const controllersDir = path.resolve(ROOT, 'src', 'controllers');
      const controllerFile = path.join(controllersDir, `${flatName}.controller.${ext}`);
      const indexFile = path.join(controllersDir, `index.${ext}`);

      if (fs.existsSync(controllerFile)) {
        console.error(`Warning: Controller "${flatName}.controller.${ext}" already exists`);
      } else {
        fs.writeFileSync(controllerFile, createControllerTemplate({ flatName, viewTitle, controllerName }));
        console.log(`Created controller: src/controllers/${flatName}.controller.${ext}`);

        if (fs.existsSync(indexFile)) {
          let indexContent = fs.readFileSync(indexFile, 'utf8');
          const exportStatement = `export { ${controllerName}Controller } from './${flatName}.controller.js';\n`;
          if (!indexContent.includes(`${flatName}.controller.js`)) {
            indexContent += exportStatement;
            fs.writeFileSync(indexFile, indexContent);
            console.log(`Updated: src/controllers/index.${ext}`);
          }
        }
      }
    }

    const routesFile = `routes.${ext}`;
    const routesPath = path.resolve(ROOT, 'src', 'routes', routesFile);
    if (fs.existsSync(routesPath)) {
      let routesContent = fs.readFileSync(routesPath, 'utf8');

      const routeRegistration = createController
        ? `        router.register('${routePath}', '${viewFileRelative}', lazyController('${controllerName}Controller', '../controllers/${flatName}.controller.js'));`
        : `        router.register('${routePath}', '${viewFileRelative}');`;

      const groupMarker = isProtected ? '// @group:protected' : '// @group:public';
      const markerIndex = routesContent.indexOf(groupMarker);

      if (markerIndex !== -1) {
        const closingPattern = /\n    \}\);/g;
        closingPattern.lastIndex = markerIndex;
        const closingMatch = closingPattern.exec(routesContent);

        if (closingMatch) {
          routesContent =
            routesContent.slice(0, closingMatch.index) +
            '\n' + routeRegistration +
            routesContent.slice(closingMatch.index);
          console.log(`Added route registration to src/routes/${routesFile}`);
        }
      } else {
        console.log(`Warning: Could not find "${groupMarker}" in ${routesFile} — add the route manually.`);
      }

      fs.writeFileSync(routesPath, routesContent);
      generateRouteRedirects();

      // ── Sync server.js viewsMap (dev server DevTools + static file serving) ──
      const serverJsPath = path.resolve(ROOT, 'server.js');
      if (fs.existsSync(serverJsPath)) {
        let serverContent = fs.readFileSync(serverJsPath, 'utf8');
        const viewsMapEntry = `        '${routePath}': '${viewFileRelative}',`;
        if (!serverContent.includes(`'${routePath}'`) && !serverContent.includes(`"${routePath}"`)) {
          serverContent = serverContent.replace(
            /(const viewsMap = \{[^}]+)(\n    \};)/,
            (_, body, closing) => `${body}\n${viewsMapEntry}${closing}`
          );
          fs.writeFileSync(serverJsPath, serverContent);
          console.log('Updated: server.js (viewsMap)');
        }
      }
    }

    const isStaticRoute = !routePath.includes(':') && !routePath.includes('*');
    const isSimpleNavigationCandidate = isStaticRoute && !normalizedViewPath.includes('/');

    if (isSimpleNavigationCandidate) {
      try {
        const indexPath = path.resolve(ROOT, 'index.html');
        let indexContent = fs.readFileSync(indexPath, 'utf-8');

        if (isProtected) {
          const sidebarPattern = /<a href="\/components"[^>]*class="sidebar-item components-link"[^>]*>[\s\S]*?<\/a>\s*<button class="sidebar-item logout-link"/;
          const navLink = `<a href="/components" data-link class="sidebar-item components-link" style="display: none;">
                        <span class="sidebar-icon"></span>
                        <span class="sidebar-text">Components</span>
                    </a>
                    <a href="${routePath}" data-link class="sidebar-item ${flatName}-link" style="display: none;">
                        <span class="sidebar-icon"></span>
                        <span class="sidebar-text">${viewTitle}</span>
                    </a>
                    <button class="sidebar-item logout-link"`;

          if (sidebarPattern.test(indexContent)) {
            indexContent = indexContent.replace(sidebarPattern, navLink);
            fs.writeFileSync(indexPath, indexContent);
            console.log('Added to sidebar menu (protected pages)');
          }
        } else {
          const headerPattern = /<a href="\/about"[^>]*class="nanc-link"[^>]*>About<\/a>\s*<\/nav>/;
          const headerLink = `<a href="/about" data-link class="nanc-link">About</a>
                            <a href="${routePath}" data-link class="nanc-link">${viewTitle}</a>
                        </nav>`;

          if (headerPattern.test(indexContent)) {
            indexContent = indexContent.replace(headerPattern, headerLink);
            fs.writeFileSync(indexPath, indexContent);
            console.log('Added to public header navigation');
          }
        }
      } catch {
        console.log('Note: Could not auto-add navigation link. Add manually if needed.');
      }
    } else {
      console.log('Skipped automatic navigation updates for nested or dynamic route.');
    }

    console.log('\nCreated route details:');
    console.log(`- access: ${accessFolder}`);
    console.log(`- route: ${routePath}`);
    console.log(`- view: ${viewFileRelative}`);
    if (createController) {
      console.log(`- controller: src/controllers/${flatName}.controller.${ext}`);
    }

    console.log('\nDone!\n');
  } catch (error) {
    console.error('Error:', error.message);
    rl.close();
    process.exit(1);
  }
}

generateView();


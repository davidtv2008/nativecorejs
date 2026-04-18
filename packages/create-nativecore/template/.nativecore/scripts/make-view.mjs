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
            <h1 class="scaffold-hero__title" data-hook="title">${viewTitle}</h1>
            <p class="scaffold-hero__desc" data-hook="summary">Your controller is wired up and ready. Replace this markup with your real page structure.</p>
        </div>
    </div>

    <div class="scaffold-body container">
        <div class="card-grid">
            <article class="card">
                <div class="card__icon">&#9670;</div>
                <h3 class="card__title">Structure lives here</h3>
                <p class="card__body">Write your markup in this view. The controller targets stable <code>data-hook</code> and <code>data-action</code> attributes rather than fragile class names.</p>
            </article>
            <article class="card">
                <div class="card__icon">&#10022;</div>
                <h3 class="card__title">Logic lives in the controller</h3>
                <p class="card__body">Use <code>dom.data('${flatName}')</code>, <code>trackEvents</code>, and <code>trackSubscriptions</code> to wire behavior without touching the DOM directly.</p>
            </article>
            <article class="card">
                <div class="card__icon">&#9632;</div>
                <h3 class="card__title">State stays reactive</h3>
                <p class="card__body">Call <code>useState()</code> for local state and <code>computed()</code> for derived values. Watch them with <code>.watch()</code> and clean up on exit.</p>
            </article>
        </div>

        <div class="page-actions">
            <nc-button data-action="primary-action" variant="primary">Primary Action</nc-button>
            <nc-button data-action="secondary-action" variant="outline">Learn More</nc-button>
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
  return `/**
 * ${viewTitle} Controller
 * Handles dynamic behavior for the ${viewTitle.toLowerCase()} page.
 */
import { trackEvents } from '@core-utils/events.js';
import { dom } from '@core-utils/dom.js';
import { useState, computed, effect } from '@core/state.js';
import auth from '@services/auth.service.js';
import api from '@services/api.service.js';

export async function ${controllerName}Controller(params: Record<string, string> = {}): Promise<() => void> {

    // -- Setup ---------------------------------------------------------------
    const events    = trackEvents();
    const disposers: Array<() => void> = [];

    // -- DOM refs ------------------------------------------------------------
    // Use dom.data('${flatName}') for scoped queries within a [data-view="${flatName}"] container,
    // or dom.$('#id') for direct ID lookups anywhere in the document.
    const view    = dom.data('${flatName}');
    const titleEl = view.hook('title');

    // -- State & computed ----------------------------------------------------
    const userState = useState(auth.getUser());
    const titleText = computed(() => userState.value?.name
        ? '${viewTitle} \u2014 ' + userState.value.name
        : '${viewTitle}');

    void params;

    // -- Reactive bindings ---------------------------------------------------
    // effect() auto-tracks every state it reads and re-runs on any change.
    // Collect the returned disposer — call it in the cleanup below.
    // No manual .watch() subscriptions or syncView() helpers needed.
    disposers.push(effect(() => {
        if (titleEl) titleEl.textContent = titleText.value;
    }));

    // -- Events --------------------------------------------------------------
    // events.onClick is shorthand for click; use events.on for any other event type.
    events.onClick(view.actionSelector('primary'), () => {
        userState.value = auth.getUser();
    });

    // -- Cleanup -------------------------------------------------------------
    return () => {
        titleText.dispose();
        events.cleanup();
        disposers.forEach(d => d());
    };
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
    const viewsRootDir = path.resolve(__dirname, '../..', 'src', 'views', accessFolder);
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
      const controllersDir = path.resolve(__dirname, '../..', 'src', 'controllers');
      const controllerFile = path.join(controllersDir, `${flatName}.controller.ts`);
      const indexFile = path.join(controllersDir, 'index.ts');

      if (fs.existsSync(controllerFile)) {
        console.error(`Warning: Controller "${flatName}.controller.ts" already exists`);
      } else {
        fs.writeFileSync(controllerFile, createControllerTemplate({ flatName, viewTitle, controllerName }));
        console.log(`Created controller: src/controllers/${flatName}.controller.ts`);

        if (fs.existsSync(indexFile)) {
          let indexContent = fs.readFileSync(indexFile, 'utf8');
          const exportStatement = `export { ${controllerName}Controller } from './${flatName}.controller.js';\n`;
          if (!indexContent.includes(`${flatName}.controller.js`)) {
            indexContent += exportStatement;
            fs.writeFileSync(indexFile, indexContent);
            console.log('Updated: src/controllers/index.ts');
          }
        }
      }
    }

    const routesPath = path.resolve(__dirname, '../..', 'src', 'routes', 'routes.ts');
    if (fs.existsSync(routesPath)) {
      let routesContent = fs.readFileSync(routesPath, 'utf8');
      const routeRegistration = createController
        ? `        .register('${routePath}', '${viewFileRelative}', lazyController('${controllerName}Controller', '../controllers/${flatName}.controller.js'))`
        : `        .register('${routePath}', '${viewFileRelative}')`;

      const registerBlockPattern = /(export function registerRoutes\(router: Router\): void \{\s*router\s*)([\s\S]*?)(\n\})/;
      const registerMatch = routesContent.match(registerBlockPattern);

      if (registerMatch) {
        const existingChain = registerMatch[2].trimEnd();
        const normalizedChain = existingChain.replace(/;\s*$/, '');
        const updatedChain = normalizedChain
          ? `${normalizedChain}\n${routeRegistration};`
          : `\n${routeRegistration};`;
        routesContent = routesContent.replace(registerBlockPattern, `$1${updatedChain}$3`);
        console.log('Added route registration to src/routes/routes.ts');
      }

      if (isProtected) {
        const protectedRoutesRegex = /export const protectedRoutes = \[(.*?)\];/s;
        const match = routesContent.match(protectedRoutesRegex);
        if (match) {
          const routesList = match[1].trim();
          if (!routesList.includes(`'${routePath}'`)) {
            const newRoutes = routesList ? `${routesList}, '${routePath}'` : `'${routePath}'`;
            routesContent = routesContent.replace(protectedRoutesRegex, `export const protectedRoutes = [${newRoutes}];`);
            console.log(`Added '${routePath}' to protected routes array`);
          }
        }
      }

      fs.writeFileSync(routesPath, routesContent);
      generateRouteRedirects();
    }

    const isStaticRoute = !routePath.includes(':') && !routePath.includes('*');
    const isSimpleNavigationCandidate = isStaticRoute && !normalizedViewPath.includes('/');

    if (isSimpleNavigationCandidate) {
      try {
        const indexPath = path.resolve(__dirname, '../..', 'index.html');
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
      console.log(`- controller: src/controllers/${flatName}.controller.ts`);
    }

    console.log('\nDone!\n');
  } catch (error) {
    console.error('Error:', error.message);
    rl.close();
    process.exit(1);
  }
}

generateView();


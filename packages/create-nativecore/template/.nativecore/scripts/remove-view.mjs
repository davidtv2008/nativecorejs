#!/usr/bin/env node

/**
 * View Removal Script
 * Removes nested views, controllers, routes, and simple navigation references.
 * Each cleanup step runs independently so partial state can still be repaired.
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
  console.log('  npm run remove:view <name>');
  console.log('\nExamples:');
  console.log('  npm run remove:view profile');
  console.log('  npm run remove:view docs/getting-started');
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
  return flatName.split('-').map((word, index) => index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)).join('');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function addSummary(summary, key, message) {
  summary[key].push(message);
}

function removeEmptyParentDirectories(startPath, stopPath, summary) {
  let currentPath = path.dirname(startPath);
  const normalizedStopPath = path.resolve(stopPath);

  while (currentPath.startsWith(normalizedStopPath)) {
    try {
      const entries = fs.readdirSync(currentPath);
      if (entries.length > 0) {
        break;
      }

      fs.rmdirSync(currentPath);
      addSummary(summary, 'removed', path.relative(process.cwd(), currentPath));

      if (currentPath === normalizedStopPath) {
        break;
      }

      currentPath = path.dirname(currentPath);
    } catch (error) {
      addSummary(summary, 'failed', `Could not remove empty directory ${path.relative(process.cwd(), currentPath)}: ${error.message}`);
      break;
    }
  }
}

function printSummary(summary) {
  console.log('\nSummary:');
  for (const [key, title] of [
    ['removed', 'Removed'],
    ['updated', 'Updated'],
    ['skipped', 'Skipped'],
    ['failed', 'Failed'],
  ]) {
    if (!summary[key].length) continue;
    console.log(`- ${title}:`);
    for (const item of summary[key]) {
      console.log(`  ${item}`);
    }
  }
}

function removeRouteRegistration(routesContent, viewFileRelative) {
  const escapedViewFile = escapeRegExp(viewFileRelative);
  const routeRegex = new RegExp(`\\s*\\.register\\('([^']+)',\\s*'${escapedViewFile}'[^\\n]*\\)\\r?\\n`, 'g');
  const removedRoutePaths = [];
  const updatedContent = routesContent.replace(routeRegex, (_match, routePath) => {
    removedRoutePaths.push(routePath);
    return '';
  });
  return { updatedContent, removedRoutePaths };
}

async function removeView() {
  const normalizedViewPath = normalizeViewPath(rawViewPath);
  if (!normalizedViewPath || !isValidViewPath(normalizedViewPath)) {
    console.error('Error: View path must use kebab-case segments separated by /.');
    rl.close();
    process.exit(1);
  }

  const flatName = toFlatName(normalizedViewPath);
  const controllerName = toControllerName(flatName);
  const summary = { removed: [], updated: [], skipped: [], failed: [] };

  const publicViewPath = path.resolve(__dirname, '../..', 'src', 'views', 'public', `${normalizedViewPath}.html`);
  const protectedViewPath = path.resolve(__dirname, '../..', 'src', 'views', 'protected', `${normalizedViewPath}.html`);
  const nestedSegments = normalizedViewPath.split('/');
  const nestedCleanupSegment = nestedSegments.length > 1 ? nestedSegments[0] : null;
  const publicViewsRoot = path.resolve(__dirname, '../..', 'src', 'views', 'public');
  const protectedViewsRoot = path.resolve(__dirname, '../..', 'src', 'views', 'protected');
  const controllerPath = path.resolve(__dirname, '../..', 'src', 'controllers', `${flatName}.controller.ts`);
  const controllersIndexPath = path.resolve(__dirname, '../..', 'src', 'controllers', 'index.ts');
  const routesPath = path.resolve(__dirname, '../..', 'src', 'routes', 'routes.ts');
  const indexPath = path.resolve(__dirname, '../..', 'index.html');
  const headerPath = path.resolve(__dirname, '../..', 'src', 'components', 'app-header.ts');
  const footerPath = path.resolve(__dirname, '../..', 'src', 'components', 'core', 'app-footer.ts');

  const publicViewRelative = `src/views/public/${normalizedViewPath}.html`;
  const protectedViewRelative = `src/views/protected/${normalizedViewPath}.html`;

  const hasPublicView = fs.existsSync(publicViewPath);
  const hasProtectedView = fs.existsSync(protectedViewPath);
  const hasController = fs.existsSync(controllerPath);
  const routesContent = fs.existsSync(routesPath) ? fs.readFileSync(routesPath, 'utf8') : '';
  const hasRouteReference = routesContent.includes(publicViewRelative) || routesContent.includes(protectedViewRelative);

  if (!hasPublicView && !hasProtectedView && !hasController && !hasRouteReference) {
    console.log(`No active files or route references were found for "${normalizedViewPath}".`);
    addSummary(summary, 'skipped', `View file already missing: ${publicViewRelative}`);
    addSummary(summary, 'skipped', `View file already missing: ${protectedViewRelative}`);
    addSummary(summary, 'skipped', `Controller already missing: src/controllers/${flatName}.controller.ts`);
    addSummary(summary, 'skipped', `Route reference already missing for ${normalizedViewPath}`);
    printSummary(summary);
    rl.close();
    process.exit(0);
  }

  console.log('\nCleanup targets:');
  console.log(`- public view: ${hasPublicView ? 'present' : 'missing'}`);
  console.log(`- protected view: ${hasProtectedView ? 'present' : 'missing'}`);
  console.log(`- controller: ${hasController ? 'present' : 'missing'}`);
  console.log(`- route reference: ${hasRouteReference ? 'present' : 'missing'}`);

  const confirm = await question('\nProceed with cleanup? (y/n): ');
  if (confirm.toLowerCase().trim() !== 'y') {
    console.log('Deletion cancelled');
    rl.close();
    process.exit(0);
  }

  rl.close();

  for (const targetPath of [publicViewPath, protectedViewPath]) {
    const label = path.relative(process.cwd(), targetPath);
    if (!fs.existsSync(targetPath)) {
      addSummary(summary, 'skipped', `Already missing: ${label}`);
      continue;
    }
    try {
      fs.unlinkSync(targetPath);
      addSummary(summary, 'removed', label);

      if (nestedCleanupSegment) {
        const rootPath = targetPath === publicViewPath ? publicViewsRoot : protectedViewsRoot;
        const stopPath = path.join(rootPath, nestedCleanupSegment);
        removeEmptyParentDirectories(targetPath, stopPath, summary);
      }
    } catch (error) {
      addSummary(summary, 'failed', `Could not remove ${label}: ${error.message}`);
    }
  }

  if (fs.existsSync(controllerPath)) {
    try {
      fs.unlinkSync(controllerPath);
      addSummary(summary, 'removed', path.relative(process.cwd(), controllerPath));
    } catch (error) {
      addSummary(summary, 'failed', `Could not remove ${path.relative(process.cwd(), controllerPath)}: ${error.message}`);
    }
  } else {
    addSummary(summary, 'skipped', `Already missing: src/controllers/${flatName}.controller.ts`);
  }

  if (fs.existsSync(controllersIndexPath)) {
    try {
      const exportPattern = new RegExp(`export \\{ ${controllerName}Controller \\} from '\\.\\/${flatName}\\.controller\\.js';\\r?\\n`, 'g');
      const existingContent = fs.readFileSync(controllersIndexPath, 'utf8');
      const updatedContent = existingContent.replace(exportPattern, '');
      if (updatedContent !== existingContent) {
        fs.writeFileSync(controllersIndexPath, updatedContent);
        addSummary(summary, 'updated', 'src/controllers/index.ts');
      } else {
        addSummary(summary, 'skipped', 'No controller export to remove in src/controllers/index.ts');
      }
    } catch (error) {
      addSummary(summary, 'failed', `Could not update src/controllers/index.ts: ${error.message}`);
    }
  }

  let removedRoutePaths = [];
  if (fs.existsSync(routesPath)) {
    try {
      let nextRoutesContent = fs.readFileSync(routesPath, 'utf8');
      const originalRoutesContent = nextRoutesContent;

      for (const viewFileRelative of [publicViewRelative, protectedViewRelative]) {
        const result = removeRouteRegistration(nextRoutesContent, viewFileRelative);
        nextRoutesContent = result.updatedContent;
        removedRoutePaths.push(...result.removedRoutePaths);
      }

      if (removedRoutePaths.length) {
        nextRoutesContent = nextRoutesContent.replace(
          /export const protectedRoutes = \[(.*?)\];/s,
          (_match, list) => {
            const routes = list
              .split(',')
              .map(item => item.trim())
              .filter(item => item && !removedRoutePaths.includes(item.replace(/^'|'$/g, '')));
            return `export const protectedRoutes = [${routes.join(', ')}];`;
          }
        );
      }

      nextRoutesContent = nextRoutesContent.replace(
        /(export function registerRoutes\(router: Router\): void \{\s*router)(\s*\})/s,
        '$1;$2'
      );
      nextRoutesContent = nextRoutesContent.replace(/(\.register\([^\n]+\))\s*\}/s, '$1;\n}');

      if (nextRoutesContent !== originalRoutesContent) {
        fs.writeFileSync(routesPath, nextRoutesContent);
        addSummary(summary, 'updated', 'src/routes/routes.ts');
      } else {
        addSummary(summary, 'skipped', `No route entry to remove for ${normalizedViewPath}`);
      }
    } catch (error) {
      addSummary(summary, 'failed', `Could not update src/routes/routes.ts: ${error.message}`);
    }
  }

  const uniqueRoutePaths = [...new Set(removedRoutePaths)];
  const staticRoutePaths = uniqueRoutePaths.filter(routePath => !routePath.includes(':') && !routePath.includes('*'));

  if (fs.existsSync(indexPath)) {
    try {
      const originalContent = fs.readFileSync(indexPath, 'utf8');
      let updatedContent = originalContent;
      for (const routePath of staticRoutePaths) {
        const escapedRoute = escapeRegExp(routePath);
        updatedContent = updatedContent.replace(new RegExp(`<a href="${escapedRoute}"[^>]*class="sidebar-item ${flatName}-link"[^>]*>[\\s\\S]*?<\\/a>\\s*`, 'g'), '');
        updatedContent = updatedContent.replace(new RegExp(`<a href="${escapedRoute}"[^>]*class="nanc-link"[^>]*>[\\s\\S]*?<\\/a>\\s*`, 'g'), '');
      }
      if (updatedContent !== originalContent) {
        fs.writeFileSync(indexPath, updatedContent);
        addSummary(summary, 'updated', 'index.html navigation');
      } else {
        addSummary(summary, 'skipped', 'No index.html navigation entries to remove');
      }
    } catch (error) {
      addSummary(summary, 'failed', `Could not update index.html navigation: ${error.message}`);
    }
  }

  if (fs.existsSync(headerPath)) {
    try {
      const originalContent = fs.readFileSync(headerPath, 'utf8');
      let updatedContent = originalContent;
      for (const routePath of staticRoutePaths) {
        const escapedRoute = escapeRegExp(routePath);
        updatedContent = updatedContent.replace(new RegExp(`<a href="${escapedRoute}"[^>]*class="nanc-link"[^>]*>[\\s\\S]*?<\\/a>\\s*`, 'g'), '');
      }
      if (updatedContent !== originalContent) {
        fs.writeFileSync(headerPath, updatedContent);
        addSummary(summary, 'updated', 'src/components/app-header.ts');
      } else {
        addSummary(summary, 'skipped', 'No app-header links to remove');
      }
    } catch (error) {
      addSummary(summary, 'failed', `Could not update src/components/app-header.ts: ${error.message}`);
    }
  }

  if (fs.existsSync(footerPath)) {
    try {
      const originalContent = fs.readFileSync(footerPath, 'utf8');
      let updatedContent = originalContent;
      for (const routePath of staticRoutePaths) {
        const escapedRoute = escapeRegExp(routePath);
        updatedContent = updatedContent.replace(new RegExp(`<a href="${escapedRoute}"[^>]*>[\\s\\S]*?<\\/a>\\s*`, 'g'), '');
      }
      if (updatedContent !== originalContent) {
        fs.writeFileSync(footerPath, updatedContent);
        addSummary(summary, 'updated', 'src/components/core/app-footer.ts');
      } else {
        addSummary(summary, 'skipped', 'No footer links to remove');
      }
    } catch (error) {
      addSummary(summary, 'failed', `Could not update src/components/core/app-footer.ts: ${error.message}`);
    }
  }

  try {
    generateRouteRedirects();
    addSummary(summary, 'updated', 'Route redirects');
  } catch (error) {
    addSummary(summary, 'failed', `Could not regenerate route redirects: ${error.message}`);
  }

  printSummary(summary);
  if (summary.failed.length) {
    process.exit(1);
  }
}

removeView().catch(error => {
  console.error(`Error: ${error.message}`);
  rl.close();
  process.exit(1);
});

#!/usr/bin/env node

/**
 * View Generator Script
 * Creates views (HTML pages) with optional controllers
 * 
 * Usage:
 *   node scripts/make-view.mjs profile
 *   npm run make:view profile
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { generateCfRouter } from './generate-cf-router.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get view name from command line
const viewName = process.argv[2];

if (!viewName) {
  console.error('Error: View name is required');
  console.log('\nUsage:');
  console.log('  npm run make:view <name>');
  console.log('\nExample:');
  console.log('  npm run make:view profile');
  process.exit(1);
}

// Validate view name (kebab-case)
if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(viewName)) {
  console.error('Error: View name must be in kebab-case (lowercase with hyphens)');
  console.error('\nValid examples:');
  console.error('   - profile');
  console.error('   - user-profile');
  console.error('   - my-settings');
  console.error('\nInvalid examples:');
  console.error('   - Profile (not lowercase)');
  console.error('   - user_profile (underscore instead of hyphen)');
  process.exit(1);
}

// Create readline interface for prompts
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify question
function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Generate controller name (camelCase)
const controllerName = viewName
  .split('-')
  .map((word, index) => 
    index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
  )
  .join('');

// Generate title (Title Case)
const viewTitle = viewName
  .split('-')
  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
  .join(' ');

async function generateView() {
  try {
    // Prompt for route access level within the single-shell SPA
    const isProtectedAnswer = await question('Should this route require login? (y/n): ');
    const isProtected = isProtectedAnswer.toLowerCase().trim() === 'y';
    
    // Prompt for controller creation
    const createControllerAnswer = await question('Create a controller for this view? (y/n): ');
    const createController = createControllerAnswer.toLowerCase().trim() === 'y';
    
    rl.close();
    
    // Determine directories
    const accessFolder = isProtected ? 'protected' : 'public';
    const viewsDir = path.resolve(__dirname, '..', 'src', 'views', accessFolder);
    const viewFile = path.join(viewsDir, `${viewName}.html`);
    
    // Check if view already exists
    if (fs.existsSync(viewFile)) {
      console.error(`Error: View "${viewName}.html" already exists in ${accessFolder} folder`);
      process.exit(1);
    }
    
    // Ensure directory exists
    if (!fs.existsSync(viewsDir)) {
      fs.mkdirSync(viewsDir, { recursive: true });
    }
    
    // Generate HTML template
    const htmlTemplate = createController ? `<div class="${viewName}-page">
    <h1 id="${viewName}-title">${viewTitle}</h1>
    <p>This is the ${viewTitle} page.</p>
    
    <div id="${viewName}-content">
        <loading-spinner message="Loading ${viewTitle.toLowerCase()}..."></loading-spinner>
    </div>
</div>
` : `<div class="${viewName}-page">
    <h1>${viewTitle}</h1>
    <p>This is the ${viewTitle} page.</p>
    
    <div class="content">
        <!-- Add your content here -->
    </div>
</div>
`;
    
    // Create HTML file
    fs.writeFileSync(viewFile, htmlTemplate);
    console.log(`Created view: src/views/${accessFolder}/${viewName}.html`);
    
    // Create controller if requested
    if (createController) {
      const controllersDir = path.resolve(__dirname, '..', 'src', 'controllers');
      const controllerFile = path.join(controllersDir, `${viewName}.controller.ts`);
      const indexFile = path.join(controllersDir, 'index.ts');
      
      // Check if controller already exists
      if (fs.existsSync(controllerFile)) {
        console.error(`Warning: Controller "${viewName}.controller.ts" already exists`);
      } else {
        // Generate controller template
        const controllerTemplate = `/**
 * ${viewTitle} Page Controller
 * Handles dynamic behavior for the ${viewTitle} page
 */
import { trackEvents, trackSubscriptions } from '@utils/events.js';
${isProtected ? "import auth from '@services/auth.service.js';\nimport api from '@services/api.service.js';\n" : ""}
export async function ${controllerName}Controller(params: Record<string, string> = {}): Promise<() => void> {
    const events = trackEvents();
    const subs = trackSubscriptions();
    
    const titleElement = document.getElementById('${viewName}-title') as HTMLElement | null;
    const contentElement = document.getElementById('${viewName}-content') as HTMLElement | null;
    if (!contentElement) return () => { events.cleanup(); subs.cleanup(); };
    
    ${isProtected ? `const user = auth.getUser();
    if (user && titleElement) {
        titleElement.textContent = \`${viewTitle} - \${user.name}\`;
    }
    
    ` : ''}try {
        ${isProtected ? `// const data = await api.get('/${viewName}');
        
        contentElement.innerHTML = \`
            <div class="card">
                <h2>Welcome to ${viewTitle}</h2>
                <p>Your dynamic content goes here.</p>
                <nc-button id="${viewName}-btn" variant="primary">Action</nc-button>
            </div>
        \`;
        
        events.onClick('#${viewName}-btn', handleAction);` : `contentElement.innerHTML = \`
            <div class="card">
                <h2>Content Section</h2>
                <p>Your content goes here.</p>
            </div>
        \`;`}
    } catch (error) {
        contentElement.innerHTML = \`
            <div class="alert alert-error">
                Failed to load ${viewTitle.toLowerCase()}: \${(error as Error).message}
            </div>
        \`;
    }
    
    return () => {
        events.cleanup();
        subs.cleanup();
    };
    
    function handleAction() {
        // Handle action button click
    }
}
`;
        
        // Create controller file
        fs.writeFileSync(controllerFile, controllerTemplate);
        console.log(`Created controller: src/controllers/${viewName}.controller.ts`);
        
        // Update controllers/index.ts
        if (fs.existsSync(indexFile)) {
          let indexContent = fs.readFileSync(indexFile, 'utf8');
          
          // Add export using .js extension (ES module requirement)
          const importStatement = `export { ${controllerName}Controller } from './${viewName}.controller.js';\n`;
          
          // Check if import already exists
          if (!indexContent.includes(`${viewName}.controller`)) {
            // Add to end of file
            indexContent += importStatement;
            fs.writeFileSync(indexFile, indexContent);
            console.log(`Updated: src/controllers/index.ts`);
          }
        }
      }
    }
    
    // Update routes.ts for lazy loading
    const routesPath = path.resolve(__dirname, '..', 'src', 'routes', 'routes.ts');
    if (fs.existsSync(routesPath)) {
      let routesContent = fs.readFileSync(routesPath, 'utf8');
      
      // Add route registration with lazy controller
      const routeRegistration = createController
        ? `.register('/${viewName}', 'src/views/${accessFolder}/${viewName}.html', lazyController('${controllerName}Controller', '../controllers/${viewName}.controller.js'))`
        : `.register('/${viewName}', 'src/views/${accessFolder}/${viewName}.html')`;
      
      // Find the last .register() call and add after it
      const lastRegisterIndex = routesContent.lastIndexOf('.register(');
      if (lastRegisterIndex !== -1) {
        // Find the end of this line (semicolon or newline)
        const lineEndIndex = routesContent.indexOf('\n', lastRegisterIndex);
        if (lineEndIndex !== -1) {
          // Insert new route after this line
          const insertPoint = lineEndIndex;
          routesContent = routesContent.slice(0, insertPoint) + 
                         '\n        ' + routeRegistration + 
                         routesContent.slice(insertPoint);
          console.log(`Added route registration to src/routes/routes.ts`);
        }
      }
      
      // Add to protected routes array if needed
      if (isProtected) {
        const protectedRoutesRegex = /export const protectedRoutes = \[(.*?)\];/s;
        const match = routesContent.match(protectedRoutesRegex);
        if (match) {
          const routesList = match[1].trim();
          if (routesList && !routesList.includes(`'/${viewName}'`)) {
            const newRoutes = routesList + `, '/${viewName}'`;
            routesContent = routesContent.replace(
              protectedRoutesRegex,
              `export const protectedRoutes = [${newRoutes}];`
            );
            console.log(`Added '/${viewName}' to protected routes array`);
          }
        }
      }
      
      fs.writeFileSync(routesPath, routesContent);
      generateCfRouter();
    }
    
    // Update sidebar.ts if protected view
    if (isProtected) {
      try {
        const sidebarPath = path.resolve(__dirname, '..', 'src', 'utils', 'sidebar.ts');
        if (fs.existsSync(sidebarPath)) {
          let sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
          
          // Add const declaration for the new link
          const linkDeclaration = `const ${viewName}Link = document.querySelector('.sidebar-item.${viewName}-link') as HTMLElement;`;
          const componentsLinkMatch = sidebarContent.match(/const componentsLink[^\n]*\n/);
          
          if (componentsLinkMatch) {
            sidebarContent = sidebarContent.replace(
              componentsLinkMatch[0],
              componentsLinkMatch[0] + '        ' + linkDeclaration + '\n'
            );
          }
          
          // Add display toggle
          const displayToggle = `if (${viewName}Link) ${viewName}Link.style.display = isAuthenticated ? 'flex' : 'none';`;
          const componentsDisplayMatch = sidebarContent.match(/if \(componentsLink\)[^\n]*\n/);
          
          if (componentsDisplayMatch) {
            sidebarContent = sidebarContent.replace(
              componentsDisplayMatch[0],
              componentsDisplayMatch[0] + '        ' + displayToggle + '\n'
            );
          }
          
          fs.writeFileSync(sidebarPath, sidebarContent);
          console.log(`Updated sidebar.ts for new link visibility`);
        }
      } catch (e) {
        // sidebar.ts update is optional
      }
    }
    
    // Show next steps
    console.log('\nNext steps:');
    
    // Automatically add to navigation
    try {
      const indexPath = path.resolve(__dirname, '..', 'index.html');
      let indexContent = fs.readFileSync(indexPath, 'utf-8');
      
      if (isProtected) {
        // Add to sidebar if protected
        const sidebarPattern = /<a href="\/components"[^>]*class="sidebar-item components-link"[^>]*>[\s\S]*?<\/a>\s*<button class="sidebar-item logout-link"/;
        const navLink = `<a href="/components" data-link class="sidebar-item components-link" style="display: none;">
                        <span class="sidebar-icon"></span>
                        <span class="sidebar-text">Components</span>
                    </a>
                    <a href="/${viewName}" data-link class="sidebar-item ${viewName}-link" style="display: none;">
                        <span class="sidebar-icon"></span>
                        <span class="sidebar-text">${viewTitle}</span>
                    </a>
                    <button class="sidebar-item logout-link"`;
        
        if (sidebarPattern.test(indexContent)) {
          indexContent = indexContent.replace(sidebarPattern, navLink);
          fs.writeFileSync(indexPath, indexContent);
          console.log(`Added to sidebar menu (protected pages)`);
        }
      } else {
        // Add to header nav if public
        const headerPattern = /<a href="\/about"[^>]*class="nanc-link"[^>]*>About<\/a>\s*<\/nav>/;
        const headerLink = `<a href="/about" data-link class="nanc-link">About</a>
                            <a href="/${viewName}" data-link class="nanc-link">${viewTitle}</a>
                        </nav>`;
        
        if (headerPattern.test(indexContent)) {
          indexContent = indexContent.replace(headerPattern, headerLink);
          fs.writeFileSync(indexPath, indexContent);
          console.log(`Added to public header navigation`);
        }
      }
    } catch (e) {
      console.log(`Note: Could not auto-add navigation link. Add manually if needed.`);
    }
    
    console.log('\nDone!\n');
    
  } catch (error) {
    console.error('Error:', error.message);
    rl.close();
    process.exit(1);
  }
}

// Run the generator
generateView();

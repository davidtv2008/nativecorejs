#!/usr/bin/env node

/**
 * View Removal Script
 * Removes views (HTML pages) and their associated controllers
 * 
 * Usage:
 *   node scripts/remove-view.mjs profile
 *   npm run remove:view profile
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
  console.error('❌ Error: View name is required');
  console.log('\nUsage:');
  console.log('  npm run remove:view <name>');
  console.log('\nExample:');
  console.log('  npm run remove:view profile');
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

async function removeView() {
  try {
    // Check for view in both public and protected folders
    const publicViewPath = path.resolve(__dirname, '..', 'src', 'views', 'public', `${viewName}.html`);
    const protectedViewPath = path.resolve(__dirname, '..', 'src', 'views', 'protected', `${viewName}.html`);
    
    let viewPath = null;
    let isProtected = false;
    
    if (fs.existsSync(publicViewPath)) {
      viewPath = publicViewPath;
      isProtected = false;
    } else if (fs.existsSync(protectedViewPath)) {
      viewPath = protectedViewPath;
      isProtected = true;
    } else {
      console.error(`❌ Error: View "${viewName}.html" not found in public or protected folders`);
      rl.close();
      process.exit(1);
    }
    
    // Check for controller
    const controllerPath = path.resolve(__dirname, '..', 'src', 'controllers', `${viewName}.controller.ts`);
    const hasController = fs.existsSync(controllerPath);
    
    // Show what will be deleted
    console.log('\n📋 Files to be deleted:');
    console.log(`   - ${path.relative(process.cwd(), viewPath)}`);
    if (hasController) {
      console.log(`   - ${path.relative(process.cwd(), controllerPath)}`);
    }
    console.log('\n📝 Updates to be made:');
    if (hasController) {
      console.log('   - Remove from src/controllers/index.ts');
    }
    console.log('   - Remove from src/routes/routes.ts');
    if (isProtected) {
      console.log('   - Remove from protected routes array');
    }
    
    // Confirm deletion
    const confirm = await question('\n⚠️  Are you sure you want to delete this view? (y/n): ');
    
    if (confirm.toLowerCase() !== 'y') {
      console.log('❌ Deletion cancelled');
      rl.close();
      process.exit(0);
    }
    
    rl.close();
    
    // Delete view file
    fs.unlinkSync(viewPath);
    console.log(`✅ Deleted: ${path.relative(process.cwd(), viewPath)}`);
    
    // Delete controller if exists
    if (hasController) {
      fs.unlinkSync(controllerPath);
      console.log(`✅ Deleted: ${path.relative(process.cwd(), controllerPath)}`);
      
      // Update controllers/index.ts
      const controllersIndexPath = path.resolve(__dirname, '..', 'src', 'controllers', 'index.ts');
      if (fs.existsSync(controllersIndexPath)) {
        let indexContent = fs.readFileSync(controllersIndexPath, 'utf8');
        
        // Remove export line
        const exportPattern = new RegExp(`export \\{ ${controllerName}Controller \\} from '\\.\\/${viewName}\\.controller\\.ts';\\n`, 'g');
        indexContent = indexContent.replace(exportPattern, '');
        
        fs.writeFileSync(controllersIndexPath, indexContent);
        console.log('✅ Updated: src/controllers/index.ts');
      }
    }
    
    // Update routes.ts
    const routesPath = path.resolve(__dirname, '..', 'src', 'routes', 'routes.ts');
    if (fs.existsSync(routesPath)) {
      let routesContent = fs.readFileSync(routesPath, 'utf8');
      
      // No need to remove imports - using lazy loading (no imports at top)
      
      // Remove route registration (handles both lazy and non-lazy formats)
      const routePattern = new RegExp(`\\s*\\.register\\('\\/${viewName}'[^\\n]*\\n`, 'g');
      routesContent = routesContent.replace(routePattern, '');
      
      // Remove from protected routes array if needed
      if (isProtected) {
        const protectedRoutesRegex = /export const protectedRoutes = \[(.*?)\];/s;
        const match = routesContent.match(protectedRoutesRegex);
        
        if (match) {
          const routes = match[1]
            .split(',')
            .map(r => r.trim())
            .filter(r => r && r !== `'/${viewName}'`);
          
          routesContent = routesContent.replace(
            protectedRoutesRegex,
            `export const protectedRoutes = [${routes.join(', ')}];`
          );
        }
      }
      
      fs.writeFileSync(routesPath, routesContent);
      console.log('✅ Updated: src/routes/routes.ts');
      generateCfRouter();
    }
    
    // Remove from navigation menus
    try {
      const indexPath = path.resolve(__dirname, '..', 'index.html');
      let indexContent = fs.readFileSync(indexPath, 'utf-8');
      
      // Remove from sidebar (protected) or header (public)
      const sidebarPattern = new RegExp(`<a href="\\/${viewName}"[^>]*class="sidebar-item ${viewName}-link"[^>]*>[\\s\\S]*?<\\/a>\\s*`, 'g');
      const headerPattern = new RegExp(`<a href="\\/${viewName}"[^>]*class="nanc-link"[^>]*>[\\s\\S]*?<\\/a>\\s*`, 'g');
      
      indexContent = indexContent.replace(sidebarPattern, '');
      indexContent = indexContent.replace(headerPattern, '');
      
      fs.writeFileSync(indexPath, indexContent);
      console.log('✅ Removed from navigation');
      
      // Also update app-header.ts for public pages
      if (!isProtected) {
        const headerPath = path.resolve(__dirname, '..', 'src', 'components', 'app-header.ts');
        if (fs.existsSync(headerPath)) {
          let headerContent = fs.readFileSync(headerPath, 'utf-8');
          const headerMobilePattern = new RegExp(`<a href="\\/${viewName}"[^>]*class="nanc-link"[^>]*>[\\s\\S]*?<\\/a>\\s*`, 'g');
          headerContent = headerContent.replace(headerMobilePattern, '');
          fs.writeFileSync(headerPath, headerContent);
          console.log('✅ Removed from header component');
        }
      }
    } catch (e) {
      console.log(`⚠️  Could not remove from navigation (may need manual cleanup)`);
    }
    
    console.log('\n✨ View removed successfully!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    rl.close();
    process.exit(1);
  }
}

// Run the removal
removeView();

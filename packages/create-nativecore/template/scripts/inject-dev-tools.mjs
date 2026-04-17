// scripts/inject-denc-tools.mjs
// Inject denc-tools script into HTML files for development
import { readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';

const files = ['index.html'];
const devScripts = `    <!-- DEnc-ONLY-START -->
    <!-- Hot Module Replacement (HMR) - Development Only -->
    <script type="module" src="/.nativecore/hmr.js"></script>
    <script type="module" src="/dist/.nativecore/denc-tools.js"></script>
    <!-- DEnc-ONLY-END -->`;

async function injectDevTools(file) {
  try {
    const path = resolve(process.cwd(), file);
    let html = await readFile(path, 'utf8');
    
    // Check if denc-tools already injected
    if (html.includes('dist/.nativecore/denc-tools.js')) {
      console.log(`✓ Dev scripts already injected in ${file}`);
      return;
    }
    
    // Find the injection marker
    const marker = '<!--- inject here --->';
    if (html.includes(marker)) {
      html = html.replace(marker, devScripts);
      await writeFile(path, html, 'utf8');
      console.log(`✓ Injected dev scripts (HMR + denc-tools) into ${file}`);
    } else {
      console.warn(`⚠️  No injection marker found in ${file}`);
    }
  } catch (error) {
    console.error(`✗ Failed to inject denc-tools into ${file}:`, error.message);
  }
}

(async () => {
  console.log('🔧 Injecting dev scripts (HMR + denc-tools) for development...\n');
  await Promise.all(files.map(injectDevTools));
})();

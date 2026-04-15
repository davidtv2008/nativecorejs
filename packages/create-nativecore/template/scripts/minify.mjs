// scripts/minify.mjs
// Minify all JavaScript files in dist folder for production
import { readFile, writeFile } from 'fs/promises';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { minify } from 'terser';

async function getAllJSFiles(dir, fileList = []) {
  const files = await readdir(dir);
  
  for (const file of files) {
    const filePath = join(dir, file);
    const fileStat = await stat(filePath);
    
    if (fileStat.isDirectory()) {
      await getAllJSFiles(filePath, fileList);
    } else if (file.endsWith('.js') && !file.endsWith('.min.js')) {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

async function minifyFile(filePath) {
  try {
    const code = await readFile(filePath, 'utf8');
    const result = await minify(code, {
      compress: {
        dead_code: true,
        drop_console: false, // Keep console.warn/error, remove console.log
        drop_debugger: true,
        passes: 2, // Multiple passes for better compression
        pure_funcs: ['console.log', 'console.debug', 'console.trace'],
      },
      mangle: {
        toplevel: true, // Mangle all variable names for max compression
        properties: false, // Don't mangle property names (safer for web components)
      },
      format: {
        comments: false, // Remove all comments
        beautify: false, // No whitespace/newlines - everything on one line
      },
    });
    
    if (result.code) {
      await writeFile(filePath, result.code, 'utf8');
      const originalSize = Buffer.byteLength(code, 'utf8');
      const minifiedSize = Buffer.byteLength(result.code, 'utf8');
      const savings = ((1 - minifiedSize / originalSize) * 100).toFixed(1);
      console.log(`✓ ${filePath.replace(process.cwd(), '.')} - ${savings}% smaller`);
    }
  } catch (error) {
    console.error(`✗ Failed to minify ${filePath}:`, error.message);
  }
}

async function minifyAll() {
  const distPath = join(process.cwd(), 'dist');
  console.log('🗜️  Minifying JavaScript files...\n');
  
  const jsFiles = await getAllJSFiles(distPath);
  
  for (const file of jsFiles) {
    await minifyFile(file);
  }
  
  console.log(`\n✨ Minified ${jsFiles.length} files`);
}

minifyAll().catch(console.error);

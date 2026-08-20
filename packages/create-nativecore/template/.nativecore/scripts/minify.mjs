// scripts/minify.mjs
// Minify all JavaScript files in dist folder for production
// Usage: node .nativecore/scripts/minify.mjs [--dir _deploy/dist]
import { readFile, writeFile } from 'fs/promises';
import { readdir, stat } from 'fs/promises';
import { join, resolve } from 'path';
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

function readCacheVersion(code) {
  const match = code.match(/isDevelopment[\s\S]*?:\s*['"]([^'"]+)['"]/);
  return match ? match[1] : '';
}

async function readDeployCacheVersion(distPath) {
  const candidates = [
    join(distPath, '.nativecore', 'utils', 'cacheBuster.js'),
    join(distPath, 'nativecore', 'utils', 'cacheBuster.js'),
  ];

  for (const filePath of candidates) {
    try {
      const code = await readFile(filePath, 'utf8');
      const version = readCacheVersion(code);
      if (version) return version;
    } catch {
      // try next candidate
    }
  }

  return '';
}

function bustRelativeJsImports(code, version) {
  if (!version) return code;
  return code.replace(
    /(['"])(\.{1,2}\/[^'"]+\.js)(?:\?v=[^'"]*)?(\1)/g,
    (_match, quote, spec) => `${quote}${spec}?v=${version}${quote}`
  );
}

async function minifyFile(filePath, cacheVersion) {
  try {
    const code = await readFile(filePath, 'utf8');
    const result = await minify(code, {
      module: true,
      compress: {
        dead_code: true,
        drop_console: false,
        drop_debugger: true,
        passes: 2,
        pure_funcs: ['console.log', 'console.debug', 'console.trace'],
      },
      mangle: {
        toplevel: true,
        properties: false,
      },
      format: {
        comments: false,
        beautify: false,
      },
    });

    if (result.code) {
      const output = bustRelativeJsImports(result.code, cacheVersion);
      await writeFile(filePath, output, 'utf8');
      const originalSize = Buffer.byteLength(code, 'utf8');
      const minifiedSize = Buffer.byteLength(output, 'utf8');
      const savings = ((1 - minifiedSize / originalSize) * 100).toFixed(1);
      console.log(`✓ ${filePath.replace(process.cwd(), '.')} - ${savings}% smaller`);
    }
  } catch (error) {
    console.error(`✗ Failed to minify ${filePath}:`, error.message);
  }
}

async function minifyAll() {
  const dirIndex = process.argv.indexOf('--dir');
  const requestedDir = dirIndex >= 0 ? process.argv[dirIndex + 1] : null;
  const distPath = requestedDir
    ? resolve(process.cwd(), requestedDir)
    : join(process.cwd(), 'dist');

  console.log(`Minifying JavaScript files in ${distPath}...\n`);

  const cacheVersion = await readDeployCacheVersion(distPath);
  if (cacheVersion) {
    console.log(`Cache-busting relative ESM imports with v=${cacheVersion}\n`);
  }

  const jsFiles = await getAllJSFiles(distPath);

  for (const file of jsFiles) {
    await minifyFile(file, cacheVersion);
  }

  console.log(`\nMinified ${jsFiles.length} files`);
}

minifyAll().catch(console.error);

// scripts/strip-denc-blocks.mjs
// Removes <!-- DEnc-ONLY-START --> ... <!-- DEnc-ONLY-END --> blocks from HTML files
// Also swaps nc-error-boundary mode="dev" to mode="production"
import { readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';

const files = [
  'index.html',
  'dist/bot/index.html',
  // Add more output HTML files as needed
];

const DEV_BLOCK_REGEX = /<!-- DEnc-ONLY-START -->(.|\n|\r)*?<!-- DEnc-ONLY-END -->/g;
const ERROR_BOUNDARY_DEV_REGEX = /(<nc-error-boundary\b[^>]*)\bmode="dev"([^>]*>)/g;

async function stripDevBlocks(file) {
  try {
    const path = resolve(process.cwd(), file);
    let html = await readFile(path, 'utf8');
    let changed = false;

    const stripped = html.replace(DEV_BLOCK_REGEX, '');
    if (stripped !== html) {
      changed = true;
      html = stripped;
      console.log(`Stripped denc-only blocks from ${file}`);
    }

    const swapped = html.replace(ERROR_BOUNDARY_DEV_REGEX, '$1mode="production"$2');
    if (swapped !== html) {
      changed = true;
      html = swapped;
      console.log(`Swapped nc-error-boundary mode to production in ${file}`);
    }

    if (changed) {
      await writeFile(path, html, 'utf8');
    }
  } catch (err) {
    // Ignore missing files
  }
}

(async () => {
  await Promise.all(files.map(stripDevBlocks));
})();



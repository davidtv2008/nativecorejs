// scripts/strip-denc-blocks.mjs
// Removes <!-- DEnc-ONLY-START --> ... <!-- DEnc-ONLY-END --> blocks from HTML files
import { readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';

const files = [
  'index.html',
  'dist/bot/index.html',
  // Add more output HTML files as needed
];

const DEV_BLOCK_REGEX = /<!-- DEnc-ONLY-START -->(.|\n|\r)*?<!-- DEnc-ONLY-END -->/g;

async function stripDevBlocks(file) {
  try {
    const path = resolve(process.cwd(), file);
    let html = await readFile(path, 'utf8');
    const cleaned = html.replace(DEV_BLOCK_REGEX, '');
    if (cleaned !== html) {
      await writeFile(path, cleaned, 'utf8');
      console.log(`Stripped denc-only blocks from ${file}`);
    }
  } catch (err) {
    // Ignore missing files
  }
}

(async () => {
  await Promise.all(files.map(stripDevBlocks));
})();

// scripts/remove-dev.mjs
// Remove dev folder from dist for production builds
import { rmSync, existsSync } from 'fs';
import { join } from 'path';

const devPath = join(process.cwd(), 'dist', 'dev');

if (existsSync(devPath)) {
  rmSync(devPath, { recursive: true, force: true });
  console.log('🗑️  Removed dist/dev folder (denc-only files excluded from production)');
} else {
  console.log('✓ No dist/dev folder found (already clean)');
}

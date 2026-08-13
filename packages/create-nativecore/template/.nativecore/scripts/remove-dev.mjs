// scripts/remove-dev.mjs
// Remove dev-tool bundles from the production deployment directory.
import { rmSync, existsSync } from 'fs';
import { join } from 'path';

const targets = [
  ['_deploy', 'dist', 'dev'],
  ['_deploy', 'dist', '.nativecore', 'dev'],
];

let removed = 0;
for (const parts of targets) {
  const fullPath = join(process.cwd(), ...parts);
  if (existsSync(fullPath)) {
    rmSync(fullPath, { recursive: true, force: true });
    console.log(`Removed ${parts.join('/')} (dev tools excluded from production)`);
    removed += 1;
  }
}

if (removed === 0) {
  console.log('✓ No dev-tool bundles found in _deploy (already clean)');
}

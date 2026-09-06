# Publish all NativeCoreJS editor VSIX packages to Open VSX (Cursor-friendly registry).
# Requires: OVSX_PAT env var from https://open-vsx.org/user-settings/tokens
# Namespace NativeCoreJS must already exist: npx ovsx create-namespace NativeCoreJS -p "$OVSX_PAT"

'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pat = process.env.OVSX_PAT;
if (!pat) {
    console.error('Missing OVSX_PAT. Create a token at https://open-vsx.org/user-settings/tokens');
    console.error('Then: $env:OVSX_PAT = "your-token"   (PowerShell)');
    process.exit(1);
}

const packages = [
    'vscode-nativecore-refs',
    'vscode-nativecore-snippets',
    'vscode-nativecore-diagnostics',
    'vscode-nativecore-routes',
    'vscode-nativecore-explorer',
    'vscode-nativecore-contract',
    'vscode-nativecore-generators',
    'vscode-nativecore-sync',
    'vscode-nativecore-ssg',
    'vscode-nativecore-templates',
    'vscode-nativecore-env',
    'vscode-nativecore-fixtures',
    'vscode-nativecore-test',
    'vscode-nativecore-stores',
    'vscode-nativecore-middleware',
    'vscode-nativecore-registry',
    'vscode-nativecore-pair',
    'vscode-nativecore-importmap',
    'vscode-nativecore-orphans',
    'vscode-nativecore-signals',
    'vscode-nativecore-devtools',
    'vscode-nativecore-params',
    'vscode-nativecore-pack',
];

let failed = 0;
for (const name of packages) {
    const dir = path.join(root, 'packages', name);
    const vsixFiles = fs
        .readdirSync(dir)
        .filter((f) => f.endsWith('.vsix'))
        .map((f) => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
        .sort((a, b) => b.t - a.t);

    if (!vsixFiles.length) {
        console.error(`No .vsix in ${name} — run npm run package:vscode-all first`);
        failed++;
        continue;
    }

    const vsix = path.join(dir, vsixFiles[0].f);
    console.log(`\n=== Publishing ${name} (${vsixFiles[0].f}) ===`);
    const result = spawnSync(
        'npx',
        ['--yes', 'ovsx', 'publish', vsix, '-p', pat],
        { stdio: 'inherit', shell: true, cwd: root }
    );
    if (result.status !== 0) {
        failed++;
        console.error(`Failed: ${name}`);
    }
}

if (failed) {
    console.error(`\nDone with ${failed} failure(s).`);
    process.exit(1);
}
console.log('\nAll Open VSX publishes succeeded.');

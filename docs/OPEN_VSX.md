# Open VSX (Cursor) publishing

Cursor’s extension CLI often fails for brand-new **VS Marketplace-only** listings (`not found` / `503`). Publishing the same VSIX files to **[Open VSX](https://open-vsx.org/)** is the durable fix for Cursor installs.

Publisher / namespace must match `package.json` → `"publisher": "NativeCoreJS"`.

## One-time setup

1. Sign in at [open-vsx.org](https://open-vsx.org/) with GitHub (Eclipse account / ECA may be required).
2. Create a token: [User Settings → Tokens](https://open-vsx.org/user-settings/tokens) → copy it (once).
3. Create the namespace (exact case):

```powershell
$env:OVSX_PAT = "paste-token-here"
npx --yes ovsx create-namespace NativeCoreJS -p $env:OVSX_PAT
```

4. Optional but recommended: [claim namespace ownership](https://github.com/EclipseFdn/open-vsx.org/issues/new?template=namespace_ownership_claim.yml) so you show as verified publisher.

## Publish all editor extensions

```powershell
cd C:\Users\DavidToledo\Documents\Personal\nativecorejs
$env:OVSX_PAT = "paste-token-here"
npm run package:vscode-all
npm run publish:ovsx-all
```

## Verify

- https://open-vsx.org/extension/NativeCoreJS/vscode-nativecore-refs  
- Then in Cursor: Extensions search `@publisher:NativeCoreJS` or:

```powershell
cursor --install-extension NativeCoreJS.vscode-nativecore-snippets
```

## Ongoing

Every release: package → `vsce` upload (VS Marketplace) **and** `npm run publish:ovsx-all` (Open VSX). Keep both in sync.

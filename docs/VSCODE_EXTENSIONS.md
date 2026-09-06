# NativeCoreJS editor extensions

Official VS Code / Cursor extensions for NativeCore apps.

| Extension | Marketplace ID | Role |
|-----------|----------------|------|
| **Refs** | `NativeCoreJS.vscode-nativecore-refs` | `ref="name"` ↔ `this.name` + **F2 Rename** |
| **Snippets** | `NativeCoreJS.vscode-nativecore-snippets` | Controllers, components, routes, views |
| **Diagnostics** | `NativeCoreJS.vscode-nativecore-diagnostics` | View / import / routes warnings |
| **Routes** | `NativeCoreJS.vscode-nativecore-routes` | F12 from `routes.js` strings to files |
| **Explorer** | `NativeCoreJS.vscode-nativecore-explorer` | Sidebar route graph (path → view ↔ controller ↔ middleware) |
| **Contract** | `NativeCoreJS.vscode-nativecore-contract` | `API_ENDPOINTS` / `api.get\|post` → Laravel **controller method** |
| **Generators** | `NativeCoreJS.vscode-nativecore-generators` | Command Palette `make:*` / `remove:*` |
| **Sync** | `NativeCoreJS.vscode-nativecore-sync` | `sync:core` / components / importmap + status |
| **SSG Map** | `NativeCoreJS.vscode-nativecore-ssg` | Which routes `build:ssg` will pre-render |
| **Templates** | `NativeCoreJS.vscode-nativecore-templates` | HTML/CSS highlight in backticks |
| **Env Guard** | `NativeCoreJS.vscode-nativecore-env` | Unknown `env.*` / `env.get` keys + secret-like identifiers |
| **Fixtures** | `NativeCoreJS.vscode-nativecore-fixtures` | `API_ENDPOINTS` → mock handlers / fixture JSON |
| **Test Runner** | `NativeCoreJS.vscode-nativecore-test` | Vitest CodeLens + run current / all tests |
| **Stores** | `NativeCoreJS.vscode-nativecore-stores` | F12 store exports + unused-store hints |
| **Middleware** | `NativeCoreJS.vscode-nativecore-middleware` | F12 + completions for route middleware |
| **Registry** | `NativeCoreJS.vscode-nativecore-registry` | Custom element tags ↔ registry / component files |
| **Pair Jump** | `NativeCoreJS.vscode-nativecore-pair` | View ↔ controller ↔ `routes.js` (`Ctrl+Alt+P`) |
| **Import Guard** | `NativeCoreJS.vscode-nativecore-importmap` | Broken `@alias` imports / missing targets |
| **Orphans** | `NativeCoreJS.vscode-nativecore-orphans` | Unreferenced views/controllers/middleware + missing route targets |
| **Signals** | `NativeCoreJS.vscode-nativecore-signals` | `this.state` / `.value` / `this.bind` F12 + F2 Rename |
| **DevTools Bridge** | `NativeCoreJS.vscode-nativecore-devtools` | Jump to source from stack / clipboard / URI |
| **Route Params** | `NativeCoreJS.vscode-nativecore-params` | `params.*` completions + F12 to `:segment` routes |
| **Pack** | `NativeCoreJS.vscode-nativecore-pack` | Installs all of the above |

## Recommend in apps

Scaffolds and First Tuesday apps ship `.vscode/extensions.json` recommending:

1. **Pack** — `NativeCoreJS.vscode-nativecore-pack` (all extensions)
2. **Lite** — Refs, Routes, Pair, Contract, Diagnostics, Import Guard, Templates

Cursor/VS Code will prompt **Install Recommended Extensions** when the folder opens.

## Publish (Marketplace + Open VSX)

Tokens are not stored in the repo. When ready:

```powershell
cd C:\Users\DavidToledo\Documents\Personal\nativecorejs
npm run package:vscode-all

# Open VSX (Cursor-friendly)
$env:OVSX_PAT = "your-open-vsx-token"
npm run publish:ovsx-all

# VS Marketplace (per package, or use vsce from each package dir)
$env:VSCE_PAT = "your-azure-devops-pat"
# Example:
# npx --yes @vscode/vsce publish -p $env:VSCE_PAT --packagePath packages/vscode-nativecore-pack/vscode-nativecore-pack-0.3.2.vsix
```

See [OPEN_VSX.md](./OPEN_VSX.md). Until listings are live, use **Install from VSIX**.

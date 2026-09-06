# NativeCoreJS DevTools Bridge

Jump to source from stack frames and HMR-style paths.

## Commands

- **Jump to Source from Clipboard** — parse stack text on the clipboard
- **Jump to Source from Selection** — parse the current selection / line
- **Open Source Path** — paste a path like `src/controllers/home.controller.js:42:3`

Also handles extension URIs:

`vscode://NativeCoreJS.vscode-nativecore-devtools/open?path=src/app.js&line=10&col=1`

Prefers `src/` over `dist/` when resolving.

Marketplace ID: `NativeCoreJS.vscode-nativecore-devtools`

# NativeCoreJS Templates

HTML/CSS syntax highlighting inside JS/TS template literals for NativeCore components.

## What lights up

| Pattern | Highlighted as |
|---------|----------------|
| `html\`...\`` / `svg\`...\`` | HTML (with `${}` still JS) |
| Untagged `` ` <div>...` `` that **starts like markup** | HTML (no `html` prefix required) |
| `css\`...\`` | CSS |
| Untagged `` ` :host { ... }` `` / similar | CSS (heuristic) |
| `<style>` inside highlighted HTML | CSS (via HTML grammar) |

## Soft warning + Quick Fix

If `template()` returns an HTML-looking **untagged** backtick string, you get an info diagnostic.

**Quick Fix:** **Add html\` tag** — inserts `html` before the backtick and adds/merges the `@core-utils/templates.js` import if needed.

Setting: `nativecoreTemplates.warnUntaggedTemplate` (default `true`).

## Why untagged support

Devs sometimes forget `html\``. This extension still highlights those templates when the string begins with markup (`<div`, `<!--`, `<!DOCTYPE`, etc.).

Marketplace ID: `NativeCoreJS.vscode-nativecore-templates`

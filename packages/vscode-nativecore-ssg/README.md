# NativeCoreJS SSG Map

Adds an **SSG Map** section under the NativeCore activity bar:

- **SSG-eligible** — public + static (what `build:ssg` pre-renders)
- **Protected / skipped** — `r.group({ middleware: […] })` with tags
- **Dynamic / skipped** — paths with `:param` or `*`

Click a route to open its view HTML.

Marketplace ID: `NativeCoreJS.vscode-nativecore-ssg`

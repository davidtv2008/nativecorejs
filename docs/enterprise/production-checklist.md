# Production checklist (enterprise SPA)

NativeCoreJS ships **static + hydrate** SPAs (optional `build:ssg`). This is not a full SSR platform.

## Security

- Ship CSP via `public/_headers` (Cloudflare/Netlify) or your host’s header config.
- Suggested starter CSP (tune for your CDNs/fonts):

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self'; base-uri 'self'; form-action 'self'
```

- Auth is **BYO**: `make:middleware` + `r.group({ middleware: ['…'] })`. Do not expect a shipped JWT product.
- Keep secrets out of client bundles; use your backend for tokens.

## Build / deploy

```bash
npm run build          # production client
npm run build:ssg      # prerender public static routes → _deploy/
npm run build:full     # both (when configured)
```

CI tip: run `npm run build` then `npm run build:ssg` against a bootable server or use the scaffold’s SSG script flags. Dynamic (`:param`) and middleware-gated routes are skipped by SSG.

## Observability (opt-in)

The `nativecorejs` package exposes `registerPlugin` / `unregisterPlugin` / `listPlugins` for navigation hooks. Use plugins for analytics or error reporting — do not hard-wire them into every scaffold.

## Performance budget

Track and publish:

| Metric | Target |
|--------|--------|
| Runtime prod deps | 0 (vendored `.nativecore`) |
| Warm SPA route switch (local) | &lt; 100ms class |
| First paint (SSG pages) | HTML first, then hydrate |

See [perf-budget.md](./perf-budget.md).

## Accessibility

- Critical overlays (`nc-modal`, `nc-drawer`) use `trapFocus` from `nativecorejs/a11y`.
- Prefer keyboard Escape to close; keep `aria-modal` / `aria-hidden` in sync.
- Run Vitest a11y helper tests (`npm test` in `packages/nativecorejs`).

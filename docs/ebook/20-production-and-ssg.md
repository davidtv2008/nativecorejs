# Chapter 20 — Production and SSG

You have built Deskflow, tested it, and profiled it. Now you need a build that
a static host can serve. This chapter covers the production build pipeline and
the optional Static Site Generation (SSG) step that pre-renders public routes
into ready-to-deploy HTML.

This chapter is a lab. You will:

1. Run `npm run build` and inspect what it produces
2. Run `npm run build:ssg` and confirm which routes were pre-rendered
3. Understand exactly which routes SSG skips — and why
4. Serve the output locally and verify client-side navigation still works

---

## Mental model (30 seconds)

```
npm run build
  ↓ version inject → prod compile (esbuild, minified)
  ↓ static assets copied
  ↓ strip-dev-blocks removes HMR / DEV MODE artifacts
  ↓ output: dist/  (the compiled bundle, no SSG yet)

npm run build:ssg   (optional, after build)
  ↓ ssg.mjs reads src/routes/routes.(ts|js)
  ↓ collects static public routes
  ↓ spins up a headless Puppeteer browser
  ↓ visits each route, strips dev DOM, captures HTML
  ↓ writes _deploy/<route>/index.html
  ↓ writes _deploy/sitemap.xml

npm run build:full  = build then build:ssg (in sequence)
```

There is no `build:bots` script — older docs that mention it are obsolete.
The SSG script (`ssg.mjs`) replaced the old bot-build approach.

---

## Build scripts reference

| Script | What it does |
|--------|--------------|
| `npm run build` | Full production compile + dev-strip. Output lands in `dist/` |
| `npm run build:client` | Client bundle only, without the dev-strip step. Useful for Capacitor |
| `npm run build:ssg` | `node .nativecore/scripts/ssg.mjs --yes` — pre-renders public routes |
| `npm run build:full` | `build` then `build:ssg` in sequence |

---

## Lab — Run the production build

```bash
npm.cmd run build
```

Watch the output. A successful build ends with no errors and produces a `dist/`
directory. If `build:ssg` has run before, `_deploy/` will already exist; the
build step itself does not populate `_deploy/`.

Open `dist/` and confirm:

- The compiled bundle is present (usually `dist/app.js` or similar)
- There is **no** `denc-tools` or `hmr` artifact in the output
- The `index.html` does not contain the DEV MODE pill markup

### Challenge — Bronze

- [ ] `npm run build` completes with exit code 0
- [ ] Confirm `dist/` exists after the build
- [ ] Search `dist/` for the string `COMPONENT_BUILDER_ENABLED` — it must not appear

---

## SSG — how it decides what to pre-render

`ssg.mjs` reads your routes file (`src/routes/routes.ts` or `routes.js`) as
plain text and applies these rules:

### Routes that ARE pre-rendered

- Static literal paths: `/`, `/tasks`, `/settings`
- These paths must appear inside `r.register(...)` calls in the routes file

### Routes that are SKIPPED

| Reason | Example |
|--------|---------|
| Contains `:param` | `/tasks/:id` — dynamic, cannot be pre-rendered statically |
| Contains `*` wildcard | `/*` |
| Inside `r.group({ middleware: ['auth'] }, ...)` | Non-empty middleware array signals a protected group |

The middleware-group detection is text-based: if the `middleware` array in a
`r.group(...)` call is non-empty, every `r.register` call nested inside that
group is treated as protected and skipped.

```js
// routes.js — these are the groups SSG inspects:

r.group({}, (r) => {
    // middleware: [] — empty → eligible for SSG
    r.register('/', 'src/views/public/home.html', lazyController('home', ...));
    r.register('/tasks', 'src/views/public/tasks.html', lazyController('tasks', ...));
});

r.group({ middleware: ['session'] }, (r) => {
    // middleware: ['session'] — non-empty → SSG SKIPS all of these
    r.register('/settings', 'src/views/protected/settings.html', ...);
});
```

> **Important:** An empty `middleware: []` group (the scaffold default before
> you attach tags) is still eligible for SSG. Only add the middleware tag when
> the route is genuinely protected.

### Legacy `protectedRoutes` export

If you have an older-style routes file that exports:

```js
export const protectedRoutes = ['/settings', '/dashboard'];
```

SSG also honors that array and skips those paths.

---

## Lab — Run SSG

Before running SSG, confirm `dist/` exists from `npm run build`. SSG reads
the compiled output and Puppeteer-renders it.

```bash
npm.cmd run build:ssg
```

SSG will:

1. Detect whether `localhost:8000` is already serving the app
2. Start the app server if not (`node server.js`)
3. Launch a headless Chromium browser via Puppeteer
4. Visit each eligible route, capture the rendered HTML
5. Strip all dev-tool DOM nodes from the captured HTML
6. Write `_deploy/<route>/index.html`
7. Write `_deploy/sitemap.xml`
8. Shut down the server if it started it

### Reading the output

After SSG completes, inspect `_deploy/`:

```
_deploy/
  index.html           ← pre-rendered /
  tasks/
    index.html         ← pre-rendered /tasks
  sitemap.xml
```

Open `_deploy/tasks/index.html` in a text editor. You should see:

- The full rendered HTML of the tasks view (no empty `<div id="main-content">`)
- The `<script type="module">` tag that loads `app.js` for hydration
- **No** DEV MODE pill, HMR script, or `nc-denc-control` markup
- `data-prerendered-route="/tasks"` on the `#main-content` element

Open `_deploy/index.html` in a browser (via a local server, not `file://`). The
page should display instantly with no white flash, then hydrate and allow
client-side navigation.

```bash
npx serve _deploy
```

Visit `http://localhost:3000`, then navigate to `/tasks` using an `<nc-a>` link.
The URL changes; the router fires; the page updates — SSG pre-renders but the
app still navigates as an SPA after hydration.

### Challenge — Silver

- [ ] `_deploy/tasks/index.html` exists after `build:ssg`
- [ ] `/tasks/:id` does **not** appear under `_deploy/` (skipped because of `:id`)
- [ ] `sitemap.xml` lists `/` and `/tasks` but not `/tasks/:id`
- [ ] Navigate `/` → `/tasks` → back from the served `_deploy/` and confirm no full reload

---

## Deploy to a static host

Once `_deploy/` is ready, point your host at it:

| Host | Command / Setting |
|------|-------------------|
| Cloudflare Pages | Connect repo; set build output to `_deploy` |
| Netlify | Set publish directory to `_deploy` |
| Vercel | Set output directory to `_deploy` |
| S3 + CloudFront | Sync `_deploy/` to a bucket; configure CloudFront distribution |
| GitHub Pages | Copy `_deploy/` to `gh-pages` branch |

All static hosts need to be configured to serve `index.html` for unknown paths
(so SPA navigation works). On Cloudflare Pages this is automatic; on S3 you
configure a custom error document pointing at `index.html`.

Capacitor uses `_deploy` as `webDir` automatically when you init via the
scaffold scripts — see [Chapter 22](./22-capacitor.md).

---

## Environment notes

- SSG requires Chromium to be available on the build machine. CI environments
  typically need `puppeteer` with `--no-sandbox`. The `ssg.mjs` call already
  passes `--no-sandbox` and `--disable-setuid-sandbox` to the Puppeteer launch.
- Port 8000 must be free when SSG starts (or already serving the NativeCore
  app). If another process answers on 8000 with JSON, SSG will abort rather
  than pre-render API responses.

---

## Challenge — Gold

- [ ] Add a `/about` static route to Deskflow (view + controller), run
  `build:full`, and confirm `/about/index.html` appears in `_deploy/`
- [ ] Change `/settings` to use `middleware: ['session']`, re-run SSG, and
  confirm `/settings` is now absent from `_deploy/`
- [ ] Open `_deploy/sitemap.xml` and verify the canonical URL is set correctly
  (check `index.html` for a `<link rel="canonical">` tag)

---

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Running `build:ssg` without `build` first | SSG needs `_deploy/` to exist; run `build` first or use `build:full` |
| Expecting `build:bots` to exist | Obsolete — use `build:ssg` |
| Protected routes appearing in `_deploy/` | Ensure the group has a non-empty `middleware: [...]` array |
| Dynamic routes pre-rendered | They cannot be — SSG skips `:param` and `*` paths by design |
| `file://` not loading the app | Static hosts and SPA routing require an HTTP server; use `npx serve _deploy` |
| Dev pill in the production output | `npm run build` (not just `build:client`) runs the strip step |

---

## Verify

- [ ] `npm run build` exits 0 and produces `dist/`
- [ ] `npm run build:ssg` exits 0 and produces `_deploy/<routes>/index.html`
- [ ] `/tasks/:id` is absent from `_deploy/`
- [ ] Protected routes (non-empty middleware group) are absent from `_deploy/`
- [ ] Client-side navigation works in the served `_deploy/` output

---

## What's next

- [Chapter 21 — Realtime helpers](./21-realtime-helpers.md) — WebSocket and
  SSE connection helpers for apps that need live data

Milestone M8 is complete: Deskflow is deployable. The remaining chapters are
optional features you add when your app needs them.

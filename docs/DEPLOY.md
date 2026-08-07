# Deploy your NativeCoreJS app

This guide is for **apps you scaffold with `create-nativecore`** — not for
publishing the framework packages to npm.

When your app is ready, you produce a static folder (`_deploy/`) and point any
static host at it. The SPA shell loads first; the router hydrates and handles
client-side navigation. Optional SSG pre-renders public routes for faster first
paint and better SEO.

---

## 1. Build for production

From your app root:

```bash
# Full pipeline: production compile + optional SSG
npm run build:full
```

| Script | Output | Use when |
|--------|--------|----------|
| `npm run build` | Compiles to `dist/`, copies a deployable tree into `_deploy/` | Always — this is the minimum shippable artifact |
| `npm run build:ssg` | Pre-renders public static routes into `_deploy/<route>/index.html` | You want SEO / first-paint HTML for public pages |
| `npm run build:full` | `build` then `build:ssg` | Recommended default for public marketing/docs apps |

Preview locally before you upload:

```bash
npx --yes serve _deploy
```

Open the URL it prints. Click around — deep links and the back button should
work without a full page reload.

---

## 2. What goes live

`_deploy/` is the only folder hosts need. It typically includes:

- `index.html` — app shell
- `dist/` — compiled modules
- `src/views/` — HTML views the router fetches
- `src/styles/` — CSS
- `public/` assets (`_redirects`, `_headers`, icons, etc.)
- After SSG: per-route `index.html` files and `sitemap.xml`

Do **not** deploy the repo root, `node_modules/`, or a bare `dist/` alone.

---

## 3. SPA routing (required)

NativeCoreJS is a History API SPA. Unknown paths must rewrite to the shell
(`index.html`) with a **200**, not a 404 redirect.

The scaffold ships `public/_redirects`:

```
/* /index.html 200
```

Hosts that honor `_redirects` (Cloudflare Pages, Netlify) pick this up
automatically when it is copied into `_deploy/`.

| Host | Setting |
|------|---------|
| Cloudflare Pages | Automatic via `_redirects` |
| Netlify | Automatic via `_redirects` |
| Vercel | SPA fallback / rewrites to `/index.html` |
| S3 + CloudFront | Error document → `index.html` (or CloudFront function rewrite) |
| nginx | `try_files $uri $uri/ /index.html;` |

---

## 4. Cloudflare Pages (recommended path)

### Option A — Connect a Git repo

1. Push your app to GitHub/GitLab.
2. In Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** →
   connect the repo.
3. Build settings:

   | Field | Value |
   |-------|--------|
   | Build command | `npm run build` |
   | Build output directory | `_deploy` |
   | Node version | 18+ (set `NODE_VERSION=20` in environment variables if needed) |

4. Deploy. Cloudflare runs the build and publishes `_deploy/`.

**SSG on Cloudflare:** `build:ssg` needs Chromium (Puppeteer). Prefer
`npm run build` in Pages for reliability. Run `npm run build:full` locally (or
in a CI job with Chrome) when you need pre-rendered HTML, then either:

- commit/upload `_deploy/` from that job, or
- use a CI provider that installs Chrome, then set the Pages build command to
  `npm run build:full` and install the browser in a prebuild step
  (`npx puppeteer browsers install chrome`).

### Option B — Direct upload

```bash
npm run build:full
npx wrangler pages deploy _deploy --project-name=your-app-name
```

Requires a Cloudflare API token with Pages edit permission.

---

## 5. Netlify

1. Connect the repo (or drag-drop `_deploy/`).
2. Build settings:

   | Field | Value |
   |-------|--------|
   | Build command | `npm run build` |
   | Publish directory | `_deploy` |

3. Confirm `_redirects` is present in the published output.

---

## 6. Vercel

1. Import the repo.
2. Set **Output Directory** to `_deploy`.
3. Set **Build Command** to `npm run build`.
4. Add a rewrite so SPA deep links work (Project → Settings → Rewrites), e.g.
   source `/(.*)` → destination `/index.html`.

---

## 7. What SSG skips (on purpose)

`build:ssg` only pre-renders **public static** routes. It skips:

- Dynamic segments (`/tasks/:id`, wildcards)
- Routes inside `r.group({ middleware: [...] })` with a **non-empty** middleware list

Those URLs still work as a SPA after hydrate — they just are not static HTML
files. Document them for SEO owners if needed.

Details: ebook [Chapter 21 — Production and SSG](/docs/ebook/21-production-and-ssg).

---

## 8. Checklist before you call it shipped

- [ ] `npm run build` exits 0
- [ ] `npx serve _deploy` — home loads, client navigation works
- [ ] Deep link (e.g. `/get-started`) works on a **hard refresh**
- [ ] No DEV MODE / Component Builder UI in production HTML
- [ ] `_redirects` (or host equivalent) is active
- [ ] Optional: `build:ssg` ran and public routes have `index.html` under `_deploy/`
- [ ] Optional: `sitemap.xml` looks right if you use SSG

---

## 9. Common failures

| Symptom | Fix |
|---------|-----|
| Deep link 404s on refresh | SPA rewrite missing — confirm `_redirects` or host fallback |
| Blank page after deploy | Output dir wrong — must be `_deploy`, not `dist` or repo root |
| `build:ssg` fails in CI | Chromium missing — use `npm run build` only, or install Chrome for Puppeteer |
| Dev tools / HMR in production | Use `npm run build` (not only `compile`) so strip/remove-dev runs |
| Protected routes in SSG output | Put them in a group with non-empty `middleware: [...]` |

---

## Related

- [Quick Start](/get-started)
- [Cheat Sheet](/docs/cheatsheet)
- Ebook [Ch. 21 — Production and SSG](/docs/ebook/21-production-and-ssg)
- Ebook [Ch. 23 — Capacitor](/docs/ebook/23-capacitor) — native shells use the same `_deploy/` as `webDir`

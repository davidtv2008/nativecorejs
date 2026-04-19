# Chapter 33 — SSG and Static Deployment

NativeCoreJS applications are Single-Page Apps (SPAs) by default: the browser loads `index.html`, downloads the JavaScript bundle, and renders the page on the client. That works well for authenticated applications, but public-facing marketing pages need every route to return real HTML immediately — for SEO, for social-media link previews, and for users on slow connections.

This chapter explains two strategies for producing that HTML, helps you choose the right one, and walks through deployment to Cloudflare Pages and S3 + CloudFront.

---

## SSG vs SSR: Choosing the Right Strategy

| | **SSG — Static Site Generation** | **SSR — Server-Side Rendering** |
|---|---|---|
| **When HTML is produced** | Once, at build time | On every incoming HTTP request |
| **Deployment target** | Any static host | Requires a running server process |
| **Cloudflare Pages** | ✓ | ✗ (Pages is static-only) |
| **S3 + CloudFront** | ✓ | ✗ (S3 serves files, not Node) |
| **Netlify static** | ✓ | ✗ (Netlify Functions needed for SSR) |
| **Cloudflare Workers** | ✓ (serve SSG output) | ✓ (run Node-compatible handler) |
| **Railway / Render / Fly.io** | ✓ | ✓ |
| **AWS Lambda + CloudFront** | ✓ (serve S3) | ✓ (Lambda@Edge handler) |
| **Build time** | Slightly longer (Puppeteer renders each route) | Normal |
| **Freshness** | Static until next build | Always current |

**Rule of thumb:** use SSG unless you have a concrete requirement for per-request personalisation that cannot be handled client-side. Most NativeCoreJS applications — even those with authenticated areas — need SSG only for their *public* routes (`/`, `/about`, `/pricing`, `/docs`). Protected routes are never pre-rendered and continue to work as a normal SPA.

---

## How NativeCoreJS SSG Works

The `build:ssg` script automates the following steps:

1. Reads `src/routes/routes.ts` and extracts every registered route.
2. Skips protected routes (listed in `protectedRoutes`) and dynamic routes (`:param`, `*`).
3. Starts the compiled dev server on port 8000 (or reuses one that is already running).
4. Visits each public route with a headless Chromium browser (Puppeteer).
5. Waits for the page to finish rendering (network idle + 800 ms settle).
6. Captures the full rendered DOM and sanitises it:
   - Removes the `document.write` CSS-injection script (CSS links are already in the DOM).
   - Removes the dev-tools / HMR scripts.
   - Removes the `data-public-route="pending"` flash-prevention script.
   - **Keeps** the `<script type="module">` that imports `app.js` — the page will hydrate in the browser exactly like a normal SPA.
7. Writes the sanitised HTML to `_deploy/<route>/index.html`.
8. Generates `_deploy/sitemap.xml` from the pre-rendered routes.

The result is a `_deploy/` folder that can be uploaded directly to any static host. Search engines and social crawlers receive full HTML. Real users get the same HTML on first load and then the JavaScript hydrates the page, giving them the full interactive SPA.

---

## Running SSG

### Interactive (local development)

```bash
npm run build          # compile, minify, assemble _deploy/
npm run build:ssg      # pre-render public routes → _deploy/
```

`build:ssg` always runs without prompting. If you want a prompt (useful for exploring), run the script directly:

```bash
node .nativecore/scripts/ssg.mjs
```

### All-in-one production build

```bash
npm run build:full     # build + build:ssg in one command
```

### CI / GitHub Actions

`build:ssg` passes `--yes` internally, so it runs without prompting. In CI you can also use:

```bash
BOT_BUILD=always npm run build:ssg
```

### Skipping SSG

```bash
npm run build:ssg -- --no     # skip pre-rendering this run
BOT_BUILD=never npm run build:ssg
```

---

## Project Structure After SSG

```
_deploy/
├── index.html                  ← pre-rendered home page
├── about/
│   └── index.html              ← pre-rendered /about
├── docs/
│   └── index.html              ← pre-rendered /docs
├── login/
│   └── index.html              ← pre-rendered /login (if public)
├── sitemap.xml                 ← auto-generated from pre-rendered routes
├── dist/                       ← compiled JS
│   └── src/
│       └── app.js
├── src/
│   ├── styles/                 ← CSS files
│   └── views/                  ← HTML view partials (router still uses these)
├── manifest.json
├── robots.txt
└── _redirects                  ← Cloudflare Pages / Netlify rewrite rules
```

Every `<route>/index.html` is fully pre-rendered. Protected routes such as `/dashboard` are absent — the router handles them client-side after the SPA hydrates.

---

## Deployment: Cloudflare Pages

Cloudflare Pages is the recommended deployment target for NativeCoreJS apps. It serves the `_deploy/` folder with zero configuration.

### Connect your repository

1. Log in to the [Cloudflare dashboard](https://dash.cloudflare.com) and open **Pages**.
2. Click **Create a project** → **Connect to Git**.
3. Select your repository and branch.
4. Set the following build settings:

| Setting | Value |
|---|---|
| **Framework preset** | None |
| **Build command** | `npm run build:full` |
| **Build output directory** | `_deploy` |
| **Node.js version** | 20 (set in the Environment Variables section as `NODE_VERSION=20`) |

5. Click **Save and Deploy**.

Cloudflare Pages automatically reads `_deploy/_redirects` (written by `generate-route-redirects.mjs`) and serves `index.html` for any path that does not match a static file — this is what makes client-side routing work for routes that are *not* pre-rendered.

### Headers

`_deploy/_headers` (copied from `public/_headers`) configures cache-control and security headers. Edit that file to customise caching per path:

```
/dist/*
  Cache-Control: public, max-age=31536000, immutable

/src/styles/*
  Cache-Control: public, max-age=31536000, immutable

/index.html
  Cache-Control: no-store
```

Immutable caching on `/dist/*` and styles is safe because the build injects a unique version hash into every URL.

### Custom domain

In the Cloudflare Pages project settings, open **Custom domains** and add your domain. Cloudflare provisions an SSL certificate automatically.

---

## Deployment: AWS S3 + CloudFront

Use S3 + CloudFront when you need AWS infrastructure or want fine-grained control over caching and origin access.

### 1. Create an S3 bucket

```bash
aws s3 mb s3://my-nativecore-app --region us-east-1
```

Disable public access at the bucket level (CloudFront will provide access).

### 2. Enable static website hosting

In the bucket **Properties** tab, enable **Static website hosting** with:
- Index document: `index.html`
- Error document: `index.html`

The error document is what makes SPA routing work: any path that does not match a file falls back to `index.html`, which boots the app and the client-side router takes over.

### 3. Upload the build output

```bash
npm run build:full

aws s3 sync _deploy/ s3://my-nativecore-app \
  --delete \
  --cache-control "no-store" \
  --exclude "dist/*" \
  --exclude "src/styles/*"

aws s3 sync _deploy/dist/ s3://my-nativecore-app/dist/ \
  --delete \
  --cache-control "public, max-age=31536000, immutable"

aws s3 sync _deploy/src/styles/ s3://my-nativecore-app/src/styles/ \
  --delete \
  --cache-control "public, max-age=31536000, immutable"
```

This gives versioned JS and CSS an immutable 1-year cache, while HTML files are never cached (so the next deploy is picked up immediately).

### 4. Create a CloudFront distribution

- **Origin**: the S3 bucket static-website endpoint.
- **Default root object**: `index.html`.
- **Custom error responses**: add a rule for HTTP 403 and 404 → `/index.html` with HTTP 200. This handles direct navigation to sub-routes.
- **Price class**: PriceClass_100 (US/EU) or PriceClass_All depending on audience.

### 5. Invalidate the CDN on each deploy

After uploading, invalidate the CloudFront cache for HTML files:

```bash
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

In a GitHub Actions workflow:

```yaml
- name: Deploy to S3
  run: |
    npm run build:full
    aws s3 sync _deploy/ s3://${{ secrets.S3_BUCKET }} --delete

- name: Invalidate CloudFront
  run: |
    aws cloudfront create-invalidation \
      --distribution-id ${{ secrets.CF_DISTRIBUTION_ID }} \
      --paths "/*"
```

---

## What About True SSR?

True SSR means a Node.js (or Cloudflare Worker) process runs your application code on every HTTP request and streams HTML back to the browser — the same model used by Next.js in server mode.

NativeCoreJS does **not** include a built-in SSR renderer. If you genuinely need per-request server rendering (for example, personalised page content that differs per logged-in user and must appear in the first HTTP response), you would need to run NativeCoreJS inside a server environment such as:

- **Cloudflare Workers** — ultra-low-latency edge runtime, compatible with standard Web APIs.
- **Railway / Render / Fly.io** — managed Node.js containers; run `node server.js` directly.
- **AWS Lambda + API Gateway** — serverless, with Lambda@Edge for edge rendering.

For the vast majority of NativeCoreJS applications, SSG covers all SEO requirements at zero infrastructure cost. Reach for true SSR only if you can articulate a specific per-request requirement that SSG plus client-side data fetching cannot satisfy.

---

## Controlling Which Routes Are Pre-Rendered

SSG reads `src/routes/routes.ts` and applies the following filters automatically:

1. **Protected routes** — any route listed in `protectedRoutes` is excluded.
2. **Dynamic routes** — routes containing `:param` or `*` are excluded (the URL parameters are not known at build time).

To opt a *public* route out of pre-rendering, the simplest approach is to add it to `protectedRoutes` with a comment explaining the intent:

```typescript
// routes.ts
export const protectedRoutes = [
    '/dashboard',   // requires authentication
    '/profile',     // requires authentication
    '/changelog',   // too large; skip pre-render
];
```

To add a route that is not in `routes.ts` (for example, a static marketing page served by a separate system), add it to the `routes` array in `ssg.mjs` directly.

---

## Keeping the Sitemap in Sync

`build:ssg` regenerates `_deploy/sitemap.xml` on every run. It reads the canonical base URL from the `<link rel="canonical">` tag in `index.html`:

```html
<link rel="canonical" href="https://yourdomain.com/">
```

Update that tag to your production domain and the sitemap will contain fully qualified URLs automatically.

To exclude a route from the sitemap while still pre-rendering it (for example, a `/login` page), add post-processing in `ssg.mjs` after the `buildSitemapXml` call — or filter the `renderedRoutes` array before passing it to `buildSitemapXml`.

---

**Back:** [Chapter 32 — Capacitor: Packaging for Android and iOS](./32-capacitor-mobile-deployment.md)  
**Next:** [Ebook Index](./README.md)

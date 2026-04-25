# Chapter 13 — Going to Production

> **What you'll build in this chapter:** Run `npm run build`, verify the compiled `dist/` output, and deploy Taskflow to a public URL — completing Project 1.

The Taskflow app is feature-complete. This chapter covers everything between a working local project and a live URL: the build pipeline, environment variables, static hosting, progressive web app basics, and performance patterns that keep the app snappy as it grows.

---

## The Build Pipeline

NativeCoreJS compiles TypeScript to plain JavaScript with a single command:

```bash
npm run build
```

Under the hood this invokes `tsc` using `tsconfig.build.json`, which differs from the development `tsconfig.json` in one key way — it excludes the `.nativecore/` scaffolding directory:

```json
// tsconfig.build.json (excerpt)
{
  "extends": "./tsconfig.json",
  "exclude": [
    ".nativecore/**",
    "**/*.test.ts",
    "**/*.spec.ts"
  ]
}
```

The compiled output lands in `dist/`. Static assets (HTML templates, CSS, icons) are copied there verbatim during the build step. The result is a fully self-contained static site — no Node.js runtime required at serving time.

---

## The Static Server

During development `npm run dev` uses the bundled dev server with hot module replacement. For local production previews, run:

```bash
node server.js
```

`server.js` is a minimal Express-based static file server that ships with the framework. It serves `dist/` and falls back to `index.html` for every unknown path (enabling client-side routing). You can configure the port with the `PORT` environment variable.

---

## Environment Variables

Store environment-specific values in `.env` files at the project root:

```
# .env
API_BASE_URL=https://api.taskflow.app
APP_NAME=Taskflow
```

NativeCoreJS does not use Vite. The dev pipeline uses **esbuild** for fast TypeScript compilation and path alias resolution, with `tsc --noEmit` running in parallel for type-checking. The production build (`npm run build`) uses the same esbuild pipeline. Environment variables are read at server start from `.env` via `process.env` in `server.js`, or injected into `window` by your hosting provider's build pipeline. A simple pattern used in the template is:

```javascript
// src/constants/env.js
export const API_BASE_URL =
    (window).__ENV__?.API_BASE_URL ?? 'http://localhost:3000';
```

Then set `window.__ENV__` in `index.html` at deploy time via your CI/CD pipeline's find-and-replace step.

---

## SEO and Bot Rendering

Single-page apps are invisible to crawlers that do not execute JavaScript. NativeCoreJS ships a pre-rendering helper:

```bash
npm run build:bots
```

This command visits every registered route, renders the resulting HTML to a string, and writes a static snapshot file alongside the standard output. Search engines and social-media link previewers receive the pre-rendered HTML; browsers load the fully interactive app as normal.

Route redirects (e.g., `/` → `/dashboard`) are generated as a `_redirects` file (Netlify) or `vercel.json` rewrite rules automatically during `build:bots`.

---

## Deploying to Netlify or Vercel

Both platforms expect a static output directory and a fallback rule that sends all routes to `index.html`.

### Netlify

Create `netlify.toml` in the project root:

```toml
[build]
  command     = "npm run build"
  publish     = "dist"

[[redirects]]
  from   = "/*"
  to     = "/index.html"
  status = 200
```

Push to your Git remote and link the repository in the Netlify dashboard. Every push to `main` triggers a fresh build.

### Vercel

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Run `vercel --prod` from the project root or connect the repository via the Vercel dashboard for automatic deployments.

---

## Service Worker and PWA Basics

NativeCoreJS does not generate a service worker for you, but the build output is structured to make adding one straightforward. Create `public/sw.js` and register it in `src/main.js`:

```javascript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(console.error);
}
```

A minimal offline-first strategy caches the app shell on install and serves it on network failure. For the Taskflow app, cache the shell assets (`/`, `/index.html`, `/dist/main.js`, `/dist/main.css`) and let API requests pass through to the network.

Add a `manifest.json` at the project root with `name`, `icons`, `start_url`, and `display: "standalone"` to make Taskflow installable as a PWA.

---

## Performance Tips

### Skeleton Loading Screens

Before data arrives, show a skeleton placeholder instead of an empty or partially-rendered view. NativeCoreJS ships `<nc-skeleton>` for this purpose:

```javascript
// In the controller, before the async fetch
const root = dom.$('#content-root');
if (root) root.innerHTML = '<nc-skeleton lines="4"></nc-skeleton>';

// After data arrives
const data = await api.getCached('/tasks');
if (root) root.innerHTML = renderTaskList(data);
```

`<nc-skeleton>` renders animated grey bars that fill the content area while the real data loads. Use it any time a fetch takes more than ~150 ms — which is almost always on a production connection. It is far better than a loading spinner for content-heavy pages because it signals the *shape* of the data that is coming.

Attributes:

| Attribute | Purpose |
|---|---|
| `lines` | Number of text-line bars to show (default: 3) |
| `avatar` | Show a circular avatar placeholder before the lines |
| `full-width` | Stretch bars to 100% width instead of varying widths |

### Lazy Controllers

Every route controller loaded via `lazyController()` is code-split automatically. The controller module is not downloaded until the user navigates to that route:

```javascript
router.register('/reports', 'reports.html', lazyController('reportsController'));
```

Controllers for pages the user rarely visits (admin panels, settings) should always be lazy.

### Route Caching

`.cache()` on a route registration tells the router to keep the rendered view alive in the DOM instead of tearing it down on navigation. Use it for frequently visited pages:

```javascript
router.register('/dashboard', 'dashboard.html', lazyController('dashboardController')).cache();
```

Avoid `.cache()` for routes that must always show the latest server data without a manual refresh.

### Component Preloading

`preloadRegistry.js` lists components that should be preloaded in the background after the initial paint. Add your heaviest components there:

```javascript
// src/preloadRegistry.js
export const preloadComponents = [
  () => import('./components/project-filter/project-filter.component.js'),
  () => import('./components/task-card/task-card.component.js'),
];
```

These imports fire after `requestIdleCallback`, so they never compete with the first meaningful paint.

### Preload vs Lazy — Decision Guide

| Component type | Where to register |
|---|---|
| Shell nav, sidebar, header | `preloadRegistry.js` — needed on every page immediately |
| Loading spinner | `preloadRegistry.js` — must be available before any fetch |
| Most `nc-*` primitives | `frameworkRegistry.ts` (already done) — lazy by default |
| Your domain components (`task-card`, etc.) | `registry.ts` — lazy unless profiling shows a first-paint cost |
| Very heavy charts or editors | `registry.ts` — definitely lazy; show `nc-skeleton` first |

### GPU-Friendly Motion

When animating with CSS or the `nc-animation` component, prefer `transform` and `opacity` over properties that trigger layout (like `height`, `top`, `left`, `margin`). Transform/opacity changes are composited entirely on the GPU and do not block the main thread:

```css
/* ✅ GPU-composited — smooth 60fps */
.card { transition: transform 0.2s ease, opacity 0.2s ease; }
.card.exiting { transform: translateY(8px); opacity: 0; }

/* ❌ Triggers layout reflow — janky on low-end devices */
.card { transition: height 0.2s ease, margin 0.2s ease; }
```

### `getCached` with `revalidate`

Setting `revalidate: true` on frequently-read endpoints means users always see data instantly, even if it is a few seconds stale:

```javascript
await api.getCached('/dashboard/summary', {
  ttl:        30_000,
  revalidate: true,
  tags:       ['dashboard'],
});
```

---

## Summary — Congratulations!

You have built the core of Taskflow using NativeCoreJS.

Over the course of the first twelve chapters you learned how the **Component base class** and `useShadowDOM` give you true encapsulation without a virtual DOM. You mastered **fine-grained reactivity** — `useState`, `computed`, `bind`, and `effect` — and saw how they compose into controller-driven views without framework magic. You wired up **authentication** with protected routes, fetched and cached **async data** through `api.service`, built **validated forms** inside `<nc-modal>` dialogs, and toured the entire `nc-*` component library. In the advanced patterns chapter, you created a **global store**, used **custom events** for cross-component communication, and built a filtered task list powered by `computed` and debounced effects.

The production chapter showed you that the output of `npm run build` is a plain static site that deploys to any CDN in seconds, can be enhanced with a service worker for offline support, and scales gracefully through lazy controllers and route caching.

Project 1 is complete. In the next chapters you will start Project 2 — ShopBoard — applying the advanced routing, caching, and architecture patterns to a fresh app.

---

## Done Criteria

- [ ] `npm run build` completes without TypeScript errors.
- [ ] The compiled `dist/` folder contains `app.js` and all view HTML files.
- [ ] The app loads correctly when served from `dist/` (`node server.js`).
- [ ] Taskflow is live at a public URL and the login, tasks, and dashboard flows work end-to-end.

### Checkpoint Commit

```bash
git add .
git commit -m "✅ Project 1 complete: Taskflow — task manager deployed"
git tag project-1-complete
```

---

**Back:** [Chapter 12 — Advanced Patterns](./12-advanced-patterns.md)  
**Next:** [Chapter 14 — Dynamic Routes, URL Parameters, and Wildcards](./14-dynamic-routes.md)
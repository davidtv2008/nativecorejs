# Chapter 12 — Going to Production

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
VITE_API_BASE_URL=https://api.taskflow.app
VITE_APP_NAME=Taskflow
```

Access them at build time via `import.meta.env`:

```typescript
const base = import.meta.env.VITE_API_BASE_URL as string;
```

> **Warning:** Variables prefixed with `VITE_` are inlined at build time and become part of the JavaScript bundle. Never store secrets (private keys, service tokens) in `.env` files that are committed to source control. Use your hosting provider's secret management for anything sensitive.

For different deployment stages, create `.env.production` and `.env.staging`. The build command picks up the appropriate file automatically based on the `NODE_ENV` value.

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

NativeCoreJS does not generate a service worker for you, but the build output is structured to make adding one straightforward. Create `public/sw.js` and register it in `src/main.ts`:

```typescript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(console.error);
}
```

A minimal offline-first strategy caches the app shell on install and serves it on network failure. For the Taskflow app, cache the shell assets (`/`, `/index.html`, `/dist/main.js`, `/dist/main.css`) and let API requests pass through to the network.

Add a `manifest.json` at the project root with `name`, `icons`, `start_url`, and `display: "standalone"` to make Taskflow installable as a PWA.

---

## Performance Tips

### Lazy Controllers

Every route controller loaded via `lazyController()` is code-split automatically. The controller module is not downloaded until the user navigates to that route:

```typescript
router.register('/reports', 'reports.html', lazyController('reportsController'));
```

Controllers for pages the user rarely visits (admin panels, settings) should always be lazy.

### Route Caching

`.cache()` on a route registration tells the router to keep the rendered view alive in the DOM instead of tearing it down on navigation. Use it for frequently visited pages:

```typescript
router.register('/dashboard', 'dashboard.html', lazyController('dashboardController')).cache();
```

Avoid `.cache()` for routes that must always show the latest server data without a manual refresh.

### Component Preloading

`preloadRegistry.ts` lists components that should be preloaded in the background after the initial paint. Add your heaviest components there:

```typescript
// src/preloadRegistry.ts
export const preloadComponents = [
  () => import('./components/project-filter/project-filter.component.js'),
  () => import('./components/task-card/task-card.component.js'),
];
```

These imports fire after `requestIdleCallback`, so they never compete with the first meaningful paint.

### `getCached` with `revalidate`

Setting `revalidate: true` on frequently-read endpoints means users always see data instantly, even if it is a few seconds stale:

```typescript
await api.getCached('/dashboard/summary', {
  ttl:        30_000,
  revalidate: true,
  tags:       ['dashboard'],
});
```

---

## Summary — Congratulations!

You have built Taskflow from scratch using NativeCoreJS.

Over the course of this book you learned how the **Component base class** and `useShadowDOM` give you true encapsulation without a virtual DOM. You mastered **fine-grained reactivity** — `useState`, `computed`, `bind`, and `effect` — and saw how they compose into controller-driven views without framework magic. You wired up **authentication** with protected routes, fetched and cached **async data** through `api.service`, built **validated forms** inside `<nc-modal>` dialogs, and toured the entire `nc-*` component library. Finally, in the advanced patterns chapter, you created a **global store**, used **custom events** for cross-component communication, and built a filtered task list powered by `computed` and debounced effects.

The production chapter showed you that the output of `npm run build` is a plain static site that deploys to any CDN in seconds, can be enhanced with a service worker for offline support, and scales gracefully through lazy controllers and route caching.

NativeCoreJS is deliberately close to the platform. The patterns you have learned here — Web Components, custom events, `fetch`, Shadow DOM — are standard web APIs, not proprietary abstractions. That investment carries forward regardless of where the framework ecosystem goes next.

Go ship Taskflow. Then build something bigger.

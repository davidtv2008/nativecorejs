# Chapter 20 — Production and SSG

Ship Deskflow with `build` and optional static pre-render.

## Scripts (verified)

| Script | What it does |
|--------|----------------|
| `npm run build` | Version inject → prod compile → minify → static assets → strip/remove dev |
| `npm run build:client` | Client build without full strip/remove-dev path |
| `npm run build:ssg` | `node .nativecore/scripts/ssg.mjs --yes` |
| `npm run build:full` | `build` then `build:ssg` |

There is **no** `build:bots` in current package scripts. Older docs that mention
it are obsolete. (`ssg.mjs` comments note it replaced the bot build.)

Output for static hosting lands under `_deploy/` after SSG.

## SSG behavior (accurate)

`ssg.mjs`:

1. Reads `src/routes/routes.js|ts`
2. Collects `.register('…')` paths
3. Skips routes containing `:` or `*`
4. Skips protected paths from either:
   - `export const protectedRoutes = [ … ]` (legacy), or
   - `.register(…)` calls inside `r.group({ middleware: […] }, …)` when the
     middleware array is **non-empty** (scaffold pattern after `make:middleware`)
5. Starts localhost:8000 if needed, Puppeteer-renders each public route into
   `_deploy/<route>/index.html`
6. Keeps the app script so pages hydrate
7. Writes/updates `sitemap.xml` under `_deploy/`

Empty `middleware: []` groups (scaffold default before you attach tags) are
still eligible for SSG. After you change the group to e.g. `middleware: ['auth']`,
those static paths are skipped automatically.

## Deploy notes

- Static hosts: point at `_deploy/` (or your host’s equivalent after `build:full`)
- Capacitor uses `_deploy` as `webDir` when you init via scaffold scripts
- Run builds on a machine that can launch Chromium for Puppeteer when using SSG

## Apply to Deskflow

> **Feature:** Produce a production artifact.

1. `npm run build`
2. Optionally `npm run build:ssg` or `build:full`
3. Confirm `/` and `/tasks` exist under `_deploy` when SSG runs
4. Confirm `/tasks/:id` was **not** pre-rendered

## Verify

- [ ] No DEV MODE pill in production output
- [ ] Hydration still navigates client-side
- [ ] You understand which routes SSG skipped and why

## Next

[Chapter 21 — Realtime helpers](./21-realtime-helpers.md)

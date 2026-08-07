# SSG in CI

`build:ssg` prerenders **public static** routes into `_deploy/`. It is **static + hydrate**, not SSR.

## Local

```bash
npm run build
npm run build:ssg
# preview
npx --yes serve _deploy
```

## CI sketch

1. `npm ci`
2. `npm run build`
3. Start the app server in background (port 3000) **or** use the SSG script’s supported mode for your version.
4. `npm run build:ssg`
5. Upload `_deploy/` as the static artifact.

## Skipped routes

- Dynamic segments (`:id`, `*`)
- Routes inside `r.group({ middleware: […] })` with a non-empty middleware list
- Legacy `export const protectedRoutes = […]` entries

Document skipped paths in your deploy notes so SEO owners know which URLs need a server or client-only render.

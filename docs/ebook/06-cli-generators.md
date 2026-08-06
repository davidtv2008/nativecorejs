# Chapter 06 — CLI Generators

The full `make:*` / `remove:*` surface for Deskflow (and every NativeCore app).

## Why generators

They create the right file extension (JS/TS from `nativecore.config.json`),
update registries/routes/barrels, and keep conventions consistent.

## Commands (verified)

| Script | Purpose |
|--------|---------|
| `make:component` | UI component in `src/components/ui/` + `appRegistry` |
| `make:core-component` | `nc-*` under `src/components/core/` + `frameworkRegistry` |
| `make:controller` | `*.controller.*` + controllers index |
| `make:store` | `*.store.*` + stores index |
| `make:view` / `make:page` | View HTML, optional controller, routes, viewsMap |
| `make:middleware` | Middleware file + `app.*` import / `router.use` |
| `remove:component` | File, registry, generated tests |
| `remove:core-component` | File, preload, frameworkRegistry |
| `remove:view` | View, controller, route line |

There are **no** `delete:*` scripts.

## Useful flags

```bash
# components
npm.cmd run make:component -- task-card --defaults
npm.cmd run make:component -- task-card --defaults --with-tests
npm.cmd run make:component -- task-card --prefetch

# core
npm.cmd run make:core-component -- widget --defaults

# views
npm.cmd run make:view -- tasks --defaults
npm.cmd run make:view -- settings --protected --defaults
npm.cmd run make:view -- tasks --route /inbox --no-controller

# middleware / remove
npm.cmd run make:middleware -- session
npm.cmd run remove:view -- tasks --yes
npm.cmd run remove:component -- task-card
```

Non-interactive mode also activates when stdin is not a TTY.

## Language mode

Generators read `nativecore.config.json`:

- `"useTypeScript": false` → `.js`
- `"useTypeScript": true` → `.ts`

## Apply to Deskflow

> **Feature:** Prefer generators for every new file from here on.

Audit your project: if you hand-created a component or route, regenerate or
align it with generator output (registry lines, `r.register`, ownership markers).

## Verify

- [ ] `npm run compile` succeeds after each generator
- [ ] Registries/routes updated without manual surgery

## Common mistakes

| Mistake | Fix |
|---------|-----|
| PowerShell dropping `--defaults` | Use `npm.cmd` |
| Expecting `remove:controller` | Not shipped — delete file + barrel line manually if needed |
| Forgetting compile after generate | Run `npm run compile` or keep `npm run dev` watching |

## Next

[Chapter 07 — Deskflow tasks](./07-deskflow-tasks.md)

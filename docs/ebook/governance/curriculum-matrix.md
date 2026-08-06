# Curriculum Matrix — Deskflow Ebook

Every chapter maps to one Deskflow feature and a verifiable output.
If a row cannot be filled, the chapter is not ready to publish.

**Project:** Deskflow (single progressive app, JavaScript scaffold by default)

| Ch | Title | Concept | Deskflow feature | Verifiable output |
|----|-------|---------|------------------|-------------------|
| 00 | Introduction | Philosophy; accuracy rules | — | Reader knows JS default, no shipped auth |
| 01 | Scaffold and tour | CLI, tree, aliases, dev | Project created | `npm run dev` shows home |
| 02 | Views and routes | `createLazyController`, `r.register`, `make:view` | `/tasks`, `/settings` views | Routes navigate |
| 03 | Controllers | `CoreController` | Tasks controller skeleton | Cleanup on back-nav |
| 04 | Reactive state | `this.state` / `useState` | Live task count | Count updates in UI |
| 05 | First component | `CoreComponent`, `make:component` | `<task-card>` | Cards render in list |
| 06 | CLI generators | Full make/remove surface | Generated files only | No hand-wired registries |
| 07 | Deskflow tasks | Combine 02–06 | Working tasks list UX | Add/toggle task works |
| 08 | Middleware | BYO `createMiddleware` | Settings gated | Unauthed redirect |
| 09 | Services and API | `api.getCached`, storage | Tasks from mock API | Cache / invalidate works |
| 10 | Global stores | `make:store task` | `taskItems` / `loadTasks` | Count survives nav |
| 11 | Forms | `nc-input`, modal | Create-task form | Validation + submit |
| 12 | Core components | `nc-*` usage | Polish tasks UI | Badge/button/snackbar |
| 13 | Slots | Composition | Card slots | Named slot content |
| 14 | Styling | `--nc-*`, theme | Dark toggle | Theme persists |
| 15 | Dynamic routes | `:id`, cache, prefetch | `/tasks/:id` | Detail loads; cache hits |
| 16 | Wires | Optional `wire-*` | One wired panel | Bindings update |
| 17 | Testing | Vitest + `@testing` | Component tests | `npm test` passes |
| 18 | Dev tools | Overlay, HMR, editor | Profile a route | Overlay metrics visible |
| 19 | TypeScript mode | `--ts` | Notes on TS Deskflow | `typecheck` passes if used |
| 20 | Production / SSG | `build`, `build:ssg` | Deployable `_deploy` | Public routes pre-rendered |
| 21 | Realtime helpers | `ws` / `sse` modules | Optional live ping | Helper connects + cleans up |
| 22 | Capacitor | Opt-in packaging | Optional native shell | `cap:*` scripts understood |
| 23 | i18n helper | `configureI18n` / `t` | Optional locale switch | Strings swap |
| 24 | Troubleshooting | Diagnostics | Fixed common breaks | Checklist works |
| 25 | API quick reference | Lookup | — | Matches source APIs |

## Drift rules

1. No chapter invents scaffold JWT/login.
2. No chapter teaches `bindAttr` / `bindClass` as Component methods.
3. Router examples use `r.register` + `createLazyController`.
4. Package-only APIs (`registerPlugin`, `nativecorejs/a11y`) are labeled package-only.
5. Update this matrix when adding/removing chapters.

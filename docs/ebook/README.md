# NativeCoreJS Ebook — Build Deskflow

A hands-on guide to NativeCoreJS. Every chapter is grounded in the **current**
`create-nativecore` scaffold and vendored `.nativecore/` APIs. If something is
not shipped, the chapter says so and shows how to add it yourself.

You will build one progressive app: **Deskflow** — a small personal task desk
(list, detail, settings). Concepts are introduced only when Deskflow needs them.

### How to read each chapter (Big Nerd Ranch style)

1. **Read the short mental model** — what problem this chapter solves.
2. **Do the lab** — type the code; do not only skim.
3. **Hit Verify** — checkboxes before you move on.
4. **Try Challenges** when present:
   - **Bronze** — follow the steps
   - **Silver** — extend the feature
   - **Gold** — stretch without peeking ahead

Custom components (`make:component` + events into controllers) are the heart of
the framework — spend extra time on [Chapter 05](./05-native-web-components.md),
[Chapter 06](./06-first-component.md), and [Chapter 08](./08-deskflow-tasks.md).

---

## Accuracy rules (this edition)

1. **JS is the scaffold default.** TypeScript is `--ts`.
2. **Auth is not shipped.** Protected routes exist; middleware is author-owned.
3. Canonical UI/page bases are **`CoreComponent`** and **`CoreController`**.
4. Lazy controllers use **`createLazyController(import.meta.url)`**.
5. Prefer **`npm run make:*` / `remove:*`** over hand-wiring.
6. Use **`build:ssg`** for static pre-render / SEO builds.
7. Testing helpers: **`@testing/index.js`**.
8. Component Builder is **experimental** and **disabled by default** — not required curriculum.
9. Code samples must match real method signatures (verify against source when unsure).
10. Chapter **17 (wires)** is **legacy** — removed from curriculum core; use `ref` + `bind` + `on`.

Companion project docs (also kept accurate):

- `../.context/` in the scaffold template (`ai-context`, `architecture`, `conventions`)
- `../case-studies/` for comparison notes

---

## Prerequisites

- Node.js 18+ (20+ recommended)
- Comfortable with HTML, CSS, and modern JavaScript (`async`/`await`, modules)
- TypeScript optional until the TypeScript chapter
- A terminal and a modern browser

---

## Deskflow — what you build

| Milestone | After chapter | You can… |
|-----------|---------------|----------|
| M0 | 01 | Run the scaffold at `localhost:8000` |
| M1 | 04 | Navigate home / tasks / settings views |
| M2 | 08 | Manage tasks with a controller + reactive UI |
| M3 | 09 | Gate settings behind middleware you wrote |
| M4 | 11 | Persist via `api.service` + a store |
| M5 | 13 | Ship polished forms and `nc-*` UI |
| M6 | 16 | Task detail route + cache/prefetch |
| M7 | 19 | Pass tests and profile with the overlay |
| M8 | 21 | Produce a production / SSG build |
| M9 | 23 | Optional Capacitor packaging |

---

## Chapters

### Part 1 — Foundations

| # | File | Topic |
|---|------|--------|
| 00 | [00-introduction.md](./00-introduction.md) | What NativeCoreJS is (and is not) |
| 01 | [01-scaffold-and-tour.md](./01-scaffold-and-tour.md) | `create-nativecore`, tree, aliases, `npm run dev` |
| 02 | [02-views-and-routes.md](./02-views-and-routes.md) | HTML views, `registerRoutes`, `make:view` |
| 03 | [03-controllers.md](./03-controllers.md) | `CoreController`, refs, bind, on, cleanup |
| 04 | [04-reactive-state.md](./04-reactive-state.md) | Instance state + `@core/state.js` |
| 05 | [05-native-web-components.md](./05-native-web-components.md) | Custom elements vs VDOM, why WC, performance |
| 06 | [06-first-component.md](./06-first-component.md) | `CoreComponent`, `make:component` |
| 07 | [07-cli-generators.md](./07-cli-generators.md) | Full `make:*` / `remove:*` surface |
| 08 | [08-deskflow-tasks.md](./08-deskflow-tasks.md) | Build the tasks feature end-to-end |

### Part 2 — Application patterns

| # | File | Topic |
|---|------|--------|
| 09 | [09-middleware-and-protection.md](./09-middleware-and-protection.md) | BYO auth / session guard |
| 10 | [10-services-and-api.md](./10-services-and-api.md) | `api.service`, caching, storage, logger |
| 11 | [11-global-stores.md](./11-global-stores.md) | `make:store`, appStore / uiStore patterns |
| 12 | [12-forms-and-nc-inputs.md](./12-forms-and-nc-inputs.md) | Forms with `nc-input`, `nc-select`, modal |
| 13 | [13-core-components.md](./13-core-components.md) | Practical tour of shipped `nc-*` |
| 14 | [14-slots-and-composition.md](./14-slots-and-composition.md) | Slots, composition |
| 15 | [15-styling-and-tokens.md](./15-styling-and-tokens.md) | Shadow DOM CSS, `--nc-*` tokens, theme |
| 16 | [16-dynamic-routes-and-cache.md](./16-dynamic-routes-and-cache.md) | `:id`, wildcards, `.cache()`, prefetch |
| 17 | [17-wires.md](./17-wires.md) | **LEGACY** — historical pointer only (use ref/bind/on) |

### Part 3 — Quality, ship, advanced

| # | File | Topic |
|---|------|--------|
| 18 | [18-testing.md](./18-testing.md) | Vitest, `@testing`, `--with-tests` |
| 19 | [19-dev-tools.md](./19-dev-tools.md) | HMR, overlay, editor, outline (Builder experimental, off) |
| 20 | [20-typescript-mode.md](./20-typescript-mode.md) | Scaffolding / converting with `--ts` |
| 21 | [21-production-and-ssg.md](./21-production-and-ssg.md) | `build`, `build:ssg`, deploy notes |
| 22 | [22-realtime-helpers.md](./22-realtime-helpers.md) | `connectWebSocket` / `connectSSE` (helpers) |
| 23 | [23-capacitor.md](./23-capacitor.md) | Optional native packaging |
| 24 | [24-i18n-helper.md](./24-i18n-helper.md) | Framework `i18n` API + your catalogs |
| 25 | [25-troubleshooting.md](./25-troubleshooting.md) | Common failures and fixes |
| 26 | [26-api-quick-reference.md](./26-api-quick-reference.md) | Lookup tables (verified APIs only) |

### Appendix

| File | Topic |
|------|--------|
| [A-framework-comparison.md](./A-framework-comparison.md) | Pointer to `docs/case-studies/framework-comparison-2026.md` |
| [A-package-vs-scaffold.md](./A-package-vs-scaffold.md) | What lives in scaffold vs `nativecorejs` npm package |

### Enterprise

| File | Topic |
|------|--------|
| [../enterprise/production-checklist.md](../enterprise/production-checklist.md) | CSP, deploy, a11y, observability |
| [../enterprise/ssg-ci.md](../enterprise/ssg-ci.md) | SSG in CI (static + hydrate) |
| [../enterprise/perf-budget.md](../enterprise/perf-budget.md) | Performance budgets |
| [../enterprise/migrate-one-route.md](../enterprise/migrate-one-route.md) | Adopt one route at a time |

---

## Golden rule: use the generators

```bash
# Windows
npm.cmd run make:component -- task-card --defaults
npm.cmd run make:view -- tasks --defaults
npm.cmd run make:store -- task --defaults

# macOS / Linux
npm run make:component -- task-card --defaults
npm run make:view -- tasks --defaults
```

Prefer `ref` / `bind` / `on`. Chapter 17 (wires) is legacy only.

---

## Governance

- [Chapter template](./governance/chapter-template.md)
- [Contributor checklist](./governance/contributor-checklist.md)
- [Curriculum matrix](./governance/curriculum-matrix.md)

---

## Status of this rewrite

This ebook was rebuilt in August 2026 to match create-nativecore **rc.16-era**
scaffolds. Chapters **00–26** plus appendices are present under `docs/ebook/`.

Replaced obsolete teaching: shipped JWT auth, hand-rolled `lazyController`,
`bindAttr` as a Component method, wires utils as curriculum, and multi-project
mega-curricula. SSG uses `build:ssg`.

`build:ssg` skips middleware-gated static routes via non-empty
`r.group({ middleware: […] }, …)` blocks (and still honors a legacy
`export const protectedRoutes` array). See Chapter 21.

Verification (Aug 2026): chapters cross-checked against a fresh
`--defaults` scaffold + `make:*` output; generator stubs for components/stores
were corrected so Deskflow samples match real APIs (`ref` binds, `ttl` seconds,
`loadTasks` / `/tasks`, export `appStore`).

**BNR rewrite complete (Aug 2026):** Chapters **00–26** plus appendices were
fully rewritten in Big Nerd Ranch style. Teaching chapters follow:
mental model → lab (Deskflow) → verify → Bronze/Silver/Gold challenges →
common mistakes → next. Chapter 17 is a short legacy pointer. Chapter 26 and
the appendices are reference-style with verified tables. APIs were checked
against `packages/create-nativecore` template and `.nativecore/` sources.

Custom components remain the spine: read **05** (platform primer), then spend
the most lab time on **06** and **08**, then polish with **12–14**.

**API verification (Aug 2026):** Walked against a fresh `--defaults` scaffold +
`make:view` / `make:component` / `make:store` / `make:middleware`. Corrected
drift for `__NC_ROUTER__` advanced APIs, `*.store.js` generator output,
default service imports, async `onMount` (not awaited), and `configureI18n`
behavior.

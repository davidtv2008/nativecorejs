# Curriculum Matrix

This matrix maps every chapter to its core concept, the active project it applies to, the specific feature produced, and the verifiable output. Use it to prevent scope drift, ensure no chapter is purely conceptual, and maintain consistent project progression.

**Projects:**
- **P1** — Taskflow (Ch 00–13)
- **P2** — ShopBoard (Ch 14–20)
- **P3** — DevHub (Ch 21–27)
- **P4** — EnterpriseKit (Ch 28–37, excl. 32)
- **★** — Taskflow Mobile / Bonus (Ch 32)

---

| Chapter | Title | Core Concept | Project | Feature Produced | Verifiable Output |
|---------|-------|-------------|---------|-----------------|-------------------|
| 00 | Introduction | Framework philosophy; 5-project path | All | — | Reader has Node 20+ installed, deployment target chosen |
| 01 | Project Setup | CLI scaffold; dev server; path aliases | P1 | Taskflow scaffolded; 3 routes registered | `/login`, `/tasks`, `/dashboard` routes load in browser |
| 02 | First Component | `Component`, Shadow DOM, `template()` | P1 | `<task-card>` component | Two task cards visible in tasks view |
| 03 | Error Boundaries | `<nc-error-boundary>`, fallback UI | P1 | Root + nested error boundaries | Dev panel shown on deliberate throw |
| 04 | Reactive State | `useState`, `computed`, `batch` | P1 | `<task-stats>` live counter | Stats update from browser console |
| 05 | The Bind API | `bind`, `bindAttr`, `bindAll` | P1 | Fine-grained DOM updates in `<task-stats>` + `<task-card>` | Only changed node updates in DevTools |
| 06 | Views and Routing | `router.register`, `routes.js`, `data-*` | P1 | `/404` wildcard + verified routing | All three routes + 404 load correctly |
| 07 | Controllers | `effect`, `trackEvents`, cleanup | P1 | Full tasks controller | No duplicate listeners on back-navigation |
| 08 | Authentication | `auth.service`, protected routes | P1 | Login + JWT session persistence | Unauthenticated redirect + post-login restore |
| 09 | APIs and Async | `api.getCached`, loading/error states | P1 | Tasks loaded from API | Loading spinner, error state, and list update |
| 10 | Forms and Validation | `nc-input`, `nc-select`, validation | P1 | Create-task modal form | Form validates, submits, and shows toast |
| 11 | Core Components | `nc-table`, `nc-badge`, `nc-tabs`, `nc-toast` | P1 | Dashboard with table, badges, tabs, toasts | All four components visible and functional |
| 12 | Advanced Patterns | Global stores, custom events, `batch` | P1 | `taskStore` + `<project-filter>` | Cross-view badge update confirmed |
| 13 ✅ | Production | `npm run build`, CDN deploy | P1 | **Taskflow deployed** | Live public URL, login/tasks/dashboard work |
| 14 | Dynamic Routes | `:param`, `:param?`, `*` wildcards | P2 | ShopBoard scaffolded; `/products/:id` | Product detail page loads with correct `params.id` |
| 15 | Route Caching | `.cache({ ttl, revalidate })`, bust | P2 | Product catalog caching strategy | No HTML re-fetch on back-navigation |
| 16 | API Data Caching | `getCached`, `queryKey`, `invalidateTags` | P2 | Product data caching + tag invalidation | No duplicate API requests within TTL window |
| 17 | Middleware | `router.use`, auth guard, navigation guard | P2 | Cart auth guard + checkout save-on-navigate | Unauthenticated redirect; leaving checkout blocked |
| 18 | Global Stores | Module-level `useState`, cross-route state | P2 | `cartStore` + `wishlistStore` | Cart count badge reactive; cart survives navigation |
| 19 | Slots and Composition | Default/named slots, `::slotted` | P2 | `<product-card>` + `<product-grid>` | Slot projection and CSS Grid layout work |
| 20 ✅ | Styling and Theming | Design tokens, dark mode, `::part()` | P2 | **ShopBoard deployed** with dark mode | Tokens in all components; dark mode toggle works |
| 21 | TypeScript Patterns | Typed API, typed events, generics | P3 | DevHub scaffolded; all API shapes typed | `tsc --noEmit` passes with zero errors |
| 22 | Accessibility | ARIA, `aria-live`, keyboard nav | P3 | ARIA-annotated DevHub components | Axe DevTools: zero critical violations |
| 23 | Testing | Vitest, `mountComponent`, happy-dom | P3 | Full test suite for stores + components | `npm test` all suites passing |
| 24 | CLI Mastery | `make:*` generators; command history | P3 | All DevHub files generated with CLI | No manually created component/controller files |
| 25 | Real-Time / WebSockets | WS lifecycle, `effect`, cleanup | P3 | Live notifications feed | No orphaned sockets after navigation |
| 26 | Internationalization | Locale store, `t()`, `Intl` | P3 | 3-locale support + locale switcher | Locale switch updates all strings without reload |
| 27 ✅ | Mobile Patterns | `<nc-drawer>`, `<nc-bottom-nav>`, safe area | P3 | **DevHub deployed** with mobile shell | All tap targets ≥ 44px; `npm test` still passing |
| 28 | Troubleshooting | Diagnostic checklists | P4 | EnterpriseKit scaffolded; 3 bugs fixed | Each bug has `// BUG FIX:` comment |
| 29 | Dev Tools | Performance overlay, HMR | P4 | Route profiling + optimization | Overlay visible; ROUTE time reduced; absent in prod build |
| 30 | Migration Guide | Framework mental model mapping | P4 | Legacy React component migrated | Migrated component passes tests; no React imports |
| 31 | API Quick Reference | API lookup tables | P4 | All APIs from P1–P4 validated | `tsc --noEmit` passes across all projects |
| 32 ★ | Capacitor Mobile | Capacitor, Android/iOS packaging | ★ | **Taskflow Mobile** | Android APK built; iOS Simulator run (macOS) |
| 33 | SSG and Deployment | `build:ssg`, Cloudflare/S3 | P4 | Marketing pages pre-rendered | `_deploy/` has 4 routes; sitemap.xml generated |
| 34 | Building Plugins | `NCPlugin`, `registerPlugin` | P4 | Analytics + feature-flag plugins | Plugins fire correctly; `unregisterPlugin` stops events |
| 35 | Enterprise Architecture | Feature modules, barrel exports | P4 | EnterpriseKit feature modules | No cross-feature imports |
| 36 | Framework Comparison | React/Vue/Svelte/Lit comparison | P4 | ADR `001-framework-choice.md` | ADR committed to repo |
| 37 ✅ | Web Components in Other Frameworks | WC interop, npm packaging | P4 | **EnterpriseKit deployed** + UI library published | Component renders in React sandbox; `npm pack` or publish succeeds |

---

## Project Completion Summary

| Project | Checkpoint Chapter | Final Deliverable |
|---------|-------------------|-------------------|
| P1 — Taskflow | 13 | Deployed task manager at public URL |
| P2 — ShopBoard | 20 | Deployed e-commerce dashboard with dark mode |
| P3 — DevHub | 27 | Deployed portfolio app with a11y, tests, i18n, mobile shell |
| P4 — EnterpriseKit | 37 | Deployed internal platform with SSG + published npm package |
| ★ — Taskflow Mobile | 32 | Signed Android APK + iOS build archive (macOS) |

---

## Drift Prevention Rules

1. **Every chapter produces a feature** — if a chapter cannot be mapped to a row in this matrix with a non-empty "Feature Produced" and "Verifiable Output" column, it must be revised before publication.
2. **No chapter changes project mid-way** — a chapter belongs to exactly one project. If a concept spans two projects, it is covered in the second project's context.
3. **New APIs go to Chapter 31** — any framework API introduced in a chapter must also appear in the Chapter 31 Quick Reference table.
4. **Governance files are updated on every new chapter** — when a new chapter is added, the Contributor Checklist, Chapter Template, and this matrix must be updated in the same PR.

---

**Back:** [Contributor Checklist](./contributor-checklist.md)  
**Next:** [Chapter Template](./chapter-template.md)

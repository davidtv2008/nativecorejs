# Chapter 19 — TypeScript Mode

JavaScript is the scaffold default. Every chapter up to this point used `.js`
files. TypeScript is an opt-in that the scaffolder enables when you pass `--ts`
at creation time. This chapter explains the difference between the two modes,
shows you what a TypeScript Deskflow looks like, and walks through the practical
path if you want to convert an existing JS project.

This chapter is lighter on lab work than most — TypeScript mode is a
configuration choice, not a feature you bolt on mid-project. Read carefully,
make your decision, and then use generators consistently in whichever mode
you chose.

---

## Mental model (30 seconds)

```
--ts flag at scaffold time
  ↓
nativecore.config.json  →  "useTypeScript": true
  ↓
Generators emit .ts files instead of .js
  ↓
npm run compile   →  .nativecore/scripts/watch-compile.mjs (esbuild, --once)
npm run typecheck →  tsc --noEmit (TS projects only; type errors, no emit)
```

Without `--ts`, `"useTypeScript"` is absent or `false`, generators emit `.js`,
and there is no `typecheck` script. Either way, `compile` runs the esbuild-based
`watch-compile.mjs` pipeline — not `tsc`. TypeScript projects may still use
`tsc` via `npm run typecheck`; check your scaffold's `package.json` if unsure.

---

## Scaffolding with TypeScript from day one

```bash
npm create nativecore@latest my-app -- --ts
# or:
npx create-nativecore my-app --ts
```

The resulting `nativecore.config.json` will contain:

```json
{
  "useTypeScript": true
}
```

From that point on, every generator command produces `.ts` output:

```bash
npm.cmd run make:component -- task-card --defaults
# → src/components/ui/task-card.ts

npm.cmd run make:view -- tasks --defaults
# → src/views/public/tasks.html
# → src/controllers/tasks.controller.ts

npm.cmd run make:store -- task
# → src/stores/task.store.ts
```

The `npm run typecheck` script is also added:

```bash
npm.cmd run typecheck
# runs: tsc --noEmit
```

Run `typecheck` after every new file to catch problems before the dev server
surface them as runtime surprises.

---

## Typing patterns

### Controllers

```ts
import { CoreController } from '@core/controller.js';

export class TasksController extends CoreController {
    private titleState!: ReturnType<typeof this.state<string>>;

    onMount(): void {
        this.assertRefs('titleEl', 'listEl');
        this.titleState = this.state('Tasks');
        this.bind(this.titleState, this.titleEl);
    }
}

export function tasksController(
    _params: Record<string, string>,
    _state: unknown,
    _loaderData: unknown,
    rootElement: HTMLElement
): () => void {
    const ctrl = new TasksController(rootElement);
    return () => ctrl.destroy();
}
```

### Components

```ts
import { CoreComponent, defineComponent } from '@core/component.js';
import { html } from '@core-utils/templates.js';

export class TaskCard extends CoreComponent {
    static useShadowDOM = true;
    static observedAttributes = ['title', 'done'];

    template(): string {
        return html`
            <style>
                :host { display: block; }
            </style>
            <article ref="cardEl">
                <h3 ref="titleEl"></h3>
            </article>
        `;
    }

    onMount(): void {
        this.titleState = this.state<string>(this.getAttribute('title') ?? '');
        this.bind(this.titleState, this.titleEl);
    }
}

defineComponent('task-card', TaskCard);
```

### Routes

```ts
import { createLazyController } from '@core/lazyController.js';
import type { Router } from '@core/router.js';

const lazyController = createLazyController(import.meta.url);

export function registerRoutes(r: Router): void {
    r.group({}, (r) => {
        r.register(
            '/tasks',
            'src/views/public/tasks.html',
            lazyController('tasksController', '../controllers/tasks.controller.js')
        );
    });
}
```

### Import extension rule

All module paths keep the `.js` extension, even in TypeScript source files.
This is the NodeNext / bundler convention the template uses:

```ts
import { CoreController } from '@core/controller.js';   // correct
import { CoreController } from '@core/controller';       // wrong — breaks bundler
```

TypeScript resolves `.js` imports to `.ts` sources during type-checking; it is
not a mistake.

---

## Converting an existing JS project

There is no automated migrator in the scaffold. The practical path:

### Step 1 — Update `nativecore.config.json`

```json
{
  "useTypeScript": true
}
```

### Step 2 — Add TypeScript tooling

Scaffold a fresh `--ts` project in a temporary folder and diff its:

- `tsconfig.json`
- `tsconfig.build.json`
- `package.json` (look for `typecheck` in `scripts` and `typescript` in `devDependencies`)

Copy the missing pieces into your project. Install any missing dev dependencies:

```bash
npm.cmd install --save-dev typescript
```

### Step 3 — Rename sources incrementally

TypeScript does not require you to convert everything at once. Start with new
files:

1. Use generators from now on — they will emit `.ts`
2. For existing `.js` files you are actively editing, rename them to `.ts` one
   at a time
3. Add types progressively; `any` is fine during migration
4. Run `npm run typecheck` after each rename and fix what it surfaces

### Step 4 — Verify the build

```bash
npm.cmd run compile
npm.cmd run typecheck
```

If both pass, your migration is complete for that file. Repeat until no `.js`
files remain in `src/`.

---

## Deciding which mode to use

| Factor | JS | TS |
|--------|----|----|
| Getting started quickly | Easier — no type annotations | Slightly more boilerplate |
| Long-lived codebase | Types drift silently | Compiler catches mismatches early |
| Team unfamiliar with TS | Lower barrier | Worth the learning curve at scale |
| Mixed preferences on the team | Everyone reads JS | Unified with types |

**Recommendation:** If you are building Deskflow as a learning exercise, stay on
JS for speed. If you are building a real product, scaffold with `--ts` from the
start — retrofitting TypeScript is always harder than starting with it.

---

## Lab — Verify generators respect your mode

Whatever mode your Deskflow is in, confirm the generators agree:

```bash
npm.cmd run make:component -- test-type-check --defaults
```

Open the new file. It should be `.ts` if your config has `"useTypeScript": true`,
or `.js` otherwise.

Then remove the throwaway component:

```bash
npm.cmd run remove:component -- test-type-check
```

### Challenge — Bronze

- [ ] Read `nativecore.config.json` — note the `useTypeScript` value
- [ ] Generate and immediately remove `test-type-check`; confirm the extension
- [ ] If TS: run `npm run typecheck` and confirm it exits 0

### Challenge — Silver

- [ ] If on JS: scaffold a fresh `--ts` app in a temp folder and compare the
  `tsconfig.json` with your current project
- [ ] If on TS: add a deliberate type error to a controller, confirm
  `typecheck` reports it, then revert

### Challenge — Gold

- [ ] Convert one existing JS controller in your Deskflow to `.ts` without
  breaking `npm run build`
- [ ] Add return-type annotations to `onMount`, the factory function, and the
  cleanup arrow

---

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Mixing `.ts` and `.js` source files in the same app | Pick one mode per app; use `nativecore.config.json` |
| Omitting `.js` extension in TS import paths | Always include `.js`; the bundler and type-checker both expect it |
| Assuming `compile` means `tsc` | `compile` is esbuild via `watch-compile.mjs`; use `typecheck` for `tsc --noEmit` |
| Running only `compile` without `typecheck` (TS apps) | `compile` may succeed while type errors lurk; run both |
| Changing `useTypeScript` mid-project without renaming files | Generators will emit the new extension; old files keep the old extension — rename manually |
| Expecting an auto-migrator | None exists; rename and annotate incrementally |

---

## Verify

- [ ] Generators emit the extension that matches `useTypeScript` in `nativecore.config.json`
- [ ] If TypeScript: `npm run typecheck` exits 0
- [ ] If TypeScript: all import paths end in `.js`

---

## What's next

- [Chapter 20 — Production and SSG](./20-production-and-ssg.md) — build,
  pre-render, and deploy Deskflow

Milestone M8 starts next chapter. You have a tested, profiled app in your
preferred language mode. Now ship it.

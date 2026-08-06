# Chapter 19 — TypeScript Mode

JS is the scaffold default. TypeScript is opt-in.

## Scaffold with TS

```bash
npm create nativecore@latest my-app -- --ts
# also: npx create-nativecore my-app --ts
```

`nativecore.config.json` will contain `"useTypeScript": true`. Generators then
emit `.ts` files and a `typecheck` script (`tsc --noEmit`) is added.

## Converting an existing JS Deskflow

There is no automatic migrator in the scaffold. Practical path:

1. Set `"useTypeScript": true` in `nativecore.config.json`
2. Add TS tooling the scaffolder would have added (`typescript`, `tsconfig`, etc.)
   — easiest: scaffold a fresh `--ts` app and diff configs
3. Rename/move sources to `.ts` gradually; keep generators for new files
4. Run `npm run typecheck` and `npm run compile`

## Typing patterns that match the framework

```ts
import { CoreController } from '@core/controller.js';
import type { State } from '@core/controller.js';
import type { Router } from '@core/router.js';

export function registerRoutes(r: Router): void { /* ... */ }
```

Imports keep the `.js` extension in paths (NodeNext / bundler convention used by
the template).

## Apply to Deskflow

> **Feature (optional):** Either stay on JS, or recreate Deskflow with `--ts`
> and re-apply chapters 02–18.

Do not mix extensions randomly — pick one mode per app (`nativecore.config.json`).

## Verify

- [ ] Generators emit the extension matching `useTypeScript`
- [ ] If TS: `npm run typecheck` passes

## Next

[Chapter 20 — Production and SSG](./20-production-and-ssg.md)

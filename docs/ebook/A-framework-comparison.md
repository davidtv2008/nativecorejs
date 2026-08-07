# Appendix A — Framework Comparison

This appendix does not duplicate comparison data inline. Doing so would create
two documents that drift apart as frameworks evolve.

## Where the comparison lives

The scored, narrative comparison against React, Vue, Svelte, Solid, Lit, and
Vanilla Web Components is maintained in:

```
docs/case-studies/framework-comparison-2026.md
```

That document covers:

- Fifteen scored dimensions (bundle size, startup, reactivity model, DX, etc.)
- Benchmark methodology and caveats
- Honest assessment of NativeCoreJS weaknesses alongside strengths
- Narrative commentary on when to pick each framework

Read it there. When the ebook and the case study disagree on a scaffold fact,
**trust the `create-nativecore` template source** — open the file in
`packages/create-nativecore/template/` and verify.

## Key facts to keep accurate

The following are easy to misstate when comparing NativeCoreJS to other
frameworks:

| Fact | Accurate statement |
|------|--------------------|
| Language default | JavaScript. TypeScript is opt-in (`--ts`). |
| Auth | Not shipped. Middleware plumbing is provided; auth logic is author-owned. |
| Virtual DOM | None. Reactivity is signal-based (`State`, `effect`, `bind`). |
| SSR | Not supported. SSG via Puppeteer pre-render (`build:ssg`) is the SEO path. |
| JSX | Not used. Templates are tagged HTML literals (`html\`...\``). |
| Component builder | Experimental, disabled by default. Not a shipped feature. |
| Bundle | Zero runtime dependencies. The vendored `.nativecore/` layer is your "framework". |
| Testing | Vitest + `happy-dom`; helpers in `@testing/index.js`. |

## Updating this appendix

If you add a comparison dimension or a new framework to the case study, update
that document. This appendix is intentionally thin — it exists only to point
readers to the right place.

---

[Back to Chapter 26](./26-api-quick-reference.md) | [Appendix B — Package vs Scaffold](./A-package-vs-scaffold.md)

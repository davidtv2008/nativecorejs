# Contributor Checklist

Before merging an ebook chapter:

- [ ] APIs match `packages/create-nativecore/template` (or clearly labeled package-only)
- [ ] Imports use `.js` extensions
- [ ] Controllers use `CoreController` + factory cleanup
- [ ] Components use `CoreComponent` (not deprecated `Component` for new code)
- [ ] Routes use `createLazyController` and `r.register`
- [ ] No claim that auth/JWT/login ships in the scaffold
- [ ] Generators preferred (`make:*` / `remove:*`)
- [ ] Deskflow feature + verify steps present
- [ ] Curriculum matrix row updated
- [ ] No emojis in chapter body
- [ ] Windows note uses `npm.cmd` if flags after `--` are shown

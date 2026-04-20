# Contributor Checklist

Use this checklist before marking any chapter as complete or submitting a pull request that adds or edits a chapter.

---

## Pre-Write Check

Before writing or editing a chapter:

- [ ] The chapter is assigned to a project in the [Curriculum Matrix](./curriculum-matrix.md).
- [ ] You know which project the chapter belongs to (see the five-project path in [README.md](../README.md)).
- [ ] You have read the chapters immediately before and after this one, so you know what has already been explained and what comes next.
- [ ] You have verified that the `npm run make:*` commands still produce the expected scaffolding (run them in a clean test project).

---

## Structure Check

- [ ] The chapter filename matches the pattern `NN-kebab-chapter-title.md`.
- [ ] The chapter heading is `# Chapter NN — Title`.
- [ ] Every top-level concept has a `##` heading.
- [ ] Code examples use fenced code blocks with the correct language tag (`typescript`, `bash`, `html`, `css`, `json`).
- [ ] No tab characters appear in code blocks (use spaces).

---

## Project Application Check

Every chapter **must** have an "Apply This Chapter to Project X" section.

- [ ] The section heading reads exactly `## Apply This Chapter to [Project Name]`.
- [ ] The project name matches the project assigned to this chapter in the Curriculum Matrix.
- [ ] The `> **Project:**` and `> **Feature:**` callout lines are present and accurate.
- [ ] The feature described is specific and names at least one file, command, or visible UI behavior.
- [ ] The section is placed immediately before the footer `---` divider.

---

## Done Criteria Check

- [ ] The chapter has a `### Done Criteria` subsection inside the "Apply" section.
- [ ] There are **at least three** Done Criteria items.
- [ ] Every item is a checkbox (`- [ ]`).
- [ ] At least one criterion is verifiable in the browser (visible output, DevTools reading, or network tab).
- [ ] At least one criterion involves running a command (`npm run build`, `npm test`, `tsc --noEmit`).
- [ ] No criterion says "the file exists" without specifying what is inside it (structural ≠ behavioral).

---

## Checkpoint Commit Check (project-completion chapters only)

Chapters 13, 20, 27, 37, and 32 must each have a Checkpoint Commit block.

- [ ] The `### Checkpoint Commit` subsection is present (only on checkpoint chapters).
- [ ] The commit message uses the emoji and format: `✅ Project N complete: [Name] — [summary]` or `🚀 Bonus project complete:`.
- [ ] The `git tag` command is included.
- [ ] The checkpoint is the **last** item in the "Apply" section before the footer.

---

## Navigation Check

- [ ] The footer `**Back:**` link points to a file that exists.
- [ ] The footer `**Next:**` link points to a file that exists.
- [ ] The links use the exact filename (not the logical chapter number if they differ).
- [ ] The chapter is listed in [README.md](../README.md) under the correct project block with the correct file link.

---

## Code Quality Check

- [ ] All code examples compile without TypeScript errors (test by pasting into a fresh project).
- [ ] No `any` casts are used without a comment explaining why.
- [ ] No external npm packages are introduced without a security advisory check (use the `gh-advisory-database` tool).
- [ ] No hardcoded secrets, tokens, or credentials appear in code examples.
- [ ] URL examples use `example.com` or `localhost`, not real production domains.

---

## Curriculum Drift Prevention

- [ ] The concept introduced in this chapter is listed in the Curriculum Matrix under the correct project column.
- [ ] The feature outcome in the "Apply" section is listed in the Curriculum Matrix's Output column.
- [ ] If this chapter introduces a new framework API, the API is also added to Chapter 31 (Framework API Quick Reference).

---

**Back:** [Chapter Template](./chapter-template.md)  
**Next:** [Curriculum Matrix](./curriculum-matrix.md)

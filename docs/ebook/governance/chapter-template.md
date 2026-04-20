# Chapter Template

Every chapter in the NativeCoreJS ebook must follow this structure. Copy this template when creating a new chapter, filling in each section as described.

---

## File Naming

```
NN-kebab-chapter-title.md
```

- `NN` is the two-digit chapter number, zero-padded (e.g. `01`, `14`, `37`).
- The rest of the filename is the chapter title in `kebab-case`.

---

## Required Sections (in order)

### 1. Chapter Heading

```markdown
# Chapter NN — Title
```

One sentence subtitle explaining what this chapter is about and why it matters.

---

### 2. Introduction

A short introduction (2–4 paragraphs) that:
- States the problem this chapter solves.
- Connects back to the active project.
- Sets up what the reader will learn and build.

---

### 3. Concept Sections

One or more sections covering the chapter's core concepts. Each concept section:
- Has a `##` heading.
- Includes a code example taken from, or directly applicable to, the active project.
- Does **not** use abstract or toy examples unless the concept genuinely requires isolation.

---

### 4. Apply This Chapter to Project X

```markdown
---

## Apply This Chapter to [Project Name]

> **Project:** [Project Name] — [Subtitle]  
> **Feature:** [One sentence describing the visible feature you will build]

[One to three paragraphs of step-by-step guidance on implementing the feature.
Be specific about file names, commands, and what to verify.]

### Done Criteria

- [ ] [Specific, measurable outcome — must be verifiable in the browser or test output]
- [ ] [Specific, measurable outcome]
- [ ] [Specific, measurable outcome]
- [ ] [Specific, measurable outcome]
```

**Rules for Done Criteria:**
- Minimum three criteria per chapter.
- Each criterion must be verifiable without running the project author's eyes over source code.
- Prefer behavioral criteria ("the modal opens when the button is clicked") over structural ones ("the file exists").
- At least one criterion should be verifiable via the browser (navigation, visual output, DevTools reading).

---

### 5. Checkpoint Commit (project-completion chapters only)

Add a Checkpoint Commit block **only** at the final chapter of each project block:

```markdown
### Checkpoint Commit

```bash
git add .
git commit -m "✅ Project N complete: [Project Name] — [one-line summary]"
git tag project-N-complete
```
```

Checkpoint chapters are: **13** (Project 1), **20** (Project 2), **27** (Project 3), **37** (Project 4), **32** (Bonus).

---

### 6. Footer

```markdown
---

**Back:** [Chapter NN-1 — Previous Title](./NN-1-prev-title.md)  
**Next:** [Chapter NN+1 — Next Title](./NN+1-next-title.md)
```

Use the exact file name (not the logical chapter number if they differ).

---

## Quality Checklist

Before submitting a chapter, confirm:

- [ ] The chapter title matches the filename.
- [ ] Every code example uses `npm run make:*` generators where applicable (not manual file creation).
- [ ] The "Apply This Chapter" section names the correct project for the chapter's position.
- [ ] Done Criteria are specific, measurable, and browser/test-verifiable.
- [ ] The footer links point to files that exist.
- [ ] No external dependencies are introduced without a security advisory check.
- [ ] The chapter does not duplicate a concept already fully covered in a previous chapter (cross-reference instead).

---

**Back:** [Contributor Checklist](./contributor-checklist.md)  
**Next:** [Curriculum Matrix](./curriculum-matrix.md)

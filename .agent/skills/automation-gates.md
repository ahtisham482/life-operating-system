# Skill 10 — Automation Gates

**When to run:** During project setup, CI configuration, or when reviewing the development workflow.

---

## The Principle

The best checklist is one you CAN'T skip because tooling enforces it.

Manual checklists get forgotten under deadline pressure. You tell yourself "I'll check that later" and then you don't. Automated gates don't care about deadlines — they block bad code from getting through, every single time.

The goal: make it impossible to ship broken code, not just unlikely.

---

## Pre-Commit Hook (Husky + lint-staged)

These checks run automatically every time you try to commit. If any check fails, the commit is blocked.

**What to enforce:**

- Reject files over 300 lines (prevents monolithic components that are hard to maintain)
- Run ESLint on staged files (catches common mistakes before they enter the repo)
- Run Prettier on staged files (keeps formatting consistent without debates)
- Run TypeScript type-check: `tsc --noEmit` (catches type errors before commit)

**How to set up:**

```bash
npx husky init
```

Then configure `.husky/pre-commit` and `lint-staged` in `package.json`.

---

## ESLint Rules to Add

Beyond the defaults, add rules that catch the specific mistakes that cause real bugs in this project:

- **Flag `as` type assertions** — every `as SomeType` is telling TypeScript "trust me, I know better." Each one is a potential runtime crash waiting to happen.
- **Flag `any` type usage** — `any` turns off type checking for that variable. It defeats the purpose of using TypeScript.
- **Flag `console.log` in production code** — use proper logging or remove debug logs before committing.
- **Flag missing React keys in list rendering** — missing keys cause subtle rendering bugs that are hard to track down.
- **Flag unused imports and variables** — dead code creates confusion and adds bundle weight.

---

## CI Pipeline (GitHub Actions)

Set up a workflow that runs on every push and every pull request. If any step fails, the merge is blocked.

**Steps to run:**

1. `npm ci` — install dependencies (clean install, respects lockfile)
2. `npx tsc --noEmit` — type check the entire project
3. `npx next build` — verify the build succeeds
4. `npx eslint .` — run all lint rules

**Key setting:** Configure the GitHub repository to require these checks to pass before merging a PR. This is set in Settings → Branches → Branch protection rules.

---

## Build Verification

`next build` must pass before EVERY push. No exceptions.

When reviewing build output, check for:

- **Route sizes** — are any routes unexpectedly large? (see Skill 8: Performance Budget)
- **Warnings** — Next.js warnings often point to real problems (missing metadata, bad imports)
- **Errors** — obvious, but sometimes people push without building first

Set up Vercel's preview deployments so every PR gets a live URL. This lets you visually verify changes before merging.

---

## Dependency Management

Dependencies are other people's code running in your app. Treat them with caution.

- **Pin major versions** in package.json to prevent surprise breaking changes (use `~` or exact versions, not `^` for critical deps)
- **Review updates before applying** — don't blindly run `npm update`
- **Check for vulnerabilities regularly:** `npm audit` flags known security issues in your dependencies

---

## What to Automate First (Priority Order)

If you're starting from zero automation, add these in order. Each one catches a different category of bugs:

| Priority | What                                         | Why                                             | Impact                     |
| -------- | -------------------------------------------- | ----------------------------------------------- | -------------------------- |
| 1        | TypeScript strict mode + `next build` passes | Catches type errors and build failures          | ~30% of bugs prevented     |
| 2        | ESLint with custom rules                     | Catches code quality issues and common mistakes | ~10% more bugs prevented   |
| 3        | Pre-commit hooks (Husky + lint-staged)       | Prevents bad code from entering the repo at all | Shifts all catches earlier |
| 4        | CI pipeline (GitHub Actions)                 | Catches everything else before deploy           | Final safety net           |

Start with Priority 1. It gives you the most protection for the least effort. Add the others as the project matures.

# Skill 12 — Testing Strategy

> **When to run:** Before declaring any feature done. Before any PR merge.
> **Enforcement:** MANDATORY — every new feature MUST include tests.

---

## 1. The Testing Mandate

This project currently has ZERO test files. That changes now.

- Every new feature MUST ship with at least one test. No exceptions.
- If you can't write a test for it, the feature isn't testable — which means it's not maintainable.
- No tests = not done. Period. This overrides everything else.
- When in doubt about whether something needs a test, the answer is yes.

**Gate:** Does this feature have at least one test file? YES → proceed. NO → write the test before declaring done.

---

## 2. What to Test (The 80/20 Rule)

Focus on the 20% of code that causes 80% of bugs. Here's what matters most:

- [ ] 1 test per API route — happy path (correct data in, correct response out) + error path (bad data in, proper error response out)
- [ ] 1 test per form submission — valid data submits successfully + invalid data shows the right error messages
- [ ] 1 test per critical user flow — the full journey: login, create something, view it, edit it, delete it
- [ ] 1 test per utility function — does `formatDate()` return the right string? Does `calculateStreak()` count correctly?

**What NOT to test** (save your time):

- Pure styling (colors, spacing, font sizes — your eyes can check these)
- Static content (about pages, FAQ text, legal pages)
- Third-party libraries (Supabase, Tailwind, Radix — they have their own tests)

---

## 3. The Testing Trophy (Not Pyramid)

Think of testing like a trophy shape — wide in the middle, narrow at top and bottom:

- **Bottom (small): Static analysis** — TypeScript and ESLint catch typos, wrong types, and silly mistakes automatically. You already have this. It runs every time you save a file.
- **Middle (biggest): Integration tests** — These are the MOST valuable. They test real data flowing through your real system. Example: "When I call the habits API, does it actually return habits from the database?" This catches the bugs that actually break your app.
- **Top-middle (smaller): Unit tests** — For pure logic only. Functions like `formatDate()`, `calculateStreak()`, `isValidEmail()`. Small, fast, simple.
- **Top (smallest): End-to-end tests** — A real browser clicking through your app like a real user. Expensive to run, slow, sometimes flaky. Use sparingly — only for critical journeys like login and checkout.

Why "trophy" not "pyramid"? Because integration tests catch the most real-world bugs. Write more of those, fewer unit tests.

---

## 4. Tools

- **Vitest** — for unit and integration tests. Fast, works perfectly with Next.js 15 and React 19. Runs in milliseconds.
- **Playwright** — for end-to-end tests. Opens a real browser, clicks real buttons, fills real forms. Use only for critical user journeys.
- **Test database** — use Supabase branch databases so tests run against isolated data. Never test against production.
- **NEVER use mocks for database calls.** Mocks hide real bugs. If your mock says "return 3 habits" but the real query has a typo, the mock won't catch it. Test against a real Supabase instance.

---

## 5. Test File Co-location

Tests live NEXT TO the code they test. Not in a separate `/tests` folder. This makes it obvious when a file is missing its test.

Examples for this project:

```
app/api/habits/route.ts       → app/api/habits/route.test.ts
components/habit-card.tsx      → components/habit-card.test.tsx
lib/utils/format-date.ts      → lib/utils/format-date.test.ts
actions/habits.ts              → actions/habits.test.ts
```

If you see a file without a `.test.ts` neighbor, that's a gap to fill.

---

## 6. Database Testing Rules

Your data layer is where the scariest bugs hide. Test it properly:

- [ ] Never mock Supabase calls — mocks hide real bugs like wrong column names, missing RLS policies, and broken queries
- [ ] Use a real test Supabase instance (branch database) — isolated from production
- [ ] Seed test data before each test suite — use realistic data, not "test123" or "asdf"
- [ ] Clean up after tests — delete created rows or use transaction rollback so tests don't pollute each other
- [ ] Test RLS policies — verify that User A cannot see User B's data. This is a security test disguised as a data test.

**Gate:** Are database tests running against a real Supabase instance (not mocks)? YES → proceed. NO → fix the test setup.

---

## 7. When to Skip Tests

Some things genuinely don't need tests:

- Pure UI styling changes (changed a color from blue to green)
- Static content pages (updated the FAQ text)
- One-time scripts or database migrations
- Configuration file changes (updated `tailwind.config.ts`)

Everything else gets tested. When in doubt, write the test — it takes 5 minutes now and saves 2 hours of debugging later.

---

## 8. Quick Start (First Tests to Write)

Since this project has zero tests, here's where to begin — in priority order:

1. **API route tests** — test each route in `app/api/`. Does it return the right data? Does it reject unauthorized requests? Does it handle missing fields?
2. **Server action tests** — test each action in `actions/`. Does submitting valid data work? Does invalid data return proper errors?
3. **Utility function tests** — test pure functions in `lib/`. These are the easiest tests to write and give instant confidence.
4. **Login flow E2E test** — one Playwright test: can a user sign in, see the dashboard, and sign out?
5. **Check-in form E2E test** — one Playwright test: can a user fill out a check-in and submit it?

Start with items 1-3 (fast, high value). Add items 4-5 once the basics are covered.

**Cross-references:** See Skill 5 (Definition of Done) Gate 6 for build checks. See Skill 2 (Pre-Build Checklist) Section 3 for data flow planning that informs what to test.

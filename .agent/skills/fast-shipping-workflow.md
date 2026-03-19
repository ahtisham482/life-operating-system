# Skill 6 — Fast Shipping Workflow

This skill sets the session structure and deploy verification process. Follow it every session.

---

## 1. Session Structure

Every work session follows this flow:

```
PLAN -> BUILD -> VERIFY -> SHIP -> CAPTURE
```

- **PLAN (5-15 min)**: What are we building? Write a brief spec. Sketch out which files will change.
- **BUILD (main time)**: Write code following Skills 1-5.
- **VERIFY (5-10 min)**: Run the Definition of Done checklist (Skill 2). Does it build? Does it look right? Does it work?
- **SHIP (2-5 min)**: Commit, push, and verify the Vercel preview deployment works.
- **CAPTURE (2 min)**: Note what was learned. Update memories so the next session starts smarter.

Do not skip steps. The most tempting one to skip is VERIFY — that is the one that saves you the most time.

---

## 2. The 30-Minute Spec Rule

If a feature will take more than 1 hour to build, write a brief spec FIRST.

Spec format:

- **WHY**: What problem are we solving? Why does it matter?
- **WHAT**: Exactly what the feature does. Be specific — "user can do X" not "improve the experience."
- **HOW**: Technical approach. Which files change? What's the data flow?
- **NOT**: What is out of scope. What we are NOT building right now.

A 30-minute spec prevents:

- Scope creep (building more than was asked for).
- Misunderstandings (building the wrong thing).
- Wasted iterations (going back and forth because the goal was unclear).

A 30-minute spec saves HOURS of rework.

---

## 3. Commit Cadence

- Make small, focused commits. Each commit should build and work on its own.
- Commit message format: `[type]: [what changed] — [why]`
- Types:
  - `feat` — a new feature
  - `fix` — a bug fix
  - `refactor` — restructuring code without changing behavior
  - `style` — visual/CSS changes
  - `docs` — documentation changes
  - `chore` — tooling, config, dependencies
- NEVER commit broken code. `next build` must pass before every commit.
- Always push after committing. The user checks work on live Vercel deployments, not on their local machine.

---

## 4. The 2-Attempt Rule (CRITICAL)

If a fix does not work after 2 attempts: STOP.

Before making a third attempt, you MUST do all of the following:

1. Write down what you tried in attempt 1 and attempt 2.
2. Write down what you LEARNED from each failure. What did the error tell you? What did you rule out?
3. List 3 alternative approaches, each with a confidence rating (high, medium, low).
4. Present all of this to the user and let THEM choose which approach to try next.

This rule prevents the "fix the symptom, not the disease" loop — where you keep patching surface-level issues instead of finding the real problem.

Real example from this project: The AI interview feature took 3 commits because symptoms (auto-scroll behavior, API guard logic) were treated one by one, instead of addressing the root cause (the difference between AI-controlled flow and user-controlled flow).

---

## 5. Deploy Checklist (After Every Push)

Run through this checklist after every push:

- [ ] `next build` passes locally (no errors, no warnings that break the build).
- [ ] Changes are pushed to the remote branch.
- [ ] Check Vercel deployment status — make sure it did not fail.
- [ ] Open the Vercel preview URL in a browser.
- [ ] Click through the happy path — does the feature actually work?
- [ ] Check in an incognito/private window — no cached state hiding bugs.
- [ ] Verify the feature is VISIBLE — would a real user find it without being told where to look?

That last point catches a common problem: the feature works perfectly but nobody can find it because there is no link, no button, or no menu entry pointing to it.

---

## 6. Scope Control

- Build the MVP version first — the smallest thing that is actually useful.
- When new ideas come up during building: note them as "v2" items. Do not build them now.
- Watch for phrases that signal scope creep:
  - "While we're at it..."
  - "It would also be nice if..."
  - "Let me just quickly add..."
- The correct response to scope creep: "Good idea — I'll note that for v2. Let's ship v1 first."
- Shipping something small that works is always better than shipping something big that is half-broken.

---

## 7. The Linear Method (Adapted for Solo Dev)

This is the overall development rhythm:

1. Write a short spec.
2. Build the smallest useful increment.
3. Ship it.
4. Get feedback (use it yourself, show it to someone).
5. Iterate based on what you learned.

Rules of thumb:

- Do not plan more than 2 weeks ahead — things change too fast.
- Every feature should ship within 1-3 sessions, not 10. If it is taking longer, the scope is too big.
- If a feature is taking too long, the scope is too big — cut it down. Ask: "What is the smallest version of this that would be useful?"

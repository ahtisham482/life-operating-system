# Skill 7 — Structured Debugging Protocol

**When to run:** Every time a bug is reported or unexpected behavior is found.

---

## Step 1: "What Changed?"

Before anything else, check the last 3 git commits. Read the diff.

80% of bugs live in recent changes. Don't go hunting through the whole codebase when the answer is probably in the last thing someone touched.

Run:

```
git log --oneline -3
git diff HEAD~3..HEAD
```

If the bug appeared after a specific change, you already know where to look.

---

## Step 2: "Where Does It Break?"

Use binary search to narrow down the problem:

1. Comment out half the suspected code
2. Does it still break? If yes, the bug is in the OTHER half
3. Repeat until you've isolated the exact function, component, or line

Don't guess. Don't read through hundreds of lines hoping to spot it. Systematically cut the search space in half each time.

---

## Step 3: "Why Does It Break?"

Run a 5-Why root cause analysis. Ask "why?" five times until you reach the systemic cause, not just the surface symptom.

**Example:**

1. "The status checkboxes are invisible" → Why?
2. "The opacity is too low" → Why?
3. "Someone used 15% opacity for the background" → Why wasn't this caught?
4. "There's no minimum visibility rule in the project" → Why?
5. "There's no UI quality gate checklist" → **ROOT CAUSE: missing quality checklist**

The first "why" gives you the symptom. The fifth "why" gives you the disease.

---

## Hard Rule: Never Fix Without Writing the Root Cause First

Before you write a single line of fix code, write down the root cause in plain words.

Fixing symptoms without understanding the cause leads to 3-iteration debugging loops where the "fix" creates a new bug, which gets "fixed" again, which creates another bug.

Write: "The root cause is: [explanation]" — then fix THAT.

---

## 2-Attempt Escalation Rule

If you've tried to fix the bug twice and it's still broken:

1. **STOP coding immediately**
2. Write down what you tried and what you learned from each attempt
3. List 3 alternative approaches you haven't tried yet
4. Present all of this to the user
5. Wait for their decision before continuing

This prevents the "keep trying variations of the same broken approach" trap. If the same general method failed twice, a third attempt will almost certainly fail too. You need a fundamentally different angle.

---

## Post-Fix Checklist

After the fix is working, answer these three questions before calling it done:

- [ ] **Root cause addressed?** Does this fix solve the actual root cause, or just hide the symptom? A symptom fix means the bug WILL come back in a different form.

- [ ] **Similar patterns elsewhere?** Search the codebase for the same pattern that caused this bug. If you find it in other places, fix those too — don't wait for them to become bug reports.

- [ ] **Prevention needed?** Should a rule, skill, or checklist be updated to prevent this entire category of bug from happening again? If yes, update the relevant file in `.agent/skills/`.

# Life Operating System — Project Rules

## MANDATORY: Quality Skills System (Auto-Enforced)

This project has 13 quality skills in `.agent/skills/`. They are NOT optional documentation — they are enforced gates.

### At Session Start

1. Read `.agent/skills/skill-enforcement.md` (the trigger map)
2. Read `.agent/skills/fast-shipping-workflow.md` (session structure)
3. These load automatically — no user action needed

### Before Writing ANY Code

1. Check the trigger map to see which skills apply to the current task
2. Read those skill files BEFORE writing code
3. Follow every checklist item — do not skip any

### Trigger Quick Reference

- **Building a feature** → Read: pre-build-checklist + component-architecture
- **Building API/forms** → Read: pre-build-checklist + api-data-contract + security-checklist
- **Building UI** → Read: pre-build-checklist + component-architecture + ui-ux-quality-gate
- **Fixing a bug** → Read: debugging-protocol
- **After ANY code is done** → Run: definition-of-done ⛔ BLOCKING + testing-strategy
- **After UI code is done** → Also run: ui-ux-quality-gate
- **Deploying** → Run: deploy-confidence + performance-budget
- **Setting up CI/project** → Read: automation-gates

### Non-Negotiable Rules

- ⛔ **Definition of Done** (Skill 2) CANNOT be skipped — every feature, every time
- ⚠️ **Testing Strategy** (Skill 12) — every new feature must include tests
- Never declare work "done" without passing the DoD gates
- Always commit and push after verification passes (user checks on live deployments)

## Tech Stack

- Next.js 15 (App Router) + React 19
- Supabase (auth, database, RLS)
- Tailwind CSS + shadcn/ui
- Deployed on Vercel
- Supabase project ID: `acsbsucivuulbrkdrnqa`

## Key Conventions

- Components under 300 lines (split if larger)
- Server Components by default, 'use client' only when needed
- Zod for all validation (shared schemas in lib/schemas/)
- Never use native browser dialogs (alert, confirm, prompt)
- Never use `as` type assertions without runtime validation
- Text must be ≥ 11px and ≥ 30% opacity (visibility rule)

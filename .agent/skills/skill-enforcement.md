# Skill Enforcement — The Master Trigger Map

> This file is read FIRST at the start of every development session.
> It tells .CodePro WHICH quality skills to run WHEN.
> Location: `.agent/skills/skill-enforcement.md`

---

## TRIGGER MAP

```
═══════════════════════════════════════════════════════════════════
WHEN                         │ READ THESE SKILLS
═════════════════════════════╪═════════════════════════════════════
Session start                │ THIS FILE + Skill 6 (shipping)
Before building any feature  │ Skill 1 (pre-build) + Skill 4 (architecture)
Before building API/forms    │ Skill 1 + Skill 5 (data contract) + Skill 9 (security)
When a bug is reported       │ Skill 7 (debugging protocol)
After ANY code is complete   │ Skill 2 (Definition of Done) ⛔ BLOCKING
After UI code is complete    │ Skill 2 (DoD) ⛔ + Skill 3 (UI/UX gate)
After build/deploy           │ Skill 8 (performance budget)
Project setup / CI config    │ Skill 10 (automation gates)
═══════════════════════════════════════════════════════════════════
```

---

## ENFORCEMENT LEVELS

### ⛔ BLOCKING GATES — Cannot skip, cannot declare "done" without passing

- **Skill 2: Definition of Done** — Every feature, every time. No exceptions.

### ⚠️ MANDATORY — Must run, must acknowledge. Can note "N/A" with reason.

- **Skill 1: Pre-Build Checklist** — Before writing any feature code
- **Skill 6: Fast Shipping Workflow** — Session structure and deploy verification

### 📋 CONDITIONAL — Run only when the task type matches

- **Skill 3: UI/UX Quality Gate** — Only when UI/visual work was done
- **Skill 4: Component Architecture** — Only when creating/modifying components
- **Skill 5: API & Data Contract** — Only when building APIs, forms, or DB work
- **Skill 7: Debugging Protocol** — Only when a bug is reported
- **Skill 8: Performance Budget** — Only after significant feature builds
- **Skill 9: Security Checklist** — Only when handling auth, user data, or API routes
- **Skill 10: Automation Gates** — Only during project setup or CI configuration

---

## HOW TO USE WITH .CodePro

### During Pre-Flight (Step 4):

1. Check which task type you're about to do
2. Look at the trigger map above
3. Read the applicable "Before" skills
4. Run their checklists before writing code

### During Post-Flight (Step 6):

1. Run Skill 2 (Definition of Done) — this is BLOCKING
2. If UI work was done, also run Skill 3 (UI/UX Quality Gate)
3. Run Skill 6 deploy checklist (verify on Vercel preview)
4. Only THEN declare the task complete

### Rules:

- If a skill check **fails**, fix the issue before proceeding
- If you want to **skip** a skill, state WHY out loud — the user decides
- Skill 2 (DoD) **cannot be skipped** under any circumstances
- Prevention without enforcement is just documentation

---

## SKILL FILE LOCATIONS

```
.agent/skills/
├── skill-enforcement.md      ← YOU ARE HERE (Skill 11)
├── pre-build-checklist.md    ← Skill 1
├── definition-of-done.md     ← Skill 2 ⛔ BLOCKING
├── ui-ux-quality-gate.md     ← Skill 3
├── component-architecture.md ← Skill 4
├── api-data-contract.md      ← Skill 5
├── fast-shipping-workflow.md ← Skill 6
├── debugging-protocol.md     ← Skill 7
├── performance-budget.md     ← Skill 8
├── security-checklist.md     ← Skill 9
└── automation-gates.md       ← Skill 10
```

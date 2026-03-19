# Pre-Build Checklist

Run this checklist BEFORE writing any feature code. Every check has a YES/NO gate. If any check is NO, fix it before you start coding.

---

## 1. Requirements Clarity

**Goal:** Make sure you know exactly what you're building before you touch a single file.

- [ ] Can you describe what this feature does in ONE sentence? Write it down. If you can't, you don't understand it well enough yet.
- [ ] What is the user trying to accomplish? (Not "render a list" — think "the user wants to see all their habits for today so they can check them off.")
- [ ] What does success look like? Describe what the user sees when this feature is working perfectly.
- [ ] What does failure look like? What should happen when something goes wrong?
- [ ] Are there any edge cases the user mentioned? (Examples: "what if there are 100 items?", "what if the name is really long?")

### Write the commit message first

- Before writing any code, write the commit message for the finished feature
- If you can't describe what you're building in one sentence, you don't understand it yet
- This sentence becomes your spec, your commit message, and your verification target
- Source: Stripe's "shipped email" practice — they draft the announcement BEFORE building

**Gate:** Can you explain this feature to someone in plain English without hesitation? YES → proceed. NO → ask the user to clarify.

---

## 2. "Does This Already Exist?" Search

**Goal:** NEVER build something that already exists in the codebase. Search first, build second.

- [ ] Search the codebase for components that do something similar. Check:
  - `app/` — existing pages and layouts
  - `components/` — reusable UI pieces
  - `lib/` — utility functions, hooks, helpers
  - `actions/` — server actions
- [ ] Search for similar naming patterns (e.g., if building a "TaskCard", search for "Card", "Task", "Item").
- [ ] Check if there's an existing design pattern you should follow. Look at how similar features were built. Match the same style.
- [ ] Check if there's a shared component you can reuse instead of creating a new one (buttons, modals, forms, cards, empty states, loading skeletons).

### Concrete search patterns

- Search for similar component names: `grep -r "ComponentName" --include="*.tsx"`
- Search for similar function names: `grep -r "functionName" --include="*.ts"`
- Search for components with similar props: `grep -r "propName" --include="*.tsx"`
- Search for similar files in the same directory: `glob "src/components/**/*.tsx"`
- If you find something similar, REUSE or EXTEND it — don't create a duplicate

**Gate:** You've searched and confirmed this doesn't already exist, OR you've found existing pieces you'll reuse. YES → proceed. NO → search again.

---

## 3. Data Flow Planning

**Goal:** Know exactly where your data comes from, how it moves, and where it ends up.

- [ ] **Source:** Where does the data come from? Pick one:
  - Supabase database (which table? which columns?)
  - API endpoint (which route?)
  - URL parameters (which params?)
  - Local state only (no server involved)
  - Combination (list each source)
- [ ] **Shape:** What does the data look like? Write out the fields and their types. Example: `{ id: string, title: string, completed: boolean, created_at: date }`
- [ ] **Transform:** Does the data need to be changed before showing it? (Sorting, filtering, grouping, formatting dates, etc.)
- [ ] **Display:** How does the transformed data appear on screen? (List, grid, card, table, chart?)
- [ ] **Write-back:** Does the user change the data? If yes, how does it get saved back? (Server action, API call, optimistic update?)

Draw the flow: **Source** → **Transform** → **Display** → **User Action** → **Save Back**

**Gate:** You can trace every piece of data from its source to the screen and back. YES → proceed. NO → map it out.

---

## 4. State Management Decision

**Goal:** Pick the right tool for managing state BEFORE you start coding. Wrong choice = painful refactor later.

- [ ] **Server state or client state?**
  - Server state = data that lives in the database and needs to be fetched (use server components, server actions, or React Query)
  - Client state = temporary UI interactions like "is this dropdown open?" or "what did the user type?" (use useState)
- [ ] **How many pieces of state will this component need?**
  - 1-3 useState calls → fine, keep it simple
  - 4+ useState calls → STOP. Plan a custom hook or useReducer before coding. Too many useState calls make bugs invisible.
- [ ] **Does this state need to be shared between components?**
  - No → keep it local in the component
  - Yes, parent-child → pass as props
  - Yes, across distant components → use context or a shared hook
- [ ] **Does data need to stay fresh?** (Real-time updates, polling, revalidation?)

**Gate:** You've decided on your state strategy and it's written down. YES → proceed. NO → decide now.

---

## 5. DB Contract Verification

**Goal:** If this feature writes to the database, make sure every form field matches what the database expects. Mismatches cause silent failures.

- [ ] Open `lib/db/schema.ts` and find the relevant table.
- [ ] List every form field this feature will send to the database.
- [ ] For EACH field, verify:
  - The column exists in the database
  - The type matches (string → text/varchar, number → integer/float, true/false → boolean, date → timestamp)
  - Required fields are marked as required in the form
  - Optional fields have proper defaults or null handling
  - Text length limits match (if DB has varchar(255), form should enforce max 255 characters)
  - Enum/allowed values match (if DB only allows "low", "medium", "high" — the form should only offer those options)
- [ ] Check foreign keys — if the form references another table (like user_id or project_id), make sure those IDs are valid.

### TypeScript interface mapping

- Write the EXACT TypeScript interface for the data your form will send:
  ```typescript
  interface CheckinData {
    mood: number; // DB: mood smallint CHECK (1-5)
    energy: number; // DB: energy smallint CHECK (1-5)
    notes: string; // DB: notes text, nullable
  }
  ```
- For each field, write the DB column name, type, and constraints next to it
- If they don't match → fix BEFORE writing any code
- This would have prevented the boolean→numeric mismatch bug

**Gate:** Every form field has a verified matching database column with correct types and constraints. YES → proceed. NO → fix the mismatch.

---

## 6. Component Boundaries

**Goal:** Keep components small and focused. A component that does too much is a component that breaks in confusing ways.

- [ ] Will this component be under 200 lines of code? If not, plan the split NOW before you start.
- [ ] Can you describe what this component does in ONE sentence? If you need "and" more than once, it's doing too much. Split it.
- [ ] Write the file tree before coding. Example:
  ```
  components/habits/
    HabitList.tsx        — shows all habits for today
    HabitCard.tsx        — single habit with checkbox
    HabitForm.tsx        — add/edit habit form
    HabitEmptyState.tsx  — what shows when no habits exist
  ```
- [ ] Each component should have ONE job. Fetching data and displaying it are TWO jobs — consider splitting them.
- [ ] Hard limit: if a component hits 300 lines, it MUST be split. No exceptions.

**Gate:** You have a file tree written out and every component can be described in one sentence. YES → proceed. NO → plan the split.

---

## 7. State Machine Diagram

**Goal:** Before coding, map out every possible state the user could see. This prevents "I forgot to handle the loading state" bugs.

You MUST cover ALL 9 states. This is a required step, not a mental note.

- [ ] **Happy path** — Everything works. Data loads, user sees the content.
- [ ] **Loading** — Data is being fetched. User sees a skeleton or spinner.
- [ ] **Error** — Something went wrong. User sees a friendly error message with a retry button.
- [ ] **Empty** — No data exists yet. User sees a helpful empty state ("No habits yet. Create your first one!")
- [ ] **Partial data** — Some data loaded, some failed. Show what you have, indicate what's missing.
- [ ] **Stale data** — Data might be outdated. Show it but indicate it's refreshing.
- [ ] **Long content** — Text is very long, names are 200 characters. Does the layout break? Truncate or wrap.
- [ ] **Many items** — What happens with 100+ items? Pagination, virtual scrolling, or "show more"?
- [ ] **Offline** — Network is down. Show cached data or a clear offline message.

### Map the transitions, not just the states

- Don't just LIST the states — MAP the transitions between them
- For each state, answer: "What event moves the user to the NEXT state?"
- Draw the arrows, not just the boxes
- Example: Loading → (success) → Happy Path, Loading → (timeout) → Error, Loading → (empty response) → Empty State
- Ask: "What happens if the user clicks Back during loading? What happens if the network drops?"
- This is what prevents the "AI auto-concluding" and "AI auto-scrolling" bugs — those were missing transitions

Write the transitions:

```
idle → loading → success (show data)
                → error (show message + retry)
                → empty (show empty state)
```

**Gate:** All 9 states are documented with what the user sees in each one. YES → proceed. NO → document them.

---

## 8. Rendering Strategy

**Goal:** Pick the right rendering approach. Wrong choice = slow pages or broken interactivity.

- [ ] **Does this component need interactivity?** (Click handlers, form inputs, hover effects, animations)
  - NO → Use a server component (default). Faster, less JavaScript sent to the browser.
  - YES → Use a client component (add "use client" at the top).
- [ ] **Does this page need fresh data on every visit?**
  - YES → Server component with dynamic rendering (no caching)
  - NO → Server component with static rendering or ISR (cached, rebuilds periodically)
- [ ] **Is this a form or interactive widget inside a mostly-static page?**
  - YES → Keep the page as a server component, make ONLY the interactive part a client component. Don't make the whole page "use client".
- [ ] **Does this need real-time updates?** (Live data, WebSocket, Supabase realtime)
  - YES → Client component with subscription

**Gate:** You've chosen server or client component for each piece and can explain why. YES → proceed. NO → decide now.

---

## Final Check

Before writing any code, read through all 8 sections above. If every gate is YES, you're ready to build. If any gate is NO, fix it first. Skipping this checklist leads to rewrites, bugs, and wasted time.

**Remember:** 30 minutes of planning saves 3 hours of debugging.

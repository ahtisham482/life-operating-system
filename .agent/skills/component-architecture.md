# Skill 4: Component Architecture

Run this checklist when creating or modifying React components. The goal: every component should be small enough to understand in under 60 seconds.

---

## 1. Proactive File Tree

BEFORE building any component, write out the planned file tree. This forces you to think about structure before you start coding.

### The one-sentence test

If you can't describe what a component does in ONE sentence, it's too complex. Split it.

**Good examples:**

- "HabitCard displays a single habit with its completion status and action menu"
- "KanbanColumn renders a list of cards for one status and handles drop targets"
- "TemplatePickerModal lets the user choose a habit template from a categorized list"

**Bad examples (too much responsibility):**

- "HabitTracker manages groups, habits, forms, drag-drop, templates, and interviews" — this is 6+ components crammed into one
- "DashboardPage handles layout, data fetching, filtering, charts, and settings" — split these into separate concerns

### File tree format

Before writing code, present something like this:

```
habits/
  habit-card.tsx          — displays one habit
  habit-card-menu.tsx     — context menu for a habit card
  habit-group.tsx         — displays a group of habits
  habit-form.tsx          — form for creating/editing a habit
  use-habit-form.ts       — form state and validation logic
  use-habit-mutations.ts  — create/update/delete API calls
```

---

## 2. File Size Limits

These are hard rules, not suggestions.

| Lines | Action                                                       |
| ----- | ------------------------------------------------------------ |
| < 200 | You're fine. Keep going.                                     |
| 200   | WARNING: Start looking for things to extract.                |
| 300   | MUST SPLIT. No exceptions. Find the seam and break it apart. |

### Why this matters

Our worst file right now: `habit-tracker.tsx` at 2,130 lines with 31 useState calls. Nobody can understand it. Nobody can safely modify it. Every change risks breaking something unrelated. Don't create more files like this.

### How to split

When a file hits 200 lines, look for these natural seams:

- A group of related useState + handlers = extract to a custom hook
- A chunk of JSX that could have its own name = extract to a child component
- Utility functions = move to a separate utils file
- Type definitions = move to a types file

Each piece you extract should be independently understandable — someone reading just that file should know what it does.

---

## 3. useState Trigger Rule

Count your useState calls BEFORE writing them. The number tells you what pattern to use.

| Count | What to do                                                                                  |
| ----- | ------------------------------------------------------------------------------------------- |
| 1-4   | Fine. Use useState normally.                                                                |
| 5-7   | Extract related states into a custom hook.                                                  |
| 8+    | STOP. You need useReducer or a state machine. This is a design problem, not a code problem. |

### Extracting to a custom hook (5-7 states)

Group related states together. Ask: "Which states always change together?"

```typescript
// BEFORE: 6 scattered useState calls in the component
const [name, setName] = useState("");
const [description, setDescription] = useState("");
const [frequency, setFrequency] = useState("daily");
const [color, setColor] = useState("blue");
const [errors, setErrors] = useState({});
const [isSubmitting, setIsSubmitting] = useState(false);

// AFTER: one custom hook that owns all form state
const { formData, errors, isSubmitting, updateField, submit } = useHabitForm();
```

### Naming custom hooks

- Start with `use`
- Describe WHAT the hook manages, not WHERE it's used
- Good: `useHabitForm`, `useKanbanDrag`, `useModalState`
- Bad: `useHabitCardStuff`, `useComponentLogic`, `useHelpers`

---

## 4. Single Responsibility

One component = one job. That's it.

### Warning signs you're violating this

- Component handles both data fetching AND rendering
- Component has multiple unrelated groups of useState (form state + list state + modal state)
- Component name includes "And" (like "HeaderAndSidebar")
- You need to scroll through hundreds of lines to find the part you want to change
- A change to one feature breaks an unrelated feature in the same component

### How to fix it

**Pattern 1: Container + Presenter**

```
HabitListContainer.tsx  — fetches data, handles loading/error
HabitList.tsx           — receives data as props, renders the list
```

**Pattern 2: Parent + Children**

```
HabitTracker.tsx        — orchestrates the overall layout
  HabitGroups.tsx       — renders the list of groups
  HabitForm.tsx         — handles creating new habits
  HabitFilters.tsx      — handles filter controls
```

---

## 5. Custom Hook Extraction

Complex logic belongs in hooks, not components. A component should mainly be about rendering.

### What to extract

- **Data fetching**: API calls, loading states, error handling, refetching
- **Form handling**: validation, field state, submission, reset
- **Animation state**: open/close, transition phases
- **Drag-and-drop logic**: drag state, drop targets, reorder calculations
- **Keyboard shortcuts**: key listeners, action mapping

### File naming

Hook files use kebab-case with the `use-` prefix:

```
use-habit-form.ts
use-kanban-drag.ts
use-keyboard-shortcuts.ts
use-auto-save.ts
```

### Rules

- Each hook should be testable in isolation (you should be able to write a test for the hook without rendering any component)
- A hook should not know about JSX — it manages logic and returns data/functions. The component decides how to render.
- If a hook is only used by one component and is under 30 lines, it can live in the same file. Otherwise, give it its own file.

---

## 6. Prop Drilling Prevention

How deep are you passing props? The depth tells you which pattern to use.

| Depth           | Pattern                                                                  |
| --------------- | ------------------------------------------------------------------------ |
| 1-2 levels      | Props are fine. Simple, explicit, easy to trace.                         |
| 3+ levels       | Use React Context. Create a provider near the top, consume where needed. |
| Many components | Use Zustand for lightweight global state.                                |
| Server data     | Use React Server Components — no client state needed at all.             |

### When to use each

- **Props**: Parent passes data to direct child. Simple. Predictable.
- **Context**: A group of related components all need the same data (like theme, current user, or a form's state).
- **Zustand**: Multiple unrelated parts of the app need the same data (like a global notification count or user preferences).
- **Server Components**: Data that comes from the database and doesn't change on the client. Fetch it on the server, pass it down. No useState, no useEffect, no loading spinners.

---

## 7. Code Organization Within Files

Follow this order inside every component file. Consistency makes files scannable.

```
1. Imports
   - External packages (react, next, third-party libraries)
   - Internal modules (your own components, hooks, utils)
   - Types

2. Types and interfaces
   - Props type for the component
   - Any other types used in this file

3. Constants
   - Static values that don't change
   - Configuration objects

4. Small custom hooks (if file-local and under 30 lines)

5. Component function
   a. Hooks (useState, useEffect, custom hooks)
   b. Derived values (useMemo, computed values)
   c. Event handlers
   d. Effects (useEffect)
   e. Early returns (loading state, error state, empty state)
   f. Main render (return statement)

6. Default export
```

### Why this order

When someone opens a file, they read top to bottom. This order answers their questions in the right sequence:

1. "What does this depend on?" (imports)
2. "What shape is the data?" (types)
3. "What are the fixed values?" (constants)
4. "What does this component do?" (hooks, handlers, render)

---

## 8. When NOT to Split

Splitting is usually good, but you can over-do it. Don't split when:

- **Things that change together should stay together.** If two pieces of state/logic ALWAYS change at the same time, keeping them in separate files means every change requires editing two files. That's worse, not better.
- **Don't create a file for a tiny helper.** A 10-line utility function used only in one component can live in that component's file. Don't create `utils/format-habit-date.ts` for a one-liner.
- **Don't over-abstract.** If extracting a component makes the code HARDER to understand (because now you have to jump between 4 files to understand one screen), you've gone too far. The goal is clarity, not small files for their own sake.
- **Don't split prematurely.** If a component is under 100 lines and easy to read, leave it alone. Split when complexity demands it, not because a rule says you should.

### The test

After splitting, ask: "Is this easier to understand now?" If the answer is no, undo the split.

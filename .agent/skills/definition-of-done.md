# Definition of Done

This is a BLOCKING gate. You CANNOT declare ANY feature "done" without passing ALL gates below. If any gate is FAIL, fix the issue first.

Mark each gate as PASS or FAIL. ALL must be PASS.

---

## Gate 1: Functionality

Does the feature actually work?

- [ ] **Happy path works end-to-end.** The main thing the feature is supposed to do — does it work from start to finish? Click through it like a user would.
- [ ] **Error states are handled.** When the API fails, the database is down, or something unexpected happens — does the user see a friendly message? NOT a crash, NOT a blank screen, NOT a raw error code. Example: "Something went wrong. Try again." with a retry button.
- [ ] **Empty states are handled.** When there's no data yet (new user, empty list, no results) — does the user see something helpful? NOT a blank white space. Example: "No habits yet. Create your first one!" with a button.
- [ ] **Loading states are implemented.** While data is loading — does the user see a skeleton, spinner, or shimmer? NOT a blank screen that suddenly pops in content. The user should never wonder "is this broken or just loading?"
- [ ] **Edge cases are handled:**
  - Very long text (200+ characters in a name or description) — does it truncate or wrap cleanly?
  - Many items (50+ items in a list) — does it paginate, scroll, or show "load more"?
  - Missing optional fields — does the UI handle null/undefined gracefully?
  - Rapid clicking — does double-clicking a submit button send two requests? (It shouldn't.)

**Gate 1:** PASS / FAIL

---

## Gate 2: UI/UX

Does it look right and feel good to use?

- [ ] **All text is readable.** Minimum 11px font-size. Minimum 30% opacity. NEVER invisible micro-text. If you have to squint, it fails.
- [ ] **No z-index conflicts.** Modals appear above everything. Dropdowns appear above content but below modals. Nothing is hidden behind something else unexpectedly.
- [ ] **No content overflow.** Long text does not break the layout. It either truncates with "..." or wraps to the next line. Horizontal scrollbars on the main page = automatic FAIL.
- [ ] **All clickable elements have states:**
  - Hover state (subtle color change or underline)
  - Focus state (visible outline for keyboard users)
  - Active/pressed state (slight scale or color shift)
  - Disabled state (grayed out, cursor not-allowed)
- [ ] **Responsive design works on all screen sizes:**
  - Mobile (375px wide) — everything fits, no horizontal scroll, tap targets are large enough (at least 44px)
  - Tablet (768px wide) — layout adjusts, no wasted space
  - Desktop (1440px wide) — content doesn't stretch edge-to-edge on wide screens
- [ ] **Dark mode works correctly:**
  - Text has enough contrast against dark backgrounds
  - No elements that are invisible on dark backgrounds (dark text on dark bg, dark borders on dark bg)
  - Icons and illustrations are visible in both modes
  - Form inputs have visible borders in dark mode

**Gate 2:** PASS / FAIL

---

## Gate 3: Code Quality

Is the code clean and maintainable?

- [ ] **No `any` TypeScript types.** Every variable, function parameter, and return value has a proper type. `any` hides bugs — find the real type and use it.
- [ ] **No `as` type assertions without runtime validation.** If you're casting a type with `as`, add a runtime check to make sure the data actually matches. Otherwise you're lying to TypeScript and bugs will sneak through.
- [ ] **Components are under 200 lines.** If a component is over 200 lines, split it. If it's over 300 lines, this is an automatic FAIL — it MUST be split before declaring done.
- [ ] **No hardcoded values.** Colors, sizes, spacing, API URLs, magic numbers — all should come from:
  - Tailwind design tokens (for colors, spacing, sizes)
  - Constants files (for business logic values)
  - Environment variables (for URLs, keys, config)
- [ ] **No native browser dialogs.** Never use `alert()`, `confirm()`, or `prompt()`. Always use app-styled modals or toast notifications that match the rest of the design.
- [ ] **No commented-out code left behind.** If code is commented out, delete it. Git remembers everything — you can always get it back. Commented code confuses future readers.

**Gate 3:** PASS / FAIL

---

## Gate 4: User Control

Does the user feel in control? Or does the app do things without asking?

- [ ] **User controls all finalizing actions.** The user clicks "Save", "Submit", "Delete", "Send". The app NEVER does these automatically.
- [ ] **AI features provide options, user decides.** If the app uses AI to suggest things, it shows suggestions as options — the user picks one. Never auto-apply AI suggestions without asking.
- [ ] **No auto-scrolling.** The user controls where they are on the page. The app never yanks the scroll position without the user's action.
- [ ] **No auto-submitting.** Forms wait for the user to click submit. Never send data automatically when a field changes (unless it's an explicit auto-save feature the user opted into).
- [ ] **Forms preserve input on error.** If a form submission fails, the user's input is still there when they come back. NEVER clear the form on error — that's punishing the user for a system failure.

**Gate 4:** PASS / FAIL

---

## Gate 5: Data

Is the data flowing correctly and safely?

- [ ] **DB column types match form data.** Every field the form sends matches the database column type exactly:
  - Strings go to text/varchar columns
  - Numbers go to integer/float columns
  - Booleans go to boolean columns
  - Dates go to timestamp/date columns
  - Check `lib/db/schema.ts` to verify
- [ ] **API validates all input.** Every piece of data coming from the user is checked before being saved:
  - Required fields are actually present
  - Types are correct (number is actually a number, not a string)
  - Length limits are enforced (don't let someone submit a 10,000 character title)
  - Values are within allowed ranges (status must be "active" or "inactive", not "banana")
- [ ] **Error messages are specific.** NOT "Error occurred" or "Something went wrong." Instead:
  - "Email is required"
  - "Title must be under 100 characters"
  - "Could not save — please check your connection and try again"
- [ ] **Optimistic UI rolls back on failure.** If the UI updates immediately before the server confirms (optimistic update), it MUST undo that change if the server request fails. The user should see the data go back to its previous state with an error message.

**Gate 5:** PASS / FAIL

---

## Gate 6: Build

Does it build and run without errors?

- [ ] **`next build` passes with zero errors.** Run the build. If it fails, fix every error. Warnings are acceptable but errors are not.
- [ ] **Zero console errors in the browser.** Open the browser dev tools console. There should be no red errors. Warnings are acceptable but errors mean something is broken.
- [ ] **No TypeScript errors.** Run the TypeScript checker. Every type error must be fixed — not silenced with `@ts-ignore` or `any`.

**Gate 6:** PASS / FAIL

---

## Gate 7: Screenshot

Would a real user understand this feature at a glance?

- [ ] **Describe what the feature looks like when working.** Write 2-3 sentences about what appears on screen. Example: "The habits page shows a list of today's habits as cards. Each card has the habit name, a colored category tag, and a checkbox. Completed habits are visually dimmed."
- [ ] **Would a user find the important elements without being told where to look?** Buttons should be obvious. Data should be prominent. Actions should be clearly labeled. If a user would need instructions to find the main feature — the UI is not visible enough.
- [ ] **If the answer to the above is "probably not" — the UI needs to be more visible.** Increase font sizes, add color contrast, make buttons larger, add labels to icons. The user should never have to hunt for the thing they came to this page to do.

**Gate 7:** PASS / FAIL

---

## Final Verdict

Count your gates:

- Gate 1 (Functionality): \_\_\_
- Gate 2 (UI/UX): \_\_\_
- Gate 3 (Code Quality): \_\_\_
- Gate 4 (User Control): \_\_\_
- Gate 5 (Data): \_\_\_
- Gate 6 (Build): \_\_\_
- Gate 7 (Screenshot): \_\_\_

**ALL 7 gates must be PASS to declare this feature done.**

If ANY gate is FAIL → fix the failing items → re-check → only then mark as done.

No exceptions. No "we'll fix it later." Fix it now.

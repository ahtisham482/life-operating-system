# Skill 5 — API & Data Contract

Run this checklist when building APIs, forms, or doing any database work.

---

## 1. Input Validation (Every API Route)

- Use a Zod schema to validate ALL incoming data — no exceptions.
- Validate these things for every field:
  - Is it required or optional?
  - What type is it? (string, number, boolean, array, etc.)
  - What are the limits? (max length, min value, allowed values)
- Example:
  - `taskName` must be a string, between 1 and 500 characters, required.
  - `priority` must be one of `["low", "medium", "high", "urgent"]`.
- Return specific error messages that tell the user what went wrong:
  - Good: `"taskName must be between 1 and 500 characters"`
  - Bad: `"Invalid input"`
- NEVER trust client-side validation alone — always validate on the server too. Client validation is for user experience; server validation is for safety.

---

## 2. DB Contract Verification

Before changing ANY form field, open `lib/db/schema.ts` and verify:

- The column type matches what the form sends (string goes to text, number goes to integer, boolean goes to boolean).
- The column constraints match (NOT NULL, CHECK, DEFAULT, UNIQUE).
- The allowed values match — if the database has an enum or CHECK constraint, the form must only send values that are in that list.

Before changing ANY database column, find ALL forms and API routes that touch it. Verify they still work after the change.

Reference file: `lib/db/schema.ts` (389 lines, 40+ tables). This is the source of truth for what the database expects.

---

## 3. Migration Safety

- NEVER run ALTER TABLE without a rollback plan.
- NEVER change column types without checking every form and API route that reads or writes that column.
- Migration steps (follow in order):
  1. Find all code that uses this column (search the whole codebase).
  2. Plan the type change and how existing data will convert.
  3. Update all code that touches the column.
  4. Run the migration.
  5. Verify everything still works.
- When converting data types, add a USING clause so existing data converts correctly:
  ```sql
  ALTER COLUMN col TYPE smallint USING CASE WHEN col THEN 5 ELSE 1 END
  ```

---

## 4. Seed Data

- Every table should have seed/test data so you can catch empty-state bugs during development.
- Create seed scripts or use the Supabase dashboard to add test rows.
- Test with these scenarios:
  - 0 rows (empty state — does the page look right?)
  - 1 row (singular — does text say "1 items" or "1 item"?)
  - 50+ rows (bulk — does it scroll, paginate, or break?)
  - Rows with very long text (does the layout overflow?)
  - Rows with NULL in optional fields (does it crash or show "undefined"?)

---

## 5. Error Handling Pattern

Every API route follows this pattern:

```
1. Auth check    — Who is making this request?
2. Input validation — Is the data valid?
3. Execute logic — Do the thing.
4. Return structured response.
```

Response format:

```
Success: { success: true, data: {...} }
Error:   { success: false, error: "Specific message", details: {...} }
```

NEVER return a generic "Internal server error" — always include enough detail to debug. The error message should tell you (or the user) what went wrong and where to look.

---

## 6. Type Safety Rules

- NEVER use `as` type assertion without runtime validation backing it up.
  - Bad: `const task = data as Task` — this might crash if `data` is the wrong shape. TypeScript won't catch it because you told it to trust you.
  - Good: `const parsed = TaskSchema.parse(data)` — Zod validates at runtime, so you know the data is actually the right shape.
- NEVER use `any` type — use `unknown` and narrow with type guards.
  - `any` turns off TypeScript's protection. `unknown` keeps it on but lets you check the type before using it.
- Count the `as` assertions in your code — each one is a potential runtime crash waiting to happen.

---

## 7. API Route Pattern

```
auth -> validate -> execute -> respond
```

- **Auth**: `const { data: { user } } = await supabase.auth.getUser()` — always do this first. No anonymous access unless the route is explicitly public.
- **Validate**: Zod parse the request body. If validation fails, return 400 with specific error messages.
- **Execute**: Database operations, business logic, external API calls.
- **Respond**: Structured JSON response with the correct HTTP status code:
  - 200 — Success (GET, PUT, PATCH)
  - 201 — Created (POST that creates something)
  - 400 — Bad request (validation failed, missing fields)
  - 401 — Unauthorized (not logged in)
  - 404 — Not found (resource doesn't exist)
  - 500 — Server error (something broke on our end)

---

## 8. Environment Safety

- Check that required environment variables exist BEFORE using them.
- Use this pattern: `process.env.VAR_NAME ?? throw new Error("Missing VAR_NAME")` — fail loudly at startup, not silently at runtime.
- NEVER expose server environment variables to the client. Only variables prefixed with `NEXT_PUBLIC_` are safe to use in browser code.
- Keep sensitive keys (database passwords, API secrets) in `.env.local` which is NOT committed to git. If you see a secret in the git history, rotate it immediately.

---

## 9. Optimistic UI

- Update the UI immediately when the user takes an action, then sync with the server in the background.
- If the server request fails: rollback the UI to its previous state and show an error message. The user should never be left looking at fake data.
- Prevent race conditions:
  - Disable the button while the async operation is running, OR
  - Use a request queue so actions happen in order.
- Never leave the UI in an inconsistent state after a failed network request. If you showed a success state but the server said "no," undo it.

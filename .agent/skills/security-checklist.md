# Skill 9 — Security Checklist

**When to run:** When building API routes, handling user data, or touching authentication logic.

---

## 1. Authentication First

Every API route must start by checking who is making the request.

```ts
const {
  data: { user },
} = await supabase.auth.getUser();
if (!user) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

- This check goes at the TOP of every route handler, before any other logic
- If there's no authenticated user, return 401 immediately
- Never assume a request is coming from a logged-in user — always verify

---

## 2. User Data Scoping

Every database query must be limited to the current user's data. A user should never be able to see or modify another user's data.

**Primary defense: Supabase Row Level Security (RLS)**

- RLS policies on every table ensure the database itself enforces access rules
- Even if your application code has a bug, RLS prevents data leaks

**Backup defense: Explicit filtering**

- Add `WHERE user_id = ?` (or `.eq("user_id", user.id)`) to every query
- This is a safety net in case RLS is misconfigured

**Known issue:** The tasks table is currently missing a `user_id` column — this needs to be added to properly scope task data per user.

---

## 3. Input Sanitization

Never trust user input. Treat everything from the user as potentially dangerous.

- **XSS (Cross-Site Scripting):** Never insert user input directly into HTML. React auto-escapes JSX content, which handles most cases automatically.
- **dangerouslySetInnerHTML:** This bypasses React's auto-escaping. NEVER use it with user-provided content. If you must render HTML, sanitize it first with a library like DOMPurify.
- **Server-side validation:** Validate and sanitize all form inputs on the server, not just the client. Client-side validation is for user experience; server-side validation is for security. A user can bypass client-side checks.

---

## 4. Environment Variables

Secrets and configuration must be handled carefully to avoid leaking them.

- **Only `NEXT_PUBLIC_` variables go to the browser.** Everything else stays on the server only.
- **Sensitive keys that must NEVER have the `NEXT_PUBLIC_` prefix:**
  - `GROQ_API_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - Any password, token, or secret
- **Storage:** Keep all environment variables in `.env.local`, which is gitignored by default.
- **Verification:** If you're unsure whether a variable is exposed to the client, check the Next.js build output or search for it in the browser's network tab.

---

## 5. CORS and Headers

- **API routes:** Set appropriate CORS headers to only allow requests from your own domain
- **HTTPS:** Always use HTTPS. Vercel handles this automatically for deployed apps.
- **Security headers to set:**
  - `X-Content-Type-Options: nosniff` — prevents browsers from guessing content types
  - `X-Frame-Options: DENY` — prevents your site from being embedded in iframes (clickjacking protection)

---

## 6. No Secrets in Code

This is a hard rule with no exceptions.

- NEVER hardcode API keys, passwords, or tokens in source code — not even "temporarily"
- NEVER commit `.env` files to git (must be listed in `.gitignore`)
- Use environment variables for ALL configuration that varies between environments
- If you see a hardcoded secret in the codebase, treat it as compromised and rotate it immediately

---

## 7. Rate Limiting

Unprotected endpoints can be abused by bots or attackers.

- **Public API routes** (anything accessible without login) should have rate limiting to prevent abuse
- **Cron endpoints:** Always verify the `CRON_SECRET` header before executing. Without this check, anyone can trigger your scheduled jobs by hitting the URL.

```ts
// Cron route protection
if (
  request.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`
) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

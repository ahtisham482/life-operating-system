# Skill 13 — Deploy Confidence

> **When to run:** Before every push and after every deployment.
> **Enforcement:** CONDITIONAL — required when deploying to production.

---

## 1. Pre-Push Checklist

Before pushing any code, run through this list. Every item must pass.

- [ ] `next build` passes with zero errors (warnings are OK, errors are not)
- [ ] `tsc --noEmit` passes with zero type errors (TypeScript must be happy)
- [ ] No `console.error` in browser dev tools (open the console, check for red)
- [ ] No red errors in the terminal where your dev server is running
- [ ] All environment variables are present — nothing missing, nothing empty
- [ ] Tests pass (see Skill 12 — Testing Strategy)

**Gate:** Do ALL checks above pass? YES → push. NO → fix every failure first. Never push broken code.

---

## 2. Post-Push Verification

After pushing, check these within 5 minutes. Don't move on to the next task until verified.

- [ ] Open the Vercel preview URL (find it in the Vercel dashboard or GitHub PR)
- [ ] Test the happy path end-to-end — does the main feature work as expected?
- [ ] Open in an incognito/private window — no cached state, no lingering login sessions
- [ ] Resize to mobile width (375px) — does everything still work and look right?
- [ ] Open browser console — any JavaScript errors? (Red entries = problem)
- [ ] Open network tab — any failed API requests? (Red entries = problem)

**Gate:** Does the deployed preview work correctly across all checks? YES → proceed. NO → fix immediately before starting anything else.

---

## 3. Production Monitoring

Set up error tracking so you KNOW when things break — don't wait for users to tell you.

- **Sentry** — catches JavaScript errors and slow pages automatically
  - Install: `npm install @sentry/nextjs`
  - Configure in `instrumentation.ts` (Next.js 15 integration point)
  - Enable source maps so error traces show your real code, not minified gibberish
  - Set `tracesSampleRate: 0.1` — captures 10% of page loads for performance data (enough to spot trends without noise)
- **Alerting** — get notified before users complain
  - Slack alert when more than 5 errors happen in 5 minutes
  - Email alert for any unhandled exception (the app crashed for someone)
  - Check the Sentry dashboard at the start of each work session

**Gate:** Is error monitoring configured and sending alerts? YES → proceed. NO → set it up before the next production deploy.

---

## 4. Rollback Plan

When something breaks in production, speed matters. Know your options BEFORE you need them.

- **Quick rollback (30 seconds):** In the Vercel dashboard, find the previous working deployment and click "Promote to Production." Instant. No code changes needed.
- **Code rollback (2 minutes):** Run `git revert HEAD` then push. Vercel auto-deploys the revert. Use this when you need to undo the code change itself.
- **Database rollback:** Use Supabase Point-in-Time Recovery (PITR) to restore to any specific second. This is your safety net for data problems.
- **Before any risky change:** Write down the current commit hash. This is your "safe point" — you can always come back to it.
- **The 30-minute rule:** If a fix is taking more than 30 minutes, stop trying to fix forward. Rollback first, then fix properly with a clear head.

---

## 5. Database Backup Strategy

Your data is irreplaceable. Code can be rewritten. Data cannot.

- [ ] **Supabase daily backups** — enabled by default on Pro plan (keeps 7 days of backups)
- [ ] **PITR (Point-in-Time Recovery)** — lets you recover to any specific second. Enable this if losing more than 4 hours of data is unacceptable.
- [ ] **Before destructive migrations** — always run `supabase db dump` first. This creates a full snapshot you can restore from.
- [ ] **Test your backups** — restore to a branch database once per quarter. A backup you've never tested is not a backup.
- [ ] **Free tier protection** — Supabase free tier has limited backup retention. Manually dump with `supabase db dump --file backup-YYYY-MM-DD.sql` on a regular schedule.

**Gate:** Is there a backup strategy in place for the current Supabase project? YES → proceed. NO → configure backups before the next production deploy.

---

## 6. Feature Flags (Simple Version)

Ship new features safely by hiding them behind on/off switches. No fancy tools needed.

- Use environment variables as boolean flags: `NEXT_PUBLIC_FEATURE_NEW_DASHBOARD=true`
- Wrap new features in a simple check: `if (process.env.NEXT_PUBLIC_FEATURE_NEW_DASHBOARD === 'true') { ... }`
- Start with the flag OFF (disabled) in production
- Test on Vercel preview deployments with the flag ON
- Once confident, flip it ON in production
- Remove the flag after the feature is stable — max 2 weeks. Dead flags are clutter.
- Never leave old flags in the codebase. If a feature shipped 2 weeks ago and is stable, remove the flag and the conditional check.

---

## 7. Environment Variables Audit

Before every production deploy, verify your environment variables match up.

- [ ] Compare local `.env.local` against Vercel environment variables — every variable that exists locally MUST exist in Vercel (or be intentionally excluded)
- [ ] No secrets start with `NEXT_PUBLIC_` — this prefix exposes the value to the browser. API keys, service role keys, and passwords must NEVER use this prefix.
- [ ] Service role keys are NEVER in client-side code — these bypass Row Level Security and give full database access. Keep them server-side only.
- [ ] All required variables have actual values — no empty strings, no placeholder text like "your-key-here"
- [ ] Sensitive values are different between environments — your production Supabase URL should NOT be the same as your development one

**Gate:** Do all environment variables pass the audit above? YES → deploy. NO → fix every mismatch first.

---

## 8. Vercel Configuration

Harden your production deployment so it's secure and observable.

- [ ] **Deployment Protection** — require authentication to access preview deployments (keeps unfinished work private)
- [ ] **WAF (Web Application Firewall)** — enable rate limiting at 20 requests per second per IP (prevents abuse and bots)
- [ ] **Log Drains** — persist deployment logs beyond 24 hours by streaming to Datadog, Axiom, or similar (Vercel logs disappear after 24h by default)
- [ ] **Custom domains** — verify SSL certificate is active and auto-renewing (expired SSL = your site shows a scary browser warning)
- [ ] **Build settings** — confirm the build command is `next build` and the output directory is correct

**Cross-references:** See Skill 12 (Testing Strategy) for test requirements before deploy. See Skill 5 (Definition of Done) Gate 6 for build verification. See Skill 9 (Security Checklist) for authentication and data protection checks.

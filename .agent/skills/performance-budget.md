# Skill 8 — Performance Budget

**When to run:** After building or modifying any feature. Check these budgets before pushing.

---

## Hard Budgets

These are non-negotiable limits. If any are exceeded, investigate and fix before shipping.

| Metric                          | Budget            | How to Check                                |
| ------------------------------- | ----------------- | ------------------------------------------- |
| JavaScript bundle               | < 200KB per route | `next build` output → "Route (app)" section |
| Largest Contentful Paint (LCP)  | < 2.5 seconds     | Lighthouse or Chrome DevTools               |
| Cumulative Layout Shift (CLS)   | < 0.1             | Lighthouse or Chrome DevTools               |
| Interaction to Next Paint (INP) | ≤ 200ms           | Lighthouse or Chrome DevTools               |

> **Note:** FID (First Input Delay) is deprecated as of March 2024. INP is its replacement and is now a Core Web Vital that Google uses for search ranking. Unlike FID which only measured the FIRST interaction, INP measures ALL interactions (clicks, taps, key presses) throughout the entire page visit.

---

## Route Size Checking

After every `next build`, look at the route sizes in the output table.

- Any route over **150KB** → investigate what's making it heavy
- Use `@next/bundle-analyzer` to see exactly what's in the bundle
- Common culprits: importing an entire library when you only need one function, including large icons packs, bundling server-only code into the client

---

## Dynamic Imports (Code Splitting)

Not everything needs to load on the first page visit. Heavy stuff should load only when needed.

**Must use `dynamic(() => import(...))` for:**

- Chart libraries and data visualization components
- Rich text editors and code editors
- Complex modals that aren't visible on initial page load
- Any third-party library larger than 50KB

```tsx
// GOOD: loads only when needed
const HeavyChart = dynamic(() => import("@/components/Chart"), {
  loading: () => <ChartSkeleton />,
});

// BAD: loads immediately even if user never sees it
import HeavyChart from "@/components/Chart";
```

---

## Re-Render Prevention

Unnecessary re-renders make the app feel sluggish. Watch for these patterns:

- **`useMemo`** — wrap expensive calculations so they don't re-run on every render
- **`useCallback`** — wrap functions passed as props so child components don't re-render unnecessarily
- **`React.memo`** — wrap components that receive the same props frequently

**Common trap to avoid:** Creating object or array literals directly in JSX props. This creates a new reference every render, which defeats React.memo.

```tsx
// BAD: new object every render
<Component style={{ color: "red" }} />;

// GOOD: stable reference
const style = useMemo(() => ({ color: "red" }), []);
<Component style={style} />;
```

---

## Virtualization

If a list has more than 50 items, don't render all of them at once.

- Use `react-window` or `react-virtualized` to only render the items currently visible on screen
- A list of 500 items should create ~10-15 DOM nodes, not 500
- This makes a massive difference on mobile devices and lower-powered machines

---

## Image Optimization

- **Always** use the `next/image` component, never a raw `<img>` tag
- Define explicit `width` and `height` props — this prevents layout shift (CLS) while images load
- Use the `priority` prop for images visible above the fold (hero images, logos)
- Use appropriate formats: WebP or AVIF for photos, SVG for icons and simple graphics

---

## Database Query Efficiency

Slow queries make everything feel slow, no matter how optimized the frontend is.

- **Select only what you need:** `.select("id, name, status")` not `.select("*")` — fetching 20 columns when you need 3 wastes bandwidth and memory
- **Avoid N+1 queries:** Never fetch data inside a loop. If you need related data, use joins or batch fetches in a single query
- **Cache repeated data:** Use React Query or SWR to cache data that gets fetched on multiple pages or components
- **Deduplicate:** Don't fetch the same data twice on the same page. Lift the fetch up to a shared parent or use a cache

---

## Performance Anti-Patterns to Block

These imports and patterns silently bloat your bundle. Block them on sight:

- `import moment from 'moment'` → Use `date-fns` or native `Intl.DateTimeFormat` instead (moment is 300KB+ and not tree-shakeable)
- `import _ from 'lodash'` → Import individual functions: `import debounce from 'lodash/debounce'`
- Large chart libraries in the main bundle → Use `next/dynamic(() => import('chart-lib'))` for lazy loading
- Inline SVGs over 5KB → Use `next/image` with SVG files instead
- `'use client'` on layout components → This forces the ENTIRE subtree to be client-rendered (massive JS increase)
- `import { Icon } from 'lucide-react'` is fine (tree-shakeable), but `import * as Icons from 'lucide-react'` ships ALL icons

---

## Next.js Caching Strategy

Choose the right caching for each page type:

- **ISR (Incremental Static Regeneration)**: for pages that change infrequently
  - Set `revalidate: 3600` (rebuild every hour) or `revalidate: 86400` (daily)
  - Good for: landing pages, blog posts, public dashboards
- **PPR (Partial Pre-Rendering)**: for pages that are MOSTLY static with small dynamic regions
  - Static shell loads instantly, dynamic parts stream in
  - Good for: dashboard with personalized greeting but static layout
- **On-demand revalidation**: for pages that change based on user actions
  - Use `revalidatePath('/habits')` after a habit is created/updated
  - Use `revalidateTag('user-data')` to invalidate all pages using that data tag
- **Full dynamic**: for pages that are entirely personalized
  - Check-in page, profile page, settings
  - These can't be cached meaningfully

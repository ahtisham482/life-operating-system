# Skill 3: UI/UX Quality Gate

Run this checklist after any UI or visual work before declaring it done. Every rule here exists because we got burned by it before.

---

## 1. Visibility Rules

- **Minimum font size**: 11px for any readable text. If you have to squint, it's too small.
- **Minimum opacity**: 30% for informational/secondary text, 50% for actionable text (buttons, links, interactive elements).
- **Contrast ratio**: 4.5:1 for normal text, 3:1 for large text (18px+ or 14px+ bold). This is WCAG AA — the legal baseline.
- **User-created data is sacred**: Anything the user typed, named, or configured MUST be prominently displayed. Never shrink, fade, or truncate user-created content to make the layout "cleaner." The user invested effort creating it — respect that.
- **The squint test**: Open the page, lean back in your chair. If any text or element is hard to read at a normal viewing distance, fix it.

---

## 2. Z-Index Protocol

Use this scale consistently across the entire app:

| Layer    | z-index | Example                     |
| -------- | ------- | --------------------------- |
| Content  | 0       | Normal page content         |
| Dropdown | 100     | Select menus, context menus |
| Modal    | 200     | Dialog boxes, overlays      |
| Toast    | 300     | Notifications, snackbars    |
| Tooltip  | 400     | Hover tooltips              |

### The Transform Trap (CRITICAL)

CSS `transform` creates a new stacking context. This means: an element inside a transformed parent can NEVER appear above a sibling of that parent, no matter how high you set z-index. This is not a bug — it's how CSS works.

**How to fix it:**

- Use the CSS `:has()` pseudo-class to dynamically boost the z-index of the transformed parent when a child needs to appear on top
- Use `isolation: isolate` on component roots to create predictable stacking contexts
- Example: `.card:has([data-dropdown-open]) { z-index: 100; }`
- Note: `opacity` (any value < 1), `filter`, `will-change`, and `perspective` also create new stacking contexts — the same z-index issues as transform apply to all of these

### Drag-and-Drop Libraries (@dnd-kit, react-beautiful-dnd)

Dropdowns on draggable cards are a known problem. The drag overlay creates a transform, which traps dropdowns underneath sibling cards.

**Fix pattern:**

1. Add `data-dropdown-open` attribute to the card when its dropdown is open
2. Use a CSS rule: `.card:has([data-dropdown-open]) { z-index: 100; }`
3. This lifts the entire card above siblings so the dropdown is visible

### Never do this

Never use arbitrary z-index numbers like `z-[9999]` or `z-[999999]`. They create an arms race where numbers keep going up. Use the scale above.

---

## 3. Dynamic Tailwind Class Ban

Tailwind purges unused classes at build time. It does this by scanning your source code for complete class strings. If you construct a class dynamically, Tailwind cannot find it, and the style silently disappears in production.

### NEVER do this

```
// These classes get PURGED in production — they work in dev but break in build
const color = "red"
className={`text-${color}-500`}        // BROKEN
className={`bg-${color}-100`}          // BROKEN
className={`border-${color}-300`}      // BROKEN
```

### ALWAYS do this

```
// Use complete string literals so Tailwind can find them
const colorMap = {
  red: "text-red-500",
  blue: "text-blue-500",
  green: "text-green-500",
}
className={colorMap[color]}            // WORKS
```

### Conditional classes

Use the `cn()` helper (clsx + tailwind-merge) for combining conditional classes:

```
className={cn(
  "px-4 py-2 rounded",
  isActive && "bg-blue-500 text-white",
  isDisabled && "opacity-50 cursor-not-allowed"
)}
```

### Verification test

Run `next build` and compare the result to dev mode. If any styles look different, you have a dynamic class problem.

---

## 4. Dark Mode Sanity Check

Before declaring any UI work done, toggle dark mode and check everything:

- [ ] All text is readable against its background
- [ ] No elements become invisible (same color as background)
- [ ] Borders and dividers are visible
- [ ] Focus rings are visible
- [ ] Form inputs have visible borders and text
- [ ] Images and icons have enough contrast
- [ ] Shadows still look intentional (not washed out or invisible)

### Rules

- Never hardcode light-mode colors (like `bg-white` or `text-black` without a `dark:` variant)
- Use CSS variables or Tailwind theme tokens that automatically adapt
- If using custom colors, always define both light and dark variants

---

## 5. Responsive Check

Test at these three breakpoints before shipping:

| Device  | Width  | What to check                                                     |
| ------- | ------ | ----------------------------------------------------------------- |
| Mobile  | 375px  | Text doesn't overflow, buttons are tappable, no horizontal scroll |
| Tablet  | 768px  | Layout adapts, sidebars collapse or become drawers                |
| Desktop | 1440px | Content doesn't stretch too wide, reasonable max-width            |

### Rules

- Text must not overflow its container at any width
- Touch targets must be at least 44px x 44px on mobile (this is Apple's Human Interface Guideline minimum)
- No horizontal scrolling on mobile — ever
- Images and cards should reflow, not shrink to unreadable sizes

---

## 6. Interactive States

Every clickable element needs all four states. No exceptions.

| State    | What it looks like                                                |
| -------- | ----------------------------------------------------------------- |
| Default  | Normal appearance                                                 |
| Hover    | Subtle visual change (background shift, underline)                |
| Focus    | Visible ring or outline (for keyboard navigation)                 |
| Active   | Pressed/clicked appearance (slightly darker/smaller)              |
| Disabled | Obviously disabled: lower opacity (50-60%) + `cursor-not-allowed` |

### Focus indicators

- Must be visible — never remove the default focus ring without replacing it
- Keyboard users rely on focus indicators to know where they are on the page
- Use `focus-visible:` (NOT `focus:`) for focus styles — this only shows the focus ring for keyboard users, not mouse clicks
- NEVER remove the default focus ring (`outline: none`) without providing a visible replacement
- Example: `focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none`

---

## 7. Content Overflow

Test every text field with absurdly long content. Things will break if you don't.

### Test with this string

```
This is a very very very very very very very very very very very very long title that should not break the layout
```

### Rules

- **Long text**: Truncate with ellipsis (`truncate` or `line-clamp-2`) or wrap gracefully. Never let text break the layout or cause horizontal scrolling.
- **Many items**: Paginate or virtualize (react-window, @tanstack/virtual) any list over 50 items. Never render hundreds of DOM nodes.
- **Images**: Always constrain with `max-width` and `max-height`. Use `next/image` with defined `width` and `height` props. Never let an image push content off-screen.
- **Empty states**: When there are zero items, show a helpful message — never show a blank void.

---

## 8. Modal and Dropdown Rules

### Never use native browser dialogs

`alert()`, `confirm()`, and `prompt()` are banned. They look ugly, they block the thread, and they can't be styled. Always use custom-styled alternatives.

### Modal requirements

- Backdrop overlay (semi-transparent dark background behind the modal)
- Press Escape to close
- Focus trap inside the modal (Tab key stays within the modal, doesn't go to content behind it)
- Centered on screen (both horizontally and vertically)
- Scrollable content area if content is too tall (the modal itself doesn't scroll, the inner content does)

### Dropdown requirements

- Close on click outside
- Close on Escape key
- Proper z-index (use the scale from Section 2 — dropdowns are z-100)
- Position-aware: if the dropdown would go off-screen, flip it (open upward instead of downward)

### Theme consistency

All modals and dropdowns must match the app's dark theme. No white modals popping up in a dark app.

---

## 9. Animation Rules

- Use **Framer Motion** `AnimatePresence` for enter/exit animations on elements that mount/unmount
- **Never force auto-scroll** — the user controls their scroll position. If you need to scroll to a new element, ask first or make it optional.
- **Transition duration**: 150-300ms. Under 150ms feels instant (pointless animation). Over 300ms feels sluggish (user is waiting).
- **Disabled states should not animate** — if a button is disabled, it should not have hover animations or transitions.
- **Reduce motion**: Respect `prefers-reduced-motion` media query. Wrap animations in a check or use Framer Motion's built-in support.
- **No animation on initial page load** for lists — animating 20 items sliding in is distracting, not delightful.

---

## 10. Font Loading Strategy

- Every custom font MUST use `next/font` (from `next/font/google` or `next/font/local`)
- Always set `display: 'swap'` — prevents invisible text while the font loads
- Enable `adjustFontFallback` — prevents layout shift (CLS) when the font swaps in
- NEVER load fonts from external CDNs (Google Fonts CDN, Adobe Fonts, etc.)
- `next/font` automatically self-hosts fonts, eliminating external network requests

---

## 11. Image Optimization Checklist

Every image in the app must follow these rules:

- Always use the `next/image` component (never raw `<img>` tags)
- Always set explicit `width` and `height` props (prevents CLS — layout shift)
- Set `priority` on above-the-fold images (hero images, logos) — improves LCP
- Set `loading="lazy"` on below-fold images (loaded only when scrolled to)
- Use the `sizes` attribute for responsive images: `sizes="(max-width: 768px) 100vw, 50vw"`
- For background images, use CSS `background-image` with optimized sources

---

## 12. Design Token Basics

Keep your UI consistent by using Tailwind's built-in token system:

- **Spacing**: use Tailwind's spacing scale (p-1, p-2, p-3, p-4...) — never invent custom pixel values like `p-[13px]`
- **Colors**: reference color tokens from `tailwind.config.ts` — never hardcode hex values
- **Border radius**: use the scale (rounded-sm, rounded, rounded-md, rounded-lg) — not arbitrary values
- **Shadows**: use the scale (shadow-sm, shadow, shadow-md, shadow-lg) — not custom box-shadow
- Rule: if a value doesn't exist in Tailwind's token system, don't use it — extend the config instead
- This prevents the "every component uses slightly different spacing" problem

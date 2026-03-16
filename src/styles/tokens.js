/**
 * Life Operating System — Design Tokens (JS)
 * Mirrors the CSS custom properties in globals.css.
 * Use these in any JS/JSX logic that needs design values.
 */

export const colors = {
  bgBase:        "#0a0a0a",
  bgHeader:      "#0d0d0d",
  bgSurface:     "#111111",
  bgSurfaceAlt:  "#161616",
  bgDomainLead:  "#13110a",

  borderSubtle:  "#161616",
  borderDefault: "#1e1e1e",
  borderMedium:  "#3a3a3a",
  borderStrong:  "#555555",
  borderAccent:  "#c9a84c",
  borderError:   "#5a2222",

  gold:          "#c9a84c",
  goldHover:     "#d4b660",
  goldActive:    "#b8922a",

  errorText:     "#e05555",
  errorBg:       "#5a2222",

  textPrimary:   "#e8e0d0",
  textSecondary: "#888888",
  textMuted:     "#7a7a7a",
  textAccent:    "#c9a84c",
  textError:     "#e05555",
  textInverse:   "#0a0a0a",
};

export const fonts = {
  content: "'Georgia', serif",
  ui:      "'Geist Mono', 'Courier New', monospace",
};

export const spacing = {
  1:  "4px",
  2:  "8px",
  3:  "12px",
  4:  "16px",
  5:  "20px",
  6:  "24px",
  8:  "32px",
  10: "40px",
  12: "48px",
};

export const radius = {
  sm:   "2px",
  md:   "4px",
  full: "9999px",
};

export const breakpoints = {
  sm:  375,
  md:  768,
  lg:  1024,
};

export const transitions = {
  fast: "0.15s ease",
  base: "0.2s ease",
};

/**
 * Maps 6 season domains to 4 task life areas.
 * Used by season progress metrics, domain health indicators, and season-aware classification.
 */

export const DOMAIN_TO_LIFE_AREAS: Record<string, string[]> = {
  "Business & Agency": ["💼 Job", "🚀 Business Building"],
  "Content & Brand": ["🚀 Business Building"],
  "Learning & Books": ["📖 Personal Dev"],
  "Health & Body": ["🏠 Home & Life"],
  "Deen & Spirit": ["🏠 Home & Life"],
  "Personal Life": ["🏠 Home & Life"],
};

/** All 6 season domains with their metadata */
export const DOMAINS = [
  { name: "Business & Agency", icon: "◈", desc: "Revenue, clients, PPC, growth" },
  { name: "Content & Brand", icon: "◉", desc: "TikTok, personal brand, audience" },
  { name: "Learning & Books", icon: "◎", desc: "Reading, implementation, skills" },
  { name: "Health & Body", icon: "◇", desc: "Exercise, sleep, energy" },
  { name: "Deen & Spirit", icon: "◆", desc: "Prayer, reflection, purpose" },
  { name: "Personal Life", icon: "○", desc: "Family, rest, relationships" },
] as const;

/** Maintenance mode minimum actions per domain */
export const MAINTENANCE_GUIDANCE: Record<string, string> = {
  "Business & Agency": "Respond to client messages, check revenue dashboard",
  "Content & Brand": "1 post per week, engage with 5 comments",
  "Learning & Books": "Read 15 min/day, capture 1 insight",
  "Health & Body": "Exercise 3x/week, sleep by 11pm",
  "Deen & Spirit": "5 daily prayers, 10 min Quran/Tafseer",
  "Personal Life": "1 family activity/week, rest day on Friday",
};

/**
 * Get the life areas that correspond to a season's lead domain.
 * Returns the task life areas that should get priority boost.
 */
export function getLeadLifeAreas(leadDomain: string): string[] {
  return DOMAIN_TO_LIFE_AREAS[leadDomain] ?? [];
}

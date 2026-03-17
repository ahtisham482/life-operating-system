/**
 * Lightweight natural-language date parser.
 * Converts English phrases like "tomorrow", "next friday", "in 3 days"
 * into YYYY-MM-DD strings. No external dependencies.
 */

const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

const MONTH_ABBREVS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

/** Returns the next occurrence of a weekday (skips today if it matches). */
function nextWeekday(from: Date, dayIndex: number): Date {
  const diff = (dayIndex - from.getDay() + 7) % 7;
  return addDays(from, diff === 0 ? 7 : diff);
}

/** Capitalize first letter */
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Types ────────────────────────────────────────────

export type ParsedDate = {
  date: string; // YYYY-MM-DD
  label: string; // Human-readable e.g. "Tomorrow", "Next Friday"
  matchedText: string; // Original text that was matched
};

export type ParseResult = {
  taskName: string; // Text with date phrase removed
  parsedDate: ParsedDate | null;
};

// ─── Pattern Definitions ──────────────────────────────

type PatternDef = {
  regex: RegExp;
  handler: (
    match: RegExpMatchArray,
    today: Date
  ) => { date: Date; label: string } | null;
};

const DAY_PATTERN =
  "monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun";

const MONTH_PATTERN =
  "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";

function resolveDayName(str: string): number {
  const lower = str.toLowerCase();
  return DAY_NAMES.findIndex(
    (d) => d === lower || d.slice(0, 3) === lower
  );
}

const PATTERNS: PatternDef[] = [
  // ── Relative keywords ──
  {
    regex: /\b(today|eod)\b/i,
    handler: (_m, today) => ({ date: today, label: "Today" }),
  },
  {
    regex: /\b(tomorrow|tmrw|tmr)\b/i,
    handler: (_m, today) => ({ date: addDays(today, 1), label: "Tomorrow" }),
  },
  {
    regex: /\byesterday\b/i,
    handler: (_m, today) => ({ date: addDays(today, -1), label: "Yesterday" }),
  },

  // ── "end of week" ──
  {
    regex: /\b(eow|end\s+of\s+week)\b/i,
    handler: (_m, today) => ({
      date: nextWeekday(today, 5),
      label: "End of week",
    }),
  },

  // ── "next week" / "next month" ──
  {
    regex: /\bnext\s+week\b/i,
    handler: (_m, today) => ({
      date: addDays(today, 7),
      label: "Next week",
    }),
  },
  {
    regex: /\bnext\s+month\b/i,
    handler: (_m, today) => {
      const d = new Date(today);
      d.setMonth(d.getMonth() + 1);
      return { date: d, label: "Next month" };
    },
  },

  // ── "next <day>" e.g. "next friday" ──
  {
    regex: new RegExp(`\\bnext\\s+(${DAY_PATTERN})\\b`, "i"),
    handler: (match, today) => {
      const idx = resolveDayName(match[1]);
      if (idx === -1) return null;
      const target = nextWeekday(today, idx);
      return { date: target, label: `Next ${cap(DAY_NAMES[idx])}` };
    },
  },

  // ── "on <day>" e.g. "on friday" ──
  {
    regex: new RegExp(`\\b(?:on|by|due)\\s+(${DAY_PATTERN})\\b`, "i"),
    handler: (match, today) => {
      const idx = resolveDayName(match[1]);
      if (idx === -1) return null;
      return { date: nextWeekday(today, idx), label: cap(DAY_NAMES[idx]) };
    },
  },

  // ── bare day name at end: "Buy milk friday" ──
  {
    regex: new RegExp(`\\b(${DAY_PATTERN})\\s*$`, "i"),
    handler: (match, today) => {
      const idx = resolveDayName(match[1]);
      if (idx === -1) return null;
      return { date: nextWeekday(today, idx), label: cap(DAY_NAMES[idx]) };
    },
  },

  // ── "in N days/weeks/months" ──
  {
    regex: /\bin\s+(\d+)\s+(days?|weeks?|months?)\b/i,
    handler: (match, today) => {
      const n = parseInt(match[1], 10);
      if (n <= 0 || n > 365) return null;
      const unit = match[2].toLowerCase();
      if (unit.startsWith("day")) {
        return {
          date: addDays(today, n),
          label: `In ${n} day${n > 1 ? "s" : ""}`,
        };
      }
      if (unit.startsWith("week")) {
        return {
          date: addDays(today, n * 7),
          label: `In ${n} week${n > 1 ? "s" : ""}`,
        };
      }
      if (unit.startsWith("month")) {
        const d = new Date(today);
        d.setMonth(d.getMonth() + n);
        return {
          date: d,
          label: `In ${n} month${n > 1 ? "s" : ""}`,
        };
      }
      return null;
    },
  },

  // ── "N days from now" ──
  {
    regex: /\b(\d+)\s+(days?|weeks?)\s+from\s+now\b/i,
    handler: (match, today) => {
      const n = parseInt(match[1], 10);
      if (n <= 0 || n > 365) return null;
      const unit = match[2].toLowerCase();
      const mult = unit.startsWith("week") ? 7 : 1;
      return {
        date: addDays(today, n * mult),
        label: `In ${n} ${unit.startsWith("week") ? "week" : "day"}${n > 1 ? "s" : ""}`,
      };
    },
  },

  // ── "<month> <day>" e.g. "jan 15", "march 20" ──
  {
    regex: new RegExp(`\\b(${MONTH_PATTERN})\\s+(\\d{1,2})\\b`, "i"),
    handler: (match, today) => {
      const monthStr = match[1].toLowerCase().slice(0, 3);
      const monthIdx = MONTH_ABBREVS[monthStr];
      if (monthIdx === undefined) return null;
      const day = parseInt(match[2], 10);
      if (day < 1 || day > 31) return null;
      const year = today.getFullYear();
      let d = new Date(year, monthIdx, day);
      // If past, use next year
      if (d.getTime() < today.getTime()) {
        d = new Date(year + 1, monthIdx, day);
      }
      return { date: d, label: `${cap(MONTH_NAMES[monthIdx])} ${day}` };
    },
  },

  // ── "<day> <month>" e.g. "15 jan", "20 march" ──
  {
    regex: new RegExp(`\\b(\\d{1,2})\\s+(${MONTH_PATTERN})\\b`, "i"),
    handler: (match, today) => {
      const day = parseInt(match[1], 10);
      const monthStr = match[2].toLowerCase().slice(0, 3);
      const monthIdx = MONTH_ABBREVS[monthStr];
      if (monthIdx === undefined) return null;
      if (day < 1 || day > 31) return null;
      const year = today.getFullYear();
      let d = new Date(year, monthIdx, day);
      if (d.getTime() < today.getTime()) {
        d = new Date(year + 1, monthIdx, day);
      }
      return { date: d, label: `${cap(MONTH_NAMES[monthIdx])} ${day}` };
    },
  },
];

// ─── Main API ─────────────────────────────────────────

/**
 * Parse a text string for natural language date references.
 * Returns the cleaned task name and the parsed date (if any).
 *
 * Examples:
 *   parseNaturalDate("Buy groceries tomorrow")
 *   → { taskName: "Buy groceries", parsedDate: { date: "2026-03-19", label: "Tomorrow", ... } }
 *
 *   parseNaturalDate("Review PR")
 *   → { taskName: "Review PR", parsedDate: null }
 */
export function parseNaturalDate(text: string): ParseResult {
  const today = getToday();
  const trimmed = text.trim();
  if (!trimmed) return { taskName: "", parsedDate: null };

  const lower = trimmed.toLowerCase();

  for (const { regex, handler } of PATTERNS) {
    const match = lower.match(regex);
    if (!match) continue;

    const result = handler(match, today);
    if (!result) continue;

    const matchedText = match[0];

    // Remove the matched date phrase from the original text
    const matchIndex = lower.indexOf(matchedText);
    const before = trimmed.slice(0, matchIndex);
    const after = trimmed.slice(matchIndex + matchedText.length);

    let taskName = (before + " " + after)
      .replace(/\s+/g, " ")
      .trim();

    // Clean trailing/leading prepositions left behind
    taskName = taskName
      .replace(/\s+(by|on|due|for|at|the)$/i, "")
      .replace(/^(by|on|due|for|at|the)\s+/i, "")
      .trim();

    return {
      taskName: taskName || trimmed, // Fallback to original if nothing remains
      parsedDate: {
        date: formatDate(result.date),
        label: result.label,
        matchedText,
      },
    };
  }

  return { taskName: trimmed, parsedDate: null };
}

/**
 * Parse just the date from a string (for date input fields).
 * Returns YYYY-MM-DD string or null if no date was recognized.
 *
 * Examples:
 *   parseDateString("tomorrow") → "2026-03-19"
 *   parseDateString("next friday") → "2026-03-20"
 *   parseDateString("hello") → null
 */
export function parseDateString(text: string): string | null {
  const result = parseNaturalDate(text);
  return result.parsedDate?.date ?? null;
}

/**
 * Format a YYYY-MM-DD date string into a human-readable label.
 * Used for showing parsed date previews.
 */
export function formatDateLabel(dateStr: string): string {
  const today = getToday();
  const d = new Date(dateStr + "T00:00:00");
  const diffMs = d.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";

  // Show day name for this week
  if (diffDays > 0 && diffDays <= 7) {
    const dayName = DAY_NAMES[d.getDay()];
    return cap(dayName);
  }

  // Show "Mon, Jan 15" for everything else
  const monthName = MONTH_NAMES[d.getMonth()].slice(0, 3);
  const dayOfWeek = DAY_NAMES[d.getDay()].slice(0, 3);
  return `${cap(dayOfWeek)}, ${cap(monthName)} ${d.getDate()}`;
}

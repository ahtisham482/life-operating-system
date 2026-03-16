"use client";

import { useState } from "react";
import { createSeason, updateSeason } from "./actions";

const DOMAINS = [
  { id: "business", label: "Business & Agency", icon: "\u25C8", desc: "Revenue, clients, PPC, growth" },
  { id: "content", label: "Content & Brand", icon: "\u25C9", desc: "TikTok, personal brand, audience" },
  { id: "learning", label: "Learning & Books", icon: "\u25CE", desc: "Reading, implementation, skills" },
  { id: "health", label: "Health & Body", icon: "\u25C7", desc: "Exercise, sleep, energy" },
  { id: "deen", label: "Deen & Spirit", icon: "\u25C6", desc: "Prayer, reflection, purpose" },
  { id: "personal", label: "Personal Life", icon: "\u25CB", desc: "Family, rest, relationships" },
] as const;

const FIELD_CLASS =
  "w-full h-9 px-3 py-1 bg-transparent border border-input rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors";

type SeasonFormProps = {
  season?: {
    id: string;
    goal: string;
    startDate: string;
    endDate: string;
    leadDomain: string;
    domains: Record<string, string>;
  };
  onDone?: () => void;
};

export function SeasonForm({ season, onDone }: SeasonFormProps) {
  const isEdit = Boolean(season);
  const [editing, setEditing] = useState(!isEdit);
  const [goal, setGoal] = useState(season?.goal ?? "");
  const [startDate, setStartDate] = useState(season?.startDate ?? "");
  const [endDate, setEndDate] = useState(season?.endDate ?? "");
  const [leadDomain, setLeadDomain] = useState(season?.leadDomain ?? "business");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!goal.trim() || !startDate || !endDate) return;
    setSaving(true);

    // Build domains JSONB: lead domain gets "lead", all others get "maintenance"
    const domains: Record<string, string> = {};
    for (const d of DOMAINS) {
      domains[d.id] = d.id === leadDomain ? "lead" : "maintenance";
    }

    try {
      if (isEdit && season) {
        await updateSeason(season.id, {
          goal,
          startDate,
          endDate,
          leadDomain,
          domains,
        });
      } else {
        await createSeason(goal, startDate, endDate, leadDomain, domains);
      }
      if (onDone) onDone();
      if (isEdit) setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (isEdit && !editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="px-4 py-2 text-xs font-mono uppercase tracking-widest border border-border rounded-md text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
      >
        Edit Season
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Season Goal */}
      <div className="space-y-1.5">
        <label
          htmlFor="season-goal"
          className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground"
        >
          Season Goal *
        </label>
        <input
          id="season-goal"
          type="text"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="e.g. Grow agency to 5 clients, stabilize revenue to PKR X/month"
          className={FIELD_CLASS}
          required
        />
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label
            htmlFor="start-date"
            className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground"
          >
            Start Date *
          </label>
          <input
            type="date"
            id="start-date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={FIELD_CLASS}
            required
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="end-date"
            className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground"
          >
            End Date *
          </label>
          <input
            type="date"
            id="end-date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={FIELD_CLASS}
            required
          />
        </div>
      </div>

      {/* Lead Domain */}
      <div className="space-y-1.5">
        <label
          htmlFor="lead-domain"
          className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground"
        >
          Lead Domain *
        </label>
        <select
          id="lead-domain"
          value={leadDomain}
          onChange={(e) => setLeadDomain(e.target.value)}
          className={FIELD_CLASS}
        >
          {DOMAINS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.icon} {d.label}
            </option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        {isEdit && (
          <button
            type="button"
            onClick={() => setEditing(false)}
            disabled={saving}
            className="px-4 py-2 text-xs font-mono uppercase tracking-widest border border-border rounded-md text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={saving || !goal.trim() || !startDate || !endDate}
          className="px-4 py-2 text-xs font-mono uppercase tracking-widest border border-primary bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : isEdit ? "Save Changes" : "Start Season"}
        </button>
      </div>
    </form>
  );
}

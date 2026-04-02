"use client";

import { useState, useMemo } from "react";

export interface SetupTrackerProps {
  habitsCount: number;
  daysOfData: number;
  hasBlueprintsData: boolean;
  hasScorecardData: boolean;
  hasIdentityData: boolean;
  hasFrictionData: boolean;
  hasAttractionData: boolean;
  hasMasteryHabits: boolean;
  hasOnboardingComplete: boolean;
  onNavigate: (view: string) => void;
}

interface SetupItem {
  label: string;
  complete: boolean;
  view: string;
}

function getSetupItems(props: SetupTrackerProps): SetupItem[] {
  return [
    { label: "Created habits", complete: props.habitsCount > 0, view: "tracker" },
    { label: "Tracked 3 days", complete: props.daysOfData >= 3, view: "tracker" },
    { label: "Scored a day", complete: props.hasScorecardData, view: "scorecard" },
    { label: "Linked identity", complete: props.hasIdentityData, view: "identity" },
    { label: "Built blueprint", complete: props.hasBlueprintsData, view: "architect" },
    { label: "Set up attraction", complete: props.hasAttractionData, view: "attract" },
    { label: "Mapped friction", complete: props.hasFrictionData, view: "friction" },
    { label: "Added contract", complete: props.hasOnboardingComplete, view: "rewards" },
    { label: "Tracked 14 days", complete: props.daysOfData >= 14, view: "tracker" },
    { label: "Started mastery", complete: props.hasMasteryHabits, view: "mastery" },
  ];
}

export function SystemSetupTracker(props: SetupTrackerProps) {
  const [expanded, setExpanded] = useState(false);
  const items = useMemo(() => getSetupItems(props), [props]);

  const completedCount = items.filter((i) => i.complete).length;
  const total = items.length;
  const pct = (completedCount / total) * 100;

  // All done — hide the tracker
  if (completedCount === total) return null;

  return (
    <div className="bg-[#FFF8F0]/[0.02] border border-[#FFF8F0]/[0.06] rounded-xl overflow-hidden">
      {/* Collapsed bar — always visible */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left group"
      >
        {/* Progress bar */}
        <div className="flex-1 h-1.5 bg-[#FFF8F0]/[0.05] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: `linear-gradient(to right, #FF6B6B, #34D399)`,
            }}
          />
        </div>
        <span className="text-[10px] font-mono text-[#FFF8F0]/40 shrink-0">
          {completedCount}/{total}
        </span>
        <span className="text-[10px] font-mono text-[#FFF8F0]/25 shrink-0 hidden sm:inline">
          Building your foundation
        </span>
        <span
          className={`text-[10px] text-[#FFF8F0]/25 transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          ▼
        </span>
      </button>

      {/* Expanded items */}
      {expanded && (
        <div className="px-4 pb-3 pt-1 flex flex-wrap gap-x-3 gap-y-1.5">
          {items.map((item) =>
            item.complete ? (
              <span
                key={item.label}
                className="text-[11px] font-mono text-[#FFF8F0]/30"
              >
                ✅ {item.label}
              </span>
            ) : (
              <button
                key={item.label}
                onClick={() => props.onNavigate(item.view)}
                className="text-[11px] font-mono text-[#FFF8F0]/50 hover:text-[#FFF8F0]/80 transition-colors"
              >
                ○ {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}

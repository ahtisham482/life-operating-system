"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { addScorecardEntry, searchBehaviors } from "./scorecard-actions";
import {
  getCategoryIcon,
  type ScorecardRating,
  type BehaviorLibraryItem,
} from "@/lib/scorecard";

interface ScorecardEntryFormProps {
  scorecardId: string;
  onAdded?: () => void;
}

export function ScorecardEntryForm({
  scorecardId,
  onAdded,
}: ScorecardEntryFormProps) {
  const [isPending, startTransition] = useTransition();
  const [time, setTime] = useState(() => {
    const now = new Date();
    const h = now.getHours().toString().padStart(2, "0");
    const m = now.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  });
  const [behavior, setBehavior] = useState("");
  const [rating, setRating] = useState<ScorecardRating | null>(null);
  const [duration, setDuration] = useState("");
  const [wasAutomatic, setWasAutomatic] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [emotionalState, setEmotionalState] = useState("");
  const [suggestions, setSuggestions] = useState<BehaviorLibraryItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Autocomplete search
  useEffect(() => {
    if (behavior.length < 2) {
      setSuggestions([]);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const results = await searchBehaviors(behavior);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [behavior]);

  function handleSubmit() {
    if (!behavior.trim() || !rating) return;

    startTransition(async () => {
      await addScorecardEntry(scorecardId, {
        timeOfAction: time,
        behaviorDescription: behavior.trim(),
        rating,
        durationMinutes: duration ? parseInt(duration, 10) : undefined,
        wasAutomatic,
        emotionalState: emotionalState || undefined,
      });

      // Reset form
      setBehavior("");
      setRating(null);
      setDuration("");
      setWasAutomatic(true);
      setEmotionalState("");
      setShowAdvanced(false);
      setSuggestions([]);
      inputRef.current?.focus();
      onAdded?.();
    });
  }

  function selectSuggestion(item: BehaviorLibraryItem) {
    setBehavior(item.behaviorName);
    if (item.defaultRating) setRating(item.defaultRating as ScorecardRating);
    setShowSuggestions(false);
    setSuggestions([]);
  }

  const emotions = [
    "calm",
    "happy",
    "focused",
    "bored",
    "stressed",
    "anxious",
    "tired",
    "frustrated",
  ];

  return (
    <div className="p-4 bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider">
          Log behavior
        </span>
      </div>

      {/* Time + Behavior input row */}
      <div className="flex gap-2">
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-[100px] px-2 py-2 text-sm font-mono bg-[#FFF8F0]/[0.05] border border-[#FFF8F0]/[0.08] rounded-xl text-[#FFF8F0] focus:outline-none focus:border-[#FF6B6B]/40"
        />

        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={behavior}
            onChange={(e) => setBehavior(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="What did you do?"
            className="w-full px-3 py-2 text-sm bg-[#FFF8F0]/[0.05] border border-[#FFF8F0]/[0.08] rounded-xl text-[#FFF8F0] placeholder:text-[#FFF8F0]/20 focus:outline-none focus:border-[#FF6B6B]/40"
            onKeyDown={(e) => {
              if (e.key === "Enter" && behavior && rating) handleSubmit();
            }}
          />

          {/* Autocomplete dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-[#FFF8F0]/[0.1] rounded-xl overflow-hidden shadow-xl">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onMouseDown={() => selectSuggestion(s)}
                  className="w-full px-3 py-2 flex items-center gap-2 text-left text-sm hover:bg-[#FFF8F0]/[0.05] transition-colors"
                >
                  <span className="text-xs">
                    {getCategoryIcon(s.behaviorCategory)}
                  </span>
                  <span className="text-[#FFF8F0]/80">{s.behaviorName}</span>
                  <span className="ml-auto text-[10px] font-mono text-[#FFF8F0]/25">
                    {s.timesLogged}x
                  </span>
                  {s.defaultRating && (
                    <span
                      className="text-xs"
                      style={{
                        color:
                          s.defaultRating === "+"
                            ? "#34D399"
                            : s.defaultRating === "-"
                              ? "#F87171"
                              : "#9CA3AF",
                      }}
                    >
                      {s.defaultRating === "+"
                        ? "✅"
                        : s.defaultRating === "-"
                          ? "❌"
                          : "➖"}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Rating buttons */}
      <div className="flex gap-2">
        {(
          [
            { r: "+", emoji: "✅", label: "Positive", color: "#34D399" },
            { r: "-", emoji: "❌", label: "Negative", color: "#F87171" },
            { r: "=", emoji: "➖", label: "Neutral", color: "#9CA3AF" },
          ] as const
        ).map(({ r, emoji, label, color }) => (
          <button
            key={r}
            type="button"
            onClick={() => setRating(r)}
            className={`flex-1 py-2.5 rounded-xl border text-sm font-mono transition-all ${
              rating === r
                ? "border-opacity-60 scale-[1.02]"
                : "border-[#FFF8F0]/[0.06] hover:border-[#FFF8F0]/[0.12]"
            }`}
            style={{
              borderColor: rating === r ? `${color}60` : undefined,
              background: rating === r ? `${color}15` : "transparent",
              color: rating === r ? color : "#FFF8F0B0",
            }}
          >
            <span className="mr-1.5">{emoji}</span>
            {label}
          </button>
        ))}
      </div>

      {/* Advanced toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-[10px] font-mono text-[#FFF8F0]/30 hover:text-[#FFF8F0]/50 transition-colors"
      >
        {showAdvanced ? "▾ Less details" : "▸ More details (duration, emotion, autopilot)"}
      </button>

      {/* Advanced fields */}
      {showAdvanced && (
        <div className="space-y-3 pt-1">
          <div className="flex gap-2 items-center">
            <label className="text-[10px] font-mono text-[#FFF8F0]/40 w-16">
              Duration
            </label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="min"
              min="1"
              max="480"
              className="w-20 px-2 py-1.5 text-sm font-mono bg-[#FFF8F0]/[0.05] border border-[#FFF8F0]/[0.08] rounded-lg text-[#FFF8F0] placeholder:text-[#FFF8F0]/20 focus:outline-none focus:border-[#FF6B6B]/40"
            />
            <span className="text-[10px] text-[#FFF8F0]/25">minutes</span>
          </div>

          {/* Autopilot toggle */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-mono text-[#FFF8F0]/40 w-16">
              Autopilot
            </label>
            <button
              type="button"
              onClick={() => setWasAutomatic(!wasAutomatic)}
              className={`px-3 py-1 rounded-lg text-xs font-mono border transition-all ${
                wasAutomatic
                  ? "bg-[#FFF8F0]/[0.08] border-[#FFF8F0]/[0.15] text-[#FFF8F0]/60"
                  : "border-[#34D399]/30 bg-[#34D399]/10 text-[#34D399]"
              }`}
            >
              {wasAutomatic ? "🤖 Automatic" : "🎯 Deliberate"}
            </button>
          </div>

          {/* Emotional state */}
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-[10px] font-mono text-[#FFF8F0]/40 w-16">
              Feeling
            </label>
            <div className="flex gap-1 flex-wrap">
              {emotions.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() =>
                    setEmotionalState(emotionalState === em ? "" : em)
                  }
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-mono border transition-all ${
                    emotionalState === em
                      ? "border-[#FEC89A]/40 bg-[#FEC89A]/10 text-[#FEC89A]"
                      : "border-[#FFF8F0]/[0.06] text-[#FFF8F0]/30 hover:text-[#FFF8F0]/50"
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!behavior.trim() || !rating || isPending}
        className="w-full py-2.5 rounded-xl text-sm font-mono transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 hover:bg-[#FF6B6B]/30"
      >
        {isPending ? "Logging..." : "Log behavior"}
      </button>
    </div>
  );
}

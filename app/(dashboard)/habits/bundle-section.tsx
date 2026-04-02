"use client";

import { useState, useTransition } from "react";
import type { Bundle } from "@/lib/attraction";
import {
  buildBundleStatement,
  calculateBundleStrength,
  getNeedIcon,
  getWantIcon,
  BUNDLE_SUGGESTIONS,
} from "@/lib/attraction";
import {
  createBundle,
  deleteBundle,
  logBundleOutcome,
} from "./attraction-actions";
import { EmptyState } from "./empty-state";

interface BundleSectionProps {
  bundles: Bundle[];
  onRefresh: () => void;
}

const INPUT =
  "mt-1 w-full px-3 py-2 bg-[#FFF8F0]/[0.05] border border-[#FFF8F0]/[0.08] rounded-xl text-sm text-[#FFF8F0] placeholder:text-[#FFF8F0]/20 focus:outline-none focus:border-[#FF6B6B]/40";
const LABEL = "text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider";
const BTN =
  "px-4 py-2 bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 rounded-xl text-[11px] font-mono uppercase tracking-wider hover:bg-[#FF6B6B]/30 transition-colors";

type Strictness = "strict" | "moderate" | "flexible";

export function BundleSection({ bundles, onRefresh }: BundleSectionProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [needDesc, setNeedDesc] = useState("");
  const [needMinutes, setNeedMinutes] = useState("");
  const [wantDesc, setWantDesc] = useState("");
  const [wantTimeLimit, setWantTimeLimit] = useState("");
  const [strictness, setStrictness] = useState<Strictness>("moderate");

  function resetForm() {
    setNeedDesc("");
    setNeedMinutes("");
    setWantDesc("");
    setWantTimeLimit("");
    setStrictness("moderate");
    setShowCreate(false);
  }

  function handleCreate() {
    if (!needDesc.trim() || !wantDesc.trim()) return;
    startTransition(async () => {
      await createBundle({
        needDescription: needDesc.trim(),
        needEstimatedMinutes: parseInt(needMinutes) || undefined,
        wantDescription: wantDesc.trim(),
        wantTimeLimit: parseInt(wantTimeLimit) || undefined,
        strictness,
      });
      resetForm();
      onRefresh();
    });
  }

  function handleOutcome(bundleId: string, outcome: "full_bundle" | "need_only" | "cheated" | "skipped") {
    startTransition(async () => {
      await logBundleOutcome(bundleId, outcome);
      onRefresh();
    });
  }

  function handleDelete(bundleId: string) {
    startTransition(async () => {
      await deleteBundle(bundleId);
      onRefresh();
    });
  }

  // Live preview
  const previewStatement = needDesc && wantDesc
    ? buildBundleStatement(needDesc, wantDesc, parseInt(wantTimeLimit) || null)
    : "";
  const previewStrength = needDesc
    ? calculateBundleStrength({
        needDescription: needDesc,
        wantTimeLimit: parseInt(wantTimeLimit) || null,
        strictness,
        needEstimatedMinutes: parseInt(needMinutes) || null,
      })
    : null;

  // Empty state
  if (bundles.length === 0 && !showCreate) {
    return (
      <EmptyState
        icon="🎁"
        title="Pair what you NEED with what you WANT"
        description="After you complete a hard habit, unlock an enjoyable reward. The anticipation of the reward makes the habit attractive."
        principle="Katy Milkman's study: people who bundled exercise with audiobooks went to the gym 51% more."
        actionLabel="Create first bundle"
        onAction={() => setShowCreate(true)}
        compact
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Create toggle */}
      <button
        onClick={() => setShowCreate(!showCreate)}
        className={BTN}
      >
        {showCreate ? "Cancel" : "+ Create Bundle"}
      </button>

      {/* Create form */}
      {showCreate && (
        <div className="p-4 bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Need (must-do)</label>
              <input
                className={INPUT}
                placeholder="e.g. Complete workout"
                value={needDesc}
                onChange={(e) => setNeedDesc(e.target.value)}
              />
              <input
                className={`${INPUT} mt-2`}
                type="number"
                placeholder="Estimated minutes"
                value={needMinutes}
                onChange={(e) => setNeedMinutes(e.target.value)}
              />
            </div>
            <div>
              <label className={LABEL}>Want (reward)</label>
              <input
                className={INPUT}
                placeholder="e.g. Watch Netflix"
                value={wantDesc}
                onChange={(e) => setWantDesc(e.target.value)}
              />
              <input
                className={`${INPUT} mt-2`}
                type="number"
                placeholder="Time limit (min)"
                value={wantTimeLimit}
                onChange={(e) => setWantTimeLimit(e.target.value)}
              />
            </div>
          </div>

          {/* Strictness */}
          <div>
            <label className={LABEL}>Strictness</label>
            <div className="flex gap-2 mt-1">
              {(["strict", "moderate", "flexible"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStrictness(s)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-mono capitalize transition-all ${
                    strictness === s
                      ? "bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30"
                      : "text-[#FFF8F0]/30 border border-[#FFF8F0]/[0.08] hover:text-[#FFF8F0]/60"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="text-[9px] text-[#FFF8F0]/20 mt-1">
              Strict = must do need first · Moderate = flexible order · Flexible = either alone is fine
            </p>
          </div>

          {/* Suggestion chips */}
          <div>
            <label className={LABEL}>Suggestions</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {Object.entries(BUNDLE_SUGGESTIONS).map(([cat, items]) =>
                items.map((item, i) => (
                  <button
                    key={`${cat}-${i}`}
                    onClick={() => {
                      setNeedDesc(item.need);
                      setWantDesc(item.want);
                      if (item.timeLimit) setWantTimeLimit(String(item.timeLimit));
                    }}
                    className="px-2 py-1 text-[11px] font-mono text-[#FEC89A]/60 bg-[#FEC89A]/[0.06] border border-[#FEC89A]/[0.12] rounded-lg hover:bg-[#FEC89A]/[0.12] transition-colors"
                    title={item.tip}
                  >
                    {item.need.slice(0, 20)}...
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Preview */}
          {previewStatement && (
            <div className="p-3 bg-[#34D399]/[0.05] border border-[#34D399]/[0.15] rounded-xl">
              <p className={LABEL}>Preview</p>
              <p className="text-[12px] text-[#34D399]/80 font-mono mt-1 italic">
                &ldquo;{previewStatement}&rdquo;
              </p>
              {previewStrength && (
                <p className="text-[10px] font-mono text-[#FFF8F0]/30 mt-1">
                  Strength: {previewStrength.score}/100 ({previewStrength.level})
                </p>
              )}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={isPending || !needDesc.trim() || !wantDesc.trim()}
            className={`${BTN} w-full disabled:opacity-30`}
          >
            {isPending ? "Creating..." : "Create Bundle"}
          </button>
        </div>
      )}

      {/* Bundle cards */}
      {bundles.map((b) => (
        <BundleCard
          key={b.id}
          bundle={b}
          onOutcome={handleOutcome}
          onDelete={handleDelete}
          isPending={isPending}
        />
      ))}
    </div>
  );
}

// ─── Bundle Card ───

function BundleCard({
  bundle: b,
  onOutcome,
  onDelete,
  isPending,
}: {
  bundle: Bundle;
  onOutcome: (id: string, o: "full_bundle" | "need_only" | "cheated" | "skipped") => void;
  onDelete: (id: string) => void;
  isPending: boolean;
}) {
  const statement = b.bundleStatement || buildBundleStatement(b.needDescription, b.wantDescription, b.wantTimeLimit);
  const strength = calculateBundleStrength(b);

  return (
    <div className="p-4 bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl space-y-3">
      {/* Need → Want visual */}
      <div className="flex items-center gap-3">
        {/* Need */}
        <div className="flex-1 p-3 bg-[#FFF8F0]/[0.03] rounded-xl">
          <p className="text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider mb-1">
            Need
          </p>
          <p className="text-sm text-[#FFF8F0]/80">
            {getNeedIcon(b.needCategory)} {b.needDescription}
          </p>
          {b.needEstimatedMinutes && (
            <p className="text-[10px] font-mono text-[#FFF8F0]/30 mt-1">
              ~{b.needEstimatedMinutes} min
            </p>
          )}
        </div>

        {/* Lock */}
        <div className="flex flex-col items-center gap-0.5 text-[#FFF8F0]/20">
          <span className="text-lg">{b.strictness === "strict" ? "🔒" : "🔓"}</span>
          <span className="text-[10px]">&rarr;</span>
        </div>

        {/* Want */}
        <div className="flex-1 p-3 bg-[#FFF8F0]/[0.03] rounded-xl">
          <p className="text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider mb-1">
            Want
          </p>
          <p className="text-sm text-[#FFF8F0]/80">
            {getWantIcon(b.wantCategory)} {b.wantDescription}
          </p>
          {b.wantTimeLimit && (
            <p className="text-[10px] font-mono text-[#FFF8F0]/30 mt-1">
              {b.wantTimeLimit} min limit
            </p>
          )}
        </div>
      </div>

      {/* Statement */}
      <p className="text-[12px] text-[#FEC89A]/60 font-mono italic">
        &ldquo;{statement}&rdquo;
      </p>

      {/* Badges + stats row */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-mono capitalize ${
          b.strictness === "strict"
            ? "bg-[#FF6B6B]/10 text-[#FF6B6B]/70"
            : b.strictness === "moderate"
              ? "bg-[#FEC89A]/10 text-[#FEC89A]/70"
              : "bg-[#34D399]/10 text-[#34D399]/70"
        }`}>
          {b.strictness}
        </span>
        <span className="text-[10px] font-mono text-[#FFF8F0]/30">
          Strength: {strength.score}
        </span>
        <span className="text-[10px] font-mono text-[#34D399]/50">
          ✅{b.timesCompleted}
        </span>
        <span className="text-[10px] font-mono text-[#FEC89A]/50">
          ⭐{b.timesNeedOnly}
        </span>
        <span className="text-[10px] font-mono text-[#FF6B6B]/50">
          ⚠️{b.timesCheated}
        </span>
        <span className="text-[10px] font-mono text-[#FFF8F0]/30">
          ⏭️{b.timesSkipped}
        </span>
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {([
          { label: "✅ Full Bundle", outcome: "full_bundle" as const },
          { label: "⭐ Need Only", outcome: "need_only" as const },
          { label: "⚠️ Cheated", outcome: "cheated" as const },
          { label: "⏭️ Skipped", outcome: "skipped" as const },
        ]).map((a) => (
          <button
            key={a.outcome}
            onClick={() => onOutcome(b.id, a.outcome)}
            disabled={isPending}
            className="px-2 py-1 text-[11px] font-mono text-[#FFF8F0]/40 bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-lg hover:bg-[#FFF8F0]/[0.06] transition-colors disabled:opacity-30"
          >
            {a.label}
          </button>
        ))}
        <button
          onClick={() => onDelete(b.id)}
          disabled={isPending}
          className="ml-auto px-2 py-1 text-[11px] font-mono text-[#FF6B6B]/40 hover:text-[#FF6B6B]/70 transition-colors disabled:opacity-30"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

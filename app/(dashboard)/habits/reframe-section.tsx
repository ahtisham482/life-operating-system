"use client";

import { useState, useTransition } from "react";
import type { Reframe } from "@/lib/attraction";
import {
  normalizeOldFrame,
  normalizeNewFrame,
  identifyDeeperMotive,
  getReframeSuggestions,
} from "@/lib/attraction";
import {
  createReframe,
  deleteReframe,
  logReframeResponse,
} from "./attraction-actions";
import { EmptyState } from "./empty-state";

interface ReframeSectionProps {
  reframes: Reframe[];
  onRefresh: () => void;
}

const INPUT =
  "mt-1 w-full px-3 py-2 bg-[#FFF8F0]/[0.05] border border-[#FFF8F0]/[0.08] rounded-xl text-sm text-[#FFF8F0] placeholder:text-[#FFF8F0]/20 focus:outline-none focus:border-[#FF6B6B]/40";
const LABEL = "text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider";
const BTN =
  "px-4 py-2 bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 rounded-xl text-[11px] font-mono uppercase tracking-wider hover:bg-[#FF6B6B]/30 transition-colors";

export function ReframeSection({ reframes, onRefresh }: ReframeSectionProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [habitDesc, setHabitDesc] = useState("");
  const [oldFrame, setOldFrame] = useState("I HAVE to ...");
  const [newFrame, setNewFrame] = useState("I GET to ...");
  const [whyTrue, setWhyTrue] = useState("");
  const [gratitude, setGratitude] = useState("");

  const suggestions = habitDesc.trim().length > 2 ? getReframeSuggestions(habitDesc) : [];
  const motive = habitDesc.trim() ? identifyDeeperMotive(habitDesc) : null;

  function resetForm() {
    setHabitDesc("");
    setOldFrame("I HAVE to ...");
    setNewFrame("I GET to ...");
    setWhyTrue("");
    setGratitude("");
    setShowCreate(false);
  }

  function handleCreate() {
    if (!oldFrame.trim() || !newFrame.trim()) return;
    startTransition(async () => {
      await createReframe({
        habitDescription: habitDesc.trim() || undefined,
        oldFrame: normalizeOldFrame(oldFrame),
        newFrame: normalizeNewFrame(newFrame),
        whyTrue: whyTrue.trim() || undefined,
        gratitudeAnchor: gratitude.trim() || undefined,
      });
      resetForm();
      onRefresh();
    });
  }

  function handleResponse(reframeId: string, response: "helped" | "dismissed") {
    startTransition(async () => {
      await logReframeResponse(reframeId, response);
      onRefresh();
    });
  }

  function handleDelete(reframeId: string) {
    startTransition(async () => {
      await deleteReframe(reframeId);
      onRefresh();
    });
  }

  // Empty state
  if (reframes.length === 0 && !showCreate) {
    return (
      <EmptyState
        icon="🧠"
        title="Shift from 'have to' → 'get to'"
        description="Every hard habit can be reframed as a privilege. When you change how you FEEL about a habit, you change whether you'll do it."
        principle="The same facts can be framed as burden or opportunity. The frame determines the behavior."
        actionLabel="Create first reframe"
        onAction={() => setShowCreate(true)}
        compact
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <button onClick={() => setShowCreate(!showCreate)} className={BTN}>
        {showCreate ? "Cancel" : "+ Create Reframe"}
      </button>

      {/* Create form */}
      {showCreate && (
        <div className="p-4 bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl space-y-4">
          <div>
            <label className={LABEL}>What habit is this for?</label>
            <input
              className={INPUT}
              placeholder="e.g. exercise, study, wake up early"
              value={habitDesc}
              onChange={(e) => setHabitDesc(e.target.value)}
            />
          </div>

          {/* Suggestion chips */}
          {suggestions.length > 0 && habitDesc.trim().length > 2 && (
            <div>
              <label className={LABEL}>Suggestions</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setOldFrame(s.old);
                      setNewFrame(s.new_);
                      setWhyTrue(s.whyTrue);
                      setGratitude(s.gratitude);
                    }}
                    className="px-2 py-1 text-[11px] font-mono text-[#FEC89A]/60 bg-[#FEC89A]/[0.06] border border-[#FEC89A]/[0.12] rounded-lg hover:bg-[#FEC89A]/[0.12] transition-colors"
                  >
                    {s.new_.slice(0, 35)}...
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className={LABEL}>Old frame</label>
            <input
              className={INPUT}
              placeholder="I HAVE to ..."
              value={oldFrame}
              onChange={(e) => setOldFrame(e.target.value)}
            />
          </div>
          <div>
            <label className={LABEL}>New frame</label>
            <input
              className={INPUT}
              placeholder="I GET to ..."
              value={newFrame}
              onChange={(e) => setNewFrame(e.target.value)}
            />
          </div>
          <div>
            <label className={LABEL}>Why is this TRUE?</label>
            <textarea
              className={`${INPUT} min-h-[60px] resize-none`}
              placeholder="Find the genuine reason this reframe is true..."
              value={whyTrue}
              onChange={(e) => setWhyTrue(e.target.value)}
            />
          </div>
          <div>
            <label className={LABEL}>Gratitude anchor</label>
            <input
              className={INPUT}
              placeholder="Think of someone who'd love to be in your position"
              value={gratitude}
              onChange={(e) => setGratitude(e.target.value)}
            />
          </div>

          {/* Deeper motive pill */}
          {motive && (
            <div className="flex items-center gap-2 px-3 py-2 bg-[#34D399]/[0.05] border border-[#34D399]/[0.12] rounded-xl">
              <span className="text-[10px] font-mono text-[#34D399]/60 uppercase tracking-wider">
                Deeper motive:
              </span>
              <span className="text-[11px] font-mono text-[#34D399]/80 capitalize">
                {motive.motive}
              </span>
              <span className="text-[10px] font-mono text-[#FFF8F0]/30 ml-1">
                &mdash; {motive.insight}
              </span>
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={isPending || !oldFrame.trim() || !newFrame.trim()}
            className={`${BTN} w-full disabled:opacity-30`}
          >
            {isPending ? "Creating..." : "Create Reframe"}
          </button>
        </div>
      )}

      {/* Reframe cards */}
      {reframes.map((r) => (
        <ReframeCard
          key={r.id}
          reframe={r}
          onResponse={handleResponse}
          onDelete={handleDelete}
          isPending={isPending}
        />
      ))}
    </div>
  );
}

// ─── Reframe Card ───

function ReframeCard({
  reframe: r,
  onResponse,
  onDelete,
  isPending,
}: {
  reframe: Reframe;
  onResponse: (id: string, response: "helped" | "dismissed") => void;
  onDelete: (id: string) => void;
  isPending: boolean;
}) {
  const motive = r.habitDescription ? identifyDeeperMotive(r.habitDescription) : null;

  return (
    <div className="p-4 bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl space-y-3">
      {/* Old frame - strikethrough */}
      <p className="text-sm text-[#FFF8F0]/30 line-through font-mono">
        {r.oldFrame}
      </p>

      {/* New frame - highlighted */}
      <p className="text-sm text-[#34D399]/80 font-mono">
        ✨ {r.newFrame}
      </p>

      {/* Why true */}
      {r.whyTrue && (
        <p className="text-[11px] text-[#FFF8F0]/40 font-mono leading-relaxed">
          {r.whyTrue}
        </p>
      )}

      {/* Gratitude anchor */}
      {r.gratitudeAnchor && (
        <p className="text-[11px] text-[#FEC89A]/50 font-mono">
          🙏 {r.gratitudeAnchor}
        </p>
      )}

      {/* Identity connection */}
      {r.identityConnection && (
        <p className="text-[11px] text-[#FF6B6B]/50 font-mono italic">
          {r.identityConnection}
        </p>
      )}

      {/* Deeper motive badge */}
      {motive && (
        <span className="inline-block px-2 py-0.5 rounded-lg text-[10px] font-mono bg-[#34D399]/10 text-[#34D399]/60 capitalize">
          {motive.motive}
        </span>
      )}

      {/* Stats + actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[10px] font-mono text-[#FFF8F0]/25">
          Shown: {r.timesShown}
        </span>
        <span className="text-[10px] font-mono text-[#34D399]/40">
          Helped: {r.timesHelped}
        </span>
        <span className="text-[10px] font-mono text-[#FF6B6B]/40">
          Dismissed: {r.timesDismissed}
        </span>

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => onResponse(r.id, "helped")}
            disabled={isPending}
            className="px-2 py-1 text-[11px] font-mono text-[#34D399]/50 bg-[#34D399]/[0.05] border border-[#34D399]/[0.12] rounded-lg hover:bg-[#34D399]/[0.1] transition-colors disabled:opacity-30"
          >
            👍 Helped
          </button>
          <button
            onClick={() => onResponse(r.id, "dismissed")}
            disabled={isPending}
            className="px-2 py-1 text-[11px] font-mono text-[#FFF8F0]/30 bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-lg hover:bg-[#FFF8F0]/[0.06] transition-colors disabled:opacity-30"
          >
            👎 Dismiss
          </button>
          <button
            onClick={() => onDelete(r.id)}
            disabled={isPending}
            className="px-2 py-1 text-[11px] font-mono text-[#FF6B6B]/40 hover:text-[#FF6B6B]/70 transition-colors disabled:opacity-30"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

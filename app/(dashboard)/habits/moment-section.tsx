"use client";

import { useState, useTransition } from "react";
import type { DecisiveMoment } from "@/lib/friction";
import { MOMENT_SUGGESTIONS } from "@/lib/friction";
import {
  createDecisiveMoment,
  deleteDecisiveMoment,
  logMomentOutcome,
} from "./friction-actions";

interface MomentSectionProps {
  moments: DecisiveMoment[];
  onRefresh: () => void;
}

const INPUT =
  "mt-1 w-full px-3 py-2 bg-[#FFF8F0]/[0.05] border border-[#FFF8F0]/[0.08] rounded-xl text-sm text-[#FFF8F0] placeholder:text-[#FFF8F0]/20 focus:outline-none focus:border-[#FF6B6B]/40";
const LABEL = "text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider";
const BTN =
  "px-4 py-2 bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 rounded-xl text-[11px] font-mono uppercase tracking-wider hover:bg-[#FF6B6B]/30 transition-colors";

export function MomentSection({ moments, onRefresh }: MomentSectionProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [productivePath, setProductivePath] = useState("");
  const [productiveOutcome, setProductiveOutcome] = useState("");
  const [destructivePath, setDestructivePath] = useState("");
  const [destructiveOutcome, setDestructiveOutcome] = useState("");
  const [preDecision, setPreDecision] = useState("");
  const [cue, setCue] = useState("");

  function resetForm() {
    setName(""); setTrigger(""); setTime(""); setLocation("");
    setProductivePath(""); setProductiveOutcome("");
    setDestructivePath(""); setDestructiveOutcome("");
    setPreDecision(""); setCue(""); setShowCreate(false);
  }

  function fillSuggestion(s: typeof MOMENT_SUGGESTIONS[number]) {
    setName(s.name);
    setTrigger(s.trigger);
    setTime(s.time);
    setProductivePath(s.productive);
    setDestructivePath(s.destructive);
    setPreDecision(s.preDecision);
    setShowCreate(true);
  }

  function handleCreate() {
    if (!name.trim() || !productivePath.trim() || !destructivePath.trim()) return;
    startTransition(async () => {
      await createDecisiveMoment({
        momentName: name.trim(),
        momentTrigger: trigger.trim() || undefined,
        momentTime: time.trim() || undefined,
        momentLocation: location.trim() || undefined,
        productivePath: productivePath.trim(),
        productiveOutcome: productiveOutcome.trim() || undefined,
        destructivePath: destructivePath.trim(),
        destructiveOutcome: destructiveOutcome.trim() || undefined,
        preDecision: preDecision.trim() || undefined,
        preDecisionCue: cue.trim() || undefined,
      });
      resetForm();
      onRefresh();
    });
  }

  if (moments.length === 0 && !showCreate) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 space-y-4">
          <p className="text-[32px]">🔀</p>
          <p className="text-sm text-[#FFF8F0]/50">
            Map the fork in the road before you reach it.
          </p>
        </div>
        <div className="space-y-2">
          <p className={LABEL}>Quick Templates</p>
          {MOMENT_SUGGESTIONS.map((s, i) => (
            <button key={i} onClick={() => fillSuggestion(s)} className="w-full text-left px-4 py-3 bg-[#FFF8F0]/[0.02] border border-[#FFF8F0]/[0.06] rounded-xl hover:bg-[#FFF8F0]/[0.05] transition-colors">
              <p className="text-[12px] text-[#FFF8F0]/70">{s.name}</p>
              <p className="text-[10px] font-mono text-[#FFF8F0]/30 mt-0.5">{s.trigger}</p>
            </button>
          ))}
        </div>
        <button onClick={() => setShowCreate(true)} className={BTN}>
          + Custom Moment
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!showCreate && (
        <button onClick={() => setShowCreate(true)} className={BTN}>
          + New Moment
        </button>
      )}

      {showCreate && (
        <div className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-5 space-y-3">
          {/* Suggestions row */}
          <div className="flex gap-1.5 flex-wrap">
            {MOMENT_SUGGESTIONS.map((s, i) => (
              <button key={i} onClick={() => fillSuggestion(s)} className="px-2 py-1 text-[10px] font-mono text-[#FEC89A]/60 border border-[#FEC89A]/20 rounded-lg hover:bg-[#FEC89A]/10 transition-colors">
                {s.name}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Moment Name</label>
              <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Coming home from work" />
            </div>
            <div>
              <label className={LABEL}>Trigger</label>
              <input className={INPUT} value={trigger} onChange={(e) => setTrigger(e.target.value)} placeholder="What starts the decision?" />
            </div>
            <div>
              <label className={LABEL}>Time</label>
              <input className={INPUT} value={time} onChange={(e) => setTime(e.target.value)} placeholder="e.g. 17:30" />
            </div>
            <div>
              <label className={LABEL}>Location</label>
              <input className={INPUT} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Where does this happen?" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Productive Path</label>
              <input className={INPUT} value={productivePath} onChange={(e) => setProductivePath(e.target.value)} placeholder="The good choice..." />
              <input className={INPUT} value={productiveOutcome} onChange={(e) => setProductiveOutcome(e.target.value)} placeholder="Outcome" />
            </div>
            <div>
              <label className={LABEL}>Destructive Path</label>
              <input className={INPUT} value={destructivePath} onChange={(e) => setDestructivePath(e.target.value)} placeholder="The bad default..." />
              <input className={INPUT} value={destructiveOutcome} onChange={(e) => setDestructiveOutcome(e.target.value)} placeholder="Outcome" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Pre-Decision</label>
              <input className={INPUT} value={preDecision} onChange={(e) => setPreDecision(e.target.value)} placeholder="When [trigger], I will..." />
            </div>
            <div>
              <label className={LABEL}>Environmental Cue</label>
              <input className={INPUT} value={cue} onChange={(e) => setCue(e.target.value)} placeholder="What makes the good path visible?" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleCreate} disabled={isPending} className={BTN}>
              {isPending ? "Creating..." : "Create Moment"}
            </button>
            <button onClick={resetForm} className="px-4 py-2 text-[11px] font-mono text-[#FFF8F0]/30 hover:text-[#FFF8F0]/60 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {moments.map((m) => (
        <MomentCard key={m.id} moment={m} onRefresh={onRefresh} />
      ))}
    </div>
  );
}

/* ── Moment Card ── */

function MomentCard({ moment: m, onRefresh }: { moment: DecisiveMoment; onRefresh: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [showLogExtras, setShowLogExtras] = useState(false);
  const [wasPreDecided, setWasPreDecided] = useState(false);
  const [envReady, setEnvReady] = useState(false);
  const [autopilot, setAutopilot] = useState(false);

  const rate = m.timesFaced > 0 ? Math.round(m.productiveRate * 100) : 0;
  const importanceColor = m.importanceLevel === "critical" ? "#FF6B6B" : m.importanceLevel === "high" ? "#FEC89A" : "#FFF8F0";

  function handleLog(path: "productive" | "destructive") {
    startTransition(async () => {
      await logMomentOutcome({
        momentId: m.id,
        pathChosen: path,
        wasPreDecided: wasPreDecided || undefined,
        environmentWasReady: envReady || undefined,
        autopilot: autopilot || undefined,
      });
      setShowLogExtras(false);
      setWasPreDecided(false);
      setEnvReady(false);
      setAutopilot(false);
      onRefresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteDecisiveMoment(m.id);
      onRefresh();
    });
  }

  return (
    <div className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-[#FFF8F0]">{m.momentName}</h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border" style={{ color: importanceColor, borderColor: importanceColor + "44" }}>
            {m.importanceLevel}
          </span>
          {m.timesFaced > 0 && (
            <span className={`text-[10px] font-mono ${rate >= 60 ? "text-[#34D399]" : rate >= 40 ? "text-[#FEC89A]" : "text-[#FF6B6B]"}`}>
              {rate}%
            </span>
          )}
        </div>
        <button onClick={handleDelete} disabled={isPending} className="text-[10px] font-mono text-[#FFF8F0]/20 hover:text-[#FF6B6B] transition-colors">
          delete
        </button>
      </div>

      {/* Fork visual */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-start">
        <div className="bg-[#34D399]/[0.06] border border-[#34D399]/15 rounded-xl p-3 space-y-1">
          <p className="text-[10px] font-mono text-[#34D399]/70">Productive</p>
          <p className="text-[12px] text-[#FFF8F0]/70">{m.productivePath}</p>
          {m.productiveOutcome && (
            <p className="text-[10px] text-[#34D399]/50">{m.productiveOutcome}</p>
          )}
        </div>
        <div className="flex items-center justify-center pt-4">
          <span className="text-lg">🔀</span>
        </div>
        <div className="bg-[#FF6B6B]/[0.06] border border-[#FF6B6B]/15 rounded-xl p-3 space-y-1">
          <p className="text-[10px] font-mono text-[#FF6B6B]/70">Destructive</p>
          <p className="text-[12px] text-[#FFF8F0]/70">{m.destructivePath}</p>
          {m.destructiveOutcome && (
            <p className="text-[10px] text-[#FF6B6B]/50">{m.destructiveOutcome}</p>
          )}
        </div>
      </div>

      {/* Pre-decision */}
      {m.preDecision && (
        <div className="bg-[#FEC89A]/[0.06] border border-[#FEC89A]/15 rounded-xl px-4 py-2">
          <p className="text-[11px] text-[#FEC89A]">
            When {m.momentTrigger || "the moment comes"}, I will {m.preDecision}
          </p>
        </div>
      )}

      {m.identityQuestion && (
        <p className="text-[11px] italic text-[#FFF8F0]/30">&ldquo;{m.identityQuestion}&rdquo;</p>
      )}

      {/* Log buttons */}
      {!showLogExtras ? (
        <div className="flex gap-2">
          <button onClick={() => setShowLogExtras(true)} className="px-3 py-2 bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/25 rounded-xl text-[11px] font-mono hover:bg-[#34D399]/25 transition-colors">
            Productive
          </button>
          <button onClick={() => handleLog("destructive")} disabled={isPending} className="px-3 py-2 bg-[#FF6B6B]/15 text-[#FF6B6B] border border-[#FF6B6B]/25 rounded-xl text-[11px] font-mono hover:bg-[#FF6B6B]/25 transition-colors">
            Destructive
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {[
              { label: "Pre-decided", value: wasPreDecided, set: setWasPreDecided },
              { label: "Env ready", value: envReady, set: setEnvReady },
              { label: "Autopilot", value: autopilot, set: setAutopilot },
            ].map((t) => (
              <button key={t.label} onClick={() => t.set(!t.value)} className={`px-3 py-1.5 rounded-lg text-[11px] font-mono border transition-colors ${t.value ? "bg-[#34D399]/20 text-[#34D399] border-[#34D399]/30" : "text-[#FFF8F0]/30 border-[#FFF8F0]/[0.06]"}`}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleLog("productive")} disabled={isPending} className={BTN}>
              {isPending ? "Saving..." : "Log Productive"}
            </button>
            <button onClick={() => setShowLogExtras(false)} className="text-[11px] font-mono text-[#FFF8F0]/30">cancel</button>
          </div>
        </div>
      )}

      {/* Stats */}
      {m.timesFaced > 0 && (
        <div className="flex items-center gap-4">
          <div className="flex-1 h-1.5 bg-[#FFF8F0]/[0.05] rounded-full overflow-hidden">
            <div className="h-full bg-[#34D399] rounded-full transition-all" style={{ width: `${rate}%` }} />
          </div>
          <div className="flex gap-3 text-[10px] font-mono text-[#FFF8F0]/30">
            <span>🔥 {m.currentProductiveStreak}</span>
            <span>{m.timesFaced}x faced</span>
          </div>
        </div>
      )}
    </div>
  );
}

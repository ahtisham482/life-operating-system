"use client";

import { useState, useTransition, useEffect } from "react";
import {
  Blueprint,
  generateTwoMinute,
  detectBlueprintCategory,
  getCategoryIcon,
  buildIntentionStatement,
  buildStackStatement,
  calculateCompleteness,
  getCompletenessBreakdown,
  getEnvironmentSuggestions,
} from "@/lib/architect";
import { createBlueprint } from "./architect-actions";
import { MultiInput } from "./multi-input";

interface BlueprintWizardProps {
  onCreated?: () => void;
  onClose: () => void;
  existingBlueprints: Blueprint[];
  identities: { id: string; identityStatement: string }[];
}

type QualityLevel = "vague" | "partial" | "specific" | "excellent";

const qualityColors: Record<QualityLevel, string> = {
  vague: "#9CA3AF", partial: "#FEC89A", specific: "#FF6B6B", excellent: "#34D399",
};

function getQuality(b: string, t: string, l: string): QualityLevel {
  const n = [b, t, l].filter(Boolean).length;
  return n === 0 ? "vague" : n === 1 ? "partial" : n === 2 ? "specific" : "excellent";
}

const INPUT = "mt-1 w-full px-3 py-2 bg-[#FFF8F0]/[0.05] border border-[#FFF8F0]/[0.08] rounded-xl text-sm text-[#FFF8F0] placeholder:text-[#FFF8F0]/20 focus:outline-none focus:border-[#FF6B6B]/40";
const LABEL = "text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider";

export function BlueprintWizard({ onCreated, onClose, existingBlueprints, identities }: BlueprintWizardProps) {
  const [step, setStep] = useState(0);
  const [isPending, startTransition] = useTransition();

  const [habitName, setHabitName] = useState("");
  const [twoMinuteVersion, setTwoMinuteVersion] = useState("");
  const [fullVersion, setFullVersion] = useState("");
  const [identityId, setIdentityId] = useState("");

  const [intentionBehavior, setIntentionBehavior] = useState("");
  const [intentionTime, setIntentionTime] = useState("");
  const [intentionLocation, setIntentionLocation] = useState("");

  const [stackType, setStackType] = useState<"none" | "after" | "before">("none");
  const [stackAnchorDescription, setStackAnchorDescription] = useState("");
  const [stackAnchorBlueprintId, setStackAnchorBlueprintId] = useState("");

  const [environmentCue, setEnvironmentCue] = useState("");
  const [frictionRemovals, setFrictionRemovals] = useState<string[]>([]);
  const [frictionAdditions, setFrictionAdditions] = useState<string[]>([]);
  const [designatedSpace, setDesignatedSpace] = useState("");
  const [frRemInput, setFrRemInput] = useState("");
  const [frAddInput, setFrAddInput] = useState("");

  const category = detectBlueprintCategory(habitName);
  const suggestions = getEnvironmentSuggestions(category);

  useEffect(() => {
    if (habitName) {
      setTwoMinuteVersion(generateTwoMinute(habitName));
      if (!intentionBehavior) setIntentionBehavior(habitName);
    }
  }, [habitName]); // eslint-disable-line react-hooks/exhaustive-deps

  const intentionStmt = buildIntentionStatement(intentionBehavior, intentionTime || null, intentionLocation || null);
  const stackStmt = stackType !== "none" && stackAnchorDescription
    ? buildStackStatement(stackType, stackAnchorDescription, intentionBehavior || habitName) : "";
  const quality = getQuality(intentionBehavior, intentionTime, intentionLocation);

  const partial: Partial<Blueprint> = {
    habitName, twoMinuteVersion: twoMinuteVersion || undefined, fullVersion: fullVersion || undefined,
    intentionBehavior, intentionTime: intentionTime || undefined, intentionLocation: intentionLocation || undefined,
    stackType, stackAnchorDescription: stackAnchorDescription || undefined,
    environmentCue: environmentCue || undefined, frictionRemovals, frictionAdditions,
    designatedSpace: designatedSpace || undefined, identityId: identityId || undefined,
  };
  const completeness = calculateCompleteness(partial);
  const breakdown = getCompletenessBreakdown(partial);

  function handleCreate() {
    startTransition(async () => {
      await createBlueprint({
        habitName, twoMinuteVersion: twoMinuteVersion || undefined, fullVersion: fullVersion || undefined,
        identityId: identityId || undefined,
        intentionBehavior, intentionTime: intentionTime || undefined, intentionLocation: intentionLocation || undefined,
        stackType,
        stackAnchorBlueprintId: stackAnchorBlueprintId || undefined,
        stackAnchorDescription: stackAnchorDescription || undefined,
        environmentCue: environmentCue || undefined, frictionRemovals, frictionAdditions,
        designatedSpace: designatedSpace || undefined, habitCategory: category || undefined,
      });
      onCreated?.();
      onClose();
    });
  }

  const canNext = step === 0 ? !!habitName : step === 1 ? !!intentionBehavior : true;
  const stepLabels = ["The Habit", "When & Where", "Stacking", "Environment", "Review"];
  const badgeColor = completeness >= 70 ? "#34D399" : "#FEC89A";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg bg-[#1a1a1a] border border-[#FFF8F0]/[0.08] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#FFF8F0]/[0.06]">
          <h2 className="text-sm font-serif text-[#FFF8F0]/90">Blueprint Wizard</h2>
          <button onClick={onClose} className="text-[#FFF8F0]/30 hover:text-[#FFF8F0]/60 text-sm">✕</button>
        </div>

        {/* Steps */}
        <div className="flex gap-1 px-5 pt-4">
          {stepLabels.map((l, i) => (
            <div key={l} className="flex-1">
              <div className={`h-1 rounded-full transition-all ${i <= step ? "bg-[#FF6B6B]/60" : "bg-[#FFF8F0]/[0.06]"}`} />
              <p className={`text-[9px] font-mono mt-1 uppercase tracking-wider ${i === step ? "text-[#FF6B6B]/80" : "text-[#FFF8F0]/20"}`}>{l}</p>
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {step === 0 && <>
            <div><label className={LABEL}>Habit Name *</label>
              <input value={habitName} onChange={(e) => setHabitName(e.target.value)} placeholder="e.g. Read for 20 minutes" className={INPUT} />
              {habitName && <span className="inline-block mt-2 px-2.5 py-1 rounded-full text-[10px] font-mono" style={{ background: "#34D39920", color: "#34D399" }}>{getCategoryIcon(category)} {category}</span>}
            </div>
            <div><label className={LABEL}>2-Minute Version</label><input value={twoMinuteVersion} onChange={(e) => setTwoMinuteVersion(e.target.value)} className={INPUT} /></div>
            <div><label className={LABEL}>Full Version (optional)</label><input value={fullVersion} onChange={(e) => setFullVersion(e.target.value)} placeholder="e.g. Read 30 pages of non-fiction" className={INPUT} /></div>
            {identities.length > 0 && <div><label className={LABEL}>Link to Identity</label>
              <select value={identityId} onChange={(e) => setIdentityId(e.target.value)} className={INPUT}>
                <option value="">None</option>
                {identities.map((id) => <option key={id.id} value={id.id}>{id.identityStatement}</option>)}
              </select></div>}
          </>}

          {step === 1 && <>
            <div><label className={LABEL}>Behavior (what exactly?) *</label><input value={intentionBehavior} onChange={(e) => setIntentionBehavior(e.target.value)} className={INPUT} /></div>
            <div><label className={LABEL}>Time</label><input type="time" value={intentionTime} onChange={(e) => setIntentionTime(e.target.value)} className={INPUT} /></div>
            <div><label className={LABEL}>Location</label><input value={intentionLocation} onChange={(e) => setIntentionLocation(e.target.value)} placeholder="e.g. my bedroom" className={INPUT} /></div>
            <div className="p-3 bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-xl">
              <p className={LABEL + " mb-1"}>Live Preview</p>
              <p className="text-sm text-[#FFF8F0]/80 italic font-serif">&ldquo;{intentionStmt}&rdquo;</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: qualityColors[quality] }} />
              <span className="text-[11px] font-mono uppercase tracking-wider" style={{ color: qualityColors[quality] }}>{quality}</span>
            </div>
          </>}

          {step === 2 && <>
            <p className="text-[11px] text-[#FFF8F0]/40 font-mono">Link this habit to an existing one so it triggers automatically.</p>
            <div className="flex gap-2">
              {(["none", "after", "before"] as const).map((t) => (
                <button key={t} onClick={() => setStackType(t)} className={`px-3 py-1.5 rounded-xl text-[11px] font-mono uppercase tracking-wider border transition-all ${stackType === t ? "bg-[#FF6B6B]/20 text-[#FF6B6B] border-[#FF6B6B]/30" : "text-[#FFF8F0]/30 border-[#FFF8F0]/[0.08]"}`}>{t === "none" ? "Skip" : t}</button>
              ))}
            </div>
            {stackType !== "none" && <>
              <div><label className={LABEL}>{stackType === "after" ? "After I ___" : "Before I ___"}</label>
                <input value={stackAnchorDescription} onChange={(e) => setStackAnchorDescription(e.target.value)} placeholder="e.g. pour my morning coffee" className={INPUT} /></div>
              {existingBlueprints.length > 0 && <div><label className={LABEL}>Or pick an existing blueprint</label>
                <select value={stackAnchorBlueprintId} onChange={(e) => { setStackAnchorBlueprintId(e.target.value); const bp = existingBlueprints.find((b) => b.id === e.target.value); if (bp) setStackAnchorDescription(bp.habitName); }} className={INPUT}>
                  <option value="">Select...</option>
                  {existingBlueprints.map((bp) => <option key={bp.id} value={bp.id}>{bp.habitName}</option>)}
                </select></div>}
              {stackStmt && <div className="p-3 bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-xl">
                <p className={LABEL + " mb-1"}>Live Preview</p>
                <p className="text-sm text-[#FFF8F0]/80 italic font-serif">&ldquo;{stackStmt}&rdquo;</p>
              </div>}
            </>}
          </>}

          {step === 3 && <>
            <div><label className={LABEL}>Visual Cue</label>
              <input value={environmentCue} onChange={(e) => setEnvironmentCue(e.target.value)} placeholder="e.g. Book on my pillow" className={INPUT} />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {suggestions.cues.map((s) => <button key={s} onClick={() => setEnvironmentCue(s)} className="px-2 py-1 text-[10px] font-mono text-[#FEC89A]/60 bg-[#FEC89A]/[0.08] border border-[#FEC89A]/[0.15] rounded-lg hover:bg-[#FEC89A]/[0.15] transition-colors">{s}</button>)}
              </div>
            </div>
            <MultiInput label="Friction Removals" items={frictionRemovals} inputValue={frRemInput} onInputChange={setFrRemInput} onAdd={() => { if (frRemInput.trim()) { setFrictionRemovals((p) => [...p, frRemInput.trim()]); setFrRemInput(""); } }} onRemove={(i) => setFrictionRemovals((p) => p.filter((_, idx) => idx !== i))} suggestions={suggestions.frictionRemovals} onSuggestionClick={(s) => setFrictionRemovals((p) => [...p, s])} placeholder="e.g. Sleep in workout clothes" />
            <MultiInput label="Friction Additions" items={frictionAdditions} inputValue={frAddInput} onInputChange={setFrAddInput} onAdd={() => { if (frAddInput.trim()) { setFrictionAdditions((p) => [...p, frAddInput.trim()]); setFrAddInput(""); } }} onRemove={(i) => setFrictionAdditions((p) => p.filter((_, idx) => idx !== i))} suggestions={suggestions.frictionAdditions} onSuggestionClick={(s) => setFrictionAdditions((p) => [...p, s])} placeholder="e.g. Put phone in drawer" />
            <div><label className={LABEL}>Designated Space</label><input value={designatedSpace} onChange={(e) => setDesignatedSpace(e.target.value)} placeholder="e.g. Reading corner" className={INPUT} /></div>
          </>}

          {step === 4 && <>
            <div className="p-4 bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">{getCategoryIcon(category)}</span>
                <h3 className="text-sm font-serif text-[#FFF8F0]/90">{habitName}</h3>
                <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-mono" style={{ background: `${badgeColor}20`, color: badgeColor }}>{completeness}/100</span>
              </div>
              {intentionBehavior && <p className="text-[11px] text-[#FFF8F0]/60"><span className="mr-1">🎯</span>{intentionStmt}</p>}
              {stackStmt && <p className="text-[11px] text-[#FFF8F0]/60"><span className="mr-1">⛓️</span>{stackStmt}</p>}
              {environmentCue && <p className="text-[11px] text-[#FFF8F0]/60"><span className="mr-1">🏠</span>{environmentCue}</p>}
              {twoMinuteVersion && <p className="text-[11px] text-[#FFF8F0]/60"><span className="mr-1">🤏</span>{twoMinuteVersion}</p>}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className={LABEL}>Completeness</span>
                <span className="text-[11px] font-mono text-[#FFF8F0]/60">{completeness}%</span>
              </div>
              <div className="h-2 bg-[#FFF8F0]/[0.06] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${completeness}%`, background: badgeColor }} />
              </div>
            </div>
            <div className="space-y-2">
              {breakdown.sections.map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <span className="text-xs">{s.icon}</span>
                  <span className="text-[11px] font-mono text-[#FFF8F0]/50 flex-1">{s.label}</span>
                  <span className="text-[11px] font-mono text-[#FFF8F0]/40">{s.earned}/{s.max}</span>
                </div>
              ))}
            </div>
          </>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-[#FFF8F0]/[0.06]">
          <button onClick={() => (step === 0 ? onClose() : setStep(step - 1))} className="px-4 py-2 text-[11px] font-mono text-[#FFF8F0]/40 hover:text-[#FFF8F0]/60 uppercase tracking-wider">
            {step === 0 ? "Cancel" : "Back"}
          </button>
          {step < 4 ? (
            <button onClick={() => setStep(step + 1)} disabled={!canNext} className="px-5 py-2 bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 rounded-xl text-[11px] font-mono uppercase tracking-wider disabled:opacity-30 hover:bg-[#FF6B6B]/30 transition-colors">Next</button>
          ) : (
            <button onClick={handleCreate} disabled={isPending || !habitName} className="px-5 py-2 bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/30 rounded-xl text-[11px] font-mono uppercase tracking-wider disabled:opacity-30 hover:bg-[#34D399]/30 transition-colors">
              {isPending ? "Creating..." : "Create Blueprint"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

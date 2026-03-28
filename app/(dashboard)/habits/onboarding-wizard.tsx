"use client";

import { useState, useTransition } from "react";
import { ONBOARDING_STEPS, IDENTITY_SUGGESTIONS } from "@/lib/dayone";
import { updateOnboardingStep, skipOnboarding } from "./guide-actions";

interface Props { onComplete: () => void }
type AuditItem = { description: string; rating: "+" | "-" | "=" };
type AuditSection = { label: string; items: AuditItem[] };

const INPUT = "w-full px-4 py-3 bg-[#FFF8F0]/[0.05] border border-[#FFF8F0]/[0.08] rounded-xl text-[#FFF8F0] text-sm placeholder:text-[#FFF8F0]/30 outline-none";
const LABEL = "text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider block";
const BTN = "bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 rounded-xl";
const PREVIEW = "p-4 bg-[#FEC89A]/10 border border-[#FEC89A]/20 rounded-xl";
const CHIP = "px-3 py-1.5 text-[12px] bg-[#FFF8F0]/[0.05] border border-[#FFF8F0]/[0.08] rounded-xl text-[#FFF8F0]/60 hover:text-[#FFF8F0]";

export function OnboardingWizard({ onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [pending, startTransition] = useTransition();
  const [identity, setIdentity] = useState("");
  const [antiIdentity, setAntiIdentity] = useState("");
  const [audit, setAudit] = useState<AuditSection[]>([
    { label: "Morning", items: [] }, { label: "Afternoon", items: [] }, { label: "Evening", items: [] },
  ]);
  const [focusHabits, setFocusHabits] = useState<string[]>([]);
  const [focusInput, setFocusInput] = useState("");
  const [focusWarning, setFocusWarning] = useState("");
  const [intentWhat, setIntentWhat] = useState("");
  const [intentTime, setIntentTime] = useState("");
  const [intentPlace, setIntentPlace] = useState("");
  const [existingHabit, setExistingHabit] = useState("");
  const [newHabitStack, setNewHabitStack] = useState("");
  const [envChecklist, setEnvChecklist] = useState([
    { task: "Put cue for new habit in visible spot", done: false },
    { task: "Prep supplies/tools needed", done: false },
    { task: "Remove distractions from habit space", done: false },
    { task: "Set phone reminder for habit time", done: false },
  ]);
  const [twoMinVersion, setTwoMinVersion] = useState("");
  const [notifTime, setNotifTime] = useState("08:00");
  const [accountability, setAccountability] = useState<"solo" | "tell" | "partner" | "contract">("solo");

  const neutralHabits = audit.flatMap((s) => s.items.filter((i) => i.rating === "=").map((i) => i.description));

  function saveStep(nextStep: number) {
    const d: Record<string, unknown> = {};
    if (step === 1) { d.identity = identity; d.antiIdentity = antiIdentity || undefined; }
    else if (step === 2) d.audit = audit;
    else if (step === 3) d.focusHabits = focusHabits;
    else if (step === 4) d.intention = { what: intentWhat, time: intentTime, place: intentPlace };
    else if (step === 5) d.stack = { existing: existingHabit, new: newHabitStack };
    else if (step === 6) d.environment = envChecklist;
    else if (step === 7) d.twoMinVersion = twoMinVersion;
    else if (step === 8) d.tracking = { notifTime };
    else if (step === 9) d.accountability = accountability;
    else if (step === 10) d.launched = true;
    startTransition(async () => {
      await updateOnboardingStep(nextStep, d);
      if (nextStep > 10) onComplete(); else setStep(nextStep);
    });
  }

  function addAuditItem(sIdx: number) {
    setAudit((p) => p.map((s, i) => i === sIdx ? { ...s, items: [...s.items, { description: "", rating: "=" }] } : s));
  }
  function updateAuditItem(sIdx: number, iIdx: number, field: "description" | "rating", val: string) {
    setAudit((p) => p.map((s, si) => si === sIdx ? { ...s, items: s.items.map((it, ii) => ii === iIdx ? { ...it, [field]: val } : it) } : s));
  }
  function addFocusHabit() {
    if (!focusInput.trim()) return;
    if (focusHabits.length >= 2) { setFocusWarning("Max 2 habits. Master these first."); return; }
    setFocusHabits((p) => [...p, focusInput.trim()]); setFocusInput(""); setFocusWarning("");
  }

  const stepInfo = ONBOARDING_STEPS[step - 1];
  const twoMinSugs = ["Read 1 page", "Do 1 push-up", "Write 1 sentence", "Meditate for 1 breath"];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-1">
        {ONBOARDING_STEPS.map((s) => (
          <button key={s.step} onClick={() => s.step < step && setStep(s.step)} title={s.name}
            className={`flex items-center justify-center w-8 h-8 rounded-full text-[12px] transition-all ${
              s.step === step ? `${BTN}` : s.step < step ? "bg-[#34D399]/20 text-[#34D399]" : "bg-[#FFF8F0]/[0.05] text-[#FFF8F0]/30"
            }`}>{s.icon}</button>
        ))}
      </div>
      <p className={LABEL}>Step {step} of 10 — {stepInfo.name}</p>

      <div className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-6 space-y-5">
        <h2 className="text-xl font-serif text-[#FFF8F0]">{stepInfo.icon} {stepInfo.description}</h2>

        {step === 1 && (
          <div className="space-y-4">
            <label className={LABEL}>I am the type of person who...</label>
            <input value={identity} onChange={(e) => setIdentity(e.target.value)} placeholder="e.g. reads every day" className={`${INPUT} focus:border-[#FF6B6B]/40`} />
            <div className="flex flex-wrap gap-2">
              {IDENTITY_SUGGESTIONS.map((s) => (
                <button key={s.text} onClick={() => setIdentity(s.text)} className={`${CHIP} hover:border-[#FF6B6B]/30`}>{s.icon} {s.text}</button>
              ))}
            </div>
            <label className={LABEL}>Anti-identity (optional)</label>
            <input value={antiIdentity} onChange={(e) => setAntiIdentity(e.target.value)} placeholder="I am NOT the type of person who..." className={`${INPUT} focus:border-[#FF6B6B]/40`} />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {audit.map((sec, sIdx) => (
              <div key={sec.label} className="space-y-2">
                <p className="text-[10px] font-mono text-[#FEC89A]/60 uppercase tracking-wider">{sec.label}</p>
                {sec.items.map((item, iIdx) => (
                  <div key={iIdx} className="flex gap-2 items-center">
                    <input value={item.description} onChange={(e) => updateAuditItem(sIdx, iIdx, "description", e.target.value)} placeholder="What do you do?" className={`flex-1 px-3 py-2 bg-[#FFF8F0]/[0.05] border border-[#FFF8F0]/[0.08] rounded-xl text-[#FFF8F0] text-sm placeholder:text-[#FFF8F0]/30 outline-none`} />
                    {(["+", "=", "-"] as const).map((r) => (
                      <button key={r} onClick={() => updateAuditItem(sIdx, iIdx, "rating", r)}
                        className={`w-8 h-8 rounded-lg text-sm font-mono ${item.rating === r ? (r === "+" ? "bg-[#34D399]/20 text-[#34D399]" : r === "-" ? "bg-[#FF6B6B]/20 text-[#FF6B6B]" : "bg-[#FEC89A]/20 text-[#FEC89A]") : "bg-[#FFF8F0]/[0.05] text-[#FFF8F0]/30"}`}>{r}</button>
                    ))}
                  </div>
                ))}
                <button onClick={() => addAuditItem(sIdx)} className="text-[12px] text-[#FFF8F0]/40 hover:text-[#FFF8F0]/60">+ Add item</button>
              </div>
            ))}
            <p className="pt-2 text-[12px] text-[#FFF8F0]/40">
              Summary: {audit.flatMap((s) => s.items).filter((i) => i.rating === "+").length} positive, {audit.flatMap((s) => s.items).filter((i) => i.rating === "=").length} neutral, {audit.flatMap((s) => s.items).filter((i) => i.rating === "-").length} negative
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-[#FFF8F0]/60">Pick ONE habit to focus on. Max 2.</p>
            <div className="flex gap-2">
              <input value={focusInput} onChange={(e) => setFocusInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addFocusHabit()} placeholder="Type a habit..." className={INPUT} />
              <button onClick={addFocusHabit} className={`px-4 py-3 ${BTN} text-sm`}>Add</button>
            </div>
            {focusWarning && <p className="text-[12px] text-[#FF6B6B]">{focusWarning}</p>}
            {focusHabits.map((h, i) => (
              <div key={i} className="flex items-center gap-2 px-4 py-2 bg-[#34D399]/10 border border-[#34D399]/20 rounded-xl">
                <span className="text-[#34D399] text-sm">🎯 {h}</span>
                <button onClick={() => setFocusHabits((p) => p.filter((_, j) => j !== i))} className="ml-auto text-[#FFF8F0]/30 text-[12px]">remove</button>
              </div>
            ))}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            {[{ l: "I will", v: intentWhat, s: setIntentWhat, p: "meditate" },
              { l: "At", v: intentTime, s: setIntentTime, p: "7:00 AM" },
              { l: "In", v: intentPlace, s: setIntentPlace, p: "my bedroom" }].map((f) => (
              <div key={f.l}>
                <label className={`${LABEL} mb-1`}>{f.l}</label>
                <input value={f.v} onChange={(e) => f.s(e.target.value)} placeholder={f.p} className={INPUT} />
              </div>
            ))}
            {(intentWhat || intentTime || intentPlace) && (
              <div className={PREVIEW}>
                <p className="text-sm text-[#FEC89A] font-serif italic">&quot;I will {intentWhat || "___"} at {intentTime || "___"} in {intentPlace || "___"}.&quot;</p>
              </div>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <label className={LABEL}>After I...</label>
            <select value={existingHabit} onChange={(e) => setExistingHabit(e.target.value)} className={INPUT}>
              <option value="">Select existing habit</option>
              {neutralHabits.map((h) => <option key={h} value={h}>{h}</option>)}
              <option value="__custom">Custom...</option>
            </select>
            {existingHabit === "__custom" && <input onChange={(e) => setExistingHabit(e.target.value)} placeholder="Type existing habit" className={INPUT} />}
            <label className={LABEL}>I will...</label>
            <input value={newHabitStack} onChange={(e) => setNewHabitStack(e.target.value)} placeholder="my new habit" className={INPUT} />
            {existingHabit && newHabitStack && (
              <div className={PREVIEW}><p className="text-sm text-[#FEC89A] font-serif italic">&quot;After I {existingHabit}, I will {newHabitStack}.&quot;</p></div>
            )}
          </div>
        )}

        {step === 6 && (
          <div className="space-y-3">
            <p className="text-sm text-[#FFF8F0]/60">Complete these tonight to set yourself up:</p>
            {envChecklist.map((item, i) => (
              <button key={i} onClick={() => setEnvChecklist((p) => p.map((c, j) => j === i ? { ...c, done: !c.done } : c))}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm transition-all ${item.done ? "bg-[#34D399]/10 border-[#34D399]/20 text-[#34D399]" : "bg-[#FFF8F0]/[0.05] border-[#FFF8F0]/[0.08] text-[#FFF8F0]/60"}`}>
                <span>{item.done ? "✅" : "⬜"}</span><span>{item.task}</span>
              </button>
            ))}
          </div>
        )}

        {step === 7 && (
          <div className="space-y-4">
            <div className="p-4 bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-xl">
              <p className="text-sm text-[#FFF8F0]/60">The 2-Minute Rule: scale any habit down to 2 minutes or less. A new habit should feel easy.</p>
            </div>
            <label className={LABEL}>What is the minimum version?</label>
            <input value={twoMinVersion} onChange={(e) => setTwoMinVersion(e.target.value)} placeholder="e.g. Open the book and read one page" className={INPUT} />
            {focusHabits.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {twoMinSugs.map((s) => <button key={s} onClick={() => setTwoMinVersion(s)} className={CHIP}>{s}</button>)}
              </div>
            )}
          </div>
        )}

        {step === 8 && (
          <div className="space-y-4">
            <p className="text-sm text-[#FFF8F0]/60">Your visual chain starts now. Never break the chain.</p>
            <div className="flex gap-1">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className={`w-8 h-8 rounded-lg ${i < 3 ? "bg-[#34D399]/30" : "bg-[#FFF8F0]/[0.05]"}`} />
              ))}
            </div>
            <label className={LABEL}>Reminder time</label>
            <input type="time" value={notifTime} onChange={(e) => setNotifTime(e.target.value)} className={`${INPUT} w-auto`} />
          </div>
        )}

        {step === 9 && (
          <div className="space-y-4">
            {(["solo", "tell", "partner", "contract"] as const).map((lv) => (
              <button key={lv} onClick={() => setAccountability(lv)}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${accountability === lv ? `${BTN}` : "bg-[#FFF8F0]/[0.05] border-[#FFF8F0]/[0.08] text-[#FFF8F0]/60"}`}>
                {lv === "solo" && "🔇 Solo — just me and the tracker"}
                {lv === "tell" && "📢 Tell Someone — share my commitment"}
                {lv === "partner" && "🤝 Partner — mutual accountability"}
                {lv === "contract" && "📜 Contract — formal commitment"}
              </button>
            ))}
            {accountability === "tell" && (
              <div className={PREVIEW}>
                <p className={`${LABEL} mb-2`}>Share message</p>
                <p className="text-sm text-[#FEC89A]">&quot;I am building the habit of {focusHabits[0] || "___"}. Starting today, I will do it every day. Hold me to it.&quot;</p>
              </div>
            )}
          </div>
        )}

        {step === 10 && (
          <div className="space-y-4 text-center">
            <div className="space-y-2 text-left">
              {identity && <p className="text-sm text-[#FFF8F0]/60">Identity: <span className="text-[#FFF8F0]">&quot;I am the type of person who {identity}&quot;</span></p>}
              {focusHabits.length > 0 && <p className="text-sm text-[#FFF8F0]/60">Focus: <span className="text-[#34D399]">{focusHabits.join(", ")}</span></p>}
              {intentWhat && <p className="text-sm text-[#FFF8F0]/60">When: <span className="text-[#FEC89A]">{intentWhat} at {intentTime} in {intentPlace}</span></p>}
              {twoMinVersion && <p className="text-sm text-[#FFF8F0]/60">Minimum: <span className="text-[#FFF8F0]">{twoMinVersion}</span></p>}
            </div>
            <p className="text-[#FFF8F0]/60 text-sm font-serif italic pt-4">Every action you take is a vote for the type of person you wish to become.</p>
            <button onClick={() => saveStep(11)} disabled={pending}
              className={`px-8 py-4 ${BTN} text-lg font-serif tracking-wide hover:bg-[#FF6B6B]/30 transition-all disabled:opacity-50`}>
              {pending ? "Launching..." : "START. NOW. 🚀"}
            </button>
          </div>
        )}
      </div>

      {step < 10 && (
        <div className="flex items-center justify-between">
          <button onClick={() => step > 1 && setStep(step - 1)} disabled={step === 1} className="px-4 py-2 text-sm text-[#FFF8F0]/40 hover:text-[#FFF8F0]/60 disabled:opacity-30">Back</button>
          <button onClick={() => startTransition(async () => { await skipOnboarding(); onComplete(); })} className="text-[12px] text-[#FFF8F0]/30 hover:text-[#FFF8F0]/50 underline">Skip tour</button>
          <button onClick={() => saveStep(step + 1)} disabled={pending} className={`px-6 py-2 ${BTN} text-sm hover:bg-[#FF6B6B]/30 transition-all disabled:opacity-50`}>{pending ? "Saving..." : "Next"}</button>
        </div>
      )}
    </div>
  );
}

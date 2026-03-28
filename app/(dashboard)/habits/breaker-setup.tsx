"use client";

import { useState, useTransition, useMemo } from "react";
import {
  NEED_OPTIONS,
  getReplacementSuggestions,
  calculateCost,
  getDefaultDefenseActions,
} from "@/lib/breaker";
import { createBadHabit } from "./breaker-actions";

const IDENTITY_SUGGESTIONS = [
  "mindlessly scrolls social media", "eats junk food when stressed",
  "procrastinates on hard tasks", "stays up too late on screens",
  "bites their nails", "smokes cigarettes",
];

const FREQUENCY_OPTIONS = [
  { value: "multiple_daily", label: "Multiple times / day" }, { value: "few_daily", label: "A few times / day" },
  { value: "daily", label: "About once a day" }, { value: "weekly", label: "A few times / week" },
];
const DURATION_OPTIONS = [
  { value: "<1mo", label: "< 1 month" }, { value: "1-6mo", label: "1-6 months" },
  { value: "1-3yr", label: "1-3 years" }, { value: "3+yr", label: "3+ years" },
];

const TRIGGER_TIME = ["Morning", "Work breaks", "Evening", "Before bed"];
const TRIGGER_LOC = ["Bed", "Desk", "Couch"];
const TRIGGER_EMO = ["Bored", "Stressed", "Procrastinating", "Tired"];
const TRIGGER_ACT = ["Finished task", "Waiting", "Just woke up"];

interface Props {
  onCreated: () => void;
  onClose: () => void;
}

export function BreakerSetup({ onCreated, onClose }: Props) {
  const [step, setStep] = useState(1);
  const [pending, startTransition] = useTransition();

  // Step 1
  const [antiIdentity, setAntiIdentity] = useState("");
  // Step 2
  const [habitName, setHabitName] = useState("");
  const [frequency, setFrequency] = useState("");
  const [duration, setDuration] = useState("");
  // Step 3
  const [trigTime, setTrigTime] = useState<string[]>([]);
  const [trigLoc, setTrigLoc] = useState<string[]>([]);
  const [trigEmo, setTrigEmo] = useState<string[]>([]);
  const [trigAct, setTrigAct] = useState<string[]>([]);
  // Step 4
  const [needs, setNeeds] = useState<string[]>([]);
  const [replacement, setReplacement] = useState("");
  // Step 5
  const [dailyHours, setDailyHours] = useState("");
  const [hourlyValue, setHourlyValue] = useState("");

  const suggestions = useMemo(
    () => getReplacementSuggestions(needs),
    [needs],
  );
  const cost = useMemo(() => {
    const h = parseFloat(dailyHours) || 0;
    const v = parseFloat(hourlyValue) || 0;
    return calculateCost(h, v);
  }, [dailyHours, hourlyValue]);

  const defensePlan = useMemo(
    () => getDefaultDefenseActions(habitName),
    [habitName],
  );

  function toggleChip(arr: string[], val: string, set: (v: string[]) => void) {
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  }

  function handleSubmit() {
    startTransition(async () => {
      await createBadHabit({
        habitName,
        antiIdentity: antiIdentity || undefined,
        frequencyEstimate: frequency || undefined,
        underlyingNeeds: needs,
        replacementDescription: replacement || undefined,
        triggersTime: trigTime,
        triggersLocation: trigLoc,
        triggersEmotion: trigEmo,
        triggersAction: trigAct,
        dailyHoursEstimate: parseFloat(dailyHours) || undefined,
        hourlyValue: parseFloat(hourlyValue) || undefined,
      });
      onCreated();
    });
  }

  const chipClass = (active: boolean) =>
    `px-3 py-1.5 rounded-xl text-[12px] transition-all cursor-pointer border ${
      active
        ? "bg-[#FF6B6B]/20 text-[#FF6B6B] border-[#FF6B6B]/30"
        : "bg-[#FFF8F0]/[0.05] text-[#FFF8F0]/60 border-[#FFF8F0]/[0.08] hover:border-[#FFF8F0]/20"
    }`;

  const label = "text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider mb-1.5";
  const input =
    "w-full bg-[#FFF8F0]/[0.05] border border-[#FFF8F0]/[0.08] rounded-xl text-[#FFF8F0] px-3 py-2 text-[14px] placeholder:text-[#FFF8F0]/20 focus:outline-none focus:border-[#FF6B6B]/40";

  return (
    <div className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className={label}>Step {step} of 6</p>
          <div className="flex gap-1 mt-2">
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <div
                key={s}
                className={`h-1 w-8 rounded-full ${s <= step ? "bg-[#FF6B6B]" : "bg-[#FFF8F0]/10"}`}
              />
            ))}
          </div>
        </div>
        <button onClick={onClose} className="text-[#FFF8F0]/40 hover:text-[#FFF8F0]/60 text-[14px]">
          Cancel
        </button>
      </div>

      {/* Step 1: Anti-Identity */}
      {step === 1 && (
        <div className="space-y-4">
          <h3 className="text-[18px] font-serif text-[#FFF8F0]">
            I am <span className="text-[#FF6B6B]">NOT</span> the type of person who...
          </h3>
          <input
            className={input}
            placeholder="e.g. mindlessly scrolls social media"
            value={antiIdentity}
            onChange={(e) => setAntiIdentity(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {IDENTITY_SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => setAntiIdentity(s)} className={chipClass(antiIdentity === s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: The Habit */}
      {step === 2 && (
        <div className="space-y-4">
          <h3 className="text-[18px] font-serif text-[#FFF8F0]">The habit you want to break</h3>
          <div>
            <p className={label}>Habit Name</p>
            <input className={input} placeholder="e.g. Doomscrolling" value={habitName} onChange={(e) => setHabitName(e.target.value)} />
          </div>
          <div>
            <p className={label}>How often?</p>
            <div className="flex flex-wrap gap-2">
              {FREQUENCY_OPTIONS.map((o) => (
                <button key={o.value} onClick={() => setFrequency(o.value)} className={chipClass(frequency === o.value)}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className={label}>How long have you had this habit?</p>
            <div className="flex flex-wrap gap-2">
              {DURATION_OPTIONS.map((o) => (
                <button key={o.value} onClick={() => setDuration(o.value)} className={chipClass(duration === o.value)}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Triggers */}
      {step === 3 && (
        <div className="space-y-4">
          <h3 className="text-[18px] font-serif text-[#FFF8F0]">When does the urge hit?</h3>
          {[
            { label: "Time", items: TRIGGER_TIME, state: trigTime, set: setTrigTime },
            { label: "Location", items: TRIGGER_LOC, state: trigLoc, set: setTrigLoc },
            { label: "Emotion", items: TRIGGER_EMO, state: trigEmo, set: setTrigEmo },
            { label: "Preceding Action", items: TRIGGER_ACT, state: trigAct, set: setTrigAct },
          ].map((g) => (
            <div key={g.label}>
              <p className={label}>{g.label}</p>
              <div className="flex flex-wrap gap-2">
                {g.items.map((item) => (
                  <button
                    key={item}
                    onClick={() => toggleChip(g.state, item.toLowerCase(), g.set)}
                    className={chipClass(g.state.includes(item.toLowerCase()))}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Step 4: Underlying Needs */}
      {step === 4 && (
        <div className="space-y-4">
          <h3 className="text-[18px] font-serif text-[#FFF8F0]">What need does this habit fulfill?</h3>
          <div className="flex flex-wrap gap-2">
            {NEED_OPTIONS.map((n) => (
              <button key={n.value} onClick={() => toggleChip(needs, n.value, setNeeds)} className={chipClass(needs.includes(n.value))}>
                {n.icon} {n.label}
              </button>
            ))}
          </div>
          {suggestions.length > 0 && (
            <div>
              <p className={label}>Healthier replacements</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s.suggestion}
                    onClick={() => setReplacement(s.suggestion)}
                    className={chipClass(replacement === s.suggestion)}
                  >
                    {s.icon} {s.suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className={label}>Or type your own</p>
            <input className={input} placeholder="My replacement behavior..." value={replacement} onChange={(e) => setReplacement(e.target.value)} />
          </div>
        </div>
      )}

      {/* Step 5: Cost Calculator */}
      {step === 5 && (
        <div className="space-y-4">
          <h3 className="text-[18px] font-serif text-[#FFF8F0]">The real cost of this habit</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className={label}>Daily hours spent</p>
              <input className={input} type="number" step="0.25" min="0" placeholder="e.g. 2" value={dailyHours} onChange={(e) => setDailyHours(e.target.value)} />
            </div>
            <div>
              <p className={label}>Your hourly value ($)</p>
              <input className={input} type="number" min="0" placeholder="e.g. 25" value={hourlyValue} onChange={(e) => setHourlyValue(e.target.value)} />
            </div>
          </div>
          {(parseFloat(dailyHours) > 0 || parseFloat(hourlyValue) > 0) && (
            <div className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-4 space-y-2">
              <p className={label}>This habit costs you</p>
              <div className="grid grid-cols-2 gap-3 text-[14px]">
                <div><span className="text-[#FFF8F0]/50">Daily:</span> <span className="text-[#FF6B6B]">{cost.daily.toFixed(1)}h</span></div>
                <div><span className="text-[#FFF8F0]/50">Weekly:</span> <span className="text-[#FF6B6B]">{cost.weekly.toFixed(1)}h</span></div>
                <div><span className="text-[#FFF8F0]/50">Monthly:</span> <span className="text-[#FF6B6B]">{cost.monthly.toFixed(0)}h</span></div>
                <div><span className="text-[#FFF8F0]/50">Yearly:</span> <span className="text-[#FF6B6B] font-semibold">{cost.yearlyDays} days</span></div>
              </div>
              {parseFloat(hourlyValue) > 0 && (
                <div className="pt-2 border-t border-[#FFF8F0]/[0.06] text-[14px] space-y-1">
                  <p><span className="text-[#FFF8F0]/50">Money lost yearly:</span> <span className="text-[#FF6B6B] font-semibold">${cost.yearlyMoney.toLocaleString()}</span></p>
                  <p><span className="text-[#FFF8F0]/50">Books you could read:</span> <span className="text-[#34D399] font-semibold">{cost.booksEquiv}</span></p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 6: Review */}
      {step === 6 && (
        <div className="space-y-4">
          <h3 className="text-[18px] font-serif text-[#FFF8F0]">Your battle plan</h3>
          <div className="space-y-3">
            <div className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-4">
              <p className={label}>Anti-Identity</p>
              <p className="text-[14px] text-[#FF6B6B]">I am NOT the type of person who {antiIdentity}</p>
            </div>
            <div className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-4">
              <p className={label}>Trigger Map</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {[...trigTime, ...trigLoc, ...trigEmo, ...trigAct].map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded-lg bg-[#FFF8F0]/[0.05] text-[12px] text-[#FFF8F0]/60">{t}</span>
                ))}
              </div>
            </div>
            <div className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-4">
              <p className={label}>Needs & Replacement</p>
              <p className="text-[14px] text-[#FEC89A]">{needs.join(", ")}</p>
              {replacement && <p className="text-[14px] text-[#34D399] mt-1">Replacement: {replacement}</p>}
            </div>
            {parseFloat(dailyHours) > 0 && (
              <div className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-4">
                <p className={label}>Yearly Cost</p>
                <p className="text-[14px] text-[#FF6B6B]">{cost.yearlyDays} days / ${cost.yearlyMoney.toLocaleString()}</p>
              </div>
            )}
            <div className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-4">
              <p className={label}>4-Layer Defense Plan</p>
              {defensePlan.map((layer, i) => (
                <div key={i} className="mt-2">
                  <p className="text-[12px] text-[#FFF8F0]/50">{["Invisible", "Unattractive", "Difficult", "Unsatisfying"][i]}</p>
                  {layer.map((a, j) => <p key={j} className="text-[13px] text-[#FFF8F0]/70 ml-4">- {a.action}</p>)}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <button
          onClick={() => (step === 1 ? onClose() : setStep(step - 1))}
          className="px-4 py-2 rounded-xl text-[13px] text-[#FFF8F0]/50 hover:text-[#FFF8F0]/80 transition-colors"
        >
          {step === 1 ? "Cancel" : "Back"}
        </button>
        {step < 6 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={step === 2 && !habitName}
            className="px-5 py-2 bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 rounded-xl text-[13px] font-medium disabled:opacity-30 transition-all hover:bg-[#FF6B6B]/30"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={pending || !habitName}
            className="px-5 py-2 bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 rounded-xl text-[13px] font-medium disabled:opacity-30 transition-all hover:bg-[#FF6B6B]/30"
          >
            {pending ? "Creating..." : "Start Breaking This Habit"}
          </button>
        )}
      </div>
    </div>
  );
}

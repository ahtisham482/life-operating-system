"use client";

import { useState, useTransition } from "react";
import type { EnvironmentSetup, Blueprint } from "@/lib/architect";
import { createEnvironmentSetup, getEveningPrepChecklist } from "./architect-actions";
import { MultiInput } from "./multi-input";

interface EnvironmentDesignerProps {
  setups: EnvironmentSetup[];
  blueprints: Blueprint[];
  onRefresh: () => void;
}

const SPACE_TYPES = [
  { value: "bedroom", label: "Bedroom", icon: "🛏️" },
  { value: "desk", label: "Desk", icon: "🪑" },
  { value: "kitchen", label: "Kitchen", icon: "🍳" },
  { value: "living_room", label: "Living Room", icon: "🛋️" },
  { value: "bathroom", label: "Bathroom", icon: "🚿" },
  { value: "gym", label: "Gym", icon: "🏋️" },
  { value: "office", label: "Office", icon: "💼" },
  { value: "outdoor", label: "Outdoor", icon: "🌳" },
];

const INPUT = "mt-1 w-full px-3 py-2 bg-[#FFF8F0]/[0.05] border border-[#FFF8F0]/[0.08] rounded-xl text-sm text-[#FFF8F0] placeholder:text-[#FFF8F0]/20 focus:outline-none focus:border-[#FF6B6B]/40";
const LABEL = "text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider";

export function EnvironmentDesigner({ setups, blueprints, onRefresh }: EnvironmentDesignerProps) {
  const [showForm, setShowForm] = useState(false);
  const [prepChecklist, setPrepChecklist] = useState<{ spaceName: string; spaceIcon: string | null; items: string[] }[]>([]);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [prepLoaded, setPrepLoaded] = useState(false);

  async function loadPrep() {
    if (prepLoaded) return;
    const items = await getEveningPrepChecklist();
    setPrepChecklist(items);
    setPrepLoaded(true);
  }

  function toggleCheck(item: string) {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      next.has(item) ? next.delete(item) : next.add(item);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span className={LABEL}>{setups.length} space{setups.length !== 1 ? "s" : ""}</span>
        <button onClick={() => setShowForm(!showForm)} className="px-3 py-1.5 bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 rounded-xl text-[10px] font-mono uppercase tracking-wider hover:bg-[#FF6B6B]/30 transition-colors">
          {showForm ? "Cancel" : "+ Add Space"}
        </button>
      </div>

      {showForm && <AddSpaceForm onCreated={() => { setShowForm(false); setPrepLoaded(false); onRefresh(); }} />}

      {setups.length === 0 && !showForm && (
        <div className="text-center py-10">
          <p className="text-3xl mb-3">🏠</p>
          <h3 className="text-sm font-serif text-[#FFF8F0]/80 mb-1">Design your environments</h3>
          <p className="text-[11px] text-[#FFF8F0]/40 font-mono max-w-xs mx-auto">Shape your spaces to make good habits obvious and easy.</p>
        </div>
      )}

      {setups.map((s) => <SpaceCard key={s.id} setup={s} blueprints={blueprints} />)}

      {setups.length > 0 && (
        <div className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-4 space-y-3">
          <button onClick={loadPrep} className="flex items-center gap-2 w-full">
            <span className="text-lg">🌙</span>
            <h3 className="text-sm font-serif text-[#FFF8F0]/90 flex-1 text-left">Evening Prep</h3>
            {!prepLoaded && <span className="text-[10px] font-mono text-[#FFF8F0]/30">Tap to load</span>}
          </button>
          {prepLoaded && prepChecklist.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-[#FFF8F0]/[0.05]">
              {prepChecklist.map((group) => (
                <div key={group.spaceName}>
                  <p className="text-[10px] font-mono text-[#FFF8F0]/30 mb-1">
                    {group.spaceIcon ?? "📍"} {group.spaceName}
                  </p>
                  {group.items.map((item) => (
                    <label key={item} className="flex items-center gap-2 cursor-pointer group/item ml-4 mb-1">
                      <div
                        onClick={() => toggleCheck(item)}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${checkedItems.has(item) ? "bg-[#34D399]/20 border-[#34D399]/40" : "border-[#FFF8F0]/[0.1] group-hover/item:border-[#FFF8F0]/[0.2]"}`}
                      >
                        {checkedItems.has(item) && <span className="text-[9px] text-[#34D399]">✓</span>}
                      </div>
                      <span className={`text-[11px] font-mono transition-all ${checkedItems.has(item) ? "text-[#FFF8F0]/30 line-through" : "text-[#FFF8F0]/60"}`}>{item}</span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          )}
          {prepLoaded && prepChecklist.length === 0 && (
            <p className="text-[11px] text-[#FFF8F0]/30 font-mono">No evening prep items yet. Add them to your spaces.</p>
          )}
        </div>
      )}
    </div>
  );
}

function SpaceCard({ setup, blueprints }: { setup: EnvironmentSetup; blueprints: Blueprint[] }) {
  const linked = blueprints.filter((bp) => setup.linkedBlueprintIds.includes(bp.id));
  const typeInfo = SPACE_TYPES.find((t) => t.value === setup.spaceType);
  const icon = setup.spaceIcon || typeInfo?.icon || "📍";

  return (
    <div className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-serif text-[#FFF8F0]/90">{setup.spaceName}</h3>
          {setup.spacePurpose && <p className="text-[10px] font-mono text-[#FFF8F0]/30 truncate">{setup.spacePurpose}</p>}
        </div>
      </div>

      {setup.visualCues.length > 0 && <TagList label="Visual Cues" items={setup.visualCues} color="#FEC89A" />}
      {setup.frictionRemovals.length > 0 && <TagList label="Friction Removed" items={setup.frictionRemovals} color="#34D399" />}
      {setup.frictionAdditions.length > 0 && <TagList label="Friction Added" items={setup.frictionAdditions} color="#FF6B6B" />}

      {linked.length > 0 && (
        <div>
          <span className={LABEL}>Linked Habits</span>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {linked.map((bp) => <span key={bp.id} className="px-2 py-0.5 text-[10px] font-mono text-[#FFF8F0]/40 bg-[#FFF8F0]/[0.03] rounded-lg">{bp.habitName}</span>)}
          </div>
        </div>
      )}

      {setup.eveningPrepItems.length > 0 && (
        <div className="pt-2 border-t border-[#FFF8F0]/[0.05]">
          <span className="text-[10px] font-mono text-[#FFF8F0]/30 uppercase tracking-wider">Evening Prep</span>
          <ul className="mt-1 space-y-0.5">
            {setup.eveningPrepItems.map((item) => <li key={item} className="text-[11px] font-mono text-[#FFF8F0]/40 flex items-center gap-1.5"><span className="text-[8px] text-[#FFF8F0]/20">●</span>{item}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function TagList({ label, items, color }: { label: string; items: string[]; color: string }) {
  return (
    <div>
      <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: `${color}66` }}>{label}</span>
      <div className="flex flex-wrap gap-1.5 mt-1">
        {items.map((item) => <span key={item} className="px-2 py-0.5 text-[10px] font-mono rounded-lg" style={{ color: `${color}80`, background: `${color}14` }}>{item}</span>)}
      </div>
    </div>
  );
}

function AddSpaceForm({ onCreated }: { onCreated: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [spaceName, setSpaceName] = useState("");
  const [spaceType, setSpaceType] = useState("");
  const [primaryUse, setPrimaryUse] = useState("");
  const [forbiddenUses, setForbiddenUses] = useState<string[]>([]);
  const [visualCues, setVisualCues] = useState<string[]>([]);
  const [frictionRemovals, setFrictionRemovals] = useState<string[]>([]);
  const [frictionAdditions, setFrictionAdditions] = useState<string[]>([]);
  const [eveningPrepItems, setEveningPrepItems] = useState<string[]>([]);
  const [forbiddenInput, setForbiddenInput] = useState("");
  const [cueInput, setCueInput] = useState("");
  const [frRemInput, setFrRemInput] = useState("");
  const [frAddInput, setFrAddInput] = useState("");
  const [prepInput, setPrepInput] = useState("");

  function add(setter: React.Dispatch<React.SetStateAction<string[]>>, val: string, clear: React.Dispatch<React.SetStateAction<string>>) {
    if (!val.trim()) return;
    setter((p) => [...p, val.trim()]);
    clear("");
  }

  function handleCreate() {
    if (!spaceName) return;
    startTransition(async () => {
      await createEnvironmentSetup({ spaceName, spaceType: spaceType || undefined, primaryUse: primaryUse || undefined, forbiddenUses, visualCues, frictionRemovals, frictionAdditions, eveningPrepItems });
      onCreated();
    });
  }

  return (
    <div className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-4 space-y-4">
      <h3 className="text-sm font-serif text-[#FFF8F0]/80">New Space</h3>
      <div><label className={LABEL}>Space Name *</label><input value={spaceName} onChange={(e) => setSpaceName(e.target.value)} placeholder="e.g. Reading Corner" className={INPUT} /></div>
      <div>
        <label className={LABEL}>Space Type</label>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {SPACE_TYPES.map((t) => (
            <button key={t.value} onClick={() => setSpaceType(spaceType === t.value ? "" : t.value)} className={`px-2.5 py-1 rounded-xl text-[10px] font-mono border transition-all ${spaceType === t.value ? "bg-[#FF6B6B]/20 text-[#FF6B6B] border-[#FF6B6B]/30" : "text-[#FFF8F0]/30 border-[#FFF8F0]/[0.08]"}`}>{t.icon} {t.label}</button>
          ))}
        </div>
      </div>
      <div><label className={LABEL}>Primary Use</label><input value={primaryUse} onChange={(e) => setPrimaryUse(e.target.value)} placeholder="e.g. Reading and meditation only" className={INPUT} /></div>
      <MultiInput label="Forbidden Uses" items={forbiddenUses} inputValue={forbiddenInput} onInputChange={setForbiddenInput} onAdd={() => add(setForbiddenUses, forbiddenInput, setForbiddenInput)} onRemove={(i) => setForbiddenUses((p) => p.filter((_, idx) => idx !== i))} placeholder="e.g. No phone scrolling" />
      <MultiInput label="Visual Cues" items={visualCues} inputValue={cueInput} onInputChange={setCueInput} onAdd={() => add(setVisualCues, cueInput, setCueInput)} onRemove={(i) => setVisualCues((p) => p.filter((_, idx) => idx !== i))} placeholder="e.g. Book on pillow" />
      <MultiInput label="Friction Removals" items={frictionRemovals} inputValue={frRemInput} onInputChange={setFrRemInput} onAdd={() => add(setFrictionRemovals, frRemInput, setFrRemInput)} onRemove={(i) => setFrictionRemovals((p) => p.filter((_, idx) => idx !== i))} placeholder="e.g. Pre-fill water bottle" />
      <MultiInput label="Friction Additions" items={frictionAdditions} inputValue={frAddInput} onInputChange={setFrAddInput} onAdd={() => add(setFrictionAdditions, frAddInput, setFrAddInput)} onRemove={(i) => setFrictionAdditions((p) => p.filter((_, idx) => idx !== i))} placeholder="e.g. Hide phone in drawer" />
      <MultiInput label="Evening Prep Items" items={eveningPrepItems} inputValue={prepInput} onInputChange={setPrepInput} onAdd={() => add(setEveningPrepItems, prepInput, setPrepInput)} onRemove={(i) => setEveningPrepItems((p) => p.filter((_, idx) => idx !== i))} placeholder="e.g. Lay out workout clothes" />
      <div className="flex justify-end pt-2">
        <button onClick={handleCreate} disabled={isPending || !spaceName} className="px-5 py-2 bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/30 rounded-xl text-[11px] font-mono uppercase tracking-wider disabled:opacity-30 hover:bg-[#34D399]/30 transition-colors">
          {isPending ? "Creating..." : "Create Space"}
        </button>
      </div>
    </div>
  );
}

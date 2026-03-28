"use client";

import { useState, useTransition } from "react";
import type { Tribe, Partner } from "@/lib/attraction";
import {
  getInfluenceIcon,
  getInfluenceLabel,
  getTribeTypeIcon,
  calculateSocialScore,
} from "@/lib/attraction";
import {
  createTribe,
  deleteTribe,
  createPartner,
  deletePartner,
  logCheckin,
} from "./attraction-actions";

interface TribeSectionProps {
  tribes: Tribe[];
  partners: Partner[];
  onRefresh: () => void;
}

const INPUT =
  "mt-1 w-full px-3 py-2 bg-[#FFF8F0]/[0.05] border border-[#FFF8F0]/[0.08] rounded-xl text-sm text-[#FFF8F0] placeholder:text-[#FFF8F0]/20 focus:outline-none focus:border-[#FF6B6B]/40";
const LABEL = "text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider";
const BTN =
  "px-4 py-2 bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 rounded-xl text-[11px] font-mono uppercase tracking-wider hover:bg-[#FF6B6B]/30 transition-colors";

const INFLUENCE_TYPES = ["close", "many", "powerful"] as const;

const TRIBE_TYPE_OPTIONS = [
  { value: "online_community", label: "Online Community" },
  { value: "local_group", label: "Local Group" },
  { value: "friend_group", label: "Friend Group" },
  { value: "accountability_partner", label: "Accountability Partner" },
  { value: "mentor", label: "Mentor" },
  { value: "course_cohort", label: "Course Cohort" },
];

export function TribeSection({ tribes, partners, onRefresh }: TribeSectionProps) {
  const [showAddTribe, setShowAddTribe] = useState(false);
  const [showAddPartner, setShowAddPartner] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Tribe form
  const [tribeName, setTribeName] = useState("");
  const [tribeType, setTribeType] = useState("online_community");
  const [tribePlatform, setTribePlatform] = useState("");
  const [influenceType, setInfluenceType] = useState<"close" | "many" | "powerful">("close");
  const [supportedBehavior, setSupportedBehavior] = useState("");
  const [positiveInfluence, setPositiveInfluence] = useState(true);
  const [influenceRating, setInfluenceRating] = useState(5);

  // Partner form
  const [partnerName, setPartnerName] = useState("");
  const [sharedHabits, setSharedHabits] = useState("");
  const [commitment, setCommitment] = useState("");
  const [stakes, setStakes] = useState("");

  const { score, level } = calculateSocialScore(tribes, partners);

  function resetTribeForm() {
    setTribeName("");
    setTribeType("online_community");
    setTribePlatform("");
    setInfluenceType("close");
    setSupportedBehavior("");
    setPositiveInfluence(true);
    setInfluenceRating(5);
    setShowAddTribe(false);
  }

  function resetPartnerForm() {
    setPartnerName("");
    setSharedHabits("");
    setCommitment("");
    setStakes("");
    setShowAddPartner(false);
  }

  function handleCreateTribe() {
    if (!tribeName.trim()) return;
    startTransition(async () => {
      await createTribe({
        tribeName: tribeName.trim(),
        tribeType,
        tribePlatform: tribePlatform.trim() || undefined,
        influenceType,
        supportedBehavior: supportedBehavior.trim() || undefined,
        positiveInfluence,
        influenceRating,
      });
      resetTribeForm();
      onRefresh();
    });
  }

  function handleCreatePartner() {
    if (!partnerName.trim()) return;
    startTransition(async () => {
      await createPartner({
        partnerName: partnerName.trim(),
        sharedHabits: sharedHabits.split(",").map((s) => s.trim()).filter(Boolean),
        commitmentStatement: commitment.trim() || undefined,
        stakes: stakes.trim() || undefined,
      });
      resetPartnerForm();
      onRefresh();
    });
  }

  function handleDeleteTribe(id: string) {
    startTransition(async () => {
      await deleteTribe(id);
      onRefresh();
    });
  }

  function handleDeletePartner(id: string) {
    startTransition(async () => {
      await deletePartner(id);
      onRefresh();
    });
  }

  function handleCheckin(partnerId: string) {
    startTransition(async () => {
      await logCheckin(partnerId);
      onRefresh();
    });
  }

  const closeTribes = tribes.filter((t) => t.influenceType === "close");
  const manyTribes = tribes.filter((t) => t.influenceType === "many");
  const powerfulTribes = tribes.filter((t) => t.influenceType === "powerful");

  return (
    <div className="space-y-6">
      {/* Social score */}
      <div className="flex items-center gap-3 p-3 bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl">
        <div className="text-2xl font-mono text-[#FFF8F0]/80">{score}</div>
        <div>
          <p className={LABEL}>Social Score</p>
          <p className={`text-[11px] font-mono capitalize ${
            level === "Optimized" ? "text-[#34D399]/70" :
            level === "Strong" ? "text-[#FEC89A]/70" :
            "text-[#FFF8F0]/50"
          }`}>
            {level}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button onClick={() => { setShowAddTribe(!showAddTribe); setShowAddPartner(false); }} className={BTN}>
          {showAddTribe ? "Cancel" : "+ Add Tribe"}
        </button>
        <button onClick={() => { setShowAddPartner(!showAddPartner); setShowAddTribe(false); }} className={BTN}>
          {showAddPartner ? "Cancel" : "+ Add Partner"}
        </button>
      </div>

      {/* Add Tribe form */}
      {showAddTribe && (
        <div className="p-4 bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Name</label>
              <input className={INPUT} placeholder="Community name" value={tribeName} onChange={(e) => setTribeName(e.target.value)} />
            </div>
            <div>
              <label className={LABEL}>Platform</label>
              <input className={INPUT} placeholder="Discord, Reddit, Local..." value={tribePlatform} onChange={(e) => setTribePlatform(e.target.value)} />
            </div>
          </div>
          <div>
            <label className={LABEL}>Type</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {TRIBE_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTribeType(opt.value)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-mono transition-all ${
                    tribeType === opt.value
                      ? "bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30"
                      : "text-[#FFF8F0]/30 border border-[#FFF8F0]/[0.08] hover:text-[#FFF8F0]/60"
                  }`}
                >
                  {getTribeTypeIcon(opt.value)} {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={LABEL}>Influence Circle</label>
            <div className="flex gap-2 mt-1">
              {INFLUENCE_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setInfluenceType(t)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-mono capitalize transition-all ${
                    influenceType === t
                      ? "bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30"
                      : "text-[#FFF8F0]/30 border border-[#FFF8F0]/[0.08] hover:text-[#FFF8F0]/60"
                  }`}
                >
                  {getInfluenceIcon(t)} {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={LABEL}>Supported Behavior</label>
            <input className={INPUT} placeholder="What behavior does this group encourage?" value={supportedBehavior} onChange={(e) => setSupportedBehavior(e.target.value)} />
          </div>
          <div className="flex items-center gap-3">
            <label className={LABEL}>Positive influence?</label>
            <button
              onClick={() => setPositiveInfluence(!positiveInfluence)}
              className={`px-3 py-1 rounded-lg text-[11px] font-mono transition-all ${
                positiveInfluence
                  ? "bg-[#34D399]/15 text-[#34D399]/70 border border-[#34D399]/20"
                  : "bg-[#FF6B6B]/15 text-[#FF6B6B]/70 border border-[#FF6B6B]/20"
              }`}
            >
              {positiveInfluence ? "✅ Positive" : "⚠️ Negative"}
            </button>
          </div>
          <div>
            <label className={LABEL}>Influence Rating: {influenceRating}/10</label>
            <div className="flex gap-1 mt-1">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setInfluenceRating(n)}
                  className={`w-7 h-7 rounded-lg text-[11px] font-mono transition-all ${
                    n <= influenceRating
                      ? "bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30"
                      : "text-[#FFF8F0]/20 border border-[#FFF8F0]/[0.06]"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleCreateTribe} disabled={isPending || !tribeName.trim()} className={`${BTN} w-full disabled:opacity-30`}>
            {isPending ? "Adding..." : "Add Tribe"}
          </button>
        </div>
      )}

      {/* Add Partner form */}
      {showAddPartner && (
        <div className="p-4 bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl space-y-3">
          <div>
            <label className={LABEL}>Partner Name</label>
            <input className={INPUT} placeholder="Who is your accountability partner?" value={partnerName} onChange={(e) => setPartnerName(e.target.value)} />
          </div>
          <div>
            <label className={LABEL}>Shared Habits (comma-separated)</label>
            <input className={INPUT} placeholder="exercise, reading, meditation" value={sharedHabits} onChange={(e) => setSharedHabits(e.target.value)} />
          </div>
          <div>
            <label className={LABEL}>Commitment Statement</label>
            <input className={INPUT} placeholder="What are you both committing to?" value={commitment} onChange={(e) => setCommitment(e.target.value)} />
          </div>
          <div>
            <label className={LABEL}>Stakes (optional)</label>
            <input className={INPUT} placeholder="What happens if you miss? e.g. $20 to charity" value={stakes} onChange={(e) => setStakes(e.target.value)} />
          </div>
          <button onClick={handleCreatePartner} disabled={isPending || !partnerName.trim()} className={`${BTN} w-full disabled:opacity-30`}>
            {isPending ? "Adding..." : "Add Partner"}
          </button>
        </div>
      )}

      {/* Influence circles */}
      {[
        { key: "close" as const, items: closeTribes },
        { key: "many" as const, items: manyTribes },
        { key: "powerful" as const, items: powerfulTribes },
      ].map(({ key, items }) => (
        <div key={key}>
          <p className={`${LABEL} mb-2`}>
            {getInfluenceIcon(key)} {getInfluenceLabel(key)}
          </p>
          {items.length === 0 ? (
            <p className="text-[11px] text-[#FFF8F0]/20 font-mono pl-2">
              {key === "close" && "⚠️ No close circles yet — these have the biggest impact on your habits."}
              {key === "many" && "No communities added yet."}
              {key === "powerful" && "💡 Add role models whose behavior you want to emulate."}
            </p>
          ) : (
            <div className="space-y-2">
              {items.map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-2 bg-[#FFF8F0]/[0.02] border border-[#FFF8F0]/[0.04] rounded-xl">
                  <span className="text-base">{getTribeTypeIcon(t.tribeType)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#FFF8F0]/70 truncate">{t.tribeName}</p>
                    <p className="text-[10px] font-mono text-[#FFF8F0]/30">
                      {t.tribePlatform && `${t.tribePlatform} · `}
                      {t.supportedBehavior}
                    </p>
                  </div>
                  <span className={`text-[10px] font-mono ${t.positiveInfluence ? "text-[#34D399]/50" : "text-[#FF6B6B]/50"}`}>
                    {t.positiveInfluence ? "+" : "-"}
                  </span>
                  <button onClick={() => handleDeleteTribe(t.id)} disabled={isPending} className="text-[11px] font-mono text-[#FF6B6B]/30 hover:text-[#FF6B6B]/60 disabled:opacity-30">
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Partners */}
      <div>
        <p className={`${LABEL} mb-2`}>🤝 Accountability Partners</p>
        {partners.length === 0 ? (
          <p className="text-[11px] text-[#FFF8F0]/20 font-mono pl-2">
            ⚠️ No partners yet — accountability increases success rate by 95%.
          </p>
        ) : (
          <div className="space-y-2">
            {partners.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3 bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-xl">
                <span className="text-lg">{p.partnerIcon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#FFF8F0]/70">{p.partnerName}</p>
                  <p className="text-[10px] font-mono text-[#FFF8F0]/30">
                    {p.sharedHabits.join(", ")}
                  </p>
                </div>
                <span className="text-[10px] font-mono text-[#34D399]/50">
                  🔥 {p.currentStreak}
                </span>
                <button onClick={() => handleCheckin(p.id)} disabled={isPending} className="px-2 py-1 text-[11px] font-mono text-[#34D399]/60 bg-[#34D399]/[0.05] border border-[#34D399]/[0.12] rounded-lg hover:bg-[#34D399]/[0.1] transition-colors disabled:opacity-30">
                  Check In
                </button>
                <button onClick={() => handleDeletePartner(p.id)} disabled={isPending} className="text-[11px] font-mono text-[#FF6B6B]/30 hover:text-[#FF6B6B]/60 disabled:opacity-30">
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

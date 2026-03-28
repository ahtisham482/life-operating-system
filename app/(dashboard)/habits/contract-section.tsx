"use client";

import { useState, useTransition } from "react";
import type { HabitContract } from "@/lib/contracts";
import { getContractProgress, getContractStatusColor } from "@/lib/contracts";
import { createContract, deleteContract, logContractDay } from "./contract-actions";

interface ContractSectionProps {
  contracts: HabitContract[];
  onRefresh: () => void;
}

const COMMITMENT_OPTIONS = [7, 30, 66, 90] as const;

export function ContractSection({ contracts, onRefresh }: ContractSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [habitName, setHabitName] = useState("");
  const [identityStatement, setIdentityStatement] = useState("");
  const [implementationIntention, setImplementationIntention] = useState("");
  const [twoMinuteVersion, setTwoMinuteVersion] = useState("");
  const [rewardText, setRewardText] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");
  const [commitmentDays, setCommitmentDays] = useState<number>(30);
  const [maxConsecutiveMisses, setMaxConsecutiveMisses] = useState("2");
  const [penaltyDescription, setPenaltyDescription] = useState("");
  const [penaltyAmount, setPenaltyAmount] = useState("");

  function handleSign() {
    if (!habitName.trim()) return;
    startTransition(async () => {
      await createContract({
        habitName: habitName.trim(),
        identityStatement: identityStatement.trim() || undefined,
        implementationIntention: implementationIntention.trim() || undefined,
        twoMinuteVersion: twoMinuteVersion.trim() || undefined,
        rewardText: rewardText.trim() || undefined,
        partnerName: partnerName.trim() || undefined,
        partnerEmail: partnerEmail.trim() || undefined,
        commitmentDays,
        maxConsecutiveMisses: parseInt(maxConsecutiveMisses) || 2,
        penaltyDescription: penaltyDescription.trim() || undefined,
        penaltyAmount: penaltyAmount ? parseFloat(penaltyAmount) : undefined,
      });
      setHabitName(""); setIdentityStatement(""); setImplementationIntention("");
      setTwoMinuteVersion(""); setRewardText(""); setPartnerName("");
      setPartnerEmail(""); setCommitmentDays(30); setMaxConsecutiveMisses("2");
      setPenaltyDescription(""); setPenaltyAmount("");
      setShowForm(false);
      onRefresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteContract(id);
      onRefresh();
    });
  }

  function handleLog(contractId: string, completed: boolean) {
    startTransition(async () => {
      await logContractDay(contractId, completed);
      onRefresh();
    });
  }

  const inputCls =
    "w-full px-3 py-2 bg-[#FFF8F0]/[0.05] border border-[#FFF8F0]/[0.08] rounded-xl text-[#FFF8F0] text-[13px] placeholder:text-[#FFF8F0]/30 focus:outline-none focus:border-[#FF6B6B]/40";
  const labelCls =
    "text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider mb-1 block";

  if (contracts.length === 0 && !showForm) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-[32px]">📜</p>
        <p className="text-[14px] text-[#FFF8F0]/60 max-w-sm mx-auto">
          A habit contract makes your commitment REAL. Sign one.
        </p>
        <button
          onClick={() => setShowForm(true)}
          className="px-5 py-2 bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 rounded-xl text-[12px] font-mono uppercase tracking-wider"
        >
          Create Contract
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toggle form */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 rounded-xl text-[11px] font-mono uppercase tracking-wider"
        >
          + New Contract
        </button>
      )}

      {/* Create form */}
      {showForm && (
        <div className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-5 space-y-4">
          <p className="text-[12px] font-mono text-[#FFF8F0]/50 uppercase tracking-wider">New Habit Contract</p>

          <div>
            <label className={labelCls}>Habit Name *</label>
            <input value={habitName} onChange={(e) => setHabitName(e.target.value)} placeholder="e.g. Daily Reading" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Identity Statement</label>
            <input value={identityStatement} onChange={(e) => setIdentityStatement(e.target.value)} placeholder="I am the type of person who..." className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Implementation Intention</label>
            <input value={implementationIntention} onChange={(e) => setImplementationIntention(e.target.value)} placeholder="When I [SITUATION], I will [BEHAVIOR]" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Two-Minute Version</label>
              <input value={twoMinuteVersion} onChange={(e) => setTwoMinuteVersion(e.target.value)} placeholder="Smallest version" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Reward</label>
              <input value={rewardText} onChange={(e) => setRewardText(e.target.value)} placeholder="When done, I get..." className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Partner Name (optional)</label>
              <input value={partnerName} onChange={(e) => setPartnerName(e.target.value)} placeholder="Accountability partner" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Partner Email (optional)</label>
              <input value={partnerEmail} onChange={(e) => setPartnerEmail(e.target.value)} placeholder="partner@email.com" className={inputCls} />
            </div>
          </div>

          {/* Commitment Days */}
          <div>
            <label className={labelCls}>Commitment Period</label>
            <div className="flex gap-2 mt-1">
              {COMMITMENT_OPTIONS.map((d) => (
                <button key={d} onClick={() => setCommitmentDays(d)}
                  className={`px-3 py-1.5 rounded-xl text-[12px] font-mono border transition-all ${
                    commitmentDays === d
                      ? "bg-[#FF6B6B]/20 text-[#FF6B6B] border-[#FF6B6B]/30"
                      : "bg-[#FFF8F0]/[0.05] text-[#FFF8F0]/40 border-[#FFF8F0]/[0.08] hover:text-[#FFF8F0]/60"
                  }`}
                >
                  {d} days
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Max Consecutive Misses</label>
              <input type="number" value={maxConsecutiveMisses} onChange={(e) => setMaxConsecutiveMisses(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Penalty Description</label>
              <input value={penaltyDescription} onChange={(e) => setPenaltyDescription(e.target.value)} placeholder="e.g. Donate to charity" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Penalty Amount</label>
              <input type="number" value={penaltyAmount} onChange={(e) => setPenaltyAmount(e.target.value)} placeholder="0" className={inputCls} />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={handleSign} disabled={isPending || !habitName.trim()}
              className="px-5 py-2 bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 rounded-xl text-[12px] font-mono uppercase tracking-wider disabled:opacity-40"
            >
              {isPending ? "Signing..." : "Sign Contract"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-[#FFF8F0]/40 text-[12px] font-mono uppercase tracking-wider hover:text-[#FFF8F0]/60">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Contract Cards */}
      {contracts.map((c) => (
        <ContractCard key={c.id} contract={c} onLog={handleLog} onDelete={handleDelete} isPending={isPending} />
      ))}
    </div>
  );
}

function ContractCard({ contract: c, onLog, onDelete, isPending }: {
  contract: HabitContract;
  onLog: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  isPending: boolean;
}) {
  const progress = getContractProgress(c);
  const statusColor = getContractStatusColor(c.status);

  return (
    <div className="bg-[#FFF8F0]/[0.05] border border-[#FFF8F0]/[0.08] rounded-2xl p-6 space-y-4">
      {/* Header */}
      <p className="text-center text-[11px] font-mono text-[#FFF8F0]/50 uppercase tracking-[0.3em]">
        📜 HABIT CONTRACT
      </p>

      {/* Identity */}
      {c.identityStatement && (
        <p className="text-center text-[14px] italic text-[#FEC89A]/80">
          &ldquo;{c.identityStatement}&rdquo;
        </p>
      )}

      {/* Commitment */}
      <p className="text-center text-[13px] text-[#FFF8F0]/70">
        I commit to <span className="text-[#FFF8F0] font-medium">{c.habitName}</span> for{" "}
        <span className="text-[#FFF8F0] font-medium">{c.commitmentDays} days</span>
      </p>

      {/* Details */}
      <div className="space-y-2 text-[12px] text-[#FFF8F0]/50">
        {c.implementationIntention && (
          <p><span className="text-[#FFF8F0]/30 font-mono text-[10px] uppercase">When/Then:</span> {c.implementationIntention}</p>
        )}
        {c.twoMinuteVersion && (
          <p><span className="text-[#FFF8F0]/30 font-mono text-[10px] uppercase">2-min version:</span> {c.twoMinuteVersion}</p>
        )}
        {c.rewardText && (
          <p><span className="text-[#FFF8F0]/30 font-mono text-[10px] uppercase">Reward:</span> {c.rewardText}</p>
        )}
        {(c.partnerName || c.penaltyDescription) && (
          <div className="pt-2 border-t border-[#FFF8F0]/[0.06]">
            {c.partnerName && <p><span className="text-[#FFF8F0]/30 font-mono text-[10px] uppercase">Partner:</span> {c.partnerName} {c.partnerEmail && `(${c.partnerEmail})`}</p>}
            {c.penaltyDescription && <p><span className="text-[#FFF8F0]/30 font-mono text-[10px] uppercase">Penalty:</span> {c.penaltyDescription} {c.penaltyAmount ? `(${c.penaltyCurrency} ${c.penaltyAmount})` : ""}</p>}
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-[10px] font-mono text-[#FFF8F0]/40 mb-1">
          <span>Day {progress.daysElapsed}</span>
          <span>{progress.daysRemaining} remaining</span>
        </div>
        <div className="w-full h-2 bg-[#FFF8F0]/[0.05] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress.progressPercent}%`, backgroundColor: statusColor }} />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          { label: "Rate", value: `${progress.completionRate}%` },
          { label: "Done", value: `${c.totalCompletions}` },
          { label: "Missed", value: `${c.totalMisses}` },
          { label: "Consec. Misses", value: `${c.currentConsecutiveMisses}` },
        ].map((s) => (
          <div key={s.label} className="bg-[#FFF8F0]/[0.03] rounded-xl py-2 px-1">
            <p className="text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider">{s.label}</p>
            <p className="text-[14px] text-[#FFF8F0]/80 font-medium">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Status badge */}
      <div className="flex items-center justify-between">
        <span className="px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider border"
          style={{ color: statusColor, borderColor: `${statusColor}40`, backgroundColor: `${statusColor}15` }}>
          {c.status}
        </span>

        {/* Penalty warning */}
        {c.penaltyTriggered && (
          <span className="text-[11px] text-[#F87171] font-mono">
            ⚠️ Penalty triggered
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 pt-1">
        {c.status === "active" && (
          <>
            <button onClick={() => onLog(c.id, true)} disabled={isPending}
              className="flex-1 py-2 bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30 rounded-xl text-[12px] font-mono uppercase tracking-wider disabled:opacity-40">
              ✅ Today Done
            </button>
            <button onClick={() => onLog(c.id, false)} disabled={isPending}
              className="flex-1 py-2 bg-[#F87171]/15 text-[#F87171] border border-[#F87171]/30 rounded-xl text-[12px] font-mono uppercase tracking-wider disabled:opacity-40">
              ❌ Today Missed
            </button>
          </>
        )}
        <button onClick={() => onDelete(c.id)} disabled={isPending}
          className="px-3 py-2 text-[#FFF8F0]/30 hover:text-[#F87171] text-[11px] font-mono transition-colors disabled:opacity-40">
          Delete
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import type { SavingsJar, SavingsTransaction } from "@/lib/contracts";
import { getJarProgress, formatCurrency } from "@/lib/contracts";
import { createJar, deleteJar, addTransaction, getTransactions } from "./contract-actions";
import { EmptyState } from "./empty-state";

interface SavingsSectionProps {
  jars: SavingsJar[];
  onRefresh: () => void;
}

export function SavingsSection({ jars, onRefresh }: SavingsSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [jarName, setJarName] = useState("");
  const [goalAmount, setGoalAmount] = useState("");
  const [currency, setCurrency] = useState("PKR");
  const [goalDescription, setGoalDescription] = useState("");
  const [jarIcon, setJarIcon] = useState("💰");

  const totalSaved = jars.reduce((sum, j) => sum + j.currentAmount, 0);

  function handleCreate() {
    if (!jarName.trim() || !goalAmount) return;
    startTransition(async () => {
      await createJar({
        jarName: jarName.trim(),
        goalAmount: parseFloat(goalAmount),
        currency,
        goalDescription: goalDescription.trim() || undefined,
        jarIcon: jarIcon || undefined,
      });
      setJarName(""); setGoalAmount(""); setGoalDescription(""); setJarIcon("💰");
      setShowForm(false);
      onRefresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteJar(id);
      onRefresh();
    });
  }

  const inputCls =
    "w-full px-3 py-2 bg-[#FFF8F0]/[0.05] border border-[#FFF8F0]/[0.08] rounded-xl text-[#FFF8F0] text-[13px] placeholder:text-[#FFF8F0]/30 focus:outline-none focus:border-[#FF6B6B]/40";
  const labelCls =
    "text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider mb-1 block";

  if (jars.length === 0 && !showForm) {
    return (
      <EmptyState
        icon="💰"
        title="Turn habits into savings"
        description="Every habit can save or earn money. Track it visually in a jar and watch it fill up toward something you actually want."
        actionLabel="Create savings jar"
        onAction={() => setShowForm(true)}
        compact
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Total summary */}
      {jars.length > 0 && (
        <div className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl px-5 py-3 flex items-center justify-between">
          <span className="text-[11px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider">
            Total saved across {jars.length} jar{jars.length !== 1 ? "s" : ""}
          </span>
          <span className="text-[18px] text-[#34D399] font-medium">
            {formatCurrency(totalSaved, jars[0]?.currency || "PKR")}
          </span>
        </div>
      )}

      {/* Toggle */}
      {!showForm && (
        <button onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 rounded-xl text-[11px] font-mono uppercase tracking-wider">
          + New Jar
        </button>
      )}

      {/* Create form */}
      {showForm && (
        <div className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-5 space-y-4">
          <p className="text-[12px] font-mono text-[#FFF8F0]/50 uppercase tracking-wider">New Savings Jar</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Jar Name *</label>
              <input value={jarName} onChange={(e) => setJarName(e.target.value)} placeholder="e.g. New Laptop Fund" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Goal Amount *</label>
              <input type="number" value={goalAmount} onChange={(e) => setGoalAmount(e.target.value)} placeholder="10000" className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Currency</label>
              <div className="flex gap-2 mt-1">
                {["PKR", "USD"].map((c) => (
                  <button key={c} onClick={() => setCurrency(c)}
                    className={`px-3 py-1.5 rounded-xl text-[12px] font-mono border transition-all ${
                      currency === c
                        ? "bg-[#FF6B6B]/20 text-[#FF6B6B] border-[#FF6B6B]/30"
                        : "bg-[#FFF8F0]/[0.05] text-[#FFF8F0]/40 border-[#FFF8F0]/[0.08]"
                    }`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>Icon</label>
              <input value={jarIcon} onChange={(e) => setJarIcon(e.target.value)} className={inputCls} maxLength={2} />
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <input value={goalDescription} onChange={(e) => setGoalDescription(e.target.value)} placeholder="What's this for?" className={inputCls} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleCreate} disabled={isPending || !jarName.trim() || !goalAmount}
              className="px-5 py-2 bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 rounded-xl text-[12px] font-mono uppercase tracking-wider disabled:opacity-40">
              {isPending ? "Creating..." : "Create Jar"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-[#FFF8F0]/40 text-[12px] font-mono uppercase tracking-wider hover:text-[#FFF8F0]/60">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Jar Cards */}
      {jars.map((jar) => (
        <JarCard key={jar.id} jar={jar} onDelete={handleDelete} onRefresh={onRefresh} isPending={isPending} />
      ))}
    </div>
  );
}

function JarCard({ jar, onDelete, onRefresh, isPending: parentPending }: {
  jar: SavingsJar;
  onDelete: (id: string) => void;
  onRefresh: () => void;
  isPending: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [txns, setTxns] = useState<SavingsTransaction[]>([]);
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [habitName, setHabitName] = useState("");

  const progress = getJarProgress(jar);

  const loadTxns = useCallback(async () => {
    const t = await getTransactions(jar.id, 5);
    setTxns(t);
  }, [jar.id]);

  useEffect(() => { loadTxns(); }, [loadTxns]);

  function handleAdd() {
    if (!amount || !desc.trim()) return;
    startTransition(async () => {
      await addTransaction({
        jarId: jar.id,
        amount: parseFloat(amount),
        description: desc.trim(),
        habitName: habitName.trim() || undefined,
      });
      setAmount(""); setDesc(""); setHabitName("");
      await loadTxns();
      onRefresh();
    });
  }

  const inputCls =
    "w-full px-2 py-1.5 bg-[#FFF8F0]/[0.05] border border-[#FFF8F0]/[0.08] rounded-xl text-[#FFF8F0] text-[12px] placeholder:text-[#FFF8F0]/30 focus:outline-none focus:border-[#FF6B6B]/40";

  return (
    <div className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[20px]">{jar.jarIcon}</span>
          <div>
            <p className="text-[14px] text-[#FFF8F0]/90 font-medium">{jar.jarName}</p>
            {jar.goalDescription && <p className="text-[11px] text-[#FFF8F0]/40">{jar.goalDescription}</p>}
          </div>
        </div>
        {jar.completed && (
          <span className="text-[12px] text-[#34D399] font-mono">🎉 Goal reached!</span>
        )}
      </div>

      {/* Visual Jar */}
      <div className="flex items-end gap-4">
        <div className="relative w-16 h-28 border-2 border-[#FFF8F0]/[0.12] rounded-b-2xl rounded-t-lg overflow-hidden flex-shrink-0">
          <div className="absolute bottom-0 left-0 right-0 transition-all duration-700 rounded-b-xl"
            style={{
              height: `${progress.progressPercent}%`,
              background: `linear-gradient(to top, #34D399, #2DD4BF)`,
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[12px] font-mono text-[#FFF8F0]/80 font-bold drop-shadow">
              {progress.progressPercent}%
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex justify-between text-[12px]">
            <span className="text-[#FFF8F0]/60">{formatCurrency(jar.currentAmount, jar.currency)}</span>
            <span className="text-[#FFF8F0]/40">/ {formatCurrency(jar.goalAmount, jar.currency)}</span>
          </div>
          <div className="w-full h-2 bg-[#FFF8F0]/[0.05] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#34D399] to-[#2DD4BF] rounded-full transition-all duration-500"
              style={{ width: `${progress.progressPercent}%` }} />
          </div>
          <p className="text-[10px] font-mono text-[#FFF8F0]/30 uppercase tracking-wider">
            {formatCurrency(progress.remaining, jar.currency)} remaining
          </p>
        </div>
      </div>

      {/* Add savings inline form */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" placeholder="Amount" className={inputCls} />
        </div>
        <div className="flex-[2]">
          <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description" className={inputCls} />
        </div>
        <div className="flex-1">
          <input value={habitName} onChange={(e) => setHabitName(e.target.value)} placeholder="Habit (opt)" className={inputCls} />
        </div>
        <button onClick={handleAdd} disabled={isPending || !amount || !desc.trim()}
          className="px-3 py-1.5 bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/30 rounded-xl text-[11px] font-mono uppercase tracking-wider disabled:opacity-40 flex-shrink-0">
          {isPending ? "..." : "Add"}
        </button>
      </div>

      {/* Recent transactions */}
      {txns.length > 0 && (
        <div className="space-y-1 pt-1">
          <p className="text-[10px] font-mono text-[#FFF8F0]/30 uppercase tracking-wider">Recent</p>
          {txns.map((t) => (
            <div key={t.id} className="flex items-center justify-between text-[11px] text-[#FFF8F0]/50 py-1">
              <span>{t.description} {t.habitName && <span className="text-[#FEC89A]/60">({t.habitName})</span>}</span>
              <span className="text-[#34D399] font-mono">+{formatCurrency(t.amount, jar.currency)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Delete */}
      <div className="flex justify-end">
        <button onClick={() => onDelete(jar.id)} disabled={parentPending}
          className="px-3 py-1 text-[#FFF8F0]/30 hover:text-[#F87171] text-[11px] font-mono transition-colors disabled:opacity-40">
          Delete
        </button>
      </div>
    </div>
  );
}

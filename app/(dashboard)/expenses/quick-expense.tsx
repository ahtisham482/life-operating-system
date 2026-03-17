"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { createExpense } from "./actions";
import { getTodayKarachi } from "@/lib/utils";

const QUICK_CATEGORIES = [
  { label: "Food", category: "Food & Drinks", icon: "\u{1F37D}\uFE0F" },
  { label: "Transport", category: "Transport", icon: "\u{1F697}" },
  { label: "Bills", category: "Bills & Utilities", icon: "\u{1F4C4}" },
  { label: "Shopping", category: "Shopping", icon: "\u{1F6CD}\uFE0F" },
  { label: "Health", category: "Health", icon: "\u{1F48A}" },
  { label: "Business", category: "Business", icon: "\u{1F4BC}" },
  { label: "Charity", category: "Sadqa / Charity", icon: "\u{1F932}" },
  { label: "Other", category: "Other", icon: "\u{1F4CC}" },
];

export function QuickExpense() {
  const [selected, setSelected] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [dateMode, setDateMode] = useState<"today" | "yesterday">("today");
  const [expenseType, setExpenseType] = useState<"Need" | "Desire">("Need");
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selected && inputRef.current) {
      inputRef.current.focus();
    }
  }, [selected]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [success]);

  function getDate(): string {
    const today = getTodayKarachi();
    if (dateMode === "today") return today;
    // Subtract 1 day
    const d = new Date(today + "T00:00:00");
    d.setDate(d.getDate() - 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function handleSubmit() {
    if (!selected || !amount || Number(amount) <= 0) return;

    const cat = QUICK_CATEGORIES.find((c) => c.category === selected);
    if (!cat) return;

    startTransition(async () => {
      await createExpense({
        item: `${cat.label} expense`,
        amountPkr: Number(amount),
        category: cat.category,
        date: getDate(),
        type: expenseType,
        notes: null,
      });
      setSelected(null);
      setAmount("");
      setDateMode("today");
      setExpenseType("Need");
      setSuccess(true);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="space-y-3">
      {/* Category grid */}
      <div className="grid grid-cols-4 gap-2">
        {QUICK_CATEGORIES.map((cat) => (
          <button
            key={cat.category}
            type="button"
            onClick={() => setSelected(selected === cat.category ? null : cat.category)}
            className={`px-3 py-2.5 rounded-xl border text-[10px] font-mono transition-all ${
              selected === cat.category
                ? "border-[#FF6B6B]/20 bg-[#FF6B6B]/[0.08] text-[#FF6B6B]"
                : "border-[#FFF8F0]/[0.05] text-[#FFF8F0]/50 hover:border-[#FFF8F0]/[0.1] hover:text-[#FFF8F0]/80"
            }`}
          >
            <span className="text-base block mb-1">{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Amount input area — shown when category is selected */}
      {selected && (
        <div className="space-y-3 animate-slide-up" style={{ animationFillMode: "both" }}>
          <input
            ref={inputRef}
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Amount (PKR)"
            className="w-full h-12 text-lg font-mono bg-transparent border-b border-[#FFF8F0]/[0.1] focus:border-[#FF6B6B]/40 text-[#FFF8F0]/90 outline-none text-center"
            min="1"
          />

          <div className="flex items-center justify-between gap-2">
            {/* Date toggle */}
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setDateMode("today")}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest border transition-all ${
                  dateMode === "today"
                    ? "border-[#FF6B6B]/20 bg-[#FF6B6B]/[0.08] text-[#FF6B6B]"
                    : "border-[#FFF8F0]/[0.05] text-[#FFF8F0]/40 hover:text-[#FFF8F0]/80"
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setDateMode("yesterday")}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest border transition-all ${
                  dateMode === "yesterday"
                    ? "border-[#FF6B6B]/20 bg-[#FF6B6B]/[0.08] text-[#FF6B6B]"
                    : "border-[#FFF8F0]/[0.05] text-[#FFF8F0]/40 hover:text-[#FFF8F0]/80"
                }`}
              >
                Yesterday
              </button>
            </div>

            {/* Need/Desire toggle */}
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setExpenseType("Need")}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest border transition-all ${
                  expenseType === "Need"
                    ? "border-[#FF6B6B]/20 bg-[#FF6B6B]/[0.08] text-[#FF6B6B]"
                    : "border-[#FFF8F0]/[0.05] text-[#FFF8F0]/40 hover:text-[#FFF8F0]/80"
                }`}
              >
                Need
              </button>
              <button
                type="button"
                onClick={() => setExpenseType("Desire")}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest border transition-all ${
                  expenseType === "Desire"
                    ? "border-[#FF6B6B]/20 bg-[#FF6B6B]/[0.08] text-[#FF6B6B]"
                    : "border-[#FFF8F0]/[0.05] text-[#FFF8F0]/40 hover:text-[#FFF8F0]/80"
                }`}
              >
                Desire
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !amount || Number(amount) <= 0}
            className="w-full py-2.5 rounded-xl border border-[#FF6B6B]/20 bg-[#FF6B6B]/[0.08] text-[#FF6B6B] text-[11px] font-mono uppercase tracking-widest hover:bg-[#FF6B6B]/[0.15] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPending ? "Saving..." : "Add Expense"}
          </button>
        </div>
      )}

      {/* Success message */}
      {success && (
        <p className="text-[10px] font-mono text-[#FF6B6B]/70 text-center tracking-wider animate-slide-up">
          Expense added successfully
        </p>
      )}
    </div>
  );
}

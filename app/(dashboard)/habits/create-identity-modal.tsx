"use client";

import { useState, useTransition } from "react";
import { X, ChevronRight } from "lucide-react";
import { createIdentity } from "./identity-actions";
import type { IdentityCategory } from "@/lib/db/schema";

const CATEGORIES: { value: IdentityCategory; label: string; icon: string }[] = [
  { value: "health", label: "Health", icon: "🏥" },
  { value: "learning", label: "Learning", icon: "📚" },
  { value: "productivity", label: "Productivity", icon: "⚡" },
  { value: "relationships", label: "Relationships", icon: "❤️" },
  { value: "finance", label: "Finance", icon: "💰" },
  { value: "creativity", label: "Creativity", icon: "🎨" },
  { value: "spirituality", label: "Spirituality", icon: "🧘" },
  { value: "personal", label: "Personal", icon: "⭐" },
];

const COLORS = [
  "#FF6B6B",
  "#FF9F43",
  "#FEC89A",
  "#FFEAA7",
  "#55EFC4",
  "#00B894",
  "#74B9FF",
  "#A29BFE",
  "#FD79A8",
  "#6C5CE7",
];

interface CreateIdentityModalProps {
  onClose: () => void;
  onCreated: (id: string) => void;
}

type Step = "statement" | "category" | "why";

export function CreateIdentityModal({
  onClose,
  onCreated,
}: CreateIdentityModalProps) {
  const [step, setStep] = useState<Step>("statement");
  const [statement, setStatement] = useState("I am ");
  const [category, setCategory] = useState<IdentityCategory>("personal");
  const [icon, setIcon] = useState("⭐");
  const [color, setColor] = useState("#FF6B6B");
  const [why, setWhy] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleStatementNext() {
    const trimmed = statement.trim();
    if (trimmed.length < 8 || trimmed === "I am") {
      setError('Complete your identity statement, e.g. "I am a reader".');
      return;
    }
    setError("");
    setStep("category");
  }

  function handleCategoryNext() {
    setStep("why");
  }

  function handleSubmit() {
    startTransition(async () => {
      try {
        const id = await createIdentity({
          identityStatement: statement,
          identityCategory: category,
          icon,
          color,
          whyStatement: why || undefined,
        });
        onCreated(id);
        onClose();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-[#0d0d1a] border border-[#FFF8F0]/[0.1] rounded-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#FFF8F0]/30">
              Step{" "}
              {step === "statement" ? "1" : step === "category" ? "2" : "3"} / 3
            </p>
            <h2 className="text-base font-serif italic text-[#FFF8F0]/90 mt-0.5">
              {step === "statement" && "Who are you becoming?"}
              {step === "category" && "Choose a category"}
              {step === "why" && "Why does this matter?"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#FFF8F0]/20 hover:text-[#FFF8F0]/60 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Step 1: Statement */}
        {step === "statement" && (
          <div className="space-y-3">
            <input
              type="text"
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              className="w-full bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.08] text-[#FFF8F0]/80 px-4 py-3 text-sm font-serif rounded-xl focus:outline-none focus:ring-1 focus:ring-[#FF6B6B]/30 placeholder:text-[#FFF8F0]/20"
              placeholder="I am a reader"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleStatementNext()}
            />
            <p className="text-[10px] font-mono text-[#FFF8F0]/25 leading-relaxed">
              Start with &quot;I am&quot; — not &quot;I want to&quot;.
              Identity-first thinking is more powerful than goal-setting.
            </p>
            {error && (
              <p className="text-[10px] font-mono text-[#FF6B6B]">{error}</p>
            )}
          </div>
        )}

        {/* Step 2: Category + color */}
        {step === "category" && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => {
                    setCategory(c.value);
                    setIcon(c.icon);
                  }}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all ${
                    category === c.value
                      ? "border-[#FF6B6B]/40 bg-[#FF6B6B]/10"
                      : "border-[#FFF8F0]/[0.07] hover:border-[#FFF8F0]/[0.15]"
                  }`}
                >
                  <span className="text-lg">{c.icon}</span>
                  <span className="text-[8px] font-mono text-[#FFF8F0]/40">
                    {c.label}
                  </span>
                </button>
              ))}
            </div>
            <div>
              <p className="text-[9px] font-mono uppercase tracking-[0.15em] text-[#FFF8F0]/30 mb-2">
                Color
              </p>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-6 h-6 rounded-full transition-all ${
                      color === c
                        ? "ring-2 ring-offset-2 ring-offset-[#0d0d1a] ring-[#FFF8F0]/40 scale-110"
                        : "opacity-60 hover:opacity-100"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Why */}
        {step === "why" && (
          <div className="space-y-3">
            <textarea
              value={why}
              onChange={(e) => setWhy(e.target.value)}
              rows={3}
              className="w-full bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.08] text-[#FFF8F0]/80 px-4 py-3 text-sm font-serif rounded-xl focus:outline-none focus:ring-1 focus:ring-[#FF6B6B]/30 placeholder:text-[#FFF8F0]/20 resize-none"
              placeholder="Because... (optional)"
              autoFocus
            />
            <p className="text-[10px] font-mono text-[#FFF8F0]/25 leading-relaxed">
              The &quot;why&quot; is your anchor on hard days. Even one sentence
              helps.
            </p>
            {error && (
              <p className="text-[10px] font-mono text-[#FF6B6B]">{error}</p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {step !== "statement" && (
            <button
              onClick={() => setStep(step === "why" ? "category" : "statement")}
              className="px-4 py-2.5 text-[10px] font-mono uppercase tracking-widest border border-[#FFF8F0]/[0.1] text-[#FFF8F0]/40 rounded-xl hover:bg-[#FFF8F0]/[0.05] transition-colors"
            >
              Back
            </button>
          )}
          {step !== "why" ? (
            <button
              onClick={
                step === "statement" ? handleStatementNext : handleCategoryNext
              }
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[10px] font-mono uppercase tracking-widest bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 rounded-xl hover:bg-[#FF6B6B]/30 transition-colors"
            >
              Continue <ChevronRight size={12} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="flex-1 py-2.5 text-[10px] font-mono uppercase tracking-widest bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 rounded-xl hover:bg-[#FF6B6B]/30 transition-colors disabled:opacity-50"
            >
              {isPending ? "Creating..." : "Create identity"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

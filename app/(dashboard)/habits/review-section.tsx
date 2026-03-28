"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import type { MasteryReview } from "@/lib/mastery";
import { MONTHLY_PROMPTS, QUARTERLY_PROMPTS, WEEKLY_PROMPTS } from "@/lib/mastery";
import { createReview, getReviews, getReviewDue } from "./mastery-actions";

const label = "text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider";
const glass = "bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl";
const inputCls = "bg-[#FFF8F0]/[0.05] border border-[#FFF8F0]/[0.08] rounded-xl text-[#FFF8F0] px-3 py-2 text-[14px] focus:outline-none w-full";
const btnPrimary = "px-4 py-2 bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 rounded-xl text-[13px] font-medium hover:bg-[#FF6B6B]/30 transition-all disabled:opacity-30";

type ReviewType = "weekly" | "monthly" | "quarterly";

const TYPE_COLORS: Record<string, string> = {
  weekly: "#60A5FA",
  monthly: "#FEC89A",
  quarterly: "#A78BFA",
};

export function ReviewSection() {
  const [pending, start] = useTransition();
  const [reviews, setReviews] = useState<MasteryReview[]>([]);
  const [dueInfo, setDueInfo] = useState<{ type: string; daysSince: number; isOverdue: boolean } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [reviewType, setReviewType] = useState<ReviewType>("monthly");
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [expandedReview, setExpandedReview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    start(async () => {
      const [revs, due] = await Promise.all([getReviews(), getReviewDue()]);
      setReviews(revs);
      setDueInfo(due);
      setLoading(false);
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  function updateResponse(key: string, value: string) {
    setResponses((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit() {
    const now = new Date();
    const periodLabel =
      reviewType === "weekly"
        ? `Week of ${now.toLocaleDateString()}`
        : reviewType === "monthly"
          ? now.toLocaleDateString("en-US", { year: "numeric", month: "long" })
          : `Q${Math.ceil((now.getMonth() + 1) / 3)} ${now.getFullYear()}`;

    start(async () => {
      await createReview({
        reviewType,
        periodLabel,
        responses,
      });
      setShowForm(false);
      setResponses({});
      load();
    });
  }

  const getPrompts = (type: ReviewType) => {
    if (type === "monthly") return MONTHLY_PROMPTS;
    if (type === "quarterly") return QUARTERLY_PROMPTS;
    return WEEKLY_PROMPTS;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-[#FF6B6B]/30 border-t-[#FF6B6B] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Due indicator */}
      {dueInfo && dueInfo.isOverdue && (
        <div className="p-3 bg-[#FEC89A]/[0.08] border border-[#FEC89A]/20 rounded-xl flex items-center justify-between">
          <p className="text-[13px] text-[#FEC89A]">
            {"📋"} {dueInfo.type.charAt(0).toUpperCase() + dueInfo.type.slice(1)} review due ({dueInfo.daysSince} days since last)
          </p>
          <button
            onClick={() => { setReviewType(dueInfo.type as ReviewType); setShowForm(true); }}
            className={btnPrimary}
          >
            Start Review
          </button>
        </div>
      )}

      {!dueInfo?.isOverdue && !showForm && (
        <button onClick={() => setShowForm(true)} className={btnPrimary}>
          Start a Review
        </button>
      )}

      {/* Review Form */}
      {showForm && (
        <div className={`${glass} p-5 space-y-4`}>
          <p className={label}>New Review</p>

          {/* Type selector */}
          <div className="flex gap-1 p-1 bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl w-fit">
            {(["weekly", "monthly", "quarterly"] as ReviewType[]).map((t) => (
              <button
                key={t}
                onClick={() => { setReviewType(t); setResponses({}); }}
                className={`px-4 py-1.5 text-[10px] font-mono uppercase tracking-[0.2em] rounded-xl transition-all ${
                  reviewType === t
                    ? "bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30"
                    : "text-[#FFF8F0]/30 hover:text-[#FFF8F0]/60"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Prompts */}
          <div className="space-y-3">
            {getPrompts(reviewType).map((prompt) => (
              <div key={prompt.id} className="space-y-1">
                <p className="text-[13px] text-[#FFF8F0]/60">{prompt.label}</p>
                {"type" in prompt && prompt.type === "goldilocks" ? (
                  <p className="text-[12px] text-[#FFF8F0]/40 italic">
                    Rate each habit: Too Easy / Just Right / Too Hard
                  </p>
                ) : null}
                <textarea
                  value={responses[prompt.id] || ""}
                  onChange={(e) => updateResponse(prompt.id, e.target.value)}
                  rows={3}
                  className={`${inputCls} resize-none`}
                  placeholder="Your reflection..."
                />
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={pending || Object.keys(responses).length === 0}
              className={btnPrimary}
            >
              Complete Review
            </button>
            <button
              onClick={() => { setShowForm(false); setResponses({}); }}
              className="text-[13px] text-[#FFF8F0]/40 hover:text-[#FFF8F0]/60 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Past Reviews */}
      {reviews.length > 0 && (
        <div className="space-y-3">
          <p className={label}>Past Reviews</p>
          {reviews.slice(0, 5).map((r) => {
            const isExpanded = expandedReview === r.id;
            const typeColor = TYPE_COLORS[r.reviewType] || "#9CA3AF";

            return (
              <div key={r.id} className={`${glass} p-4 space-y-2`}>
                <button
                  onClick={() => setExpandedReview(isExpanded ? null : r.id)}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-lg"
                      style={{
                        background: `${typeColor}20`,
                        color: typeColor,
                      }}
                    >
                      {r.reviewType}
                    </span>
                    <span className="text-[14px] text-[#FFF8F0]">
                      {r.periodLabel}
                    </span>
                  </div>
                  <span className="text-[12px] text-[#FFF8F0]/30">
                    {new Date(r.completedAt).toLocaleDateString()}
                  </span>
                </button>

                {/* Preview */}
                {!isExpanded && r.responses && (
                  <p className="text-[12px] text-[#FFF8F0]/40 line-clamp-2">
                    {Object.values(r.responses).filter(Boolean).join(" | ").slice(0, 120)}
                    {Object.values(r.responses).join(" | ").length > 120 ? "..." : ""}
                  </p>
                )}

                {/* Full view */}
                {isExpanded && (
                  <div className="space-y-3 pt-2">
                    {Object.entries(r.responses || {}).map(([key, value]) => (
                      <div key={key}>
                        <p className={label}>{key.replace(/_/g, " ")}</p>
                        <p className="text-[13px] text-[#FFF8F0]/60 mt-0.5 whitespace-pre-wrap">{value}</p>
                      </div>
                    ))}

                    {/* Auto insights */}
                    {r.autoInsights && r.autoInsights.length > 0 && (
                      <div className="p-3 bg-[#34D399]/[0.05] border border-[#34D399]/20 rounded-xl">
                        <p className={label}>Auto Insights</p>
                        <ul className="mt-1 space-y-1">
                          {r.autoInsights.map((insight, i) => (
                            <li key={i} className="text-[13px] text-[#34D399]/80 flex items-start gap-2">
                              <span className="text-[#34D399] mt-0.5">{"-->"}</span>
                              {insight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {reviews.length === 0 && !showForm && (
        <div className={`${glass} p-6 text-center`}>
          <p className="text-[14px] text-[#FFF8F0]/50">No reviews yet. Start your first reflection.</p>
        </div>
      )}
    </div>
  );
}

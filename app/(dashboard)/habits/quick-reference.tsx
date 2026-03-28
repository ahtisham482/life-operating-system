"use client";

import { useState } from "react";
import { QUICK_REFERENCE } from "@/lib/dayone";

const BOOK_QUOTES: Record<string, string> = {
  "1. Make It Obvious":
    "Until you make the unconscious conscious, it will direct your life and you will call it fate.",
  "2. Make It Attractive":
    "It is the anticipation of a reward — not the fulfillment of it — that gets us to take action.",
  "3. Make It Easy":
    "The most effective form of learning is practice, not planning.",
  "4. Make It Satisfying":
    "What is immediately rewarded is repeated. What is immediately punished is avoided.",
  "1. Make It Invisible":
    "People with high self-control tend to spend less time in tempting situations. It is easier to avoid temptation than resist it.",
  "2. Make It Unattractive":
    "Every behavior has a surface level craving and a deeper underlying motive.",
  "3. Make It Difficult":
    "A commitment device is a choice you make in the present that controls your actions in the future.",
  "4. Make It Unsatisfying":
    "We are less likely to repeat a bad habit if it is painful or unsatisfying.",
  "Core Principles":
    "You do not rise to the level of your goals. You fall to the level of your systems.",
};

export function QuickReference() {
  const [expandedLaws, setExpandedLaws] = useState<Set<string>>(new Set());
  const [expandedQuotes, setExpandedQuotes] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");

  function toggleLaw(law: string) {
    setExpandedLaws((prev) => {
      const next = new Set(prev);
      if (next.has(law)) next.delete(law);
      else next.add(law);
      return next;
    });
  }

  function toggleQuote(law: string) {
    setExpandedQuotes((prev) => {
      const next = new Set(prev);
      if (next.has(law)) next.delete(law);
      else next.add(law);
      return next;
    });
  }

  const lowerFilter = filter.toLowerCase();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-serif text-[#FFF8F0]">
          📖 Atomic Habits Quick Reference
        </h2>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search..."
          className="px-4 py-2 bg-[#FFF8F0]/[0.05] border border-[#FFF8F0]/[0.08] rounded-xl text-[#FFF8F0] text-sm placeholder:text-[#FFF8F0]/30 outline-none w-48"
        />
      </div>

      {/* Sections */}
      {QUICK_REFERENCE.map((section) => {
        const filteredLaws = section.laws
          .map((law) => ({
            ...law,
            items: lowerFilter
              ? law.items.filter((item) =>
                  item.toLowerCase().includes(lowerFilter) ||
                  law.law.toLowerCase().includes(lowerFilter),
                )
              : law.items,
          }))
          .filter((law) => law.items.length > 0);

        if (filteredLaws.length === 0) return null;

        return (
          <div
            key={section.category}
            className="bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl p-5 space-y-3"
          >
            <h3 className="text-[10px] font-mono text-[#FFF8F0]/40 uppercase tracking-wider flex items-center gap-2">
              <span className="text-base">{section.icon}</span>
              {section.category}
            </h3>

            {filteredLaws.map((law) => {
              const isExpanded = expandedLaws.has(law.law);
              const showQuote = expandedQuotes.has(law.law);
              const quote = BOOK_QUOTES[law.law];

              return (
                <div key={law.law} className="space-y-2">
                  <button
                    onClick={() => toggleLaw(law.law)}
                    className="w-full flex items-center justify-between text-left px-3 py-2 rounded-xl hover:bg-[#FFF8F0]/[0.03] transition-all"
                  >
                    <span className="text-sm text-[#FFF8F0]">{law.law}</span>
                    <span className="text-[#FFF8F0]/30 text-[12px]">
                      {isExpanded ? "−" : "+"}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="pl-4 space-y-1.5">
                      {law.items.map((item) => (
                        <p
                          key={item}
                          className="text-sm text-[#FFF8F0]/60 flex items-start gap-2"
                        >
                          <span className="text-[#FFF8F0]/30 mt-0.5">•</span>
                          <span>{item}</span>
                        </p>
                      ))}

                      {/* Book quote */}
                      {quote && (
                        <button
                          onClick={() => toggleQuote(law.law)}
                          className="text-[12px] text-[#FEC89A]/60 hover:text-[#FEC89A] mt-1"
                        >
                          {showQuote ? "Hide quote" : "From the book..."}
                        </button>
                      )}
                      {showQuote && quote && (
                        <div className="p-3 bg-[#FEC89A]/10 border border-[#FEC89A]/20 rounded-xl mt-1">
                          <p className="text-sm text-[#FEC89A] font-serif italic">
                            &quot;{quote}&quot;
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

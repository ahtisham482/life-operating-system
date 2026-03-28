"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface HabitsTabsProps {
  activeTab: "tracker" | "identity" | "scorecard" | "architect" | "attract" | "friction" | "rewards" | "breaker" | "mastery";
}

export function HabitsTabs({ activeTab }: HabitsTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function navigate(tab: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "tracker") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const query = params.toString();
    router.push(`${pathname}${query ? `?${query}` : ""}`);
  }

  const tabs = [
    { key: "tracker", label: "Tracker" },
    { key: "identity", label: "Identity" },
    { key: "scorecard", label: "Scorecard" },
    { key: "architect", label: "Architect" },
    { key: "attract", label: "Attract" },
    { key: "friction", label: "Friction" },
    { key: "rewards", label: "Rewards" },
    { key: "breaker", label: "Breaker" },
    { key: "mastery", label: "Mastery" },
  ] as const;

  return (
    <div className="flex gap-1 p-1 bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl w-fit">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => navigate(tab.key)}
          className={`px-4 py-1.5 text-[10px] font-mono uppercase tracking-[0.2em] rounded-xl transition-all ${
            activeTab === tab.key
              ? "bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30"
              : "text-[#FFF8F0]/30 hover:text-[#FFF8F0]/60"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";

export function BookTabs({ activeTab }: { activeTab: string }) {
  const router = useRouter();

  function handleTab(tab: string) {
    router.push(`/books?tab=${tab}`);
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => handleTab("prescribed")}
        className={`px-5 py-2.5 rounded-xl text-[11px] font-mono uppercase tracking-widest transition-all ${
          activeTab === "prescribed"
            ? "glass-card border-[#C49E45]/20 bg-[#C49E45]/[0.08] text-[#C49E45]"
            : "glass-card text-white/40 hover:text-white/70 hover:border-white/[0.08]"
        }`}
      >
        Prescribed
      </button>
      <button
        type="button"
        onClick={() => handleTab("custom")}
        className={`px-5 py-2.5 rounded-xl text-[11px] font-mono uppercase tracking-widest transition-all ${
          activeTab === "custom"
            ? "glass-card border-[#C49E45]/20 bg-[#C49E45]/[0.08] text-[#C49E45]"
            : "glass-card text-white/40 hover:text-white/70 hover:border-white/[0.08]"
        }`}
      >
        Custom
      </button>
    </div>
  );
}

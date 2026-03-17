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
            ? "glass-card border-[#FF6B6B]/20 bg-[#FF6B6B]/[0.08] text-[#FF6B6B]"
            : "glass-card text-[#FFF8F0]/40 hover:text-[#FFF8F0]/70 hover:border-[#FFF8F0]/[0.08]"
        }`}
      >
        Prescribed
      </button>
      <button
        type="button"
        onClick={() => handleTab("custom")}
        className={`px-5 py-2.5 rounded-xl text-[11px] font-mono uppercase tracking-widest transition-all ${
          activeTab === "custom"
            ? "glass-card border-[#FF6B6B]/20 bg-[#FF6B6B]/[0.08] text-[#FF6B6B]"
            : "glass-card text-[#FFF8F0]/40 hover:text-[#FFF8F0]/70 hover:border-[#FFF8F0]/[0.08]"
        }`}
      >
        Custom
      </button>
    </div>
  );
}

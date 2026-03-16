"use client";

import { useTransition } from "react";
import { setLeadDomain } from "./actions";

type DomainDef = {
  id: string;
  label: string;
  icon: string;
  desc: string;
};

type DomainListProps = {
  seasonId: string;
  domains: Record<string, string>;
  domainDefs: DomainDef[];
  maintenanceGuidance?: Record<string, string>;
};

export function DomainList({
  seasonId,
  domains,
  domainDefs,
  maintenanceGuidance = {},
}: DomainListProps) {
  const [isPending, startTransition] = useTransition();

  const leadCount = Object.values(domains).filter((v) => v === "lead").length;

  function handleToggle(domainId: string) {
    const currentMode = domains[domainId] || "maintenance";
    const newDomainId = currentMode === "lead" ? "" : domainId;

    if (!newDomainId) return;

    startTransition(async () => {
      await setLeadDomain(seasonId, newDomainId, domains);
    });
  }

  return (
    <div className={isPending ? "opacity-60 pointer-events-none" : ""}>
      {leadCount > 1 && (
        <div className="text-xs font-mono text-red-400 border border-red-500/30 px-3 py-1.5 inline-block mb-4 rounded">
          {leadCount} DOMAINS SET AS LEAD — SET ONE ONLY
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {domainDefs.map((d) => {
          const mode = domains[d.id] || "maintenance";
          const isLead = mode === "lead";
          const guidance = maintenanceGuidance[d.id];

          return (
            <div
              key={d.id}
              onClick={() => handleToggle(d.id)}
              className={`glass-card rounded-2xl p-5 cursor-pointer transition-all hover:border-white/[0.08] ${
                isLead
                  ? "border-[#C49E45]/30 bg-[#C49E45]/[0.04]"
                  : ""
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-lg ${
                    isLead ? "text-[#C49E45]" : "text-white/20"
                  }`}
                >
                  {d.icon}
                </span>
                <span
                  className={`text-[8px] font-mono tracking-[0.3em] uppercase px-2 py-0.5 rounded-full border ${
                    isLead
                      ? "text-[#C49E45] border-[#C49E45]/30 bg-[#C49E45]/10"
                      : "text-white/25 border-white/[0.06]"
                  }`}
                >
                  {mode.toUpperCase()}
                </span>
              </div>
              <p
                className={`text-sm font-serif ${
                  isLead ? "text-white/90" : "text-white/50"
                }`}
              >
                {d.label}
              </p>
              {!isLead && guidance && (
                <p className="text-[9px] font-mono text-white/20 mt-2 leading-relaxed">
                  {guidance}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

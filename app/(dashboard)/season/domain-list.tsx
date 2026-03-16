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
};

export function DomainList({ seasonId, domains, domainDefs }: DomainListProps) {
  const [isPending, startTransition] = useTransition();

  const leadCount = Object.values(domains).filter((v) => v === "lead").length;

  function handleToggle(domainId: string) {
    const currentMode = domains[domainId] || "maintenance";
    const newDomainId = currentMode === "lead" ? "" : domainId;

    if (!newDomainId) return; // Don't allow removing lead without setting another

    startTransition(async () => {
      await setLeadDomain(seasonId, newDomainId, domains);
    });
  }

  return (
    <div className={isPending ? "opacity-60 pointer-events-none" : ""}>
      {leadCount > 1 && (
        <div className="text-xs font-mono text-red-400 border border-red-500/30 px-3 py-1.5 inline-block mb-4 rounded">
          ⚠ {leadCount} DOMAINS SET AS LEAD — SET ONE ONLY
        </div>
      )}

      <div className="space-y-2">
        {domainDefs.map((d) => {
          const mode = domains[d.id] || "maintenance";
          const isLead = mode === "lead";

          return (
            <div
              key={d.id}
              onClick={() => handleToggle(d.id)}
              className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-all ${
                isLead
                  ? "bg-primary/5 border border-primary/30"
                  : "bg-card border border-border hover:border-border/80"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`text-lg ${
                    isLead ? "text-primary" : "text-muted-foreground/30"
                  }`}
                >
                  {d.icon}
                </span>
                <div>
                  <p
                    className={`text-sm ${
                      isLead ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {d.label}
                  </p>
                  <p className="text-[11px] font-mono text-muted-foreground/50">
                    {d.desc}
                  </p>
                </div>
              </div>
              <span
                className={`text-[10px] font-mono tracking-widest px-3 py-1 border rounded ${
                  isLead
                    ? "text-primary border-primary/30"
                    : "text-muted-foreground/30 border-border"
                }`}
              >
                {mode.toUpperCase()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

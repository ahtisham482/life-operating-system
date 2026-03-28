"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import type { Gateway, FrictionMap, DecisiveMoment } from "@/lib/friction";
import { getGateways, getFrictionMaps, getDecisiveMoments } from "./friction-actions";
import { GatewaySection } from "./gateway-section";
import { FrictionMapSection } from "./friction-map-section";
import { MomentSection } from "./moment-section";
import { EmptyState } from "./empty-state";

interface FrictionTabProps {
  identities: { id: string; identityStatement: string }[];
}

type Section = "gateways" | "friction_maps" | "moments";

export function FrictionTab({ identities }: FrictionTabProps) {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [frictionMaps, setFrictionMaps] = useState<FrictionMap[]>([]);
  const [moments, setMoments] = useState<DecisiveMoment[]>([]);
  const [activeSection, setActiveSection] = useState<Section>("gateways");
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  const loadData = useCallback(async () => {
    const [g, f, m] = await Promise.all([
      getGateways(),
      getFrictionMaps(),
      getDecisiveMoments(),
    ]);
    setGateways(g);
    setFrictionMaps(f);
    setMoments(m);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleRefresh() {
    startTransition(() => {
      loadData();
    });
  }

  const sections: { key: Section; label: string }[] = [
    { key: "gateways", label: "Gateways" },
    { key: "friction_maps", label: "Friction Maps" },
    { key: "moments", label: "Decisive Moments" },
  ];

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-[#FFF8F0]/[0.03] rounded-2xl" />
        <div className="h-32 bg-[#FFF8F0]/[0.03] rounded-2xl" />
        <div className="h-48 bg-[#FFF8F0]/[0.03] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section pills */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 p-1 bg-[#FFF8F0]/[0.03] border border-[#FFF8F0]/[0.06] rounded-2xl">
          {sections.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`px-4 py-1.5 text-[10px] font-mono uppercase tracking-[0.2em] rounded-xl transition-all ${
                activeSection === s.key
                  ? "bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30"
                  : "text-[#FFF8F0]/30 hover:text-[#FFF8F0]/60 border border-transparent"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tagline */}
      {gateways.length === 0 && frictionMaps.length === 0 && moments.length === 0 ? (
        <EmptyState
          icon="⚡"
          title="Engineer the path of least resistance"
          description="Start impossibly small with 2-minute gateways, map and eliminate friction from good habits, and identify the decisive moments that determine your day."
          principle="Human behavior follows the path of least resistance — always. Make the right thing easy."
        />
      ) : (
        <div className="text-center">
          <p className="text-[11px] font-mono text-[#FFF8F0]/25 italic">
            Reduce friction for good habits. Increase it for bad ones.
          </p>
        </div>
      )}

      {/* Active section */}
      {activeSection === "gateways" && (
        <GatewaySection gateways={gateways} onRefresh={handleRefresh} />
      )}
      {activeSection === "friction_maps" && (
        <FrictionMapSection maps={frictionMaps} onRefresh={handleRefresh} />
      )}
      {activeSection === "moments" && (
        <MomentSection moments={moments} onRefresh={handleRefresh} />
      )}
    </div>
  );
}

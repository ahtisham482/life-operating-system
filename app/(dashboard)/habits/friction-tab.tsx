"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import type { Gateway, FrictionMap, DecisiveMoment } from "@/lib/friction";
import { getGateways, getFrictionMaps, getDecisiveMoments } from "./friction-actions";
import { GatewaySection } from "./gateway-section";
import { FrictionMapSection } from "./friction-map-section";
import { MomentSection } from "./moment-section";
import { EmptyState } from "./empty-state";
import { PillSelector } from "./ui-kit";

interface FrictionTabProps {
  identities: { id: string; identityStatement: string }[];
  initialData?: { gateways: Gateway[]; frictionMaps: FrictionMap[]; moments: DecisiveMoment[] } | null;
}

type Section = "gateways" | "friction_maps" | "moments";

export function FrictionTab({ identities, initialData }: FrictionTabProps) {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [frictionMaps, setFrictionMaps] = useState<FrictionMap[]>([]);
  const [moments, setMoments] = useState<DecisiveMoment[]>([]);
  const [activeSection, setActiveSection] = useState<Section>("gateways");
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  const loadData = useCallback(async () => {
    try {
      const [g, f, m] = await Promise.all([
        getGateways().catch(() => []),
        getFrictionMaps().catch(() => []),
        getDecisiveMoments().catch(() => []),
      ]);
      setGateways(g);
      setFrictionMaps(f);
      setMoments(m);
    } catch {
      // Tables may not exist yet — show empty state
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (initialData?.gateways != null) {
      setGateways(initialData.gateways);
      setFrictionMaps(initialData.frictionMaps ?? []);
      setMoments(initialData.moments ?? []);
      setLoading(false);
      return;
    }
    loadData();
  }, [loadData]); // eslint-disable-line react-hooks/exhaustive-deps

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
        <PillSelector
          options={sections}
          selected={activeSection}
          onSelect={setActiveSection}
          color="#2DD4BF"
        />
      </div>

      <p className="text-[11px] font-mono text-[#FFF8F0]/30 mb-4">
        Reduce friction for good habits (make them easy) and increase friction for bad habits (make them hard).
      </p>

      {/* Tagline */}
      {gateways.length === 0 && frictionMaps.length === 0 && moments.length === 0 ? (
        <EmptyState
          icon="⚡"
          title="Design the path of least resistance"
          description="Start impossibly small, remove obstacles from good habits, and identify the moments that determine your day."
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

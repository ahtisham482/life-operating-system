"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import type { Bundle, Reframe, Tribe, Partner } from "@/lib/attraction";
import { getBundles, getReframes, getTribes, getPartners } from "./attraction-actions";
import { BundleSection } from "./bundle-section";
import { ReframeSection } from "./reframe-section";
import { TribeSection } from "./tribe-section";

interface AttractionTabProps {
  identities: { id: string; identityStatement: string }[];
}

type Section = "bundles" | "reframes" | "tribe";

export function AttractionTab({ identities }: AttractionTabProps) {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [reframes, setReframes] = useState<Reframe[]>([]);
  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [activeSection, setActiveSection] = useState<Section>("bundles");
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  const loadData = useCallback(async () => {
    const [b, r, t, p] = await Promise.all([
      getBundles(),
      getReframes(),
      getTribes(),
      getPartners(),
    ]);
    setBundles(b);
    setReframes(r);
    setTribes(t);
    setPartners(p);
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
    { key: "bundles", label: "Bundles" },
    { key: "reframes", label: "Reframes" },
    { key: "tribe", label: "Tribe" },
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
      {/* Header */}
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

      {/* Attraction message */}
      <div className="text-center">
        <p className="text-[11px] font-mono text-[#FFF8F0]/25 italic">
          Make good habits irresistible, bad habits invisible.
        </p>
      </div>

      {/* Active section */}
      {activeSection === "bundles" && (
        <BundleSection bundles={bundles} onRefresh={handleRefresh} />
      )}
      {activeSection === "reframes" && (
        <ReframeSection reframes={reframes} onRefresh={handleRefresh} />
      )}
      {activeSection === "tribe" && (
        <TribeSection tribes={tribes} partners={partners} onRefresh={handleRefresh} />
      )}
    </div>
  );
}

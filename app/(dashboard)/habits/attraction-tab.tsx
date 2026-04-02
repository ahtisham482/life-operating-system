"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import type { Bundle, Reframe, Tribe, Partner } from "@/lib/attraction";
import { getBundles, getReframes, getTribes, getPartners } from "./attraction-actions";
import { BundleSection } from "./bundle-section";
import { ReframeSection } from "./reframe-section";
import { TribeSection } from "./tribe-section";
import { EmptyState } from "./empty-state";
import { PillSelector } from "./ui-kit";

interface AttractionTabProps {
  identities: { id: string; identityStatement: string }[];
  initialData?: { bundles: Bundle[]; reframes: Reframe[]; tribes: Tribe[]; partners: Partner[] } | null;
}

type Section = "bundles" | "reframes" | "tribe";

export function AttractionTab({ identities, initialData }: AttractionTabProps) {
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
    if (initialData?.bundles != null) {
      setBundles(initialData.bundles);
      setReframes(initialData.reframes ?? []);
      setTribes(initialData.tribes ?? []);
      setPartners(initialData.partners ?? []);
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
        <PillSelector
          options={sections}
          selected={activeSection}
          onSelect={setActiveSection}
          color="#2DD4BF"
        />
      </div>

      <p className="text-[11px] font-mono text-[#FFF8F0]/30 mb-4">
        Make good habits irresistible. Pair them with things you enjoy, reframe how you think about them, and get social support.
      </p>

      {/* Attraction message */}
      {bundles.length === 0 && reframes.length === 0 && tribes.length === 0 && partners.length === 0 ? (
        <EmptyState
          icon="🧲"
          title="Make your habits irresistible"
          description="Pair hard habits with enjoyable rewards, reframe 'I have to' into 'I get to', and surround yourself with people who make your behavior feel normal."
          principle="It's the anticipation of reward — not the reward itself — that drives behavior."
        />
      ) : (
        <div className="text-center">
          <p className="text-[11px] font-mono text-[#FFF8F0]/25 italic">
            Make good habits irresistible, bad habits invisible.
          </p>
        </div>
      )}

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

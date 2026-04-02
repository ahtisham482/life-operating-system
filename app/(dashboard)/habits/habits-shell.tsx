"use client";

import { useState, useCallback, lazy, Suspense } from "react";
import { HabitTracker } from "./habit-tracker";
import { HabitInsights } from "./habit-insights";
import { IdentityBoard } from "./identity-board";
import { SmartPrompt } from "./smart-prompt";
import { SystemSetupTracker } from "./setup-tracker";
import { ZONES, getUnlockedZones, type ZoneKey } from "./zone-utils";
import type { Habit, HabitGroup, HabitLog, HabitTemplate } from "@/lib/db/schema";

// Lazy load non-default tabs — only loads JS when tab is activated
const ScorecardTab = lazy(() => import("./scorecard-tab").then(m => ({ default: m.ScorecardTab })));
const ArchitectTab = lazy(() => import("./architect-tab").then(m => ({ default: m.ArchitectTab })));
const AttractionTab = lazy(() => import("./attraction-tab").then(m => ({ default: m.AttractionTab })));
const FrictionTab = lazy(() => import("./friction-tab").then(m => ({ default: m.FrictionTab })));
const RewardsTab = lazy(() => import("./rewards-tab").then(m => ({ default: m.RewardsTab })));
const BreakerTab = lazy(() => import("./breaker-tab").then(m => ({ default: m.BreakerTab })));
const MasteryTab = lazy(() => import("./mastery-tab").then(m => ({ default: m.MasteryTab })));
const GuideTab = lazy(() => import("./guide-tab").then(m => ({ default: m.GuideTab })));

function TabSkeleton() {
  return (
    <div className="animate-pulse space-y-4 py-4">
      <div className="h-6 w-48 bg-[#FFF8F0]/[0.05] rounded-lg" />
      <div className="h-32 bg-[#FFF8F0]/[0.03] rounded-xl" />
      <div className="h-24 bg-[#FFF8F0]/[0.03] rounded-xl" />
    </div>
  );
}

export interface HabitsShellProps {
  initialZone: string;
  initialView: string;
  // Header data
  todayCompleted: number;
  totalScheduled: number;
  timeNudge: string;
  dateLabel: string;
  today: string;
  daysOfData: number;
  // Tracker data
  sortedGroups: HabitGroup[];
  scheduledHabits: Habit[];
  notTodayHabits: Habit[];
  archivedHabits: Habit[];
  todayLogMap: Record<string, HabitLog>;
  templates: HabitTemplate[];
  diagnosisFlags: { habitId: string; missCount: number; diagnosisId?: string }[];
  keystoneHabitIds: string[];
  recoveryMessage: string | null;
  perfectDayCount: number;
  // Insights data
  allHabits: Habit[];
  heatmapDays: { date: string; dayAbbrev: string }[];
  historyLogMap: Record<string, string>;
  trends: Record<string, { d7: number; d30: number; d90: number }>;
  mostMissed: { habit: Habit; count: number }[];
  keystoneInsights: { habitId: string; habitName: string; habitEmoji: string; withRate: number; withoutRate: number }[];
  // Identity data
  identities: { id: string; identityStatement: string; icon: string | null; color: string; whyStatement: string | null; confidenceLevel: number }[];
  habitsForIdentity: { id: string; name: string; emoji: string | null; tinyVersion: string | null; identityId: string | null; isCompletedToday: boolean }[];
  uncelebrated: { id: string; milestoneTitle: string; milestoneMessage: string }[];
  weekStats: Record<string, { totalVotes: number; positiveVotes: number; percentage: number }>;
  scorecardCount: number;
  // Prefetched sub-tab data (all fetched server-side in parallel)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prefetchedData: Record<string, any>;
}

export function HabitsShell(props: HabitsShellProps) {
  const [activeZone, setActiveZone] = useState<ZoneKey>(props.initialZone as ZoneKey);
  const [activeView, setActiveView] = useState(props.initialView);

  const unlocked = getUnlockedZones(props.daysOfData, props.allHabits.length);

  // Computed booleans for SmartPrompt and SystemSetupTracker
  const hasBlueprintsData = (props.prefetchedData.blueprints?.length ?? 0) > 0;
  const hasScorecardData = props.scorecardCount > 0;
  const hasIdentityData = props.identities.length > 0;
  const hasFrictionData = (props.prefetchedData.gateways?.length ?? 0) > 0 || (props.prefetchedData.frictionMaps?.length ?? 0) > 0;
  const hasAttractionData = (props.prefetchedData.bundles?.length ?? 0) > 0;
  const hasMasteryHabits = (props.prefetchedData.masteryHabits?.length ?? 0) > 0;
  const hasOnboardingComplete = props.prefetchedData.onboarding?.completed ?? false;

  const navigate = useCallback((zone: string, view?: string) => {
    if (zone === "build" && !unlocked.build) return;
    if (zone === "grow" && !unlocked.grow) return;

    const zoneKey = zone as ZoneKey;
    const zoneConfig = ZONES[zoneKey];
    const newView = view || zoneConfig.defaultView;

    setActiveZone(zoneKey);
    setActiveView(newView as string);

    // Update URL for bookmarkability without triggering server navigation
    const params = new URLSearchParams();
    if (zone !== "today" || newView !== "tracker") {
      params.set("zone", zone);
      params.set("view", newView as string);
    }
    const query = params.toString();
    window.history.replaceState(null, "", `/habits${query ? `?${query}` : ""}`);
  }, [unlocked.build, unlocked.grow]);

  // Map a view key to its parent zone and navigate there
  const navigateFromView = useCallback((view: string) => {
    const viewToZone: Record<string, string> = {
      tracker: "today",
      scorecard: "today",
      identity: "today",
      architect: "build",
      attract: "build",
      friction: "build",
      rewards: "build",
      breaker: "build",
      mastery: "grow",
      guide: "grow",
    };
    const zone = viewToZone[view] ?? "today";
    navigate(zone, view);
  }, [navigate]);

  const zone = ZONES[activeZone];

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 sm:space-y-10">
      {/* Header */}
      <div className="space-y-2">
        <p className="text-lg font-serif italic text-[#FFF8F0]/60">
          your garden is growing 🌱
        </p>
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <h1 className="text-5xl font-serif font-light text-[#FFF8F0]">
            {props.todayCompleted} of {props.totalScheduled}
          </h1>
        </div>
        <p className="text-sm text-[#FEC89A]">{props.timeNudge}</p>
        <p className="text-[11px] font-mono text-[#FFF8F0]/30 tracking-wider">
          {props.dateLabel}
        </p>
        <div className="w-full max-w-md h-1.5 bg-[#FFF8F0]/[0.05] rounded-full overflow-hidden mt-3">
          <div
            className="h-full bg-gradient-to-r from-[#34D399] to-[#2DD4BF] rounded-full transition-all duration-500"
            style={{
              width: `${props.totalScheduled > 0 ? (props.todayCompleted / props.totalScheduled) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {/* Smart prompt — contextual next action */}
      <SmartPrompt
        habitsCount={props.allHabits.length}
        daysOfData={props.daysOfData}
        hasBlueprintsData={hasBlueprintsData}
        hasScorecardData={hasScorecardData}
        hasIdentityData={hasIdentityData}
        hasFrictionData={hasFrictionData}
        hasAttractionData={hasAttractionData}
        hasMasteryHabits={hasMasteryHabits}
        hasOnboardingComplete={hasOnboardingComplete}
        onNavigate={navigateFromView}
      />

      {/* Zone navigation — client-side, no server round-trip */}
      <div className="space-y-3">
        {/* Zone tabs */}
        <div className="flex gap-2 p-1.5 bg-[#FFF8F0]/[0.02] border border-[#FFF8F0]/[0.05] rounded-2xl w-fit flex-wrap">
          {(Object.entries(ZONES) as [ZoneKey, (typeof ZONES)[ZoneKey]][]).map(
            ([key, z]) => {
              const isLocked = (key === "build" && !unlocked.build) || (key === "grow" && !unlocked.grow);
              const lockMsg = key === "build" ? unlocked.buildMessage : key === "grow" ? unlocked.growMessage : null;
              return (
                <div key={key} className="relative group">
                  <button
                    onClick={() => navigate(key)}
                    className={`flex items-center gap-2 px-4 sm:px-5 py-2 text-xs sm:text-sm font-mono rounded-xl transition-all ${
                      isLocked
                        ? "text-[#FFF8F0]/15 cursor-not-allowed"
                        : activeZone === key
                          ? "border shadow-sm"
                          : "text-[#FFF8F0]/30 hover:text-[#FFF8F0]/60"
                    }`}
                    style={
                      !isLocked && activeZone === key
                        ? { background: `${z.color}15`, borderColor: `${z.color}40`, color: z.color }
                        : { borderColor: "transparent" }
                    }
                    disabled={isLocked}
                  >
                    <span className="text-base">{isLocked ? "🔒" : z.icon}</span>
                    <span>{z.label}</span>
                  </button>
                  {isLocked && lockMsg && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1.5 bg-[#1a1a1a] border border-[#FFF8F0]/[0.1] rounded-lg text-[10px] font-mono text-[#FFF8F0]/50 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      {lockMsg}
                    </div>
                  )}
                </div>
              );
            },
          )}
        </div>

        {/* Zone description */}
        <p className="text-[11px] font-mono text-[#FFF8F0]/25">{zone.description}</p>

        {/* Sub-navigation */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-hide">
          {zone.views.map((v, i) => (
            <div key={v.key} className="flex items-center shrink-0">
              {i > 0 && <span className="mx-1.5 text-[#FFF8F0]/10 text-[10px]">·</span>}
              <button
                onClick={() => navigate(activeZone, v.key)}
                className={`px-3 py-1 text-[11px] font-mono rounded-lg transition-all whitespace-nowrap ${
                  activeView === v.key
                    ? "text-[#FFF8F0]/90 bg-[#FFF8F0]/[0.08]"
                    : "text-[#FFF8F0]/30 hover:text-[#FFF8F0]/50"
                }`}
              >
                {v.label}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Setup progress tracker — only on tracker view */}
      {activeView === "tracker" && (
        <SystemSetupTracker
          habitsCount={props.allHabits.length}
          daysOfData={props.daysOfData}
          hasBlueprintsData={hasBlueprintsData}
          hasScorecardData={hasScorecardData}
          hasIdentityData={hasIdentityData}
          hasFrictionData={hasFrictionData}
          hasAttractionData={hasAttractionData}
          hasMasteryHabits={hasMasteryHabits}
          hasOnboardingComplete={hasOnboardingComplete}
          onNavigate={navigateFromView}
        />
      )}

      {/* New user welcome */}
      {props.allHabits.length === 0 && activeView === "tracker" && (
        <div className="max-w-xl mx-auto text-center py-12 space-y-6">
          <span className="text-5xl">🌱</span>
          <h2 className="text-xl font-serif text-[#FFF8F0]">Welcome to your habit system</h2>
          <p className="text-sm text-[#FFF8F0]/50 leading-relaxed max-w-md mx-auto">
            This isn&apos;t just a tracker — it&apos;s a complete system for building the person
            you want to become. Start by creating your first habit below, or visit the
            <span className="text-[#A78BFA]"> Learn &amp; Check </span>
            guide for a step-by-step walkthrough.
          </p>
        </div>
      )}

      {/* Active view — switches instantly, no server round-trip */}
      {activeView === "tracker" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3">
            <HabitTracker
              groups={props.sortedGroups}
              habits={props.scheduledHabits}
              notTodayHabits={props.notTodayHabits}
              archivedHabits={props.archivedHabits}
              todayLogs={props.todayLogMap}
              date={props.today}
              templates={props.templates}
              diagnosisFlags={props.diagnosisFlags}
              keystoneHabitIds={props.keystoneHabitIds}
              recoveryMessage={props.recoveryMessage}
              perfectDayCount={props.perfectDayCount}
              daysOfData={props.daysOfData}
            />
          </div>
          <div className="lg:col-span-2">
            <HabitInsights
              habits={props.allHabits}
              heatmapDays={props.heatmapDays}
              logMap={props.historyLogMap}
              trends={props.trends}
              mostMissed={props.mostMissed}
              keystoneInsights={props.keystoneInsights}
              perfectDayCount={props.perfectDayCount}
              daysOfData={props.daysOfData}
            />
          </div>
        </div>
      )}

      {activeView === "identity" && (
        <IdentityBoard
          identities={props.identities}
          habits={props.habitsForIdentity}
          uncelebrated={props.uncelebrated}
          weekStats={props.weekStats}
        />
      )}

      {activeView === "scorecard" && (
        <Suspense fallback={<TabSkeleton />}>
          <div className="max-w-2xl">
            <ScorecardTab date={props.today} totalScorecards={props.scorecardCount} initialData={{ scorecard: props.prefetchedData.scorecard, entries: props.prefetchedData.scorecardEntries, history: props.prefetchedData.scorecardHistory }} />
          </div>
        </Suspense>
      )}

      {activeView === "architect" && (
        <Suspense fallback={<TabSkeleton />}>
          <div className="max-w-4xl">
            <ArchitectTab identities={props.identities} initialData={{ blueprints: props.prefetchedData.blueprints, chains: props.prefetchedData.chains, environments: props.prefetchedData.environments }} />
          </div>
        </Suspense>
      )}

      {activeView === "attract" && (
        <Suspense fallback={<TabSkeleton />}>
          <div className="max-w-3xl">
            <AttractionTab identities={props.identities} initialData={{ bundles: props.prefetchedData.bundles, reframes: props.prefetchedData.reframes, tribes: props.prefetchedData.tribes, partners: props.prefetchedData.partners }} />
          </div>
        </Suspense>
      )}

      {activeView === "friction" && (
        <Suspense fallback={<TabSkeleton />}>
          <div className="max-w-4xl">
            <FrictionTab identities={props.identities} initialData={{ gateways: props.prefetchedData.gateways, frictionMaps: props.prefetchedData.frictionMaps, moments: props.prefetchedData.moments }} />
          </div>
        </Suspense>
      )}

      {activeView === "rewards" && (
        <Suspense fallback={<TabSkeleton />}>
          <div className="max-w-4xl">
            <RewardsTab initialData={{ contracts: props.prefetchedData.contracts, jars: props.prefetchedData.jars }} />
          </div>
        </Suspense>
      )}

      {activeView === "breaker" && (
        <Suspense fallback={<TabSkeleton />}>
          <div className="max-w-4xl">
            <BreakerTab initialData={{ badHabits: props.prefetchedData.badHabits }} />
          </div>
        </Suspense>
      )}

      {activeView === "mastery" && (
        <Suspense fallback={<TabSkeleton />}>
          <div className="max-w-4xl">
            <MasteryTab initialData={{ masteryHabits: props.prefetchedData.masteryHabits }} />
          </div>
        </Suspense>
      )}

      {activeView === "guide" && (
        <Suspense fallback={<TabSkeleton />}>
          <div className="max-w-3xl">
            <GuideTab initialData={{ onboarding: props.prefetchedData.onboarding }} />
          </div>
        </Suspense>
      )}
    </div>
  );
}

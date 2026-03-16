"use server";

import { createClient } from "@/lib/supabase/server";
import { fromDb } from "@/lib/utils";
import type { KnowledgeEntry, Interaction, TemporalClass } from "./types";
import { REACTION_WEIGHTS } from "./types";

// ─── PATTERN DETECTION ───────────────────────────────────────

/** Detect behavioral patterns from recent interactions */
export async function detectPatterns(): Promise<{
  patterns: DetectedPattern[];
  contradictions: Contradiction[];
}> {
  const supabase = await createClient();

  // Get last 90 days of interactions
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const { data: interactions, error: intError } = await supabase
    .from("interactions")
    .select("*")
    .gte("created_at", ninetyDaysAgo.toISOString())
    .order("created_at", { ascending: true });
  if (intError) throw new Error(intError.message);

  const { data: entries, error: entError } = await supabase
    .from("knowledge_entries")
    .select("*")
    .order("confidence", { ascending: false });
  if (entError) throw new Error(entError.message);

  const typedInteractions = (interactions ?? []).map((r) => fromDb<Interaction>(r));
  const typedEntries = (entries ?? []).map((r) => fromDb<KnowledgeEntry>(r));

  const patterns = analyzeInteractionPatterns(typedInteractions);
  const contradictions = findContradictions(typedEntries, typedInteractions);

  return { patterns, contradictions };
}

export interface DetectedPattern {
  type: "time_preference" | "feature_usage" | "mood_cycle" | "productivity" | "engagement";
  description: string;
  confidence: number;
  evidence: string[];
  suggestedEntry?: {
    category: "identity" | "behavioral" | "contextual";
    subcategory: string;
    content: string;
  };
}

export interface Contradiction {
  knowledgeEntryId: string;
  statedBelief: string;
  observedBehavior: string;
  contradictionCount: number;
  spanDays: number;
  suggestion: string;
}

function analyzeInteractionPatterns(interactions: Interaction[]): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];
  if (interactions.length < 5) return patterns;

  // Pattern 1: Feature usage distribution
  const typeCounts: Record<string, number> = {};
  for (const i of interactions) {
    typeCounts[i.interactionType] = (typeCounts[i.interactionType] ?? 0) + 1;
  }
  const totalInteractions = interactions.length;
  const topFeatures = Object.entries(typeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  if (topFeatures.length > 0) {
    const [topFeature, topCount] = topFeatures[0];
    const usageRate = topCount / totalInteractions;
    if (usageRate > 0.3) {
      patterns.push({
        type: "feature_usage",
        description: `Most used feature: ${topFeature} (${Math.round(usageRate * 100)}% of interactions)`,
        confidence: Math.min(usageRate + 0.2, 1.0),
        evidence: [`${topCount}/${totalInteractions} interactions are ${topFeature}`],
        suggestedEntry: {
          category: "behavioral",
          subcategory: "feature_preference",
          content: `User primarily engages with ${topFeature} (${Math.round(usageRate * 100)}% of all interactions)`,
        },
      });
    }
  }

  // Pattern 2: Time-of-day preference
  const hourCounts: Record<number, number> = {};
  for (const i of interactions) {
    const hour = new Date(i.createdAt).getHours();
    hourCounts[hour] = (hourCounts[hour] ?? 0) + 1;
  }
  const peakHour = Object.entries(hourCounts)
    .sort(([, a], [, b]) => b - a)[0];

  if (peakHour && Number(peakHour[1]) > interactions.length * 0.15) {
    const hour = Number(peakHour[0]);
    const period = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
    patterns.push({
      type: "time_preference",
      description: `Peak usage in the ${period} (around ${hour}:00)`,
      confidence: 0.6,
      evidence: [`${peakHour[1]} interactions around ${hour}:00`],
      suggestedEntry: {
        category: "behavioral",
        subcategory: "time_patterns",
        content: `User is most active in the ${period}, peaking around ${hour}:00`,
      },
    });
  }

  // Pattern 3: Engagement level from reactions
  const reactionCounts: Record<string, number> = {};
  let reactedCount = 0;
  for (const i of interactions) {
    if (i.reaction) {
      reactionCounts[i.reaction] = (reactionCounts[i.reaction] ?? 0) + 1;
      reactedCount++;
    }
  }
  if (reactedCount > 5) {
    const positiveReactions = (reactionCounts["accepted"] ?? 0) +
      (reactionCounts["perfect"] ?? 0);
    const negativeReactions = (reactionCounts["rejected"] ?? 0) +
      (reactionCounts["correction"] ?? 0);
    const engagementRate = positiveReactions / reactedCount;

    patterns.push({
      type: "engagement",
      description: `Engagement: ${Math.round(engagementRate * 100)}% positive reactions`,
      confidence: Math.min(reactedCount / 20, 1.0),
      evidence: [
        `${positiveReactions} positive, ${negativeReactions} negative out of ${reactedCount} reactions`,
      ],
    });
  }

  return patterns;
}

function findContradictions(
  entries: KnowledgeEntry[],
  interactions: Interaction[]
): Contradiction[] {
  const contradictions: Contradiction[] = [];

  for (const entry of entries) {
    if (entry.contradictionCount >= 3) {
      const firstDate = new Date(entry.firstObserved);
      const now = new Date();
      const spanDays = Math.floor(
        (now.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (spanDays >= 14) {
        contradictions.push({
          knowledgeEntryId: entry.id,
          statedBelief: entry.content,
          observedBehavior: `Contradicted ${entry.contradictionCount} times over ${spanDays} days`,
          contradictionCount: entry.contradictionCount,
          spanDays,
          suggestion:
            entry.contradictionCount >= 7
              ? `This belief has been contradicted ${entry.contradictionCount} times. Consider revising or removing it.`
              : `Noticed a gap between what was stated and what was observed. Worth exploring.`,
        });
      }
    }
  }

  return contradictions;
}

// ─── CONFIDENCE DECAY ────────────────────────────────────────

/** Apply confidence decay to entries that haven't been confirmed recently */
export async function applyConfidenceDecay(): Promise<number> {
  const supabase = await createClient();
  const { data: entries, error } = await supabase
    .from("knowledge_entries")
    .select("id, confidence, decay_rate, last_confirmed, temporal_class")
    .gt("confidence", 0.05);
  if (error) throw new Error(error.message);

  let updatedCount = 0;
  const now = new Date();

  for (const entry of entries ?? []) {
    const lastConfirmed = new Date(entry.last_confirmed);
    const daysSinceConfirmed = Math.floor(
      (now.getTime() - lastConfirmed.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Only decay if not confirmed in the last 7 days
    if (daysSinceConfirmed < 7) continue;

    // Permanent entries decay very slowly
    if (entry.temporal_class === "permanent" && daysSinceConfirmed < 30) continue;

    const decayAmount = entry.decay_rate * Math.floor(daysSinceConfirmed / 7);
    const newConfidence = Math.max(entry.confidence - decayAmount, 0.05);

    if (newConfidence < entry.confidence) {
      const { error: updateError } = await supabase
        .from("knowledge_entries")
        .update({ confidence: newConfidence })
        .eq("id", entry.id);
      if (!updateError) updatedCount++;
    }
  }

  return updatedCount;
}

// ─── TEMPORAL CLASSIFICATION ─────────────────────────────────

/** Reclassify knowledge entries based on duration and evidence */
export async function reclassifyTemporalStates(): Promise<number> {
  const supabase = await createClient();
  const { data: entries, error } = await supabase
    .from("knowledge_entries")
    .select("*")
    .in("temporal_class", ["uncertain", "temporary", "seasonal"]);
  if (error) throw new Error(error.message);

  let reclassifiedCount = 0;
  const now = new Date();

  for (const entry of entries ?? []) {
    const firstObserved = new Date(entry.first_observed);
    const duration = Math.floor(
      (now.getTime() - firstObserved.getTime()) / (1000 * 60 * 60 * 24)
    );

    const evidence = (entry.evidence as Array<{ type: string }>) ?? [];
    const uniqueContexts = new Set(evidence.map((e) => e.type)).size;
    const hasReversal = entry.contradiction_count > 0;

    let newClass: TemporalClass = entry.temporal_class;

    if (duration < 14) {
      newClass = "temporary";
    } else if (duration < 42 && uniqueContexts < 2) {
      newClass = "seasonal";
    } else if (hasReversal && duration < 90) {
      newClass = "uncertain";
    } else if (duration >= 42 && uniqueContexts >= 3 && entry.reinforcement_count >= 3) {
      newClass = "permanent";
    } else if (duration >= 42) {
      newClass = "seasonal";
    }

    if (newClass !== entry.temporal_class) {
      const decayRate = newClass === "permanent" ? 0.001 : newClass === "seasonal" ? 0.005 : 0.01;
      const { error: updateError } = await supabase
        .from("knowledge_entries")
        .update({ temporal_class: newClass, decay_rate: decayRate })
        .eq("id", entry.id);
      if (!updateError) reclassifiedCount++;
    }
  }

  return reclassifiedCount;
}

// ─── MIRROR REPORT ───────────────────────────────────────────

export interface MirrorReport {
  totalKnowledge: number;
  highConfidenceCount: number;
  contradictionAlerts: Contradiction[];
  patterns: DetectedPattern[];
  predictionAccuracy: number;
  topBeliefs: { content: string; confidence: number; category: string }[];
  recentChanges: string[];
}

/** Generate a Mirror Report — a snapshot of what the system knows */
export async function generateMirrorReport(): Promise<MirrorReport> {
  const supabase = await createClient();

  const [
    { data: allEntries },
    { data: predictions },
    { data: recentInteractions },
  ] = await Promise.all([
    supabase.from("knowledge_entries").select("*").order("confidence", { ascending: false }),
    supabase.from("predictions").select("outcome"),
    supabase.from("interactions").select("*").order("created_at", { ascending: false }).limit(100),
  ]);

  const entries = (allEntries ?? []).map((r) => fromDb<KnowledgeEntry>(r));
  const interactions = (recentInteractions ?? []).map((r) => fromDb<Interaction>(r));

  const highConfidence = entries.filter((e) => e.confidence >= 0.7);
  const { contradictions, patterns } = await detectPatterns();

  // Prediction accuracy
  const resolved = (predictions ?? []).filter(
    (p) => p.outcome && p.outcome !== "pending"
  );
  const correct = resolved.filter(
    (p) => p.outcome === "correct" || p.outcome === "partially_correct"
  );
  const predictionAccuracy = resolved.length > 0 ? correct.length / resolved.length : 0;

  // Top beliefs
  const topBeliefs = entries.slice(0, 10).map((e) => ({
    content: e.content,
    confidence: e.confidence,
    category: e.category,
  }));

  // Recent changes (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentEntries = entries.filter(
    (e) => new Date(e.createdAt) > sevenDaysAgo
  );
  const recentChanges = recentEntries.map(
    (e) => `New ${e.category}/${e.subcategory}: "${e.content}" (confidence: ${e.confidence})`
  );

  return {
    totalKnowledge: entries.length,
    highConfidenceCount: highConfidence.length,
    contradictionAlerts: contradictions,
    patterns,
    predictionAccuracy,
    topBeliefs,
    recentChanges,
  };
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { fromDb } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import type {
  KnowledgeEntry,
  KnowledgeCategory,
  InputChannel,
  TemporalClass,
  Evidence,
  InteractionType,
  ReactionType,
  LearningSignal,
  PredictionType,
  PredictionOutcome,
  CalibrationType,
  CalibrationBelief,
  CalibrationCorrection,
  ModelAdjustment,
  Interaction,
  Prediction,
  CalibrationSession,
} from "./types";
import { CHANNEL_WEIGHTS } from "./types";

// ─── KNOWLEDGE ENTRIES ───────────────────────────────────────

export async function addKnowledgeEntry(
  category: KnowledgeCategory,
  subcategory: string,
  content: string,
  source: InputChannel,
  evidence?: Evidence[],
  temporalClass?: TemporalClass
): Promise<KnowledgeEntry> {
  const supabase = await createClient();
  const initialConfidence = CHANNEL_WEIGHTS[source] * 0.6;
  const { data, error } = await supabase
    .from("knowledge_entries")
    .insert({
      category,
      subcategory,
      content,
      confidence: Math.min(initialConfidence, 1.0),
      source,
      evidence: evidence ?? [],
      temporal_class: temporalClass ?? "uncertain",
      decay_rate: temporalClass === "permanent" ? 0.001 : 0.01,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/mirror");
  return fromDb<KnowledgeEntry>(data);
}

export async function updateKnowledgeEntry(
  id: string,
  updates: Partial<{
    content: string;
    confidence: number;
    temporalClass: TemporalClass;
    contradictionCount: number;
    reinforcementCount: number;
    lastConfirmed: string;
    evidence: Evidence[];
  }>
): Promise<void> {
  const supabase = await createClient();
  const dbUpdates: Record<string, unknown> = {};
  if (updates.content !== undefined) dbUpdates.content = updates.content;
  if (updates.confidence !== undefined) dbUpdates.confidence = updates.confidence;
  if (updates.temporalClass !== undefined) dbUpdates.temporal_class = updates.temporalClass;
  if (updates.contradictionCount !== undefined) dbUpdates.contradiction_count = updates.contradictionCount;
  if (updates.reinforcementCount !== undefined) dbUpdates.reinforcement_count = updates.reinforcementCount;
  if (updates.lastConfirmed !== undefined) dbUpdates.last_confirmed = updates.lastConfirmed;
  if (updates.evidence !== undefined) dbUpdates.evidence = updates.evidence;

  const { error } = await supabase
    .from("knowledge_entries")
    .update(dbUpdates)
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/mirror");
}

export async function reinforceKnowledge(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: entry, error: fetchError } = await supabase
    .from("knowledge_entries")
    .select("confidence, reinforcement_count")
    .eq("id", id)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const newCount = (entry.reinforcement_count ?? 0) + 1;
  const newConfidence = Math.min((entry.confidence ?? 0.5) + 0.05, 1.0);

  const { error } = await supabase
    .from("knowledge_entries")
    .update({
      reinforcement_count: newCount,
      confidence: newConfidence,
      last_confirmed: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/mirror");
}

export async function contradictKnowledge(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: entry, error: fetchError } = await supabase
    .from("knowledge_entries")
    .select("confidence, contradiction_count")
    .eq("id", id)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const newCount = (entry.contradiction_count ?? 0) + 1;
  const confidencePenalty = newCount >= 7 ? 0.3 : 0.05;
  const newConfidence = Math.max((entry.confidence ?? 0.5) - confidencePenalty, 0);

  const { error } = await supabase
    .from("knowledge_entries")
    .update({
      contradiction_count: newCount,
      confidence: newConfidence,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/mirror");
}

export async function deleteKnowledgeEntry(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("knowledge_entries")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/mirror");
}

export async function getKnowledgeEntries(filters?: {
  category?: KnowledgeCategory;
  subcategory?: string;
  minConfidence?: number;
  temporalClass?: TemporalClass;
}): Promise<KnowledgeEntry[]> {
  const supabase = await createClient();
  let query = supabase
    .from("knowledge_entries")
    .select("*")
    .order("confidence", { ascending: false });

  if (filters?.category) query = query.eq("category", filters.category);
  if (filters?.subcategory) query = query.eq("subcategory", filters.subcategory);
  if (filters?.minConfidence) query = query.gte("confidence", filters.minConfidence);
  if (filters?.temporalClass) query = query.eq("temporal_class", filters.temporalClass);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => fromDb<KnowledgeEntry>(row));
}

// ─── INTERACTIONS ────────────────────────────────────────────

export async function logInteraction(
  interactionType: InteractionType,
  context: Record<string, unknown>,
  reaction?: ReactionType,
  learningSignals?: LearningSignal[],
  sessionMetadata?: Record<string, unknown>
): Promise<Interaction> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("interactions")
    .insert({
      interaction_type: interactionType,
      context,
      reaction: reaction ?? null,
      learning_signals: learningSignals ?? [],
      session_metadata: sessionMetadata ?? {},
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return fromDb<Interaction>(data);
}

export async function getRecentInteractions(
  limit: number = 50,
  type?: InteractionType
): Promise<Interaction[]> {
  const supabase = await createClient();
  let query = supabase
    .from("interactions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (type) query = query.eq("interaction_type", type);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => fromDb<Interaction>(row));
}

export async function getInteractionStats(): Promise<{
  total: number;
  byType: Record<string, number>;
  byReaction: Record<string, number>;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("interactions")
    .select("interaction_type, reaction");
  if (error) throw new Error(error.message);

  const byType: Record<string, number> = {};
  const byReaction: Record<string, number> = {};
  for (const row of data ?? []) {
    byType[row.interaction_type] = (byType[row.interaction_type] ?? 0) + 1;
    if (row.reaction) {
      byReaction[row.reaction] = (byReaction[row.reaction] ?? 0) + 1;
    }
  }

  return { total: data?.length ?? 0, byType, byReaction };
}

// ─── PREDICTIONS ─────────────────────────────────────────────

export async function createPrediction(
  predictionType: PredictionType,
  content: string,
  confidence: number,
  context?: Record<string, unknown>,
  knowledgeEntryId?: string
): Promise<Prediction> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("predictions")
    .insert({
      prediction_type: predictionType,
      content,
      confidence: Math.min(Math.max(confidence, 0), 1),
      context: context ?? {},
      outcome: "pending",
      knowledge_entry_id: knowledgeEntryId ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/mirror");
  return fromDb<Prediction>(data);
}

export async function resolvePrediction(
  id: string,
  outcome: PredictionOutcome,
  outcomeDetails?: string
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("predictions")
    .update({
      outcome,
      outcome_details: outcomeDetails ?? null,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/mirror");
}

export async function getPredictions(filters?: {
  outcome?: PredictionOutcome;
  type?: PredictionType;
  limit?: number;
}): Promise<Prediction[]> {
  const supabase = await createClient();
  let query = supabase
    .from("predictions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(filters?.limit ?? 50);

  if (filters?.outcome) query = query.eq("outcome", filters.outcome);
  if (filters?.type) query = query.eq("prediction_type", filters.type);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => fromDb<Prediction>(row));
}

export async function getPredictionAccuracy(): Promise<{
  total: number;
  correct: number;
  partiallyCorrect: number;
  incorrect: number;
  pending: number;
  accuracyRate: number;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("predictions")
    .select("outcome");
  if (error) throw new Error(error.message);

  const counts = { correct: 0, partiallyCorrect: 0, incorrect: 0, pending: 0 };
  for (const row of data ?? []) {
    if (row.outcome === "correct") counts.correct++;
    else if (row.outcome === "partially_correct") counts.partiallyCorrect++;
    else if (row.outcome === "incorrect") counts.incorrect++;
    else counts.pending++;
  }

  const resolved = counts.correct + counts.partiallyCorrect + counts.incorrect;
  const accuracyRate = resolved > 0
    ? (counts.correct + counts.partiallyCorrect * 0.5) / resolved
    : 0;

  return { total: data?.length ?? 0, ...counts, accuracyRate };
}

// ─── CALIBRATION SESSIONS ────────────────────────────────────

export async function createCalibrationSession(
  sessionType: CalibrationType,
  beliefsPresented: CalibrationBelief[],
  corrections: CalibrationCorrection[],
  modelAdjustments: ModelAdjustment[],
  accuracyScore?: number
): Promise<CalibrationSession> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calibration_sessions")
    .insert({
      session_type: sessionType,
      beliefs_presented: beliefsPresented,
      corrections,
      model_adjustments: modelAdjustments,
      accuracy_score: accuracyScore ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/mirror");
  return fromDb<CalibrationSession>(data);
}

export async function getCalibrationHistory(
  limit: number = 10
): Promise<CalibrationSession[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calibration_sessions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => fromDb<CalibrationSession>(row));
}

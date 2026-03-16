// MIRROR AI — Type definitions for the knowledge graph & learning pipeline

export type KnowledgeCategory = "identity" | "behavioral" | "contextual";

export type InputChannel =
  | "explicit"
  | "behavioral"
  | "contextual"
  | "emotional"
  | "outcome";

export type TemporalClass = "permanent" | "seasonal" | "temporary" | "uncertain";

export type InteractionType =
  | "checkin"
  | "weekly_plan"
  | "season_update"
  | "task_action"
  | "journal"
  | "habit"
  | "expense"
  | "book"
  | "calibration"
  | "correction"
  | "general";

export type ReactionType =
  | "accepted"
  | "edited"
  | "rejected"
  | "ignored"
  | "follow_up"
  | "perfect"
  | "correction";

export type PredictionType =
  | "behavior"
  | "preference"
  | "schedule"
  | "mood"
  | "outcome"
  | "need";

export type PredictionOutcome =
  | "correct"
  | "partially_correct"
  | "incorrect"
  | "pending";

export type CalibrationType = "weekly" | "monthly" | "quarterly" | "manual";

export interface KnowledgeEntry {
  id: string;
  category: KnowledgeCategory;
  subcategory: string;
  content: string;
  confidence: number;
  source: InputChannel;
  evidence: Evidence[];
  firstObserved: string;
  lastConfirmed: string;
  contradictionCount: number;
  reinforcementCount: number;
  temporalClass: TemporalClass;
  decayRate: number;
  createdAt: string;
}

export interface Evidence {
  type: InputChannel;
  detail: string;
  timestamp: string;
  weight: number;
}

export interface Interaction {
  id: string;
  interactionType: InteractionType;
  context: Record<string, unknown>;
  reaction: ReactionType | null;
  learningSignals: LearningSignal[];
  sessionMetadata: Record<string, unknown>;
  createdAt: string;
}

export interface LearningSignal {
  knowledgeEntryId?: string;
  signal: "reinforce" | "contradict" | "new_insight" | "correction";
  detail: string;
  weight: number;
}

export interface Prediction {
  id: string;
  predictionType: PredictionType;
  content: string;
  confidence: number;
  context: Record<string, unknown>;
  outcome: PredictionOutcome | null;
  outcomeDetails: string | null;
  resolvedAt: string | null;
  knowledgeEntryId: string | null;
  createdAt: string;
}

export interface CalibrationSession {
  id: string;
  sessionType: CalibrationType;
  beliefsPresented: CalibrationBelief[];
  corrections: CalibrationCorrection[];
  modelAdjustments: ModelAdjustment[];
  accuracyScore: number | null;
  createdAt: string;
}

export interface CalibrationBelief {
  knowledgeEntryId: string;
  content: string;
  confidence: number;
  confirmed: boolean | null;
}

export interface CalibrationCorrection {
  knowledgeEntryId: string;
  originalContent: string;
  correctedContent: string;
  correctionType: "factual" | "preference" | "outdated" | "wrong";
}

export interface ModelAdjustment {
  knowledgeEntryId: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  reason: string;
}

// Channel trust weights from the blueprint
export const CHANNEL_WEIGHTS: Record<InputChannel, number> = {
  explicit: 1.0,
  outcome: 0.9,
  behavioral: 0.7,
  contextual: 0.5,
  emotional: 0.4,
};

// Reaction learning weights from the blueprint
export const REACTION_WEIGHTS: Record<ReactionType, number> = {
  accepted: 1.0,
  perfect: 3.0,
  edited: 2.0,
  rejected: 5.0,
  correction: 10.0,
  follow_up: 1.5,
  ignored: 0.5,
};

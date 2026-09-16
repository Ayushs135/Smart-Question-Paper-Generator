import { HydratedQuestion } from "@/lib/questions";
import {
  BoardType,
  GradeType,
  SubjectType,
  DifficultyType,
  QuestionTypeEnum,
} from "@/types/question";
import { PaperConfig } from "@/types/config";

/**
 * Generation status outcomes
 * - EXACT: Requested total marks matched strictly, zero duplicates, no hard capacity violations,
 *   and all soft distribution deviations (difficulty, question type, topics) within acceptable discrete tolerances.
 * - PARTIAL: A usable paper was generated, but either total marks had minor quantization trade-offs
 *   or one/more soft distribution constraints deviated beyond the EXACT tolerance thresholds.
 * - IMPOSSIBLE: No valid paper could be formed due to hard constraint failures (empty pool,
 *   insufficient bank capacity, unreachable total marks).
 */
export type GenerationStatus = "EXACT" | "PARTIAL" | "IMPOSSIBLE";

/**
 * Acceptable deviation tolerances (in marks) for classifying a paper as EXACT.
 * Deviations are computed as Total Variation Distance (half L1 norm).
 */
export const EXACT_TOLERANCES = {
  TOTAL_MARKS: 0,       // Strict: exactly 0 mark deviation on total marks
  DIFFICULTY: 3.0,      // Total variation distance <= 3.0 marks
  QUESTION_TYPE: 3.0,   // Total variation distance <= 3.0 marks
  TOPIC: 5.0,           // Total variation distance <= 5.0 marks (across 13-14 chapters)
} as const;

/**
 * Categorized constraint violation details
 */
export interface ConstraintViolation {
  type:
    | "INSUFFICIENT_TOTAL_CAPACITY"
    | "INSUFFICIENT_DIFFICULTY_CAPACITY"
    | "INSUFFICIENT_QUESTION_TYPE_CAPACITY"
    | "INSUFFICIENT_TOPIC_CAPACITY"
    | "EMPTY_QUESTION_BANK"
    | "UNREACHABLE_TOTAL_MARKS"
    | "DISTRIBUTION_DEVIATION"
    | "SPARSE_INTERSECTION";
  dimension?: "totalMarks" | "difficulty" | "type" | "topic" | "pool";
  value?: string;
  requestedMarks?: number;
  availableMarks?: number;
  message: string;
}

/**
 * Target vs Actual breakdown for a single dimension
 */
export interface DimensionBreakdown<T extends string = string> {
  requestedPercentages: Record<T, number>;
  requestedMarks: Record<T, number>;
  actualMarks: Record<T, number>;
  actualPercentages: Record<T, number>;
  deviations: Record<T, number>;
  totalDeviation: number;
}

/**
 * Mark count and total marks per denomination within a question type
 */
export interface MarkDenominationCount {
  marks: number;
  questionCount: number;
  totalMarks: number;
}

/**
 * Breakdown of mark denominations utilized across question types
 */
export interface MarkMixBreakdown {
  MCQ: MarkDenominationCount[];
  SHORT_ANSWER: MarkDenominationCount[];
  LONG_ANSWER: MarkDenominationCount[];
}

/**
 * Target mark metrics computed from the PaperConfig
 */
export interface PaperTargetBreakdown {
  totalMarks: number;
  difficulty: Record<DifficultyType, number>;
  questionTypes: Record<QuestionTypeEnum, number>;
  topics: Record<string, number>;
}

/**
 * Actual marks metrics calculated from a set of selected questions
 */
export interface PaperActualBreakdown {
  totalMarks: number;
  questionCount: number;
  difficulty: Record<DifficultyType, number>;
  questionTypes: Record<QuestionTypeEnum, number>;
  topics: Record<string, number>;
  markMix: MarkMixBreakdown;
  sections: {
    sectionA_MCQ: HydratedQuestion[];
    sectionB_ShortAnswer: HydratedQuestion[];
    sectionC_LongAnswer: HydratedQuestion[];
  };
}

/**
 * Detailed deviations across all pedagogical dimensions
 */
export interface PaperDeviations {
  totalMarks: number;
  difficulty: DimensionBreakdown<DifficultyType>;
  questionTypes: DimensionBreakdown<QuestionTypeEnum>;
  topics: DimensionBreakdown<string>;
  markMixPenalty: number;
  compositeScore: number;
}

/**
 * Feasibility check report
 */
export interface FeasibilityReport {
  isFeasible: boolean;
  canAchieveExactTotal: boolean;
  closestAchievableMarks?: number;
  violations: ConstraintViolation[];
}

/**
 * Independent Validation Report
 */
export interface ValidationReport {
  isValid: boolean;
  totalMarks: number;
  requestedTotalMarks: number;
  totalMarksDeviation: number;
  difficulty: DimensionBreakdown<DifficultyType>;
  topics: DimensionBreakdown<string>;
  questionTypes: DimensionBreakdown<QuestionTypeEnum>;
  duplicateQuestions: string[];
  violations: ConstraintViolation[];
}

/**
 * Complete result returned by generatePaper
 */
export interface GenerationResult {
  status: GenerationStatus;
  questions: HydratedQuestion[];
  requested: PaperTargetBreakdown;
  actual: PaperActualBreakdown;
  deviations: PaperDeviations;
  violations: ConstraintViolation[];
  score: number;
  explanation: string;
  executionTimeMs: number;
}

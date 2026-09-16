import { HydratedQuestion } from "@/lib/questions";
import { GenerationResult } from "@/lib/generator/types";

/**
 * Structured request payload for AI question enhancement
 */
export interface AIEnhanceRequest {
  question: HydratedQuestion;
  instructions?: string;
}

/**
 * Expected structured JSON schema returned by the LLM
 */
export interface AIEnhanceLLMResponse {
  question?: string;
  reason?: string;
  enhancedQuestion?: string;
  changesSummary?: string;
  pedagogicalRationale?: string;
}

/**
 * Validation result returned by the safety validation engine
 */
export interface AISafetyValidationResult {
  isValid: boolean;
  violations: string[];
}

/**
 * Server action result for AI question enhancement preview
 */
export interface AIEnhanceResult {
  success: boolean;
  originalQuestion: HydratedQuestion;
  enhancedQuestion?: HydratedQuestion;
  previewText?: string;
  changesSummary?: string;
  reason?: string;
}

/**
 * Server action result for applying enhanced question to paper
 */
export interface ApplyEnhancementResult {
  success: boolean;
  paper?: GenerationResult;
  updatedQuestion?: HydratedQuestion;
  reason?: string;
}

/**
 * Result for AI Question Generation ("Generate Similar")
 */
export interface AIGenerateSimilarResult {
  success: boolean;
  originalQuestion: HydratedQuestion;
  generatedQuestion?: HydratedQuestion;
  reason?: string;
}

/**
 * Result for applying a generated similar question to the paper
 */
export interface ApplySimilarQuestionResult {
  success: boolean;
  paper?: GenerationResult;
  updatedQuestion?: HydratedQuestion;
  reason?: string;
}

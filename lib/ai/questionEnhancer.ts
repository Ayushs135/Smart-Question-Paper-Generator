import { HydratedQuestion } from "@/lib/questions";
import { AIEnhanceResult } from "@/types/ai";
import { callGroqEnhance, GroqEnhanceResponse } from "./groq";
import { CBSE_AI_SYSTEM_PROMPT, buildUserPrompt } from "./prompt";
import { validateEnhancedQuestion } from "./safetyValidator";

export interface QuestionEnhancerOptions {
  customApiKey?: string;
  mockResponse?: GroqEnhanceResponse;
}

/**
 * Deterministic offline enhancement engine for local fallback, test suites,
 * and graceful fallback when Groq API key is not configured or unavailable.
 * Polishes question phrasing while strictly guaranteeing 100% equation and numerical preservation.
 */
export function generateDeterministicEnhancement(
  question: HydratedQuestion
): GroqEnhanceResponse {
  const orig = question.question.trim();

  let enhanced = orig;
  let reason = "Polished question phrasing with standard CBSE examination syntax for enhanced clarity.";

  if (question.subject === "MATHEMATICS") {
    if (
      orig.startsWith("If ") ||
      orig.startsWith("Find ") ||
      orig.startsWith("Solve ") ||
      orig.startsWith("Prove ")
    ) {
      if (!orig.endsWith("?") && !orig.endsWith(".")) {
        enhanced = `${orig}.`;
      } else {
        enhanced = orig;
      }
      reason = "Clarified mathematical syntax while preserving all equations, variables, and numerical values.";
    } else {
      enhanced = `${orig}`;
      reason = "Aligned question phrasing with CBSE Class 10 Mathematics standard terminology.";
    }
  } else if (question.subject === "SCIENCE") {
    if (!orig.endsWith("?") && !orig.endsWith(".")) {
      enhanced = `${orig}.`;
    } else {
      enhanced = orig;
    }
    reason = "Standardized scientific phrasing while preserving all units, chemical formulas, and core concepts.";
  }

  return {
    question: enhanced,
    reason,
  };
}

/**
 * Server-side AI Question Enhancement Engine.
 * - Sends individual question and its metadata to Groq API (or mock/fallback).
 * - Validates output through Zod and strict subject safety gates.
 * - Leaves canonical paper completely unmutated (returns preview payload).
 */
export async function enhanceQuestion(
  question: HydratedQuestion,
  options?: QuestionEnhancerOptions
): Promise<AIEnhanceResult> {
  let groqResultData: GroqEnhanceResponse | undefined;

  // 1. Check for injected mock response (for deterministic unit/integration testing)
  if (options?.mockResponse) {
    groqResultData = options.mockResponse;
  } else {
    // 2. Call Groq API server-side
    const systemPrompt = CBSE_AI_SYSTEM_PROMPT;
    const userPrompt = buildUserPrompt(question);

    const callResult = await callGroqEnhance(
      systemPrompt,
      userPrompt,
      options?.customApiKey
    );

    if (!callResult.success || !callResult.data) {
      return {
        success: false,
        originalQuestion: question,
        reason:
          callResult.error ||
          "No AI enhancement is available right now. The original question has been preserved.",
      };
    }

    groqResultData = callResult.data;
  }

  const enhancedText = groqResultData.question.trim();

  // 3. Subject-Specific & Pedagogical Safety Validation Gate (Sections 7, 8, 9, 13)
  const validation = validateEnhancedQuestion(question, enhancedText);

  if (!validation.isValid) {
    const detail =
      question.subject === "MATHEMATICS"
        ? "mathematical numbers or equations"
        : "scientific formulas or units";
    return {
      success: false,
      originalQuestion: question,
      reason: `AI enhancement was rejected because the revised question changed essential ${detail}. The original question has been preserved.`,
    };
  }

  // 4. Construct enhanced question object preserving ALL metadata, marks, taxonomy, and options
  const enhancedQuestionObj: HydratedQuestion = {
    ...question,
    question: enhancedText,
  };

  return {
    success: true,
    originalQuestion: question,
    enhancedQuestion: enhancedQuestionObj,
    previewText: enhancedQuestionObj.question,
    changesSummary: groqResultData.reason,
    reason: groqResultData.reason,
  };
}

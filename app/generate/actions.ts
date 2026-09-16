"use server";

import {
  generatePaper,
  swapQuestion,
  SwapQuestionResult,
  validatePaper,
} from "@/lib/generator";
import {
  calculateTargetMarks,
  calculateActualMarks,
  calculateDeviations,
  scorePaper,
} from "@/lib/generator/scoring";
import { getQuestionsByIds, getQuestionById, HydratedQuestion } from "@/lib/questions";
import { PaperConfig, paperConfigSchema } from "@/types/config";
import { GenerationResult, GenerationStatus, EXACT_TOLERANCES } from "@/lib/generator/types";
import { enhanceQuestion } from "@/lib/ai/enhanceQuestion";
import { generateSimilarQuestion } from "@/lib/ai/questionGenerator";
import { validateEnhancedQuestion, validateGeneratedSimilarQuestion } from "@/lib/ai/safetyValidator";
import {
  AIEnhanceResult,
  ApplyEnhancementResult,
  AIGenerateSimilarResult,
  ApplySimilarQuestionResult,
} from "@/types/ai";

/**
 * Server Action to invoke the deterministic question paper generator
 * directly from the /generate client configuration form.
 */
export async function generatePaperAction(
  config: PaperConfig
): Promise<GenerationResult> {
  try {
    // 1. Validate schema on server boundary
    const validatedConfig = paperConfigSchema.parse(config);

    // 2. Run deterministic constraint-based generator
    const result = await generatePaper(validatedConfig);

    // 3. Serialize output cleanly for React Client boundary
    return JSON.parse(JSON.stringify(result));
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : "An unexpected generation error occurred.";
    return {
      status: "IMPOSSIBLE",
      questions: [],
      requested: {
        totalMarks: config?.totalMarks || 0,
        difficulty: { EASY: 0, MEDIUM: 0, HARD: 0 },
        questionTypes: { MCQ: 0, SHORT_ANSWER: 0, LONG_ANSWER: 0 },
        topics: {},
      },
      actual: {
        totalMarks: 0,
        questionCount: 0,
        difficulty: { EASY: 0, MEDIUM: 0, HARD: 0 },
        questionTypes: { MCQ: 0, SHORT_ANSWER: 0, LONG_ANSWER: 0 },
        topics: {},
        sections: {
          sectionA_MCQ: [],
          sectionB_ShortAnswer: [],
          sectionC_LongAnswer: [],
        },
        markMix: {
          MCQ: [],
          SHORT_ANSWER: [],
          LONG_ANSWER: [],
        },
      },
      deviations: {
        totalMarks: config?.totalMarks || 0,
        difficulty: {
          requestedPercentages: { EASY: 0, MEDIUM: 0, HARD: 0 },
          requestedMarks: { EASY: 0, MEDIUM: 0, HARD: 0 },
          actualMarks: { EASY: 0, MEDIUM: 0, HARD: 0 },
          actualPercentages: { EASY: 0, MEDIUM: 0, HARD: 0 },
          deviations: { EASY: 0, MEDIUM: 0, HARD: 0 },
          totalDeviation: 0,
        },
        questionTypes: {
          requestedPercentages: { MCQ: 0, SHORT_ANSWER: 0, LONG_ANSWER: 0 },
          requestedMarks: { MCQ: 0, SHORT_ANSWER: 0, LONG_ANSWER: 0 },
          actualMarks: { MCQ: 0, SHORT_ANSWER: 0, LONG_ANSWER: 0 },
          actualPercentages: { MCQ: 0, SHORT_ANSWER: 0, LONG_ANSWER: 0 },
          deviations: { MCQ: 0, SHORT_ANSWER: 0, LONG_ANSWER: 0 },
          totalDeviation: 0,
        },
        topics: {
          requestedPercentages: {},
          requestedMarks: {},
          actualMarks: {},
          actualPercentages: {},
          deviations: {},
          totalDeviation: 0,
        },
        markMixPenalty: 0,
        compositeScore: 999999,
      },
      violations: [
        {
          type: "DISTRIBUTION_DEVIATION",
          message: errMessage,
        },
      ],
      score: 999999,
      explanation: `Generation failed: ${errMessage}`,
      executionTimeMs: 0,
    };
  }
}

/**
 * Extended swap result with fallback trigger
 */
export interface ExtendedSwapResult extends SwapQuestionResult {
  fallbackAvailable?: boolean;
  targetQuestionId?: string;
}

/**
 * Server Action to replace one individual question in a generated paper
 * while strictly preserving all other questions, positions, and total marks.
 */
export async function swapQuestionAction(
  currentQuestionsOrIds: string[] | HydratedQuestion[],
  targetQuestionId: string,
  config: PaperConfig
): Promise<ExtendedSwapResult> {
  try {
    const validatedConfig = paperConfigSchema.parse(config);

    let currentQuestions: HydratedQuestion[];
    if (currentQuestionsOrIds.length > 0 && typeof currentQuestionsOrIds[0] === "object") {
      currentQuestions = currentQuestionsOrIds as HydratedQuestion[];
    } else {
      const ids = currentQuestionsOrIds as string[];
      currentQuestions = await getQuestionsByIds(ids);
      if (currentQuestions.length !== ids.length) {
        return {
          success: false,
          fallbackAvailable: true,
          targetQuestionId,
          reason: "Some questions in the current paper could not be found in the database. You can generate an equivalent question with AI.",
        };
      }
    }

    const result = await swapQuestion(currentQuestions, targetQuestionId, validatedConfig);

    if (!result.success) {
      return {
        ...result,
        fallbackAvailable: true,
        targetQuestionId,
        reason:
          result.reason ||
          "No alternative question is available in the question bank. You can generate a new equivalent question with AI.",
      };
    }

    return JSON.parse(JSON.stringify(result));
  } catch (error) {
    const errMessage =
      error instanceof Error ? error.message : "An unexpected error occurred during question swap.";
    return {
      success: false,
      fallbackAvailable: true,
      targetQuestionId,
      reason: errMessage,
    };
  }
}

/**
 * Server Action to generate an AI enhancement preview for a single question.
 * Generates an improved phrasing under strict mathematical and scientific safety rules.
 * Does NOT modify the active paper until the teacher explicitly reviews and applies it.
 */
export async function enhanceQuestionAction(
  questionIdOrObject: string | HydratedQuestion
): Promise<AIEnhanceResult> {
  try {
    let question: HydratedQuestion | null = null;
    if (typeof questionIdOrObject === "object") {
      question = questionIdOrObject;
    } else {
      question = await getQuestionById(questionIdOrObject);
    }

    if (!question) {
      const id = typeof questionIdOrObject === "string" ? questionIdOrObject : "unknown";
      return {
        success: false,
        originalQuestion: {
          id,
          board: "CBSE",
          grade: "CLASS_10",
          subject: "MATHEMATICS",
          topic: "Unknown",
          difficulty: "MEDIUM",
          type: "SHORT_ANSWER",
          marks: 1,
          question: "",
          options: null,
          answer: "",
          explanation: "",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        reason: `Question with ID "${id}" was not found in the database.`,
      };
    }

    const result = await enhanceQuestion(question);
    return JSON.parse(JSON.stringify(result));
  } catch (error) {
    const errMessage =
      error instanceof Error ? error.message : "An unexpected error occurred during AI enhancement.";
    const id = typeof questionIdOrObject === "string" ? questionIdOrObject : questionIdOrObject.id;
    return {
      success: false,
      originalQuestion: {
        id,
        board: "CBSE",
        grade: "CLASS_10",
        subject: "MATHEMATICS",
        topic: "Unknown",
        difficulty: "MEDIUM",
        type: "SHORT_ANSWER",
        marks: 1,
        question: "",
        options: null,
        answer: "",
        explanation: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      reason: errMessage,
    };
  }
}

/**
 * Server Action to apply a reviewed AI enhancement to the canonical generated paper.
 * Validates question safety, preserves all metadata/marks/options, and re-runs independent validator.
 */
export async function applyQuestionEnhancementAction(
  currentQuestions: HydratedQuestion[],
  targetQuestionId: string,
  enhancedText: string,
  config: PaperConfig
): Promise<ApplyEnhancementResult> {
  try {
    const validatedConfig = paperConfigSchema.parse(config);

    const targetIndex = currentQuestions.findIndex((q) => q.id === targetQuestionId);
    if (targetIndex === -1) {
      return {
        success: false,
        reason: `Target question with ID "${targetQuestionId}" was not found in the current paper.`,
      };
    }

    const targetQuestion = currentQuestions[targetIndex];

    // Pre-apply safety validation
    const safetyCheck = validateEnhancedQuestion(targetQuestion, enhancedText);
    if (!safetyCheck.isValid) {
      return {
        success: false,
        reason: `Enhanced question rejected by safety validation: ${safetyCheck.violations.join(" ")}`,
      };
    }

    // Replace ONLY the question text (preserve all metadata, marks, type, options, difficulty)
    const updatedQuestion: HydratedQuestion = {
      ...targetQuestion,
      question: enhancedText.trim(),
    };

    const updatedQuestions = [...currentQuestions];
    updatedQuestions[targetIndex] = updatedQuestion;

    // Independent validation gate on the updated paper
    const validation = validatePaper(updatedQuestions, validatedConfig);
    if (!validation.isValid) {
      return {
        success: false,
        reason: `Paper validation failed after applying enhancement: ${validation.violations.map((v) => v.message).join(" ")}`,
      };
    }

    // Re-evaluate target breakdown, deviations, and score
    const targets = calculateTargetMarks(validatedConfig);
    const actual = calculateActualMarks(updatedQuestions);
    const deviations = calculateDeviations(actual, targets, validatedConfig);
    const score = scorePaper(updatedQuestions, validatedConfig, targets);

    const isCloseDifficulty = deviations.difficulty.totalDeviation <= EXACT_TOLERANCES.DIFFICULTY;
    const isCloseTypes = deviations.questionTypes.totalDeviation <= EXACT_TOLERANCES.QUESTION_TYPE;
    const isCloseTopics = deviations.topics.totalDeviation <= EXACT_TOLERANCES.TOPIC;

    let status: GenerationStatus = "PARTIAL";
    if (
      actual.totalMarks === validatedConfig.totalMarks &&
      isCloseDifficulty &&
      isCloseTypes &&
      isCloseTopics &&
      validation.duplicateQuestions.length === 0
    ) {
      status = "EXACT";
    }

    const explanation = `Question Q${targetIndex + 1} phrasing enhanced successfully. Total marks (${actual.totalMarks}M) and section integrity preserved.`;

    const updatedPaperResult: GenerationResult = {
      status,
      questions: updatedQuestions,
      requested: targets,
      actual,
      deviations,
      violations: validation.violations,
      score,
      explanation,
      executionTimeMs: 0,
    };

    return {
      success: true,
      paper: JSON.parse(JSON.stringify(updatedPaperResult)),
      updatedQuestion: JSON.parse(JSON.stringify(updatedQuestion)),
    };
  } catch (error) {
    const errMessage =
      error instanceof Error ? error.message : "An unexpected error occurred while applying enhancement.";
    return {
      success: false,
      reason: errMessage,
    };
  }
}

/**
 * Server Action to generate a brand new similar question matching target question metadata.
 */
export async function generateSimilarQuestionAction(
  targetQuestionOrId: string | HydratedQuestion,
  existingQuestions: HydratedQuestion[] = []
): Promise<AIGenerateSimilarResult> {
  try {
    let targetQuestion: HydratedQuestion | null = null;
    if (typeof targetQuestionOrId === "object") {
      targetQuestion = targetQuestionOrId;
    } else {
      targetQuestion =
        existingQuestions.find((q) => q.id === targetQuestionOrId) ||
        (await getQuestionById(targetQuestionOrId));
    }

    if (!targetQuestion) {
      return {
        success: false,
        originalQuestion: {
          id: "unknown",
          board: "CBSE",
          grade: "CLASS_10",
          subject: "MATHEMATICS",
          topic: "Unknown",
          difficulty: "MEDIUM",
          type: "SHORT_ANSWER",
          marks: 1,
          question: "",
          options: null,
          answer: "",
          explanation: "",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        reason: "Reference question could not be found.",
      };
    }

    const existingTexts = existingQuestions.map((q) => q.question);
    const result = await generateSimilarQuestion(targetQuestion, {
      existingQuestionTexts: existingTexts,
    });

    return JSON.parse(JSON.stringify(result));
  } catch (error) {
    const errMessage =
      error instanceof Error ? error.message : "An unexpected error occurred during AI question generation.";
    return {
      success: false,
      originalQuestion: typeof targetQuestionOrId === "object" ? targetQuestionOrId : {
        id: targetQuestionOrId,
        board: "CBSE",
        grade: "CLASS_10",
        subject: "MATHEMATICS",
        topic: "Unknown",
        difficulty: "MEDIUM",
        type: "SHORT_ANSWER",
        marks: 1,
        question: "",
        options: null,
        answer: "",
        explanation: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      reason: errMessage,
    };
  }
}

/**
 * Server Action to apply a newly generated similar question to the paper.
 */
export async function applySimilarQuestionAction(
  currentQuestions: HydratedQuestion[],
  targetQuestionId: string,
  generatedQuestion: HydratedQuestion,
  config: PaperConfig
): Promise<ApplySimilarQuestionResult> {
  try {
    const validatedConfig = paperConfigSchema.parse(config);

    const targetIndex = currentQuestions.findIndex((q) => q.id === targetQuestionId);
    if (targetIndex === -1) {
      return {
        success: false,
        reason: `Target question with ID "${targetQuestionId}" was not found in the current paper.`,
      };
    }

    const targetQuestion = currentQuestions[targetIndex];

    // Validate that generated question matches pedagogical constraints
    const validation = validateGeneratedSimilarQuestion(
      targetQuestion,
      {
        question: generatedQuestion.question,
        options: generatedQuestion.options || undefined,
        answer: generatedQuestion.answer,
        explanation: generatedQuestion.explanation,
      },
      currentQuestions.filter((q) => q.id !== targetQuestionId).map((q) => q.question)
    );

    if (!validation.isValid) {
      return {
        success: false,
        reason: `Generated question rejected by validation: ${validation.violations.join(" ")}`,
      };
    }

    // Build replacement question preserving curriculum taxonomy and mark value
    const replacement: HydratedQuestion = {
      ...generatedQuestion,
      id: generatedQuestion.id || `ai-gen-${Date.now()}`,
      board: targetQuestion.board,
      grade: targetQuestion.grade,
      subject: targetQuestion.subject,
      topic: targetQuestion.topic,
      difficulty: targetQuestion.difficulty,
      type: targetQuestion.type,
      marks: targetQuestion.marks,
    };

    const updatedQuestions = [...currentQuestions];
    updatedQuestions[targetIndex] = replacement;

    // Independent paper validation
    const paperVal = validatePaper(updatedQuestions, validatedConfig);
    if (!paperVal.isValid) {
      return {
        success: false,
        reason: `Paper validation failed after applying generated question: ${paperVal.violations.map((v) => v.message).join(" ")}`,
      };
    }

    const targets = calculateTargetMarks(validatedConfig);
    const actual = calculateActualMarks(updatedQuestions);
    const deviations = calculateDeviations(actual, targets, validatedConfig);
    const score = scorePaper(updatedQuestions, validatedConfig, targets);

    const isCloseDifficulty = deviations.difficulty.totalDeviation <= EXACT_TOLERANCES.DIFFICULTY;
    const isCloseTypes = deviations.questionTypes.totalDeviation <= EXACT_TOLERANCES.QUESTION_TYPE;
    const isCloseTopics = deviations.topics.totalDeviation <= EXACT_TOLERANCES.TOPIC;

    let status: GenerationStatus = "PARTIAL";
    if (
      actual.totalMarks === validatedConfig.totalMarks &&
      isCloseDifficulty &&
      isCloseTypes &&
      isCloseTopics &&
      paperVal.duplicateQuestions.length === 0
    ) {
      status = "EXACT";
    }

    const explanation = `Question Q${targetIndex + 1} replaced with new AI-generated question (${replacement.topic}, ${replacement.marks}M). Total marks (${actual.totalMarks}M) and section balance preserved.`;

    const updatedPaperResult: GenerationResult = {
      status,
      questions: updatedQuestions,
      requested: targets,
      actual,
      deviations,
      violations: paperVal.violations,
      score,
      explanation,
      executionTimeMs: 0,
    };

    return {
      success: true,
      paper: JSON.parse(JSON.stringify(updatedPaperResult)),
      updatedQuestion: JSON.parse(JSON.stringify(replacement)),
    };
  } catch (error) {
    const errMessage =
      error instanceof Error ? error.message : "An unexpected error occurred while applying generated question.";
    return {
      success: false,
      reason: errMessage,
    };
  }
}

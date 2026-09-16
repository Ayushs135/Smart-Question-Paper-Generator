import { HydratedQuestion, normalizeOptionText } from "@/lib/questions";
import { AIGenerateSimilarResult } from "@/types/ai";
import { callGroqGenerateSimilar, GroqGenerateSimilarResponse } from "./groq";
import { CBSE_AI_GENERATE_SIMILAR_SYSTEM_PROMPT, buildGenerateSimilarPrompt } from "./prompt";
import { validateGeneratedSimilarQuestion } from "./safetyValidator";

export interface QuestionGeneratorOptions {
  customApiKey?: string;
  mockResponse?: GroqGenerateSimilarResponse;
  existingQuestionTexts?: string[];
}

/**
 * Deterministic offline fallback authoring engine for generating similar questions
 * when Groq API key is not configured or network is offline.
 */
export function generateDeterministicSimilarQuestion(
  question: HydratedQuestion
): GroqGenerateSimilarResponse {
  if (question.type === "MCQ") {
    if (question.subject === "MATHEMATICS") {
      return {
        question: `For the quadratic polynomial f(x) = 2x² - 8x + 6, find the product of its zeroes.`,
        options: ["3", "-3", "4", "-4"],
        answer: "3",
        explanation: "Product of zeroes for ax² + bx + c is c/a = 6/2 = 3.",
      };
    } else {
      return {
        question: `Which of the following compounds is formed when zinc metal reacts with dilute sulphuric acid?`,
        options: ["Zinc sulphate and hydrogen gas", "Zinc oxide and water", "Zinc chloride and hydrogen gas", "Zinc carbonate"],
        answer: "Zinc sulphate and hydrogen gas",
        explanation: "Zn + H₂SO₄ → ZnSO₄ + H₂↑ (displacement reaction producing hydrogen gas).",
      };
    }
  }

  if (question.subject === "MATHEMATICS") {
    return {
      question: `Find the 15th term of the Arithmetic Progression 4, 9, 14, 19, ...`,
      options: [],
      answer: "a₁₅ = 74",
      explanation: "Given a = 4, d = 5. Using a_n = a + (n - 1)d, a₁₅ = 4 + (15 - 1) × 5 = 4 + 70 = 74.",
    };
  }

  return {
    question: `State the law of conservation of mass in a chemical reaction and explain with one example.`,
    options: [],
    answer: "Mass can neither be created nor destroyed in a chemical reaction. Total mass of reactants equals total mass of products.",
    explanation: "For example, in 2H₂ + O₂ → 2H₂O, 4g of H₂ reacts with 32g of O₂ to form 36g of H₂O.",
  };
}

/**
 * Server-side AI Similar Question Authoring Engine.
 * - Generates a new curriculum-aligned question matching subject, topic, difficulty, type, and mark value.
 * - Validates output through Zod and pedagogical safety gates.
 * - Returns candidate question object ready for teacher review.
 */
export async function generateSimilarQuestion(
  targetQuestion: HydratedQuestion,
  options?: QuestionGeneratorOptions
): Promise<AIGenerateSimilarResult> {
  let groqResultData: GroqGenerateSimilarResponse | undefined;

  // 1. Check for injected mock response (for unit / integration testing)
  if (options?.mockResponse) {
    groqResultData = options.mockResponse;
  } else {
    // 2. Call Groq API server-side
    const systemPrompt = CBSE_AI_GENERATE_SIMILAR_SYSTEM_PROMPT;
    const userPrompt = buildGenerateSimilarPrompt(targetQuestion);

    const callResult = await callGroqGenerateSimilar(
      systemPrompt,
      userPrompt,
      options?.customApiKey
    );

    if (!callResult.success || !callResult.data) {
      return {
        success: false,
        originalQuestion: targetQuestion,
        reason:
          callResult.error ||
          "AI question generation is currently unavailable. Please check your Groq API key or try again later.",
      };
    }

    groqResultData = callResult.data;
  }

  // 3. Normalize options if MCQ
  const rawOptions = (groqResultData.options || []).slice(0, 4);
  const normalizedOptions = rawOptions.map(normalizeOptionText);

  // 4. Validate output with safety and quality gate
  const validation = validateGeneratedSimilarQuestion(
    targetQuestion,
    {
      question: groqResultData.question,
      options: normalizedOptions,
      answer: groqResultData.answer,
      explanation: groqResultData.explanation,
    },
    options?.existingQuestionTexts
  );

  if (!validation.isValid) {
    return {
      success: false,
      originalQuestion: targetQuestion,
      reason: `Generated question did not pass validation: ${validation.violations.join(" ")}`,
    };
  }

  // 5. Construct full hydrated question object
  const generatedId = `ai-gen-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const generatedQuestionObj: HydratedQuestion = {
    id: generatedId,
    board: targetQuestion.board,
    grade: targetQuestion.grade,
    subject: targetQuestion.subject,
    topic: targetQuestion.topic,
    difficulty: targetQuestion.difficulty,
    type: targetQuestion.type,
    marks: targetQuestion.marks,
    question: groqResultData.question.trim(),
    options: targetQuestion.type === "MCQ" ? normalizedOptions : null,
    answer: groqResultData.answer.trim(),
    explanation: groqResultData.explanation?.trim() || "CBSE Class 10 Model Answer",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return {
    success: true,
    originalQuestion: targetQuestion,
    generatedQuestion: generatedQuestionObj,
  };
}

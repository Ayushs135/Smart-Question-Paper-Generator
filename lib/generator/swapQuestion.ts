import { HydratedQuestion, getQuestionsBySubject } from "@/lib/questions";
import { PaperConfig } from "@/types/config";
import {
  calculateTargetMarks,
  calculateActualMarks,
  calculateDeviations,
  scorePaper,
} from "./scoring";
import { validatePaper } from "./validator";
import { GenerationResult, GenerationStatus, EXACT_TOLERANCES } from "./types";

export interface SwapQuestionResult {
  success: boolean;
  swappedQuestion?: HydratedQuestion;
  originalQuestion?: HydratedQuestion;
  paper?: GenerationResult;
  reason?: string;
}

/**
 * Local deterministic question swap engine.
 * Replaces a single selected question in a generated paper without regenerating the whole paper.
 *
 * Constraints:
 * - Replacement must match the original question on: subject, board, grade, topic, difficulty, type, marks.
 * - Replacement must not equal original question ID and must not exist elsewhere in the current paper.
 * - Unaffected questions retain their exact positions, IDs, and marks.
 * - Recalculates metrics and validates via independent validator.
 */
export async function swapQuestion(
  currentQuestions: HydratedQuestion[],
  targetQuestionId: string,
  config: PaperConfig,
  availablePool?: HydratedQuestion[]
): Promise<SwapQuestionResult> {
  const startTime = Date.now();

  // 1. Locate the target question in current paper
  const targetIndex = currentQuestions.findIndex((q) => q.id === targetQuestionId);
  if (targetIndex === -1) {
    return {
      success: false,
      reason: `Target question with ID "${targetQuestionId}" was not found in the current paper.`,
    };
  }

  const targetQuestion = currentQuestions[targetIndex];

  // 2. Obtain candidate question pool
  const pool =
    availablePool ??
    (await getQuestionsBySubject(
      config.subject,
      config.board,
      config.grade
    ));

  // 3. Track existing question IDs in current paper to prevent duplicate injection
  const currentPaperIds = new Set(currentQuestions.map((q) => q.id));

  // 4. Filter strictly matching unused candidate questions
  const eligibleCandidates = pool.filter((candidate) => {
    // Cannot be the original question
    if (candidate.id === targetQuestion.id) return false;
    // Cannot already exist in current paper
    if (currentPaperIds.has(candidate.id)) return false;

    // Must strictly match all pedagogical and domain attributes
    return (
      candidate.subject === targetQuestion.subject &&
      candidate.board === targetQuestion.board &&
      candidate.grade === targetQuestion.grade &&
      candidate.topic === targetQuestion.topic &&
      candidate.difficulty === targetQuestion.difficulty &&
      candidate.type === targetQuestion.type &&
      candidate.marks === targetQuestion.marks
    );
  });

  // 5. Graceful fallback if no alternatives exist
  if (eligibleCandidates.length === 0) {
    return {
      success: false,
      originalQuestion: targetQuestion,
      reason: "No alternative question is available for this combination of topic, difficulty, type, and marks.",
    };
  }

  // 6. Deterministic candidate ranking
  eligibleCandidates.sort((a, b) => {
    if (a.topic !== b.topic) return a.topic.localeCompare(b.topic);
    if (a.difficulty !== b.difficulty) return a.difficulty.localeCompare(b.difficulty);
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    if (a.marks !== b.marks) return a.marks - b.marks;
    return a.id.localeCompare(b.id);
  });

  const replacementQuestion = eligibleCandidates[0];

  // 7. Perform local replacement at exact original index (preserving all other questions)
  const updatedQuestions = [...currentQuestions];
  updatedQuestions[targetIndex] = replacementQuestion;

  // 8. Re-evaluate metrics from scratch directly on updated question array
  const targets = calculateTargetMarks(config);
  const actual = calculateActualMarks(updatedQuestions);
  const deviations = calculateDeviations(actual, targets, config);
  const score = scorePaper(updatedQuestions, config, targets);

  // 9. Independent validation gate
  const validation = validatePaper(updatedQuestions, config);
  if (!validation.isValid) {
    return {
      success: false,
      originalQuestion: targetQuestion,
      reason: `Question swap rejected by validation engine: ${validation.violations.map((v) => v.message).join(" ")}`,
    };
  }

  // 10. Status determination
  const isCloseDifficulty = deviations.difficulty.totalDeviation <= EXACT_TOLERANCES.DIFFICULTY;
  const isCloseTypes = deviations.questionTypes.totalDeviation <= EXACT_TOLERANCES.QUESTION_TYPE;
  const isCloseTopics = deviations.topics.totalDeviation <= EXACT_TOLERANCES.TOPIC;

  let status: GenerationStatus = "PARTIAL";
  if (
    actual.totalMarks === config.totalMarks &&
    isCloseDifficulty &&
    isCloseTypes &&
    isCloseTopics &&
    validation.duplicateQuestions.length === 0
  ) {
    status = "EXACT";
  }

  const explanation =
    status === "EXACT"
      ? `Successfully swapped question Q${targetIndex + 1} (${targetQuestion.topic}, ${targetQuestion.marks}M) with alternative question ${replacementQuestion.id}. All constraints remain exact.`
      : `Question Q${targetIndex + 1} swapped with alternative question ${replacementQuestion.id}. Total marks (${actual.totalMarks}M) and section integrity preserved.`;

  const updatedPaperResult: GenerationResult = {
    status,
    questions: updatedQuestions,
    requested: targets,
    actual,
    deviations,
    violations: validation.violations,
    score,
    explanation,
    executionTimeMs: Date.now() - startTime,
  };

  return {
    success: true,
    swappedQuestion: replacementQuestion,
    originalQuestion: targetQuestion,
    paper: updatedPaperResult,
  };
}

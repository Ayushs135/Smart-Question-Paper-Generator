import { HydratedQuestion, getQuestionsBySubject } from "@/lib/questions";
import { PaperConfig, paperConfigSchema } from "@/types/config";
import { checkFeasibility } from "./feasibility";
import { searchCandidatePapers, CandidateSearchOptions } from "./candidateSearch";
import { calculateTargetMarks, calculateActualMarks, calculateDeviations } from "./scoring";
import { validatePaper } from "./validator";
import { GenerationResult, GenerationStatus, ConstraintViolation, EXACT_TOLERANCES } from "./types";

/**
 * Deterministic constraint-based question paper generator.
 *
 * Coordinates:
 * 1. Schema validation
 * 2. Feasibility and capacity verification
 * 3. Deterministic mark-bucketed DP candidate optimization
 * 4. Independent validation and deviation metrics calculation
 * 5. Structured pedagogical explanation synthesis
 */
export async function generatePaper(
  config: PaperConfig,
  questionPool?: HydratedQuestion[],
  options?: CandidateSearchOptions
): Promise<GenerationResult> {
  const startTime = Date.now();

  // 1. Validate configuration schema
  const parsedConfig = paperConfigSchema.parse(config);

  // 2. Obtain question pool
  const questions =
    questionPool ??
    (await getQuestionsBySubject(
      parsedConfig.subject,
      parsedConfig.board,
      parsedConfig.grade
    ));

  // 3. Compute target breakdown
  const targets = calculateTargetMarks(parsedConfig);

  // 4. Pre-search Feasibility Check
  const feasibility = checkFeasibility(parsedConfig, questions);

  if (!feasibility.isFeasible && !feasibility.canAchieveExactTotal) {
    const emptyActual = calculateActualMarks([]);
    const emptyDeviations = calculateDeviations(emptyActual, targets, parsedConfig);

    return {
      status: "IMPOSSIBLE",
      questions: [],
      requested: targets,
      actual: emptyActual,
      deviations: emptyDeviations,
      violations: feasibility.violations,
      score: 999999,
      explanation: `Generation impossible: ${feasibility.violations.map((v) => v.message).join(" ")}`,
      executionTimeMs: Date.now() - startTime,
    };
  }

  // 5. Execute Deterministic Candidate Search
  const searchResult = searchCandidatePapers(questions, parsedConfig, options);
  const selectedQuestions = searchResult.bestPaper;

  // 6. Calculate Actual Breakdown & Deviations
  const actual = calculateActualMarks(selectedQuestions);
  const deviations = calculateDeviations(actual, targets, parsedConfig);

  // 7. Independent Validation
  const validation = validatePaper(selectedQuestions, parsedConfig);
  const allViolations: ConstraintViolation[] = [
    ...feasibility.violations,
    ...validation.violations,
  ];

  // 8. Determine Final Status
  let status: GenerationStatus = "IMPOSSIBLE";

  if (actual.totalMarks === parsedConfig.totalMarks && selectedQuestions.length > 0) {
    // Check if distributions are within explicitly defined discrete tolerances
    const isCloseDifficulty = deviations.difficulty.totalDeviation <= EXACT_TOLERANCES.DIFFICULTY;
    const isCloseTypes = deviations.questionTypes.totalDeviation <= EXACT_TOLERANCES.QUESTION_TYPE;
    const isCloseTopics = deviations.topics.totalDeviation <= EXACT_TOLERANCES.TOPIC;

    if (
      isCloseDifficulty &&
      isCloseTypes &&
      isCloseTopics &&
      feasibility.isFeasible &&
      validation.duplicateQuestions.length === 0
    ) {
      status = "EXACT";
    } else {
      status = "PARTIAL";
    }
  } else if (selectedQuestions.length > 0 && Math.abs(actual.totalMarks - parsedConfig.totalMarks) <= 2) {
    status = "PARTIAL";
  } else {
    status = "IMPOSSIBLE";
  }

  // 9. Synthesize Human-Readable Explanation
  let explanation = "";
  if (status === "EXACT") {
    explanation = `Successfully generated an exact ${actual.totalMarks}-mark CBSE Class 10 ${parsedConfig.subject} examination paper consisting of ${actual.questionCount} questions across 3 sections (Section A: ${actual.sections.sectionA_MCQ.length} MCQs, Section B: ${actual.sections.sectionB_ShortAnswer.length} Short Answers, Section C: ${actual.sections.sectionC_LongAnswer.length} Long Answers). All difficulty, question taxonomy, and syllabus topic distributions are within acceptable tolerances.`;
  } else if (status === "PARTIAL") {
    explanation = `Generated a ${actual.totalMarks}-mark paper with ${actual.questionCount} questions (Section A: ${actual.sections.sectionA_MCQ.length} MCQs, Section B: ${actual.sections.sectionB_ShortAnswer.length} Short Answers, Section C: ${actual.sections.sectionC_LongAnswer.length} Long Answers). The paper satisfies total marks, but exhibits distribution trade-offs (Difficulty deviation: ±${deviations.difficulty.totalDeviation.toFixed(1)}M, Question taxonomy deviation: ±${deviations.questionTypes.totalDeviation.toFixed(1)}M, Topic deviation: ±${deviations.topics.totalDeviation.toFixed(1)}M).`;
  } else {
    explanation = `Unable to construct a valid paper meeting all hard constraints. ${allViolations.map((v) => v.message).join(" ")}`;
  }

  return {
    status,
    questions: selectedQuestions,
    requested: targets,
    actual,
    deviations,
    violations: allViolations,
    score: searchResult.bestScore,
    explanation,
    executionTimeMs: Date.now() - startTime,
  };
}

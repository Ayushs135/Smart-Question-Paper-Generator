import { HydratedQuestion } from "@/lib/questions";
import { PaperConfig } from "@/types/config";
import {
  DifficultyType,
  QuestionTypeEnum,
} from "@/types/question";
import {
  PaperTargetBreakdown,
  PaperActualBreakdown,
  PaperDeviations,
  DimensionBreakdown,
} from "./types";

/**
 * Weights for multi-criteria optimization function.
 * Higher penalty = higher priority constraint.
 */
export const SCORING_WEIGHTS = {
  TOTAL_MARKS_PENALTY: 1000,   // Highest priority constraint (Exact Total Marks)
  QUESTION_TYPE_WEIGHT: 25,    // High priority (MCQ / SA / LA structure)
  DIFFICULTY_WEIGHT: 5,        // Medium priority (Cognitive distribution)
  TOPIC_WEIGHT: 3,             // Medium priority (Syllabus coverage)
  MARK_MIX_WEIGHT: 1,          // Soft tie-breaker (Balanced denomination mix within question types)
  DUPLICATE_PENALTY: 50000,    // Extreme penalty for duplicate questions
} as const;

/**
 * Computes exact target marks for each pedagogical dimension from the PaperConfig.
 * Note: Targets can have decimal values (e.g. 40 * 33% = 13.2 marks).
 */
export function calculateTargetMarks(config: PaperConfig): PaperTargetBreakdown {
  const { totalMarks, difficultyDistribution, questionTypeDistribution, topicDistribution } = config;

  const difficulty: Record<DifficultyType, number> = {
    EASY: (difficultyDistribution.EASY / 100) * totalMarks,
    MEDIUM: (difficultyDistribution.MEDIUM / 100) * totalMarks,
    HARD: (difficultyDistribution.HARD / 100) * totalMarks,
  };

  const questionTypes: Record<QuestionTypeEnum, number> = {
    MCQ: (questionTypeDistribution.MCQ / 100) * totalMarks,
    SHORT_ANSWER: (questionTypeDistribution.SHORT_ANSWER / 100) * totalMarks,
    LONG_ANSWER: (questionTypeDistribution.LONG_ANSWER / 100) * totalMarks,
  };

  const topics: Record<string, number> = {};
  for (const [topic, pct] of Object.entries(topicDistribution)) {
    topics[topic] = (pct / 100) * totalMarks;
  }

  return {
    totalMarks,
    difficulty,
    questionTypes,
    topics,
  };
}

/**
 * Calculates the count and sum of marks for each distinct mark denomination within each question type.
 */
export function calculateMarkMixBreakdown(questions: HydratedQuestion[]) {
  const map: Record<QuestionTypeEnum, Record<number, number>> = {
    MCQ: {},
    SHORT_ANSWER: {},
    LONG_ANSWER: {},
  };

  for (const q of questions) {
    if (q.type in map) {
      map[q.type][q.marks] = (map[q.type][q.marks] || 0) + 1;
    }
  }

  const formatCounts = (type: QuestionTypeEnum) => {
    const marksList = Object.keys(map[type]).map(Number).sort((a, b) => a - b);
    return marksList.map((m) => ({
      marks: m,
      questionCount: map[type][m],
      totalMarks: m * map[type][m],
    }));
  };

  return {
    MCQ: formatCounts("MCQ"),
    SHORT_ANSWER: formatCounts("SHORT_ANSWER"),
    LONG_ANSWER: formatCounts("LONG_ANSWER"),
  };
}

/**
 * Computes a soft pedagogical penalty for lack of mark-denomination diversity.
 * Encourages a balanced mixture across available denominations as a gentle tie-breaker.
 * Scaled softly (0.0 to 3.0 max) to ensure it NEVER overrides question type or total mark constraints.
 */
export function computeMarkMixPenalty(actual: PaperActualBreakdown): number {
  if (!actual || !actual.markMix) {
    return 0;
  }
  let penalty = 0;

  // 1. MCQ mark mixing (1M vs 2M)
  const mcqMarks = actual.questionTypes?.MCQ || 0;
  if (mcqMarks >= 12 && actual.markMix.MCQ) {
    const mcqCounts = actual.markMix.MCQ;
    const m1 = mcqCounts.find((c) => c.marks === 1)?.totalMarks || 0;
    const frac1 = m1 / mcqMarks;
    if (frac1 > 0.85) {
      penalty += (frac1 - 0.85) * 2.0;
    }
  }

  // 2. Short Answer mark mixing (2M, 3M, 4M)
  const saMarks = actual.questionTypes?.SHORT_ANSWER || 0;
  if (saMarks >= 15 && actual.markMix.SHORT_ANSWER) {
    const saCounts = actual.markMix.SHORT_ANSWER;
    const m2 = saCounts.find((c) => c.marks === 2)?.totalMarks || 0;
    const frac2 = m2 / saMarks;
    if (frac2 > 0.80) {
      penalty += (frac2 - 0.80) * 2.0;
    }
  }

  // 3. Long Answer mark mixing (5M, 6M, 8M)
  const laMarks = actual.questionTypes?.LONG_ANSWER || 0;
  if (laMarks >= 20 && actual.markMix.LONG_ANSWER) {
    const laCounts = actual.markMix.LONG_ANSWER;
    const m5 = laCounts.find((c) => c.marks === 5)?.totalMarks || 0;
    const frac5 = m5 / laMarks;
    if (frac5 > 0.75) {
      penalty += (frac5 - 0.75) * 2.0;
    }
  }

  return penalty;
}

/**
 * Aggregates actual marks and categorizes questions into exam sections directly from questions.
 * Section organization respects the actual question type and mark value stored on each question:
 * - Section A: All MCQ questions (e.g. 1M or 2M)
 * - Section B: All Short Answer questions (e.g. 2M, 3M, 4M)
 * - Section C: All Long Answer questions (e.g. 5M, 6M, 8M)
 */
export function calculateActualMarks(questions: HydratedQuestion[]): PaperActualBreakdown {
  let totalMarks = 0;

  const difficulty: Record<DifficultyType, number> = {
    EASY: 0,
    MEDIUM: 0,
    HARD: 0,
  };

  const questionTypes: Record<QuestionTypeEnum, number> = {
    MCQ: 0,
    SHORT_ANSWER: 0,
    LONG_ANSWER: 0,
  };

  const topics: Record<string, number> = {};

  const sections = {
    sectionA_MCQ: [] as HydratedQuestion[],
    sectionB_ShortAnswer: [] as HydratedQuestion[],
    sectionC_LongAnswer: [] as HydratedQuestion[],
  };

  for (const q of questions) {
    totalMarks += q.marks;

    if (q.difficulty in difficulty) {
      difficulty[q.difficulty as DifficultyType] += q.marks;
    }

    if (q.type in questionTypes) {
      questionTypes[q.type as QuestionTypeEnum] += q.marks;
    }

    topics[q.topic] = (topics[q.topic] || 0) + q.marks;

    if (q.type === "MCQ") {
      sections.sectionA_MCQ.push(q);
    } else if (q.type === "SHORT_ANSWER") {
      sections.sectionB_ShortAnswer.push(q);
    } else if (q.type === "LONG_ANSWER") {
      sections.sectionC_LongAnswer.push(q);
    }
  }

  const markMix = calculateMarkMixBreakdown(questions);

  return {
    totalMarks,
    questionCount: questions.length,
    difficulty,
    questionTypes,
    topics,
    markMix,
    sections,
  };
}

/**
 * Computes dimension-by-dimension breakdowns and deviations against requested targets.
 */
export function calculateDeviations(
  actual: PaperActualBreakdown,
  targets: PaperTargetBreakdown,
  config: PaperConfig
): PaperDeviations {
  const totalMarksDev = Math.abs(actual.totalMarks - targets.totalMarks);

  // 1. Difficulty Breakdown
  const diffDevs: Record<DifficultyType, number> = {
    EASY: Math.abs(actual.difficulty.EASY - targets.difficulty.EASY),
    MEDIUM: Math.abs(actual.difficulty.MEDIUM - targets.difficulty.MEDIUM),
    HARD: Math.abs(actual.difficulty.HARD - targets.difficulty.HARD),
  };
  const diffTotalDev = (diffDevs.EASY + diffDevs.MEDIUM + diffDevs.HARD) / 2;

  const difficultyBreakdown: DimensionBreakdown<DifficultyType> = {
    requestedPercentages: config.difficultyDistribution,
    requestedMarks: targets.difficulty,
    actualMarks: actual.difficulty,
    actualPercentages: {
      EASY: actual.totalMarks > 0 ? (actual.difficulty.EASY / actual.totalMarks) * 100 : 0,
      MEDIUM: actual.totalMarks > 0 ? (actual.difficulty.MEDIUM / actual.totalMarks) * 100 : 0,
      HARD: actual.totalMarks > 0 ? (actual.difficulty.HARD / actual.totalMarks) * 100 : 0,
    },
    deviations: diffDevs,
    totalDeviation: diffTotalDev,
  };

  // 2. Question Types Breakdown
  const typeDevs: Record<QuestionTypeEnum, number> = {
    MCQ: Math.abs(actual.questionTypes.MCQ - targets.questionTypes.MCQ),
    SHORT_ANSWER: Math.abs(actual.questionTypes.SHORT_ANSWER - targets.questionTypes.SHORT_ANSWER),
    LONG_ANSWER: Math.abs(actual.questionTypes.LONG_ANSWER - targets.questionTypes.LONG_ANSWER),
  };
  const typeTotalDev = (typeDevs.MCQ + typeDevs.SHORT_ANSWER + typeDevs.LONG_ANSWER) / 2;

  const questionTypeBreakdown: DimensionBreakdown<QuestionTypeEnum> = {
    requestedPercentages: config.questionTypeDistribution,
    requestedMarks: targets.questionTypes,
    actualMarks: actual.questionTypes,
    actualPercentages: {
      MCQ: actual.totalMarks > 0 ? (actual.questionTypes.MCQ / actual.totalMarks) * 100 : 0,
      SHORT_ANSWER: actual.totalMarks > 0 ? (actual.questionTypes.SHORT_ANSWER / actual.totalMarks) * 100 : 0,
      LONG_ANSWER: actual.totalMarks > 0 ? (actual.questionTypes.LONG_ANSWER / actual.totalMarks) * 100 : 0,
    },
    deviations: typeDevs,
    totalDeviation: typeTotalDev,
  };

  // 3. Topics Breakdown
  const allTopicKeys = Array.from(
    new Set([...Object.keys(targets.topics), ...Object.keys(actual.topics)])
  );
  const topicDevs: Record<string, number> = {};
  const topicReqPcts: Record<string, number> = {};
  const topicReqMarks: Record<string, number> = {};
  const topicActMarks: Record<string, number> = {};
  const topicActPcts: Record<string, number> = {};
  let topicSumDev = 0;

  for (const t of allTopicKeys) {
    const reqMark = targets.topics[t] || 0;
    const actMark = actual.topics[t] || 0;
    const dev = Math.abs(actMark - reqMark);
    topicDevs[t] = dev;
    topicReqPcts[t] = config.topicDistribution[t] || 0;
    topicReqMarks[t] = reqMark;
    topicActMarks[t] = actMark;
    topicActPcts[t] = actual.totalMarks > 0 ? (actMark / actual.totalMarks) * 100 : 0;
    topicSumDev += dev;
  }
  const topicTotalDev = topicSumDev / 2;

  const topicBreakdown: DimensionBreakdown<string> = {
    requestedPercentages: topicReqPcts,
    requestedMarks: topicReqMarks,
    actualMarks: topicActMarks,
    actualPercentages: topicActPcts,
    deviations: topicDevs,
    totalDeviation: topicTotalDev,
  };

  // 4. Mark-Mix Soft Penalty
  const markMixPenalty = computeMarkMixPenalty(actual);

  // Composite Penalty Score
  const compositeScore =
    totalMarksDev * SCORING_WEIGHTS.TOTAL_MARKS_PENALTY +
    typeTotalDev * SCORING_WEIGHTS.QUESTION_TYPE_WEIGHT +
    diffTotalDev * SCORING_WEIGHTS.DIFFICULTY_WEIGHT +
    topicTotalDev * SCORING_WEIGHTS.TOPIC_WEIGHT +
    markMixPenalty * SCORING_WEIGHTS.MARK_MIX_WEIGHT;

  return {
    totalMarks: totalMarksDev,
    difficulty: difficultyBreakdown,
    questionTypes: questionTypeBreakdown,
    topics: topicBreakdown,
    markMixPenalty,
    compositeScore,
  };
}

/**
 * Objective scoring function for complete candidate papers.
 * Lower score = better quality paper.
 */
export function scorePaper(
  questions: HydratedQuestion[],
  config: PaperConfig,
  targets?: PaperTargetBreakdown
): number {
  const targetMetrics = targets ?? calculateTargetMarks(config);
  const actualMetrics = calculateActualMarks(questions);
  const deviations = calculateDeviations(actualMetrics, targetMetrics, config);

  // Penalty for duplicates
  const uniqueIds = new Set(questions.map((q) => q.id));
  const duplicateCount = questions.length - uniqueIds.size;
  const duplicatePenalty = duplicateCount * SCORING_WEIGHTS.DUPLICATE_PENALTY;

  return deviations.compositeScore + duplicatePenalty;
}

/**
 * Proportional objective scoring function for partial states in Beam Search.
 * Measures how well partial selections adhere to target ratios scaled to currentMarks.
 */
export function scorePartialState(
  questions: HydratedQuestion[],
  config: PaperConfig
): number {
  const actual = calculateActualMarks(questions);
  const M = actual.totalMarks;
  if (M === 0) return 1000;

  // If complete, use standard scorePaper
  if (M === config.totalMarks) {
    return scorePaper(questions, config);
  }

  // Target ratios scaled to current partial sum M
  const expDiffEasy = (config.difficultyDistribution.EASY / 100) * M;
  const expDiffMed = (config.difficultyDistribution.MEDIUM / 100) * M;
  const expDiffHard = (config.difficultyDistribution.HARD / 100) * M;

  const diffDev =
    (Math.abs(actual.difficulty.EASY - expDiffEasy) +
      Math.abs(actual.difficulty.MEDIUM - expDiffMed) +
      Math.abs(actual.difficulty.HARD - expDiffHard)) /
    2;

  const expTypeMCQ = (config.questionTypeDistribution.MCQ / 100) * M;
  const expTypeSA = (config.questionTypeDistribution.SHORT_ANSWER / 100) * M;
  const expTypeLA = (config.questionTypeDistribution.LONG_ANSWER / 100) * M;

  const typeDev =
    (Math.abs(actual.questionTypes.MCQ - expTypeMCQ) +
      Math.abs(actual.questionTypes.SHORT_ANSWER - expTypeSA) +
      Math.abs(actual.questionTypes.LONG_ANSWER - expTypeLA)) /
    2;

  let topicDevSum = 0;
  for (const [topic, pct] of Object.entries(config.topicDistribution)) {
    const expTopic = (pct / 100) * M;
    const actTopic = actual.topics[topic] || 0;
    topicDevSum += Math.abs(actTopic - expTopic);
  }
  const topicDev = topicDevSum / 2;

  // Proportional penalty normalized to current marks + progress incentive
  const progressRatio = M / config.totalMarks;
  const normalizedPenalty =
    (typeDev * SCORING_WEIGHTS.QUESTION_TYPE_WEIGHT +
      diffDev * SCORING_WEIGHTS.DIFFICULTY_WEIGHT +
      topicDev * SCORING_WEIGHTS.TOPIC_WEIGHT) /
    (M + 1);

  // Bonus for making progress towards target total while maintaining quality
  return normalizedPenalty * 100 - progressRatio * 10;
}

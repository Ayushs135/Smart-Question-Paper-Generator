import { z } from "zod";
import {
  BOARDS,
  GRADES,
  SUBJECTS,
  MATH_TOPICS,
  SCIENCE_TOPICS,
  SubjectType,
  MathTopic,
  ScienceTopic,
} from "./question";

/**
 * Difficulty Distribution Schema
 */
export const difficultyDistributionSchema = z
  .object({
    EASY: z.number().int().min(0).max(100),
    MEDIUM: z.number().int().min(0).max(100),
    HARD: z.number().int().min(0).max(100),
  })
  .refine(
    (dist) => dist.EASY + dist.MEDIUM + dist.HARD === 100,
    {
      message: "Difficulty distribution must total exactly 100%",
    }
  );

export type DifficultyDistribution = z.infer<typeof difficultyDistributionSchema>;

/**
 * Question Type Distribution Schema
 */
export const questionTypeDistributionSchema = z
  .object({
    MCQ: z.number().int().min(0).max(100),
    SHORT_ANSWER: z.number().int().min(0).max(100),
    LONG_ANSWER: z.number().int().min(0).max(100),
  })
  .refine(
    (dist) => dist.MCQ + dist.SHORT_ANSWER + dist.LONG_ANSWER === 100,
    {
      message: "Question-type distribution must total exactly 100%",
    }
  );

export type QuestionTypeDistribution = z.infer<typeof questionTypeDistributionSchema>;

/**
 * Topic Distribution Record Schema
 */
export const topicDistributionSchema = z
  .record(z.string(), z.number().int().min(0).max(100))
  .refine(
    (dist) => {
      const sum = Object.values(dist).reduce((acc, val) => acc + val, 0);
      return sum === 100;
    },
    {
      message: "Topic distribution must total exactly 100%",
    }
  );

export type TopicDistribution = z.infer<typeof topicDistributionSchema>;

/**
 * Complete Paper Configuration Blueprint Schema (Zod)
 */
export const paperConfigSchema = z
  .object({
    board: z.enum(BOARDS).default("CBSE"),
    grade: z.enum(GRADES).default("CLASS_10"),
    subject: z.enum(SUBJECTS),
    totalMarks: z
      .number({
        required_error: "Total marks is required",
        invalid_type_error: "Total marks must be a number",
      })
      .int("Total marks must be an integer")
      .min(1, "Total marks must be at least 1")
      .max(200, "Total marks cannot exceed 200"),
    difficultyDistribution: z.object({
      EASY: z.number().int().min(0).max(100),
      MEDIUM: z.number().int().min(0).max(100),
      HARD: z.number().int().min(0).max(100),
    }),
    topicDistribution: z.record(z.string(), z.number().int().min(0).max(100)),
    questionTypeDistribution: z.object({
      MCQ: z.number().int().min(0).max(100),
      SHORT_ANSWER: z.number().int().min(0).max(100),
      LONG_ANSWER: z.number().int().min(0).max(100),
    }),
  })
  .superRefine((config, ctx) => {
    // 1. Validate Difficulty Distribution Total
    const diffSum =
      config.difficultyDistribution.EASY +
      config.difficultyDistribution.MEDIUM +
      config.difficultyDistribution.HARD;
    if (diffSum !== 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Difficulty percentages must total exactly 100% (currently ${diffSum}%)`,
        path: ["difficultyDistribution"],
      });
    }

    // 2. Validate Question Type Distribution Total
    const typeSum =
      config.questionTypeDistribution.MCQ +
      config.questionTypeDistribution.SHORT_ANSWER +
      config.questionTypeDistribution.LONG_ANSWER;
    if (typeSum !== 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Question-type percentages must total exactly 100% (currently ${typeSum}%)`,
        path: ["questionTypeDistribution"],
      });
    }

    // 3. Validate Topic Distribution Total and Topic validity
    const allowedTopics: readonly string[] =
      config.subject === "MATHEMATICS" ? MATH_TOPICS : SCIENCE_TOPICS;

    const topicEntries = Object.entries(config.topicDistribution);
    if (topicEntries.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one topic must have a non-zero percentage",
        path: ["topicDistribution"],
      });
      return;
    }

    let topicSum = 0;
    for (const [topic, percentage] of topicEntries) {
      if (!allowedTopics.includes(topic)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Topic "${topic}" is not a valid CBSE Class 10 ${config.subject} topic`,
          path: ["topicDistribution", topic],
        });
      }
      topicSum += percentage;
    }

    if (topicSum !== 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Topic weightage must total exactly 100% (currently ${topicSum}%)`,
        path: ["topicDistribution"],
      });
    }
  });

export type PaperConfig = z.infer<typeof paperConfigSchema>;

/**
 * Utility: Compute equal topic distribution handling integer remainder strictly to sum to 100%
 */
export function getEqualTopicDistribution(
  subject: SubjectType
): Record<string, number> {
  const topics = subject === "MATHEMATICS" ? MATH_TOPICS : SCIENCE_TOPICS;
  const numTopics = topics.length;
  const basePercentage = Math.floor(100 / numTopics);
  const remainder = 100 % numTopics;

  const distribution: Record<string, number> = {};
  topics.forEach((topic, index) => {
    distribution[topic] = index < remainder ? basePercentage + 1 : basePercentage;
  });

  return distribution;
}

/**
 * Utility: Reset all topics to 0% for a given subject
 */
export function getEmptyTopicDistribution(
  subject: SubjectType
): Record<string, number> {
  const topics = subject === "MATHEMATICS" ? MATH_TOPICS : SCIENCE_TOPICS;
  const distribution: Record<string, number> = {};
  topics.forEach((topic) => {
    distribution[topic] = 0;
  });
  return distribution;
}

/**
 * Default preset values for standard CBSE Class 10 blueprints
 */
export const DEFAULT_PAPER_CONFIG: PaperConfig = {
  board: "CBSE",
  grade: "CLASS_10",
  subject: "MATHEMATICS",
  totalMarks: 40,
  difficultyDistribution: {
    EASY: 30,
    MEDIUM: 50,
    HARD: 20,
  },
  topicDistribution: getEqualTopicDistribution("MATHEMATICS"),
  questionTypeDistribution: {
    MCQ: 40,
    SHORT_ANSWER: 40,
    LONG_ANSWER: 20,
  },
};

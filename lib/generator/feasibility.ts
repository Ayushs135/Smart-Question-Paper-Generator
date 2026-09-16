import { HydratedQuestion } from "@/lib/questions";
import { PaperConfig } from "@/types/config";
import { DifficultyType, QuestionTypeEnum } from "@/types/question";
import { calculateTargetMarks } from "./scoring";
import { FeasibilityReport, ConstraintViolation } from "./types";

/**
 * Evaluates whether a target sum can be formed by a subset of numbers (0/1 subset sum DP).
 * Returns reachable boolean and closest achievable sum.
 */
export function checkSubsetSumReachability(
  numbers: number[],
  target: number
): { reachable: boolean; closest: number } {
  if (target === 0) return { reachable: true, closest: 0 };
  if (numbers.length === 0) return { reachable: false, closest: 0 };

  const totalSum = numbers.reduce((a, b) => a + b, 0);
  if (totalSum < target) {
    return { reachable: false, closest: totalSum };
  }

  // DP table for subset sum up to target
  const maxCap = Math.min(totalSum, target * 2);
  const dp = new Uint8Array(maxCap + 1);
  dp[0] = 1;

  for (const num of numbers) {
    for (let s = maxCap; s >= num; s--) {
      if (dp[s - num]) {
        dp[s] = 1;
      }
    }
  }

  if (target <= maxCap && dp[target] === 1) {
    return { reachable: true, closest: target };
  }

  // Find closest achievable sum
  let closest = 0;
  let minDiff = Infinity;
  for (let s = 1; s <= maxCap; s++) {
    if (dp[s] === 1) {
      const diff = Math.abs(s - target);
      if (diff < minDiff) {
        minDiff = diff;
        closest = s;
      }
    }
  }

  return { reachable: false, closest };
}

/**
 * Pre-search feasibility analysis to detect capacity and reachability constraints early.
 */
export function checkFeasibility(
  config: PaperConfig,
  availableQuestions: HydratedQuestion[]
): FeasibilityReport {
  const violations: ConstraintViolation[] = [];
  const targets = calculateTargetMarks(config);

  // 1. Check if pool is empty
  if (availableQuestions.length === 0) {
    violations.push({
      type: "EMPTY_QUESTION_BANK",
      dimension: "pool",
      message: `No questions found in the question bank for subject "${config.subject}", board "${config.board}", grade "${config.grade}".`,
    });
    return {
      isFeasible: false,
      canAchieveExactTotal: false,
      closestAchievableMarks: 0,
      violations,
    };
  }

  // 2. Check total bank capacity
  const totalAvailableMarks = availableQuestions.reduce((sum, q) => sum + q.marks, 0);
  if (totalAvailableMarks < config.totalMarks) {
    violations.push({
      type: "INSUFFICIENT_TOTAL_CAPACITY",
      dimension: "totalMarks",
      requestedMarks: config.totalMarks,
      availableMarks: totalAvailableMarks,
      message: `Requested ${config.totalMarks} total marks, but the available question pool only contains ${totalAvailableMarks} marks.`,
    });
  }

  // 3. Check Difficulty Capacities
  const difficultyCapacity: Record<DifficultyType, number> = {
    EASY: 0,
    MEDIUM: 0,
    HARD: 0,
  };
  for (const q of availableQuestions) {
    if (q.difficulty in difficultyCapacity) {
      difficultyCapacity[q.difficulty as DifficultyType] += q.marks;
    }
  }

  for (const [diff, reqMarks] of Object.entries(targets.difficulty) as [DifficultyType, number][]) {
    const availMarks = difficultyCapacity[diff] || 0;
    if (availMarks < reqMarks) {
      violations.push({
        type: "INSUFFICIENT_DIFFICULTY_CAPACITY",
        dimension: "difficulty",
        value: diff,
        requestedMarks: reqMarks,
        availableMarks: availMarks,
        message: `Only ${availMarks} marks of ${diff} questions exist in the question bank, but ${reqMarks.toFixed(1)} marks (${config.difficultyDistribution[diff]}%) were requested.`,
      });
    }
  }

  // 4. Check Question Type Capacities
  const typeCapacity: Record<QuestionTypeEnum, number> = {
    MCQ: 0,
    SHORT_ANSWER: 0,
    LONG_ANSWER: 0,
  };
  for (const q of availableQuestions) {
    if (q.type in typeCapacity) {
      typeCapacity[q.type as QuestionTypeEnum] += q.marks;
    }
  }

  for (const [qType, reqMarks] of Object.entries(targets.questionTypes) as [QuestionTypeEnum, number][]) {
    const availMarks = typeCapacity[qType] || 0;
    if (availMarks < reqMarks) {
      violations.push({
        type: "INSUFFICIENT_QUESTION_TYPE_CAPACITY",
        dimension: "type",
        value: qType,
        requestedMarks: reqMarks,
        availableMarks: availMarks,
        message: `Only ${availMarks} marks of ${qType} questions exist in the question bank, but ${reqMarks.toFixed(1)} marks (${config.questionTypeDistribution[qType]}%) were requested.`,
      });
    }
  }

  // 5. Check Topic Capacities
  const topicCapacity: Record<string, number> = {};
  for (const q of availableQuestions) {
    topicCapacity[q.topic] = (topicCapacity[q.topic] || 0) + q.marks;
  }

  for (const [topic, reqMarks] of Object.entries(targets.topics)) {
    if (reqMarks > 0) {
      const availMarks = topicCapacity[topic] || 0;
      if (availMarks < reqMarks) {
        violations.push({
          type: "INSUFFICIENT_TOPIC_CAPACITY",
          dimension: "topic",
          value: topic,
          requestedMarks: reqMarks,
          availableMarks: availMarks,
          message: `Only ${availMarks} marks available for topic "${topic}", but ${reqMarks.toFixed(1)} marks (${config.topicDistribution[topic]}%) were requested.`,
        });
      }
    }
  }

  // 6. Check Exact Total Marks Reachability via 0/1 Subset Sum
  const questionMarks = availableQuestions.map((q) => q.marks);
  const subsetSumCheck = checkSubsetSumReachability(questionMarks, config.totalMarks);

  if (!subsetSumCheck.reachable) {
    violations.push({
      type: "UNREACHABLE_TOTAL_MARKS",
      dimension: "totalMarks",
      requestedMarks: config.totalMarks,
      availableMarks: subsetSumCheck.closest,
      message: `No combination of available questions can sum exactly to ${config.totalMarks} marks. Closest achievable total is ${subsetSumCheck.closest} marks.`,
    });
  }

  const isFeasible = violations.length === 0;

  return {
    isFeasible,
    canAchieveExactTotal: subsetSumCheck.reachable,
    closestAchievableMarks: subsetSumCheck.closest,
    violations,
  };
}

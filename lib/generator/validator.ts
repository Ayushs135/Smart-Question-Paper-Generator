import { HydratedQuestion } from "@/lib/questions";
import { PaperConfig } from "@/types/config";
import {
  calculateTargetMarks,
  calculateActualMarks,
  calculateDeviations,
} from "./scoring";
import { ValidationReport, ConstraintViolation } from "./types";

/**
 * Independently validates a question paper against a given PaperConfig.
 * Does NOT rely on any generator metadata; computes all breakdowns directly from raw questions.
 */
export function validatePaper(
  paper: HydratedQuestion[],
  config: PaperConfig
): ValidationReport {
  const targets = calculateTargetMarks(config);
  const actual = calculateActualMarks(paper);
  const deviations = calculateDeviations(actual, targets, config);
  const violations: ConstraintViolation[] = [];

  // 1. Check for Duplicate Questions
  const seenIds = new Set<string>();
  const duplicateQuestions: string[] = [];
  for (const q of paper) {
    if (seenIds.has(q.id)) {
      duplicateQuestions.push(q.id);
    } else {
      seenIds.add(q.id);
    }
  }

  if (duplicateQuestions.length > 0) {
    violations.push({
      type: "DISTRIBUTION_DEVIATION",
      dimension: "pool",
      message: `Paper contains ${duplicateQuestions.length} duplicate question(s): ${duplicateQuestions.join(", ")}`,
    });
  }

  // 2. Check Total Marks
  if (actual.totalMarks !== config.totalMarks) {
    violations.push({
      type: "DISTRIBUTION_DEVIATION",
      dimension: "totalMarks",
      requestedMarks: config.totalMarks,
      availableMarks: actual.totalMarks,
      message: `Total marks mismatch: requested ${config.totalMarks} marks, but paper contains ${actual.totalMarks} marks (deviation of ${Math.abs(actual.totalMarks - config.totalMarks)} marks).`,
    });
  }

  // 3. Check Subject Integrity
  const invalidSubjectQuestions = paper.filter((q) => q.subject !== config.subject);
  if (invalidSubjectQuestions.length > 0) {
    violations.push({
      type: "DISTRIBUTION_DEVIATION",
      dimension: "pool",
      message: `Found ${invalidSubjectQuestions.length} question(s) not matching requested subject "${config.subject}".`,
    });
  }

  // Determine overall validity
  // A paper is structurally valid if total marks match and there are no duplicates or foreign subject questions
  const isValid =
    actual.totalMarks === config.totalMarks &&
    duplicateQuestions.length === 0 &&
    invalidSubjectQuestions.length === 0;

  return {
    isValid,
    totalMarks: actual.totalMarks,
    requestedTotalMarks: config.totalMarks,
    totalMarksDeviation: deviations.totalMarks,
    difficulty: deviations.difficulty,
    topics: deviations.topics,
    questionTypes: deviations.questionTypes,
    duplicateQuestions,
    violations,
  };
}

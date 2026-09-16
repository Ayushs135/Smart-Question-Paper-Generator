import {
  paperConfigSchema,
  difficultyDistributionSchema,
  questionTypeDistributionSchema,
  topicDistributionSchema,
  getEqualTopicDistribution,
  getEmptyTopicDistribution,
  DEFAULT_PAPER_CONFIG,
} from "../types/config";
import { MATH_TOPICS, SCIENCE_TOPICS } from "../types/question";

async function runConfigTests() {
  console.log("[TEST] Starting Phase 3 Paper Configuration & Zod Validation Tests...\n");
  let passedCount = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] [PASS] ${testName}${detail ? ` (${detail})` : ""}`);
      passedCount++;
    } else {
      console.error(`  [FAIL] [FAIL] ${testName}${detail ? ` (${detail})` : ""}`);
      throw new Error(`Assertion failed: ${testName}`);
    }
  }

  // 1. Valid configuration
  const validMathConfig = {
    board: "CBSE" as const,
    grade: "CLASS_10" as const,
    subject: "MATHEMATICS" as const,
    totalMarks: 40,
    difficultyDistribution: { EASY: 30, MEDIUM: 50, HARD: 20 },
    topicDistribution: getEqualTopicDistribution("MATHEMATICS"),
    questionTypeDistribution: { MCQ: 40, SHORT_ANSWER: 40, LONG_ANSWER: 20 },
  };

  const parseResult1 = paperConfigSchema.safeParse(validMathConfig);
  assert(
    parseResult1.success,
    "Test 1: Valid Mathematics configuration parses successfully"
  );

  // 2. Difficulty total below 100 (e.g. 30 + 40 + 20 = 90%)
  const diffBelow100 = {
    ...validMathConfig,
    difficultyDistribution: { EASY: 30, MEDIUM: 40, HARD: 20 },
  };
  const parseResult2 = paperConfigSchema.safeParse(diffBelow100);
  assert(
    !parseResult2.success,
    "Test 2: Difficulty total below 100% (90%) fails validation",
    parseResult2.error?.issues[0]?.message
  );

  // 3. Difficulty total above 100 (e.g. 40 + 50 + 20 = 110%)
  const diffAbove100 = {
    ...validMathConfig,
    difficultyDistribution: { EASY: 40, MEDIUM: 50, HARD: 20 },
  };
  const parseResult3 = paperConfigSchema.safeParse(diffAbove100);
  assert(
    !parseResult3.success,
    "Test 3: Difficulty total above 100% (110%) fails validation",
    parseResult3.error?.issues[0]?.message
  );

  // 4. Topic total below 100
  const topicBelow100 = {
    ...validMathConfig,
    topicDistribution: { "Real Numbers": 50, Polynomials: 30 }, // 80%
  };
  const parseResult4 = paperConfigSchema.safeParse(topicBelow100);
  assert(
    !parseResult4.success,
    "Test 4: Topic total below 100% (80%) fails validation",
    parseResult4.error?.issues[0]?.message
  );

  // 5. Topic total above 100
  const topicAbove100 = {
    ...validMathConfig,
    topicDistribution: { "Real Numbers": 60, Polynomials: 60 }, // 120%
  };
  const parseResult5 = paperConfigSchema.safeParse(topicAbove100);
  assert(
    !parseResult5.success,
    "Test 5: Topic total above 100% (120%) fails validation",
    parseResult5.error?.issues[0]?.message
  );

  // 6. Question-type total below 100 (e.g. 30 + 30 + 20 = 80%)
  const qTypeBelow100 = {
    ...validMathConfig,
    questionTypeDistribution: { MCQ: 30, SHORT_ANSWER: 30, LONG_ANSWER: 20 },
  };
  const parseResult6 = paperConfigSchema.safeParse(qTypeBelow100);
  assert(
    !parseResult6.success,
    "Test 6: Question-type total below 100% (80%) fails validation",
    parseResult6.error?.issues[0]?.message
  );

  // 7. Question-type total above 100 (e.g. 50 + 50 + 20 = 120%)
  const qTypeAbove100 = {
    ...validMathConfig,
    questionTypeDistribution: { MCQ: 50, SHORT_ANSWER: 50, LONG_ANSWER: 20 },
  };
  const parseResult7 = paperConfigSchema.safeParse(qTypeAbove100);
  assert(
    !parseResult7.success,
    "Test 7: Question-type total above 100% (120%) fails validation",
    parseResult7.error?.issues[0]?.message
  );

  // 8. Invalid total marks (0, negative, floating point, > 200)
  const zeroMarks = { ...validMathConfig, totalMarks: 0 };
  const negMarks = { ...validMathConfig, totalMarks: -10 };
  const floatMarks = { ...validMathConfig, totalMarks: 40.5 };
  const excessMarks = { ...validMathConfig, totalMarks: 350 };

  assert(
    !paperConfigSchema.safeParse(zeroMarks).success &&
      !paperConfigSchema.safeParse(negMarks).success &&
      !paperConfigSchema.safeParse(floatMarks).success &&
      !paperConfigSchema.safeParse(excessMarks).success,
    "Test 8: Invalid total marks (0, negative, decimal, >200) all fail validation"
  );

  // 9. Empty required values
  const emptyValues = {
    board: "CBSE" as const,
    grade: "CLASS_10" as const,
    subject: undefined,
    totalMarks: undefined,
  };
  const parseResult9 = paperConfigSchema.safeParse(emptyValues);
  assert(
    !parseResult9.success,
    "Test 9: Undefined/empty required values fail validation"
  );

  // 10. Mathematics topic configuration validation (All 14 valid topics)
  const mathDist = getEqualTopicDistribution("MATHEMATICS");
  const mathTopicsPresent = Object.keys(mathDist);
  assert(
    mathTopicsPresent.length === 14 &&
      mathTopicsPresent.every((t) => (MATH_TOPICS as readonly string[]).includes(t)),
    "Test 10a: Mathematics topic configuration includes all 14 official CBSE chapters"
  );

  // Invalid topic for Mathematics (e.g. inserting Science topic into Math config)
  const invalidTopicForMath = {
    ...validMathConfig,
    topicDistribution: { "Electricity": 100 },
  };
  const parseResult10b = paperConfigSchema.safeParse(invalidTopicForMath);
  assert(
    !parseResult10b.success,
    "Test 10b: Cross-subject topic injection (Science topic in Math config) fails validation"
  );

  // 11. Science topic configuration validation (All 13 valid topics)
  const validScienceConfig = {
    board: "CBSE" as const,
    grade: "CLASS_10" as const,
    subject: "SCIENCE" as const,
    totalMarks: 80,
    difficultyDistribution: { EASY: 25, MEDIUM: 50, HARD: 25 },
    topicDistribution: getEqualTopicDistribution("SCIENCE"),
    questionTypeDistribution: { MCQ: 30, SHORT_ANSWER: 45, LONG_ANSWER: 25 },
  };
  const parseResult11 = paperConfigSchema.safeParse(validScienceConfig);
  assert(
    parseResult11.success,
    "Test 11: Valid Science configuration parses successfully with all 13 topics"
  );

  // 12. Equal topic distribution always totals exactly 100% (for both 14 Math topics and 13 Science topics)
  const mathEqual = getEqualTopicDistribution("MATHEMATICS");
  const mathSum = Object.values(mathEqual).reduce((a, b) => a + b, 0);

  const scienceEqual = getEqualTopicDistribution("SCIENCE");
  const scienceSum = Object.values(scienceEqual).reduce((a, b) => a + b, 0);

  assert(
    mathSum === 100 && scienceSum === 100,
    "Test 12: Equal topic distribution algorithm strictly produces sum = 100% for both Math (14 topics) and Science (13 topics)",
    `Math sum: ${mathSum}%, Science sum: ${scienceSum}%`
  );

  console.log(`\n[SUCCESS] All ${passedCount}/${totalTests} configuration tests passed successfully!\n`);
}

runConfigTests().catch((err) => {
  console.error("[FAIL] Configuration test suite failed:", err);
  process.exit(1);
});

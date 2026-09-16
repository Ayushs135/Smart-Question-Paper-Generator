import { generatePaper, validatePaper } from "../lib/generator";
import { getQuestionsBySubject } from "../lib/questions";
import { getEqualTopicDistribution, PaperConfig } from "../types/config";
import { prisma } from "../lib/prisma";

async function testAllPaperSizes() {
  console.log("[TEST] Running Comprehensive Paper Generation Test Suite across 20M, 40M, 50M, 80M, 100M...\n");
  
  const mathQuestions = await getQuestionsBySubject("MATHEMATICS");
  const scienceQuestions = await getQuestionsBySubject("SCIENCE");

  const testConfigs: { name: string; subject: "MATHEMATICS" | "SCIENCE"; marks: number; diff: { EASY: number; MEDIUM: number; HARD: number }; types: { MCQ: number; SHORT_ANSWER: number; LONG_ANSWER: number } }[] = [
    {
      name: "Math 20M (Unit Test / Class Test)",
      subject: "MATHEMATICS",
      marks: 20,
      diff: { EASY: 40, MEDIUM: 40, HARD: 20 },
      types: { MCQ: 40, SHORT_ANSWER: 40, LONG_ANSWER: 20 },
    },
    {
      name: "Math 40M (Periodic Assessment)",
      subject: "MATHEMATICS",
      marks: 40,
      diff: { EASY: 30, MEDIUM: 50, HARD: 20 },
      types: { MCQ: 40, SHORT_ANSWER: 40, LONG_ANSWER: 20 },
    },
    {
      name: "Math 50M (Mid-Term)",
      subject: "MATHEMATICS",
      marks: 50,
      diff: { EASY: 30, MEDIUM: 50, HARD: 20 },
      types: { MCQ: 30, SHORT_ANSWER: 50, LONG_ANSWER: 20 },
    },
    {
      name: "Math 80M (CBSE Board Standard)",
      subject: "MATHEMATICS",
      marks: 80,
      diff: { EASY: 30, MEDIUM: 50, HARD: 20 },
      types: { MCQ: 25, SHORT_ANSWER: 50, LONG_ANSWER: 25 },
    },
    {
      name: "Math 100M (Full Comprehensive)",
      subject: "MATHEMATICS",
      marks: 100,
      diff: { EASY: 30, MEDIUM: 50, HARD: 20 },
      types: { MCQ: 40, SHORT_ANSWER: 40, LONG_ANSWER: 20 },
    },
    {
      name: "Science 20M (Unit Test)",
      subject: "SCIENCE",
      marks: 20,
      diff: { EASY: 40, MEDIUM: 40, HARD: 20 },
      types: { MCQ: 40, SHORT_ANSWER: 40, LONG_ANSWER: 20 },
    },
    {
      name: "Science 40M (Periodic Assessment)",
      subject: "SCIENCE",
      marks: 40,
      diff: { EASY: 30, MEDIUM: 50, HARD: 20 },
      types: { MCQ: 40, SHORT_ANSWER: 40, LONG_ANSWER: 20 },
    },
    {
      name: "Science 50M (Mid-Term)",
      subject: "SCIENCE",
      marks: 50,
      diff: { EASY: 30, MEDIUM: 50, HARD: 20 },
      types: { MCQ: 30, SHORT_ANSWER: 50, LONG_ANSWER: 20 },
    },
    {
      name: "Science 80M (CBSE Board Standard)",
      subject: "SCIENCE",
      marks: 80,
      diff: { EASY: 30, MEDIUM: 50, HARD: 20 },
      types: { MCQ: 25, SHORT_ANSWER: 50, LONG_ANSWER: 25 },
    },
    {
      name: "Science 100M (Full Comprehensive)",
      subject: "SCIENCE",
      marks: 100,
      diff: { EASY: 30, MEDIUM: 50, HARD: 20 },
      types: { MCQ: 40, SHORT_ANSWER: 40, LONG_ANSWER: 20 },
    },
  ];

  let passed = 0;

  for (const tc of testConfigs) {
    const config: PaperConfig = {
      board: "CBSE",
      grade: "CLASS_10",
      subject: tc.subject,
      totalMarks: tc.marks,
      difficultyDistribution: tc.diff,
      questionTypeDistribution: tc.types,
      topicDistribution: getEqualTopicDistribution(tc.subject),
    };

    const pool = tc.subject === "MATHEMATICS" ? mathQuestions : scienceQuestions;
    const t0 = Date.now();
    const result = await generatePaper(config, pool);
    const duration = Date.now() - t0;

    const validation = validatePaper(result.questions, config);

    const hasLA = tc.types.LONG_ANSWER > 0 ? result.actual.sections.sectionC_LongAnswer.length > 0 : true;
    const hasSA = tc.types.SHORT_ANSWER > 0 ? result.actual.sections.sectionB_ShortAnswer.length > 0 : true;
    const hasMCQ = tc.types.MCQ > 0 ? result.actual.sections.sectionA_MCQ.length > 0 : true;

    const isValid =
      validation.isValid &&
      result.actual.totalMarks === tc.marks &&
      validation.duplicateQuestions.length === 0 &&
      hasLA &&
      hasSA &&
      hasMCQ &&
      (result.status === "EXACT" || result.status === "PARTIAL");

    if (isValid) {
      passed++;
      console.log(`[PASS] [PASS] ${tc.name}`);
      console.log(`   Status: ${result.status} | Total Marks: ${result.actual.totalMarks}/${tc.marks} | Questions: ${result.questions.length} (MCQ: ${result.actual.sections.sectionA_MCQ.length}, SA: ${result.actual.sections.sectionB_ShortAnswer.length}, LA: ${result.actual.sections.sectionC_LongAnswer.length}) | Time: ${duration}ms | Dev: [Diff ±${result.deviations.difficulty.totalDeviation.toFixed(1)}M, Type ±${result.deviations.questionTypes.totalDeviation.toFixed(1)}M, Topic ±${result.deviations.topics.totalDeviation.toFixed(1)}M]`);
    } else {
      console.error(`[FAIL] [FAIL] ${tc.name}`);
      console.error(`   Status: ${result.status} | Total Marks: ${result.actual.totalMarks}/${tc.marks} | Valid: ${validation.isValid}`);
      console.error(`   Violations:`, result.violations);
      console.error(`   Validation errors:`, validation);
      throw new Error(`Test failed for ${tc.name}`);
    }
  }

  console.log(`\n[SUCCESS] All ${passed}/${testConfigs.length} paper scale generation tests passed successfully!\n`);
}

testAllPaperSizes()
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

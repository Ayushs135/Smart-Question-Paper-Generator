import { generatePaper, validatePaper } from "../lib/generator";
import { getQuestionsBySubject } from "../lib/questions";
import { getEqualTopicDistribution, PaperConfig } from "../types/config";
import { prisma } from "../lib/prisma";

async function runMarkMixingTests() {
  console.log("[TEST] Starting Phase 9 Mark-Value Mixing & Denomination Diversity Tests...\n");
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

  try {
    const mathQuestions = await getQuestionsBySubject("MATHEMATICS");
    const scienceQuestions = await getQuestionsBySubject("SCIENCE");

    // =========================================================================
    // Test 1: 25-Mark MCQ Section Mixes 1M and 2M Denominations
    // =========================================================================
    const mcq25Config: PaperConfig = {
      board: "CBSE",
      grade: "CLASS_10",
      subject: "MATHEMATICS",
      totalMarks: 25,
      difficultyDistribution: { EASY: 40, MEDIUM: 40, HARD: 20 },
      topicDistribution: getEqualTopicDistribution("MATHEMATICS"),
      questionTypeDistribution: { MCQ: 100, SHORT_ANSWER: 0, LONG_ANSWER: 0 },
    };

    const res1 = await generatePaper(mcq25Config, mathQuestions);
    const mcqCounts = res1.actual.markMix.MCQ;
    const count1M = mcqCounts.find((c) => c.marks === 1)?.questionCount || 0;
    const count2M = mcqCounts.find((c) => c.marks === 2)?.questionCount || 0;
    const marks1M = mcqCounts.find((c) => c.marks === 1)?.totalMarks || 0;
    const marks2M = mcqCounts.find((c) => c.marks === 2)?.totalMarks || 0;

    assert(
      res1.actual.totalMarks === 25 && count1M > 0 && count2M > 0 && marks2M >= 4,
      "Test 1: 25M MCQ paper produces a healthy mixture of 1M and 2M questions (not all 1M)",
      `1M: ${count1M} Qs (${marks1M}M), 2M: ${count2M} Qs (${marks2M}M), Total: ${res1.actual.totalMarks}M`
    );

    // =========================================================================
    // Test 2: Short Answer Section Mixes 2M, 3M, 4M Denominations
    // =========================================================================
    const sa30Config: PaperConfig = {
      board: "CBSE",
      grade: "CLASS_10",
      subject: "MATHEMATICS",
      totalMarks: 30,
      difficultyDistribution: { EASY: 30, MEDIUM: 50, HARD: 20 },
      topicDistribution: getEqualTopicDistribution("MATHEMATICS"),
      questionTypeDistribution: { MCQ: 0, SHORT_ANSWER: 100, LONG_ANSWER: 0 },
    };

    const res2 = await generatePaper(sa30Config, mathQuestions);
    const saCounts = res2.actual.markMix.SHORT_ANSWER;
    const usedDenoms = saCounts.filter((c) => c.questionCount > 0);

    assert(
      res2.actual.totalMarks === 30 && usedDenoms.length >= 2,
      "Test 2: 30M Short Answer paper mixes multiple available denominations (2M, 3M, 4M)",
      `Used denominations: ${saCounts.map((c) => `${c.marks}M: ${c.questionCount} Qs`).join(", ")}`
    );

    // =========================================================================
    // Test 3: Long Answer 30M Exact Section Marks & Regression Test (Prevents 29M Error)
    // =========================================================================
    const la30Config: PaperConfig = {
      board: "CBSE",
      grade: "CLASS_10",
      subject: "MATHEMATICS",
      totalMarks: 30,
      difficultyDistribution: { EASY: 20, MEDIUM: 50, HARD: 30 },
      topicDistribution: getEqualTopicDistribution("MATHEMATICS"),
      questionTypeDistribution: { MCQ: 0, SHORT_ANSWER: 0, LONG_ANSWER: 100 },
    };

    const res3 = await generatePaper(la30Config, mathQuestions);
    const laMarksSum = res3.actual.questionTypes.LONG_ANSWER;
    const questionsSum = res3.questions.reduce((sum, q) => sum + q.marks, 0);

    assert(
      res3.actual.totalMarks === 30 &&
        laMarksSum === 30 &&
        questionsSum === 30 &&
        res3.questions.every((q) => q.type === "LONG_ANSWER"),
      "Test 3: 30M Long Answer paper strictly produces 30M (regression test preventing 29M error)",
      `Total: ${res3.actual.totalMarks}M, LA Marks: ${laMarksSum}M, Questions: ${res3.questions.map((q) => `${q.marks}M`).join("+")} = ${questionsSum}M`
    );

    // =========================================================================
    // Test 4: Long Answer Section Accuracy Across 20M, 25M, 30M, 40M, 50M
    // =========================================================================
    const laScales = [20, 25, 30, 40, 50];
    let allLaScalesValid = true;
    const scaleDetails: string[] = [];

    for (const scale of laScales) {
      const scaleConfig: PaperConfig = {
        board: "CBSE",
        grade: "CLASS_10",
        subject: "MATHEMATICS",
        totalMarks: scale,
        difficultyDistribution: { EASY: 20, MEDIUM: 50, HARD: 30 },
        topicDistribution: getEqualTopicDistribution("MATHEMATICS"),
        questionTypeDistribution: { MCQ: 0, SHORT_ANSWER: 0, LONG_ANSWER: 100 },
      };
      const scaleRes = await generatePaper(scaleConfig, mathQuestions);
      const scaleSum = scaleRes.questions.reduce((sum, q) => sum + q.marks, 0);
      if (scaleRes.actual.totalMarks !== scale || scaleSum !== scale || scaleRes.actual.questionTypes.LONG_ANSWER !== scale) {
        allLaScalesValid = false;
      }
      scaleDetails.push(`${scale}M: ${scaleRes.actual.totalMarks}M (${scaleRes.questions.length} Qs)`);
    }

    assert(
      allLaScalesValid,
      "Test 4: Long Answer sections strictly equal requested marks across 20M, 25M, 30M, 40M, 50M",
      scaleDetails.join(", ")
    );

    // =========================================================================
    // Test 5: Single Denomination Pool Graceful Handling
    // =========================================================================
    const single1MPool = mathQuestions.filter((q) => q.type === "MCQ" && q.marks === 1);
    const singleDenomConfig: PaperConfig = {
      board: "CBSE",
      grade: "CLASS_10",
      subject: "MATHEMATICS",
      totalMarks: 15,
      difficultyDistribution: { EASY: 40, MEDIUM: 40, HARD: 20 },
      topicDistribution: getEqualTopicDistribution("MATHEMATICS"),
      questionTypeDistribution: { MCQ: 100, SHORT_ANSWER: 0, LONG_ANSWER: 0 },
    };

    const res5 = await generatePaper(singleDenomConfig, single1MPool);
    assert(
      res5.actual.totalMarks === 15 && res5.actual.markMix.MCQ.length === 1 && res5.actual.markMix.MCQ[0].marks === 1,
      "Test 5: Generator gracefully handles pools with only single denomination available",
      `Total Marks: ${res5.actual.totalMarks}M, Questions: ${res5.questions.length}x1M`
    );

    // =========================================================================
    // Test 6: Standard 80M Paper contains rich mark-composition breakdown
    // =========================================================================
    const standard80Config: PaperConfig = {
      board: "CBSE",
      grade: "CLASS_10",
      subject: "MATHEMATICS",
      totalMarks: 80,
      difficultyDistribution: { EASY: 30, MEDIUM: 50, HARD: 20 },
      topicDistribution: getEqualTopicDistribution("MATHEMATICS"),
      questionTypeDistribution: { MCQ: 25, SHORT_ANSWER: 50, LONG_ANSWER: 25 },
    };

    const res6 = await generatePaper(standard80Config, mathQuestions);
    const validation6 = validatePaper(res6.questions, standard80Config);

    assert(
      validation6.isValid &&
        res6.actual.totalMarks === 80 &&
        res6.actual.markMix.MCQ.length > 0 &&
        res6.actual.markMix.SHORT_ANSWER.length > 0 &&
        res6.actual.markMix.LONG_ANSWER.length > 0,
      "Test 6: Standard 80M CBSE paper populates full mark-mix diagnostics across all 3 sections",
      `MCQ: ${res6.actual.markMix.MCQ.map((c) => `${c.marks}M(${c.questionCount})`).join(", ")}, SA: ${res6.actual.markMix.SHORT_ANSWER.map((c) => `${c.marks}M(${c.questionCount})`).join(", ")}, LA: ${res6.actual.markMix.LONG_ANSWER.map((c) => `${c.marks}M(${c.questionCount})`).join(", ")}`
    );

    console.log(`\n[SUCCESS] All ${passedCount}/${totalTests} mark-value mixing tests passed successfully!\n`);
  } finally {
    await prisma.$disconnect();
  }
}

runMarkMixingTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

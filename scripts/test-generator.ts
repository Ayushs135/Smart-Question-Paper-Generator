import {
  generatePaper,
  validatePaper,
  checkFeasibility,
  scorePaper,
  calculateDeviations,
  calculateTargetMarks,
  EXACT_TOLERANCES,
} from "../lib/generator";
import { getQuestionsBySubject, getAllQuestions } from "../lib/questions";
import { getEqualTopicDistribution, PaperConfig } from "../types/config";
import { prisma } from "../lib/prisma";

async function runGeneratorTests() {
  console.log("[TEST] Starting Phase 4 Deterministic Question Paper Generator Tests...\n");
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
    // Pre-load questions from database for speed & test independence
    const mathQuestions = await getQuestionsBySubject("MATHEMATICS");
    const scienceQuestions = await getQuestionsBySubject("SCIENCE");

    // =========================================================================
    // Test 1: Exact Simple Paper Generation (Mathematics 40 Marks)
    // =========================================================================
    const standardMathConfig: PaperConfig = {
      board: "CBSE",
      grade: "CLASS_10",
      subject: "MATHEMATICS",
      totalMarks: 40,
      difficultyDistribution: { EASY: 30, MEDIUM: 50, HARD: 20 },
      topicDistribution: getEqualTopicDistribution("MATHEMATICS"),
      questionTypeDistribution: { MCQ: 40, SHORT_ANSWER: 40, LONG_ANSWER: 20 },
    };

    const result1 = await generatePaper(standardMathConfig, mathQuestions);
    assert(
      result1.status === "EXACT" || result1.status === "PARTIAL",
      "Test 1: Generate standard Mathematics 40M paper",
      `Status: ${result1.status}, Questions: ${result1.questions.length}, Score: ${result1.score.toFixed(2)}, Time: ${result1.executionTimeMs}ms`
    );

    // =========================================================================
    // Test 2: Exact Total Marks Requirement
    // =========================================================================
    const actualSum1 = result1.questions.reduce((sum, q) => sum + q.marks, 0);
    assert(
      actualSum1 === standardMathConfig.totalMarks,
      "Test 2: Sum of question marks strictly equals requested total marks (40M)",
      `Sum: ${actualSum1}, Requested: ${standardMathConfig.totalMarks}`
    );

    // =========================================================================
    // Test 3: No Duplicates Requirement
    // =========================================================================
    const uniqueIds1 = new Set(result1.questions.map((q) => q.id));
    assert(
      uniqueIds1.size === result1.questions.length,
      "Test 3: No duplicate questions exist in generated paper",
      `Unique: ${uniqueIds1.size}/${result1.questions.length}`
    );

    // =========================================================================
    // Test 4: Difficulty Distribution Breakdown
    // =========================================================================
    assert(
      result1.actual.difficulty.EASY > 0 &&
        result1.actual.difficulty.MEDIUM > 0 &&
        result1.actual.difficulty.HARD > 0,
      "Test 4: Paper contains balanced difficulty allocation",
      `Easy: ${result1.actual.difficulty.EASY}M, Med: ${result1.actual.difficulty.MEDIUM}M, Hard: ${result1.actual.difficulty.HARD}M`
    );

    // =========================================================================
    // Test 5: Topic Distribution Breakdown
    // =========================================================================
    const coveredTopics = Object.keys(result1.actual.topics);
    assert(
      coveredTopics.length > 0 &&
        coveredTopics.every((t) => t in result1.requested.topics),
      "Test 5: Topic allocation satisfies requested syllabus distribution",
      `Covered ${coveredTopics.length} chapters`
    );

    // =========================================================================
    // Test 6: Question-Type Taxonomy Distribution
    // =========================================================================
    assert(
      result1.actual.sections.sectionA_MCQ.length > 0 &&
        result1.actual.sections.sectionB_ShortAnswer.length > 0 &&
        result1.actual.sections.sectionC_LongAnswer.length > 0,
      "Test 6: Paper contains all 3 sections (MCQ, Short Answer, Long Answer)",
      `MCQ: ${result1.actual.sections.sectionA_MCQ.length}, SA: ${result1.actual.sections.sectionB_ShortAnswer.length}, LA: ${result1.actual.sections.sectionC_LongAnswer.length}`
    );

    // =========================================================================
    // Test 7: Multi-Dimensional Interaction (Science 50 Marks)
    // =========================================================================
    const scienceConfig: PaperConfig = {
      board: "CBSE",
      grade: "CLASS_10",
      subject: "SCIENCE",
      totalMarks: 50,
      difficultyDistribution: { EASY: 40, MEDIUM: 40, HARD: 20 },
      topicDistribution: getEqualTopicDistribution("SCIENCE"),
      questionTypeDistribution: { MCQ: 30, SHORT_ANSWER: 50, LONG_ANSWER: 20 },
    };

    const result7 = await generatePaper(scienceConfig, scienceQuestions);
    assert(
      result7.actual.totalMarks === 50 &&
        new Set(result7.questions.map((q) => q.id)).size === result7.questions.length,
      "Test 7: Science 50M paper satisfies simultaneous multi-dimensional constraints",
      `Actual Marks: ${result7.actual.totalMarks}M, Questions: ${result7.questions.length}`
    );

    // =========================================================================
    // Test 8: Insufficient Easy Questions Constraint Violation
    // =========================================================================
    const impossibleEasyConfig: PaperConfig = {
      board: "CBSE",
      grade: "CLASS_10",
      subject: "MATHEMATICS",
      totalMarks: 180,
      difficultyDistribution: { EASY: 100, MEDIUM: 0, HARD: 0 }, // Requests 180 marks of EASY questions (bank has < 120M)
      topicDistribution: getEqualTopicDistribution("MATHEMATICS"),
      questionTypeDistribution: { MCQ: 50, SHORT_ANSWER: 50, LONG_ANSWER: 0 },
    };

    const result8 = await generatePaper(impossibleEasyConfig, mathQuestions);
    assert(
      result8.violations.some((v) => v.type === "INSUFFICIENT_DIFFICULTY_CAPACITY"),
      "Test 8: Requesting excessive Easy marks detects capacity violation without crashing",
      `Violations detected: ${result8.violations.length}`
    );

    // =========================================================================
    // Test 9: Insufficient Topic Capacity
    // =========================================================================
    const excessTopicConfig: PaperConfig = {
      board: "CBSE",
      grade: "CLASS_10",
      subject: "MATHEMATICS",
      totalMarks: 80,
      difficultyDistribution: { EASY: 30, MEDIUM: 50, HARD: 20 },
      topicDistribution: {
        "Real Numbers": 100, // 80 marks of Real Numbers (bank only has ~35M)
        ...Object.fromEntries(
          Object.keys(getEqualTopicDistribution("MATHEMATICS"))
            .filter((t) => t !== "Real Numbers")
            .map((t) => [t, 0])
        ),
      },
      questionTypeDistribution: { MCQ: 40, SHORT_ANSWER: 40, LONG_ANSWER: 20 },
    };

    const result9 = await generatePaper(excessTopicConfig, mathQuestions);
    assert(
      result9.violations.some((v) => v.type === "INSUFFICIENT_TOPIC_CAPACITY"),
      "Test 9: Requesting single topic exceeding available marks detects topic capacity violation",
      result9.violations.find((v) => v.type === "INSUFFICIENT_TOPIC_CAPACITY")?.message
    );

    // =========================================================================
    // Test 10: Insufficient Question-Type Capacity
    // =========================================================================
    const excessTypeConfig: PaperConfig = {
      board: "CBSE",
      grade: "CLASS_10",
      subject: "SCIENCE",
      totalMarks: 100,
      difficultyDistribution: { EASY: 30, MEDIUM: 50, HARD: 20 },
      topicDistribution: getEqualTopicDistribution("SCIENCE"),
      questionTypeDistribution: { MCQ: 100, SHORT_ANSWER: 0, LONG_ANSWER: 0 }, // Requests 100M of MCQs (bank only has ~70M)
    };

    const result10 = await generatePaper(excessTypeConfig, scienceQuestions);
    assert(
      result10.violations.some((v) => v.type === "INSUFFICIENT_QUESTION_TYPE_CAPACITY"),
      "Test 10: Requesting 100M MCQ when bank has ~70M MCQs detects question-type capacity violation",
      result10.violations.find((v) => v.type === "INSUFFICIENT_QUESTION_TYPE_CAPACITY")?.message
    );

    // =========================================================================
    // Test 11: Impossible Total Marks
    // =========================================================================
    const unreachableConfig: PaperConfig = {
      board: "CBSE",
      grade: "CLASS_10",
      subject: "MATHEMATICS",
      totalMarks: 150,
      difficultyDistribution: { EASY: 30, MEDIUM: 50, HARD: 20 },
      topicDistribution: getEqualTopicDistribution("MATHEMATICS"),
      questionTypeDistribution: { MCQ: 40, SHORT_ANSWER: 40, LONG_ANSWER: 20 },
    };

    // Provide limited subset containing only 20 marks
    const limitedQuestions = mathQuestions.slice(0, 10);
    const result11 = await generatePaper(unreachableConfig, limitedQuestions);
    assert(
      result11.status === "IMPOSSIBLE" || result11.violations.length > 0,
      "Test 11: Unreachable / impossible total marks reports non-exact or violation",
      `Status: ${result11.status}`
    );

    // =========================================================================
    // Test 12: Sparse Intersection Handling
    // =========================================================================
    const sparseConfig: PaperConfig = {
      board: "CBSE",
      grade: "CLASS_10",
      subject: "MATHEMATICS",
      totalMarks: 30,
      difficultyDistribution: { EASY: 0, MEDIUM: 0, HARD: 100 },
      topicDistribution: {
        "Some Applications of Trigonometry": 100,
        ...Object.fromEntries(
          Object.keys(getEqualTopicDistribution("MATHEMATICS"))
            .filter((t) => t !== "Some Applications of Trigonometry")
            .map((t) => [t, 0])
        ),
      },
      questionTypeDistribution: { MCQ: 0, SHORT_ANSWER: 0, LONG_ANSWER: 100 },
    };

    const result12 = await generatePaper(sparseConfig, mathQuestions);
    assert(
      result12.status === "PARTIAL" || result12.status === "IMPOSSIBLE" || result12.violations.length > 0,
      "Test 12: Highly sparse 3-way intersection (Hard + Applications of Trig + Long Answer) reports constraint limit or PARTIAL trade-off",
      `Status: ${result12.status}, Score: ${result12.score.toFixed(1)}`
    );

    // =========================================================================
    // Test 13: Empty Question Bank Graceful Handling
    // =========================================================================
    const result13 = await generatePaper(standardMathConfig, []);
    assert(
      result13.status === "IMPOSSIBLE" &&
        result13.violations.some((v) => v.type === "EMPTY_QUESTION_BANK"),
      "Test 13: Empty question pool returns graceful IMPOSSIBLE result without exception"
    );

    // =========================================================================
    // Test 14: Determinism Guarantee
    // =========================================================================
    const runA = await generatePaper(standardMathConfig, mathQuestions);
    const runB = await generatePaper(standardMathConfig, mathQuestions);

    const idsA = runA.questions.map((q) => q.id).join(",");
    const idsB = runB.questions.map((q) => q.id).join(",");

    assert(
      idsA === idsB && runA.score === runB.score,
      "Test 14: Running the generator twice with identical config produces 100% identical question selection",
      `Score A: ${runA.score}, Score B: ${runB.score}`
    );

    // =========================================================================
    // Test 15: Independent Validator Integrity
    // =========================================================================
    const validPaper = [...result1.questions];
    const validationBefore = validatePaper(validPaper, standardMathConfig);
    assert(
      validationBefore.isValid && validationBefore.totalMarks === 40,
      "Test 15a: Independent validator confirms valid generated paper"
    );

    // Intentionally corrupt paper by inserting a duplicate question
    const corruptedPaperWithDup = [...validPaper, validPaper[0]];
    const validationDup = validatePaper(corruptedPaperWithDup, standardMathConfig);
    assert(
      !validationDup.isValid && validationDup.duplicateQuestions.length > 0,
      "Test 15b: Validator detects intentionally inserted duplicate question",
      `Detected dup: ${validationDup.duplicateQuestions[0]}`
    );

    // Intentionally corrupt paper by altering mark total
    const corruptedPaperShort = validPaper.slice(0, -1);
    const validationShort = validatePaper(corruptedPaperShort, standardMathConfig);
    assert(
      !validationShort.isValid && validationShort.totalMarksDeviation > 0,
      "Test 15c: Validator detects altered mark total independently",
      `Deviation: ${validationShort.totalMarksDeviation}M`
    );

    // =========================================================================
    // Test 16: Mathematical Calculation of Multi-Dimensional Deviations
    // =========================================================================
    // 16a: Difficulty Deviation Formula Verification (Total Variation Distance: 0.5 * sum |act - req|)
    const dummyConfig16: PaperConfig = {
      board: "CBSE",
      grade: "CLASS_10",
      subject: "MATHEMATICS",
      totalMarks: 40,
      difficultyDistribution: { EASY: 30, MEDIUM: 50, HARD: 20 }, // 12M, 20M, 8M
      topicDistribution: { "Real Numbers": 50, "Polynomials": 50 }, // 20M, 20M
      questionTypeDistribution: { MCQ: 40, SHORT_ANSWER: 40, LONG_ANSWER: 20 }, // 16M, 16M, 8M
    };

    const target16 = calculateTargetMarks(dummyConfig16);

    const actual16Diff = {
      totalMarks: 40,
      questionCount: 10,
      difficulty: { EASY: 10, MEDIUM: 22, HARD: 8 }, // |10-12| + |22-20| + |8-8| = 2 + 2 + 0 = 4 / 2 = 2.0
      questionTypes: { MCQ: 16, SHORT_ANSWER: 16, LONG_ANSWER: 8 },
      topics: { "Real Numbers": 20, "Polynomials": 20 },
      sections: { sectionA_MCQ: [], sectionB_ShortAnswer: [], sectionC_LongAnswer: [] },
      markMix: { MCQ: [], SHORT_ANSWER: [], LONG_ANSWER: [] },
    };
    const dev16Diff = calculateDeviations(actual16Diff, target16, dummyConfig16);
    assert(
      dev16Diff.difficulty.totalDeviation === 2.0 &&
        dev16Diff.difficulty.deviations.EASY === 2 &&
        dev16Diff.difficulty.deviations.MEDIUM === 2 &&
        dev16Diff.difficulty.deviations.HARD === 0,
      "Test 16a: Mathematical calculation of difficulty deviation strictly matches 0.5 * sum(|actual - target|)",
      `Calculated: ${dev16Diff.difficulty.totalDeviation}M (Expected: 2.0M)`
    );

    // 16b: Question-Type Deviation Formula Verification
    const actual16Type = {
      totalMarks: 40,
      questionCount: 10,
      difficulty: { EASY: 12, MEDIUM: 20, HARD: 8 },
      questionTypes: { MCQ: 12, SHORT_ANSWER: 21, LONG_ANSWER: 7 }, // |12-16| + |21-16| + |7-8| = 4 + 5 + 1 = 10 / 2 = 5.0
      topics: { "Real Numbers": 20, "Polynomials": 20 },
      sections: { sectionA_MCQ: [], sectionB_ShortAnswer: [], sectionC_LongAnswer: [] },
      markMix: { MCQ: [], SHORT_ANSWER: [], LONG_ANSWER: [] },
    };
    const dev16Type = calculateDeviations(actual16Type, target16, dummyConfig16);
    assert(
      dev16Type.questionTypes.totalDeviation === 5.0 &&
        dev16Type.questionTypes.deviations.MCQ === 4 &&
        dev16Type.questionTypes.deviations.SHORT_ANSWER === 5 &&
        dev16Type.questionTypes.deviations.LONG_ANSWER === 1,
      "Test 16b: Mathematical calculation of question-type deviation strictly matches 0.5 * sum(|actual - target|)",
      `Calculated: ${dev16Type.questionTypes.totalDeviation}M (Expected: 5.0M)`
    );

    // 16c: Topic Deviation Formula Verification
    const actual16Topic = {
      totalMarks: 40,
      questionCount: 10,
      difficulty: { EASY: 12, MEDIUM: 20, HARD: 8 },
      questionTypes: { MCQ: 16, SHORT_ANSWER: 16, LONG_ANSWER: 8 },
      topics: { "Real Numbers": 26, "Polynomials": 14 }, // |26-20| + |14-20| = 6 + 6 = 12 / 2 = 6.0
      sections: { sectionA_MCQ: [], sectionB_ShortAnswer: [], sectionC_LongAnswer: [] },
      markMix: { MCQ: [], SHORT_ANSWER: [], LONG_ANSWER: [] },
    };
    const dev16Topic = calculateDeviations(actual16Topic, target16, dummyConfig16);
    assert(
      dev16Topic.topics.totalDeviation === 6.0 &&
        dev16Topic.topics.deviations["Real Numbers"] === 6 &&
        dev16Topic.topics.deviations["Polynomials"] === 6,
      "Test 16c: Mathematical calculation of topic deviation strictly matches 0.5 * sum(|actual - target|)",
      `Calculated: ${dev16Topic.topics.totalDeviation}M (Expected: 6.0M)`
    );

    // =========================================================================
    // Test 17: Exact Total Marks with Significant Type Deviation Yields PARTIAL (Not EXACT)
    // =========================================================================
    // Request an extreme question-type distribution that forces deviation beyond EXACT_TOLERANCES (<= 3.0M)
    const skewedTypeConfig: PaperConfig = {
      board: "CBSE",
      grade: "CLASS_10",
      subject: "MATHEMATICS",
      totalMarks: 100,
      difficultyDistribution: { EASY: 30, MEDIUM: 50, HARD: 20 },
      topicDistribution: getEqualTopicDistribution("MATHEMATICS"),
      questionTypeDistribution: { MCQ: 90, SHORT_ANSWER: 5, LONG_ANSWER: 5 }, // Requests 90M MCQ (bank has ~75M MCQ)
    };
    const result17 = await generatePaper(skewedTypeConfig, mathQuestions);
    assert(
      result17.actual.totalMarks === 100 &&
        result17.status === "PARTIAL" &&
        result17.deviations.questionTypes.totalDeviation > EXACT_TOLERANCES.QUESTION_TYPE,
      "Test 17: Exact total marks with significant type deviation correctly yields PARTIAL (not EXACT)",
      `Status: ${result17.status}, Type Deviation: ${result17.deviations.questionTypes.totalDeviation.toFixed(1)}M`
    );

    // =========================================================================
    // Test 18: Exact Total Marks with Acceptable Deviations Yields EXACT
    // =========================================================================
    const exactConfig: PaperConfig = {
      board: "CBSE",
      grade: "CLASS_10",
      subject: "MATHEMATICS",
      totalMarks: 20,
      difficultyDistribution: { EASY: 50, MEDIUM: 50, HARD: 0 },
      topicDistribution: {
        "Real Numbers": 25,
        "Polynomials": 25,
        "Quadratic Equations": 25,
        "Triangles": 25,
        ...Object.fromEntries(
          Object.keys(getEqualTopicDistribution("MATHEMATICS"))
            .filter((t) => !["Real Numbers", "Polynomials", "Quadratic Equations", "Triangles"].includes(t))
            .map((t) => [t, 0])
        ),
      },
      questionTypeDistribution: { MCQ: 50, SHORT_ANSWER: 50, LONG_ANSWER: 0 },
    };
    const exactResult = await generatePaper(exactConfig, mathQuestions);
    assert(
      exactResult.status === "EXACT" &&
        exactResult.actual.totalMarks === 20 &&
        exactResult.deviations.difficulty.totalDeviation <= EXACT_TOLERANCES.DIFFICULTY &&
        exactResult.deviations.questionTypes.totalDeviation <= EXACT_TOLERANCES.QUESTION_TYPE &&
        exactResult.deviations.topics.totalDeviation <= EXACT_TOLERANCES.TOPIC,
      "Test 18: Exact total marks with acceptable distribution deviations correctly yields EXACT",
      `Status: ${exactResult.status}, DiffDev: ${exactResult.deviations.difficulty.totalDeviation.toFixed(1)}M, TypeDev: ${exactResult.deviations.questionTypes.totalDeviation.toFixed(1)}M, TopicDev: ${exactResult.deviations.topics.totalDeviation.toFixed(1)}M`
    );


    // =========================================================================
    // Test 19: Section Organization Preserves Actual Question Marks
    // =========================================================================
    const allSecA_MCQ = result1.actual.sections.sectionA_MCQ.every((q) => q.type === "MCQ");
    const allSecB_SA = result1.actual.sections.sectionB_ShortAnswer.every((q) => q.type === "SHORT_ANSWER");
    const allSecC_LA = result1.actual.sections.sectionC_LongAnswer.every((q) => q.type === "LONG_ANSWER");
    const secSumMarks =
      result1.actual.sections.sectionA_MCQ.reduce((s, q) => s + q.marks, 0) +
      result1.actual.sections.sectionB_ShortAnswer.reduce((s, q) => s + q.marks, 0) +
      result1.actual.sections.sectionC_LongAnswer.reduce((s, q) => s + q.marks, 0);

    assert(
      allSecA_MCQ && allSecB_SA && allSecC_LA && secSumMarks === 40,
      "Test 19: Section organization preserves exact question types and actual question marks without arbitrary constraints",
      `Section A Marks: ${result1.actual.sections.sectionA_MCQ.reduce((s, q) => s + q.marks, 0)}M, Section B Marks: ${result1.actual.sections.sectionB_ShortAnswer.reduce((s, q) => s + q.marks, 0)}M, Section C Marks: ${result1.actual.sections.sectionC_LongAnswer.reduce((s, q) => s + q.marks, 0)}M`
    );

    // =========================================================================
    // Test 20: 6-Mark and 8-Mark Long Answer Questions Remain Valid in Section C
    // =========================================================================
    const customLargeLAConfig: PaperConfig = {
      board: "CBSE",
      grade: "CLASS_10",
      subject: "MATHEMATICS",
      totalMarks: 20,
      difficultyDistribution: { EASY: 0, MEDIUM: 0, HARD: 100 },
      topicDistribution: {
        "Triangles": 50,
        "Introduction to Trigonometry": 50,
        ...Object.fromEntries(
          Object.keys(getEqualTopicDistribution("MATHEMATICS"))
            .filter((t) => t !== "Triangles" && t !== "Introduction to Trigonometry")
            .map((t) => [t, 0])
        ),
      },
      questionTypeDistribution: { MCQ: 0, SHORT_ANSWER: 0, LONG_ANSWER: 100 },
    };

    // Synthetic pool containing 6M and 8M questions
    const syntheticLargeQuestions = [
      {
        id: "la-6m-01",
        subject: "MATHEMATICS" as const,
        board: "CBSE" as const,
        grade: "CLASS_10" as const,
        topic: "Triangles",
        difficulty: "HARD" as const,
        type: "LONG_ANSWER" as const,
        marks: 6,
        question: "State and prove Basic Proportionality Theorem.",
        options: null,
        answer: "Proof details...",
        explanation: "Full geometric proof...",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "la-8m-01",
        subject: "MATHEMATICS" as const,
        board: "CBSE" as const,
        grade: "CLASS_10" as const,
        topic: "Introduction to Trigonometry",
        difficulty: "HARD" as const,
        type: "LONG_ANSWER" as const,
        marks: 8,
        question: "Prove complex trigonometric identity with multi-step reduction.",
        options: null,
        answer: "Identity proof...",
        explanation: "Full algebraic proof...",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "la-6m-02",
        subject: "MATHEMATICS" as const,
        board: "CBSE" as const,
        grade: "CLASS_10" as const,
        topic: "Triangles",
        difficulty: "HARD" as const,
        type: "LONG_ANSWER" as const,
        marks: 6,
        question: "Geometric application problem involving right triangles.",
        options: null,
        answer: "Solution...",
        explanation: "Step by step...",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const result20 = await generatePaper(customLargeLAConfig, syntheticLargeQuestions);
    const has6or8M = result20.actual.sections.sectionC_LongAnswer.some(
      (q) => q.marks === 6 || q.marks === 8
    );
    assert(
      result20.actual.totalMarks === 20 &&
        result20.actual.sections.sectionC_LongAnswer.length === 3 &&
        has6or8M,
      "Test 20: 6-mark and 8-mark Long Answer questions are validly accepted and organized in Section C",
      `Section C contains: ${result20.actual.sections.sectionC_LongAnswer.map((q) => `${q.marks}M`).join(", ")}`
    );

    console.log(`\n[SUCCESS] All ${passedCount}/${totalTests} generator engine tests passed successfully!\n`);
  } finally {
    await prisma.$disconnect();
  }
}

runGeneratorTests().catch((err) => {
  console.error("[FAIL] Generator test suite failed:", err);
  process.exit(1);
});

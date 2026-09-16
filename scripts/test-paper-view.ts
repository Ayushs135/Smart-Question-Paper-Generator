import { generatePaper, validatePaper } from "../lib/generator";
import { generatePaperAction } from "../app/generate/actions";
import { getQuestionsBySubject } from "../lib/questions";
import { getEqualTopicDistribution, PaperConfig } from "../types/config";
import { prisma } from "../lib/prisma";

async function runPhase5Tests() {
  console.log("[TEST] Starting Phase 5 Paper Output & Generator Integration Tests...\n");
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

    // =========================================================================
    // Test 1: Standard Generated Paper Structure & Total Marks
    // =========================================================================
    const mathConfig: PaperConfig = {
      board: "CBSE",
      grade: "CLASS_10",
      subject: "MATHEMATICS",
      totalMarks: 40,
      difficultyDistribution: { EASY: 30, MEDIUM: 50, HARD: 20 },
      topicDistribution: getEqualTopicDistribution("MATHEMATICS"),
      questionTypeDistribution: { MCQ: 40, SHORT_ANSWER: 40, LONG_ANSWER: 20 },
    };

    const result1 = await generatePaper(mathConfig, mathQuestions);
    assert(
      result1.actual.totalMarks === 40,
      "Test 1: Generated paper displays the correct total marks (40M)",
      `Total Marks: ${result1.actual.totalMarks}`
    );

    // =========================================================================
    // Test 2: All Generated Questions Rendered & Accounted for in Sections
    // =========================================================================
    const totalSectionQuestions =
      result1.actual.sections.sectionA_MCQ.length +
      result1.actual.sections.sectionB_ShortAnswer.length +
      result1.actual.sections.sectionC_LongAnswer.length;

    assert(
      totalSectionQuestions === result1.questions.length && totalSectionQuestions === result1.actual.questionCount,
      "Test 2: All generated questions are rendered and accounted for across sections",
      `Total rendered: ${totalSectionQuestions}/${result1.questions.length}`
    );

    // =========================================================================
    // Test 3: MCQ Options Render Correctly
    // =========================================================================
    const mcqs = result1.actual.sections.sectionA_MCQ;
    const allMcqsHaveOptions = mcqs.every(
      (q) => q.type === "MCQ" && Array.isArray(q.options) && q.options.length >= 2
    );
    assert(
      mcqs.length > 0 && allMcqsHaveOptions,
      "Test 3: MCQ questions in Section A have valid structured options arrays",
      `MCQ Count: ${mcqs.length}, Options verified on all`
    );

    // =========================================================================
    // Test 4: Question Marks Match Underlying Question Objects
    // =========================================================================
    const calculatedSum = result1.questions.reduce((sum, q) => sum + q.marks, 0);
    const sectionSum =
      result1.actual.sections.sectionA_MCQ.reduce((s, q) => s + q.marks, 0) +
      result1.actual.sections.sectionB_ShortAnswer.reduce((s, q) => s + q.marks, 0) +
      result1.actual.sections.sectionC_LongAnswer.reduce((s, q) => s + q.marks, 0);

    assert(
      calculatedSum === 40 && sectionSum === 40,
      "Test 4: Question marks strictly match underlying question objects across all sections",
      `Questions sum: ${calculatedSum}M, Section sum: ${sectionSum}M`
    );

    // =========================================================================
    // Test 5: Sections are Grouped Strictly by Question Type
    // =========================================================================
    const secAValid = result1.actual.sections.sectionA_MCQ.every((q) => q.type === "MCQ");
    const secBValid = result1.actual.sections.sectionB_ShortAnswer.every((q) => q.type === "SHORT_ANSWER");
    const secCValid = result1.actual.sections.sectionC_LongAnswer.every((q) => q.type === "LONG_ANSWER");

    assert(
      secAValid && secBValid && secCValid,
      "Test 5: Sections are partitioned strictly by question type (Sec A: MCQ, Sec B: Short Answer, Sec C: Long Answer)",
      `Sec A: ${result1.actual.sections.sectionA_MCQ.length} MCQ, Sec B: ${result1.actual.sections.sectionB_ShortAnswer.length} SA, Sec C: ${result1.actual.sections.sectionC_LongAnswer.length} LA`
    );

    // =========================================================================
    // Test 6: 6M and 8M Long Answer Questions Render in Section C
    // =========================================================================
    const largeLAQuestions = [
      {
        id: "test-la-8m",
        subject: "MATHEMATICS" as const,
        board: "CBSE" as const,
        grade: "CLASS_10" as const,
        topic: "Triangles",
        difficulty: "HARD" as const,
        type: "LONG_ANSWER" as const,
        marks: 8,
        question: "Prove that in a right triangle, the square of the hypotenuse is equal to the sum of squares of other two sides.",
        options: null,
        answer: "Pythagoras Theorem Proof",
        explanation: "Geometric step-by-step proof",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "test-la-6m",
        subject: "MATHEMATICS" as const,
        board: "CBSE" as const,
        grade: "CLASS_10" as const,
        topic: "Triangles",
        difficulty: "HARD" as const,
        type: "LONG_ANSWER" as const,
        marks: 6,
        question: "State and prove Thales Theorem.",
        options: null,
        answer: "BPT Proof",
        explanation: "Area comparison method",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const largeLAConfig: PaperConfig = {
      board: "CBSE",
      grade: "CLASS_10",
      subject: "MATHEMATICS",
      totalMarks: 14,
      difficultyDistribution: { EASY: 0, MEDIUM: 0, HARD: 100 },
      topicDistribution: {
        "Triangles": 100,
        ...Object.fromEntries(
          Object.keys(getEqualTopicDistribution("MATHEMATICS"))
            .filter((t) => t !== "Triangles")
            .map((t) => [t, 0])
        ),
      },
      questionTypeDistribution: { MCQ: 0, SHORT_ANSWER: 0, LONG_ANSWER: 100 },
    };

    const resultLargeLA = await generatePaper(largeLAConfig, largeLAQuestions);
    assert(
      resultLargeLA.actual.sections.sectionC_LongAnswer.some((q) => q.marks === 8) &&
        resultLargeLA.actual.sections.sectionC_LongAnswer.some((q) => q.marks === 6),
      "Test 6: 6M and 8M Long Answer questions render accurately in Section C without mark distortion",
      `Section C contains: ${resultLargeLA.actual.sections.sectionC_LongAnswer.map((q) => `${q.marks}M`).join(", ")}`
    );

    // =========================================================================
    // Test 7: EXACT Result Displays Correct Success State & No Violations
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
      exactResult.status === "EXACT" && exactResult.violations.length === 0 && exactResult.explanation.includes("Successfully generated"),
      "Test 7: EXACT result displays correct success state and positive pedagogical explanation",
      `Status: ${exactResult.status}, Violations: ${exactResult.violations.length}`
    );


    // =========================================================================
    // Test 8: PARTIAL Result Displays Trade-off Information
    // =========================================================================
    const partialConfig: PaperConfig = {
      board: "CBSE",
      grade: "CLASS_10",
      subject: "MATHEMATICS",
      totalMarks: 100,
      difficultyDistribution: { EASY: 30, MEDIUM: 50, HARD: 20 },
      topicDistribution: getEqualTopicDistribution("MATHEMATICS"),
      questionTypeDistribution: { MCQ: 90, SHORT_ANSWER: 5, LONG_ANSWER: 5 },
    };
    const resultPartial = await generatePaper(partialConfig, mathQuestions);
    assert(
      resultPartial.status === "PARTIAL" && resultPartial.deviations.questionTypes.totalDeviation > 0,
      "Test 8: PARTIAL result communicates distribution trade-offs clearly",
      `Status: ${resultPartial.status}, Type Deviation: ±${resultPartial.deviations.questionTypes.totalDeviation.toFixed(1)}M`
    );

    // =========================================================================
    // Test 9: IMPOSSIBLE Result Displays Actual Violation Reason
    // =========================================================================
    const impossibleConfig: PaperConfig = {
      board: "CBSE",
      grade: "CLASS_10",
      subject: "MATHEMATICS",
      totalMarks: 180,
      difficultyDistribution: { EASY: 100, MEDIUM: 0, HARD: 0 },
      topicDistribution: getEqualTopicDistribution("MATHEMATICS"),
      questionTypeDistribution: { MCQ: 50, SHORT_ANSWER: 50, LONG_ANSWER: 0 },
    };
    const resultImpossible = await generatePaper(impossibleConfig, mathQuestions);
    const hasCapacityViolation = resultImpossible.violations.some(
      (v) => v.type === "INSUFFICIENT_DIFFICULTY_CAPACITY"
    );
    assert(
      resultImpossible.status === "IMPOSSIBLE" || hasCapacityViolation,
      "Test 9: IMPOSSIBLE result captures and displays actual violation diagnostics",
      `Violations: ${resultImpossible.violations.map((v) => v.type).join(", ")}`
    );

    // =========================================================================
    // Test 10: Regeneration Uses Current Configuration & Is Deterministic
    // =========================================================================
    const run1 = await generatePaperAction(mathConfig);
    const run2 = await generatePaperAction(mathConfig);

    const ids1 = run1.questions.map((q) => q.id).join(",");
    const ids2 = run2.questions.map((q) => q.id).join(",");

    assert(
      ids1 === ids2 && run1.score === run2.score && run1.status === run2.status,
      "Test 10: Regenerate executes via generatePaperAction using current config deterministically",
      `Score 1: ${run1.score.toFixed(2)}, Score 2: ${run2.score.toFixed(2)}`
    );

    // =========================================================================
    // Test 11: Empty/Impossible Results Do Not Crash Server Action or UI Contract
    // =========================================================================
    const emptyResult = await generatePaper(mathConfig, []);
    assert(
      emptyResult.status === "IMPOSSIBLE" &&
        emptyResult.questions.length === 0 &&
        emptyResult.violations.length > 0 &&
        typeof emptyResult.explanation === "string",
      "Test 11: Empty/impossible inputs return graceful structured result without throwing uncaught exceptions",
      `Status: ${emptyResult.status}, Message: ${emptyResult.violations[0]?.message}`
    );

    console.log(`\n[SUCCESS] All ${passedCount}/${totalTests} Phase 5 output & integration tests passed successfully!\n`);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase5Tests().catch((err) => {
  console.error("[FAIL] Phase 5 test suite failed:", err);
  process.exit(1);
});

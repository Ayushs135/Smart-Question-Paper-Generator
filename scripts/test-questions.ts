import {
  getAllQuestions,
  getQuestionsBySubject,
  getQuestionsByTopic,
  getQuestionsByDifficulty,
  getQuestionsByType,
  getQuestionsByMarks,
  getQuestions,
} from "../lib/questions";
import { prisma } from "../lib/prisma";

async function runTests() {
  console.log("[TEST] Starting Question Bank Data Layer & Filter Tests...\n");
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
    // Test 1: Get all CBSE Class 10 questions
    const allQuestions = await getAllQuestions();
    assert(
      allQuestions.length >= 120,
      "Test 1: Get all CBSE Class 10 questions",
      `Found ${allQuestions.length} questions`
    );
    assert(
      allQuestions.every((q) => q.board === "CBSE" && q.grade === "CLASS_10"),
      "Test 1b: All questions match CBSE and CLASS_10 defaults"
    );

    // Test 2: Get all Mathematics questions
    const mathQuestions = await getQuestionsBySubject("MATHEMATICS");
    assert(
      mathQuestions.length >= 60,
      "Test 2: Get all Mathematics questions",
      `Found ${mathQuestions.length} math questions`
    );
    assert(
      mathQuestions.every((q) => q.subject === "MATHEMATICS"),
      "Test 2b: All returned questions have subject=MATHEMATICS"
    );

    // Test 3: Get all Science questions
    const scienceQuestions = await getQuestionsBySubject("SCIENCE");
    assert(
      scienceQuestions.length >= 60,
      "Test 3: Get all Science questions",
      `Found ${scienceQuestions.length} science questions`
    );
    assert(
      scienceQuestions.every((q) => q.subject === "SCIENCE"),
      "Test 3b: All returned questions have subject=SCIENCE"
    );

    // Test 4: Get specific Math topics (Quadratic Equations, Introduction to Trigonometry, Real Numbers)
    const quadQuestions = await getQuestionsByTopic("Quadratic Equations", "MATHEMATICS");
    assert(
      quadQuestions.length > 0 && quadQuestions.every((q) => q.topic === "Quadratic Equations"),
      "Test 4a: Get Quadratic Equations questions",
      `Found ${quadQuestions.length} questions`
    );

    const trigQuestions = await getQuestionsByTopic("Introduction to Trigonometry", "MATHEMATICS");
    assert(
      trigQuestions.length > 0 && trigQuestions.every((q) => q.topic === "Introduction to Trigonometry"),
      "Test 4b: Get Introduction to Trigonometry questions",
      `Found ${trigQuestions.length} questions`
    );

    const realNumQuestions = await getQuestionsByTopic("Real Numbers", "MATHEMATICS");
    assert(
      realNumQuestions.length > 0 && realNumQuestions.every((q) => q.topic === "Real Numbers"),
      "Test 4c: Get Real Numbers questions",
      `Found ${realNumQuestions.length} questions`
    );

    // Test 5: Get specific Science topics (Physics: Electricity, Chemistry: Chemical Reactions, Biology: Life Processes)
    const electricityQuestions = await getQuestionsByTopic("Electricity", "SCIENCE");
    assert(
      electricityQuestions.length > 0 && electricityQuestions.every((q) => q.topic === "Electricity"),
      "Test 5a: Get Physics (Electricity) questions",
      `Found ${electricityQuestions.length} questions`
    );

    const chemReactionsQuestions = await getQuestionsByTopic("Chemical Reactions and Equations", "SCIENCE");
    assert(
      chemReactionsQuestions.length > 0 && chemReactionsQuestions.every((q) => q.topic === "Chemical Reactions and Equations"),
      "Test 5b: Get Chemistry (Chemical Reactions) questions",
      `Found ${chemReactionsQuestions.length} questions`
    );

    const lifeProcessesQuestions = await getQuestionsByTopic("Life Processes", "SCIENCE");
    assert(
      lifeProcessesQuestions.length > 0 && lifeProcessesQuestions.every((q) => q.topic === "Life Processes"),
      "Test 5c: Get Biology (Life Processes) questions",
      `Found ${lifeProcessesQuestions.length} questions`
    );

    // Test 6: Get Hard questions
    const hardQuestions = await getQuestionsByDifficulty("HARD");
    assert(
      hardQuestions.length > 0 && hardQuestions.every((q) => q.difficulty === "HARD"),
      "Test 6: Get Hard questions",
      `Found ${hardQuestions.length} hard questions`
    );

    // Test 7: Get MCQ questions and verify option parsing
    const mcqQuestions = await getQuestionsByType("MCQ");
    assert(
      mcqQuestions.length > 0 && mcqQuestions.every((q) => q.type === "MCQ"),
      "Test 7a: Get MCQ questions",
      `Found ${mcqQuestions.length} MCQ questions`
    );
    assert(
      mcqQuestions.every((q) => Array.isArray(q.options) && q.options.length >= 2),
      "Test 7b: All MCQ questions have hydrated options array with >= 2 options"
    );

    // Test 8: Get 4-mark questions
    const fourMarkQuestions = await getQuestionsByMarks(4);
    assert(
      fourMarkQuestions.length > 0 && fourMarkQuestions.every((q) => q.marks === 4),
      "Test 8: Get 4-mark questions",
      `Found ${fourMarkQuestions.length} 4-mark questions`
    );

    // Test 9: Get questions matching multiple filters simultaneously
    // Target: CBSE + CLASS_10 + MATHEMATICS + Quadratic Equations + MEDIUM + SHORT_ANSWER
    const multiFilterQuestions = await getQuestions({
      board: "CBSE",
      grade: "CLASS_10",
      subject: "MATHEMATICS",
      topic: "Quadratic Equations",
      difficulty: "MEDIUM",
      type: "SHORT_ANSWER",
    });

    assert(
      multiFilterQuestions.length > 0,
      "Test 9a: Get questions matching 6 simultaneous filters",
      `Found ${multiFilterQuestions.length} matching question(s)`
    );

    assert(
      multiFilterQuestions.every(
        (q) =>
          q.board === "CBSE" &&
          q.grade === "CLASS_10" &&
          q.subject === "MATHEMATICS" &&
          q.topic === "Quadratic Equations" &&
          q.difficulty === "MEDIUM" &&
          q.type === "SHORT_ANSWER"
      ),
      "Test 9b: Multi-filter result strictly satisfies all 6 constraints"
    );

    // Test 10: Non-matching filter returns empty array safely
    const emptyResult = await getQuestions({
      subject: "MATHEMATICS",
      topic: "NonExistentTopic12345",
    });
    assert(
      Array.isArray(emptyResult) && emptyResult.length === 0,
      "Test 10: Sparse/empty filter returns empty array gracefully"
    );

    console.log(`\n[SUCCESS] All ${passedCount}/${totalTests} tests passed successfully!\n`);
  } finally {
    await prisma.$disconnect();
  }
}

runTests().catch((err) => {
  console.error("[FAIL] Test run encountered an error:", err);
  process.exit(1);
});

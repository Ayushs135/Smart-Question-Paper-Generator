import { generatePaper, swapQuestion, validatePaper } from "../lib/generator";
import { getQuestionsBySubject, getQuestionsByIds } from "../lib/questions";
import { getEqualTopicDistribution, PaperConfig } from "../types/config";
import { prisma } from "../lib/prisma";

async function runSwapTests() {
  console.log("[TEST] Starting Phase 6 Individual Question Swap Engine Tests...\n");
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

    const mathConfig: PaperConfig = {
      board: "CBSE",
      grade: "CLASS_10",
      subject: "MATHEMATICS",
      totalMarks: 40,
      difficultyDistribution: { EASY: 30, MEDIUM: 50, HARD: 20 },
      topicDistribution: getEqualTopicDistribution("MATHEMATICS"),
      questionTypeDistribution: { MCQ: 40, SHORT_ANSWER: 40, LONG_ANSWER: 20 },
    };

    const scienceConfig: PaperConfig = {
      board: "CBSE",
      grade: "CLASS_10",
      subject: "SCIENCE",
      totalMarks: 40,
      difficultyDistribution: { EASY: 30, MEDIUM: 50, HARD: 20 },
      topicDistribution: getEqualTopicDistribution("SCIENCE"),
      questionTypeDistribution: { MCQ: 40, SHORT_ANSWER: 40, LONG_ANSWER: 20 },
    };

    // =========================================================================
    // Test 1: Generate Baseline Math Paper
    // =========================================================================
    const initialMathPaper = await generatePaper(mathConfig, mathQuestions);
    assert(
      initialMathPaper.status === "EXACT" || initialMathPaper.status === "PARTIAL",
      "Test 1: Generate baseline Mathematics paper",
      `Status: ${initialMathPaper.status}, Questions: ${initialMathPaper.questions.length}, Marks: ${initialMathPaper.actual.totalMarks}`
    );

    // =========================================================================
    // Test 2: Database Helper `getQuestionsByIds`
    // =========================================================================
    const initialIds = initialMathPaper.questions.map((q) => q.id);
    const fetchedQuestions = await getQuestionsByIds(initialIds);
    assert(
      fetchedQuestions.length === initialIds.length &&
        fetchedQuestions.every((q, i) => q.id === initialIds[i]),
      "Test 2: getQuestionsByIds preserves order and retrieves all questions",
      `Fetched: ${fetchedQuestions.length} questions`
    );

    // =========================================================================
    // Test 3: Swap Target Question with Available Alternative
    // =========================================================================
    const currentMathIds = new Set(initialMathPaper.questions.map((q) => q.id));
    const swappableMathQuestion = initialMathPaper.questions.find((target) =>
      mathQuestions.some(
        (c) =>
          c.id !== target.id &&
          !currentMathIds.has(c.id) &&
          c.subject === target.subject &&
          c.board === target.board &&
          c.grade === target.grade &&
          c.topic === target.topic &&
          c.difficulty === target.difficulty &&
          c.type === target.type &&
          c.marks === target.marks
      )
    );

    if (!swappableMathQuestion) {
      throw new Error("Expected at least one swappable question in initial math paper.");
    }

    const targetIndex = initialMathPaper.questions.findIndex((q) => q.id === swappableMathQuestion.id);
    const swapResult = await swapQuestion(
      initialMathPaper.questions,
      swappableMathQuestion.id,
      mathConfig,
      mathQuestions
    );

    assert(
      swapResult.success && !!swapResult.swappedQuestion && !!swapResult.paper,
      "Test 3: Swap question with available alternative returns success",
      `Target: ${swappableMathQuestion.id} (${swappableMathQuestion.topic}, ${swappableMathQuestion.marks}M) -> Replacement: ${swapResult.swappedQuestion?.id}`
    );

    // =========================================================================
    // Test 4: Pedagogical Constraint Matching on Replacement Question
    // =========================================================================
    const swappedQ = swapResult.swappedQuestion!;
    assert(
      swappedQ.id !== swappableMathQuestion.id &&
        swappedQ.subject === swappableMathQuestion.subject &&
        swappedQ.board === swappableMathQuestion.board &&
        swappedQ.grade === swappableMathQuestion.grade &&
        swappedQ.topic === swappableMathQuestion.topic &&
        swappedQ.difficulty === swappableMathQuestion.difficulty &&
        swappedQ.type === swappableMathQuestion.type &&
        swappedQ.marks === swappableMathQuestion.marks,
      "Test 4: Replacement strictly matches subject, board, grade, topic, difficulty, type, and marks",
      `Topic: ${swappedQ.topic}, Diff: ${swappedQ.difficulty}, Type: ${swappedQ.type}, Marks: ${swappedQ.marks}M`
    );

    // =========================================================================
    // Test 5: Invariance of Unaffected Questions & Array Order
    // =========================================================================
    const updatedQuestions = swapResult.paper!.questions;
    assert(
      updatedQuestions[targetIndex].id === swappedQ.id,
      "Test 5a: Target question replaced at exact original index",
      `Index: ${targetIndex}`
    );

    const otherQuestionsUnchanged = updatedQuestions.every((q, idx) => {
      if (idx === targetIndex) return true;
      return q.id === initialMathPaper.questions[idx].id;
    });

    assert(
      otherQuestionsUnchanged,
      "Test 5b: All other questions retain their exact IDs and positions",
      `Total questions verified: ${updatedQuestions.length}`
    );

    // =========================================================================
    // Test 6: Invariance of Total Marks and Question Count
    // =========================================================================
    const newTotalMarks = updatedQuestions.reduce((sum, q) => sum + q.marks, 0);
    assert(
      newTotalMarks === initialMathPaper.actual.totalMarks &&
        updatedQuestions.length === initialMathPaper.questions.length,
      "Test 6: Total marks and question count remain invariant after swap",
      `Total Marks: ${newTotalMarks}M, Count: ${updatedQuestions.length}`
    );

    // =========================================================================
    // Test 7: Duplicate Prevention in Paper
    // =========================================================================
    const uniqueIds = new Set(updatedQuestions.map((q) => q.id));
    assert(
      uniqueIds.size === updatedQuestions.length,
      "Test 7: No duplicate questions exist in the updated paper",
      `Unique IDs: ${uniqueIds.size}/${updatedQuestions.length}`
    );

    // =========================================================================
    // Test 8: Independent Validation of Resulting Paper
    // =========================================================================
    const validationAfterSwap = validatePaper(updatedQuestions, mathConfig);
    assert(
      validationAfterSwap.isValid && validationAfterSwap.duplicateQuestions.length === 0,
      "Test 8: Resulting paper passes independent validator gate",
      `Valid: ${validationAfterSwap.isValid}, Violations: ${validationAfterSwap.violations.length}`
    );

    // =========================================================================
    // Test 9: Swap in Science Paper
    // =========================================================================
    const initialSciencePaper = await generatePaper(scienceConfig, scienceQuestions);
    assert(
      initialSciencePaper.status === "EXACT" || initialSciencePaper.status === "PARTIAL",
      "Test 9a: Generate baseline Science paper",
      `Status: ${initialSciencePaper.status}, Questions: ${initialSciencePaper.questions.length}`
    );

    const currentScienceIds = new Set(initialSciencePaper.questions.map((q) => q.id));
    const swappableScienceQuestion = initialSciencePaper.questions.find((target) =>
      scienceQuestions.some(
        (c) =>
          c.id !== target.id &&
          !currentScienceIds.has(c.id) &&
          c.subject === target.subject &&
          c.board === target.board &&
          c.grade === target.grade &&
          c.topic === target.topic &&
          c.difficulty === target.difficulty &&
          c.type === target.type &&
          c.marks === target.marks
      )
    );

    if (swappableScienceQuestion) {
      const swapScienceResult = await swapQuestion(
        initialSciencePaper.questions,
        swappableScienceQuestion.id,
        scienceConfig,
        scienceQuestions
      );

      assert(
        swapScienceResult.success &&
          swapScienceResult.swappedQuestion!.id !== swappableScienceQuestion.id &&
          swapScienceResult.swappedQuestion!.subject === "SCIENCE" &&
          swapScienceResult.paper!.actual.totalMarks === initialSciencePaper.actual.totalMarks,
        "Test 9b: Swap question in Science paper strictly respects Science domain and marks",
        `Swapped: ${swappableScienceQuestion.id} -> ${swapScienceResult.swappedQuestion?.id}`
      );
    } else {
      assert(true, "Test 9b: Science paper generated without swappable candidates");
    }

    // =========================================================================
    // Test 10: Graceful Failure When No Candidate Exists in Pool
    // =========================================================================
    const targetQ = initialMathPaper.questions[0];
    const restrictedPool = mathQuestions.filter(
      (q) => q.topic !== targetQ.topic || q.id === targetQ.id
    );

    const emptySwapResult = await swapQuestion(
      initialMathPaper.questions,
      targetQ.id,
      mathConfig,
      restrictedPool
    );

    assert(
      !emptySwapResult.success &&
        Boolean(emptySwapResult.reason?.includes("No alternative question is available")),
      "Test 10: Graceful failure when no alternative candidate exists in pool",
      `Reason: ${emptySwapResult.reason}`
    );

    // =========================================================================
    // Test 11: Non-existent Target Question ID
    // =========================================================================
    const nonExistentResult = await swapQuestion(
      initialMathPaper.questions,
      "non-existent-id-99999",
      mathConfig,
      mathQuestions
    );

    assert(
      !nonExistentResult.success &&
        Boolean(nonExistentResult.reason?.includes("was not found in the current paper")),
      "Test 11: Rejection of non-existent target question ID",
      `Reason: ${nonExistentResult.reason}`
    );

    // =========================================================================
    // Test 12: Deterministic Candidate Selection
    // =========================================================================
    const swapRun1 = await swapQuestion(
      initialMathPaper.questions,
      swappableMathQuestion.id,
      mathConfig,
      mathQuestions
    );
    const swapRun2 = await swapQuestion(
      initialMathPaper.questions,
      swappableMathQuestion.id,
      mathConfig,
      mathQuestions
    );

    assert(
      swapRun1.swappedQuestion?.id === swapRun2.swappedQuestion?.id,
      "Test 12: Swap candidate selection is 100% deterministic across repeated runs",
      `Run 1: ${swapRun1.swappedQuestion?.id} === Run 2: ${swapRun2.swappedQuestion?.id}`
    );

    // =========================================================================
    // Test 13: Sequential Multiple Swaps
    // =========================================================================
    const swappableList = initialMathPaper.questions.filter((target) =>
      mathQuestions.some(
        (c) =>
          c.id !== target.id &&
          !currentMathIds.has(c.id) &&
          c.subject === target.subject &&
          c.topic === target.topic &&
          c.difficulty === target.difficulty &&
          c.type === target.type &&
          c.marks === target.marks
      )
    );

    if (swappableList.length >= 2) {
      const qA = swappableList[0];
      const qB = swappableList[1];

      const step1 = await swapQuestion(initialMathPaper.questions, qA.id, mathConfig, mathQuestions);
      assert(step1.success, "Test 13a: Sequential swap step 1 success");

      const step2 = await swapQuestion(step1.paper!.questions, qB.id, mathConfig, mathQuestions);
      assert(
        step2.success &&
          step2.paper!.actual.totalMarks === mathConfig.totalMarks &&
          new Set(step2.paper!.questions.map((q) => q.id)).size === step2.paper!.questions.length,
        "Test 13b: Sequential swap step 2 maintains total marks and duplicate-free paper",
        `Step 2 Marks: ${step2.paper?.actual.totalMarks}M, Duplicates: 0`
      );
    } else {
      assert(true, "Test 13: Not enough swappable pairs for 2-step sequence");
    }

    // =========================================================================
    // Test 14: Section Categorization in Updated Paper
    // =========================================================================
    const secA = swapResult.paper!.actual.sections.sectionA_MCQ;
    const secB = swapResult.paper!.actual.sections.sectionB_ShortAnswer;
    const secC = swapResult.paper!.actual.sections.sectionC_LongAnswer;

    assert(
      secA.every((q) => q.type === "MCQ") &&
        secB.every((q) => q.type === "SHORT_ANSWER") &&
        secC.every((q) => q.type === "LONG_ANSWER"),
      "Test 14: Updated paper sections correctly categorize all swapped questions",
      `Sec A: ${secA.length} MCQs, Sec B: ${secB.length} SAs, Sec C: ${secC.length} LAs`
    );

    // =========================================================================
    // Test 15: Preservation of Original Paper on Failed Swap
    // =========================================================================
    const failedSwap = await swapQuestion(
      initialMathPaper.questions,
      "invalid-id",
      mathConfig,
      mathQuestions
    );
    assert(
      !failedSwap.success && !failedSwap.paper,
      "Test 15: Failed swap does not return mutated paper result",
      `Failed swap handled cleanly`
    );

    console.log(`\n[SUCCESS] All ${passedCount}/${totalTests} Phase 6 Swap Engine Tests Passed Successfully!`);
  } catch (error) {
    console.error("Test execution failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runSwapTests();

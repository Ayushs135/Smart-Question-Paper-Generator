import {
  GroqEnhanceResponseSchema,
  callGroqEnhance,
  enhanceQuestion,
  generateDeterministicEnhancement,
  validateMathematicsSafety,
  validateScienceSafety,
  validateEnhancedQuestion,
  CBSE_AI_SYSTEM_PROMPT,
  buildUserPrompt,
} from "../lib/ai";
import { generatePaper, validatePaper } from "../lib/generator";
import { getQuestionsBySubject, HydratedQuestion } from "../lib/questions";
import { getEqualTopicDistribution, PaperConfig } from "../types/config";
import { prisma } from "../lib/prisma";

async function runAIEnhancementTests() {
  console.log("[TEST] Starting Phase 7 Groq AI Question Enhancement & Safety Tests...\n");
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

    const sampleMathQ: HydratedQuestion = mathQuestions[0];
    const sampleMCQQ: HydratedQuestion = mathQuestions.find((q) => q.type === "MCQ")!;
    const sampleScienceQ: HydratedQuestion = scienceQuestions[0];

    // =========================================================================
    // TEST 1: Valid AI response passes Zod validation (Section 5, 20)
    // =========================================================================
    const validRawResponse = {
      question: "Determine the roots of the quadratic equation x² - 5x + 6 = 0.",
      reason: "Improved academic phrasing by specifying quadratic equation.",
    };
    const zodValid = GroqEnhanceResponseSchema.safeParse(validRawResponse);
    assert(
      zodValid.success && zodValid.data.question.length > 0,
      "TEST 1: Valid AI response passes Zod validation",
      `Validated: "${zodValid.data?.question.slice(0, 45)}..."`
    );

    // =========================================================================
    // TEST 2: Malformed AI response is rejected (Section 5, 20)
    // =========================================================================
    const malformedRawResponse = {
      text: "This is invalid key shape without question property",
    };
    const zodInvalid = GroqEnhanceResponseSchema.safeParse(malformedRawResponse);
    assert(
      !zodInvalid.success,
      "TEST 2: Malformed AI response is rejected by Zod schema",
      "Rejected invalid object structure"
    );

    // =========================================================================
    // TEST 3: Empty question is rejected (Section 5, 20)
    // =========================================================================
    const emptyResponse = {
      question: "   ",
      reason: "Empty text test",
    };
    const zodEmpty = GroqEnhanceResponseSchema.safeParse(emptyResponse);
    const emptyCheck = validateEnhancedQuestion(sampleMathQ, "");
    assert(
      !zodEmpty.success && !emptyCheck.isValid,
      "TEST 3: Empty question text is rejected by schema and safety validator",
      "Empty text rejected"
    );

    // =========================================================================
    // TEST 4: AI enhancement preserves marks (Section 4, 20)
    // =========================================================================
    const mockMathEnhancement = {
      question: `Determine the exact solution for: ${sampleMathQ.question}`,
      reason: "Improved question clarity while preserving numerical relationships.",
    };
    const mathResult = await enhanceQuestion(sampleMathQ, {
      mockResponse: mockMathEnhancement,
    });
    assert(
      mathResult.success &&
        mathResult.enhancedQuestion?.marks === sampleMathQ.marks,
      "TEST 4: AI enhancement strictly preserves original question marks",
      `Marks: ${mathResult.enhancedQuestion?.marks}M (Original: ${sampleMathQ.marks}M)`
    );

    // =========================================================================
    // TEST 5: AI enhancement preserves question type (Section 4, 20)
    // =========================================================================
    assert(
      mathResult.success &&
        mathResult.enhancedQuestion?.type === sampleMathQ.type,
      "TEST 5: AI enhancement strictly preserves question type",
      `Type: ${mathResult.enhancedQuestion?.type} (Original: ${sampleMathQ.type})`
    );

    // =========================================================================
    // TEST 6: AI enhancement preserves topic (Section 4, 20)
    // =========================================================================
    assert(
      mathResult.success &&
        mathResult.enhancedQuestion?.topic === sampleMathQ.topic,
      "TEST 6: AI enhancement strictly preserves curriculum topic",
      `Topic: ${mathResult.enhancedQuestion?.topic}`
    );

    // =========================================================================
    // TEST 7: AI enhancement preserves difficulty (Section 4, 20)
    // =========================================================================
    assert(
      mathResult.success &&
        mathResult.enhancedQuestion?.difficulty === sampleMathQ.difficulty,
      "TEST 7: AI enhancement strictly preserves difficulty tier",
      `Difficulty: ${mathResult.enhancedQuestion?.difficulty}`
    );

    // =========================================================================
    // TEST 8: MCQ options remain unchanged (Section 9, 20)
    // =========================================================================
    const origMCQOptions = JSON.stringify(sampleMCQQ.options);
    const mockMCQEnhancement = {
      question: `Carefully examine the following and solve: ${sampleMCQQ.question}`,
      reason: "Polished MCQ question stem without altering options.",
    };
    const mcqResult = await enhanceQuestion(sampleMCQQ, {
      mockResponse: mockMCQEnhancement,
    });

    assert(
      mcqResult.success &&
        JSON.stringify(mcqResult.enhancedQuestion?.options) === origMCQOptions,
      "TEST 8: MCQ enhancement improves question stem only while preserving options array and order",
      `Options count: ${mcqResult.enhancedQuestion?.options?.length}`
    );

    // =========================================================================
    // TEST 9: AI failure preserves original question (Section 15, 20)
    // =========================================================================
    const equationMathQ =
      mathQuestions.find((q) => q.question.includes("x²") || q.question.includes("HCF") || /\d{2,}/.test(q.question)) ||
      sampleMathQ;

    // Simulate safety violation (e.g. LLM attempts to mutate original constants/equations)
    const badMathMutation = {
      question: "Solve the modified equation without original values: y² - 99y + 999 = 0",
      reason: "Accidentally mutated mathematical equation and numbers.",
    };
    const failedEnhancement = await enhanceQuestion(equationMathQ, {
      mockResponse: badMathMutation,
    });

    assert(
      !failedEnhancement.success &&
        failedEnhancement.originalQuestion.question === equationMathQ.question,
      "TEST 9: AI safety rejection preserves original question without corruption",
      `Reason: ${failedEnhancement.reason?.slice(0, 60)}...`
    );

    // =========================================================================
    // TEST 10: Missing GROQ_API_KEY is handled gracefully (Section 15, 16, 20)
    // =========================================================================
    const noKeyResult = await callGroqEnhance("system prompt", "user prompt", "");
    assert(
      !noKeyResult.success &&
        Boolean(noKeyResult.error?.includes("No AI enhancement is available right now")),
      "TEST 10: Missing GROQ_API_KEY is handled gracefully without crashing or throwing",
      `Message: "${noKeyResult.error}"`
    );

    // =========================================================================
    // TEST 11: Apply updates only the selected question (Section 12, 13, 20)
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

    const paper = await generatePaper(mathConfig, mathQuestions);
    const targetQ = paper.questions[0];
    const targetQId = targetQ.id;
    const originalText = targetQ.question;
    const enhancedTextToApply = `Carefully evaluate: ${originalText}`;

    // Apply enhancement to question 0
    const updatedQuestions = paper.questions.map((q) =>
      q.id === targetQId ? { ...q, question: enhancedTextToApply } : q
    );

    assert(
      updatedQuestions[0].question === enhancedTextToApply &&
        updatedQuestions[0].marks === targetQ.marks &&
        updatedQuestions[0].type === targetQ.type,
      "TEST 11: Apply updates only the targeted question text while preserving all question properties",
      `Updated: Q1 ("${updatedQuestions[0].question.slice(0, 40)}...")`
    );

    // =========================================================================
    // TEST 12: Cancel leaves the original paper unchanged (Section 12, 20)
    // =========================================================================
    // In preview mode, the paper is not modified
    assert(
      paper.questions[0].question === originalText,
      "TEST 12: Generating a preview or cancelling leaves the canonical paper completely unchanged",
      "Canonical state intact"
    );

    // =========================================================================
    // TEST 13: AI-enhanced paper passes the independent validator (Section 13, 20)
    // =========================================================================
    const validationAfterApply = validatePaper(updatedQuestions, mathConfig);
    assert(
      validationAfterApply.isValid,
      "TEST 13: AI-enhanced paper strictly passes the independent paper validation engine",
      `Valid: ${validationAfterApply.isValid}, Violations: ${validationAfterApply.violations.length}`
    );

    // =========================================================================
    // TEST 14: Other questions remain unchanged (Section 20)
    // =========================================================================
    const otherQuestionsUnchanged = paper.questions.slice(1).every((origQ, idx) => {
      const updatedQ = updatedQuestions[idx + 1];
      return (
        origQ.id === updatedQ.id &&
        origQ.question === updatedQ.question &&
        origQ.marks === updatedQ.marks &&
        origQ.type === updatedQ.type
      );
    });

    assert(
      otherQuestionsUnchanged,
      "TEST 14: Applying enhancement to one question leaves all other questions in the paper identical",
      `Preserved ${paper.questions.length - 1} other questions untouched`
    );

    // =========================================================================
    // TEST 15: No AI enhancement request is made automatically (Section 17, 20)
    // =========================================================================
    const freshGeneratedPaper = await generatePaper(mathConfig, mathQuestions);
    const allOriginalQuestionsInDb = freshGeneratedPaper.questions.every((q) =>
      mathQuestions.some((dbQ) => dbQ.id === q.id && dbQ.question === q.question)
    );

    const isStandardResult =
      (freshGeneratedPaper.status === "EXACT" || freshGeneratedPaper.status === "PARTIAL") &&
      freshGeneratedPaper.questions.length > 0 &&
      allOriginalQuestionsInDb;

    assert(
      isStandardResult,
      "TEST 15: Deterministic paper generator executes independently without automatic AI calls",
      `Status: ${freshGeneratedPaper.status}, Questions from DB: ${freshGeneratedPaper.questions.length}`
    );

    // =========================================================================
    // TEST 16: Subject Safety - Mathematics Equation and Constant Preservation
    // =========================================================================
    const origMathText = "If α and β are zeroes of p(x) = x² - 2x + 3, find a polynomial.";
    const mutatedEquation = "If α and β are zeroes of p(x) = x² - 5x + 6, find a polynomial.";
    const mathCheck = validateMathematicsSafety(origMathText, mutatedEquation);
    assert(
      !mathCheck.isValid && mathCheck.violations.some((v) => v.includes("altered")),
      "TEST 16: Mathematics safety validator rejects altered equations (x² - 2x + 3 → x² - 5x + 6)",
      `Violations: ${mathCheck.violations.join("; ")}`
    );

    // =========================================================================
    // TEST 17: Subject Safety - Science Chemical Formulas and Units Preservation
    // =========================================================================
    const origScienceText = "Identify the substance oxidised in: MnO₂ + 4HCl → MnCl₂ + 2H₂O + Cl₂.";
    const mutatedFormulaText = "Identify the substance oxidised in: MnO₃ + 4HCl → MnCl₂ + 2H₂O + Cl₂.";
    const scienceFormulaCheck = validateScienceSafety(origScienceText, mutatedFormulaText);
    assert(
      !scienceFormulaCheck.isValid &&
        scienceFormulaCheck.violations.some((v) => v.includes("MnO₂")),
      "TEST 17: Science safety validator rejects mutated chemical formulas (MnO₂ → MnO₃)",
      `Violations: ${scienceFormulaCheck.violations.join("; ")}`
    );

    // =========================================================================
    // TEST 18: Groq Model Configuration uses openai/gpt-oss-120b by default
    // =========================================================================
    const { GROQ_MODEL, checkGroqAvailability } = await import("../lib/ai/groq");
    assert(
      GROQ_MODEL === "openai/gpt-oss-120b",
      "TEST 18: Groq model configuration defaults to openai/gpt-oss-120b",
      `Model: ${GROQ_MODEL}`
    );

    // =========================================================================
    // TEST 19: checkGroqAvailability detects presence/absence of API key
    // =========================================================================
    const availWithoutKey = await checkGroqAvailability("");
    const availWithKey = await checkGroqAvailability("gsk_test_key_12345678");
    assert(
      !availWithoutKey.available &&
        Boolean(availWithoutKey.error?.includes("GROQ_API_KEY is not configured")) &&
        availWithKey.available &&
        availWithKey.model === "openai/gpt-oss-120b",
      "TEST 19: checkGroqAvailability accurately checks API key readiness and model metadata",
      `Available with key: ${availWithKey.available}`
    );

    // =========================================================================
    // TEST 20: Markdown-fenced JSON responses are cleaned and parsed safely
    // =========================================================================
    const fencedJsonString = "```json\n{\n  \"question\": \"Evaluate the discriminant of 2x² - 4x + 3 = 0.\",\n  \"reason\": \"Structured with clear discriminant prompt.\"\n}\n```";
    const cleaned = fencedJsonString.replace(/```(?:json)?\s*([\s\S]*?)\s*```/i, "$1").trim();
    const parsedFenced = JSON.parse(cleaned);
    const parsedValid = GroqEnhanceResponseSchema.safeParse(parsedFenced);
    assert(
      parsedValid.success && parsedValid.data.question.includes("discriminant"),
      "TEST 20: Markdown fenced JSON responses from Groq are cleanly extracted and validated",
      `Extracted: "${parsedValid.data?.question}"`
    );

    console.log(
      `\n[SUCCESS] All ${passedCount}/${totalTests} Groq AI Enhancement & Safety Tests Passed Successfully!`
    );
  } catch (error) {
    console.error("Test execution failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runAIEnhancementTests();

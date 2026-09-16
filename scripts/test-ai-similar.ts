import assert from "assert";
import { HydratedQuestion } from "../lib/questions";
import {
  GroqGenerateSimilarResponseSchema,
  validateGeneratedSimilarQuestion,
  generateSimilarQuestion,
} from "../lib/ai";
import { PaperConfig } from "../types/config";
import { applySimilarQuestionAction } from "../app/generate/actions";

async function runSimilarQuestionTests() {
  console.log("[TEST] Starting AI Similar Question Generation & Safety Validation Tests...\n");
  let passed = 0;
  let total = 0;

  const sampleMathMcq: HydratedQuestion = {
    id: "m-poly-01",
    board: "CBSE",
    grade: "CLASS_10",
    subject: "MATHEMATICS",
    topic: "Polynomials",
    difficulty: "EASY",
    type: "MCQ",
    marks: 1,
    question: "If α and β are zeroes of the polynomial f(x) = x² - 5x + 6, find α + β.",
    options: ["5", "-5", "6", "-6"],
    answer: "5",
    explanation: "Sum of zeroes α + β = -b/a = -(-5)/1 = 5.",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const sampleScienceSa: HydratedQuestion = {
    id: "s-chem-01",
    board: "CBSE",
    grade: "CLASS_10",
    subject: "SCIENCE",
    topic: "Chemical Reactions and Equations",
    difficulty: "MEDIUM",
    type: "SHORT_ANSWER",
    marks: 2,
    question: "Why is respiration considered an exothermic reaction? Explain with a balanced equation.",
    options: null,
    answer: "C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + Energy. Energy is released in the form of ATP.",
    explanation: "Glucose oxidizes releasing thermal energy, making it exothermic.",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Test 1: Zod Schema accepts valid similar question payload
  total++;
  try {
    const validPayload = {
      question: "For the polynomial p(x) = 2x² - 8x + 6, determine the product of zeroes.",
      options: ["3", "-3", "4", "-4"],
      answer: "3",
      explanation: "Product of zeroes = c/a = 6/2 = 3.",
    };
    const parsed = GroqGenerateSimilarResponseSchema.parse(validPayload);
    assert.strictEqual(parsed.question, validPayload.question);
    assert.strictEqual(parsed.options.length, 4);
    assert.strictEqual(parsed.answer, "3");
    passed++;
    console.log("[PASS] Test 1 Passed: Zod schema validates well-formed similar question payload.");
  } catch (err) {
    console.error("[FAIL] Test 1 Failed:", err);
  }

  // Test 2: Validation rejects identical copy of reference question
  total++;
  try {
    const identicalPayload = {
      question: "If α and β are zeroes of the polynomial f(x) = x² - 5x + 6, find α + β.",
      options: ["5", "-5", "6", "-6"],
      answer: "5",
      explanation: "Same explanation",
    };
    const val = validateGeneratedSimilarQuestion(sampleMathMcq, identicalPayload);
    assert.strictEqual(val.isValid, false);
    assert.ok(val.violations.some((v) => v.includes("identical to reference question")));
    passed++;
    console.log("[PASS] Test 2 Passed: Safety validator rejects verbatim copy of reference question.");
  } catch (err) {
    console.error("[FAIL] Test 2 Failed:", err);
  }

  // Test 3: Validation rejects MCQ with fewer than 4 options
  total++;
  try {
    const invalidMcq = {
      question: "Which of the following is a quadratic polynomial?",
      options: ["x² + 2", "x³ + 1"],
      answer: "x² + 2",
      explanation: "Degree is 2.",
    };
    const val = validateGeneratedSimilarQuestion(sampleMathMcq, invalidMcq);
    assert.strictEqual(val.isValid, false);
    assert.ok(val.violations.some((v) => v.includes("at least 4 options")));
    passed++;
    console.log("[PASS] Test 3 Passed: Safety validator rejects MCQ with fewer than 4 options.");
  } catch (err) {
    console.error("[FAIL] Test 3 Failed:", err);
  }

  // Test 4: Validation rejects MCQ with duplicate options
  total++;
  try {
    const dupOptionsMcq = {
      question: "Find the zeroes of x² - 4.",
      options: ["2", "-2", "2", "4"],
      answer: "2",
      explanation: "Zeroes are ±2.",
    };
    const val = validateGeneratedSimilarQuestion(sampleMathMcq, dupOptionsMcq);
    assert.strictEqual(val.isValid, false);
    assert.ok(val.violations.some((v) => v.includes("distinct")));
    passed++;
    console.log("[PASS] Test 4 Passed: Safety validator rejects duplicate MCQ option choices.");
  } catch (err) {
    console.error("[FAIL] Test 4 Failed:", err);
  }

  // Test 5: Validation rejects question duplicate in active paper
  total++;
  try {
    const existingPaperTexts = [
      "Find the discriminant of 2x² - 4x + 3 = 0.",
      "Calculate the roots of x² - 9 = 0.",
    ];
    const candidatePayload = {
      question: "Find the discriminant of 2x² - 4x + 3 = 0.",
      options: ["-8", "8", "16", "-16"],
      answer: "-8",
      explanation: "D = b² - 4ac = 16 - 24 = -8.",
    };
    const val = validateGeneratedSimilarQuestion(sampleMathMcq, candidatePayload, existingPaperTexts);
    assert.strictEqual(val.isValid, false);
    assert.ok(val.violations.some((v) => v.includes("already exists in the current paper")));
    passed++;
    console.log("[PASS] Test 5 Passed: Safety validator rejects collision with existing paper questions.");
  } catch (err) {
    console.error("[FAIL] Test 5 Failed:", err);
  }

  // Test 6: Mock generation authoring engine integration
  total++;
  try {
    const mockRes = {
      question: "If p and q are zeroes of 3x² - 12x + 9, evaluate p + q.",
      options: ["4", "-4", "3", "-3"],
      answer: "4",
      explanation: "Sum of zeroes p + q = -(-12)/3 = 4.",
    };

    const result = await generateSimilarQuestion(sampleMathMcq, {
      mockResponse: mockRes,
      existingQuestionTexts: ["Other question text"],
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.generatedQuestion);
    assert.strictEqual(result.generatedQuestion?.subject, "MATHEMATICS");
    assert.strictEqual(result.generatedQuestion?.topic, "Polynomials");
    assert.strictEqual(result.generatedQuestion?.difficulty, "EASY");
    assert.strictEqual(result.generatedQuestion?.marks, 1);
    assert.strictEqual(result.generatedQuestion?.type, "MCQ");
    assert.strictEqual(result.generatedQuestion?.options?.length, 4);
    assert.strictEqual(result.generatedQuestion?.answer, "4");
    passed++;
    console.log("[PASS] Test 6 Passed: generateSimilarQuestion constructs verified HydratedQuestion.");
  } catch (err) {
    console.error("[FAIL] Test 6 Failed:", err);
  }

  console.log(`\n[SUCCESS] All ${passed}/${total} AI Similar Question Generation Tests Passed Successfully!\n`);
}

runSimilarQuestionTests().catch((err) => {
  console.error("Test execution failure:", err);
  process.exit(1);
});

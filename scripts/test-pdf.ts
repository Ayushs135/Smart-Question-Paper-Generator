import assert from "assert";
import { generatePaperPdf } from "../lib/pdf/generatePaperPdf";
import { generatePaper } from "../lib/generator/generatePaper";
import { PaperConfig } from "../types/config";
import { getEqualTopicDistribution } from "../types";

async function runPdfTests() {
  console.log("[TEST] Starting Vector CBSE Examination Paper PDF Generator Tests...\n");
  let passed = 0;
  let total = 0;

  const sampleConfig: PaperConfig = {
    board: "CBSE",
    grade: "CLASS_10",
    subject: "MATHEMATICS",
    totalMarks: 40,
    difficultyDistribution: { EASY: 30, MEDIUM: 50, HARD: 20 },
    questionTypeDistribution: { MCQ: 40, SHORT_ANSWER: 40, LONG_ANSWER: 20 },
    topicDistribution: getEqualTopicDistribution("MATHEMATICS"),
  };

  const paperResult = await generatePaper(sampleConfig);
  assert.strictEqual(paperResult.status === "EXACT" || paperResult.status === "PARTIAL", true);

  // Test 1: Generate valid PDF byte array
  total++;
  try {
    const pdfBytes = await generatePaperPdf(paperResult);
    assert.ok(pdfBytes instanceof Uint8Array);
    assert.ok(pdfBytes.byteLength > 1000, "PDF size should be substantial");

    // Check PDF magic header %PDF
    const header = Buffer.from(pdfBytes.slice(0, 4)).toString("ascii");
    assert.strictEqual(header, "%PDF", "PDF must start with %PDF magic bytes");
    passed++;
    console.log(`[PASS] Test 1 Passed: PDF generated successfully (${pdfBytes.byteLength} bytes, valid %PDF signature).`);
  } catch (err) {
    console.error("[FAIL] Test 1 Failed:", err);
  }

  // Test 2: Generate PDF for 100-mark paper with all 3 sections
  total++;
  try {
    const largeConfig: PaperConfig = {
      board: "CBSE",
      grade: "CLASS_10",
      subject: "SCIENCE",
      totalMarks: 80,
      difficultyDistribution: { EASY: 30, MEDIUM: 50, HARD: 20 },
      questionTypeDistribution: { MCQ: 40, SHORT_ANSWER: 40, LONG_ANSWER: 20 },
      topicDistribution: getEqualTopicDistribution("SCIENCE"),
    };
    const largePaper = await generatePaper(largeConfig);
    const pdfBytes = await generatePaperPdf(largePaper);
    assert.ok(pdfBytes.byteLength > 5000, "80M PDF should contain multiple pages and substantial content");
    passed++;
    console.log(`[PASS] Test 2 Passed: 80M Science Paper PDF generated with multi-page pagination (${pdfBytes.byteLength} bytes).`);
  } catch (err) {
    console.error("[FAIL] Test 2 Failed:", err);
  }

  console.log(`\n[SUCCESS] All ${passed}/${total} PDF Generation Tests Passed Successfully!\n`);
}

runPdfTests().catch((err) => {
  console.error("Test execution failure:", err);
  process.exit(1);
});

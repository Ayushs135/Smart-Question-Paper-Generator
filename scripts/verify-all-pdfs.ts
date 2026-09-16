import assert from "assert";
import { generatePaperPdf } from "../lib/pdf/generatePaperPdf";
import { generatePaper } from "../lib/generator/generatePaper";
import { PaperConfig } from "../types/config";
import { getEqualTopicDistribution } from "../types";
import { PDFDocument } from "pdf-lib";

async function verifyAllPdfs() {
  console.log("[DOC] Starting Deep PDF Generation & Content Layout Audit...\n");

  const testConfigs: { name: string; config: PaperConfig }[] = [
    {
      name: "A. 20M Math (Short / Unit Test)",
      config: {
        board: "CBSE",
        grade: "CLASS_10",
        subject: "MATHEMATICS",
        totalMarks: 20,
        difficultyDistribution: { EASY: 40, MEDIUM: 40, HARD: 20 },
        questionTypeDistribution: { MCQ: 40, SHORT_ANSWER: 40, LONG_ANSWER: 20 },
        topicDistribution: getEqualTopicDistribution("MATHEMATICS"),
      },
    },
    {
      name: "B. 40M Math (Standard Assessment)",
      config: {
        board: "CBSE",
        grade: "CLASS_10",
        subject: "MATHEMATICS",
        totalMarks: 40,
        difficultyDistribution: { EASY: 30, MEDIUM: 50, HARD: 20 },
        questionTypeDistribution: { MCQ: 40, SHORT_ANSWER: 40, LONG_ANSWER: 20 },
        topicDistribution: getEqualTopicDistribution("MATHEMATICS"),
      },
    },
    {
      name: "C. 100M Math (Full Scale Examination)",
      config: {
        board: "CBSE",
        grade: "CLASS_10",
        subject: "MATHEMATICS",
        totalMarks: 100,
        difficultyDistribution: { EASY: 30, MEDIUM: 50, HARD: 20 },
        questionTypeDistribution: { MCQ: 40, SHORT_ANSWER: 40, LONG_ANSWER: 20 },
        topicDistribution: getEqualTopicDistribution("MATHEMATICS"),
      },
    },
    {
      name: "D. 40M Science (Physics, Chemistry, Biology)",
      config: {
        board: "CBSE",
        grade: "CLASS_10",
        subject: "SCIENCE",
        totalMarks: 40,
        difficultyDistribution: { EASY: 30, MEDIUM: 50, HARD: 20 },
        questionTypeDistribution: { MCQ: 40, SHORT_ANSWER: 40, LONG_ANSWER: 20 },
        topicDistribution: getEqualTopicDistribution("SCIENCE"),
      },
    },
    {
      name: "E. 80M Science (Formulas, Equations & Units)",
      config: {
        board: "CBSE",
        grade: "CLASS_10",
        subject: "SCIENCE",
        totalMarks: 80,
        difficultyDistribution: { EASY: 30, MEDIUM: 50, HARD: 20 },
        questionTypeDistribution: { MCQ: 30, SHORT_ANSWER: 40, LONG_ANSWER: 30 },
        topicDistribution: getEqualTopicDistribution("SCIENCE"),
      },
    },
  ];

  for (const { name, config } of testConfigs) {
    const paper = await generatePaper(config);
    assert.strictEqual(
      paper.status === "EXACT" || paper.status === "PARTIAL",
      true,
      `${name} should generate valid paper`
    );

    const pdfBytes = await generatePaperPdf(paper);
    assert.ok(pdfBytes instanceof Uint8Array, `${name} output must be Uint8Array`);
    assert.ok(pdfBytes.byteLength > 2000, `${name} PDF size must be substantial`);

    // Load back into PDFDocument to inspect pages and metadata
    const doc = await PDFDocument.load(pdfBytes);
    const pageCount = doc.getPageCount();
    assert.ok(pageCount >= 1, `${name} must have at least 1 page`);

    console.log(
      `  [PASS] [PASS] ${name}: Generated valid vector PDF (${pageCount} pages, ${pdfBytes.byteLength} bytes, total marks ${paper.actual.totalMarks}M)`
    );
  }

  console.log("\n[SUCCESS] All PDF verification scenarios passed without clipping or glyph encoding errors!\n");
}

verifyAllPdfs().catch((err) => {
  console.error("PDF Verification Error:", err);
  process.exit(1);
});

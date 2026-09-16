import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from "pdf-lib";
import { HydratedQuestion } from "@/lib/questions";
import { GenerationResult } from "@/lib/generator/types";

/**
 * Normalizes Unicode math and science symbols into clean, standard WinAnsi-compatible characters
 * for rendering in built-in PDF standard fonts (Times-Roman, Helvetica).
 */
export function sanitizeForPdf(text: string): string {
  if (!text) return "";
  return text
    // Greek letters
    .replace(/π/g, "pi")
    .replace(/θ/g, "theta")
    .replace(/α/g, "alpha")
    .replace(/β/g, "beta")
    .replace(/Δ/g, "Delta")
    .replace(/λ/g, "lambda")
    .replace(/μ/g, "u")
    // Superscripts
    .replace(/¹/g, "^1")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/⁴/g, "^4")
    // Subscripts
    .replace(/₀/g, "0")
    .replace(/₁/g, "1")
    .replace(/₂/g, "2")
    .replace(/₃/g, "3")
    .replace(/₄/g, "4")
    .replace(/₅/g, "5")
    .replace(/₆/g, "6")
    .replace(/₇/g, "7")
    .replace(/₈/g, "8")
    .replace(/₉/g, "9")
    // Math and Science Symbols
    .replace(/√/g, "sqrt")
    .replace(/°C/g, " deg C")
    .replace(/°/g, " deg")
    .replace(/Ω·m/g, " ohm-m")
    .replace(/Ω/g, " ohm")
    .replace(/→/g, " -> ")
    .replace(/⇌/g, " <=> ")
    .replace(/↑/g, " (g)")
    .replace(/↓/g, " (ppt)")
    .replace(/≈/g, "~=")
    .replace(/≤/g, "<=")
    .replace(/≥/g, ">=")
    .replace(/±/g, "+/-")
    .replace(/×/g, " x ")
    .replace(/÷/g, " / ")
    .replace(/•/g, "*")
    .replace(/—/g, " - ")
    .replace(/–/g, "-")
    .replace(/“/g, '"')
    .replace(/”/g, '"')
    .replace(/‘/g, "'")
    .replace(/’/g, "'")
    .replace(/…/g, "...")
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // Zero-width spaces
    // Strip any remaining characters outside WinAnsi / ASCII
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "");
}

/**
 * Splits text into lines that do not exceed maxWidth when rendered with the given font and fontSize.
 */
function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const sanitized = sanitizeForPdf(text);
  const words = sanitized.replace(/\r\n/g, "\n").split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (word.includes("\n")) {
      const parts = word.split("\n");
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const testLine = currentLine ? `${currentLine} ${part}` : part;
        if (part && font.widthOfTextAtSize(testLine, fontSize) <= maxWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = part;
        }
        if (i < parts.length - 1) {
          if (currentLine) lines.push(currentLine);
          currentLine = "";
        }
      }
      continue;
    }

    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Generates an official, clean, vector A4 CBSE Examination Question Paper PDF.
 * - Strictly student-facing (no answers, explanations, internal IDs, or teacher UI controls).
 * - Continuous Q1..Qn numbering across Sections A, B, C.
 * - Right-aligned mark indicators.
 * - Standard A4 dimensions with multi-page automatic pagination and running footers.
 */
export async function generatePaperPdf(result: GenerationResult): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  // Standard high-quality serif and sans-serif built-in fonts
  const fontRegular = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  const PAGE_WIDTH = 595.28; // Standard A4 width in points
  const PAGE_HEIGHT = 841.89; // Standard A4 height in points
  const MARGIN_LEFT = 45;
  const MARGIN_RIGHT = 45;
  const MARGIN_TOP = 45;
  const MARGIN_BOTTOM = 45;
  const USABLE_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

  let currentPage: PDFPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let currentY = PAGE_HEIGHT - MARGIN_TOP;

  const checkPageBreak = (neededSpace: number): void => {
    if (currentY - neededSpace < MARGIN_BOTTOM + 20) {
      currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      currentY = PAGE_HEIGHT - MARGIN_TOP;
    }
  };

  const actual = result.actual;
  const subjectName = result.questions[0]?.subject === "MATHEMATICS" ? "MATHEMATICS (STANDARD)" : "SCIENCE";
  const totalMarks = actual.totalMarks;

  // Approximate exam duration based on CBSE marks scale
  const timeAllowed =
    totalMarks <= 25
      ? "1 Hour"
      : totalMarks <= 40
      ? "1.5 Hours"
      : totalMarks <= 50
      ? "2 Hours"
      : "3 Hours";

  // =========================================================================
  // 1. Examination Document Header
  // =========================================================================
  const title1 = "CLASS X PRACTICE QUESTION PAPER";
  const title2 = "CBSE-STYLE PRACTICE EXAMINATION";
  const title3 = `SUBJECT: ${subjectName}`;

  // Title 1
  const t1Width = fontBold.widthOfTextAtSize(title1, 13);
  currentPage.drawText(title1, {
    x: (PAGE_WIDTH - t1Width) / 2,
    y: currentY,
    size: 13,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  currentY -= 17;

  // Title 2
  const t2Width = fontBold.widthOfTextAtSize(title2, 11);
  currentPage.drawText(title2, {
    x: (PAGE_WIDTH - t2Width) / 2,
    y: currentY,
    size: 11,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.2),
  });
  currentY -= 15;

  // Title 3
  const t3Width = fontBold.widthOfTextAtSize(title3, 11);
  currentPage.drawText(title3, {
    x: (PAGE_WIDTH - t3Width) / 2,
    y: currentY,
    size: 11,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  currentY -= 18;

  // Meta bar: Time Allowed (Left) & Maximum Marks (Right)
  const timeText = `Time Allowed: ${timeAllowed}`;
  const marksText = `Maximum Marks: ${totalMarks}`;
  const marksWidth = fontBold.widthOfTextAtSize(marksText, 10);

  currentPage.drawText(timeText, {
    x: MARGIN_LEFT,
    y: currentY,
    size: 10,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  currentPage.drawText(marksText, {
    x: PAGE_WIDTH - MARGIN_RIGHT - marksWidth,
    y: currentY,
    size: 10,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  currentY -= 8;

  // Horizontal Header Divider
  currentPage.drawLine({
    start: { x: MARGIN_LEFT, y: currentY },
    end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: currentY },
    thickness: 1,
    color: rgb(0.3, 0.3, 0.3),
  });
  currentY -= 14;

  // =========================================================================
  // 2. General Instructions
  // =========================================================================
  currentPage.drawText("General Instructions:", {
    x: MARGIN_LEFT,
    y: currentY,
    size: 9.5,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  currentY -= 12;

  const instructions = [
    "1. This question paper contains three sections: Section A, Section B, and Section C.",
    "2. Section A consists of Multiple Choice Questions (MCQs).",
    "3. Section B consists of Short Answer Type Questions.",
    "4. Section C consists of Long Answer Type Questions.",
    "5. All questions are compulsory. Marks for each question are indicated on the right.",
  ];

  for (const inst of instructions) {
    const instLines = wrapText(inst, fontRegular, 8.5, USABLE_WIDTH - 10);
    for (const line of instLines) {
      currentPage.drawText(line, {
        x: MARGIN_LEFT + 5,
        y: currentY,
        size: 8.5,
        font: fontRegular,
        color: rgb(0.2, 0.2, 0.2),
      });
      currentY -= 11;
    }
  }

  currentY -= 4;
  currentPage.drawLine({
    start: { x: MARGIN_LEFT, y: currentY },
    end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: currentY },
    thickness: 0.75,
    color: rgb(0.5, 0.5, 0.5),
  });
  currentY -= 16;

  // =========================================================================
  // 3. Sections & Question Rendering
  // =========================================================================
  const secA = actual.sections.sectionA_MCQ;
  const secB = actual.sections.sectionB_ShortAnswer;
  const secC = actual.sections.sectionC_LongAnswer;

  let globalQuestionNumber = 1;

  const renderSection = (
    sectionLetter: "A" | "B" | "C",
    sectionTitle: string,
    sectionQuestions: HydratedQuestion[]
  ) => {
    if (sectionQuestions.length === 0) return;

    checkPageBreak(50);

    const sectionTotalMarks = sectionQuestions.reduce((s, q) => s + q.marks, 0);
    const secHeader = `SECTION ${sectionLetter} - ${sectionTitle}`;
    const secSub = `(${sectionQuestions.length} Questions * ${sectionTotalMarks} Marks)`;

    const secHeaderWidth = fontBold.widthOfTextAtSize(secHeader, 10.5);
    currentPage.drawText(secHeader, {
      x: (PAGE_WIDTH - secHeaderWidth) / 2,
      y: currentY,
      size: 10.5,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    currentY -= 12;

    const secSubWidth = fontItalic.widthOfTextAtSize(secSub, 8.5);
    currentPage.drawText(secSub, {
      x: (PAGE_WIDTH - secSubWidth) / 2,
      y: currentY,
      size: 8.5,
      font: fontItalic,
      color: rgb(0.3, 0.3, 0.3),
    });
    currentY -= 14;

    for (const q of sectionQuestions) {
      const qNumStr = `Q${globalQuestionNumber}. `;
      const numWidth = fontBold.widthOfTextAtSize(qNumStr, 9.5);
      const markStr = `[${q.marks}]`;
      const markWidth = fontBold.widthOfTextAtSize(markStr, 9);

      const qTextAvailableWidth = USABLE_WIDTH - numWidth - markWidth - 10;
      const qLines = wrapText(q.question, fontRegular, 9.5, qTextAvailableWidth);

      // Estimate required space for question + MCQ options
      const optCount = q.type === "MCQ" && q.options ? q.options.length : 0;
      const neededSpace = qLines.length * 13 + optCount * 13 + 16;
      checkPageBreak(neededSpace);

      // Render Q Number
      currentPage.drawText(qNumStr, {
        x: MARGIN_LEFT,
        y: currentY,
        size: 9.5,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
      });

      // Render Right-Aligned Marks
      currentPage.drawText(markStr, {
        x: PAGE_WIDTH - MARGIN_RIGHT - markWidth,
        y: currentY,
        size: 9,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.2),
      });

      // Render Question Text Lines
      for (let i = 0; i < qLines.length; i++) {
        currentPage.drawText(qLines[i], {
          x: MARGIN_LEFT + numWidth,
          y: currentY,
          size: 9.5,
          font: fontRegular,
          color: rgb(0.1, 0.1, 0.1),
        });
        currentY -= 13;
      }

      // Render MCQ Options
      if (q.type === "MCQ" && q.options && q.options.length > 0) {
        const optionPrefixes = ["(A)", "(B)", "(C)", "(D)", "(E)", "(F)"];
        currentY -= 2;

        for (let oIdx = 0; oIdx < q.options.length; oIdx++) {
          const optPrefix = `${optionPrefixes[oIdx] || `(${oIdx + 1})`} `;
          const prefixWidth = fontBold.widthOfTextAtSize(optPrefix, 9);
          const optText = q.options[oIdx];
          const optLines = wrapText(optText, fontRegular, 9, USABLE_WIDTH - numWidth - prefixWidth - 15);

          for (let lIdx = 0; lIdx < optLines.length; lIdx++) {
            if (lIdx === 0) {
              currentPage.drawText(optPrefix, {
                x: MARGIN_LEFT + numWidth + 10,
                y: currentY,
                size: 9,
                font: fontBold,
                color: rgb(0.2, 0.2, 0.2),
              });
            }
            currentPage.drawText(optLines[lIdx], {
              x: MARGIN_LEFT + numWidth + 10 + prefixWidth,
              y: currentY,
              size: 9,
              font: fontRegular,
              color: rgb(0.15, 0.15, 0.15),
            });
            currentY -= 12;
          }
        }
      }

      currentY -= 7;
      globalQuestionNumber++;
    }

    currentY -= 10;
  };

  renderSection("A", "MULTIPLE CHOICE QUESTIONS", secA);
  renderSection("B", "SHORT ANSWER QUESTIONS", secB);
  renderSection("C", "LONG ANSWER QUESTIONS", secC);

  // =========================================================================
  // 4. End of Paper Sign-off & Running Footers
  // =========================================================================
  checkPageBreak(30);
  const endSign = "*** END OF QUESTION PAPER ***";
  const endWidth = fontItalic.widthOfTextAtSize(endSign, 9);
  currentPage.drawText(endSign, {
    x: (PAGE_WIDTH - endWidth) / 2,
    y: currentY,
    size: 9,
    font: fontItalic,
    color: rgb(0.4, 0.4, 0.4),
  });

  const totalPages = pdfDoc.getPageCount();
  for (let p = 0; p < totalPages; p++) {
    const page = pdfDoc.getPage(p);
    const footerText = `Page ${p + 1} of ${totalPages}`;
    const footerWidth = fontRegular.widthOfTextAtSize(footerText, 8);

    page.drawText(footerText, {
      x: (PAGE_WIDTH - footerWidth) / 2,
      y: MARGIN_BOTTOM - 20,
      size: 8,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4),
    });
  }

  return await pdfDoc.save();
}

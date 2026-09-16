import { generatePaperPdf } from "./generatePaperPdf";
import { GenerationResult } from "@/lib/generator/types";

/**
 * Client-side trigger to generate and download the clean CBSE Examination Paper as a PDF.
 */
export async function downloadPaperPdf(result: GenerationResult): Promise<void> {
  const pdfBytes = await generatePaperPdf(result);
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const subject = result.questions[0]?.subject || "MATHEMATICS";
  const marks = result.actual.totalMarks || 40;
  link.href = url;
  link.download = `CBSE_Class10_${subject}_${marks}M_Question_Paper.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

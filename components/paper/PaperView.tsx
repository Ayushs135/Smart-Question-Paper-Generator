import React, { useRef, useState } from "react";
import { GenerationResult } from "@/lib/generator/types";
import { HydratedQuestion } from "@/lib/questions";
import { downloadPaperPdf } from "@/lib/pdf/downloadHelper";
import { PaperHeader } from "./PaperHeader";
import { PaperSection } from "./PaperSection";
import { PaperGenerationSummary } from "./PaperGenerationSummary";
import {
  Printer,
  Download,
  Sliders,
  AlertOctagon,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Wand2,
  Sparkles,
} from "lucide-react";

export interface PaperViewProps {
  result: GenerationResult;
  onRegenerate: () => void;
  isRegenerating: boolean;
  onEditConfig?: () => void;
  onSwapQuestion?: (id: string) => void;
  swappingQuestionId?: string | null;
  swapFeedback?: {
    type: "success" | "error";
    message: string;
    fallbackAvailable?: boolean;
    targetQuestionId?: string;
  } | null;
  onDismissSwapFeedback?: () => void;
  onAIEnhance?: (id: string) => void;
  enhancingQuestionId?: string | null;
  previewEnhancement?: { questionId: string; enhancedText: string } | null;
  onApplyEnhancement?: (id: string, newText: string) => void;
  onCancelEnhancement?: (id: string) => void;
  onGenerateSimilar?: (id: string) => void;
  generatingSimilarQuestionId?: string | null;
  previewGeneratedSimilar?: HydratedQuestion | null;
  onApplyGeneratedSimilar?: (id: string, generatedQuestion: HydratedQuestion) => void;
  onCancelGeneratedSimilar?: (id: string) => void;
}

export function PaperView({
  result,
  onRegenerate,
  isRegenerating,
  onEditConfig,
  onSwapQuestion,
  swappingQuestionId,
  swapFeedback,
  onDismissSwapFeedback,
  onAIEnhance,
  enhancingQuestionId,
  previewEnhancement,
  onApplyEnhancement,
  onCancelEnhancement,
  onGenerateSimilar,
  generatingSimilarQuestionId,
  previewGeneratedSimilar,
  onApplyGeneratedSimilar,
  onCancelGeneratedSimilar,
}: PaperViewProps) {
  const paperRef = useRef<HTMLDivElement>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleDownloadPdf = async () => {
    if (isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    try {
      await downloadPaperPdf(result);
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const { status, actual } = result;

  // 1. IMPOSSIBLE Status Rendering (Do not render an empty exam paper)
  if (status === "IMPOSSIBLE" || actual.totalMarks === 0) {
    return (
      <div className="space-y-6">
        <PaperGenerationSummary
          result={result}
          onRegenerate={onRegenerate}
          isRegenerating={isRegenerating}
        />

        <div className="bg-white border-2 border-rose-200 rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <div className="mx-auto w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center border border-rose-200">
            <AlertOctagon className="h-7 w-7 text-rose-600" />
          </div>
          <div className="space-y-2 max-w-lg mx-auto">
            <h3 className="text-lg font-bold text-slate-900">
              Examination Paper Cannot Be Assembled
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              The engine could not assemble a valid paper matching your requested blueprint without violating hard capacity or reachability limits.
            </p>
          </div>

          {onEditConfig && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onEditConfig}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white transition shadow-sm cursor-pointer"
              >
                <Sliders className="h-4 w-4" />
                Adjust Blueprint Configuration
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. Continuous Question Numbering Calculation
  const secAQuestions = actual.sections.sectionA_MCQ;
  const secBQuestions = actual.sections.sectionB_ShortAnswer;
  const secCQuestions = actual.sections.sectionC_LongAnswer;

  const startNumA = 1;
  const startNumB = startNumA + secAQuestions.length;
  const startNumC = startNumB + secBQuestions.length;

  return (
    <div className="space-y-6">
      {/* Generation Engine Summary & Metadata Header */}
      <PaperGenerationSummary
        result={result}
        onRegenerate={onRegenerate}
        isRegenerating={isRegenerating}
      />

      {/* Swap Status Feedback Notification Banner with Smart Fallback */}
      {swapFeedback && (
        <div
          className={`print:hidden rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs border ${
            swapFeedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium">
            {swapFeedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{swapFeedback.message}</span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {swapFeedback.fallbackAvailable && swapFeedback.targetQuestionId && onGenerateSimilar && (
              <button
                type="button"
                onClick={() => onGenerateSimilar(swapFeedback.targetQuestionId!)}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-lg transition shadow-xs cursor-pointer active:scale-95"
              >
                <Wand2 className="h-3.5 w-3.5" />
                Generate Similar with AI
              </button>
            )}

            {!swapFeedback.fallbackAvailable && swapFeedback.targetQuestionId && onAIEnhance && swapFeedback.type === "error" && (
              <button
                type="button"
                onClick={() => onAIEnhance(swapFeedback.targetQuestionId!)}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition shadow-xs cursor-pointer active:scale-95"
              >
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                Try Again
              </button>
            )}

            {onDismissSwapFeedback && (
              <button
                type="button"
                onClick={onDismissSwapFeedback}
                className={`p-1 rounded-lg transition hover:bg-black/5 shrink-0 ${
                  swapFeedback.type === "success" ? "text-emerald-700" : "text-rose-700"
                }`}
                aria-label="Dismiss message"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Action Toolbar (Hidden during Print) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 text-white p-3.5 rounded-2xl shadow-sm print:hidden">
        <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
          <FileText className="h-4 w-4 text-blue-400" />
          <span>CBSE Examination Paper Preview</span>
          <span className="hidden sm:inline text-slate-500">&bull;</span>
          <span className="hidden sm:inline text-slate-400">
            {actual.questionCount} Questions, {actual.totalMarks} Marks
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onEditConfig && (
            <button
              type="button"
              onClick={onEditConfig}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
            >
              <Sliders className="h-3.5 w-3.5" />
              Edit Blueprint
            </button>
          )}

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition shadow-sm cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {isDownloadingPdf ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" />
                Download PDF
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer active:scale-95"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </button>
        </div>
      </div>

      {/* Printable Paper Document Container */}
      <div
        ref={paperRef}
        id="printable-question-paper"
        className="bg-white border border-slate-300 rounded-2xl sm:rounded-3xl p-6 sm:p-10 lg:p-12 shadow-md max-w-4xl mx-auto print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none"
      >
        {/* Formal Exam Paper Header */}
        <PaperHeader
          subject={result.questions[0]?.subject || "MATHEMATICS"}
          totalMarks={actual.totalMarks}
          questionCount={actual.questionCount}
        />

        {/* Section A: Multiple Choice Questions */}
        <PaperSection
          sectionLetter="A"
          title="MULTIPLE CHOICE QUESTIONS"
          description={`Questions ${startNumA} to ${startNumB - 1}. Select the single correct option.`}
          questions={secAQuestions}
          startNumber={startNumA}
          onSwapQuestion={onSwapQuestion}
          swappingQuestionId={swappingQuestionId}
          onAIEnhance={onAIEnhance}
          enhancingQuestionId={enhancingQuestionId}
          previewEnhancement={previewEnhancement}
          onApplyEnhancement={onApplyEnhancement}
          onCancelEnhancement={onCancelEnhancement}
          onGenerateSimilar={onGenerateSimilar}
          generatingSimilarQuestionId={generatingSimilarQuestionId}
          previewGeneratedSimilar={previewGeneratedSimilar}
          onApplyGeneratedSimilar={onApplyGeneratedSimilar}
          onCancelGeneratedSimilar={onCancelGeneratedSimilar}
        />

        {/* Section B: Short Answer Questions */}
        <PaperSection
          sectionLetter="B"
          title="SHORT ANSWER QUESTIONS"
          description={`Questions ${startNumB} to ${startNumC - 1}. Answer in brief with relevant steps.`}
          questions={secBQuestions}
          startNumber={startNumB}
          onSwapQuestion={onSwapQuestion}
          swappingQuestionId={swappingQuestionId}
          onAIEnhance={onAIEnhance}
          enhancingQuestionId={enhancingQuestionId}
          previewEnhancement={previewEnhancement}
          onApplyEnhancement={onApplyEnhancement}
          onCancelEnhancement={onCancelEnhancement}
          onGenerateSimilar={onGenerateSimilar}
          generatingSimilarQuestionId={generatingSimilarQuestionId}
          previewGeneratedSimilar={previewGeneratedSimilar}
          onApplyGeneratedSimilar={onApplyGeneratedSimilar}
          onCancelGeneratedSimilar={onCancelGeneratedSimilar}
        />

        {/* Section C: Long Answer Questions */}
        <PaperSection
          sectionLetter="C"
          title="LONG ANSWER QUESTIONS"
          description={`Questions ${startNumC} to ${actual.questionCount}. Detailed descriptive and numerical solutions with complete steps.`}
          questions={secCQuestions}
          startNumber={startNumC}
          onSwapQuestion={onSwapQuestion}
          swappingQuestionId={swappingQuestionId}
          onAIEnhance={onAIEnhance}
          enhancingQuestionId={enhancingQuestionId}
          previewEnhancement={previewEnhancement}
          onApplyEnhancement={onApplyEnhancement}
          onCancelEnhancement={onCancelEnhancement}
          onGenerateSimilar={onGenerateSimilar}
          generatingSimilarQuestionId={generatingSimilarQuestionId}
          previewGeneratedSimilar={previewGeneratedSimilar}
          onApplyGeneratedSimilar={onApplyGeneratedSimilar}
          onCancelGeneratedSimilar={onCancelGeneratedSimilar}
        />

        {/* End of Examination Paper Sign-off */}
        <div className="text-center pt-8 border-t border-slate-200 text-xs font-serif italic text-slate-500">
          *** END OF QUESTION PAPER ***
        </div>
      </div>
    </div>
  );
}

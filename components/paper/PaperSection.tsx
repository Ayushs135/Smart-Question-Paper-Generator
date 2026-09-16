import React from "react";
import { HydratedQuestion } from "@/lib/questions";
import { PaperQuestion } from "./PaperQuestion";

export interface PaperSectionProps {
  sectionLetter: "A" | "B" | "C";
  title: string;
  description: string;
  questions: HydratedQuestion[];
  startNumber: number;
  onSwapQuestion?: (id: string) => void;
  swappingQuestionId?: string | null;
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

export function PaperSection({
  sectionLetter,
  title,
  description,
  questions,
  startNumber,
  onSwapQuestion,
  swappingQuestionId,
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
}: PaperSectionProps) {
  if (questions.length === 0) {
    return null;
  }

  const sectionTotalMarks = questions.reduce((sum, q) => sum + q.marks, 0);

  return (
    <div className="mb-8 last:mb-0">
      {/* Section Header Divider */}
      <div className="bg-slate-100 border-y border-slate-300 py-2 px-3 mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1 font-serif">
        <div>
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900">
            SECTION {sectionLetter} &mdash; {title}
          </h2>
          <p className="text-[11px] text-slate-600 italic">{description}</p>
        </div>
        <div className="text-xs font-semibold text-slate-700 whitespace-nowrap">
          {questions.length} Questions &bull; {sectionTotalMarks} Marks
        </div>
      </div>

      {/* Questions in Section */}
      <div className="space-y-1">
        {questions.map((question, idx) => (
          <PaperQuestion
            key={question.id}
            questionNumber={startNumber + idx}
            question={question}
            onSwap={onSwapQuestion}
            isSwapping={swappingQuestionId === question.id}
            onAIEnhance={onAIEnhance}
            isAIEnhancing={enhancingQuestionId === question.id}
            previewEnhancedText={
              previewEnhancement?.questionId === question.id ? previewEnhancement.enhancedText : null
            }
            onApplyEnhancement={onApplyEnhancement}
            onCancelEnhancement={onCancelEnhancement}
            onGenerateSimilar={onGenerateSimilar}
            isGeneratingSimilar={generatingSimilarQuestionId === question.id}
            previewGeneratedSimilar={
              previewGeneratedSimilar?.id === question.id ||
              (previewGeneratedSimilar && previewGeneratedSimilar.topic === question.topic && previewGeneratedSimilar.marks === question.marks)
                ? previewGeneratedSimilar
                : null
            }
            onApplyGeneratedSimilar={onApplyGeneratedSimilar}
            onCancelGeneratedSimilar={onCancelGeneratedSimilar}
          />
        ))}
      </div>
    </div>
  );
}

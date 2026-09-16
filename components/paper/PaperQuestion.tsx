import React from "react";
import { HydratedQuestion } from "@/lib/questions";
import { ArrowLeftRight, Loader2, Sparkles, Check, X, Wand2, BookOpen } from "lucide-react";

export interface PaperQuestionProps {
  questionNumber: number;
  question: HydratedQuestion;
  onSwap?: (id: string) => void;
  isSwapping?: boolean;
  onAIEnhance?: (id: string) => void;
  isAIEnhancing?: boolean;
  previewEnhancedText?: string | null;
  onApplyEnhancement?: (id: string, enhancedText: string) => void;
  onCancelEnhancement?: (id: string) => void;
  onGenerateSimilar?: (id: string) => void;
  isGeneratingSimilar?: boolean;
  previewGeneratedSimilar?: HydratedQuestion | null;
  onApplyGeneratedSimilar?: (id: string, generatedQuestion: HydratedQuestion) => void;
  onCancelGeneratedSimilar?: (id: string) => void;
}

export function PaperQuestion({
  questionNumber,
  question,
  onSwap,
  isSwapping = false,
  onAIEnhance,
  isAIEnhancing = false,
  previewEnhancedText = null,
  onApplyEnhancement,
  onCancelEnhancement,
  onGenerateSimilar,
  isGeneratingSimilar = false,
  previewGeneratedSimilar = null,
  onApplyGeneratedSimilar,
  onCancelGeneratedSimilar,
}: PaperQuestionProps) {
  const isMCQ = question.type === "MCQ";
  const markLabel = question.marks === 1 ? "1 Mark" : `${question.marks} Marks`;

  // Letter prefixes for MCQ options
  const optionLetters = ["(A)", "(B)", "(C)", "(D)", "(E)", "(F)"];

  const isBusy = isSwapping || isAIEnhancing || isGeneratingSimilar;

  return (
    <div className="py-3.5 border-b border-slate-100 last:border-b-0 break-inside-avoid">
      <div className="flex items-start justify-between gap-4">
        {/* Question Text with Numbering */}
        <div className="flex-1 space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-slate-900 text-sm sm:text-base font-serif select-none shrink-0">
              Q{questionNumber}.
            </span>
            <p className="text-slate-900 text-sm sm:text-[15px] leading-relaxed font-serif">
              {question.question}
            </p>
          </div>

          {/* MCQ Options Rendering */}
          {isMCQ && question.options && Array.isArray(question.options) && question.options.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-7 pt-1">
              {question.options.map((opt, idx) => (
                <div
                  key={idx}
                  className="flex items-baseline gap-2 text-xs sm:text-sm text-slate-800 font-serif"
                >
                  <span className="font-semibold text-slate-700 select-none">
                    {optionLetters[idx] || `(${idx + 1})`}
                  </span>
                  <span>{opt}</span>
                </div>
              ))}
            </div>
          )}

          {/* AI Enhancement Inline Preview Card */}
          {previewEnhancedText && (
            <div className="print:hidden mt-3 p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                  <span>AI Enhanced Wording (Preview)</span>
                </div>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded">
                  Pending Review
                </span>
              </div>

              <div className="text-slate-900 text-sm font-serif leading-relaxed bg-white p-3 rounded-lg border border-indigo-100 shadow-xs">
                <p>{previewEnhancedText}</p>

                {/* MCQ Options in Preview */}
                {isMCQ && question.options && question.options.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-4 pt-2.5 border-t border-slate-100 mt-2.5">
                    {question.options.map((opt, idx) => (
                      <div key={idx} className="flex items-baseline gap-2 text-xs text-slate-700">
                        <span className="font-semibold text-slate-600">{optionLetters[idx] || `(${idx + 1})`}</span>
                        <span>{opt}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-0.5">
                {onCancelEnhancement && (
                  <button
                    type="button"
                    onClick={() => onCancelEnhancement(question.id)}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </button>
                )}

                {onApplyEnhancement && (
                  <button
                    type="button"
                    onClick={() => onApplyEnhancement(question.id, previewEnhancedText)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition shadow-xs cursor-pointer active:scale-95"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Apply Phrasing
                  </button>
                )}
              </div>
            </div>
          )}

          {/* AI Generated Similar Question Inline Preview Card */}
          {previewGeneratedSimilar && (
            <div className="print:hidden mt-3 p-3.5 rounded-xl border border-purple-200 bg-purple-50/50 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-950">
                  <Wand2 className="h-3.5 w-3.5 text-purple-600" />
                  <span>AI Generated Equivalent Question (Preview)</span>
                </div>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                  New Question
                </span>
              </div>

              <div className="text-slate-900 text-sm font-serif leading-relaxed bg-white p-3 rounded-lg border border-purple-100 shadow-xs space-y-2">
                <p className="font-medium">{previewGeneratedSimilar.question}</p>

                {/* MCQ Options */}
                {previewGeneratedSimilar.type === "MCQ" &&
                  previewGeneratedSimilar.options &&
                  previewGeneratedSimilar.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-4 pt-2 border-t border-slate-100 mt-2">
                      {previewGeneratedSimilar.options.map((opt, idx) => (
                        <div key={idx} className="flex items-baseline gap-2 text-xs text-slate-700">
                          <span className="font-semibold text-slate-600">
                            {optionLetters[idx] || `(${idx + 1})`}
                          </span>
                          <span>{opt}</span>
                        </div>
                      ))}
                    </div>
                  )}

                {/* Model Answer / Solution preview */}
                {previewGeneratedSimilar.answer && (
                  <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 font-sans space-y-1">
                    <div className="font-semibold text-slate-800 flex items-center gap-1">
                      <BookOpen className="h-3 w-3 text-purple-600" />
                      Answer Key:
                    </div>
                    <p className="pl-4 text-slate-700">{previewGeneratedSimilar.answer}</p>
                    {previewGeneratedSimilar.explanation && (
                      <p className="pl-4 text-slate-500 italic">{previewGeneratedSimilar.explanation}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-0.5">
                {onCancelGeneratedSimilar && (
                  <button
                    type="button"
                    onClick={() => onCancelGeneratedSimilar(question.id)}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </button>
                )}

                {onApplyGeneratedSimilar && (
                  <button
                    type="button"
                    onClick={() => onApplyGeneratedSimilar(question.id, previewGeneratedSimilar)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-lg transition shadow-xs cursor-pointer active:scale-95"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Use This Question
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right side: Mark Allocation Pill & Teacher Actions */}
        <div className="shrink-0 flex flex-col sm:flex-row items-end sm:items-center gap-2">
          <span className="inline-block text-xs font-semibold text-slate-700 font-serif bg-slate-100/80 px-2 py-0.5 rounded border border-slate-200">
            [{markLabel}]
          </span>

          <div className="print:hidden flex items-center gap-1.5">
            {/* AI Enhance Button */}
            {onAIEnhance && (
              <button
                type="button"
                onClick={() => onAIEnhance(question.id)}
                disabled={isBusy}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200 px-2 py-0.5 rounded transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="Enhance phrasing with AI while strictly preserving all numbers and formulas"
                aria-label={`AI Enhance Question ${questionNumber}`}
              >
                {isAIEnhancing ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin text-indigo-600" />
                    <span className="text-[10px]">Enhancing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3 text-indigo-600" />
                    <span>AI Enhance</span>
                  </>
                )}
              </button>
            )}

            {/* AI Generate Similar Button */}
            {onGenerateSimilar && (
              <button
                type="button"
                onClick={() => onGenerateSimilar(question.id)}
                disabled={isBusy}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 hover:text-purple-800 bg-purple-50 hover:bg-purple-100/80 border border-purple-200 px-2 py-0.5 rounded transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="Author a brand new curriculum-equivalent question with AI"
                aria-label={`Generate Similar Question for Q${questionNumber}`}
              >
                {isGeneratingSimilar ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin text-purple-600" />
                    <span className="text-[10px]">Authoring...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="h-3 w-3 text-purple-600" />
                    <span>Generate Similar</span>
                  </>
                )}
              </button>
            )}

            {/* Swap Button */}
            {onSwap && (
              <button
                type="button"
                onClick={() => onSwap(question.id)}
                disabled={isBusy}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 px-2 py-0.5 rounded transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="Swap this question with a question bank alternative"
                aria-label={`Swap Question ${questionNumber}`}
              >
                {isSwapping ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                    <span className="text-[10px]">Swapping...</span>
                  </>
                ) : (
                  <>
                    <ArrowLeftRight className="h-3 w-3" />
                    <span>Swap</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

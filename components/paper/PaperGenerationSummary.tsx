import React from "react";
import { GenerationResult, GenerationStatus } from "@/lib/generator/types";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export interface PaperGenerationSummaryProps {
  result: GenerationResult;
  onRegenerate: () => void;
  isRegenerating: boolean;
}

export function PaperGenerationSummary({
  result,
  onRegenerate,
  isRegenerating,
}: PaperGenerationSummaryProps) {
  const [isBreakdownExpanded, setIsBreakdownExpanded] = React.useState(false);
  const { status, actual, requested, deviations, explanation, violations } = result;

  // Status Styling and Badges
  const statusConfig: Record<
    GenerationStatus,
    {
      badgeClass: string;
      icon: React.ReactNode;
      label: string;
      subtext: string;
    }
  > = {
    EXACT: {
      badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-300",
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />,
      label: "Paper Generated Successfully (Exact Match)",
      subtext: "All requested constraints satisfied within optimal discrete tolerances.",
    },
    PARTIAL: {
      badgeClass: "bg-amber-50 text-amber-900 border-amber-300",
      icon: <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />,
      label: "Paper Generated with Constraint Trade-offs",
      subtext: "Total marks satisfied with minor soft-distribution trade-offs across discrete marks.",
    },
    IMPOSSIBLE: {
      badgeClass: "bg-rose-50 text-rose-900 border-rose-300",
      icon: <XCircle className="h-5 w-5 text-rose-600 shrink-0" />,
      label: "Paper Could Not Be Generated",
      subtext: "Requested blueprint conflicts with available question bank capacity or subset-sum limits.",
    },
  };

  const currentStatus = statusConfig[status];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
      {/* Header Bar: Status & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-start gap-3">
          {currentStatus.icon}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                {currentStatus.label}
              </h2>
              <span
                className={`text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${currentStatus.badgeClass}`}
              >
                {status}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              {currentStatus.subtext}
            </p>
          </div>
        </div>

        {/* Regenerate Action Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isRegenerating}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
              isRegenerating
                ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                : "bg-slate-900 hover:bg-slate-800 text-white cursor-pointer active:scale-95"
            }`}
          >
            <RotateCcw className={`h-3.5 w-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
            {isRegenerating ? "Regenerating..." : "Regenerate Paper"}
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      {status !== "IMPOSSIBLE" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          {/* Total Marks */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total Marks
            </span>
            <div className="text-lg sm:text-xl font-extrabold text-slate-900 mt-0.5">
              {actual.totalMarks}{" "}
              <span className="text-xs font-normal text-slate-500">
                / {requested.totalMarks}M
              </span>
            </div>
            <span className="text-[10px] text-emerald-600 font-medium block mt-0.5">
              {deviations.totalMarks === 0 ? "Exact Total Match" : `±${deviations.totalMarks}M Deviation`}
            </span>
          </div>

          {/* Question Count */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Questions
            </span>
            <div className="text-lg sm:text-xl font-extrabold text-slate-900 mt-0.5">
              {actual.questionCount}
            </div>
            <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
              {actual.sections.sectionA_MCQ.length} MCQ &bull; {actual.sections.sectionB_ShortAnswer.length} SA &bull; {actual.sections.sectionC_LongAnswer.length} LA
            </span>
          </div>

          {/* Syllabus Coverage */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Syllabus Coverage
            </span>
            <div className="text-lg sm:text-xl font-extrabold text-slate-900 mt-0.5">
              {Object.keys(actual.topics).length}{" "}
              <span className="text-xs font-normal text-slate-500">Chapters</span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
              Curriculum Aligned
            </span>
          </div>

          {/* Alignment Quality */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Assessment Quality
            </span>
            <div className="text-lg sm:text-xl font-extrabold text-emerald-600 mt-0.5 flex items-center justify-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              {status === "EXACT" ? "Optimal" : "Balanced"}
            </div>
            <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
              CBSE Class 10 Standard
            </span>
          </div>
        </div>
      )}

      {/* Human-Readable Pedagogical Explanation */}
      <div className="text-xs sm:text-sm text-slate-700 bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 leading-relaxed">
        <span className="font-semibold text-slate-900 mr-1.5">Assessment Summary:</span>
        {explanation}
      </div>

      {/* Constraint Violations (if any) */}
      {violations.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-2">
          <p className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
            Constraint Diagnostics:
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs text-rose-800">
            {violations.map((v, i) => (
              <li key={i}>{v.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Expandable Breakdown Drawer */}
      {status !== "IMPOSSIBLE" && (
        <div>
          <button
            type="button"
            onClick={() => setIsBreakdownExpanded(!isBreakdownExpanded)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
          >
            {isBreakdownExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {isBreakdownExpanded ? "Hide Detailed Breakdown" : "View Detailed Target vs Actual Breakdown"}
          </button>

          {isBreakdownExpanded && (
            <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              {/* Difficulty Breakdown */}
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 block">Difficulty Distribution</span>
                <div className="space-y-1 text-slate-600">
                  <div className="flex justify-between">
                    <span>Easy ({requested.difficulty.EASY.toFixed(0)}M req):</span>
                    <span className="font-semibold text-slate-900">
                      {actual.difficulty.EASY}M ({deviations.difficulty.deviations.EASY === 0 ? "exact" : `±${deviations.difficulty.deviations.EASY}M`})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Medium ({requested.difficulty.MEDIUM.toFixed(0)}M req):</span>
                    <span className="font-semibold text-slate-900">
                      {actual.difficulty.MEDIUM}M ({deviations.difficulty.deviations.MEDIUM === 0 ? "exact" : `±${deviations.difficulty.deviations.MEDIUM}M`})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Hard ({requested.difficulty.HARD.toFixed(0)}M req):</span>
                    <span className="font-semibold text-slate-900">
                      {actual.difficulty.HARD}M ({deviations.difficulty.deviations.HARD === 0 ? "exact" : `±${deviations.difficulty.deviations.HARD}M`})
                    </span>
                  </div>
                </div>
              </div>

              {/* Question Types Breakdown */}
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 block">Question Taxonomy</span>
                <div className="space-y-1 text-slate-600">
                  <div className="flex justify-between">
                    <span>MCQ ({requested.questionTypes.MCQ.toFixed(0)}M req):</span>
                    <span className="font-semibold text-slate-900">
                      {actual.questionTypes.MCQ}M ({actual.sections.sectionA_MCQ.length} Qs)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Short Answer ({requested.questionTypes.SHORT_ANSWER.toFixed(0)}M req):</span>
                    <span className="font-semibold text-slate-900">
                      {actual.questionTypes.SHORT_ANSWER}M ({actual.sections.sectionB_ShortAnswer.length} Qs)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Long Answer ({requested.questionTypes.LONG_ANSWER.toFixed(0)}M req):</span>
                    <span className="font-semibold text-slate-900">
                      {actual.questionTypes.LONG_ANSWER}M ({actual.sections.sectionC_LongAnswer.length} Qs)
                    </span>
                  </div>
                </div>
              </div>

              {/* Topic Coverage */}
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 block">Curriculum Chapters</span>
                <p className="text-slate-600">
                  Total {Object.keys(actual.topics).length} chapters covered in generated paper.
                </p>
                <div className="max-h-28 overflow-y-auto space-y-0.5 pr-1 text-[11px]">
                  {Object.entries(actual.topics).map(([topic, marks]) => (
                    <div key={topic} className="flex justify-between text-slate-600">
                      <span className="truncate max-w-[150px]">{topic}:</span>
                      <span className="font-medium text-slate-900">{marks}M</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import React from "react";
import { PaperConfig } from "@/types/config";
import {
  CheckCircle2,
  X,
  FileText,
  PieChart,
  Layers,
  BookOpen,
  Sliders,
  Sparkles,
  Copy,
  Check,
} from "lucide-react";

interface BlueprintSummaryModalProps {
  config: PaperConfig;
  isOpen: boolean;
  onClose: () => void;
}

export function BlueprintSummaryModal({
  config,
  isOpen,
  onClose,
}: BlueprintSummaryModalProps) {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeTopics = Object.entries(config.topicDistribution).filter(
    ([_, pct]) => pct > 0
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h2 id="modal-title" className="text-xl font-bold text-slate-900">
                Blueprint Configuration Validated
              </h2>
              <p className="text-xs text-slate-500">
                {config.board} &bull; Class 10 &bull; {config.subject} &bull; {config.totalMarks} Marks
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
            aria-label="Close summary modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 flex-1">
          {/* Blueprint Status Alert */}
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-xs text-blue-800 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-blue-900 text-sm">
              <Sparkles className="h-4 w-4 text-blue-600" />
              Blueprint Verification Successful
            </div>
            <p className="leading-relaxed">
              The blueprint configuration has been mathematically verified across all 100% distribution constraints (Difficulty, Question Types, and Topic Weightage) and is ready for question paper synthesis.
            </p>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-500 font-medium">Subject</p>
              <p className="text-base font-bold text-slate-900 mt-0.5">
                {config.subject === "MATHEMATICS" ? "Mathematics" : "Science"}
              </p>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-500 font-medium">Total Marks</p>
              <p className="text-base font-bold text-blue-600 mt-0.5">
                {config.totalMarks} Marks
              </p>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-500 font-medium">Active Topics</p>
              <p className="text-base font-bold text-emerald-600 mt-0.5">
                {activeTopics.length} Chapters
              </p>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-500 font-medium">Target Standard</p>
              <p className="text-base font-bold text-slate-900 mt-0.5">
                CBSE Class 10
              </p>
            </div>
          </div>

          {/* Breakdown Section: Difficulty & Question Types */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Difficulty Breakdown */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <PieChart className="h-4 w-4 text-indigo-600" />
                Difficulty Distribution
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Easy</span>
                  <span className="font-semibold text-slate-900">
                    {config.difficultyDistribution.EASY}% &bull;{" "}
                    {((config.difficultyDistribution.EASY / 100) * config.totalMarks).toFixed(1)} marks
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Medium</span>
                  <span className="font-semibold text-slate-900">
                    {config.difficultyDistribution.MEDIUM}% &bull;{" "}
                    {((config.difficultyDistribution.MEDIUM / 100) * config.totalMarks).toFixed(1)} marks
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-600 font-medium">Hard</span>
                  <span className="font-semibold text-slate-900">
                    {config.difficultyDistribution.HARD}% &bull;{" "}
                    {((config.difficultyDistribution.HARD / 100) * config.totalMarks).toFixed(1)} marks
                  </span>
                </div>
              </div>
            </div>

            {/* Question Type Breakdown */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Layers className="h-4 w-4 text-purple-600" />
                Question Taxonomy Distribution
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Multiple Choice (MCQ)</span>
                  <span className="font-semibold text-slate-900">
                    {config.questionTypeDistribution.MCQ}% &bull;{" "}
                    {((config.questionTypeDistribution.MCQ / 100) * config.totalMarks).toFixed(1)} marks
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Short Answer</span>
                  <span className="font-semibold text-slate-900">
                    {config.questionTypeDistribution.SHORT_ANSWER}% &bull;{" "}
                    {((config.questionTypeDistribution.SHORT_ANSWER / 100) * config.totalMarks).toFixed(1)} marks
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-600 font-medium">Long Answer</span>
                  <span className="font-semibold text-slate-900">
                    {config.questionTypeDistribution.LONG_ANSWER}% &bull;{" "}
                    {((config.questionTypeDistribution.LONG_ANSWER / 100) * config.totalMarks).toFixed(1)} marks
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Topic Weightage Table */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <BookOpen className="h-4 w-4 text-amber-600" />
                Configured Topic Allocations ({activeTopics.length} Chapters)
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Total: 100%
              </span>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-2">
              {activeTopics.map(([topic, pct]) => {
                const marks = ((pct / 100) * config.totalMarks).toFixed(1);
                return (
                  <div
                    key={topic}
                    className="flex justify-between items-center py-1.5 px-2.5 rounded-lg bg-slate-50 text-xs"
                  >
                    <span className="font-medium text-slate-700">{topic}</span>
                    <span className="font-semibold text-slate-900">
                      {pct}% ({marks} marks)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Technical JSON Inspector */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-950 text-slate-200">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs">
              <span className="font-mono text-slate-400">Validated Blueprint JSON Object</span>
              <button
                onClick={handleCopyJson}
                className="inline-flex items-center gap-1 text-slate-300 hover:text-white transition"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy JSON</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 text-xs font-mono max-h-40 overflow-y-auto text-emerald-400">
              {JSON.stringify(config, null, 2)}
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500 text-center sm:text-left">
            Ready for synthesis &bull; Calibrated for CBSE Class 10 examination standards.
          </p>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-xs"
          >
            Done / Modify Configuration
          </button>
        </div>
      </div>
    </div>
  );
}

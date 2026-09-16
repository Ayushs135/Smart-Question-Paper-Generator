"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  SubjectType,
  MATH_TOPICS,
  SCIENCE_TOPICS,
  PaperConfig,
  paperConfigSchema,
  getEqualTopicDistribution,
  getEmptyTopicDistribution,
  DEFAULT_PAPER_CONFIG,
} from "@/types";
import { DistributionProgress } from "./DistributionProgress";
import { BlueprintSummaryModal } from "./BlueprintSummaryModal";
import { PaperView } from "./paper/PaperView";
import {
  generatePaperAction,
  swapQuestionAction,
  enhanceQuestionAction,
  applyQuestionEnhancementAction,
  generateSimilarQuestionAction,
  applySimilarQuestionAction,
} from "@/app/generate/actions";
import { HydratedQuestion } from "@/lib/questions";
import { GenerationResult } from "@/lib/generator/types";
import {
  Calculator,
  Atom,
  Sliders,
  PieChart,
  BookOpen,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Equal,
  Search,
  Check,
  ShieldCheck,
  Loader2,
  FileCode2,
  ArrowDown,
} from "lucide-react";

export function ConfigurationForm() {
  // 1. Core State
  const [subject, setSubject] = useState<SubjectType>("MATHEMATICS");
  const [totalMarks, setTotalMarks] = useState<number>(40);

  // 2. Distributions
  const [difficulty, setDifficulty] = useState({
    EASY: 30,
    MEDIUM: 50,
    HARD: 20,
  });

  const [questionTypes, setQuestionTypes] = useState({
    MCQ: 40,
    SHORT_ANSWER: 40,
    LONG_ANSWER: 20,
  });

  const [topicDistribution, setTopicDistribution] = useState<Record<string, number>>(
    () => getEqualTopicDistribution("MATHEMATICS")
  );

  // 3. UI & Generation State
  const [topicSearch, setTopicSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submittedConfig, setSubmittedConfig] = useState<PaperConfig | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [swappingQuestionId, setSwappingQuestionId] = useState<string | null>(null);
  const [enhancingQuestionId, setEnhancingQuestionId] = useState<string | null>(null);
  const [generatingSimilarQuestionId, setGeneratingSimilarQuestionId] = useState<string | null>(null);
  const [previewEnhancement, setPreviewEnhancement] = useState<{
    questionId: string;
    enhancedText: string;
    changesSummary?: string;
  } | null>(null);
  const [previewGeneratedSimilar, setPreviewGeneratedSimilar] = useState<HydratedQuestion | null>(null);
  const [swapFeedback, setSwapFeedback] = useState<{
    type: "success" | "error";
    message: string;
    fallbackAvailable?: boolean;
    targetQuestionId?: string;
  } | null>(null);

  const formTopRef = useRef<HTMLDivElement>(null);
  const paperSectionRef = useRef<HTMLDivElement>(null);

  // 4. Update topic distribution when subject changes
  const handleSubjectChange = (newSubject: SubjectType) => {
    if (newSubject === subject) return;
    setSubject(newSubject);
    setTopicDistribution(getEqualTopicDistribution(newSubject));
    setTopicSearch("");
  };

  // 5. Calculations & Live Totals
  const difficultyTotal = useMemo(
    () => difficulty.EASY + difficulty.MEDIUM + difficulty.HARD,
    [difficulty]
  );

  const questionTypeTotal = useMemo(
    () => questionTypes.MCQ + questionTypes.SHORT_ANSWER + questionTypes.LONG_ANSWER,
    [questionTypes]
  );

  const topicTotal = useMemo(
    () => Object.values(topicDistribution).reduce((sum, val) => sum + (val || 0), 0),
    [topicDistribution]
  );

  const isDifficultyValid = difficultyTotal === 100;
  const isQuestionTypeValid = questionTypeTotal === 100;
  const isTopicValid = topicTotal === 100;
  const isMarksValid = Number.isInteger(totalMarks) && totalMarks >= 1 && totalMarks <= 200;

  // 6. Current available topics based on selected subject
  const currentTopics = useMemo(
    () => (subject === "MATHEMATICS" ? MATH_TOPICS : SCIENCE_TOPICS),
    [subject]
  );

  // Filtered topics based on search input
  const filteredTopics = useMemo(() => {
    if (!topicSearch.trim()) return currentTopics;
    return currentTopics.filter((t) =>
      t.toLowerCase().includes(topicSearch.toLowerCase().trim())
    );
  }, [currentTopics, topicSearch]);

  // 7. Topic Handlers
  const handleTopicChange = (topic: string, valueStr: string) => {
    const rawVal = parseInt(valueStr, 10);
    const value = isNaN(rawVal) ? 0 : Math.max(0, Math.min(100, rawVal));
    setTopicDistribution((prev) => ({
      ...prev,
      [topic]: value,
    }));
  };

  const handleEqualizeTopics = () => {
    setTopicDistribution(getEqualTopicDistribution(subject));
  };

  const handleResetTopics = () => {
    setTopicDistribution(getEmptyTopicDistribution(subject));
  };

  // 8. Overall Validation with Zod
  const validationResult = useMemo(() => {
    const currentBlueprint = {
      board: "CBSE" as const,
      grade: "CLASS_10" as const,
      subject,
      totalMarks,
      difficultyDistribution: difficulty,
      topicDistribution,
      questionTypeDistribution: questionTypes,
    };

    return paperConfigSchema.safeParse(currentBlueprint);
  }, [subject, totalMarks, difficulty, topicDistribution, questionTypes]);

  const isFormValid = validationResult.success;

  // 9. Generate Paper Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validationResult.success || isGenerating) return;

    setIsGenerating(true);
    setGenerationError(null);
    setSwapFeedback(null);
    setPreviewEnhancement(null);
    const configToSubmit = validationResult.data;
    setSubmittedConfig(configToSubmit);

    try {
      const result = await generatePaperAction(configToSubmit);
      setGenerationResult(result);
      setTimeout(() => {
        paperSectionRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err) {
      setGenerationError(
        err instanceof Error ? err.message : "An unexpected error occurred during paper generation."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // 10. Regenerate with Current Active Configuration
  const handleRegenerate = async () => {
    const activeConfig = submittedConfig || (validationResult.success ? validationResult.data : null);
    if (!activeConfig || isGenerating) return;

    setIsGenerating(true);
    setGenerationError(null);
    setSwapFeedback(null);
    setPreviewEnhancement(null);
    try {
      const result = await generatePaperAction(activeConfig);
      setGenerationResult(result);
    } catch (err) {
      setGenerationError(
        err instanceof Error ? err.message : "An unexpected error occurred during paper regeneration."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // 11. Individual Question Swap Handler
  const handleSwapQuestion = async (questionId: string) => {
    if (!generationResult || isGenerating || swappingQuestionId) return;
    const activeConfig = submittedConfig || (validationResult.success ? validationResult.data : null);
    if (!activeConfig) return;

    setSwappingQuestionId(questionId);
    setSwapFeedback(null);
    setPreviewEnhancement(null);
    setPreviewGeneratedSimilar(null);

    try {
      const currentQuestions = generationResult.questions;
      const res = await swapQuestionAction(currentQuestions, questionId, activeConfig);

      if (res.success && res.paper) {
        setGenerationResult(res.paper);
        const swapped = res.swappedQuestion;
        setSwapFeedback({
          type: "success",
          message: `Question successfully replaced with alternative (${swapped?.topic}, ${swapped?.marks}M, ${swapped?.difficulty}). Total marks and section integrity preserved.`,
        });
      } else {
        setSwapFeedback({
          type: "error",
          message: res.reason || "Unable to swap question.",
          fallbackAvailable: res.fallbackAvailable,
          targetQuestionId: res.targetQuestionId || questionId,
        });
      }
    } catch (err) {
      setSwapFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "An unexpected error occurred during question swap.",
        fallbackAvailable: true,
        targetQuestionId: questionId,
      });
    } finally {
      setSwappingQuestionId(null);
    }
  };

  // 12. AI Question Enhancement Handler (Preview Generation)
  const handleAIEnhance = async (questionId: string) => {
    if (!generationResult || isGenerating || enhancingQuestionId || swappingQuestionId || generatingSimilarQuestionId) return;

    setEnhancingQuestionId(questionId);
    setSwapFeedback(null);
    setPreviewGeneratedSimilar(null);

    try {
      const targetQuestion = generationResult.questions.find((q) => q.id === questionId) || questionId;
      const res = await enhanceQuestionAction(targetQuestion);

      if (res.success && res.previewText) {
        setPreviewEnhancement({
          questionId,
          enhancedText: res.previewText,
          changesSummary: res.changesSummary,
        });
      } else {
        setSwapFeedback({
          type: "error",
          message: res.reason || "Unable to generate AI enhancement for this question.",
        });
      }
    } catch (err) {
      setSwapFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "An unexpected error occurred during AI enhancement.",
      });
    } finally {
      setEnhancingQuestionId(null);
    }
  };

  // 13. Apply AI Enhancement to Canonical Paper
  const handleApplyEnhancement = async (questionId: string, enhancedText: string) => {
    if (!generationResult || isGenerating) return;
    const activeConfig = submittedConfig || (validationResult.success ? validationResult.data : null);
    if (!activeConfig) return;

    setSwapFeedback(null);

    try {
      const currentQuestions = generationResult.questions;
      const res = await applyQuestionEnhancementAction(
        currentQuestions,
        questionId,
        enhancedText,
        activeConfig
      );

      if (res.success && res.paper) {
        setGenerationResult(res.paper);
        setPreviewEnhancement(null);
        setSwapFeedback({
          type: "success",
          message: "AI enhanced question phrasing successfully applied. Total marks and pedagogical metadata preserved.",
        });
      } else {
        setSwapFeedback({
          type: "error",
          message: res.reason || "Unable to apply enhancement to question.",
        });
      }
    } catch (err) {
      setSwapFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "An unexpected error occurred while applying enhancement.",
      });
    }
  };

  // 14. Cancel AI Enhancement Preview
  const handleCancelEnhancement = () => {
    setPreviewEnhancement(null);
  };

  // 15. AI Generate Similar Question Handler
  const handleGenerateSimilarQuestion = async (questionId: string) => {
    if (!generationResult || isGenerating || generatingSimilarQuestionId || enhancingQuestionId || swappingQuestionId) return;

    setGeneratingSimilarQuestionId(questionId);
    setSwapFeedback(null);
    setPreviewEnhancement(null);
    setPreviewGeneratedSimilar(null);

    try {
      const targetQuestion = generationResult.questions.find((q) => q.id === questionId) || questionId;
      const res = await generateSimilarQuestionAction(targetQuestion, generationResult.questions);

      if (res.success && res.generatedQuestion) {
        setPreviewGeneratedSimilar(res.generatedQuestion);
      } else {
        setSwapFeedback({
          type: "error",
          message: res.reason || "Unable to generate equivalent question with AI.",
        });
      }
    } catch (err) {
      setSwapFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "An unexpected error occurred during AI question generation.",
      });
    } finally {
      setGeneratingSimilarQuestionId(null);
    }
  };

  // 16. Apply AI Generated Similar Question
  const handleApplySimilarQuestion = async (
    targetQuestionId: string,
    generatedQuestion: HydratedQuestion
  ) => {
    if (!generationResult || isGenerating) return;
    const activeConfig = submittedConfig || (validationResult.success ? validationResult.data : null);
    if (!activeConfig) return;

    setSwapFeedback(null);

    try {
      const currentQuestions = generationResult.questions;
      const res = await applySimilarQuestionAction(
        currentQuestions,
        targetQuestionId,
        generatedQuestion,
        activeConfig
      );

      if (res.success && res.paper) {
        setGenerationResult(res.paper);
        setPreviewGeneratedSimilar(null);
        setSwapFeedback({
          type: "success",
          message: `New AI-generated question successfully applied (${generatedQuestion.topic}, ${generatedQuestion.marks}M). Total marks and section integrity preserved.`,
        });
      } else {
        setSwapFeedback({
          type: "error",
          message: res.reason || "Unable to apply generated question.",
        });
      }
    } catch (err) {
      setSwapFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "An unexpected error occurred while applying generated question.",
      });
    }
  };

  // 17. Cancel AI Generated Similar Preview
  const handleCancelSimilarQuestion = () => {
    setPreviewGeneratedSimilar(null);
  };

  // 18. Scroll to top configuration form
  const handleEditConfig = () => {
    formTopRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <div ref={formTopRef} />
      <form onSubmit={handleSubmit} className="space-y-10" noValidate>
        {/* =========================================================================
            SECTION 1: Subject Selection & Total Marks
           ========================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                1. Subject &amp; Examination Marks
              </h2>
              <p className="text-xs text-slate-500">
                Select target CBSE Class 10 discipline and total marks weightage.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Subject Selector */}
            <div className="space-y-3">
              <label htmlFor="subject-select" className="block text-sm font-semibold text-slate-800">
                Select Subject
              </label>
              <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-labelledby="subject-label">
                <button
                  type="button"
                  id="subject-math"
                  onClick={() => handleSubjectChange("MATHEMATICS")}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition text-left ${
                    subject === "MATHEMATICS"
                      ? "border-blue-600 bg-blue-50/50 text-blue-900 shadow-xs"
                      : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg ${
                      subject === "MATHEMATICS"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Calculator className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold">Mathematics</div>
                    <div className="text-xs text-slate-500">14 CBSE Chapters</div>
                  </div>
                </button>

                <button
                  type="button"
                  id="subject-science"
                  onClick={() => handleSubjectChange("SCIENCE")}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition text-left ${
                    subject === "SCIENCE"
                      ? "border-emerald-600 bg-emerald-50/50 text-emerald-900 shadow-xs"
                      : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg ${
                      subject === "SCIENCE"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Atom className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold">Science</div>
                    <div className="text-xs text-slate-500">13 CBSE Chapters</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Total Marks Input */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor="total-marks-input" className="block text-sm font-semibold text-slate-800">
                  Total Marks
                </label>
                <span className="text-xs text-slate-500">1 to 200 Marks</span>
              </div>
              <div className="relative">
                <input
                  id="total-marks-input"
                  type="number"
                  min="1"
                  max="200"
                  step="1"
                  value={totalMarks || ""}
                  onChange={(e) => setTotalMarks(parseInt(e.target.value, 10) || 0)}
                  className={`w-full px-4 py-2.5 rounded-xl border font-semibold text-slate-900 text-base focus:outline-none focus:ring-2 transition ${
                    isMarksValid
                      ? "border-slate-200 focus:ring-blue-500 bg-white"
                      : "border-rose-300 bg-rose-50/30 text-rose-900 focus:ring-rose-400"
                  }`}
                  aria-describedby="marks-help"
                />
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-2 pt-1" id="marks-help">
                <span className="text-xs text-slate-500">CBSE Presets:</span>
                {[20, 40, 50, 80, 100].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTotalMarks(preset)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition ${
                      totalMarks === preset
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {preset}M
                  </button>
                ))}
              </div>

              {!isMarksValid && (
                <p className="text-xs text-rose-600 flex items-center gap-1 font-medium mt-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Please enter a valid positive integer between 1 and 200 marks.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION 2: Difficulty Distribution
           ========================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <PieChart className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  2. Difficulty Distribution
                </h2>
                <p className="text-xs text-slate-500">
                  Calibrate pedagogical cognitive complexity. Total must equal exactly 100%.
                </p>
              </div>
            </div>

            {/* Quick Presets for Difficulty */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setDifficulty({ EASY: 30, MEDIUM: 50, HARD: 20 })}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
              >
                CBSE Standard (30/50/20)
              </button>
              <button
                type="button"
                onClick={() => setDifficulty({ EASY: 40, MEDIUM: 40, HARD: 20 })}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
              >
                Foundational (40/40/20)
              </button>
            </div>
          </div>

          <DistributionProgress
            label="Difficulty Total"
            total={difficultyTotal}
            segments={[
              { label: "Easy", value: difficulty.EASY, color: "bg-emerald-500" },
              { label: "Medium", value: difficulty.MEDIUM, color: "bg-blue-500" },
              { label: "Hard", value: difficulty.HARD, color: "bg-amber-500" },
            ]}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Easy Input */}
            <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/30 space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="difficulty-easy" className="text-sm font-semibold text-emerald-950 flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Easy
                </label>
                <span className="text-xs font-medium text-emerald-800">
                  {isMarksValid ? `${((difficulty.EASY / 100) * totalMarks).toFixed(1)} marks` : ""}
                </span>
              </div>
              <div className="relative">
                <input
                  id="difficulty-easy"
                  type="number"
                  min="0"
                  max="100"
                  value={difficulty.EASY}
                  onChange={(e) =>
                    setDifficulty((prev) => ({
                      ...prev,
                      EASY: Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)),
                    }))
                  }
                  className="w-full pr-8 pl-3 py-2 rounded-lg border border-slate-200 text-slate-900 font-bold text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="absolute right-3 top-2 text-slate-400 text-xs font-bold pointer-events-none">
                  %
                </span>
              </div>
            </div>

            {/* Medium Input */}
            <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/30 space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="difficulty-medium" className="text-sm font-semibold text-blue-950 flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  Medium
                </label>
                <span className="text-xs font-medium text-blue-800">
                  {isMarksValid ? `${((difficulty.MEDIUM / 100) * totalMarks).toFixed(1)} marks` : ""}
                </span>
              </div>
              <div className="relative">
                <input
                  id="difficulty-medium"
                  type="number"
                  min="0"
                  max="100"
                  value={difficulty.MEDIUM}
                  onChange={(e) =>
                    setDifficulty((prev) => ({
                      ...prev,
                      MEDIUM: Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)),
                    }))
                  }
                  className="w-full pr-8 pl-3 py-2 rounded-lg border border-slate-200 text-slate-900 font-bold text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-2 text-slate-400 text-xs font-bold pointer-events-none">
                  %
                </span>
              </div>
            </div>

            {/* Hard Input */}
            <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/30 space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="difficulty-hard" className="text-sm font-semibold text-amber-950 flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  Hard
                </label>
                <span className="text-xs font-medium text-amber-800">
                  {isMarksValid ? `${((difficulty.HARD / 100) * totalMarks).toFixed(1)} marks` : ""}
                </span>
              </div>
              <div className="relative">
                <input
                  id="difficulty-hard"
                  type="number"
                  min="0"
                  max="100"
                  value={difficulty.HARD}
                  onChange={(e) =>
                    setDifficulty((prev) => ({
                      ...prev,
                      HARD: Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)),
                    }))
                  }
                  className="w-full pr-8 pl-3 py-2 rounded-lg border border-slate-200 text-slate-900 font-bold text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <span className="absolute right-3 top-2 text-slate-400 text-xs font-bold pointer-events-none">
                  %
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION 3: Question-Type Distribution
           ========================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  3. Question-Type Taxonomy Distribution
                </h2>
                <p className="text-xs text-slate-500">
                  Allocate proportions between MCQs, Short Answers, and Long Answers.
                </p>
              </div>
            </div>

            {/* Quick Presets for Question Types */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setQuestionTypes({ MCQ: 40, SHORT_ANSWER: 40, LONG_ANSWER: 20 })}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
              >
                Standard (40/40/20)
              </button>
              <button
                type="button"
                onClick={() => setQuestionTypes({ MCQ: 50, SHORT_ANSWER: 30, LONG_ANSWER: 20 })}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
              >
                Objective-Heavy (50/30/20)
              </button>
            </div>
          </div>

          <DistributionProgress
            label="Question Types Total"
            total={questionTypeTotal}
            segments={[
              { label: "MCQ", value: questionTypes.MCQ, color: "bg-purple-500" },
              { label: "Short Answer", value: questionTypes.SHORT_ANSWER, color: "bg-sky-500" },
              { label: "Long Answer", value: questionTypes.LONG_ANSWER, color: "bg-indigo-500" },
            ]}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* MCQ Input */}
            <div className="p-4 rounded-xl border border-purple-100 bg-purple-50/30 space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="qtype-mcq" className="text-sm font-semibold text-purple-950 flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
                  Multiple Choice (MCQ)
                </label>
                <span className="text-xs font-medium text-purple-800">
                  {isMarksValid ? `${((questionTypes.MCQ / 100) * totalMarks).toFixed(1)} marks` : ""}
                </span>
              </div>
              <div className="relative">
                <input
                  id="qtype-mcq"
                  type="number"
                  min="0"
                  max="100"
                  value={questionTypes.MCQ}
                  onChange={(e) =>
                    setQuestionTypes((prev) => ({
                      ...prev,
                      MCQ: Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)),
                    }))
                  }
                  className="w-full pr-8 pl-3 py-2 rounded-lg border border-slate-200 text-slate-900 font-bold text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <span className="absolute right-3 top-2 text-slate-400 text-xs font-bold pointer-events-none">
                  %
                </span>
              </div>
            </div>

            {/* Short Answer Input */}
            <div className="p-4 rounded-xl border border-sky-100 bg-sky-50/30 space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="qtype-sa" className="text-sm font-semibold text-sky-950 flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                  Short Answer
                </label>
                <span className="text-xs font-medium text-sky-800">
                  {isMarksValid ? `${((questionTypes.SHORT_ANSWER / 100) * totalMarks).toFixed(1)} marks` : ""}
                </span>
              </div>
              <div className="relative">
                <input
                  id="qtype-sa"
                  type="number"
                  min="0"
                  max="100"
                  value={questionTypes.SHORT_ANSWER}
                  onChange={(e) =>
                    setQuestionTypes((prev) => ({
                      ...prev,
                      SHORT_ANSWER: Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)),
                    }))
                  }
                  className="w-full pr-8 pl-3 py-2 rounded-lg border border-slate-200 text-slate-900 font-bold text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <span className="absolute right-3 top-2 text-slate-400 text-xs font-bold pointer-events-none">
                  %
                </span>
              </div>
            </div>

            {/* Long Answer Input */}
            <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/30 space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="qtype-la" className="text-sm font-semibold text-indigo-950 flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                  Long Answer
                </label>
                <span className="text-xs font-medium text-indigo-800">
                  {isMarksValid ? `${((questionTypes.LONG_ANSWER / 100) * totalMarks).toFixed(1)} marks` : ""}
                </span>
              </div>
              <div className="relative">
                <input
                  id="qtype-la"
                  type="number"
                  min="0"
                  max="100"
                  value={questionTypes.LONG_ANSWER}
                  onChange={(e) =>
                    setQuestionTypes((prev) => ({
                      ...prev,
                      LONG_ANSWER: Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)),
                    }))
                  }
                  className="w-full pr-8 pl-3 py-2 rounded-lg border border-slate-200 text-slate-900 font-bold text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="absolute right-3 top-2 text-slate-400 text-xs font-bold pointer-events-none">
                  %
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION 4: Topic Weightage
           ========================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  4. Topic Weightage ({currentTopics.length} Chapters)
                </h2>
                <p className="text-xs text-slate-500">
                  Allocate syllabus percentages. Total must equal exactly 100%.
                </p>
              </div>
            </div>

            {/* Quick Topic Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleEqualizeTopics}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition"
              >
                <Equal className="h-3.5 w-3.5" />
                Equalize ({Math.floor(100 / currentTopics.length)}%)
              </button>
              <button
                type="button"
                onClick={handleResetTopics}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset (0%)
              </button>
            </div>
          </div>

          {/* Search bar & Live Sum status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search topic or chapter..."
                value={topicSearch}
                onChange={(e) => setTopicSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Topic Status Pill */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Topic Total:</span>
              {isTopicValid ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  100% (Balanced)
                </span>
              ) : topicTotal > 100 ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                  <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                  {topicTotal}% (+{topicTotal - 100}% over 100%)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                  {topicTotal}% ({100 - topicTotal}% remaining)
                </span>
              )}
            </div>
          </div>

          {/* Compact Topic Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
            {filteredTopics.map((topic) => {
              const currentVal = topicDistribution[topic] || 0;
              const calculatedMarks = isMarksValid
                ? ((currentVal / 100) * totalMarks).toFixed(1)
                : "0.0";

              return (
                <div
                  key={topic}
                  className={`flex items-center justify-between p-3 rounded-xl border transition ${
                    currentVal > 0
                      ? "bg-slate-50/80 border-slate-300"
                      : "bg-white border-slate-200 opacity-80"
                  }`}
                >
                  <div className="pr-2 flex-1">
                    <label
                      htmlFor={`topic-input-${topic.replace(/\s+/g, "-")}`}
                      className="text-xs font-semibold text-slate-800 block leading-snug cursor-pointer"
                    >
                      {topic}
                    </label>
                    <span className="text-[11px] text-slate-500">
                      ≈ {calculatedMarks} Marks
                    </span>
                  </div>

                  <div className="relative w-20 flex-shrink-0">
                    <input
                      id={`topic-input-${topic.replace(/\s+/g, "-")}`}
                      type="number"
                      min="0"
                      max="100"
                      value={currentVal}
                      onChange={(e) => handleTopicChange(topic, e.target.value)}
                      className="w-full pr-6 pl-2 py-1.5 text-right font-bold text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      aria-label={`${topic} percentage`}
                    />
                    <span className="absolute right-2 top-2 text-[10px] text-slate-400 font-bold pointer-events-none">
                      %
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredTopics.length === 0 && (
            <p className="text-center text-xs text-slate-500 py-4">
              No topics matching &ldquo;{topicSearch}&rdquo;.
            </p>
          )}
        </div>

        {/* =========================================================================
            SECTION 5: Validation Summary & Action Button
           ========================================================================= */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 sm:p-8 text-white shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                <ShieldCheck className="h-4 w-4" />
                Blueprint Integrity Gate
              </div>
              <h3 className="text-xl font-bold">
                {isFormValid ? "Blueprint Ready for Synthesis" : "Complete Configuration Validation"}
              </h3>
              <p className="text-xs text-slate-300">
                All three pedagogical criteria (Difficulty, Question Types, Topic Weightage) must total exactly 100%.
              </p>
            </div>

            {/* Checklist of Gates */}
            <div className="flex flex-wrap gap-2 text-xs">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold ${
                  isMarksValid ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                }`}
              >
                {isMarksValid ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                Marks ({totalMarks}M)
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold ${
                  isDifficultyValid
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-rose-500/20 text-rose-300"
                }`}
              >
                {isDifficultyValid ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                Difficulty ({difficultyTotal}%)
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold ${
                  isQuestionTypeValid
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-rose-500/20 text-rose-300"
                }`}
              >
                {isQuestionTypeValid ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                Taxonomy ({questionTypeTotal}%)
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold ${
                  isTopicValid ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                }`}
              >
                {isTopicValid ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                Topics ({topicTotal}%)
              </span>
            </div>
          </div>

          {/* Validation Feedback Banner if invalid */}
          {!isFormValid && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-xs text-rose-200 space-y-1">
              <p className="font-semibold text-rose-300 flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-rose-400" />
                Please correct the following distribution constraints before generating:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-rose-200/90 pl-1">
                {!isMarksValid && <li>Total Marks must be a valid integer between 1 and 200.</li>}
                {!isDifficultyValid && (
                  <li>
                    Difficulty percentages must total 100% (currently {difficultyTotal}%).
                  </li>
                )}
                {!isQuestionTypeValid && (
                  <li>
                    Question-type percentages must total 100% (currently {questionTypeTotal}%).
                  </li>
                )}
                {!isTopicValid && (
                  <li>Topic weightage percentages must total 100% (currently {topicTotal}%).</li>
                )}
              </ul>
            </div>
          )}

          {/* Generation Error Alert */}
          {generationError && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-xs text-rose-200 space-y-1">
              <p className="font-semibold text-rose-300 flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-rose-400" />
                Generation Error:
              </p>
              <p className="text-rose-200/90 pl-1">{generationError}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <button
                type="submit"
                disabled={!isFormValid || isGenerating}
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold transition shadow-lg ${
                  isFormValid && !isGenerating
                    ? "bg-blue-600 hover:bg-blue-500 text-white cursor-pointer active:scale-[0.99] shadow-blue-500/30"
                    : "bg-slate-700 text-slate-400 cursor-not-allowed opacity-60"
                }`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Synthesizing Question Paper...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Question Paper
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (validationResult.success) {
                    setSubmittedConfig(validationResult.data);
                    setIsModalOpen(true);
                  }
                }}
                disabled={!isFormValid}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-3.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileCode2 className="h-3.5 w-3.5 text-slate-400" />
                Review Blueprint JSON
              </button>
            </div>

            <span className="text-[11px] text-slate-400">
              Deterministic constraint optimization engine calibrated for CBSE Class 10.
            </span>
          </div>
        </div>
      </form>

      {/* Blueprint Validation Review Modal */}
      {submittedConfig && (
        <BlueprintSummaryModal
          config={submittedConfig}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {/* Generated Question Paper Output View */}
      {generationResult && (
        <div ref={paperSectionRef} className="pt-10 border-t-2 border-slate-200">
          <PaperView
            result={generationResult}
            onRegenerate={handleRegenerate}
            isRegenerating={isGenerating}
            onEditConfig={handleEditConfig}
            onSwapQuestion={handleSwapQuestion}
            swappingQuestionId={swappingQuestionId}
            swapFeedback={swapFeedback}
            onDismissSwapFeedback={() => setSwapFeedback(null)}
            onAIEnhance={handleAIEnhance}
            enhancingQuestionId={enhancingQuestionId}
            previewEnhancement={previewEnhancement}
            onApplyEnhancement={handleApplyEnhancement}
            onCancelEnhancement={handleCancelEnhancement}
            onGenerateSimilar={handleGenerateSimilarQuestion}
            generatingSimilarQuestionId={generatingSimilarQuestionId}
            previewGeneratedSimilar={previewGeneratedSimilar}
            onApplyGeneratedSimilar={handleApplySimilarQuestion}
            onCancelGeneratedSimilar={handleCancelSimilarQuestion}
          />
        </div>
      )}
    </>
  );
}

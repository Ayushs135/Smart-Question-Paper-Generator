import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Sparkles,
  Database,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ConfigurationForm } from "@/components/ConfigurationForm";

export const dynamic = "force-dynamic";

async function getQuestionBankMetrics() {
  try {
    const totalCount = await prisma.question.count();
    const mathCount = await prisma.question.count({ where: { subject: "MATHEMATICS" } });
    const scienceCount = await prisma.question.count({ where: { subject: "SCIENCE" } });

    return {
      connected: true,
      totalCount,
      mathCount,
      scienceCount,
      provider: "SQLite",
    };
  } catch (error) {
    return {
      connected: false,
      totalCount: 0,
      mathCount: 0,
      scienceCount: 0,
      provider: "SQLite",
      error: (error as Error).message,
    };
  }
}

export default async function GeneratePage() {
  const metrics = await getQuestionBankMetrics();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Navigation Breadcrumb & Scope Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-blue-600 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Question Bank Live Metric Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-xs shadow-xs">
          <Database className="h-3.5 w-3.5 text-emerald-600" />
          {metrics.connected ? (
            <span className="text-slate-700 font-medium flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <strong>{metrics.totalCount} CBSE Questions</strong> ({metrics.mathCount} Math &bull; {metrics.scienceCount} Science)
            </span>
          ) : (
            <span className="text-amber-700 font-medium flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
              Database connection pending
            </span>
          )}
        </div>
      </div>

      {/* Page Header */}
      <div className="space-y-3 border-b border-slate-200 pb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
          <GraduationCap className="h-3.5 w-3.5 text-blue-600" />
          CBSE Class 10 Assessment Tool
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Configure Your Question Paper
        </h1>
        <p className="text-slate-600 text-sm sm:text-base max-w-3xl leading-relaxed">
          Specify blueprint parameters across total marks, difficulty distribution, question taxonomy, and chapter weightage.
          The generator dynamically constructs a balanced practice paper aligned with your specifications.
        </p>
      </div>

      {/* Main Interactive Teacher Configuration Form */}
      <ConfigurationForm />
    </div>
  );
}

import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Sliders,
  PieChart,
  Layers,
  BookOpen,
  CheckCircle2,
  Atom,
  Calculator,
  Compass,
  Cpu,
} from "lucide-react";
import { FeatureCard } from "@/components/FeatureCard";

export default function HomePage() {
  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/60 via-white to-slate-50 pt-12 pb-16 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              Next-Gen Academic Assessment Engine
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight text-balance">
              Smart Question Paper{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                Generator
              </span>
            </h1>

            {/* Description */}
            <p className="text-lg sm:text-xl text-slate-600 leading-relaxed text-balance">
              Empower educators to craft rigorous, balanced, and syllabus-aligned
              examinations for Mathematics and Science in seconds.
            </p>

            {/* Primary Action Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/generate"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition shadow-lg shadow-blue-500/25 group"
              >
                Create Question Paper
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="#features"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition shadow-sm"
              >
                Explore Capabilities
              </Link>
            </div>

            {/* Quick stats / Highlights */}
            <div className="pt-8 border-t border-slate-200/80 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-xs">
                <p className="text-2xl font-bold text-blue-600">100%</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Constraint Match</p>
              </div>
              <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-xs">
                <p className="text-2xl font-bold text-indigo-600">Math &amp; Sci</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Core Curriculum</p>
              </div>
              <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-xs">
                <p className="text-2xl font-bold text-emerald-600">4 Types</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Question Taxonomy</p>
              </div>
              <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-xs">
                <p className="text-2xl font-bold text-amber-600">Instant</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Blueprint Synthesis</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Target Disciplines Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-8 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Tailored for Core STEM Disciplines
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            Engineered specifically to handle the structural nuances of analytical and theoretical testing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Mathematics Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm hover:border-blue-300 transition relative overflow-hidden">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-12 w-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <Calculator className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Mathematics</h3>
                <p className="text-xs text-slate-500">Algebra &bull; Calculus &bull; Geometry &bull; Trigonometry</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Equipped for stepped numericals, proofs, formula-heavy queries, and multiple-choice problem sets with precise mark allocation.
            </p>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Custom mark-weighted numerical and formula questions
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Algebraic and geometric concept breakdown
              </li>
            </ul>
          </div>

          {/* Science Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm hover:border-emerald-300 transition relative overflow-hidden">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Atom className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Science</h3>
                <p className="text-xs text-slate-500">Physics &bull; Chemistry &bull; Biology</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Designed for conceptual questions, diagrammatic analysis, reaction mechanisms, and experimental reasoning problems.
            </p>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Balanced conceptual and experimental questions
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Physics formulas, chemical reactions, and biological diagrams
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Core Capabilities Section */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
            <Compass className="h-3.5 w-3.5" />
            Assessment Capabilities
          </div>
          <h2 className="text-3xl font-bold text-slate-900">
            Comprehensive Assessment Engineering
          </h2>
          <p className="text-slate-600 text-sm sm:text-base">
            Engineered to deliver mathematically balanced, syllabus-aligned examination papers in seconds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard
            icon={Sliders}
            title="Deterministic Constraint Engine"
            description="Guarantees exact marks (20M–100M), zero duplicate questions, and multi-dimensional knapsack optimization."
            badge="Exact Math"
            badgeColor="blue"
          />
          <FeatureCard
            icon={BookOpen}
            title="Curated CBSE Question Bank"
            description="Over 430+ vetted questions spanning all 14 Mathematics chapters and 13 Science chapters with detailed solutions."
            badge="433+ Questions"
            badgeColor="emerald"
          />
          <FeatureCard
            icon={Sparkles}
            title="Groq AI Question Refinement"
            description="Optional teacher-directed AI enhancement with strict mathematical equation and chemical formula safety gates."
            badge="Supervised AI"
            badgeColor="purple"
          />
          <FeatureCard
            icon={Layers}
            title="Print & Export Ready"
            description="Sectional CBSE formatting (Section A: MCQ, Section B: SA, Section C: LA) with one-click print CSS and solutions toggle."
            badge="CBSE Layout"
            badgeColor="amber"
          />
        </div>
      </section>

      {/* Call-to-Action Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 sm:p-10 text-white shadow-xl">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/30">
                <Cpu className="h-3.5 w-3.5" />
                CBSE-Aligned Assessment
              </div>
              <h3 className="text-2xl font-bold">
                Ready to Generate Your Examination Paper?
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Configure your subject blueprint, select mark boundaries, and generate a validated, printable question paper complete with marking schemes.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <Link
                href="/generate"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-base font-semibold transition shadow-lg shadow-blue-500/25"
              >
                Start Paper Generator
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

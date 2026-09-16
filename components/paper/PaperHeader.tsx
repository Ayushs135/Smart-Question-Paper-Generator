import React from "react";
import { SubjectType } from "@/types/question";
import { BookOpen, CheckCircle2 } from "lucide-react";

export interface PaperHeaderProps {
  subject: SubjectType;
  totalMarks: number;
  questionCount: number;
  board?: string;
  grade?: string;
}

export function PaperHeader({
  subject,
  totalMarks,
  questionCount,
  board = "CBSE",
  grade = "CLASS 10",
}: PaperHeaderProps) {
  const displaySubject = subject === "MATHEMATICS" ? "MATHEMATICS" : "SCIENCE";
  const displayGrade = grade.replace("_", " ");

  return (
    <div className="border-b-2 border-slate-900 pb-6 mb-6 font-serif">
      {/* Top Formal Institution / Board Banner */}
      <div className="text-center space-y-1.5 mb-5">
        <p className="text-xs sm:text-sm tracking-widest font-semibold uppercase text-slate-700">
          {board} &bull; {displayGrade} ASSESSMENT
        </p>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 uppercase">
          QUESTION PAPER &mdash; {displaySubject}
        </h1>
        <p className="text-xs text-slate-600 italic">
          Standard Curriculum Assessment
        </p>
      </div>

      {/* Metadata Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm font-semibold border-y border-slate-300 py-2.5 px-2 bg-slate-50/50">
        <div className="flex items-center gap-1.5 text-slate-800">
          <span>Subject:</span>
          <span className="font-bold text-slate-950">{displaySubject}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-800">
          <span>Total Questions:</span>
          <span className="font-bold text-slate-950">{questionCount}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-800">
          <span>Maximum Marks:</span>
          <span className="font-bold text-slate-950">{totalMarks}</span>
        </div>
      </div>

      {/* Generic Application Assessment Instructions */}
      <div className="mt-4 text-xs sm:text-[13px] text-slate-700 leading-relaxed space-y-1 bg-amber-50/30 border border-amber-200/40 rounded-lg p-3">
        <p className="font-bold text-slate-900 uppercase tracking-wide text-[11px]">
          General Instructions:
        </p>
        <ol className="list-decimal list-inside space-y-0.5 text-slate-700">
          <li>Read all questions carefully before attempting the solutions.</li>
          <li>All questions are compulsory.</li>
          <li>
            The question paper comprises three sections: <strong>Section A</strong> (Multiple Choice Questions), <strong>Section B</strong> (Short Answer Questions), and <strong>Section C</strong> (Long Answer Questions).
          </li>
          <li>Marks allotted to each question are clearly indicated against the question.</li>
        </ol>
      </div>
    </div>
  );
}

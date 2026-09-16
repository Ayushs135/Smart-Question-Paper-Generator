import React from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface Segment {
  label: string;
  value: number;
  color: string;
}

interface DistributionProgressProps {
  segments: Segment[];
  total: number;
  label?: string;
}

export function DistributionProgress({
  segments,
  total,
  label = "Total Distribution",
}: DistributionProgressProps) {
  const isValid = total === 100;
  const isOver = total > 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-medium">
        <span className="text-slate-600">{label}</span>
        <div className="flex items-center gap-1.5">
          {isValid ? (
            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              100% Balanced
            </span>
          ) : isOver ? (
            <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full font-semibold border border-rose-200">
              <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
              {total}% (+{total - 100}% over limit)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-semibold border border-amber-200">
              <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
              {total}% ({100 - total}% remaining)
            </span>
          )}
        </div>
      </div>

      {/* Visual Multi-Segment Bar */}
      <div
        className={`h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex border ${
          isValid ? "border-emerald-300" : isOver ? "border-rose-300" : "border-amber-300"
        }`}
      >
        {segments.map((seg, idx) => {
          if (seg.value <= 0) return null;
          return (
            <div
              key={idx}
              style={{ width: `${Math.min(seg.value, 100)}%` }}
              className={`${seg.color} transition-all duration-300 relative group`}
              title={`${seg.label}: ${seg.value}%`}
            />
          );
        })}
      </div>
    </div>
  );
}

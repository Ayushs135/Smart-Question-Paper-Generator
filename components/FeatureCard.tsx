import React from "react";
import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: string;
  badgeColor?: "blue" | "emerald" | "amber" | "purple";
}

export function FeatureCard({
  icon: Icon,
  title,
  description,
  badge,
  badgeColor = "blue",
}: FeatureCardProps) {
  const badgeClasses = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors">
            <Icon className="h-6 w-6" />
          </div>
          {badge && (
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${badgeClasses[badgeColor]}`}
            >
              {badge}
            </span>
          )}
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

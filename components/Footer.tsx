import React from "react";
import { GraduationCap } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Smart Question Paper Generator
              </p>
              <p className="text-xs text-slate-500">
                CBSE Class 10 Examination Assessment Suite
              </p>
            </div>
          </div>

          {/* Product Info & Copyright */}
          <div className="text-center sm:text-right">
            <p className="text-xs font-medium text-slate-600">
              Designed for Mathematics &amp; Science Educators
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              &copy; {currentYear} Smart Question Paper Generator &bull; CBSE-Aligned Practice Assessment Tool
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

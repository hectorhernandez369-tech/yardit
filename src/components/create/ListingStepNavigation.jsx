import React from "react";

export default function ListingStepNavigation({ step, totalSteps, stepLabels }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s, i) => (
          <React.Fragment key={s}>
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                s < step ? "bg-[#006168] text-white shadow-sm" : s === step ? "bg-[#006168] text-white ring-4 ring-[#006168]/20 shadow-md" : "bg-slate-100 text-slate-400"
              }`}>
                {s < step ? "✓" : s}
              </div>
              <span className={`text-[10px] font-medium hidden sm:block ${s === step ? "text-[#006168]" : s < step ? "text-slate-500" : "text-slate-300"}`}>
                {stepLabels[i]}
              </span>
            </div>
            {s < totalSteps && <div className={`flex-1 h-0.5 mx-1 rounded-full transition-all duration-300 ${s < step ? "bg-[#006168]" : "bg-slate-200"}`} />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
import React from "react";
import { buildPreSpreePinSvg } from "@/lib/preSpreePin";

export default function PreSpreeTierCard({ selected, onSelect }) {
  return (
    <button type="button" onClick={onSelect} aria-pressed={selected} aria-label="Pre-Spree Weekend promo tier"
      className={`w-full rounded-xl p-4 text-left transition-all ${selected ? "border-[3px] border-[#F4A849] bg-slate-950 shadow-lg" : "border border-[#F4A849]/70 bg-slate-900 hover:border-[#F4A849]"} text-white`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <img src={buildPreSpreePinSvg()} alt="" className="h-[33px] w-[25px]" />
            <span className="text-base font-bold">Pre-Spree Weekend</span>
            <span className="rounded-full bg-[#F4A849] px-2 py-0.5 text-[10px] font-bold text-slate-950">LIMITED-TIME PROMO</span>
            {selected && <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-950">Selected</span>}
          </div>
          <p className="mt-2 text-sm font-semibold text-amber-200">November 20–22, 2026</p>
          <p className="mt-1 text-sm">Clear out before you check out.</p>
        </div>
        <div className="shrink-0 text-right"><s className="block text-sm text-slate-400">$4.99</s><span className="text-xl font-extrabold text-amber-300">FREE</span></div>
      </div>
      <p className="mt-3 text-sm text-slate-200">Featured benefits · Up to 10 photos · Special map pin visible immediately</p>
      <p className="mt-1 text-xs text-slate-300">November 20–22 dates are automatically filled and locked. No payment required.</p>
    </button>
  );
}

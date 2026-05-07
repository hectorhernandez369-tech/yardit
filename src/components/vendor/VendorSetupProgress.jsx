import React from "react";
import { Button } from "@/components/ui/button";
import { getVendorSetupProgress } from "@/lib/vendorSetup";

export default function VendorSetupProgress({ account, pins = [], onContinue, onDismiss, showDismiss = false }) {
  const progress = getVendorSetupProgress(account, pins);

  if (progress.isComplete) return null;

  return (
    <div className="rounded-2xl border border-[#F4A849]/40 bg-[#FFF7E8] p-3 sm:p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-[#2C4F4E]">Complete your Vendor Setup to get the most out of Yardit.</p>
          <p className="mt-1 text-xs font-semibold text-slate-700">Vendor Setup: {progress.completedCount} of {progress.total} complete · {progress.percent}%</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-[#5DADA5] transition-all" style={{ width: `${progress.percent}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate-600">Remaining: {progress.remainingSteps.map((step) => step.title).join(", ")}</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button onClick={onContinue} className="w-full rounded-xl bg-[#5DADA5] hover:bg-[#4A9B93] sm:w-auto">Continue Setup</Button>
          {showDismiss && <Button onClick={onDismiss} variant="outline" className="w-full rounded-xl bg-white sm:w-auto">Dismiss for now</Button>}
        </div>
      </div>
    </div>
  );
}
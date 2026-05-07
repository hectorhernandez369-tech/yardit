import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import VendorActivePinPreview from "@/components/vendor/my-page/VendorActivePinPreview";
import VendorUpdatesPanel from "@/components/vendor/my-page/VendorUpdatesPanel";
import VendorPublicPreview from "@/components/vendor/my-page/VendorPublicPreview";

export default function VendorBusinessPage({ account, pins, checkIns, updates, onRefresh }) {
  const [previewMode, setPreviewMode] = useState(false);

  if (previewMode) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => setPreviewMode(false)} className="bg-[#5DADA5] hover:bg-[#4A9B93] text-white">Back to Editing</Button>
        </div>
        <VendorPublicPreview account={account} pins={pins} checkIns={checkIns} updates={updates} />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-[#1F2937]">My Page</h2>
          <p className="text-sm text-slate-600">Manage what customers see on your public vendor profile.</p>
        </div>
        <Button onClick={() => setPreviewMode(true)} className="w-full sm:w-auto bg-[#F4A849] hover:bg-[#E39635] text-[#2C4F4E]">Preview Public Page</Button>
      </div>
      <div className="grid min-w-0 gap-4 sm:gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-5">
          <VendorActivePinPreview pins={pins} checkIns={checkIns} />
        </div>
        <div className="space-y-5">
          <VendorUpdatesPanel account={account} updates={updates} onRefresh={onRefresh} />
        </div>
      </div>
    </div>
  );
}
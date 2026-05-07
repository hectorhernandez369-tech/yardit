import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import VendorActivePinPreview from "@/components/vendor/my-page/VendorActivePinPreview";
import VendorUpdatesPanel from "@/components/vendor/my-page/VendorUpdatesPanel";
import VendorPublicPreview from "@/components/vendor/my-page/VendorPublicPreview";
import VendorPhotoGallery from "@/components/vendor/my-page/VendorPhotoGallery";

export default function VendorBusinessPage({ account, pins, checkIns, updates, onRefresh }) {
  const [previewMode, setPreviewMode] = useState(false);

  if (previewMode) {
    return (
      <div className="fixed inset-0 z-[2000] overflow-y-auto bg-[#FBFAF7]">
        <div className="sticky top-0 z-10 border-b border-[#2C4F4E]/20 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#5DADA5]">Public Page Preview</p>
              <p className="text-sm text-slate-600">This is how customers will see your vendor page.</p>
            </div>
            <Button onClick={() => setPreviewMode(false)} className="shrink-0 bg-[#5DADA5] hover:bg-[#4A9B93] text-white">Back to Editing</Button>
          </div>
        </div>
        <div className="mx-auto max-w-7xl p-3 sm:p-5 lg:p-6">
          <VendorPublicPreview account={account} pins={pins} checkIns={checkIns} updates={updates} />
        </div>
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
      <div className="grid min-w-0 gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
        <div className="space-y-4 sm:space-y-5 min-w-0">
          <VendorPhotoGallery account={account} onRefresh={onRefresh} />
        </div>
        <div className="space-y-4 sm:space-y-5 min-w-0">
          <VendorActivePinPreview pins={pins} checkIns={checkIns} />
          <VendorUpdatesPanel account={account} updates={updates} onRefresh={onRefresh} />
        </div>
      </div>
    </div>
  );
}
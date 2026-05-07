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

  const liveItems = (checkIns || []).filter((item) => item.status === "live" && new Date(item.checkin_end_time) > new Date());
  const liveCount = liveItems.length;
  return (
    <div className="space-y-3 sm:space-y-5 min-w-0">
      <div className="rounded-3xl border border-[#2C4F4E]/15 bg-white p-3 sm:p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-black text-[#2C4F4E]">My Page</h2>
            <p className="text-xs sm:text-sm text-slate-600">Manage your public business feed, photos, and live locations.</p>
          </div>
          <Button onClick={() => setPreviewMode(true)} className="rounded-full bg-[#F4A849] px-4 text-[#2C4F4E] hover:bg-[#E39635]">View Public Page</Button>
        </div>
        <div className="mt-3 flex gap-2 sm:gap-3 text-center">
          <div className="rounded-2xl bg-[#F3E6CF] px-3 py-2"><p className="text-base font-black text-[#2C4F4E]">{(account.photo_urls || []).length}</p><p className="text-[11px] text-slate-600">Photos</p></div>
          <div className="rounded-2xl bg-[#F3E6CF] px-3 py-2"><p className="text-base font-black text-[#2C4F4E]">{updates.length}</p><p className="text-[11px] text-slate-600">Posts</p></div>
          <div className="rounded-2xl bg-[#F3E6CF] px-3 py-2"><p className="text-base font-black text-[#2C4F4E]">{liveCount}</p><p className="text-[11px] text-slate-600">Live</p></div>
        </div>
      </div>

      <div className="grid min-w-0 gap-3 sm:gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(300px,0.75fr)]">
        <div className="space-y-3 sm:space-y-5 min-w-0">
          <VendorUpdatesPanel account={account} updates={updates} onRefresh={onRefresh} />
        </div>
        <div className="space-y-3 sm:space-y-5 min-w-0">
          <VendorActivePinPreview pins={pins} checkIns={checkIns} />
          <VendorPhotoGallery account={account} onRefresh={onRefresh} />
        </div>
      </div>
    </div>
  );
}
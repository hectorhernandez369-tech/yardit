import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import VendorDetailsForm from "@/components/vendor/my-page/VendorDetailsForm";
import VendorPhotoGallery from "@/components/vendor/my-page/VendorPhotoGallery";
import VendorActivePinPreview from "@/components/vendor/my-page/VendorActivePinPreview";
import VendorUpdatesPanel from "@/components/vendor/my-page/VendorUpdatesPanel";
import VendorPublicPreview from "@/components/vendor/my-page/VendorPublicPreview";

export default function VendorBusinessPage({ account, pins, checkIns, updates, onRefresh }) {
  const [previewMode, setPreviewMode] = useState(false);

  const scrollToEditor = () => {
    document.getElementById("vendor-profile-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={() => setPreviewMode(true)} className="bg-[#F4A849] hover:bg-[#E39635] text-[#2C4F4E]">Preview Public Page</Button>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <VendorDetailsForm account={account} onRefresh={onRefresh} />
          <VendorPhotoGallery account={account} onRefresh={onRefresh} />
        </div>
        <div className="space-y-5">
          <VendorActivePinPreview pins={pins} checkIns={checkIns} />
          <VendorUpdatesPanel account={account} updates={updates} onRefresh={onRefresh} />
        </div>
      </div>
    </div>
  );
}
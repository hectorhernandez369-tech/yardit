import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, X } from "lucide-react";
import { getEventIconEmoji, getEventIconOptionsForTier } from "@/lib/eventListingConfig";

export default function EventIconManager({ tier = "basic", selectedIcon, setSelectedIcon, uploadedImageUrl, setUploadedImageUrl }) {
  const [isUploading, setIsUploading] = useState(false);
  const iconOptions = getEventIconOptionsForTier(tier);
  const isPremium = tier === "premium";
  const isMarquee = tier === "marquee";

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setUploadedImageUrl(result.file_url);
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  if (isMarquee) {
    return (
      <div className="rounded-lg border border-[#2C4F4E]/20 bg-[#F3E6CF] p-4 text-sm text-[#2C4F4E]">
        Marquee icon management will be handled separately later.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-[#2C4F4E]">Event Icon</Label>
        <p className="text-xs text-slate-500 mt-1">
          {tier === "basic" ? "Choose from the outline icon library." : isPremium ? "Choose an icon or upload a logo/image for your Premium event pin." : "Choose from the colored icon library."}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {iconOptions.map((icon) => {
          const selected = selectedIcon === icon && !uploadedImageUrl;
          return (
            <button
              key={icon}
              type="button"
              onClick={() => {
                setSelectedIcon(icon);
                if (isPremium) setUploadedImageUrl("");
              }}
              className={`rounded-xl border p-4 text-left transition-all ${selected ? "border-[#F4A849] bg-white shadow-md" : "border-[#2C4F4E]/20 bg-[#F3E6CF] hover:border-[#2C4F4E]/40"}`}
            >
              <div className="text-3xl mb-2">{getEventIconEmoji(icon)}</div>
              <div className="font-medium text-[#2C4F4E] text-sm capitalize">{icon.replace(/_/g, " ")}</div>
            </button>
          );
        })}
      </div>

      {isPremium && (
        <div className="rounded-lg border border-[#2C4F4E]/20 bg-white/70 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-[#2C4F4E]">Uploaded logo / image</p>
              <p className="text-xs text-slate-500">Premium events can use a custom branded image instead of an icon.</p>
            </div>
            <label className="inline-flex">
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={isUploading} />
              <span className="inline-flex items-center gap-2 rounded-md bg-[#5DADA5] px-3 py-2 text-sm font-medium text-white cursor-pointer hover:bg-[#4A9B93]">
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {isUploading ? "Uploading..." : "Upload Image"}
              </span>
            </label>
          </div>

          {uploadedImageUrl && (
            <div className="relative w-24 h-24 rounded-full overflow-hidden border border-[#2C4F4E]/20 bg-white">
              <img src={uploadedImageUrl} alt="Uploaded event logo" className="w-full h-full object-cover" />
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="absolute top-1 right-1 h-7 w-7"
                onClick={() => setUploadedImageUrl("")}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";

export default function EditListingPhotos({ label = "Photos", value = [], onChange, maxPhotos = 3 }) {
  const [isUploading, setIsUploading] = React.useState(false);

  const handleFiles = async (event) => {
    const remaining = Math.max(0, maxPhotos - value.length);
    const files = Array.from(event.target.files || []).slice(0, remaining);
    if (files.length === 0) return;

    setIsUploading(true);
    Promise.all(files.map((file) => base44.integrations.Core.UploadFile({ file })))
      .then((results) => {
        onChange([...(value || []), ...results.map((item) => item.file_url)].slice(0, maxPhotos));
        toast.success("Photos added - click Save to persist");
      })
      .finally(() => {
        setIsUploading(false);
        event.target.value = "";
      });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-[#2C4F4E]">{label}</Label>
        <span className="text-xs text-slate-500">Max {maxPhotos}</span>
      </div>

      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleFiles}
        className="block w-full text-sm"
        disabled={isUploading || value.length >= maxPhotos}
      />

      {isUploading && (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Loader2 className="w-4 h-4 animate-spin" /> Uploading photos...
        </div>
      )}

      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {value.map((url, index) => (
            <div key={url} className="relative rounded-lg overflow-hidden border border-[#2C4F4E]/20 bg-white">
              <img src={url} alt={`${label} ${index + 1}`} className="w-full h-24 object-cover" />
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="absolute top-1 right-1 h-7 w-7"
                onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
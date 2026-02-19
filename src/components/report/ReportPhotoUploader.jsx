import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Camera, X } from "lucide-react";
import { toast } from "sonner";

const MAX_PHOTOS = 3;

export default function ReportPhotoUploader({ photos, onPhotosChange }) {
  const inputRef = useRef(null);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      toast.error("Max 3 photos");
      e.target.value = "";
      return;
    }

    const toAdd = files.slice(0, remaining);
    if (files.length > remaining) {
      toast.error(`Only ${remaining} more photo${remaining === 1 ? "" : "s"} allowed`);
    }

    const newPhotos = toAdd.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    onPhotosChange([...photos, ...newPhotos]);
    e.target.value = "";
  };

  const removePhoto = (index) => {
    URL.revokeObjectURL(photos[index].preview);
    onPhotosChange(photos.filter((_, i) => i !== index));
  };

  return (
    <div>
      <Label>Photos (optional)</Label>
      <p className="text-xs text-muted-foreground mb-2">
        Add up to 3 photos to help us review this report.
      </p>

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-2">
          {photos.map((photo, idx) => (
            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
              <img
                src={photo.preview}
                alt={`Report photo ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removePhoto(idx)}
                className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-0.5 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        {photos.length < MAX_PHOTOS && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            className="gap-1.5"
          >
            <Camera className="w-4 h-4" />
            Add photos
          </Button>
        )}
        {photos.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {photos.length}/{MAX_PHOTOS} selected
          </span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
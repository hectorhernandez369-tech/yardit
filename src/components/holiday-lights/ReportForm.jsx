import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

const reportReasons = [
  { value: "NO_LIGHTS", label: "No Lights / Turned Off", descRequired: false, photosRequired: false },
  { value: "YARD_SALE_INSTEAD", label: "Yard Sale Instead", descRequired: true, photosRequired: true },
  { value: "VENDOR_ACTIVITY", label: "Vendor/Business Activity", descRequired: true, photosRequired: false },
  { value: "WARNING", label: "Safety Warning", descRequired: false, photosRequired: false },
  { value: "DANGEROUS", label: "Dangerous Situation", descRequired: false, photosRequired: false },
  { value: "BE_AWARE", label: "Be Aware", descRequired: false, photosRequired: false },
  { value: "OFFENSIVE", label: "Offensive/Inappropriate", descRequired: true, photosRequired: false },
  { value: "OTHER", label: "Other", descRequired: true, photosRequired: false },
];

export default function ReportForm({ locationId, onClose }) {
  const [user, setUser] = useState(null);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [photoUrls, setPhotoUrls] = useState([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const submitReportMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.LightReport.create(data);

      // Check if we need to auto-hide the listing
      if (data.reason === "YARD_SALE_INSTEAD" || data.reason === "VENDOR_ACTIVITY") {
        const reports = await base44.entities.LightReport.filter({
          listing_id: locationId,
          reason: data.reason,
        });

        if (reports.length >= 2) {
          await base44.entities.Location.update(locationId, {
            status: "under_review",
            display_active: false,
          });
          toast.success("Listing has been hidden pending review");
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast.success("Report submitted successfully");
      onClose();
    },
    onError: () => {
      toast.error("Failed to submit report");
    },
  });

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length + photoUrls.length > 3) {
      toast.error("Maximum 3 photos allowed");
      return;
    }

    setUploadingPhotos(true);
    try {
      const uploads = await Promise.all(
        files.map(file => base44.integrations.Core.UploadFile({ file }))
      );
      setPhotoUrls([...photoUrls, ...uploads.map(u => u.file_url)]);
    } catch (error) {
      toast.error("Failed to upload photos");
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const selectedReason = reportReasons.find(r => r.value === reason);
    
    if (selectedReason.descRequired && !description.trim()) {
      toast.error("Description is required for this report type");
      return;
    }

    if (selectedReason.photosRequired && photoUrls.length === 0) {
      toast.error("At least one photo is required for this report type");
      return;
    }

    submitReportMutation.mutate({
      listing_id: locationId,
      reporter_email: user?.email,
      reason,
      description,
      photo_urls: photoUrls,
    });
  };

  if (!user) return null;

  const selectedReason = reportReasons.find(r => r.value === reason);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-yellow-800">
          Please only report legitimate issues. False reports may result in account restrictions.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Report Reason *</Label>
        <Select value={reason} onValueChange={setReason} required>
          <SelectTrigger>
            <SelectValue placeholder="Select a reason" />
          </SelectTrigger>
          <SelectContent>
            {reportReasons.map(r => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedReason && (
        <>
          <div className="space-y-2">
            <Label>
              Description {selectedReason.descRequired && "*"}
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide details about the issue..."
              rows={4}
              required={selectedReason.descRequired}
            />
          </div>

          <div className="space-y-2">
            <Label>
              Photos (Max 3) {selectedReason.photosRequired && "*"}
            </Label>
            <div className="space-y-2">
              {photoUrls.length < 3 && (
                <div>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhotos}
                    className="hidden"
                    id="photo-upload"
                  />
                  <Label
                    htmlFor="photo-upload"
                    className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors"
                  >
                    {uploadingPhotos ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        Upload Photos
                      </>
                    )}
                  </Label>
                </div>
              )}
              
              {photoUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {photoUrls.map((url, idx) => (
                    <div key={idx} className="relative">
                      <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-20 object-cover rounded" />
                      <button
                        type="button"
                        onClick={() => setPhotoUrls(photoUrls.filter((_, i) => i !== idx))}
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={submitReportMutation.isPending || !reason}
          className="flex-1 bg-red-600 hover:bg-red-700"
        >
          {submitReportMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Report"
          )}
        </Button>
      </div>
    </form>
  );
}
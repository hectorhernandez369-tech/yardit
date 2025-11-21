import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Flag, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { getCurrentSeasonYear } from "./SeasonCheck";

const REPORT_REASONS = [
  { value: "NO_LIGHTS", label: "No Lights / Turned Off", descRequired: false },
  { value: "YARD_SALE_INSTEAD", label: "Yard Sale Instead of Lights", descRequired: true, photoRequired: true },
  { value: "VENDOR_ACTIVITY", label: "Vendor / Business Activity", descRequired: true },
  { value: "WARNING", label: "Safety Warning", descRequired: false },
  { value: "DANGEROUS", label: "Dangerous", descRequired: false },
  { value: "BE_AWARE", label: "Be Aware", descRequired: false },
  { value: "OFFENSIVE", label: "Offensive / Inappropriate", descRequired: true },
  { value: "OTHER", label: "Other", descRequired: true },
];

export default function ReportForm({ locationId }) {
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [photoFiles, setPhotoFiles] = useState([]);
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

  const uploadPhotosMutation = useMutation({
    mutationFn: async (files) => {
      const urls = [];
      for (const file of files) {
        const result = await base44.integrations.Core.UploadFile({ file });
        urls.push(result.file_url);
      }
      return urls;
    },
  });

  const submitReportMutation = useMutation({
    mutationFn: (data) => base44.entities.Report.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast.success("Report submitted. Thank you!");
      setOpen(false);
      setReason("");
      setDescription("");
      setPhotoFiles([]);
    },
  });

  const handleSubmit = async () => {
    const selectedReason = REPORT_REASONS.find(r => r.value === reason);
    
    if (selectedReason.descRequired && !description.trim()) {
      toast.error("Description is required for this report type");
      return;
    }

    if (selectedReason.photoRequired && photoFiles.length === 0) {
      toast.error("At least 1 photo is required for this report type");
      return;
    }

    if (photoFiles.length > 3) {
      toast.error("Maximum 3 photos allowed");
      return;
    }

    let photoUrls = [];
    if (photoFiles.length > 0) {
      photoUrls = await uploadPhotosMutation.mutateAsync(photoFiles);
    }

    submitReportMutation.mutate({
      listing_id: locationId,
      reporter_email: user?.email || null,
      reason,
      description: description.trim(),
      photo_urls: photoUrls,
      season_year: getCurrentSeasonYear(),
    });
  };

  const selectedReason = REPORT_REASONS.find(r => r.value === reason);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Flag className="w-4 h-4" />
          Report Issue
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Report an Issue</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason..." />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {reason && (
            <>
              <div className="space-y-2">
                <Label>
                  Description {selectedReason?.descRequired && <span className="text-red-500">*</span>}
                </Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide details..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Photos (Max 3) {selectedReason?.photoRequired && <span className="text-red-500">* Required</span>}
                </Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files).slice(0, 3);
                      setPhotoFiles(files);
                    }}
                    className="hidden"
                    id="report-photos"
                  />
                  <label htmlFor="report-photos" className="cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">
                      {photoFiles.length > 0
                        ? `${photoFiles.length} photo${photoFiles.length > 1 ? 's' : ''} selected`
                        : "Click to upload photos"}
                    </p>
                  </label>
                </div>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={submitReportMutation.isPending || uploadPhotosMutation.isPending}
                className="w-full"
              >
                {(submitReportMutation.isPending || uploadPhotosMutation.isPending) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Report"
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import ReportPhotoUploader from "./report/ReportPhotoUploader";

const REPORT_REASONS = [
  {
    group: "Safety / Illegal",
    items: [
      { code: "SAFETY_WEAPONS", label: "Weapons / dangerous items" },
      { code: "SAFETY_DRUGS", label: "Drugs / controlled substances" },
      { code: "SAFETY_STOLEN_GOODS", label: "Stolen goods" },
      { code: "SAFETY_THREAT", label: "Unsafe location / threat" },
      { code: "SAFETY_HARASSMENT_HATE", label: "Harassment / hate" },
    ],
  },
  {
    group: "Fraud / Misleading",
    items: [
      { code: "FRAUD_SCAM", label: "Scam / bait-and-switch" },
      { code: "FRAUD_FAKE_LISTING", label: "Fake listing / not real sale" },
      { code: "FRAUD_MISLEADING", label: "Misleading photos or description" },
      { code: "FRAUD_WRONG_LOCATION", label: "Wrong location / address inaccurate" },
      { code: "FRAUD_PRICING_DECEPTION", label: "Pricing deception" },
    ],
  },
  {
    group: "Content / Quality",
    items: [
      { code: "CONTENT_ADULT", label: "Explicit / adult content" },
      { code: "CONTENT_OFFENSIVE", label: "Offensive content" },
      { code: "QUALITY_DUPLICATE", label: "Duplicate listing" },
      { code: "QUALITY_WRONG_CATEGORY", label: "Wrong category" },
      { code: "QUALITY_NOT_YARD_SALE", label: "Not a yard sale (vendor/business ad)" },
    ],
  },
  {
    group: "Platform Abuse",
    items: [
      { code: "ABUSE_SPAM", label: "Spam" },
      { code: "ABUSE_REPEAT_OFFENDER", label: "Repeat offender / abuse" },
      { code: "ABUSE_TIER_CIRCUMVENT", label: "Circumventing tiers / policy" },
    ],
  },
  {
    group: "Other",
    items: [{ code: "OTHER", label: "Other (requires details)" }],
  },
];

const ALL_REASONS = REPORT_REASONS.flatMap((g) => g.items);

export default function ReportModal({ listingId, onClose }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [selectedCode, setSelectedCode] = useState("");
  const [otherDetails, setOtherDetails] = useState("");
  const [details, setDetails] = useState("");
  const [photos, setPhotos] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        toast.error("You must be logged in to report");
        onClose();
      }
    };

    fetchUser();
  }, [onClose]);

  const selectedReason = ALL_REASONS.find((r) => r.code === selectedCode);
  const isOther = selectedCode === "OTHER";

  const uploadPhotos = async () => {
    if (photos.length === 0) return [];

    const urls = [];
    for (const photo of photos) {
      const { file_url } = await base44.integrations.Core.UploadFile({
        file: photo.file,
      });
      urls.push(file_url);
    }
    return urls;
  };

  const reportMutation = useMutation({
    mutationFn: async (data) => {
      if (!user?.id) {
        throw new Error("User not logged in");
      }

      const existingReports = await base44.entities.Report.filter({
        listingId,
        reporterUserId: user.id,
      });

      const hasActiveReport = existingReports.some((report) => {
        const status = String(report.status || "").toLowerCase();
        return report.resolved !== true && status !== "closed" && status !== "resolved";
      });

      if (hasActiveReport) {
        throw new Error("You already reported this listing.");
      }

      let photo_urls = [];

      try {
        setIsUploading(true);

        if (photos.length > 0) {
          photo_urls = await uploadPhotos();
        }

        const report = await base44.entities.Report.create({
          ...data,
          photo_urls: photo_urls.length > 0 ? photo_urls : undefined,
          listingId,
          reporterUserId: user.id,
        });

        // Reporter Confirmation Notification
        try {
          const notif = await base44.entities.Notification.create({
            user_id: user.id,
            userId: user.id,
            type: "report_received",
            title: "Report Received",
            message: "Your report has been received and is under review.",
            related_entity_type: "report",
            related_entity_id: report.id,
            is_read: false,
            read: false,
          });
          console.log("Created Notification:", {
            user_id: notif.user_id || notif.userId,
            type: notif.type,
            title: notif.title,
            message: notif.message,
            related_entity_type: notif.related_entity_type,
            related_entity_id: notif.related_entity_id,
            created_at: notif.created_date
          });
        } catch (err) {
          console.error("Failed to create reporter confirmation notification:", err);
        }

        // Secondary step only — should not fail the whole report
        try {
          const listings = await base44.entities.Listing.filter({ id: listingId });
          if (listings?.[0]) {
            await base44.entities.Listing.update(listingId, {
              reportCount: (listings[0].reportCount || 0) + 1,
              lastReportedAt: new Date().toISOString(),
            });
          }
        } catch (err) {
          console.error(
            "Report created successfully, but failed to update listing report count:",
            err
          );
        }

        return report;
      } finally {
        setIsUploading(false);
      }
    },

    onSuccess: () => {
      photos.forEach((p) => {
        if (p.preview) URL.revokeObjectURL(p.preview);
      });

      toast.success("Report submitted successfully");
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      queryClient.invalidateQueries({ queryKey: ["listing", listingId] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      onClose();
    },

    onError: (error) => {
      console.error("Report submission failed:", error);
      toast.error(error.message || "Failed to submit report");
    },
  });

  const isSubmitting = reportMutation.isPending || isUploading;

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!selectedCode) {
      toast.error("Please select a reason");
      return;
    }

    if (isOther && !otherDetails.trim()) {
      toast.error("Please provide details for your report");
      return;
    }

    reportMutation.mutate({
      reason: selectedReason?.label || selectedCode,
      reason_code: selectedCode,
      reason_label: selectedReason?.label || selectedCode,
      details: details?.trim() || undefined,
      other_details: isOther ? otherDetails.trim() : undefined,
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="z-[9999] max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report Listing</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Reason *</Label>
            <Select value={selectedCode} onValueChange={setSelectedCode}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((group, groupIdx) => (
                  <React.Fragment key={group.group}>
                    <div
                      className={`px-2 py-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider cursor-default pointer-events-none select-none mb-1 ${
                        groupIdx > 0 ? "mt-3 border-t border-gray-200 pt-3" : ""
                      }`}
                    >
                      {group.group}
                    </div>
                    {group.items.map((item) => (
                      <SelectItem
                        key={item.code}
                        value={item.code}
                        className="cursor-pointer hover:bg-gray-100"
                      >
                        {item.label}
                      </SelectItem>
                    ))}
                  </React.Fragment>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Choose the closest match.
            </p>
          </div>

          {isOther && (
            <div>
              <Label>Please describe the issue *</Label>
              <Textarea
                placeholder="What's the problem with this listing?"
                value={otherDetails}
                onChange={(e) => setOtherDetails(e.target.value)}
                rows={3}
              />
            </div>
          )}

          <div>
            <Label>Additional details (optional)</Label>
            <Textarea
              placeholder="Provide any extra information..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
            />
          </div>

          <ReportPhotoUploader photos={photos} onPhotosChange={setPhotos} />

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isUploading ? "Uploading photos…" : "Submitting report…"}
                </span>
              ) : (
                "Submit Report"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
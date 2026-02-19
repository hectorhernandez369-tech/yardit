import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function ReportModal({ listingId, onClose }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    reason: "",
    details: ""
  });

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
  }, []);

  const reportMutation = useMutation({
    mutationFn: async (data) => {
      const report = await base44.entities.Report.create({
        ...data,
        listingId,
        reporterUserId: user.id,
      });

      // Update listing report count
      const listings = await base44.entities.Listing.filter({ id: listingId });
      if (listings[0]) {
        await base44.entities.Listing.update(listingId, {
          reportCount: (listings[0].reportCount || 0) + 1,
          lastReportedAt: new Date().toISOString(),
        });
      }

      return report;
    },
    onSuccess: () => {
      toast.success("Report submitted successfully");
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      onClose();
    },
    onError: () => {
      toast.error("Failed to submit report");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.reason) {
      toast.error("Please select a reason");
      return;
    }
    reportMutation.mutate(formData);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="z-[9999]">
        <DialogHeader>
          <DialogTitle>Report Listing</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Reason *</Label>
            <Select
              value={formData.reason}
              onValueChange={(value) => setFormData(prev => ({ ...prev, reason: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="safety_hazard">Safety Hazard</SelectItem>
                <SelectItem value="abuse">Abuse</SelectItem>
                <SelectItem value="scam">Scam</SelectItem>
                <SelectItem value="spam">Spam</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Details (optional)</Label>
            <Textarea
              placeholder="Provide additional information..."
              value={formData.details}
              onChange={(e) => setFormData(prev => ({ ...prev, details: e.target.value }))}
              rows={4}
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={reportMutation.isPending}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {reportMutation.isPending ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
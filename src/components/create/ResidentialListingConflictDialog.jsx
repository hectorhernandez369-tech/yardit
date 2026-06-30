import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, UserRound } from "lucide-react";
import { toast } from "sonner";

function prettyDate(value) {
  if (!value) return "Not set";
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ResidentialListingConflictDialog({ open, conflict, onClose, onRequested }) {
  const [isRequesting, setIsRequesting] = useState(false);
  const listing = conflict?.listing || conflict?.conflict?.listing || null;
  const existingRequest = conflict?.existing_request || conflict?.conflict?.existing_request || null;

  if (!listing) return null;

  const dateText = listing.selectedRangeStartDate && listing.selectedRangeEndDate
    ? `${prettyDate(listing.selectedRangeStartDate)} – ${prettyDate(listing.selectedRangeEndDate)}`
    : "Dates unavailable";
  const timeText = listing.openTime && listing.closeTime ? `${listing.openTime} – ${listing.closeTime}` : "Open hours unavailable";
  const alreadyRequested = existingRequest?.status === "pending";
  const alreadyApproved = existingRequest?.status === "approved";
  const canRequest = !conflict?.is_owner && !alreadyRequested && !alreadyApproved;

  const requestAccess = async () => {
    setIsRequesting(true);
    try {
      const response = await base44.functions.invoke("manageResidentialAccessRequest", {
        action: "request",
        listing_id: listing.id,
      });
      if (response?.data?.already_pending) {
        toast.info("You already requested access to this sale.");
      } else {
        toast.success("Household access request sent.");
      }
      onRequested?.();
      onClose?.();
    } catch (error) {
      toast.error(error?.response?.data?.error || error?.message || "Could not send request.");
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose?.()}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle>Yard sale already planned</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            There’s already a yard sale planned at this address for those dates.
          </p>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900">{listing.title || "Yard Sale"}</h3>
                <p className="text-xs text-slate-500 mt-1">Existing listing summary</p>
              </div>
              <Badge variant="outline" className="capitalize bg-white text-amber-700 border-amber-200">
                {listing.status || "active"}
              </Badge>
            </div>

            <div className="grid gap-2 text-sm text-slate-700">
              <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-amber-600" /> {dateText}</div>
              <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-amber-600" /> {timeText}</div>
              {listing.creator_name && <div className="flex items-center gap-2"><UserRound className="h-4 w-4 text-amber-600" /> {listing.creator_name}</div>}
            </div>
          </div>

          {alreadyRequested && <p className="rounded-xl bg-blue-50 p-3 text-sm font-medium text-blue-700">You already requested access to this sale.</p>}
          {alreadyApproved && <p className="rounded-xl bg-green-50 p-3 text-sm font-medium text-green-700">You already have household access to this sale.</p>}
          {conflict?.is_owner && <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">This is your existing listing. Please edit that sale instead of creating a duplicate.</p>}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose}>Choose different dates</Button>
            {canRequest && (
              <Button type="button" disabled={isRequesting} onClick={requestAccess} className="bg-[#5DADA5] hover:bg-[#4A9B93] text-white">
                {isRequesting ? "Sending..." : "This is my household’s sale"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
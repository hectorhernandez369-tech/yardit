import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { normalizeNeighborhoodJoinStatus } from "@/lib/neighborhoodSaleState";

/**
 * Shows a Sale Time editor for participant yard_sale listings that are part of a Neighborhood Sale.
 * Only renders when the listing is listingType="yard_sale" with a neighborhood_sale_id and pending/approved join status.
 */
export default function EditParticipantSaleTime({ listing, startDate, setStartDate, startTime, setStartTime, endDate, setEndDate, endTime, setEndTime }) {
  const isParticipant =
    listing?.listingType === "yard_sale" &&
    listing?.neighborhood_sale_id &&
    ["pending", "approved"].includes(normalizeNeighborhoodJoinStatus(listing?.neighborhood_join_status));

  if (!isParticipant) return null;

  return (
    <div className="space-y-3 rounded-lg border border-[#2C4F4E]/20 bg-[#F3E6CF]/50 p-4">
      <Label className="text-[#2C4F4E] font-semibold block">Sale Time</Label>
      <p className="text-xs text-slate-500">
        Set your personal yard sale start and end time. Dates must overlap the Neighborhood Sale window.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-slate-500 mb-1 block">Start Date</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-white border-[#2C4F4E]" />
        </div>
        <div>
          <Label className="text-xs text-slate-500 mb-1 block">Start Time</Label>
          <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="bg-white border-[#2C4F4E]" />
        </div>
        <div>
          <Label className="text-xs text-slate-500 mb-1 block">End Date</Label>
          <Input type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} className="bg-white border-[#2C4F4E]" />
        </div>
        <div>
          <Label className="text-xs text-slate-500 mb-1 block">End Time</Label>
          <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="bg-white border-[#2C4F4E]" />
        </div>
      </div>
    </div>
  );
}
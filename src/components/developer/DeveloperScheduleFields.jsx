import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function DeveloperScheduleFields({ formData, setFormData }) {
  const event = formData.listingType === "event";
  const halloween = formData.listingType === "halloween_spot";
  const fields = event ? ["event_start_date", "event_end_date", "event_start_time", "event_end_time"] : halloween ? ["halloween_start_date", "halloween_end_date", "halloween_start_time", "halloween_end_time"] : ["selectedRangeStartDate", "selectedRangeEndDate", "openTime", "closeTime"];
  const labels = ["Start date", "End date", "Opens at", "Closes at"];
  return (
    <section className="space-y-4 rounded-xl border bg-card p-4 text-card-foreground">
      <div>
        <h3 className="text-sm font-semibold">Developer schedule</h3>
        <p className="mt-1 text-xs text-muted-foreground">Choose any dates and hours. Weekend, advance-booking, and tier-duration restrictions are bypassed.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields.map((field, index) => <div key={field} className="space-y-1.5">
          <Label htmlFor={`developer-${field}`}>{labels[index]}</Label>
          <Input id={`developer-${field}`} type={index < 2 ? "date" : "time"} value={formData[field] || ""} onChange={(event) => setFormData((prev) => ({ ...prev, [field]: event.target.value }))} />
        </div>)}
      </div>
      {formData.listingType === "yard_sale" && formData.tier === "premium" && <div className="space-y-1.5">
        <Label htmlFor="developer-early-days">Early visibility days</Label>
        <Input id="developer-early-days" type="number" min="0" step="1" value={formData.earlyVisibilityDays || 0} onChange={(event) => setFormData((prev) => ({ ...prev, earlyVisibilityDays: Math.max(0, Math.floor(Number(event.target.value) || 0)) }))} />
      </div>}
    </section>
  );
}
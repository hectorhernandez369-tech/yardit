import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DeveloperReviewStep({ listing, onPublish, onBack, isProcessing, errorMessage }) {
  const start = listing.event_start_date || listing.halloween_start_date || listing.selectedRangeStartDate;
  const end = listing.event_end_date || listing.halloween_end_date || listing.selectedRangeEndDate;
  const rows = [
    ["Title", listing.event_name || listing.title],
    ["Location", listing.display_address || listing.address_text || [listing.addressText, listing.city, listing.state, listing.zip].filter(Boolean).join(", ")],
    ["Dates", start ? `${start}${end && end !== start ? ` to ${end}` : ""}` : ""],
    ["Hours", [listing.event_start_time || listing.halloween_start_time || listing.openTime, listing.event_end_time || listing.halloween_end_time || listing.closeTime].filter(Boolean).join(" to ")],
    ["Tier", listing.listingType === "neighborhood_sale" ? "Neighborhood Sale" : listing.listingType === "event" ? "Community Event" : listing.tier],
  ];
  return (
    <section className="space-y-5 text-card-foreground">
      <div><h2 className="text-xl font-semibold">Review developer listing</h2><p className="mt-1 text-sm text-muted-foreground">A normal listing with payment waived. Its schedule determines when it appears publicly.</p></div>
      <dl className="divide-y divide-border rounded-xl border bg-card px-4">
        {rows.map(([label, value]) => <div key={label} className="py-3"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{value || "Not entered"}</dd></div>)}
      </dl>
      <div className="flex items-center justify-between rounded-xl bg-secondary p-4"><span className="text-sm font-medium">Total due · Developer</span><strong className="text-xl">$0.00</strong></div>
      {errorMessage && <p role="alert" className="text-sm text-destructive">{errorMessage}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Button type="button" variant="outline" onClick={onBack} disabled={isProcessing}>Back</Button>
        <Button type="button" onClick={onPublish} disabled={isProcessing}>{isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Publishing…</> : "Publish without payment"}</Button>
      </div>
    </section>
  );
}
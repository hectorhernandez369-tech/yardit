import React from "react";
import PublicListingCard from "@/components/listing/PublicListingCard";
import { buildListViewResults } from "@/lib/listViewPipeline";
import { makeEventPreview } from "@/components/create/event/eventPreviewData";

export default function EventVisibilityExample({ listing, onDetails }) {
  const other = makeEventPreview({}, { ...listing, id: "addon-comparison", title: "Nearby Craft Market", event_name: "Nearby Craft Market", event_add_ons: {} });
  const rows = buildListViewResults({ listings: [other, listing], vendorEvents: [], userLocation: { lat: listing.lat, lng: listing.lng }, filters: { tiers: ["all"], types: [], categories: [], dateFilter: "all" } });
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">Same-location list comparison</p>
      <p className="text-xs text-muted-foreground">These two sample events are equally near. Enhanced priority breaks this tie ahead of a standard event. Closer events still sort first; this is not guaranteed top placement.</p>
      {rows.map((row) => <PublicListingCard key={row.id} listing={row} onView={() => onDetails(row)} viewLabel="View Example Details" />)}
    </div>
  );
}
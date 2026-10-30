import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import EventExampleMap from "@/components/create/event/EventExampleMap";
import EventExampleDetail from "@/components/create/event/EventExampleDetail";
import EventVisibilityExample from "@/components/create/event/EventVisibilityExample";
import PublicListingCard from "@/components/listing/PublicListingCard";
import { makeEventPreview, SAMPLE_LOGO } from "@/components/create/event/eventPreviewData";

export default function EventMapAddOnPreview({ kind, data = {} }) {
  const [effect, setEffect] = useState(data.event_animation || "pulse");
  const [enhanced, setEnhanced] = useState(false);
  const [stage, setStage] = useState("mini");
  const [details, setDetails] = useState(null);
  const custom = kind === "custom_icon" && enhanced;
  const coming = kind === "coming_soon";
  const future = new Date(Date.now() + Number(data.coming_soon_package || 3) * 86400000).toISOString();
  const listing = makeEventPreview(data, {
    event_add_ons: { premium_visibility: kind === "premium_visibility" && enhanced, animation: kind === "animation", custom_icon: custom, marquee: kind === "marquee" },
    event_icon: ["animation", "custom_icon", "marquee"].includes(kind) ? "heart" : data.event_icon || "heart",
    event_animation: kind === "animation" ? effect : "",
    event_logo_url: custom ? (data.event_logo_url || SAMPLE_LOGO) : "",
    marquee_background_url: kind === "marquee" ? data.marquee_background_url : "",
    ...(coming ? { startDateTime: future, endDateTime: new Date(new Date(future).getTime() + 3600000).toISOString(), coming_soon_package: String(data.coming_soon_package || 3), coming_soon_start_date: new Date().toISOString(), mapState: "coming_soon" } : {}),
  });
  return (
    <div className="min-w-0 space-y-4">
      {kind === "animation" && <div className="flex flex-wrap gap-2">{["pulse", "bounce"].map((value) => <Button key={value} type="button" variant={effect === value ? "default" : "outline"} aria-pressed={effect === value} onClick={() => setEffect(value)} className="capitalize">{value}</Button>)}</div>}
      {["premium_visibility", "custom_icon"].includes(kind) && <div className="grid grid-cols-2 gap-2">{[false, true].map((value) => <Button key={String(value)} type="button" variant={enhanced === value ? "default" : "outline"} aria-pressed={enhanced === value} onClick={() => setEnhanced(value)}>{value ? kind === "custom_icon" ? "Uploaded Logo" : "Enhanced" : "Standard"}</Button>)}</div>}
      {kind === "marquee" && <div className="flex flex-wrap gap-2">{["mini", "collapsed", "expanded"].map((value) => <Button key={value} type="button" size="sm" variant={stage === value ? "default" : "outline"} aria-pressed={stage === value} onClick={() => setStage(value)}>{value === "mini" ? "Map Marker" : value === "collapsed" ? "Board" : "Expanded View"}</Button>)}</div>}
      <EventExampleMap listing={listing} marqueeStage={stage} onStage={setStage} onDetails={() => setDetails(listing)} />
      <p className="text-xs text-muted-foreground">The actual Yardit marker renderer on the same street-map style. Tap the marker to explore; location, schedule and standard category icon are illustrative.{custom && !data.event_logo_url ? " The festival logo is a sample upload." : ""}</p>
      {kind === "premium_visibility" && <EventVisibilityExample listing={listing} onDetails={setDetails} />}
      {coming && <PublicListingCard listing={listing} viewLabel="View Example Details" onView={() => setDetails(listing)} />}
      {details && <><Button type="button" size="sm" variant="outline" onClick={() => setDetails(null)}>Close Example Details</Button><EventExampleDetail data={details} kind="details" /></>}
    </div>
  );
}
import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import EventFlyerDisplay from "@/components/listing/EventFlyerDisplay";
import ListingPhotoGallery from "@/components/listing/ListingPhotoGallery";
import { SAMPLE_FLYER, SAMPLE_PHOTOS } from "@/components/create/event/eventPreviewData";

export default function EventExampleDetail({ data = {}, kind = "flyer_upload" }) {
  const [index, setIndex] = useState(0);
  const title = data.event_name || data.title || "Community Festival";
  const uploaded = data.event_photos?.length ? data.event_photos : data.photoUrls || [];
  const photos = [...uploaded, ...SAMPLE_PHOTOS].slice(0, Math.max(uploaded.length, 3));
  const current = index % photos.length;
  return (
    <section className="min-w-0 space-y-4 rounded-xl border bg-card p-3 text-card-foreground">
      <p className="text-xs font-semibold text-muted-foreground">Event detail page • illustrative content</p>
      {kind === "flyer_upload" && <EventFlyerDisplay flyerUrl={data.event_flyer_url || SAMPLE_FLYER} title={title} />}
      {kind === "photo_gallery" && <>
        <ListingPhotoGallery images={photos} selectedIndex={current} onIndexChange={setIndex} title={title} />
        <div className="flex items-center justify-between gap-2"><Button type="button" size="icon" variant="outline" aria-label="Previous example photo" onClick={() => setIndex((current + photos.length - 1) % photos.length)}><ChevronLeft className="h-4 w-4" /></Button><span className="text-xs">Photo {current + 1} of {photos.length}</span><Button type="button" size="icon" variant="outline" aria-label="Next example photo" onClick={() => setIndex((current + 1) % photos.length)}><ChevronRight className="h-4 w-4" /></Button></div>
        <p className="text-xs text-muted-foreground">{uploaded.length ? "Your uploads appear first; any additional photos here are samples only." : "Sample venue and performance photos, not event uploads."}</p>
      </>}
      <div className="space-y-2 break-words"><p className="text-xs font-semibold text-muted-foreground">Community Event</p><h3 className="text-xl font-bold">{title}</h3><p className="text-sm text-muted-foreground">Community Park • Sample schedule</p><p className="text-sm">Music, food and family activities. This example does not publish an event.</p></div>
    </section>
  );
}
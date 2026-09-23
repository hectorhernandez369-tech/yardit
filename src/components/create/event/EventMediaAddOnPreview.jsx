import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Image, PartyPopper, Trees, Music } from "lucide-react";

export default function EventMediaAddOnPreview({ kind, data = {} }) {
  const [index, setIndex] = useState(0);
  const gallery = kind === "photo_gallery";
  const photos = data.event_photos || data.photoUrls || [];
  const count = photos.length || 3;
  const current = index % count;
  const samples = [Trees, Music, PartyPopper];
  const Sample = samples[current % samples.length];
  const image = gallery ? photos[current] : data.event_flyer_url;
  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      <div className="flex min-h-36 items-center justify-center bg-secondary p-3">
        {image ? <img src={image} alt={gallery ? `Gallery preview ${current + 1}` : "Your event flyer preview"} className="h-32 w-full object-contain" /> : gallery ? <div className="text-center text-secondary-foreground"><Sample className="mx-auto mb-2 h-12 w-12" /><p className="text-xs">{["Venue", "Activities", "Past event highlights"][current]}</p></div> : <div className="w-full rounded border-2 border-accent bg-background p-3 text-center"><Image className="mx-auto mb-1 h-6 w-6 text-primary" /><p className="break-words text-base font-bold">{data.event_name || data.title || "Community Festival"}</p><p className="mt-1 text-xs text-muted-foreground">Your flyer artwork goes here</p></div>}
      </div>
      <div className="flex items-center justify-between gap-2 p-2 text-xs">
        <span>{gallery ? `${current + 1} / ${count}${photos.length ? "" : " examples"}` : "Event page • flyer image"}</span>
        {gallery && <div className="flex gap-1"><button type="button" aria-label="Previous preview photo" onClick={() => setIndex((current + count - 1) % count)} className="rounded border p-2"><ChevronLeft className="h-4 w-4" /></button><button type="button" aria-label="Next preview photo" onClick={() => setIndex((current + 1) % count)} className="rounded border p-2"><ChevronRight className="h-4 w-4" /></button></div>}
      </div>
    </div>
  );
}
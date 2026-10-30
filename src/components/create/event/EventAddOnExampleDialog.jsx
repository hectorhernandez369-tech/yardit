import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import EventMapAddOnPreview from "@/components/create/event/EventMapAddOnPreview";
import EventMediaAddOnPreview from "@/components/create/event/EventMediaAddOnPreview";
import { eventAddOnCopy } from "@/components/create/event/eventAddOnCopy";

export default function EventAddOnExampleDialog({ kind, title, data }) {
  const [open, setOpen] = useState(false);
  const Preview = ["flyer_upload", "photo_gallery"].includes(kind) ? EventMediaAddOnPreview : EventMapAddOnPreview;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button type="button" size="sm" variant="outline" aria-label={`See Example: ${title}`}>See Example</Button></DialogTrigger>
      <DialogContent className="top-[calc(var(--yardit-safe-area-top,0px)_+_1rem)] w-[calc(100vw_-_2rem)] max-w-xl translate-y-0 overflow-x-hidden p-4 sm:top-1/2 sm:-translate-y-1/2 sm:p-6" style={{ maxHeight: "calc(100dvh - var(--yardit-safe-area-top, 0px) - var(--yardit-safe-area-bottom, 0px) - 7rem)" }}>
        <DialogHeader className="min-w-0 pr-6 text-left"><DialogTitle className="break-words">{title} • Example</DialogTitle><DialogDescription>{eventAddOnCopy[kind]?.details}</DialogDescription></DialogHeader>
        {open && <Preview kind={kind} data={data} />}
        <p className="text-xs text-muted-foreground">Illustrative only. Sample map, schedule and content; nothing is published, saved or added to your total by using this preview.</p>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Back to Add-Ons</Button>
      </DialogContent>
    </Dialog>
  );
}
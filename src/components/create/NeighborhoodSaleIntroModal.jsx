import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { CheckCircle2, DollarSign, MapPin, PartyPopper, Sparkles, Users } from "lucide-react";

export default function NeighborhoodSaleIntroModal({ open, onClose, acknowledged, onAcknowledgedChange, hideAgain, onHideAgainChange, onContinue }) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border-0 p-0 bg-[#F3E6CF]">
        <div className="shrink-0 bg-gradient-to-br from-[#5DADA5] via-[#4A9B93] to-[#2C4F4E] text-white px-6 py-2">
          <DialogHeader>
            <div className="mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/15">
              <PartyPopper className="h-3 w-3 text-[#F4A849]" />
            </div>
            <DialogTitle className="text-center text-base font-bold">Create a Neighborhood Sale</DialogTitle>
            <p className="text-center text-[10px] text-white/90 mt-0.5 max-w-lg mx-auto">
              Turn multiple individual yard sales into one larger community event.
            </p>
          </DialogHeader>
        </div>

        <div className="space-y-5 text-sm text-slate-700 leading-relaxed overflow-y-auto min-h-0 px-6 py-5">
          <section className="rounded-2xl border border-[#2C4F4E]/15 bg-white/80 p-4 shadow-sm">
            <p>
              A Neighborhood Sale allows multiple homes in the same area to participate under a single event. Instead of shoppers discovering one yard sale at a time, they discover an entire neighborhood of sales in one place.
            </p>
            <p className="mt-3">
              Yardit helps organize the event, display participating homes on the map, and make the sale easier for shoppers to find and navigate.
            </p>
          </section>

          <section className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
            <div className="flex items-center gap-2 mb-3 text-emerald-900 font-bold">
              <Sparkles className="h-5 w-5" />
              <h3>How Neighborhood Sales Work</h3>
            </div>
            <ol className="space-y-2 text-emerald-950">
              {["Create the Neighborhood Sale event.", "Invite nearby neighbors to participate.", "Neighbors request to join or accept invitations.", "Approved homes become part of the event.", "Once enough homes join, the event activates and becomes visible to shoppers."].map((item, index) => (
                <li key={item} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#5DADA5] text-xs font-bold text-white">{index + 1}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-emerald-950">
              Each participating home manages its own yard sale listing while benefiting from being part of a larger community event.
            </p>
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-2xl border border-[#5DADA5]/25 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3 text-[#2C4F4E] font-bold">
                <MapPin className="h-5 w-5 text-[#5DADA5]" />
                <h3>What Yardit Does</h3>
              </div>
              <p className="mb-2">Yardit helps you:</p>
              <ul className="space-y-1.5">
                {["Organize participating homes", "Manage join requests and invitations", "Display all participating homes on the map", "Create a larger destination for shoppers", "Make it easier for visitors to find every sale in the neighborhood"].map((item) => (
                  <li key={item} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#5DADA5]" />{item}</li>
                ))}
              </ul>
              <p className="mt-3 font-medium text-[#2C4F4E]">Think of Yardit as the event organizer&apos;s toolkit.</p>
            </section>

            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3 text-amber-950 font-bold">
                <Users className="h-5 w-5 text-[#F4A849]" />
                <h3>What Yardit Does NOT Do</h3>
              </div>
              <p>Yardit helps organize the event, but the most successful Neighborhood Sales still involve personal invitations.</p>
              <p className="mt-3 mb-2">Hosts who get the best results usually:</p>
              <ul className="space-y-1.5 list-disc pl-5">
                <li>Talk to neighbors directly</li>
                <li>Share their Yardit event link</li>
                <li>Invite nearby streets and friends</li>
                <li>Promote the event through their community</li>
              </ul>
              <p className="mt-3 font-medium text-amber-950">The more participating homes you have, the stronger the event becomes.</p>
            </section>
          </div>

          <section className="rounded-2xl border-2 border-[#F4A849] bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3 text-[#2C4F4E] font-bold">
              <DollarSign className="h-5 w-5 text-[#F4A849]" />
              <h3>Pricing</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-[#F3E6CF] p-3">
                <p className="font-bold text-[#2C4F4E]">Host Pays</p>
                <ul className="mt-2 space-y-1 list-disc pl-5">
                  <li>$10 base event fee</li>
                  <li>$2 per approved participating home</li>
                  <li>Maximum charge: $50</li>
                </ul>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-950">
                <p className="font-bold">Participants Pay</p>
                <p className="mt-2 text-2xl font-black">FREE</p>
                <p className="text-xs mt-1">Participants are never charged to join a Neighborhood Sale.</p>
              </div>
            </div>
            <p className="mt-3 text-slate-700">You are only charged if enough homes join to activate the event.</p>
          </section>

          <section className="rounded-2xl bg-gradient-to-r from-[#2C4F4E] to-[#006168] p-4 text-white shadow-sm">
            <h3 className="font-bold mb-2">Why Neighborhood Sales Work</h3>
            <p>A larger event attracts more shoppers than a single yard sale.</p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {["More shopper traffic", "Longer shopper visits", "Better visibility for every participating home", "A stronger overall event experience", "Increased exposure across the neighborhood"].map((item) => (
                <li key={item} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#F4A849]" />{item}</li>
              ))}
            </ul>
            <p className="mt-4 rounded-xl bg-white/15 px-3 py-2 text-center font-bold">More Homes = More Traffic</p>
            <p className="mt-2 text-center text-sm text-white/90">The most successful Neighborhood Sales are the ones where neighbors work together.</p>
          </section>

          <div className="space-y-3 pt-1">
            <label className="flex items-start gap-3 rounded-xl border border-[#2C4F4E]/20 bg-white p-3 cursor-pointer shadow-sm">
              <Checkbox checked={acknowledged} onCheckedChange={(checked) => onAcknowledgedChange(checked === true)} />
              <span>I understand that I should invite neighbors and use Yardit as the organizing tool.</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer text-slate-600">
              <Checkbox checked={hideAgain} onCheckedChange={(checked) => onHideAgainChange(checked === true)} />
              <span>Don&apos;t show this again.</span>
            </label>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-[#2C4F4E]/10 bg-white/85 px-6 py-4">
          <Button onClick={onContinue} disabled={!acknowledged} className="w-full bg-[#F4A849] hover:bg-[#E39635] text-[#2C4F4E] border-2 border-[#2C4F4E] font-bold shadow-md">
            Continue Creating Event
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
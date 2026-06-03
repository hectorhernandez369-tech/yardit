import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

const NEIGHBORHOOD_INTRO_HIDE_KEY = "yardit_hide_neighborhood_sale_intro";

export default function NeighborhoodIntroModal({ open, onClose, onContinue }) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [hideAgain, setHideAgain] = useState(false);

  const resetAndClose = () => {
    setAcknowledged(false);
    setHideAgain(false);
    onClose?.();
  };

  const handleContinue = () => {
    if (!acknowledged) return;
    if (hideAgain) localStorage.setItem(NEIGHBORHOOD_INTRO_HIDE_KEY, "true");
    setAcknowledged(false);
    setHideAgain(false);
    onContinue?.();
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) resetAndClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>Before You Create a Neighborhood Sale</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm text-slate-600 leading-relaxed overflow-y-auto min-h-0 pr-1">
          <p>A Neighborhood Sale is a hosted group yard sale where multiple homes participate together. Yardit helps organize, map, and promote the event so shoppers see a stronger destination.</p>
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-emerald-900">
            <p className="font-semibold">Pricing</p>
            <p>$19.99 base + $2 per participating home. Neighborhood Sales require enough participating homes to activate, and participants are never charged.</p>
          </div>
          <p>Neighborhood Sales work best when the host invites neighbors in person. Yardit is the tool to organize, map, and manage the sale — it does not magically create participants. Talk to neighbors, hand out links or cards, and encourage them to join.</p>
          <p>This is best for streets with several families doing sales, cul-de-sacs organizing together, HOA/community weekends, and neighbors who want more shopper traffic together.</p>
          <p className="font-medium text-slate-800">More homes = a stronger event and a better destination for shoppers.</p>

          <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 cursor-pointer">
            <Checkbox checked={acknowledged} onCheckedChange={(checked) => setAcknowledged(checked === true)} />
            <span>I understand that I should invite/solicit neighbors and use Yardit as the organizing tool.</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox checked={hideAgain} onCheckedChange={(checked) => setHideAgain(checked === true)} />
            <span>Do not show again</span>
          </label>
        </div>

        <DialogFooter className="shrink-0 pt-4">
          <Button onClick={handleContinue} disabled={!acknowledged} className="bg-[#006168] hover:bg-[#004d52] text-white">
            I Understand — Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
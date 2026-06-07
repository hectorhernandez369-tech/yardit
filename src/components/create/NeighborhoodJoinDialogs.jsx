import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function NeighborhoodJoinDialogs({ saleModalStep, setSaleModalStep, matchedSale, setJoinAction, setStep, executeSubmit }) {
  return (
    <>
      <Dialog
        open={saleModalStep === 1}
        onOpenChange={(open) => {
          if (!open) {
            setJoinAction("none");
            setSaleModalStep(0);
            setStep(3);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neighborhood event in your area</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-700 mb-2">There is a Neighborhood Sale in your area. Request to Join?</p>
            <p className="text-sm text-slate-600">
              {matchedSale?.startDateTime ? new Date(matchedSale.startDateTime).toLocaleDateString() : ""}
              {matchedSale?.endDateTime ? ` - ${new Date(matchedSale.endDateTime).toLocaleDateString()}` : ""}
            </p>
          </div>
          <DialogFooter className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { setJoinAction("none"); setSaleModalStep(0); setStep(3); }}>NO THANKS</Button>
            <Button onClick={() => setSaleModalStep(2)} className="bg-amber-600 hover:bg-amber-700">ASK TO JOIN</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={saleModalStep === 2} onOpenChange={(open) => !open && setSaleModalStep(0)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Important</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-700 whitespace-pre-line leading-relaxed">
              Joining a Neighborhood Sale creates a Neighborhood participant listing and skips normal tier/payment checkout.{"\n"}
              If this Neighborhood Sale is canceled or your participation is removed, you will need to create a normal listing to appear independently.
            </p>
          </div>
          <DialogFooter className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { setJoinAction("none"); setSaleModalStep(0); setStep(3); }}>CANCEL</Button>
            <Button onClick={() => { setJoinAction("requested"); setSaleModalStep(0); executeSubmit("requested"); }} className="bg-amber-600 hover:bg-amber-700">REQUEST TO JOIN</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
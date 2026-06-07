import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, ShieldCheck } from "lucide-react";

export default function ConfirmHomeAddressModal({ open, address, isConfirming, onCancel, onConfirm }) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel?.()}>
      <DialogContent className="sm:max-w-md rounded-3xl bg-gradient-to-b from-[#F3E6CF] to-white border-0 shadow-xl">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#5DADA5]/15">
            <ShieldCheck className="h-6 w-6 text-[#006168]" />
          </div>
          <DialogTitle className="text-2xl font-bold text-[#2C4F4E]">Confirm Your Home Address</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm leading-relaxed text-[#2C4F4E]/80">
          <p>Yardit requires one confirmed home address before you can post residential yard sales.</p>
          <p>This helps keep listings accurate and prevents one account from creating yard sales at multiple unrelated homes.</p>
          <p className="font-medium text-[#2C4F4E]">Please confirm this is your home address:</p>
          <div className="rounded-2xl border border-[#5DADA5]/25 bg-white/75 p-4 text-[#2C4F4E] shadow-sm">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#006168]" />
              <span className="font-semibold">{address}</span>
            </div>
          </div>
          <p>Once confirmed, this address will be used as your Yardit home address for residential listings.</p>
        </div>

        <DialogFooter className="mt-4 flex gap-2 sm:gap-3">
          <Button variant="outline" onClick={onCancel} disabled={isConfirming} className="flex-1 rounded-xl">
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isConfirming} className="flex-1 rounded-xl bg-[#006168] hover:bg-[#004d52] text-white">
            {isConfirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Confirm Address
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
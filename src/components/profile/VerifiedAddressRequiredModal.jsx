import React from "react";
import { MapPin, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function VerifiedAddressRequiredModal({ open, onOpenChange, onAddNow }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-2 border-[#2C4F4E] bg-[#F3E6CF] p-0 overflow-hidden">
        <div className="bg-[#5DADA5] px-6 py-5 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl text-white">
              <ShieldCheck className="h-6 w-6" />
              Verified address needed
            </DialogTitle>
            <DialogDescription className="text-white/90">
              Please verify your primary address in My Profile before adding a listing.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 p-6">
          <div className="rounded-xl border border-[#2C4F4E]/25 bg-white p-4 text-sm leading-relaxed text-[#2C4F4E]">
            Yardit requires a verified address to keep listings accurate and protect the community.
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Not Now
            </Button>
            <Button
              type="button"
              onClick={onAddNow}
              className="bg-[#F4A849] text-[#2C4F4E] border-2 border-[#2C4F4E] hover:bg-[#E39635] font-semibold"
            >
              <MapPin className="h-4 w-4" />
              Add Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
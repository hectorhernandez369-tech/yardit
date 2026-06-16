import React from "react";
import { Compass, Search, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export default function VendorOnboardingSheet({ open, onOpenChange, onBecomeVendor, onBrowseOpportunities, onContinueHunt }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="z-[1400] sm:hidden rounded-t-3xl border-0 bg-white p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <SheetHeader className="text-left">
          <SheetTitle>Vendor</SheetTitle>
        </SheetHeader>
        <div className="mt-3 rounded-2xl bg-[#F3E6CF] p-4 text-sm text-[#2C4F4E]">
          Discover food trucks, pop-ups, and local vendor opportunities around Yardit.
        </div>
        <div className="mt-4 space-y-2">
          <Button onClick={onBecomeVendor} className="h-12 w-full rounded-2xl bg-[#006168] text-white hover:bg-[#004d52] gap-2">
            <Store className="h-4 w-4" /> Become a Vendor
          </Button>
          <Button onClick={onBrowseOpportunities} variant="outline" className="h-12 w-full rounded-2xl gap-2">
            <Search className="h-4 w-4" /> Browse Vendor Opportunities
          </Button>
          <Button onClick={onContinueHunt} variant="ghost" className="h-12 w-full rounded-2xl gap-2 text-slate-600">
            <Compass className="h-4 w-4" /> Continue to Hunt Mode
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
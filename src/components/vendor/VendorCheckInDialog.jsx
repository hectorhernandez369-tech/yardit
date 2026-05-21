import React from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

/**
 * VendorCheckInDialog — directs vendors to VendorPinPreview for
 * map-based GPS pin drop + public display address flow.
 * Raw lat/lng fields removed.
 */
export default function VendorCheckInDialog({ open, onOpenChange, account, pin, user, checkIns, onRefresh }) {
  const navigate = useNavigate();

  const goToPreview = () => {
    const params = new URLSearchParams({
      pinId: pin?.id || "",
      accountId: account?.id || "",
    });
    onOpenChange(false);
    navigate(`/VendorPinPreview?${params.toString()}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle>Check In: {pin?.pin_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-center py-2">
          <MapPin className="h-10 w-10 text-[#5DADA5] mx-auto" />
          <p className="text-sm text-slate-600">
            Use the map to drop your pin, set your public display location, and go live.
          </p>
          <Button onClick={goToPreview} className="w-full rounded-xl bg-[#F4A849] hover:bg-[#E39635] text-[#2C4F4E]">
            Open Pin Map
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full rounded-xl">Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
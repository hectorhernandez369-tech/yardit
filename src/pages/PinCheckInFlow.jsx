import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

/**
 * PinCheckInFlow — redirects to VendorPinPreview which provides the full
 * map-based GPS + display address flow. Raw lat/lng fields removed.
 */
export default function PinCheckInFlow({ pin, vendorAccount, currentUser, existingCheckIn, onClose, onSuccess }) {
  const navigate = useNavigate();

  const goToPreview = () => {
    const params = new URLSearchParams({
      pinId: pin?.id || "",
      accountId: vendorAccount?.id || "",
      ...(existingCheckIn?.id ? { checkInId: existingCheckIn.id } : {}),
    });
    onClose?.();
    navigate(`/VendorPinPreview?${params.toString()}`);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle>Drop Your Pin: {pin?.pin_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-center py-2">
          <MapPin className="h-10 w-10 text-[#5DADA5] mx-auto" />
          <p className="text-sm text-slate-600">
            Use the map to place your pin, confirm your public display location, and go live.
          </p>
          <Button onClick={goToPreview} className="w-full rounded-xl bg-[#F4A849] hover:bg-[#E39635] text-[#2C4F4E]">
            Open Pin Map
          </Button>
          <Button variant="outline" onClick={onClose} className="w-full rounded-xl">Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
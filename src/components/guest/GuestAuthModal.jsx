import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { clearGuestMode } from "@/lib/guestMode";

/**
 * Modal shown when a guest tries a restricted action.
 * Usage: <GuestAuthModal open={open} onClose={() => setOpen(false)} />
 */
export default function GuestAuthModal({ open, onClose }) {
  const handleLogin = () => {
    clearGuestMode();
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#F3E6CF] border-2 border-[#2C4F4E] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-[#2C4F4E] text-xl">Create a Free Account</DialogTitle>
          <DialogDescription className="text-[#2C4F4E]/80 text-sm mt-1">
            Create a free account to continue your hunt.
          </DialogDescription>
        </DialogHeader>
        <div className="text-sm text-[#2C4F4E]/70 mt-1">
          Sign up to post listings, join neighborhood sales, save your hunt, and more.
        </div>
        <DialogFooter className="flex flex-col gap-2 mt-2">
          <Button
            onClick={handleLogin}
            className="w-full bg-[#5DADA5] hover:bg-[#4A9B93] text-white border-2 border-[#2C4F4E] font-semibold"
          >
            Log In / Sign Up
          </Button>
          <Button variant="ghost" onClick={onClose} className="w-full text-[#2C4F4E]/60 hover:text-[#2C4F4E]">
            Keep Browsing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
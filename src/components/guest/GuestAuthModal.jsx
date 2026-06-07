import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { clearGuestMode } from "@/lib/guestMode";
import { Heart } from "lucide-react";

/**
 * Modal shown when a guest tries a restricted action.
 * Usage: <GuestAuthModal open={open} onClose={() => setOpen(false)} />
 */
export default function GuestAuthModal({
  open,
  onClose,
  title = "Create a Free Account",
  description = "Create a free account to continue your hunt.",
  detail = "Sign up to post listings, join neighborhood sales, save your hunt, and more.",
  buttonText = "Log In / Sign Up",
  returnTo = ""
}) {
  const handleLogin = () => {
    clearGuestMode();
    base44.auth.redirectToLogin(returnTo || window.location.href);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-b from-[#F3E6CF] to-[#FEFAF5] border-0 shadow-lg sm:max-w-sm rounded-3xl">
        <DialogHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="bg-[#F4A849]/20 p-3 rounded-full">
              <Heart className="w-6 h-6 text-[#F4A849] fill-[#F4A849]" />
            </div>
          </div>
          <DialogTitle className="text-[#2C4F4E] text-2xl font-bold">{title}</DialogTitle>
          <DialogDescription className="text-[#2C4F4E]/70 text-sm mt-3 leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="text-sm text-[#2C4F4E]/60 bg-white/50 rounded-2xl p-4 mt-2 leading-relaxed text-center">
          {detail}
        </div>
        <DialogFooter className="flex flex-col gap-3 mt-6">
          <Button
            onClick={handleLogin}
            className="w-full bg-[#5DADA5] hover:bg-[#4A9B93] text-white font-semibold py-6 rounded-xl text-base transition-all shadow-md hover:shadow-lg"
          >
            {buttonText}
          </Button>
          <Button variant="ghost" onClick={onClose} className="w-full text-[#2C4F4E]/70 hover:text-[#2C4F4E] hover:bg-white/50 rounded-xl py-2 transition-all">
            Keep Browsing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
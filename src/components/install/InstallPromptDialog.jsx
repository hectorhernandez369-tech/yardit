import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function InstallPromptDialog({ open, onOpenChange, mode = "ios" }) {
  const isFallback = mode === "fallback";
  const isInstalled = mode === "installed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#F3E6CF] border-2 border-[#2C4F4E]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#2C4F4E] text-center">
            {isInstalled ? "Yardit is already installed" : isFallback ? "Install Yardit" : "Install Yardit on iPhone"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-[#2C4F4E] text-sm sm:text-base">
          {isInstalled ? (
            <p>Yardit is already downloaded on this device. Open it from your home screen or app launcher.</p>
          ) : isFallback ? (
            <p>
              Your browser did not provide the install prompt right now. Browser install prompts only appear when the browser allows them; if Yardit is already installed, the prompt will not show. You can also use your browser menu to add Yardit to your home screen.
            </p>
          ) : (
            <>
              <p>1. Tap the Share button</p>
              <p>2. Scroll down</p>
              <p>3. Tap "Add to Home Screen"</p>
              <p>4. Tap "Add"</p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
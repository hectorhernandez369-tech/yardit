import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function InstallPromptDialog({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#F3E6CF] border-2 border-[#2C4F4E]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#2C4F4E] text-center">
            Install Yardit on iPhone
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-[#2C4F4E] text-sm sm:text-base">
          <p>1. Tap the Share button</p>
          <p>2. Scroll down</p>
          <p>3. Tap "Add to Home Screen"</p>
          <p>4. Tap "Add"</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
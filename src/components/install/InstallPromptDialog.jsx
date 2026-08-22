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
            <p>Yardit is already downloaded on this device. Open it from your Home Screen or app launcher.</p>
          ) : isFallback ? (
            <p>
              Your browser did not provide the install prompt right now. Browser install prompts only appear when the browser allows them; if Yardit is already installed, the prompt will not show. You can also use your browser menu to add Yardit to your Home Screen.
            </p>
          ) : (
            <>
              <p className="font-semibold">For the most reliable iPhone/iPad install, open Yardit in Safari, then:</p>
              <ol className="list-decimal space-y-2 pl-5">
                <li>Tap the <strong>Share</strong> button (the square with the upward arrow) at the bottom of Safari.</li>
                <li>Scroll down in the Share menu and tap <strong>Add to Home Screen</strong>.</li>
                <li>Make sure the name says <strong>Yardit</strong>, then tap <strong>Add</strong> in the top-right corner.</li>
                <li>Return to your iPhone Home Screen and open Yardit from the new Yardit icon — not from the Safari tab.</li>
                <li>Sign in to Yardit. When Yardit asks about alerts, tap <strong>Subscribe</strong> or <strong>Enable Push Notifications</strong>.</li>
                <li>When the iPhone notification permission appears, tap <strong>Allow</strong> so Yardit can send web push alerts.</li>
              </ol>
              <div className="rounded-xl border border-[#2C4F4E]/20 bg-white/60 p-3 text-xs sm:text-sm">
                <strong>Important:</strong> On iPhone/iPad, web push works from the Yardit Home Screen app. If notifications were previously denied, iOS may not show the Allow prompt again; notification access must be turned back on in device settings.
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
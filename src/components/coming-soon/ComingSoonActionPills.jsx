import React, { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import InstallPromptDialog from "@/components/install/InstallPromptDialog";
import { isStandaloneInstalled, shouldShowInstallButton } from "@/lib/installPrompt";

export default function ComingSoonActionPills() {
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [installDialogMode, setInstallDialogMode] = useState("ios");
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
  const [canInstallApp, setCanInstallApp] = useState(false);

  useEffect(() => {
    const updateInstallState = () => setCanInstallApp(shouldShowInstallButton());

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredInstallPrompt(event);
      setCanInstallApp(true);
    };

    const handleInstalled = () => {
      setDeferredInstallPrompt(null);
      setCanInstallApp(false);
      setShowInstallDialog(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    updateInstallState();

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
      setInstallDialogMode("ios");
      setShowInstallDialog(true);
      return;
    }

    if (deferredInstallPrompt) {
      await deferredInstallPrompt.prompt();
      return;
    }

    setInstallDialogMode("fallback");
    setShowInstallDialog(true);
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {canInstallApp && !isStandaloneInstalled() && (
          <Button
            type="button"
            onClick={handleInstallClick}
            className="h-11 rounded-full border-2 border-[#2C4F4E] bg-[#F4A849] px-5 font-black text-[#2C4F4E] shadow-md hover:bg-[#E39635]"
          >
            <Download className="mr-2 h-4 w-4" />
            Install Now
          </Button>
        )}

      </div>

      <InstallPromptDialog open={showInstallDialog} onOpenChange={setShowInstallDialog} mode={installDialogMode} />
    </>
  );
}
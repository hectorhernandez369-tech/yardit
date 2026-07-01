import React, { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import InstallPromptDialog from "@/components/install/InstallPromptDialog";
import { hasInstallRecord, isIosDevice, isStandaloneInstalled, markAppInstalled, shouldShowInstallButton } from "@/lib/installPrompt";

export default function ComingSoonActionPills() {
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [installDialogMode, setInstallDialogMode] = useState("ios");
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
  const [canInstallApp, setCanInstallApp] = useState(false);
  const [alreadyInstalled, setAlreadyInstalled] = useState(false);

  useEffect(() => {
    const updateInstallState = () => {
      const installed = isStandaloneInstalled() || hasInstallRecord();
      setAlreadyInstalled(installed);
      setCanInstallApp(shouldShowInstallButton());
    };

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredInstallPrompt(event);
      setCanInstallApp(true);
    };

    const handleInstalled = () => {
      markAppInstalled();
      setDeferredInstallPrompt(null);
      setAlreadyInstalled(true);
      setCanInstallApp(true);
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
    if (isStandaloneInstalled() || hasInstallRecord()) {
      setInstallDialogMode("installed");
      setShowInstallDialog(true);
      return;
    }

    if (isIosDevice()) {
      setInstallDialogMode("ios");
      setShowInstallDialog(true);
      return;
    }

    if (deferredInstallPrompt) {
      const choiceResult = await deferredInstallPrompt.prompt();
      if (choiceResult?.outcome === "accepted") {
        markAppInstalled();
        setAlreadyInstalled(true);
      }
      setDeferredInstallPrompt(null);
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
            className="h-11 rounded-full bg-[#F4A849] px-5 font-black text-[#2C4F4E] shadow-lg shadow-amber-200/70 hover:bg-[#E39635]"
          >
            <Download className="mr-2 h-4 w-4" />
            {alreadyInstalled ? "App Installed" : "Install Now"}
          </Button>
        )}

      </div>

      <InstallPromptDialog open={showInstallDialog} onOpenChange={setShowInstallDialog} mode={installDialogMode} />
    </>
  );
}
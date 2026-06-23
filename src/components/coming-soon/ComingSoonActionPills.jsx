import React, { useEffect, useState } from "react";
import { Bell, CheckCircle2, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import InstallPromptDialog from "@/components/install/InstallPromptDialog";
import { isStandaloneInstalled, shouldShowInstallButton } from "@/lib/installPrompt";

export default function ComingSoonActionPills() {
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [installDialogMode, setInstallDialogMode] = useState("ios");
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
  const [canInstallApp, setCanInstallApp] = useState(false);
  const [pushStatus, setPushStatus] = useState("idle");

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

  const handlePushClick = async () => {
    setPushStatus("loading");

    if (!("Notification" in window) || !window.OneSignalDeferred) {
      setPushStatus("unavailable");
      return;
    }

    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        await OneSignal.Notifications.requestPermission();
        const accepted = window.Notification?.permission === "granted";

        if (accepted) {
          await OneSignal.User.PushSubscription.optIn();
          setPushStatus("enabled");
        } else {
          setPushStatus("blocked");
        }
      } catch {
        setPushStatus("unavailable");
      }
    });
  };

  const pushLabel = pushStatus === "enabled"
    ? "Push Alerts On"
    : pushStatus === "loading"
      ? "Enabling Alerts"
      : pushStatus === "blocked"
        ? "Alerts Blocked"
        : pushStatus === "unavailable"
          ? "Alerts Unavailable"
          : "Enable Push Alerts";

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

        <Button
          type="button"
          onClick={handlePushClick}
          disabled={pushStatus === "loading" || pushStatus === "enabled"}
          className="h-11 rounded-full border-2 border-[#2C4F4E] bg-[#5DADA5] px-5 font-black text-white shadow-md hover:bg-[#4A9B93] disabled:opacity-80"
        >
          {pushStatus === "loading" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : pushStatus === "enabled" ? (
            <CheckCircle2 className="mr-2 h-4 w-4" />
          ) : (
            <Bell className="mr-2 h-4 w-4" />
          )}
          {pushLabel}
        </Button>
      </div>

      <InstallPromptDialog open={showInstallDialog} onOpenChange={setShowInstallDialog} mode={installDialogMode} />
    </>
  );
}
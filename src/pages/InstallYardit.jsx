import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BellRing, CheckCircle2, Download, Share2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const getDevice = () => {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "other";
};

const isStandalone = () => {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
};

const isSafari = () => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
};

export default function InstallYardit() {
  const navigate = useNavigate();
  const device = useMemo(getDevice, []);
  const [installed, setInstalled] = useState(isStandalone);
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    const handleBeforeInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const installAndroid = async () => {
    if (installed) {
      toast.success("Yardit is already installed.");
      return;
    }
    if (!installPrompt) {
      toast.message("If the install window does not appear, open Chrome's menu and tap Install app or Add to Home screen.");
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice?.outcome === "accepted") setInstallPrompt(null);
  };

  const installIphone = () => {
    if (installed) {
      toast.success("Yardit is already installed.");
      return;
    }
    if (!isSafari()) {
      toast.message("Open yardit.app in Safari, then tap Install Yardit again.");
      return;
    }
    toast.message("Tap the Share button in Safari, then choose Add to Home Screen.");
  };

  const recommendedText = device === "android"
    ? "Install Yardit directly from this website for the full app-style experience and web notifications."
    : device === "ios"
      ? "Install Yardit from Safari so it opens like an app and can receive Yardit web notifications."
      : "Install Yardit directly from this website on your phone.";

  return (
    <div className="min-h-[calc(100vh-120px)] bg-[#F3E6CF] px-4 py-6 md:py-10">
      <div className="mx-auto max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-3 px-2 text-[#2C4F4E] hover:bg-[#5DADA5]/10"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <div className="rounded-3xl bg-[#2C4F4E] px-5 py-7 text-center text-white shadow-sm md:px-8">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4A849] text-[#2C4F4E]">
            <Smartphone className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-black">Install Yardit</h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/85">
            Install Yardit directly from yardit.app. It opens like an app and stays updated automatically.
          </p>
        </div>

        {installed && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[#5DADA5]/40 bg-white/70 p-4 text-[#2C4F4E]">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#5DADA5]" />
            <div>
              <p className="font-bold">Yardit is already installed on this device.</p>
              <p className="mt-1 text-sm text-slate-600">Open Yardit from your Home Screen to use the installed app.</p>
            </div>
          </div>
        )}

        <p className="mt-5 text-center text-sm font-semibold text-[#2C4F4E]">{recommendedText}</p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Card className={`overflow-hidden rounded-3xl border-2 bg-white shadow-sm ${device === "android" ? "border-[#F4A849]" : "border-transparent"}`}>
            <CardContent className="p-5 md:p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#5DADA5]/15 text-[#2C4F4E]">
                  <Smartphone className="h-7 w-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-black text-[#2C4F4E]">Android</h2>
                    {device === "android" && <span className="rounded-full bg-[#F4A849]/20 px-2 py-1 text-xs font-bold text-[#8A5B12]">Your device</span>}
                  </div>
                  <p className="mt-1 text-sm leading-5 text-slate-600">Install Yardit directly from Chrome. No Play Store download is required.</p>
                </div>
              </div>

              <Button
                className="mt-5 w-full bg-[#2C4F4E] font-bold text-white hover:bg-[#244240]"
                onClick={installAndroid}
                disabled={installed}
              >
                <Download className="mr-2 h-4 w-4" /> {installed ? "Yardit Installed" : "Install Yardit"}
              </Button>
              <p className="mt-3 text-xs leading-5 text-slate-500">If Android does not show the install window, open Chrome's menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p>
            </CardContent>
          </Card>

          <Card className={`overflow-hidden rounded-3xl border-2 bg-white shadow-sm ${device === "ios" ? "border-[#F4A849]" : "border-transparent"}`}>
            <CardContent className="p-5 md:p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#5DADA5]/15 text-[#2C4F4E]">
                  <Smartphone className="h-7 w-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-black text-[#2C4F4E]">iPhone</h2>
                    {device === "ios" && <span className="rounded-full bg-[#F4A849]/20 px-2 py-1 text-xs font-bold text-[#8A5B12]">Your device</span>}
                  </div>
                  <p className="mt-1 text-sm leading-5 text-slate-600">Install Yardit from Safari to your Home Screen.</p>
                </div>
              </div>

              <Button
                className="mt-5 w-full bg-[#2C4F4E] font-bold text-white hover:bg-[#244240]"
                onClick={installIphone}
                disabled={installed}
              >
                <Download className="mr-2 h-4 w-4" /> {installed ? "Yardit Installed" : "Install Yardit"}
              </Button>

              <div className="mt-4 space-y-2 rounded-2xl bg-[#F3E6CF]/70 p-4 text-sm text-[#2C4F4E]">
                <div className="flex gap-3"><span className="font-black">1.</span><span>Open <strong>yardit.app</strong> in Safari.</span></div>
                <div className="flex gap-3"><span className="font-black">2.</span><span>Tap <strong>Share</strong> <Share2 className="inline h-4 w-4" />.</span></div>
                <div className="flex gap-3"><span className="font-black">3.</span><span>Tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</span></div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-0 bg-[#5DADA5]/15 shadow-none md:col-span-2">
            <CardContent className="flex gap-3 p-5">
              <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-[#2C4F4E]" />
              <div>
                <h3 className="font-black text-[#2C4F4E]">Yardit notifications</h3>
                <p className="mt-1 text-sm leading-5 text-slate-600">
                  After installing, open Yardit from the new Home Screen icon and enable notifications when Yardit asks. Android and iPhone use the same Yardit web notification system.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

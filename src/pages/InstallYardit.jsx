import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BellRing, CheckCircle2, ExternalLink, Share2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

const GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=com.base690f554506edf795e5d84121.app";

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

export default function InstallYardit() {
  const navigate = useNavigate();
  const device = useMemo(getDevice, []);
  const [installed, setInstalled] = useState(isStandalone);

  useEffect(() => {
    const handleInstalled = () => setInstalled(true);
    window.addEventListener("appinstalled", handleInstalled);
    return () => window.removeEventListener("appinstalled", handleInstalled);
  }, []);

  const recommendedText = device === "android"
    ? "Google Play is the easiest way to install Yardit on this phone."
    : device === "ios"
      ? "For iPhone, add Yardit to your Home Screen. This also supports Yardit web alerts."
      : "Choose the option that matches the phone you use.";

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
            Keep Yardit one tap away and make it easier to find sales, events, vendors, and live updates.
          </p>
        </div>

        {installed && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[#5DADA5]/40 bg-white/70 p-4 text-[#2C4F4E]">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#5DADA5]" />
            <div>
              <p className="font-bold">Yardit is already installed on this device.</p>
              <p className="mt-1 text-sm text-slate-600">You can still use this page to review the other install options.</p>
            </div>
          </div>
        )}

        <p className="mt-5 text-center text-sm font-semibold text-[#2C4F4E]">{recommendedText}</p>

        <div className="mt-4 grid gap-4">
          <Card className={`overflow-hidden rounded-3xl border-2 bg-white shadow-sm ${device === "android" ? "border-[#F4A849]" : "border-transparent"}`}>
            <CardContent className="p-5 md:p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-center text-[10px] font-bold leading-tight text-slate-400">
                  Play Store<br />logo
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-black text-[#2C4F4E]">Android</h2>
                    {device === "android" && <span className="rounded-full bg-[#F4A849]/20 px-2 py-1 text-xs font-bold text-[#8A5B12]">Recommended</span>}
                  </div>
                  <p className="mt-1 text-sm leading-5 text-slate-600">Download Yardit from Google Play and use the app normally.</p>
                </div>
              </div>

              <Button
                className="mt-5 w-full bg-[#2C4F4E] font-bold text-white hover:bg-[#244240]"
                onClick={() => window.open(GOOGLE_PLAY_URL, "_blank", "noopener,noreferrer")}
              >
                Get Yardit on Google Play <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <Card className={`overflow-hidden rounded-3xl border-2 bg-white shadow-sm ${device === "ios" ? "border-[#F4A849]" : "border-transparent"}`}>
            <CardContent className="p-5 md:p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#5DADA5]/15 text-[#2C4F4E]">
                  <Smartphone className="h-8 w-8" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-black text-[#2C4F4E]">iPhone</h2>
                    {device === "ios" && <span className="rounded-full bg-[#F4A849]/20 px-2 py-1 text-xs font-bold text-[#8A5B12]">Recommended</span>}
                  </div>
                  <p className="mt-1 text-sm leading-5 text-slate-600">Until Yardit is in the App Store, add Yardit directly to your Home Screen.</p>
                </div>
              </div>

              <div className="mt-5 space-y-3 rounded-2xl bg-[#F3E6CF]/70 p-4 text-sm text-[#2C4F4E]">
                <div className="flex gap-3"><span className="font-black">1.</span><span>Open Yardit in Safari.</span></div>
                <div className="flex gap-3"><span className="font-black">2.</span><span>Tap <strong>Share</strong> <Share2 className="inline h-4 w-4" />.</span></div>
                <div className="flex gap-3"><span className="font-black">3.</span><span>Choose <strong>Add to Home Screen</strong>.</span></div>
                <div className="flex gap-3"><span className="font-black">4.</span><span>Tap <strong>Add</strong>, then open Yardit from the new Home Screen icon.</span></div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-0 bg-[#5DADA5]/15 shadow-none">
            <CardContent className="flex gap-3 p-5">
              <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-[#2C4F4E]" />
              <div>
                <h3 className="font-black text-[#2C4F4E]">Live alerts</h3>
                <p className="mt-1 text-sm leading-5 text-slate-600">
                  Yardit will guide you through notification setup separately. Browser access is currently required for live push alerts while the store apps use the Base44 wrapper.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

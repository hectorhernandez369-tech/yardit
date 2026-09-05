import React from "react";
import { Bell, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const LOGO_URL = "https://media.base44.com/images/public/690f554506edf795e5d84121/e68545fc5_file_00000000f5dc71f5a5c8b2e79fd116b0.png";

export default function PushSetupCard({ status, busy, onEnable }) {
  const invalid = status === "invalid";
  const blocked = status === "blocked";
  return <section className="w-full max-w-sm rounded-3xl border-2 border-[#2C4F4E] bg-white/85 p-7 text-center shadow-xl">
    <img src={LOGO_URL} alt="Yardit" className="mx-auto mb-5 h-24 w-24 object-contain" />
    {status === "enabled" ? <>
      <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-600" />
      <h1 className="text-2xl font-black text-[#2C4F4E]">Notifications enabled</h1>
      <p className="mt-3 font-semibold text-[#2C4F4E]">You can return to Yardit.</p>
    </> : invalid ? <>
      <h1 className="text-2xl font-black text-[#2C4F4E]">Setup link expired</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">Return to Yardit and tap Enable Notifications again.</p>
    </> : <>
      <Bell className="mx-auto mb-3 h-10 w-10 text-[#2C4F4E]" />
      <h1 className="text-2xl font-black text-[#2C4F4E]">Enable Yardit Notifications</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">Tap Enable Notifications, then choose Allow when your browser asks.</p>
      {blocked && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">Notifications are blocked. Allow Yardit notifications in this browser’s site settings, then try again.</p>}
      {status === "error" && <p className="mt-4 text-sm font-semibold text-red-700">Notifications could not be enabled. Please try again.</p>}
      <Button onClick={onEnable} disabled={busy || status === "validating" || blocked} className="mt-6 w-full bg-[#F4A849] py-6 text-base font-black text-[#2C4F4E] hover:bg-[#E39635]">
        {(busy || status === "validating") ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Bell className="mr-2 h-5 w-5" />}
        Enable Notifications
      </Button>
    </>}
  </section>;
}
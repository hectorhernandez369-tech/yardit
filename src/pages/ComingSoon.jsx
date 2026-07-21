import React, { useState } from "react";

import { Shield, Unlock, Sparkles, MapPin, Heart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import LaunchNotificationForm from "@/components/coming-soon/LaunchNotificationForm";
import ComingSoonPreviewCard from "@/components/coming-soon/ComingSoonPreviewCard";
import ComingSoonActionPills from "@/components/coming-soon/ComingSoonActionPills";
import TesterLoginModal from "@/components/coming-soon/TesterLoginModal";
import AdminLoginModal from "@/components/admin/AdminLoginModal";
import { setTesterBypass } from "@/lib/comingSoonMode";

const logoUrl = "https://media.base44.com/images/public/690f554506edf795e5d84121/418a5e7a0_file_00000000f5dc71f5a5c8b2e79fd116b0.png";
const shipWatermarkUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690f554506edf795e5d84121/b0ba1ba06_file_00000000fce071fd9ff100a6a9cf19951.png";
const mapScreenshotUrl = "https://media.base44.com/images/public/690f554506edf795e5d84121/424d23cce_Screenshot_20260626_095636_Chrome.jpg";

export default function ComingSoon() {
  const [showTesterModal, setShowTesterModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-cyan-50 via-white to-amber-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -left-28 -top-28 h-72 w-72 rounded-full bg-[#5DADA5]/25 blur-3xl" />
      <div className="pointer-events-none absolute right-[-90px] top-24 h-80 w-80 rounded-full bg-[#F4A849]/25 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-120px] left-1/3 h-96 w-96 rounded-full bg-sky-300/20 blur-3xl" />
      <img
        src={shipWatermarkUrl}
        alt="Yardit ship watermark"
        className="pointer-events-none absolute right-4 top-32 z-0 w-[300px] max-w-none opacity-10 sm:w-[420px] lg:right-12 lg:top-28 lg:w-[520px]"
      />

      <TesterLoginModal
        open={showTesterModal}
        onClose={() => setShowTesterModal(false)}
        onSuccess={() => { setShowTesterModal(false); }}
      />

      <AdminLoginModal
        open={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        onSuccess={() => {
          setShowAdminModal(false);
          setTesterBypass();
          window.location.href = "/";
        }}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex justify-end gap-2">
          <Button
            onClick={() => setShowTesterModal(true)}
            variant="outline"
            className="gap-2 rounded-full border border-teal-200 bg-white/80 text-[#2C4F4E] shadow-sm backdrop-blur hover:bg-cyan-50"
          >
            <Unlock className="h-4 w-4" />
            Early Access
          </Button>
          <Button
            onClick={() => setShowAdminModal(true)}
            className="gap-2 rounded-full bg-[#2C4F4E] text-white shadow-sm hover:bg-[#203c3b]"
          >
            <Shield className="h-4 w-4" />
            Admin
          </Button>
        </div>

        <div className="flex flex-col items-center gap-3 text-center">
          <div className="relative rounded-[34px] bg-white p-3 shadow-[0_18px_45px_rgba(20,184,166,0.22)] ring-1 ring-teal-100">
            <div className="absolute -right-2 -top-2 rounded-full bg-[#F4A849] p-2 text-white shadow-lg">
              <Sparkles className="h-4 w-4" />
            </div>
            <img src={logoUrl} alt="Yardit logo" className="h-24 w-24 object-contain drop-shadow-[0_10px_18px_rgba(44,79,78,0.18)] sm:h-28 sm:w-28" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[#2C4F4E] sm:text-4xl">Yardit</h1>
          <p className="text-base font-bold text-slate-700 sm:text-lg">Find Yard Sales. Discover Local Events. Join the Hunt.</p>
          <p className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
            Yardit helps people discover and promote yard sales, neighborhood sales, vendor events, estate sales, and community events using an interactive map. Whether you're hunting for bargains or hosting an event, Yardit makes it easy to connect with your local community.
          </p>
        </div>

        <div className="overflow-hidden rounded-[36px] border border-white/80 bg-white/90 shadow-[0_24px_80px_rgba(15,118,110,0.18)] backdrop-blur-xl">
          <div className="grid gap-0 lg:grid-cols-[1.08fr_0.92fr]">
            <section className="relative space-y-6 p-6 sm:p-9 lg:p-10">
              <div className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-4 py-2 text-sm font-bold uppercase tracking-[0.18em] text-[#2C4F4E] ring-1 ring-cyan-100">
                <Sparkles className="h-4 w-4 text-[#F4A849]" />
                Launching soon
              </div>

              <div className="space-y-4">
                <h2 className="text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-6xl">
                  Your next local treasure hunt starts here.
                </h2>
                <p className="text-xl font-semibold leading-8 text-slate-700 sm:text-2xl">
                  Yardit brings yard sales, neighborhood events, and local vendors together on one lively map.
                </p>
              </div>

              <ComingSoonActionPills />

              <p className="max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
                We’re building a friendlier way to discover what’s happening nearby. Browse colorful map pins, find hidden gems, support local sellers, and plan your weekend with a little more excitement.
              </p>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-gradient-to-br from-teal-50 to-cyan-50 p-4 ring-1 ring-teal-100">
                  <MapPin className="mb-3 h-6 w-6 text-[#5DADA5]" />
                  <p className="font-bold text-slate-950">Map-first</p>
                  <p className="text-sm text-slate-600">Find what’s nearby fast.</p>
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-4 ring-1 ring-amber-100">
                  <Star className="mb-3 h-6 w-6 text-[#F4A849]" />
                  <p className="font-bold text-slate-950">Hidden gems</p>
                  <p className="text-sm text-slate-600">Plan a better weekend.</p>
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50 p-4 ring-1 ring-rose-100">
                  <Heart className="mb-3 h-6 w-6 text-rose-500" />
                  <p className="font-bold text-slate-950">Community</p>
                  <p className="text-sm text-slate-600">Support local people.</p>
                </div>
              </div>
            </section>

            <aside className="bg-gradient-to-br from-[#5DADA5] to-[#2C4F4E] p-5 sm:p-7 lg:p-8">
              <ComingSoonPreviewCard imageUrl={mapScreenshotUrl} />
            </aside>
          </div>

          <div className="grid gap-5 border-t border-slate-100 bg-slate-50/80 p-5 sm:p-7 lg:grid-cols-2 lg:items-start">
            <div className="rounded-3xl border border-teal-100 bg-white p-5 shadow-sm">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#5DADA5]">Get notified</p>
              <h2 className="mt-2 text-xl font-black text-slate-950">Be the first to know when Yardit launches.</h2>
              <div className="mt-4">
                <LaunchNotificationForm />
              </div>
            </div>

            <div className="rounded-3xl border border-amber-100 bg-white p-5 shadow-sm">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#F4A849]">Follow us</p>
              <h2 className="mt-2 text-xl font-black text-slate-950">Come along for launch updates and local finds.</h2>
              <div className="mt-5 flex flex-row items-center gap-3">
                <a
                  href="https://www.facebook.com/share/18PP8zJpgM/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Visit Yardit on Facebook"
                  className="inline-flex w-fit rounded-[20px] transition-transform hover:-translate-y-1 hover:scale-105"
                >
                  <img
                    src="https://media.base44.com/images/public/690f554506edf795e5d84121/6a848e02d_file_000000002984722fad81c30a0e4b6599.png"
                    alt="Facebook"
                    className="h-14 w-14 rounded-[20px] object-cover shadow-lg ring-1 ring-slate-100"
                  />
                </a>
                <a
                  href="https://www.instagram.com/yardit.app?igsh=NXFzdHdnenZ1ZXlk"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Visit Yardit on Instagram"
                  className="inline-flex w-fit rounded-[20px] transition-transform hover:-translate-y-1 hover:scale-105"
                >
                  <img
                    src="https://media.base44.com/images/public/690f554506edf795e5d84121/1e2e7440b_file_00000000609471f5a4c3d8fb89db2e37.png"
                    alt="Instagram"
                    className="h-14 w-14 rounded-[20px] object-cover shadow-lg ring-1 ring-slate-100"
                  />
                </a>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-4 py-4 text-sm font-semibold text-[#2C4F4E]">
            <a href="/privacy" className="hover:underline">Privacy Policy</a>
            <a href="/terms" className="hover:underline">Terms of Service</a>
          </div>
        </div>
      </div>
    </div>
  );
}
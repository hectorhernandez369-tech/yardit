import React, { useState } from "react";

import { Shield, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import LaunchNotificationForm from "@/components/coming-soon/LaunchNotificationForm";
import ComingSoonPreviewCard from "@/components/coming-soon/ComingSoonPreviewCard";
import ComingSoonActionPills from "@/components/coming-soon/ComingSoonActionPills";
import TesterLoginModal from "@/components/coming-soon/TesterLoginModal";
import AdminLoginModal, { getAdminSession } from "@/components/admin/AdminLoginModal";
import { setTesterBypass } from "@/lib/comingSoonMode";

const logoUrl = "https://media.base44.com/images/public/690f554506edf795e5d84121/418a5e7a0_file_00000000f5dc71f5a5c8b2e79fd116b0.png";
const shipWatermarkUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690f554506edf795e5d84121/b0ba1ba06_file_00000000fce071fd9ff100a6a9cf19951.png";
const mapScreenshotUrl = "https://media.base44.com/images/public/690f554506edf795e5d84121/424d23cce_Screenshot_20260626_095636_Chrome.jpg";

export default function ComingSoon() {
  const [showTesterModal, setShowTesterModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F3E6CF] px-4 py-6 text-[#2C4F4E] sm:px-6 lg:px-8">
      <img
        src={shipWatermarkUrl}
        alt="Yardit ship watermark"
        className="pointer-events-none absolute left-1/2 top-20 z-0 w-[320px] max-w-none -translate-x-1/2 opacity-10 sm:w-[420px] lg:left-auto lg:right-10 lg:top-24 lg:w-[520px] lg:translate-x-0"
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
            className="gap-2 border-2 border-[#2C4F4E]/40 bg-transparent text-[#2C4F4E] hover:bg-[#E7D7B8]"
          >
            <Unlock className="h-4 w-4" />
            Early Access
          </Button>
          <Button
            onClick={() => {
              const session = getAdminSession();
              if (session) {
                setTesterBypass();
                window.location.href = "/";
              } else {
                setShowAdminModal(true);
              }
            }}
            className="gap-2 border-2 border-[#2C4F4E] bg-[#5DADA5] text-white hover:bg-[#4A9B93]"
          >
            <Shield className="h-4 w-4" />
            Admin
          </Button>
        </div>

        <div className="flex flex-col items-center gap-3 text-center">
          <div className="rounded-[32px] bg-[#E7D7B8]/70 p-3 shadow-[0_12px_30px_rgba(44,79,78,0.12)] ring-1 ring-[#2C4F4E]/10">
            <img src={logoUrl} alt="Yardit logo" className="h-24 w-24 object-contain drop-shadow-[0_10px_18px_rgba(44,79,78,0.22)] sm:h-28 sm:w-28" />
          </div>
          <p className="text-sm font-bold tracking-[0.42em] text-[#F4A849] [-webkit-text-stroke:0.5px_white]">YARDIT</p>
        </div>

        <div className="rounded-[32px] border-2 border-[#2C4F4E] bg-[#E7D7B8]/90 p-6 shadow-[0_18px_50px_rgba(44,79,78,0.14)] sm:p-8">
          <div className="space-y-6">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#5DADA5]">Launching soon</p>
              <h1 className="text-4xl font-black leading-tight text-[#2C4F4E] sm:text-5xl">Yardit is Coming Soon</h1>
              <p className="text-xl font-semibold leading-8 text-[#2C4F4E] sm:text-2xl">
                Discover yard sales, local vendors, and neighborhood events all in one place.
              </p>
              <ComingSoonActionPills />
            </div>

            <p className="text-base leading-8 text-[#2C4F4E]/90 sm:text-lg">
              Yardit is a local discovery platform built to help people find yard sales, community events, and local vendors happening nearby. Instead of searching all over the place, users can explore what’s happening around them, view listings on a map, and plan their weekend like a treasure hunt. Whether you’re looking for hidden gems, promoting a sale, or exploring your community, Yardit is designed to make local discovery easier and more exciting.
            </p>

            <div className="pt-2">
              <ComingSoonPreviewCard imageUrl={mapScreenshotUrl} />
            </div>

            <div className="grid gap-5 pt-2 lg:grid-cols-2 lg:items-start">
              <div className="rounded-2xl border border-[#2C4F4E]/15 bg-[#F3E6CF]/80 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#5DADA5]">Get notified</p>
                <h2 className="mt-2 text-xl font-bold text-[#2C4F4E]">Be the first to know when Yardit launches.</h2>
                <div className="mt-4">
                  <LaunchNotificationForm />
                </div>
              </div>

              <div className="rounded-2xl border border-[#2C4F4E]/15 bg-[#F3E6CF]/80 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#5DADA5]">Follow us</p>
                <h2 className="mt-2 text-xl font-bold text-[#2C4F4E]">Follow us on Facebook & Instagram</h2>
                <div className="mt-4 flex flex-row items-center gap-3">
                  <a
                    href="https://www.facebook.com/share/18PP8zJpgM/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Visit Yardit on Facebook"
                    className="inline-flex w-fit rounded-[18px] transition-transform hover:scale-105"
                  >
                    <img
                      src="https://media.base44.com/images/public/690f554506edf795e5d84121/6a848e02d_file_000000002984722fad81c30a0e4b6599.png"
                      alt="Facebook"
                      className="h-14 w-14 rounded-[18px] object-cover shadow-md"
                    />
                  </a>
                  <a
                    href="https://www.instagram.com/yardit.app?igsh=NXFzdHdnenZ1ZXlk"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Visit Yardit on Instagram"
                    className="inline-flex w-fit rounded-[18px] transition-transform hover:scale-105"
                  >
                    <img
                      src="https://media.base44.com/images/public/690f554506edf795e5d84121/1e2e7440b_file_00000000609471f5a4c3d8fb89db2e37.png"
                      alt="Instagram"
                      className="h-14 w-14 rounded-[18px] object-cover shadow-md"
                    />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
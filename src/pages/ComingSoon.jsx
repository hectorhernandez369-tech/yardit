import React from "react";
import { Link } from "react-router-dom";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import LaunchNotificationForm from "@/components/coming-soon/LaunchNotificationForm";
import ComingSoonPreviewCard from "@/components/coming-soon/ComingSoonPreviewCard";

const logoUrl = "https://media.base44.com/images/public/690f554506edf795e5d84121/418a5e7a0_file_00000000f5dc71f5a5c8b2e79fd116b0.png";
const shipWatermarkUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690f554506edf795e5d84121/b0ba1ba06_file_00000000fce071fd9ff100a6a9cf19951.png";
const mapScreenshotUrl = "https://media.base44.com/images/public/690f554506edf795e5d84121/3b0113ec3_Screenshot_20260318_085622_Base44.jpg";

export default function ComingSoon() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F3E6CF] px-4 py-6 text-[#2C4F4E] sm:px-6 lg:px-8">
      <img
        src={shipWatermarkUrl}
        alt="Yardit ship watermark"
        className="pointer-events-none absolute left-1/2 top-20 z-0 w-[320px] max-w-none -translate-x-1/2 opacity-10 sm:w-[420px] lg:left-auto lg:right-10 lg:top-24 lg:w-[520px] lg:translate-x-0"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex justify-end">
          <Link to="/AdminLite">
            <Button className="gap-2 border-2 border-[#2C4F4E] bg-[#5DADA5] text-white hover:bg-[#4A9B93]">
              <Shield className="h-4 w-4" />
              Admin
            </Button>
          </Link>
        </div>

        <div className="flex flex-col items-center gap-3 text-center">
          <img src={logoUrl} alt="Yardit logo" className="h-24 w-24 rounded-[28px] border-2 border-[#2C4F4E] bg-white object-cover shadow-lg sm:h-28 sm:w-28" />
          <p className="text-sm font-bold tracking-[0.42em] text-[#F4A849] [-webkit-text-stroke:0.5px_white]">YARDIT</p>
        </div>

        <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
          <div className="space-y-6 rounded-[32px] border-2 border-[#2C4F4E] bg-[#E7D7B8]/90 p-6 shadow-[0_18px_50px_rgba(44,79,78,0.14)] sm:p-8">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#5DADA5]">Launching soon</p>
              <h1 className="text-4xl font-black leading-tight text-[#2C4F4E] sm:text-5xl">Yardit is Coming Soon</h1>
              <p className="text-xl font-semibold leading-8 text-[#2C4F4E] sm:text-2xl">
                Discover yard sales, local vendors, and neighborhood events all in one place.
              </p>
            </div>

            <p className="text-base leading-8 text-[#2C4F4E]/90 sm:text-lg">
              Yardit is a local discovery platform built to help people find yard sales, community events, and local vendors happening nearby. Instead of searching all over the place, users can explore what’s happening around them, view listings on a map, and plan their weekend like a treasure hunt. Whether you’re looking for hidden gems, promoting a sale, or exploring your community, Yardit is designed to make local discovery easier and more exciting.
            </p>

            <p className="text-lg font-semibold text-[#2C4F4E] sm:text-xl">Be the first to know when Yardit launches.</p>

            <LaunchNotificationForm />
          </div>

          <ComingSoonPreviewCard imageUrl={mapScreenshotUrl} />
        </div>
      </div>
    </div>
  );
}
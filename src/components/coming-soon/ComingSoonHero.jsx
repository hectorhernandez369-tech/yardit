import React from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function ComingSoonHero() {
  return (
    <Card className="overflow-hidden border-2 border-[#2C4F4E] bg-[#E7D7B8] shadow-lg">
      <CardContent className="px-6 py-8 sm:px-10 sm:py-12">
        <div className="mb-6 flex flex-col items-center text-center">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690f554506edf795e5d84121/aa5288319_file_00000000c1b871f5aeb839b78344a9a4.png"
            alt="Yardit Logo"
            className="h-16 w-16 rounded-2xl border-2 border-[#2C4F4E] object-cover shadow-md"
          />
          <span className="mt-3 text-xs font-bold tracking-[0.4em] text-[#F4A849] [text-shadow:0_1px_0_white]">YARDIT</span>
        </div>

        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <p className="mb-3 rounded-full border border-[#2C4F4E]/20 bg-white/60 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#2C4F4E]">
            Local discovery platform
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-[#2C4F4E] sm:text-5xl">Yardit is Coming Soon</h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-700 sm:text-xl">
            Discover yard sales, local vendors, and neighborhood events all in one place.
          </p>
          <p className="mt-6 max-w-3xl text-base leading-7 text-slate-700">
            Yardit is a local discovery platform built to help people find yard sales, community events, and local vendors happening nearby. Instead of searching all over the place, users can explore what’s happening around them, view listings on a map, and plan their weekend like a treasure hunt. Whether you’re looking for hidden gems, promoting a sale, or exploring your community, Yardit is designed to make local discovery easier and more exciting.
          </p>
          <p className="mt-6 text-base font-semibold text-[#2C4F4E]">
            We’re getting things ready now. Follow along and be the first to know when Yardit launches.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
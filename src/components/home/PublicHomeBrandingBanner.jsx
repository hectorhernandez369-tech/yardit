import React from "react";

export default function PublicHomeBrandingBanner() {
  return (
    <section className="border-b border-[#2C4F4E]/15 bg-[#F3E6CF]/95 px-3 py-2 text-[#2C4F4E]" aria-label="About Yardit">
      <div className="mx-auto flex max-w-7xl flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-black leading-tight tracking-tight sm:text-2xl">Yardit</h1>
          <p className="text-sm font-bold text-slate-800 sm:text-base">Find Yard Sales. Discover Local Events. Join the Hunt.</p>
          <p className="mt-1 max-w-4xl text-xs leading-5 text-slate-700 sm:text-sm">
            Yardit helps people discover and promote yard sales, neighborhood sales, vendor events, estate sales, and community events using an interactive map so local communities can connect before anyone logs in.
          </p>
        </div>
        <div className="flex shrink-0 gap-3 text-xs font-semibold sm:text-sm">
          <a href="/privacy" className="hover:underline">Privacy Policy</a>
          <a href="/terms" className="hover:underline">Terms of Service</a>
        </div>
      </div>
    </section>
  );
}
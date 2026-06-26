import React from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function ComingSoonPreviewCard({ imageUrl }) {
  return (
    <Card className="overflow-hidden border border-white/30 bg-white/95 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="space-y-2">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#F4A849]">See Yardit in action</p>
          <h2 className="text-2xl font-black text-slate-950">A map-first way to discover what’s nearby</h2>
          <p className="text-sm leading-6 text-slate-600 sm:text-base">
            Browse local listings with colorful map pins, explore nearby activity, and plan your weekend like a treasure hunt.
          </p>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-teal-100 bg-white shadow-xl">
          <img
            src={imageUrl}
            alt="Yardit map preview"
            className="h-auto w-full object-contain"
          />
        </div>
      </CardContent>
    </Card>
  );
}
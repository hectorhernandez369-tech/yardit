import React from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function ComingSoonPreviewCard({ imageUrl }) {
  return (
    <Card className="overflow-hidden border-2 border-[#2C4F4E] bg-[#E7D7B8]/95 shadow-[0_18px_50px_rgba(44,79,78,0.18)]">
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#5DADA5]">See Yardit in action</p>
          <h2 className="text-2xl font-bold text-[#2C4F4E]">A map-first way to discover what’s nearby</h2>
          <p className="text-sm leading-6 text-[#2C4F4E]/80 sm:text-base">
            Browse local listings with colorful map pins, explore nearby activity, and plan your weekend like a treasure hunt.
          </p>
        </div>

        <div className="overflow-hidden rounded-[28px] border-2 border-[#2C4F4E] bg-white shadow-lg">
          <img
            src={imageUrl}
            alt="Yardit map preview"
            className="h-full max-h-[560px] w-full object-cover object-top"
          />
        </div>
      </CardContent>
    </Card>
  );
}
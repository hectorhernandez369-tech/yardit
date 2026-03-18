import React from "react";
import ComingSoonHero from "@/components/coming-soon/ComingSoonHero";
import FollowSection from "@/components/coming-soon/FollowSection";
import WaitlistCard from "@/components/coming-soon/WaitlistCard";

export default function ComingSoon() {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#F3E6CF] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <ComingSoonHero />
        <div className="grid gap-6 lg:grid-cols-2">
          <FollowSection />
          <WaitlistCard />
        </div>
      </div>
    </div>
  );
}
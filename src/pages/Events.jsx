import React from "react";
import EventsHero from "@/components/events/EventsHero";
import FomoSection from "@/components/events/FomoSection";
import HowItWorksSection from "@/components/events/HowItWorksSection";
import FoundingVendorSection from "@/components/events/FoundingVendorSection";
import CallToActionSection from "@/components/events/CallToActionSection";
import BottomCTA from "@/components/events/BottomCTA";
import EventsFooter from "@/components/events/EventsFooter";

export default function Events() {
  const scrollToCTA = () => {
    document.getElementById("cta")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#0A1628]">
      <EventsHero
        onPrimaryCta={scrollToCTA}
        onSecondaryCta={() => {
          document.getElementById("fomo")?.scrollIntoView({ behavior: "smooth" });
        }}
      />
      <div id="fomo">
        <FomoSection />
      </div>
      <HowItWorksSection />
      <FoundingVendorSection onCta={scrollToCTA} />
      <div id="cta">
        <CallToActionSection />
      </div>
      <BottomCTA />
      <EventsFooter />
    </div>
  );
}
import React from "react";
import EventsHero from "@/components/events/EventsHero";
import FomoSection from "@/components/events/FomoSection";
import HowItWorksSection from "@/components/events/HowItWorksSection";
import FoundingVendorSection from "@/components/events/FoundingVendorSection";
import SignupSection from "@/components/events/SignupSection";
import BottomCTA from "@/components/events/BottomCTA";
import EventsFooter from "@/components/events/EventsFooter";

export default function Events() {
  const scrollToSignup = () => {
    document.getElementById("signup")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <EventsHero
        onPrimaryCta={scrollToSignup}
        onSecondaryCta={() => {
          document.getElementById("fomo")?.scrollIntoView({ behavior: "smooth" });
        }}
      />
      <div id="fomo">
        <FomoSection />
      </div>
      <HowItWorksSection />
      <FoundingVendorSection onCta={scrollToSignup} />
      <div id="signup">
        <SignupSection />
      </div>
      <BottomCTA />
      <EventsFooter />
    </div>
  );
}
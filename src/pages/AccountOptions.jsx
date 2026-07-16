import React from "react";
import { useAuth } from "@/lib/AuthContext";
import ExperienceChoice from "@/components/experience/ExperienceChoice";
import { EVENTS_EXPERIENCE } from "@/lib/experience";

export default function AccountOptions() {
  const { navigateToLogin } = useAuth();

  const handleExperience = (experience) => {
    const target = experience === EVENTS_EXPERIENCE ? `${window.location.origin}/VendorAccountIntro?experience=events` : `${window.location.origin}/`;
    navigateToLogin(target);
  };

  return <ExperienceChoice onChoose={handleExperience} />;
}
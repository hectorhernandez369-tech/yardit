import React from "react";
import { TreePine } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ChristmasListingChoice() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate("/CreateHolidayLights")}
      className="flex w-full items-start gap-4 rounded-xl border border-holiday-gold/50 bg-holiday-night p-4 text-left text-holiday-snow hover:border-holiday-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-holiday-gold"
    >
      <TreePine className="h-6 w-6 shrink-0 text-holiday-gold" />
      <span>
        <strong className="block text-sm">Christmas / Holiday Lights</strong>
        <span className="mt-0.5 block text-xs opacity-80">Share your festive display, viewing dates, and nightly hours</span>
      </span>
    </button>
  );
}
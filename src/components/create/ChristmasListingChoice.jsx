import React from "react";
import { TreePine } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ChristmasListingChoice({ disabled = false }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => navigate("/CreateHolidayLights")}
      className={disabled
        ? "flex w-full cursor-not-allowed items-start gap-4 rounded-xl border border-border bg-muted p-4 text-left text-muted-foreground opacity-60"
        : "flex w-full items-start gap-4 rounded-xl border border-holiday-gold/50 bg-holiday-night p-4 text-left text-holiday-snow hover:border-holiday-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-holiday-gold"}
    >
      <TreePine className={disabled ? "h-6 w-6 shrink-0 text-muted-foreground" : "h-6 w-6 shrink-0 text-holiday-gold"} />
      <span>
        <strong className="block text-sm">Christmas / Holiday Lights</strong>
        {disabled && <span className="block text-xs font-semibold">Coming Soon</span>}
        <span className="mt-0.5 block text-xs opacity-80">Share your festive display, viewing dates, and nightly hours</span>
      </span>
    </button>
  );
}
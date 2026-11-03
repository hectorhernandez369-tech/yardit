import React from "react";
import { TreePine } from "lucide-react";
import { useNavigate } from "react-router-dom";
import HolidayHeaderDecorations from '@/components/holiday-lights/HolidayHeaderDecorations';

export default function ChristmasListingChoice({ disabled = false }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => navigate("/CreateHolidayLights")}
      className={`relative isolate flex w-full items-start gap-4 overflow-hidden rounded-xl border border-holiday-gold bg-gradient-to-br from-christmas-red via-christmas-red to-christmas-green p-4 text-left text-holiday-snow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-holiday-gold ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:border-holiday-snow'}`}
    >
      <HolidayHeaderDecorations />
      <span className="relative z-10 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-holiday-gold bg-christmas-green"><TreePine className="h-4 w-4 text-holiday-gold" /></span>
      <span className="relative z-10">
        <strong className="block text-sm">Christmas / Holiday Lights</strong>
        {disabled && <span className="block text-xs font-semibold">Coming Soon</span>}
        <span className="mt-0.5 block text-xs">Share your festive display, viewing dates, and nightly hours</span>
      </span>
    </button>
  );
}
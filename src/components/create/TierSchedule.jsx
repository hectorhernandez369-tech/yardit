import React, { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Eye } from "lucide-react";
import { isDemoMode } from "../shared/DemoMode";

import {
  computeFreeWindow,
  computeFeaturedDates,
  computePremiumDates
} from "@/components/shared/listingTierEngine";

// (plain english) If timezone isn't available yet, we fall back to PT for now.
const FALLBACK_TZ = "America/Los_Angeles";

function formatInTimeZone(date, timeZoneId) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timeZoneId,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

// UTC-stable boundaries (plain english: keeps dates from “slipping” across devices)
function utcStartOfDayIso(ymd) {
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0)).toISOString();
}

function utcEndOfDayIso(ymd) {
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 23, 59, 59)).toISOString();
}

export default function TierSchedule({ formData, setFormData }) {
  const tier = formData.tier || "free";
  const demoActive = isDemoMode();

  const timeZoneId = formData.timeZoneId || FALLBACK_TZ;

  const [inlineError, setInlineError] = useState("");

  // ---------------------------
  // FREE (non-demo): auto schedule
  // ---------------------------
  useEffect(() => {
    if (tier !== "free") return;

    // Clear tier-specific fields when switching into Free
    setInlineError("");

    if (!demoActive) {
      const window = computeFreeWindow(new Date(), timeZoneId);

      setFormData((prev) => ({
        ...prev,
        // store ISO for backend/storage
        startDateTime: window.startDateTime.toISOString(),
        endDateTime: window.endDateTime.toISOString(),

        // Clear range-based fields (not used for Free)
        selectedRangeStartDate: "",
        selectedRangeEndDate: "",
        earlyVisibilityDays: 0,
        earlyVisibilityDates: [],
        activeDates: []
      }));
    }
  }, [tier, demoActive, timeZoneId, setFormData]);

  // ---------------------------
  // FEATURED / PREMIUM: validate date range
  // ---------------------------
  const startDate = formData.selectedRangeStartDate || "";
  const endDate = formData.selectedRangeEndDate || "";

  const premiumEarlyEnabled = (formData.earlyVisibilityDays || 0) > 0;
  const earlyVisibilityDays = Number(formData.earlyVisibilityDays || 0);

  const computed = useMemo(() => {
    setInlineError("");

    // Free (demo): allow nothing special here
    if (tier === "free") {
      return {
        valid: true,
        error: null,
        earlyVisibilityDates: [],
        activeDates: []
      };
    }

    if (!startDate || !endDate) {
      return {
        valid: false,
        error: "",
        earlyVisibilityDates: [],
        activeDates: []
      };
    }

    if (tier === "featured") {
      return computeFeaturedDates(startDate, endDate);
    }

    if (tier === "premium") {
      return computePremiumDates(startDate, endDate, earlyVisibilityDays);
    }

    return {
      valid: false,
      error: "",
      earlyVisibilityDates: [],
      activeDates: []
    };
  }, [tier, startDate, endDate, earlyVisibilityDays]);

  // Push computed results into formData when valid
  useEffect(() => {
    if (tier === "free") return;

    if (!startDate || !endDate) {
      // Clear derived fields if user hasn’t selected both yet
      setFormData((prev) => ({
        ...prev,
        activeDates: [],
        earlyVisibilityDates: [],
        startDateTime: "",
        endDateTime: ""
      }));
      return;
    }

    if (computed?.valid) {
      const activeDates = computed.activeDates || [];
      const earlyDates = computed.earlyVisibilityDates || [];

      setFormData((prev) => ({
        ...prev,
        activeDates,
        earlyVisibilityDates: earlyDates,

        // Save ISO boundaries (UTC-stable; submit can re-compute in exact listing timezone later)
        startDateTime: utcStartOfDayIso(startDate),
        endDateTime: utcEndOfDayIso(endDate)
      }));

      setInlineError("");
    } else if (computed?.error) {
      setInlineError(computed.error);
      setFormData((prev) => ({
        ...prev,
        activeDates: [],
        earlyVisibilityDates: [],
        startDateTime: "",
        endDateTime: ""
      }));
    } else {
      setInlineError("");
    }
  }, [tier, startDate, endDate, computed, setFormData]);

  // If switching away from Premium, clear early visibility
  useEffect(() => {
    if (tier !== "premium") {
      setFormData((prev) => ({
        ...prev,
        earlyVisibilityDays: 0,
        earlyVisibilityDates: []
      }));
    }
  }, [tier, setFormData]);

  // ---------------------------
  // UI
  // ---------------------------

  // FREE (non-demo): show auto window
  if (tier === "free" && !demoActive) {
    const window = computeFreeWindow(new Date(), timeZoneId);

    return (
      <div className="space-y-3 mt-4">
        <div className="rounded-xl border-2 border-[#2C4F4E] bg-[#E7D7B8] p-4">
          <div className="flex items-center gap-2 mb-2">
            <CalendarDays className="w-5 h-5 text-[#5DADA5]" />
            <h4 className="font-semibold text-[#2C4F4E]">Schedule</h4>
            <Badge className="bg-[#5DADA5] text-white text-xs ml-auto">
              Weekend Only
            </Badge>
          </div>

          <p className="text-sm text-[#1F2937] opacity-80 mb-3">
            Free listings are automatically set to the next weekend.
          </p>

          <div className="bg-white/60 rounded-lg p-3 space-y-2 text-sm">
            <div>
              <span className="font-medium text-[#2C4F4E]">Start: </span>
              <span className="text-[#1F2937]">
                {formatInTimeZone(window.startDateTime, timeZoneId)}
              </span>
            </div>
            <div>
              <span className="font-medium text-[#2C4F4E]">End: </span>
              <span className="text-[#1F2937]">
                {formatInTimeZone(window.endDateTime, timeZoneId)}
              </span>
            </div>
          </div>

          {/* (plain english) reminder text only; popup happens at submit */}
          <div className="mt-3 text-xs text-[#1F2937] opacity-90">
            If you post during the weekend, it will activate immediately but still expires Sunday night.
          </div>
        </div>
      </div>
    );
  }

  // FEATURED / PREMIUM / FREE (demo): date-only range selection
  const tierLabel = tier === "featured" ? "Featured" : tier === "premium" ? "Premium" : "Free";
  const scheduleLimitLabel = tier === "featured" ? "Up to 3 consecutive days" : tier === "premium" ? "Up to 5 consecutive days" : "";

  return (
    <div className="space-y-3 mt-4">
      <div className="rounded-xl border-2 border-[#2C4F4E] bg-[#E7D7B8] p-4">
        <div className="flex items-center gap-2 mb-2">
          <CalendarDays className="w-5 h-5 text-[#5DADA5]" />
          <h4 className="font-semibold text-[#2C4F4E]">Schedule</h4>

          {tier !== "free" && (
            <Badge className="bg-[#5DADA5] text-white text-xs ml-auto">
              {scheduleLimitLabel}
            </Badge>
          )}

          {demoActive && (
            <Badge className="bg-purple-500 text-white text-xs ml-2">
              Demo
            </Badge>
          )}
        </div>

        <p className="text-sm text-[#1F2937] opacity-80 mb-4">
          {tier === "free"
            ? "Demo mode: you can select dates, but Free normally auto-schedules for the weekend."
            : `${tierLabel} lets you choose ${tier === "featured" ? "1 to 3" : "1 to 5"} consecutive days.`}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[#2C4F4E] font-medium">Start Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, selectedRangeStartDate: e.target.value }))
              }
              className="bg-white border-[#2C4F4E]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[#2C4F4E] font-medium">End Date</Label>
            <Input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, selectedRangeEndDate: e.target.value }))
              }
              className="bg-white border-[#2C4F4E]"
            />
          </div>
        </div>

        {inlineError && (
          <div className="mt-3 text-sm text-red-700 bg-red-100 border border-red-200 rounded-md p-2">
            {inlineError}
          </div>
        )}
      </div>

      {/* Premium Early Visibility */}
      {tier === "premium" && computed?.valid && (
        <div className="rounded-xl border-2 border-[#F4A849] bg-[#F4A849]/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-5 h-5 text-[#F4A849]" />
            <h4 className="font-semibold text-[#2C4F4E]">Early Visibility</h4>
            <Badge className="bg-[#F4A849] text-[#2C4F4E] text-xs ml-auto">
              Optional
            </Badge>
          </div>

          <p className="text-sm text-[#1F2937] opacity-80 mb-3">
            Early Visibility shows your pin before your sale is OPEN.
            <br />
            <span className="font-medium text-[#2C4F4E]">
              Early Visibility days count toward your 5 total days.
            </span>
          </p>

          <div className="flex items-center gap-3">
            <Switch
              checked={premiumEarlyEnabled}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({
                  ...prev,
                  earlyVisibilityDays: checked ? 1 : 0
                }))
              }
            />
            <span className="text-sm text-[#2C4F4E] font-medium">
              {premiumEarlyEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>

          {premiumEarlyEnabled && (
            <div className="mt-3 flex items-center gap-3">
              <span className="text-sm text-[#2C4F4E] font-medium">Days:</span>

              <button
                type="button"
                className="px-3 py-1 rounded-md border-2 border-[#2C4F4E] bg-white text-[#2C4F4E]"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    earlyVisibilityDays: Math.max(0, (prev.earlyVisibilityDays || 0) - 1)
                  }))
                }
                disabled={earlyVisibilityDays <= 0}
              >
                -
              </button>

              <div className="min-w-[2rem] text-center text-sm font-semibold text-[#2C4F4E]">
                {earlyVisibilityDays}
              </div>

              <button
                type="button"
                className="px-3 py-1 rounded-md border-2 border-[#2C4F4E] bg-white text-[#2C4F4E]"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    earlyVisibilityDays: Math.min(3, (prev.earlyVisibilityDays || 0) + 1)
                  }))
                }
                disabled={earlyVisibilityDays >= 3}
              >
                +
              </button>

              <span className="text-xs text-[#1F2937] opacity-80">(0–3)</span>
            </div>
          )}

          {/* Preview (plain english: shows what’s yellow vs green without coloring calendar yet) */}
          <div className="mt-4 space-y-2 text-sm">
            <div>
              <span className="font-medium text-[#2C4F4E]">Early Visibility Dates: </span>
              <span className="text-[#1F2937]">
                {(computed.earlyVisibilityDates || []).length
                  ? computed.earlyVisibilityDates.map(d => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "2-digit" })).join(", ")
                  : "None"}
              </span>
            </div>

            <div>
              <span className="font-medium text-[#2C4F4E]">Active Dates: </span>
              <span className="text-[#1F2937]">
                {(computed.activeDates || []).length ? computed.activeDates.map(d => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "2-digit" })).join(", ") : "None"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
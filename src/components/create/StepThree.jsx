import React, { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// (plain english) simple helpers
function daysBetweenInclusive(startStr, endStr) {
  if (!startStr || !endStr) return 0;
  const s = new Date(`${startStr}T00:00:00`);
  const e = new Date(`${endStr}T00:00:00`);
  const diff = Math.round((e - s) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff + 1 : 0;
}

function addDays(dateStr, delta) {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + delta);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function StepOne({ formData, setFormData, onNext }) {
  const tier = formData?.tier || "free";
  const listingType = formData?.listingType || "yard_sale"; // (plain english) neighborhood sale is separate flow

  // (plain english) date fields used across your app already
  const startDate = formData?.selectedRangeStartDate || "";
  const endDate = formData?.selectedRangeEndDate || "";

  // (plain english) show date UI only for Featured/Premium AND only for normal listings
  const showDatePickers =
    listingType !== "neighborhood_sale" && (tier === "featured" || tier === "premium");

  // (plain english) enforce durations by tier (Featured 3, Premium 5)
  const requiredDays = tier === "featured" ? 3 : tier === "premium" ? 5 : 0;

  const selectedDays = useMemo(() => {
    return daysBetweenInclusive(startDate, endDate);
  }, [startDate, endDate]);

  const durationOk = useMemo(() => {
    if (!showDatePickers) return true;
    return selectedDays === requiredDays;
  }, [showDatePickers, selectedDays, requiredDays]);

  const durationHint = useMemo(() => {
    if (!showDatePickers) return "";
    if (!startDate || !endDate) return `Select ${requiredDays} consecutive days.`;
    if (durationOk) return `Perfect: ${requiredDays} days selected.`;
    if (selectedDays === 0) return `Select ${requiredDays} consecutive days.`;
    return `Must be exactly ${requiredDays} consecutive days (you selected ${selectedDays}).`;
  }, [showDatePickers, requiredDays, startDate, endDate, durationOk, selectedDays]);

  const setTier = (nextTier) => {
    setFormData((p) => {
      const updated = { ...p, tier: nextTier };

      // (plain english) if they switch to Free, remove any chosen dates from UI layer
      if (nextTier === "free") {
        delete updated.selectedRangeStartDate;
        delete updated.selectedRangeEndDate;
      }

      // (plain english) if they switch between Featured/Premium, keep startDate but auto-set endDate to valid length (if start exists)
      if ((nextTier === "featured" || nextTier === "premium") && p?.selectedRangeStartDate) {
        const req = nextTier === "featured" ? 3 : 5;
        updated.selectedRangeEndDate = addDays(p.selectedRangeStartDate, req - 1);
      }

      return updated;
    });
  };

  const handleStartChange = (val) => {
    setFormData((p) => {
      const req = p?.tier === "featured" ? 3 : p?.tier === "premium" ? 5 : 0;
      const next = { ...p, selectedRangeStartDate: val };

      // (plain english) auto-fill end date to match required length
      if (req > 0 && val) next.selectedRangeEndDate = addDays(val, req - 1);

      return next;
    });
  };

  const handleEndChange = (val) => {
    // (plain english) allow manual end change, but still validate and warn
    setFormData((p) => ({ ...p, selectedRangeEndDate: val }));
  };

  const canContinue = useMemo(() => {
    if (listingType === "neighborhood_sale") return true; // handled elsewhere
    if (tier === "free") return true;
    if (tier === "featured" || tier === "premium") {
      return !!startDate && !!endDate && durationOk;
    }
    return true;
  }, [listingType, tier, startDate, endDate, durationOk]);

  return (
    <div className="space-y-4">
      <div className="text-base font-semibold">Choose your tier</div>

      {/* (plain english) Neighborhood Sale should NOT show here */}
      <div className="grid gap-3">
        {/* FREE */}
        <Card
          className={`p-4 cursor-pointer border ${
            tier === "free" ? "ring-2 ring-black/20" : ""
          }`}
          onClick={() => setTier("free")}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold">Free</div>
              <div className="text-sm opacity-70">
                List view only. Runs next weekend (Fri–Sun).
              </div>
            </div>
            <div className="text-sm font-semibold">Free</div>
          </div>
        </Card>

        {/* FEATURED */}
        <Card
          className={`p-4 cursor-pointer border ${
            tier === "featured" ? "ring-2 ring-black/20" : ""
          }`}
          onClick={() => setTier("featured")}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold">Featured</div>
              <div className="text-sm opacity-70">
                Strong visibility. Requires exactly 3 consecutive days.
              </div>
            </div>
            <div className="text-sm font-semibold">(price)</div>
          </div>
        </Card>

        {/* PREMIUM */}
        <Card
          className={`p-4 cursor-pointer border ${
            tier === "premium" ? "ring-2 ring-black/20" : ""
          }`}
          onClick={() => setTier("premium")}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold">Premium</div>
              <div className="text-sm opacity-70">
                Highest residential tier. Requires exactly 5 consecutive days.
                (Pre-activation is set later in the flow.)
              </div>
            </div>
            <div className="text-sm font-semibold">$7.99</div>
          </div>
        </Card>
      </div>

      {/* Date pickers (only for Featured/Premium) */}
      {showDatePickers && (
        <Card className="p-4">
          <div className="font-semibold">Select your dates</div>
          <div className="text-sm opacity-70 mt-1">
            {tier === "featured"
              ? "Featured listings must run exactly 3 consecutive days."
              : "Premium listings must run exactly 5 consecutive days."}
          </div>

          <div className="mt-4 grid gap-3">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Start Date</label>
              <input
                type="date"
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={startDate}
                onChange={(e) => handleStartChange(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">End Date</label>
              <input
                type="date"
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={endDate}
                onChange={(e) => handleEndChange(e.target.value)}
              />
            </div>

            <div className={`text-sm ${durationOk ? "opacity-70" : "text-red-600"}`}>
              {durationHint}
            </div>
          </div>
        </Card>
      )}

      <div className="flex justify-end">
        <Button type="button" onClick={onNext} disabled={!canContinue}>
          Continue
        </Button>
      </div>
    </div>
  );
}
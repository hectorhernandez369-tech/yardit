import React, { useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, Eye } from "lucide-react";
import { toast } from "sonner";
import { isDemoMode } from "../shared/DemoMode";

function getNextFridayMidnight() {
  // Calculate next Friday 12:00 AM Pacific
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
  const day = now.getDay(); // 0=Sun, 5=Fri
  let daysUntilFriday = (5 - day + 7) % 7;
  if (daysUntilFriday === 0) {
    // If today is Friday, check if we're past midnight — use next Friday
    daysUntilFriday = 7;
  }
  const friday = new Date(now);
  friday.setDate(friday.getDate() + daysUntilFriday);
  friday.setHours(0, 0, 0, 0);
  return friday;
}

function getNextSundayEnd(friday) {
  const sunday = new Date(friday);
  sunday.setDate(sunday.getDate() + 2);
  sunday.setHours(23, 59, 0, 0);
  return sunday;
}

function toLocalISOString(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDisplayDate(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function TierSchedule({ formData, setFormData }) {
  const tier = formData.tier;

  const demoActive = isDemoMode();

  // Auto-set free tier dates (skip in demo mode)
  useEffect(() => {
    if (tier === "free" && !demoActive) {
      const friday = getNextFridayMidnight();
      const sunday = getNextSundayEnd(friday);
      setFormData((prev) => ({
        ...prev,
        startDateTime: friday.toISOString(),
        endDateTime: sunday.toISOString(),
        preActivateDays: 0,
      }));
    }
  }, [tier, demoActive]);

  // Clear preActivateDays when switching away from premium
  useEffect(() => {
    if (tier !== "premium") {
      setFormData((prev) => ({ ...prev, preActivateDays: 0 }));
    }
  }, [tier]);

  const maxDays = tier === "featured" ? 3 : tier === "premium" ? 5 : 0;
  const tierLabel = tier === "featured" ? "Featured" : tier === "premium" ? "Premium" : "Free";

  const handleStartChange = (e) => {
    setFormData((prev) => ({ ...prev, startDateTime: e.target.value }));
  };

  const handleEndChange = (e) => {
    const newEnd = e.target.value;
    if (formData.startDateTime && newEnd) {
      const start = new Date(formData.startDateTime);
      const end = new Date(newEnd);
      const diffMs = end - start;
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (!demoActive && diffDays > maxDays) {
        toast.error(`${tierLabel} listings can be up to ${maxDays} days`);
        return;
      }
      if (diffDays < 0) {
        toast.error("End time must be after start time");
        return;
      }
    }
    setFormData((prev) => ({ ...prev, endDateTime: newEnd }));
  };

  // Computed max end datetime string for the input (no max in demo mode)
  const maxEndDateTime = useMemo(() => {
    if (!formData.startDateTime || (tier === "free" && !demoActive)) return "";
    if (demoActive) return ""; // no cap in demo mode
    const start = new Date(formData.startDateTime);
    const maxEnd = new Date(start.getTime() + maxDays * 24 * 60 * 60 * 1000);
    return toLocalISOString(maxEnd);
  }, [formData.startDateTime, maxDays, tier, demoActive]);

  // FREE TIER — show auto-calculated window (or date pickers in demo mode)
  if (tier === "free" && !demoActive) {
    const friday = getNextFridayMidnight();
    const sunday = getNextSundayEnd(friday);
    return (
      <div className="space-y-3 mt-4">
        <div className="rounded-xl border-2 border-[#2C4F4E] bg-[#E7D7B8] p-4">
          <div className="flex items-center gap-2 mb-2">
            <CalendarDays className="w-5 h-5 text-[#5DADA5]" />
            <h4 className="font-semibold text-[#2C4F4E]">Schedule</h4>
          </div>
          <p className="text-sm text-[#1F2937] opacity-80 mb-3">
            Free listings are automatically set to the next weekend.
          </p>
          <div className="bg-white/60 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-[#5DADA5]" />
              <span className="font-medium text-[#2C4F4E]">Start:</span>
              <span className="text-[#1F2937]">{formatDisplayDate(friday)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-[#F4A849]" />
              <span className="font-medium text-[#2C4F4E]">End:</span>
              <span className="text-[#1F2937]">{formatDisplayDate(sunday)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // FEATURED / PREMIUM / FREE(demo) — show date/time pickers
  return (
    <div className="space-y-3 mt-4">
      <div className="rounded-xl border-2 border-[#2C4F4E] bg-[#E7D7B8] p-4">
        <div className="flex items-center gap-2 mb-2">
          <CalendarDays className="w-5 h-5 text-[#5DADA5]" />
          <h4 className="font-semibold text-[#2C4F4E]">Schedule</h4>
          {!demoActive && maxDays > 0 && (
            <Badge className="bg-[#5DADA5] text-white text-xs ml-auto">
              Up to {maxDays} days
            </Badge>
          )}
          {demoActive && (
            <Badge className="bg-purple-500 text-white text-xs ml-auto">Demo — no limits</Badge>
          )}
        </div>
        <p className="text-sm text-[#1F2937] opacity-80 mb-4">
          {demoActive
            ? "Demo mode: choose any dates you want."
            : `${tierLabel} listings can run for up to ${maxDays} days.`}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[#2C4F4E] font-medium">Start Date & Time</Label>
            <Input
              type="datetime-local"
              value={formData.startDateTime ? toLocalISOString(new Date(formData.startDateTime)) : ""}
              onChange={handleStartChange}
              className="bg-white border-[#2C4F4E]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[#2C4F4E] font-medium">End Date & Time</Label>
            <Input
              type="datetime-local"
              value={formData.endDateTime ? toLocalISOString(new Date(formData.endDateTime)) : ""}
              onChange={handleEndChange}
              min={formData.startDateTime ? toLocalISOString(new Date(formData.startDateTime)) : ""}
              max={maxEndDateTime}
              className="bg-white border-[#2C4F4E]"
            />
          </div>
        </div>
      </div>

      {/* Premium pre-activate pin option */}
      {tier === "premium" && (
        <div className="rounded-xl border-2 border-[#F4A849] bg-[#F4A849]/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-5 h-5 text-[#F4A849]" />
            <h4 className="font-semibold text-[#2C4F4E]">Pre-activate Map Pin</h4>
          </div>
          <p className="text-sm text-[#1F2937] opacity-80 mb-3">
            Show your pin on the map before the event starts. This does not change your event duration.
          </p>
          <div className="flex items-center gap-3">
            <Switch
              checked={(formData.preActivateDays || 0) > 0}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, preActivateDays: checked ? 2 : 0 }))
              }
            />
            <span className="text-sm text-[#2C4F4E] font-medium">
              {(formData.preActivateDays || 0) > 0 ? "Enabled" : "Disabled"}
            </span>
          </div>
          {(formData.preActivateDays || 0) > 0 && (
            <div className="mt-3">
              <Label className="text-[#2C4F4E] text-sm font-medium mb-1 block">
                Days before event
              </Label>
              <Select
                value={String(formData.preActivateDays || 2)}
                onValueChange={(val) =>
                  setFormData((prev) => ({ ...prev, preActivateDays: Number(val) }))
                }
              >
                <SelectTrigger className="w-40 bg-white border-[#2C4F4E]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 days early</SelectItem>
                  <SelectItem value="3">3 days early</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
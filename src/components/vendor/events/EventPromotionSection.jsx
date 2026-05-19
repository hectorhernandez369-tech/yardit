import { useMemo } from "react";
import { format, addDays, differenceInDays } from "date-fns";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Info, AlertTriangle, ArrowUpCircle } from "lucide-react";
import { getPromotionRule, getPromotionDates, calcPromotionUpgrade } from "@/lib/vendorEventPromotion";
import { getVendorTierConfig } from "@/lib/vendorTiers";

/**
 * EventPromotionSection
 *
 * Props:
 *   tierKey          - vendor tier string (e.g. "pro")
 *   eventStartDate   - ISO string of event start
 *   comingSoonDate   - ISO string (or "") of selected coming soon date
 *   onComingSoonDate - (isoString) => void
 */
export default function EventPromotionSection({ tierKey, eventStartDate, comingSoonDate, onComingSoonDate }) {
  const rule = getPromotionRule(tierKey);
  const tierConfig = getVendorTierConfig(tierKey);
  const isFree = tierKey === "free" || (rule.includedDays === 0 && rule.maxDays === 0);

  const { includedDate, earliestDate } = useMemo(() => {
    if (!eventStartDate) return { includedDate: null, earliestDate: null };
    return getPromotionDates(eventStartDate, tierKey);
  }, [eventStartDate, tierKey]);

  const { upgradeRequired, additionalDays } = useMemo(() => {
    if (!comingSoonDate || !includedDate) return { upgradeRequired: false, additionalDays: 0 };
    return calcPromotionUpgrade(comingSoonDate, includedDate);
  }, [comingSoonDate, includedDate]);

  const selectedDays = useMemo(() => {
    if (!comingSoonDate || !eventStartDate) return 0;
    return Math.max(0, differenceInDays(new Date(eventStartDate), new Date(comingSoonDate)));
  }, [comingSoonDate, eventStartDate]);

  // Date input min/max (yyyy-MM-dd strings for <input type="date">)
  const minDateStr = earliestDate ? format(earliestDate, "yyyy-MM-dd") : "";
  const maxDateStr = eventStartDate ? format(addDays(new Date(eventStartDate), -1), "yyyy-MM-dd") : "";

  const handleDateChange = (e) => {
    const val = e.target.value;
    if (!val) {
      onComingSoonDate("");
      return;
    }
    // Store as ISO date-time (start of day)
    onComingSoonDate(new Date(val + "T00:00:00").toISOString());
  };

  const comingSoonDateValue = comingSoonDate
    ? format(new Date(comingSoonDate), "yyyy-MM-dd")
    : includedDate
      ? format(includedDate, "yyyy-MM-dd")
      : "";

  return (
    <div className="rounded-2xl border border-[#2C4F4E]/15 bg-[#FBFAF7] p-4 space-y-4">
      <div className="flex items-start gap-2">
        <CalendarClock className="h-5 w-5 text-[#5DADA5] mt-0.5 shrink-0" />
        <div>
          <h3 className="font-black text-[#2C4F4E]">Event Promotion</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Your event can appear as <strong>Coming Soon</strong> before it starts. Higher vendor tiers include longer promotion windows.
          </p>
        </div>
      </div>

      {isFree ? (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3">
          <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>Free tier</strong> does not include event promotion. Upgrade to a paid vendor tier to promote events before they start.
          </p>
        </div>
      ) : (
        <>
          {/* Tier summary */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-white border border-[#2C4F4E]/10 p-3 space-y-0.5">
              <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide">Your Tier</p>
              <p className="font-bold text-[#2C4F4E]">{tierConfig.label}</p>
            </div>
            <div className="rounded-xl bg-white border border-[#2C4F4E]/10 p-3 space-y-0.5">
              <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide">Included Promotion</p>
              <p className="font-bold text-[#2C4F4E]">{rule.includedDays} days</p>
            </div>
            <div className="rounded-xl bg-white border border-[#2C4F4E]/10 p-3 space-y-0.5">
              <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide">Maximum Available</p>
              <p className="font-bold text-[#2C4F4E]">{rule.maxDays} days</p>
            </div>
            {eventStartDate && (
              <div className="rounded-xl bg-white border border-[#2C4F4E]/10 p-3 space-y-0.5">
                <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide">Event Starts</p>
                <p className="font-bold text-[#2C4F4E]">{format(new Date(eventStartDate), "MMM d, yyyy")}</p>
              </div>
            )}
          </div>

          {/* Date picker */}
          {eventStartDate ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-sm font-bold text-[#2C4F4E]">Coming Soon Start Date</Label>
                <p className="text-xs text-slate-500">
                  Earliest available: <strong>{earliestDate ? format(earliestDate, "MMM d, yyyy") : "—"}</strong>
                  {" "}· Included up to: <strong>{includedDate ? format(includedDate, "MMM d, yyyy") : "—"}</strong>
                </p>
                <Input
                  type="date"
                  min={minDateStr}
                  max={maxDateStr}
                  value={comingSoonDateValue}
                  onChange={handleDateChange}
                />
              </div>

              {/* Summary row */}
              {comingSoonDate && (
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                  <Badge className="bg-[#5DADA5] text-white">{selectedDays} days before event</Badge>
                  {!upgradeRequired && (
                    <Badge className="bg-emerald-600 text-white">Included in {tierConfig.label}</Badge>
                  )}
                  {upgradeRequired && (
                    <Badge className="bg-amber-500 text-white">
                      <ArrowUpCircle className="h-3 w-3 mr-1" />
                      Upgrade required (+{additionalDays} days)
                    </Badge>
                  )}
                </div>
              )}

              {/* Upgrade notice */}
              {upgradeRequired && (
                <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-sm text-amber-800 space-y-1">
                    <p>
                      <strong>Promotion upgrade required.</strong> Your {tierConfig.label} tier includes {rule.includedDays} days.
                      You selected {selectedDays} days, so this event requires a <strong>{selectedDays}-Day Event Boost</strong> promotion upgrade.
                    </p>
                    <p className="text-xs text-amber-700">
                      Promotion upgrade payment will be required before this event can use the selected Coming Soon date.
                      {/* TODO: Connect payment flow when available */}
                    </p>
                  </div>
                </div>
              )}

              <p className="text-xs text-slate-400 flex items-center gap-1">
                <Info className="h-3 w-3" />
                Coming Soon events may appear behind active events at the same location to keep the map clean.
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic">Set an event start date above to configure promotion.</p>
          )}
        </>
      )}
    </div>
  );
}
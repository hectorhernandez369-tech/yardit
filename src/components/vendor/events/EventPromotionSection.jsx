import { useMemo, useEffect } from "react";
import { format, differenceInCalendarDays, isSameDay } from "date-fns";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarClock, Info, AlertTriangle, ArrowUpCircle, CreditCard } from "lucide-react";
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
export default function EventPromotionSection({ tierKey, eventStartDate, comingSoonDate, onComingSoonDate, draftState, onSaveDraft }) {
  const rule = getPromotionRule(tierKey);
  const tierConfig = getVendorTierConfig(tierKey);
  const isFree = rule.includedDays === 0 && rule.maxDays === 0;

  const { includedDate, rawIncludedDate, earliestSelectableDate, defaultComingSoonDate, eventStartsToday } = useMemo(() => {
    if (!eventStartDate) return {};
    return getPromotionDates(eventStartDate, tierKey);
  }, [eventStartDate, tierKey]);

  // Auto-fill default when start date is set and no date chosen yet (or date became invalid)
  useEffect(() => {
    if (isFree || !eventStartDate || eventStartsToday || !defaultComingSoonDate) return;

    if (!comingSoonDate) {
      // No date selected yet → set default
      onComingSoonDate(defaultComingSoonDate.toISOString());
      return;
    }

    // If currently-selected date is now before the earliest selectable date, reset it
    if (earliestSelectableDate && new Date(comingSoonDate) < earliestSelectableDate) {
      onComingSoonDate(defaultComingSoonDate.toISOString());
    }
  }, [eventStartDate, isFree, eventStartsToday]);

  // Use rawIncludedDate for upgrade comparison (tier-based threshold, not clamped)
  const { upgradeRequired, additionalDays } = useMemo(() => {
    if (!comingSoonDate || !rawIncludedDate) return { upgradeRequired: false, additionalDays: 0 };
    return calcPromotionUpgrade(comingSoonDate, rawIncludedDate);
  }, [comingSoonDate, rawIncludedDate]);

  const selectedDays = useMemo(() => {
    if (!comingSoonDate || !eventStartDate) return 0;
    return Math.max(0, differenceInCalendarDays(new Date(eventStartDate), new Date(comingSoonDate)));
  }, [comingSoonDate, eventStartDate]);

  const isToday = useMemo(() => {
    if (!comingSoonDate) return false;
    return isSameDay(new Date(comingSoonDate), new Date());
  }, [comingSoonDate]);

  // Date picker min/max as yyyy-MM-dd strings
  const minDateStr = earliestSelectableDate ? format(earliestSelectableDate, "yyyy-MM-dd") : "";
  const maxDateStr = eventStartDate
    ? format(new Date(new Date(eventStartDate).setDate(new Date(eventStartDate).getDate() - 1)), "yyyy-MM-dd")
    : "";

  const handleDateChange = (e) => {
    const val = e.target.value;
    if (!val) { onComingSoonDate(""); return; }
    onComingSoonDate(new Date(val + "T00:00:00").toISOString());
  };

  const comingSoonDateValue = comingSoonDate
    ? format(new Date(comingSoonDate), "yyyy-MM-dd")
    : "";

  return (
    <div className="rounded-2xl border border-[#2C4F4E]/15 bg-[#FBFAF7] p-4 space-y-4">
      <div className="flex items-start gap-2">
        <CalendarClock className="h-5 w-5 text-[#5DADA5] mt-0.5 shrink-0" />
        <div>
          <h3 className="font-black text-[#2C4F4E]">Event Promotion</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Your event can appear as <strong>Coming Soon</strong> before it starts.
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
          {/* Tier summary cards */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-white border border-[#2C4F4E]/10 p-3 space-y-0.5">
              <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide">Your Tier</p>
              <p className="font-bold text-[#2C4F4E]">{tierConfig.label}</p>
            </div>
            <div className="rounded-xl bg-white border border-[#2C4F4E]/10 p-3 space-y-0.5">
              <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide">Included Promotion</p>
              <p className="font-bold text-[#2C4F4E]">
                {rule.includedDays} {rule.includedDays === 1 ? "day" : "days"}
              </p>
            </div>
            <div className="rounded-xl bg-white border border-[#2C4F4E]/10 p-3 space-y-0.5">
              <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide">Maximum Available</p>
              <p className="font-bold text-[#2C4F4E]">
                {rule.maxDays} {rule.maxDays === 1 ? "day" : "days"}
              </p>
            </div>
            {eventStartDate && (
              <div className="rounded-xl bg-white border border-[#2C4F4E]/10 p-3 space-y-0.5">
                <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide">Event Starts</p>
                <p className="font-bold text-[#2C4F4E]">{format(new Date(eventStartDate), "MMM d, yyyy")}</p>
              </div>
            )}
          </div>

          {/* No start date yet */}
          {!eventStartDate && (
            <p className="text-sm text-slate-500 italic">Set an event start date above to configure promotion.</p>
          )}

          {/* Event starts today or in the past — no promotion available */}
          {eventStartDate && eventStartsToday && (
            <div className="flex items-start gap-2 rounded-xl bg-slate-50 border border-slate-200 p-3">
              <Info className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
              <p className="text-sm text-slate-600">
                This event starts today or has already started, so Coming Soon promotion is no longer available.
              </p>
            </div>
          )}

          {/* Date picker — only when event is in the future */}
          {eventStartDate && !eventStartsToday && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-sm font-bold text-[#2C4F4E]">Coming Soon Start Date</Label>
                <p className="text-xs text-slate-500">
                  Your {tierConfig.label} tier includes <strong>{rule.includedDays} days</strong> of promotion.
                  {" "}You can promote this event up to <strong>{rule.maxDays} days</strong> before it starts.
                </p>
                {earliestSelectableDate && (
                  <p className="text-xs text-slate-500">
                    Earliest available: <strong>{format(earliestSelectableDate, "MMM d, yyyy")}</strong>
                  </p>
                )}
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
                  {isToday ? (
                    <Badge className="bg-[#5DADA5] text-white">Promotion starts immediately</Badge>
                  ) : (
                    selectedDays > 0 && (
                      <Badge className="bg-[#5DADA5] text-white">{selectedDays} {selectedDays === 1 ? "day" : "days"} before event</Badge>
                    )
                  )}
                  {!upgradeRequired && (
                    <Badge className="bg-emerald-600 text-white">Included in {tierConfig.label}</Badge>
                  )}
                  {upgradeRequired && (
                    <Badge className="bg-amber-500 text-white">
                      <ArrowUpCircle className="h-3 w-3 mr-1" />
                      Upgrade required (+{additionalDays} extra {additionalDays === 1 ? "day" : "days"})
                    </Badge>
                  )}
                </div>
              )}

              {/* Upgrade notice + checkout CTA */}
              {upgradeRequired && (
                <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-sm text-amber-800 space-y-2 flex-1">
                    <p>
                      <strong>Promotion upgrade required.</strong> Your {tierConfig.label} tier includes {rule.includedDays} days.
                      You selected {selectedDays} days (+{additionalDays} extra), so a promotion upgrade payment is required before publishing.
                    </p>
                    {draftState && onSaveDraft && (
                      <Button
                        size="sm"
                        onClick={() => {
                          // Save current draft state to sessionStorage so we can restore it after checkout
                          sessionStorage.setItem("vendor_event_draft_restore", JSON.stringify({
                            ...draftState,
                            _restore_timestamp: Date.now(),
                            _restore_step: "promotion_upgrade",
                          }));
                          onSaveDraft("promotion_upgrade_pending");
                        }}
                        className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        Save Draft & Go to Checkout
                      </Button>
                    )}
                    {(!draftState || !onSaveDraft) && (
                      <p className="text-xs text-amber-700">Save the event as a draft first, then complete the promotion upgrade checkout from your event dashboard.</p>
                    )}
                  </div>
                </div>
              )}

              <p className="text-xs text-slate-400 flex items-center gap-1">
                <Info className="h-3 w-3" />
                Coming Soon events may appear behind active events at the same location to keep the map clean.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
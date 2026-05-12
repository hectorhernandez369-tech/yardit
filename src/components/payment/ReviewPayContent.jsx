import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CalendarDays, CreditCard, Loader2, Lock, MapPin, Sparkles } from "lucide-react";

function money(amount) {
  return `$${Number(amount || 0).toFixed(2)}`;
}

function titleCase(value) {
  return String(value || "").replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function dateRange(item = {}) {
  const start = item.selectedRangeStartDate || item.startDateTime?.slice(0, 10) || item.start_datetime?.slice(0, 10);
  const end = item.selectedRangeEndDate || item.endDateTime?.slice(0, 10) || item.end_datetime?.slice(0, 10);
  if (!start && !end) return "Not selected";
  if (start === end || !end) return start;
  return `${start} – ${end}`;
}

function addressLine(item = {}) {
  return item.display_address || item.address_text || item.addressText || [item.city, item.state, item.zip].filter(Boolean).join(", ") || "Address not shown";
}

const tierHighlights = {
  featured: [
    "Improved map/list visibility",
    "Featured badge/styling",
    "Better placement than Free",
    "Payment required before activation",
  ],
  premium: [
    "Highest residential visibility",
    "Premium pin styling",
    "Early visibility/pre-activation if applicable",
    "Up to 5 total listing days",
    "Up to 20 photos",
    "Payment required before activation",
  ],
};

export default function ReviewPayContent({
  listing,
  tier,
  amount,
  isUpgrade = false,
  currentTier,
  originalPrice,
  amountPaid,
  isDemoMode,
  isProcessing,
  errorMessage,
  onBack,
  onPay,
}) {
  const selectedTier = tier || listing?.tier;
  const tierName = titleCase(selectedTier);
  const highlights = tierHighlights[selectedTier] || ["Payment required before activation"];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-br from-[#5DADA5] to-[#2C4F4E] p-5 text-white shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white/80">Review & Pay</p>
            <h2 className="text-2xl font-bold mt-1">{tierName} Listing</h2>
            <p className="text-sm text-white/85 mt-2">Review your listing before continuing to Stripe.</p>
          </div>
          <Badge className="bg-[#F4A849] text-[#2C4F4E] border border-white/40 text-sm px-3 py-1">
            {money(amount)}
          </Badge>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <Card className="border-[#2C4F4E]/20 bg-white/90 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <h3 className="font-semibold text-[#2C4F4E]">Listing Summary</h3>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <Summary label="Title" value={listing?.title || listing?.event_name || "Untitled listing"} />
            <Summary label="Listing Type" value={titleCase(listing?.listingType || "yard_sale")} />
            <Summary label="Selected Tier" value={tierName} />
            <Summary label="Sale Dates" value={dateRange(listing)} icon={<CalendarDays className="w-4 h-4" />} />
            <div className="sm:col-span-2">
              <Summary label="Address" value={addressLine(listing)} icon={<MapPin className="w-4 h-4" />} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#F4A849]/40 bg-[#F3E6CF]/70 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-[#2C4F4E]">Tier Summary</h3>
            <Badge className="bg-[#F4A849] text-[#2C4F4E]">{tierName} · {money(amount)}</Badge>
          </div>
          <ul className="space-y-2 text-sm text-slate-700">
            {highlights.map((item) => (
              <li key={item} className="flex gap-2">
                <Sparkles className="w-4 h-4 mt-0.5 text-[#F4A849] shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {isUpgrade && (
        <Card className="border-slate-200 bg-white/90 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-[#2C4F4E]">Upgrade Summary</h3>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <Summary label="Current Tier" value={titleCase(currentTier)} />
              <Summary label="New Tier" value={tierName} />
              <Summary label="Original Price" value={money(originalPrice)} />
              <Summary label="Amount Already Paid" value={money(amountPaid)} />
              <Summary label="Amount Due Today" value={money(amount)} strong />
            </div>
            <p className="rounded-lg bg-[#F3E6CF] p-3 text-sm font-medium text-[#2C4F4E]">You are only paying the difference.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <div className="flex gap-2 font-semibold text-slate-900 mb-1"><CreditCard className="w-4 h-4" />Secure Payment</div>
          {isDemoMode ? "Demo Mode: payment is simulated." : "You’ll be sent to Stripe to complete payment securely. Yardit does not store your card information."}
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="flex gap-2 font-semibold mb-1"><AlertTriangle className="w-4 h-4" />Important</div>
          Your paid visibility will activate only after Stripe confirms payment.
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
        <Button type="button" variant="outline" onClick={onBack} disabled={isProcessing} className="flex-1 border-[#2C4F4E] text-[#2C4F4E]">
          Back to Tier Selection
        </Button>
        <Button type="button" onClick={onPay} disabled={isProcessing} className="flex-1 bg-[#F4A849] hover:bg-[#E39635] text-[#2C4F4E] border-2 border-[#2C4F4E] font-semibold">
          {isProcessing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : <><Lock className="w-4 h-4 mr-2" />Continue to Stripe</>}
        </Button>
      </div>
    </div>
  );
}

function Summary({ label, value, icon, strong = false }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-white p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 flex items-center gap-2 break-words text-slate-900 ${strong ? "text-lg font-bold" : "font-medium"}`}>
        {icon}{value || "—"}
      </p>
    </div>
  );
}
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CreditCard, Loader2 } from "lucide-react";

function money(amount) {
  return `$${Number(amount || 0).toFixed(2)}`;
}

function titleCase(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function listingSummary(listing = {}, tier) {
  const start = listing.selectedRangeStartDate || listing.startDateTime?.slice(0, 10) || listing.start_datetime?.slice(0, 10);
  const end = listing.selectedRangeEndDate || listing.endDateTime?.slice(0, 10) || listing.end_datetime?.slice(0, 10);
  const dates = start && end && start !== end ? `${start} – ${end}` : start || end || "Not selected";
  const address = listing.display_address || listing.address_text || listing.addressText || [listing.city, listing.state, listing.zip].filter(Boolean).join(", ") || "Address selected";

  return [
    { label: "Title", value: listing.title || listing.event_name || "Untitled listing" },
    { label: "Dates", value: dates },
    { label: "Address", value: address },
  ];
}

const benefitMap = {
  featured: ["Improved visibility", "Featured placement", "Better discovery"],
  premium: ["Highest residential visibility", "Premium styling", "Up to 5 listing days", "Up to 20 photos"],
  starter: ["Simple vendor tools", "Business profile", "Basic check-ins"],
  pro: ["Increased visibility", "Unlimited check-ins", "Business branding"],
  growth: ["Premium business visibility", "More vendor pins", "Expanded team access"],
  event_organizer: ["Event Dashboard access", "Advanced event tools", "Collaboration features"],
  listing_upgrade: ["Upgraded visibility", "Improved placement", "Only pay the difference"],
};

export default function ReviewPayContent({
  purchaseName,
  price,
  badge,
  tier,
  purchaseType,
  listing,
  summaryTitle = "Summary",
  summaryItems,
  benefits,
  isProcessing,
  errorMessage,
  onBack,
  onPay,
  backLabel = "Back",
  continueLabel = "Continue to Stripe",
}) {
  const key = purchaseType || tier;
  const resolvedName = purchaseName || `${titleCase(tier)} Listing`;
  const resolvedSummary = summaryItems || (listing ? listingSummary(listing, tier) : []);
  const resolvedBenefits = benefits || benefitMap[key] || benefitMap[tier] || [];

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-[#5DADA5] to-[#2C4F4E] p-4 text-white shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/75">Review & Pay</p>
            <h2 className="mt-1 text-xl font-bold sm:text-2xl break-words">{resolvedName}</h2>
            {badge && <Badge className="mt-2 bg-[#F4A849] text-[#2C4F4E]">{badge}</Badge>}
          </div>
          <div className="shrink-0 rounded-xl bg-white/15 px-3 py-2 text-right">
            <p className="text-xs text-white/75">Price</p>
            <p className="font-bold">{money(price)}</p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {resolvedSummary.length > 0 && (
        <div className="rounded-2xl border border-[#2C4F4E]/15 bg-white/90 p-4 shadow-sm">
          <h3 className="text-sm font-bold text-[#2C4F4E]">{summaryTitle}</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {resolvedSummary.map((item) => (
              <div key={item.label} className="min-w-0 rounded-xl bg-[#F3E6CF]/45 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900 break-words">{item.value || "—"}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {resolvedBenefits.length > 0 && (
        <div className="rounded-2xl border border-[#F4A849]/40 bg-[#FFF7E8] p-4 shadow-sm">
          <h3 className="text-sm font-bold text-[#2C4F4E]">Tier Summary</h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {resolvedBenefits.map((benefit) => (
              <li key={benefit} className="flex gap-2 text-sm text-slate-700">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#F4A849]" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        <CreditCard className="h-4 w-4 shrink-0 text-[#2C4F4E]" />
        <span>Secure checkout powered by Stripe.</span>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Paid access activates only after Stripe confirms payment.</span>
      </div>

      <div className="grid gap-2 pt-1 sm:grid-cols-2">
        <Button type="button" variant="outline" onClick={onBack} disabled={isProcessing} className="border-[#2C4F4E] text-[#2C4F4E]">
          {backLabel}
        </Button>
        <Button type="button" onClick={onPay} disabled={isProcessing} className="bg-[#F4A849] text-[#2C4F4E] border-2 border-[#2C4F4E] hover:bg-[#E39635] font-semibold">
          {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : continueLabel}
        </Button>
      </div>
    </div>
  );
}
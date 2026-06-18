import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CreditCard, Loader2, Tag } from "lucide-react";

function money(amount) {
  return `$${Number(amount || 0).toFixed(2)}`;
}

function titleCase(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function listingSummary(listing = {}, tier) {
  const start = listing.selectedRangeStartDate || listing.startDateTime?.slice(0, 10) || listing.start_datetime?.slice(0, 10);
  const end = listing.selectedRangeEndDate || listing.endDateTime?.slice(0, 10) || listing.end_datetime?.slice(0, 10);
  const dates = start && end && start !== end ? `${formatDate(start)} – ${formatDate(end)}` : formatDate(start || end) || "Not selected";
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
  promoResult,
  promoInputSlot,
  requireNonRefundAcknowledgement = false,
}) {
  const [nonRefundAcknowledged, setNonRefundAcknowledged] = useState(false);
  const nonRefundDisclosure = "I understand this paid Yardit listing purchase is non-refundable once payment is submitted.";
  const key = purchaseType || tier;
  const resolvedName = purchaseName || `${titleCase(tier)} Listing`;
  const resolvedSummary = summaryItems || (listing ? listingSummary(listing, tier) : []);
  const resolvedBenefits = benefits || benefitMap[key] || benefitMap[tier] || [];

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="rounded-3xl border border-[#2C4F4E]/10 bg-white p-5 shadow-sm sm:p-6">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#5DADA5]">Listing Review</p>
          <h2 className="text-2xl font-bold leading-tight text-[#2C4F4E] sm:text-3xl break-words">{resolvedName}</h2>
          <p className="text-sm text-slate-600">Review the details below, then apply a promo code if you have one before checkout.</p>
          {badge && <Badge className="bg-[#F4A849] text-[#2C4F4E] hover:bg-[#F4A849]">{badge}</Badge>}
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      )}

      {resolvedSummary.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h3 className="text-base font-bold text-[#2C4F4E]">{summaryTitle}</h3>
          <div className="mt-4 divide-y divide-slate-100">
            {resolvedSummary.map((item) => (
              <div key={item.label} className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[150px_1fr] sm:gap-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{item.label}</p>
                <p className="text-sm font-semibold text-slate-900 break-words">{item.value || "—"}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {resolvedBenefits.length > 0 && (
        <section className="rounded-3xl border border-[#F4A849]/35 bg-[#FFF9EE] p-5 shadow-sm sm:p-6">
          <h3 className="text-base font-bold text-[#2C4F4E]">What’s included</h3>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {resolvedBenefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3 text-sm text-slate-700">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#F4A849]" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {promoInputSlot && (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {promoInputSlot}
        </section>
      )}

      <section className="rounded-3xl border border-[#2C4F4E]/15 bg-white p-5 shadow-md sm:p-6">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#5DADA5]">Review & Pay</p>
            <h3 className="mt-1 text-xl font-black text-[#2C4F4E]">Ready for checkout</h3>
          </div>
          <div className="rounded-2xl bg-[#F8F2E8] px-5 py-4 text-left sm:min-w-[210px] sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total due</p>
            {promoResult ? (
              <>
                <p className="mt-1 text-sm text-slate-500 line-through">{money(price)}</p>
                <p className="text-3xl font-black text-[#2C4F4E]">{money(promoResult.finalAmount)}</p>
                <p className="text-xs font-medium text-green-700">Promo applied</p>
              </>
            ) : (
              <p className="mt-1 text-3xl font-black text-[#2C4F4E]">{money(price)}</p>
            )}
          </div>
        </div>

        {promoResult && (
          <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm">
            <div className="flex items-center gap-2 font-bold text-green-800">
              <Tag className="h-4 w-4" /> Promo Applied: {promoResult.promoCode?.code}
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600"><span>Original</span><span>{money(price)}</span></div>
              <div className="flex justify-between text-green-700"><span>Discount</span><span>-{money(promoResult.discountAmount)}</span></div>
              <div className="border-t border-green-200 pt-2 flex justify-between font-black text-green-900"><span>Total Due</span><span>{money(promoResult.finalAmount)}</span></div>
            </div>
          </div>
        )}

        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-[#2C4F4E]" />
          <div>
            <p className="font-bold text-[#2C4F4E]">Secure checkout</p>
            <p className="text-xs text-slate-500">Powered by Stripe. Paid access activates after payment is confirmed.</p>
          </div>
        </div>

        {requireNonRefundAcknowledgement && (
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <Checkbox checked={nonRefundAcknowledged} onCheckedChange={(checked) => setNonRefundAcknowledged(checked === true)} className="mt-0.5" />
            <span><strong>Required:</strong> {nonRefundDisclosure}</span>
          </label>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Button type="button" variant="outline" onClick={onBack} disabled={isProcessing} className="border-[#2C4F4E]/35 text-[#2C4F4E]">
            {backLabel}
          </Button>
          <Button
            type="button"
            onClick={() => onPay?.({ nonRefundAcknowledgement: {
              acknowledged: nonRefundAcknowledged,
              acknowledged_at: nonRefundAcknowledged ? new Date().toISOString() : "",
              disclosure_text: nonRefundDisclosure,
            }})}
            disabled={isProcessing || (requireNonRefundAcknowledgement && !nonRefundAcknowledged)}
            className="bg-[#F4A849] text-[#2C4F4E] border-2 border-[#2C4F4E] hover:bg-[#E39635] font-bold shadow-sm"
          >
            {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : continueLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}
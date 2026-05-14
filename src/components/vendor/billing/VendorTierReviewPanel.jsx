import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Shield, CheckCircle2, AlertCircle, ArrowRight, Lock, Loader2 } from "lucide-react";
import { VENDOR_TIERS, VENDOR_TIER_ORDER } from "@/lib/vendorTiers";

function money(amount) {
  return `$${Number(amount || 0).toFixed(2)}`;
}

const UNLOCK_FEATURES = {
  starter: [
    "1 Single Event per month included",
    "Business profile on vendor map",
    "Vendor check-ins Friday–Sunday",
    "1 included vendor user",
    "Like button on profile",
  ],
  pro: [
    "3 Single Events OR 1 Multi-Field Event per month",
    "Logo pin on the live map",
    "Unlimited check-ins any day of the week",
    "2 included vendor users",
    "Higher map visibility priority",
    "Visible across your neighborhood",
  ],
  growth: [
    "8 Single Events OR 3 Multi-Field Events per month",
    "Animated map pin",
    "2 included truck/location pins",
    "3 included vendor users",
    "Premium city-wide visibility",
    "Extra users & pins available as add-ons",
  ],
  event_organizer: [
    "20 Single Events OR 8 Multi-Field Events per month",
    "Event Dashboard with full management tools",
    "Multi-user collaboration (up to 10 users)",
    "Event collaborator & co-organizer invitations",
    "5 included truck/location pins",
    "Animated logo pins & highest map visibility",
    "Built for recurring organized public events",
  ],
};

export default function VendorTierReviewPanel({
  targetTierKey,
  currentTierKey,
  account,
  pendingAddOns = { extraUsers: 0, extraPins: 0 },
  isProcessing,
  onBack,
  onPay,
}) {
  const tier = VENDOR_TIERS[targetTierKey];
  const currentTier = VENDOR_TIERS[currentTierKey] || VENDOR_TIERS.free;
  const priceNum = Number(String(tier?.price || "0").replace(/[^0-9.]/g, "")) || 0;
  const addOnsCost = (pendingAddOns.extraUsers * 5) + (pendingAddOns.extraPins * 10);
  const totalMonthly = priceNum + addOnsCost;
  const isOrganizer = targetTierKey === "event_organizer";

  const renewalDate = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  })();

  const unlockItems = UNLOCK_FEATURES[targetTierKey] || [];
  const accentColor = isOrganizer ? "text-blue-700" : "text-[#2C4F4E]";
  const headerGradient = isOrganizer
    ? "from-blue-700 to-blue-900"
    : "from-[#5DADA5] to-[#2C4F4E]";

  return (
    <div className="space-y-4 max-w-2xl mx-auto">

      {/* Hero header */}
      <div className={`rounded-2xl bg-gradient-to-br ${headerGradient} p-5 text-white shadow-md`}>
        <p className="text-xs font-semibold uppercase tracking-wider text-white/70 mb-1">Plan Upgrade Review</p>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">{tier?.label} Plan</h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-white/70 text-sm line-through">{currentTier.label}</span>
              <ArrowRight className="w-3.5 h-3.5 text-white/50" />
              <Badge className={isOrganizer ? "bg-blue-400 text-white" : "bg-[#F4A849] text-[#2C4F4E]"}>
                {tier?.label}
              </Badge>
            </div>
          </div>
          <div className="shrink-0 text-right bg-white/15 rounded-xl px-4 py-3">
            <p className="text-xs text-white/70">Monthly</p>
            <p className="text-2xl font-bold">{money(totalMonthly)}</p>
            <p className="text-xs text-white/60">/ month</p>
          </div>
        </div>
      </div>

      {/* Plan Change Summary */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 mb-3">Plan Change Summary</h3>
        <div className="flex items-center gap-3 text-sm">
          <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 font-medium">{currentTier.label}</span>
          <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
          <span className={`px-3 py-1.5 rounded-lg font-semibold ${isOrganizer ? "bg-blue-100 text-blue-800" : "bg-[#F3E6CF] text-[#2C4F4E]"}`}>{tier?.label}</span>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          This upgrade activates immediately after successful payment confirmation from Stripe.
        </p>
      </div>

      {/* Billing Summary */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 mb-3">Billing Summary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { label: "Business", value: account?.vendor_display_name || account?.business_name || "Vendor Account" },
            { label: "Current Tier", value: currentTier.label },
            { label: "New Tier", value: tier?.label },
            { label: "Base Plan Cost", value: `${money(priceNum)}/month` },
            ...(pendingAddOns.extraUsers > 0 ? [{ label: "Extra Users", value: `+${pendingAddOns.extraUsers} × $5 = ${money(pendingAddOns.extraUsers * 5)}/mo` }] : []),
            ...(pendingAddOns.extraPins > 0 ? [{ label: "Extra Pins", value: `+${pendingAddOns.extraPins} × $10 = ${money(pendingAddOns.extraPins * 10)}/mo` }] : []),
            { label: "Total Monthly Cost", value: `${money(totalMonthly)}/month` },
            { label: "Billing Starts", value: "Today after payment confirmation" },
            { label: "Next Renewal", value: renewalDate },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl bg-slate-50 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">{value}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-3 flex items-start gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-green-500" />
          Upgrade activates immediately after successful Stripe confirmation.
        </p>
      </div>

      {/* What You Unlock */}
      {unlockItems.length > 0 && (
        <div className={`rounded-2xl border p-4 shadow-sm ${isOrganizer ? "border-blue-200 bg-blue-50" : "border-[#F4A849]/40 bg-[#FFF7E8]"}`}>
          <h3 className={`text-sm font-bold mb-3 ${accentColor}`}>What You Unlock</h3>
          <ul className="space-y-2">
            {unlockItems.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${isOrganizer ? "text-blue-500" : "text-[#5DADA5]"}`} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Important Billing Notes */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <h3 className="text-sm font-bold text-amber-800">Important Billing Notes</h3>
        </div>
        <ul className="space-y-1.5 text-sm text-amber-900">
          {[
            "Subscription renews automatically every month",
            `Cancel anytime before ${renewalDate} to avoid the next charge`,
            "Failed payments may pause paid features on your account",
            "Stripe securely processes all payments — Yardit does not store card data",
          ].map((note) => (
            <li key={note} className="flex items-start gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
              {note}
            </li>
          ))}
        </ul>
      </div>

      {/* Trust Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {[
          { icon: Lock, text: "Secure checkout via Stripe" },
          { icon: Shield, text: "Encrypted payment processing" },
          { icon: CheckCircle2, text: "No hidden fees" },
        ].map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-600">
            <Icon className="w-3.5 h-3.5 shrink-0 text-[#5DADA5]" />
            <span>{text}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="grid gap-2 sm:grid-cols-2 pt-1">
        <Button type="button" variant="outline" onClick={onBack} disabled={isProcessing} className="border-[#2C4F4E] text-[#2C4F4E]">
          Back
        </Button>
        <Button
          type="button"
          onClick={onPay}
          disabled={isProcessing}
          className={`font-semibold border-2 ${isOrganizer ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-800" : "bg-[#F4A849] text-[#2C4F4E] border-[#2C4F4E] hover:bg-[#E39635]"}`}
        >
          {isProcessing
            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
            : <><Lock className="mr-2 h-4 w-4" />Continue to Secure Checkout</>}
        </Button>
      </div>
    </div>
  );
}
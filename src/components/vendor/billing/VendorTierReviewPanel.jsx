import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Shield, CheckCircle2, AlertCircle, ArrowRight, Lock, Loader2, Info } from "lucide-react";
import { VENDOR_TIERS, VENDOR_TIER_ORDER } from "@/lib/vendorTiers";
import PromoCodeInput from "./PromoCodeInput";

function money(amount) {
  return `$${Number(amount || 0).toFixed(2)}`;
}

function calcProration(monthlyAmount) {
  const today = new Date();
  const renewalDate = new Date(today);
  renewalDate.setMonth(renewalDate.getMonth() + 1);
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysRemaining = Math.ceil((renewalDate - today) / (1000 * 60 * 60 * 24));
  const dailyRate = monthlyAmount / daysInMonth;
  return dailyRate * daysRemaining;
}

// Calculate the dollar discount amount given a promo + base price
function calcDiscount(promo, basePrice) {
  if (!promo) return 0;
  if (promo.discount_type === "percentage") {
    return (basePrice * Number(promo.discount_value)) / 100;
  }
  if (promo.discount_type === "fixed_amount") {
    return Math.min(Number(promo.discount_value), basePrice);
  }
  // free_trial and custom don't affect the dollar amount shown
  return 0;
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
  extraUsers = 0,
  extraPins = 0,
  isProcessing,
  onBack,
  onPay,
}) {
  const topRef = useRef(null);
  const [appliedPromo, setAppliedPromo] = useState(null);

  useEffect(() => {
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const tier = VENDOR_TIERS[targetTierKey];
  const currentTier = VENDOR_TIERS[currentTierKey] || VENDOR_TIERS.free;
  const priceNum = Number(String(tier?.price || "0").replace(/[^0-9.]/g, "")) || 0;
  const isOrganizer = targetTierKey === "event_organizer";

  const addOnUsersCost = extraUsers * 5;
  const addOnPinsCost = extraPins * 10;
  const totalAddOnsCost = addOnUsersCost + addOnPinsCost;
  const subtotal = priceNum + totalAddOnsCost;

  const discountAmount = calcDiscount(appliedPromo, priceNum);
  const discountedPriceNum = Math.max(0, priceNum - discountAmount);
  const estimatedMonthlyTotal = discountedPriceNum + totalAddOnsCost;

  const proratedAddOnCost = totalAddOnsCost > 0 ? calcProration(totalAddOnsCost) : 0;
  const dueToday = discountedPriceNum + (totalAddOnsCost > 0 ? proratedAddOnCost : 0);

  const renewalDate = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  })();

  const unlockItems = UNLOCK_FEATURES[targetTierKey] || [];
  const accentColor = isOrganizer ? "text-blue-700" : "text-[#2C4F4E]";
  const headerGradient = isOrganizer ? "from-blue-700 to-blue-900" : "from-[#5DADA5] to-[#2C4F4E]";

  const isFreeTrialPromo = appliedPromo?.discount_type === "free_trial";

  return (
    <div ref={topRef} className="space-y-4 max-w-2xl mx-auto">

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
            <p className="text-2xl font-bold">{money(priceNum)}</p>
            <p className="text-xs text-white/60">/ month</p>
          </div>
        </div>
      </div>

      {/* Plan Change Summary */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 mb-3">Plan Change</h3>
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

        {/* Plan line */}
        <div className="rounded-xl bg-slate-50 px-3 py-2.5 mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Plan</p>
          <div className="flex items-center justify-between mt-0.5">
            <p className="text-sm font-semibold text-slate-800">{tier?.label}</p>
            <p className="text-sm font-semibold text-slate-800">{money(priceNum)}/mo</p>
          </div>
        </div>

        {/* Included */}
        <div className="rounded-xl bg-slate-50 px-3 py-2.5 mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Included</p>
          <p className="text-sm text-slate-700 mt-0.5">{tier?.includedUsers} user{tier?.includedUsers !== 1 ? "s" : ""} · {tier?.includedPins} pin{tier?.includedPins !== 1 ? "s" : ""}</p>
        </div>

        {/* Add-ons (if any) */}
        {totalAddOnsCost > 0 && (
          <div className="rounded-xl bg-slate-50 px-3 py-2.5 mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Add-ons</p>
            <div className="mt-0.5 space-y-1">
              {extraUsers > 0 && (
                <div className="flex items-center justify-between text-sm text-slate-700">
                  <span>+{extraUsers} additional user{extraUsers !== 1 ? "s" : ""}</span>
                  <span className="font-semibold">{money(addOnUsersCost)}/mo</span>
                </div>
              )}
              {extraPins > 0 && (
                <div className="flex items-center justify-between text-sm text-slate-700">
                  <span>+{extraPins} additional pin{extraPins !== 1 ? "s" : ""}</span>
                  <span className="font-semibold">{money(addOnPinsCost)}/mo</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Promo Code Input */}
        <div className="mb-2">
          <PromoCodeInput
            tier={targetTierKey}
            appliedPromo={appliedPromo}
            onPromoApplied={setAppliedPromo}
            onPromoRemoved={() => setAppliedPromo(null)}
          />
        </div>

        {/* Discount line (if promo applied and has dollar value) */}
        {appliedPromo && discountAmount > 0 && (
          <div className="rounded-xl bg-green-50 border border-green-200 px-3 py-2.5 mb-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-green-700 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Promo: {appliedPromo.code}
              </span>
              <span className="text-green-700 font-bold">−{money(discountAmount)}/mo</span>
            </div>
            {appliedPromo.description && <p className="text-[11px] text-green-600 mt-0.5">{appliedPromo.description}</p>}
          </div>
        )}

        {/* Free trial banner */}
        {isFreeTrialPromo && (
          <div className="rounded-xl bg-blue-50 border border-blue-200 px-3 py-2.5 mb-2 space-y-1">
            <div className="flex items-center gap-2 text-sm text-blue-800 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              Free Trial: {appliedPromo.discount_value} days free on {tier?.label}
            </div>
            {appliedPromo.description && <p className="text-[11px] text-blue-600">{appliedPromo.description}</p>}
            {appliedPromo.is_founding_vendor && appliedPromo.founding_recurring_price != null ? (
              <p className="text-[11px] text-blue-700 font-semibold">
                Then ${appliedPromo.founding_recurring_price}/month while subscription remains active
                {appliedPromo.founding_forfeits_on_cancel && " · Canceling subscription permanently forfeits this rate"}
              </p>
            ) : (
              <p className="text-[11px] text-blue-600">
                Then {money(priceNum)}/month after trial ends
              </p>
            )}
          </div>
        )}

        {/* Founding vendor locked rate banner */}
        {appliedPromo?.is_founding_vendor && !isFreeTrialPromo && appliedPromo.founding_recurring_price != null && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 mb-2">
            <div className="flex items-center gap-2 text-sm text-amber-800 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
              Founding Vendor Rate: ${appliedPromo.founding_recurring_price}/month locked in
            </div>
            {appliedPromo.founding_forfeits_on_cancel && (
              <p className="text-[11px] text-amber-700 mt-0.5">Canceling your subscription permanently forfeits this grandfathered price</p>
            )}
          </div>
        )}

        {/* Benefit expiration notice */}
        {appliedPromo?.benefits_expire_at && (
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 mb-2">
            <p className="text-[11px] text-slate-600">
              Promo benefits expire: <strong>{new Date(appliedPromo.benefits_expire_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</strong>
            </p>
          </div>
        )}

        {/* Redeem window notice */}
        {appliedPromo?.redeem_by_date && (
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 mb-2">
            <p className="text-[11px] text-slate-500">
              Code redeemable until {new Date(appliedPromo.redeem_by_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} · your benefits are not affected by the redeem window
            </p>
          </div>
        )}

        {/* Totals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
          <div className="rounded-xl bg-[#F3E6CF]/60 border border-[#F4A849]/30 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Est. Monthly Total</p>
            {discountAmount > 0 && (
              <p className="text-xs text-slate-400 line-through">{money(subtotal)}/mo</p>
            )}
            <p className="text-lg font-bold text-[#2C4F4E] mt-0.5">
              {isFreeTrialPromo
                ? <span className="text-blue-700">Free Trial</span>
                : appliedPromo?.is_founding_vendor && appliedPromo.founding_recurring_price != null
                  ? <>{money(appliedPromo.founding_recurring_price)}<span className="text-xs font-normal text-slate-500">/mo (locked)</span></>
                  : <>{money(estimatedMonthlyTotal)}<span className="text-xs font-normal text-slate-500">/mo</span></>}
            </p>
            {isFreeTrialPromo && appliedPromo?.is_founding_vendor && appliedPromo.founding_recurring_price != null && (
              <p className="text-[11px] text-blue-600 mt-0.5">Then ${appliedPromo.founding_recurring_price}/mo after trial</p>
            )}
          </div>
          <div className="rounded-xl bg-[#F3E6CF]/60 border border-[#F4A849]/30 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Due Today</p>
            <p className="text-lg font-bold text-[#2C4F4E] mt-0.5">
              {isFreeTrialPromo ? <span className="text-blue-700">$0.00</span> : money(dueToday)}
            </p>
            {totalAddOnsCost > 0 && !isFreeTrialPromo && (
              <p className="text-[10px] text-slate-500 mt-0.5">Tier + prorated add-ons</p>
            )}
            {isFreeTrialPromo && (
              <p className="text-[10px] text-blue-600 mt-0.5">{appliedPromo.discount_value} days free</p>
            )}
          </div>
        </div>

        {/* Billing dates */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Billing Starts</p>
            <p className="text-sm font-semibold text-slate-800 mt-0.5">Today after payment</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Next Renewal</p>
            <p className="text-sm font-semibold text-slate-800 mt-0.5">{renewalDate}</p>
          </div>
        </div>

        <p className="text-xs text-slate-500 mt-3 flex items-start gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-green-500" />
          Upgrade activates immediately after successful Stripe confirmation.
        </p>
      </div>

      {/* Proration / add-on billing note */}
      {totalAddOnsCost > 0 && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 space-y-1">
              <p className="font-semibold">Add-on Billing</p>
              <p>Add-ons added today are prorated to your next billing date ({renewalDate}). You pay only for the remaining days in this billing cycle.</p>
              <p className="text-xs text-blue-700 mt-1">Removed add-ons stay active until your next billing date. Your monthly total will update on the next cycle.</p>
            </div>
          </div>
        </div>
      )}

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
            "Add-ons added mid-cycle are prorated to your next billing date",
            "Removed add-ons take effect on the next billing cycle — no mid-cycle refunds",
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
          onClick={() => onPay({ appliedPromo, discountAmount })}
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
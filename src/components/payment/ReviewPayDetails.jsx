import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, MapPin, ShieldCheck, Star, Trophy } from "lucide-react";

const TIER_DETAILS = {
  featured: {
    icon: Star,
    badgeClass: "bg-amber-500 text-[#2C4F4E] border border-[#2C4F4E]",
    items: [
      "Improved map/list visibility",
      "Featured badge/styling",
      "Better placement than Free",
      "Payment required before activation",
    ],
  },
  premium: {
    icon: Trophy,
    badgeClass: "bg-purple-600 text-white border border-purple-800",
    items: [
      "Highest residential visibility",
      "Premium pin styling",
      "Early visibility/pre-activation if applicable",
      "Up to 5 total listing days",
      "Up to 20 photos",
      "Payment required before activation",
    ],
  },
};

function formatMoney(amount) {
  const value = Number(amount || 0);
  return `$${value.toFixed(2)}`;
}

function formatTierName(tier) {
  return String(tier || "").replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) || "Selected Tier";
}

function formatListingType(type) {
  if (type === "yard_sale") return "Yard Sale";
  if (type === "neighborhood_sale") return "Neighborhood Sale";
  if (type === "event") return "Event";
  return "Listing";
}

function formatDateRange(listing) {
  if (listing?.selectedRangeStartDate && listing?.selectedRangeEndDate) {
    return listing.selectedRangeStartDate === listing.selectedRangeEndDate
      ? listing.selectedRangeStartDate
      : `${listing.selectedRangeStartDate} – ${listing.selectedRangeEndDate}`;
  }

  if (listing?.startDateTime && listing?.endDateTime) {
    return `${new Date(listing.startDateTime).toLocaleDateString()} – ${new Date(listing.endDateTime).toLocaleDateString()}`;
  }

  return "Selected sale dates";
}

function getAddress(listing) {
  return listing?.display_address || listing?.addressText || listing?.address_text || [listing?.city, listing?.state, listing?.zip].filter(Boolean).join(", ") || "Address selected";
}

export default function ReviewPayDetails({ listing, tier, amount, upgrade }) {
  const tierKey = String(tier || "").toLowerCase();
  const details = TIER_DETAILS[tierKey] || TIER_DETAILS.featured;
  const Icon = details.icon;
  const title = listing?.event_name || listing?.title || "Your listing";

  return (
    <div className="space-y-4">
      <div className="text-center sm:text-left">
        <h2 className="text-2xl sm:text-3xl font-bold text-[#2C4F4E]">Review & Pay</h2>
        <p className="text-sm text-slate-600 mt-1">Review your listing before continuing to secure Stripe checkout.</p>
      </div>

      <Card className="border-[#2C4F4E]/20 bg-white/90">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Listing Summary</p>
              <h3 className="text-lg font-semibold text-slate-900 break-words">{title}</h3>
            </div>
            <Badge variant="outline" className="w-fit bg-[#F3E6CF] text-[#2C4F4E] border-[#2C4F4E]/30">
              {formatListingType(listing?.listingType)}
            </Badge>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div className="flex gap-2 text-slate-700 min-w-0">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-[#5DADA5]" />
              <span className="break-words">{getAddress(listing)}</span>
            </div>
            <div className="flex gap-2 text-slate-700">
              <CalendarDays className="w-4 h-4 mt-0.5 shrink-0 text-[#F4A849]" />
              <span>{formatDateRange(listing)}</span>
            </div>
          </div>

          <div className="text-sm text-slate-700">
            <span className="font-medium">Selected tier:</span> {formatTierName(tier)}
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#2C4F4E]/20 bg-[#F3E6CF]/70">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white border border-[#2C4F4E]/20 flex items-center justify-center">
                <Icon className="w-5 h-5 text-[#2C4F4E]" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Tier Summary</p>
                <p className="font-semibold text-[#2C4F4E]">{formatTierName(tier)}</p>
              </div>
            </div>
            <Badge className={details.badgeClass}>{formatMoney(amount)}</Badge>
          </div>

          <ul className="grid sm:grid-cols-2 gap-2 text-sm text-slate-700">
            {details.items.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#5DADA5] shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {upgrade && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 space-y-3 text-sm text-slate-700">
            <p className="font-semibold text-[#2C4F4E]">Upgrade Summary</p>
            <div className="grid sm:grid-cols-2 gap-2">
              <p><span className="font-medium">Current tier:</span> {formatTierName(upgrade.currentTier)}</p>
              <p><span className="font-medium">New tier:</span> {formatTierName(upgrade.newTier)}</p>
              <p><span className="font-medium">Original price:</span> {formatMoney(upgrade.originalPrice)}</p>
              <p><span className="font-medium">Amount already paid:</span> {formatMoney(upgrade.amountPaid)}</p>
              <p className="sm:col-span-2 text-base font-semibold text-[#2C4F4E]">Amount due today: {formatMoney(upgrade.amountDue)}</p>
            </div>
            <p className="font-medium">You are only paying the difference.</p>
          </CardContent>
        </Card>
      )}

      <div className="rounded-lg border border-[#5DADA5]/30 bg-[#5DADA5]/10 p-4 text-sm text-[#2C4F4E] space-y-2">
        <p>You’ll be sent to Stripe to complete payment securely. Yardit does not store your card information.</p>
        <p className="font-semibold flex gap-2"><ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" /> Your paid visibility will activate only after Stripe confirms payment.</p>
      </div>
    </div>
  );
}
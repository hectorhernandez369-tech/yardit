import { format } from "date-fns";
import { deriveNeighborhoodEventState } from "@/lib/neighborhoodSaleState";

export const tierColors = {
  free: "bg-slate-500",
  basic: "bg-slate-700",
  featured: "bg-purple-600",
  premium: "bg-amber-600",
  marquee: "bg-rose-600",
  neighborhood_tier: "bg-emerald-600",
};

export const statusColors = {
  active: "bg-green-600",
  upcoming: "bg-teal-600",
  hidden: "bg-gray-500",
  under_review: "bg-yellow-600",
  suspended: "bg-red-600",
  completed: "bg-blue-600",
  expired: "bg-gray-400",
  draft: "bg-slate-400",
  pending_activation: "bg-amber-500",
  activated: "bg-teal-600",
  activated_locked: "bg-emerald-700",
  coming_soon: "bg-cyan-600",
  downgraded: "bg-red-600",
  canceled: "bg-slate-500",
};

export function getListingDisplayStatus(listing) {
  if (listing?.listingType === "neighborhood_sale") {
    return deriveNeighborhoodEventState(listing) || "pending_activation";
  }

  const now = Date.now();
  const rawStatus = listing?.status || "active";
  const endMs = listing?.endDateTime ? new Date(listing.endDateTime).getTime() : null;
  const startMs = listing?.startDateTime ? new Date(listing.startDateTime).getTime() : null;
  const isPast = endMs && !Number.isNaN(endMs) && endMs < now;

  if (rawStatus === "active") {
    if (isPast) return "expired";
    if (startMs && !Number.isNaN(startMs) && startMs > now) return "upcoming";
  }

  if (isPast && rawStatus !== "completed" && rawStatus !== "suspended") {
    return "expired";
  }

  return rawStatus;
}

export function formatListingStatusLabel(status) {
  return String(status || "active")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatListingTierLabel(tier) {
  if (tier === "neighborhood_tier") return "Neighborhood";
  if (tier === "basic") return "Basic";
  if (tier === "marquee") return "Marquee";
  return String(tier || "free")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getListingAddressLine(listing) {
  const street = listing?.addressText || listing?.street_address || "Address unavailable";
  const parts = [street, listing?.city, listing?.state].filter(Boolean);
  const base = parts.join(", ");
  return listing?.zip ? `${base} ${listing.zip}` : base;
}

export function formatListingDateRange(listing) {
  const start = listing?.startDateTime;
  const end = listing?.endDateTime;

  if (start && end) {
    return `${format(new Date(start), "PPp")} — ${format(new Date(end), "PPp")}`;
  }

  if (start) return format(new Date(start), "PPp");
  if (end) return format(new Date(end), "PPp");
  return "No dates set";
}

export function getOwnerDisplayName(owner, listing) {
  return owner?.full_name || owner?.email || listing?.created_by || listing?.ownerUserId || "Owner unavailable";
}

export function getListingNumber(listing) {
  if (listing?.listingNumber) return listing.listingNumber;
  const st = (listing?.state || "XX").toUpperCase().slice(0, 2);
  const zp = (listing?.zip || "0000").slice(-4).padStart(4, "0");
  const idSuffix = (listing?.id || "00000").slice(-5).toLowerCase();
  return `${st}${zp}-${idSuffix}`;
}
import React, { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// (plain english) safe UUID generator
function makeId() {
  try {
    if (crypto?.randomUUID) return crypto.randomUUID();
  } catch {}
  return `ns_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function StepThree({ formData, setFormData }) {
  const isNeighborhoodSale = formData?.listingType === "neighborhood_sale";

  // ---------------------------
  // Neighborhood Invite Code
  // ---------------------------
  useEffect(() => {
    if (!isNeighborhoodSale) return;
    if (formData?.neighborhoodDraftId || formData?.invite_code) return;

    const id = makeId();
    setFormData((p) => ({
      ...p,
      neighborhoodDraftId: id,
      invite_code: id, // (plain english) saved later on the listing record
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNeighborhoodSale]);

  const inviteUrl = useMemo(() => {
    if (!isNeighborhoodSale) return "";
    const code = formData?.neighborhoodDraftId || formData?.invite_code;
    if (!code) return "";
    return `${window.location.origin}/join-neighborhood-sale?code=${encodeURIComponent(code)}`;
  }, [isNeighborhoodSale, formData?.neighborhoodDraftId, formData?.invite_code]);

  const copyInviteLink = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Link copied");
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = inviteUrl;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        toast.success("Link copied");
      } catch {
        toast.error("Could not copy link");
      }
    }
  };

  const shareInviteLink = async () => {
    if (!inviteUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join our Neighborhood Sale",
          text: "Tap to request to join the Neighborhood Sale on Yardit.",
          url: inviteUrl,
        });
        return;
      } catch {
        // user cancelled - ignore
      }
    }
    await copyInviteLink();
  };

  // ---------------------------
  // Tier selection
  // ---------------------------
  const tier = formData?.tier || "free";

  const setTier = (value) => {
    setFormData((p) => ({
      ...p,
      tier: value,
    }));
  };

  // (plain english) quick display values — the real FREE rules are enforced in CreateListing.jsx
  const freeLabel = "Free (Next Weekend Only)";
  const premiumLabel = "Premium ($7.99)";

  // ---------------------------
  // Review helper text
  // ---------------------------
  const reviewTypeText = isNeighborhoodSale ? "Neighborhood Sale (Event)" : "Standard Listing";
  const reviewRadiusText = isNeighborhoodSale ? "500 ft radius (fixed)" : "Standard location rules";

  const start = formData?.startDateTime || "";
  const end = formData?.endDateTime || "";
  const rangeText =
    start && end
      ? `${new Date(start).toLocaleDateString()} – ${new Date(end).toLocaleDateString()}`
      : "(dates will be set by tier rules)";

  return (
    <div className="space-y-4">
      {/* ---------------------------
          Tier Selection (RESTORED)
         --------------------------- */}
      <Card className="p-4">
        <div className="space-y-1">
          <div className="text-sm font-semibold">Tier</div>
          <div className="text-xs opacity-70">
            Choose how much visibility you want. (plain english: free is limited, paid gets priority)
          </div>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <button
            type="button"
            onClick={() => setTier("free")}
            className={[
              "rounded-md border p-3 text-left transition",
              tier === "free" ? "border-black/40 bg-black/[0.03]" : "hover:bg-black/[0.02]",
            ].join(" ")}
          >
            <div className="text-sm font-semibold">{freeLabel}</div>
            <div className="mt-1 text-xs opacity-70">
              Runs the very next weekend (Fri–Sun). No custom dates.
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTier("premium")}
            className={[
              "rounded-md border p-3 text-left transition",
              tier === "premium" ? "border-black/40 bg-black/[0.03]" : "hover:bg-black/[0.02]",
            ].join(" ")}
          >
            <div className="text-sm font-semibold">{premiumLabel}</div>
            <div className="mt-1 text-xs opacity-70">
              Priority placement and better visibility.
            </div>
          </button>
        </div>

        {isNeighborhoodSale && (
          <div className="mt-3 text-xs opacity-70">
            Neighborhood Sale pricing is a flat rate ($49). (plain english: you don’t pick per-home tiers here)
          </div>
        )}
      </Card>

      {/* ---------------------------
          Review / Summary
         --------------------------- */}
      <Card className="p-4">
        <div className="text-sm font-semibold">Review</div>

        <div className="mt-3 space-y-2 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="opacity-70">Listing Type</span>
            <span className="font-medium">{reviewTypeText}</span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="opacity-70">Tier Selected</span>
            <span className="font-medium">{tier}</span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="opacity-70">Dates</span>
            <span className="font-medium">{rangeText}</span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="opacity-70">Radius</span>
            <span className="font-medium">{reviewRadiusText}</span>
          </div>
        </div>
      </Card>

      {/* ---------------------------
          Invite Homes (Neighborhood Only)
         --------------------------- */}
      {isNeighborhoodSale && (
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="text-sm font-semibold">Invite Homes</div>
              <div className="text-xs opacity-70">
                Share this link so homes can request to join your Neighborhood Sale.
              </div>
            </div>
          </div>

          <div className="mt-3 space-y-3">
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={inviteUrl}
              readOnly
              onFocus={(e) => e.target.select()}
            />

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={copyInviteLink}>
                Copy Link
              </Button>
              <Button type="button" className="flex-1" onClick={shareInviteLink}>
                Share
              </Button>
            </div>

            <div className="text-[11px] opacity-60">
              (plain english) This link sends people to the request-to-join page.
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
import React, { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

function makeId() {
  try {
    if (crypto?.randomUUID) return crypto.randomUUID();
  } catch {}
  return `ns_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function addDays(dateStr, delta) {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + delta);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function StepThree({ formData, setFormData }) {
  const isNeighborhoodSale = formData?.listingType === "neighborhood_sale";

  useEffect(() => {
    if (!isNeighborhoodSale) return;
    if (formData?.neighborhoodDraftId) return;

    const id = makeId();
    setFormData((p) => ({
      ...p,
      neighborhoodDraftId: id,
      invite_code: id,
    }));
  }, [isNeighborhoodSale, formData?.neighborhoodDraftId, setFormData]);

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
      } catch {}
    }
    await copyInviteLink();
  };

  const premiumAdStartDate = useMemo(() => {
    if (formData.tier === "premium" && formData.earlyVisibilityDays > 0 && formData.selectedRangeStartDate) {
       return addDays(formData.selectedRangeStartDate, -formData.earlyVisibilityDays);
    }
    return null;
  }, [formData.tier, formData.earlyVisibilityDays, formData.selectedRangeStartDate]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border-2 border-[#2C4F4E] bg-[#E7D7B8] p-4">
        <h3 className="text-[#2C4F4E] font-semibold">Review & Summary</h3>
        <p className="text-sm text-[#1F2937] opacity-80">
          Review your listing details before creating.
        </p>
      </div>

      <Card className="p-4 border-2 border-[#2C4F4E] bg-[#F3E6CF] shadow-sm">
        <div className="space-y-4">
          <div>
            <div className="text-xs text-[#1F2937] opacity-70 mb-1">Type & Tier</div>
            <div className="font-semibold text-[#2C4F4E] text-lg">
               {isNeighborhoodSale ? "Neighborhood Sale" : formData.tier === "premium" ? "Premium Listing" : formData.tier === "featured" ? "Featured Listing" : "Free Listing"}
            </div>
          </div>
          
          <div>
            <div className="text-xs text-[#1F2937] opacity-70 mb-1">Event Dates</div>
            <div className="font-semibold text-[#2C4F4E] text-base">
              {isNeighborhoodSale ? (
                `${formData.selectedRangeStartDate || "?"} to ${formData.selectedRangeEndDate || "?"}`
              ) : formData.tier === "free" ? (
                "Next weekend (Fri–Sun)"
              ) : formData.tier === "featured" ? (
                `${formData.selectedRangeStartDate || "?"} to ${formData.selectedRangeEndDate || "?"} (3 days)`
              ) : (
                `${formData.selectedRangeStartDate || "?"} to ${formData.selectedRangeEndDate || "?"} (5 days)`
              )}
            </div>
          </div>

          {!isNeighborhoodSale && formData.tier === "premium" && formData.earlyVisibilityDays > 0 && (
            <div className="bg-[#E7D7B8] p-3 rounded-lg border border-[#F4A849]">
              <div className="text-xs text-[#2C4F4E] font-semibold mb-1">Pre-Activation Advertising</div>
              <div className="font-semibold text-[#2C4F4E]">
                Starts on <span className="underline decoration-[#F4A849] decoration-2">{premiumAdStartDate}</span> ({formData.earlyVisibilityDays} days early)
              </div>
            </div>
          )}

          {isNeighborhoodSale && (
            <div>
              <div className="text-xs text-[#1F2937] opacity-70 mb-1">Area Size</div>
              <div className="font-semibold text-[#2C4F4E]">500 ft radius</div>
            </div>
          )}
        </div>
      </Card>

      {isNeighborhoodSale && (
        <Card className="p-4 border-2 border-[#2C4F4E] bg-[#E7D7B8]">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-[#2C4F4E]">Invite Homes</div>
              <div className="text-xs text-[#1F2937] opacity-80">
                Share this link so homes can request to join your Neighborhood Sale.
              </div>
            </div>
          </div>

          <div className="mt-3 space-y-3">
            <input
              className="w-full rounded-md border border-[#2C4F4E] px-3 py-2 text-sm bg-[#F3E6CF]"
              value={inviteUrl}
              readOnly
              onFocus={(e) => e.target.select()}
            />

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1 border-[#2C4F4E] text-[#2C4F4E] hover:bg-white" onClick={copyInviteLink}>
                Copy Link
              </Button>
              <Button type="button" className="flex-1 bg-[#F4A849] hover:bg-[#E39635] text-[#2C4F4E] border border-[#2C4F4E] shadow-sm" onClick={shareInviteLink}>
                Share
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
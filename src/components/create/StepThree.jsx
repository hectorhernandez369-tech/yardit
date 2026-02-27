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

  // (plain english) create a stable draft invite code BEFORE publish, so EO can share immediately
  useEffect(() => {
    if (!isNeighborhoodSale) return;
    if (formData?.neighborhoodDraftId) return;

    const id = makeId();
    setFormData((p) => ({
      ...p,
      neighborhoodDraftId: id,
      // (plain english) store on the listing too so backend can save it as invite_code
      invite_code: id,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNeighborhoodSale]);

  const inviteUrl = useMemo(() => {
    if (!isNeighborhoodSale) return "";
    const code = formData?.neighborhoodDraftId || formData?.invite_code;
    if (!code) return "";
    // (plain english) this is the link people will click to request to join
    return `${window.location.origin}/join-neighborhood-sale?code=${encodeURIComponent(code)}`;
  }, [isNeighborhoodSale, formData?.neighborhoodDraftId, formData?.invite_code]);

  const copyInviteLink = async () => {
    if (!inviteUrl) return;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Link copied");
    } catch {
      // (plain english) fallback for older devices
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

    // (plain english) use phone’s share sheet if available
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join our Neighborhood Sale",
          text: "Tap to request to join the Neighborhood Sale on Yardit.",
          url: inviteUrl,
        });
        return;
      } catch {
        // user canceled share — do nothing
      }
    }

    // (plain english) fallback = copy
    await copyInviteLink();
  };

  return (
    <div className="space-y-4">
      {/* ===== Existing Tier / Review UI =====
          (plain english) KEEP whatever you already had here.
          If your previous StepThree had more content, paste it above/below this new section.
      */}

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
              (plain english) If you change this URL path later, update it in this file and in the join page route.
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
import React, { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

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
  const tier = formData?.tier || "free";

  const setTier = (nextTier) => {
    setFormData((p) => {
      const updated = { ...p, tier: nextTier };
      if (nextTier === "free") {
        delete updated.selectedRangeStartDate;
        delete updated.selectedRangeEndDate;
        updated.earlyVisibilityDays = 0;
      }
      return updated;
    });
  };

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
      {!isNeighborhoodSale && (
        <>
          <div className="rounded-xl border-2 border-[#2C4F4E] bg-[#E7D7B8] p-4">
            <h3 className="text-[#2C4F4E] font-semibold">Choose Your Tier & Schedule</h3>
            <p className="text-sm text-[#1F2937] opacity-80">
              Select a tier and your event dates
            </p>
          </div>

          <div className="space-y-3 mt-4">
            <Label className="text-[#2C4F4E] font-semibold block mb-2">Choose your tier</Label>
            <div className="grid gap-3">
              <Card className={`p-4 cursor-pointer border-2 transition-all ${tier === "free" ? "border-[#5DADA5] bg-[#E7D7B8] shadow-md" : "border-[#2C4F4E]/40 bg-[#F3E6CF] hover:border-[#2C4F4E]"}`} onClick={() => setTier("free")}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-[#2C4F4E] flex items-center gap-2">
                      Free
                      {tier === "free" && <span className="text-xs bg-[#5DADA5] text-white px-2 py-0.5 rounded-full">Selected</span>}
                    </div>
                    <div className="text-sm text-[#1F2937] opacity-80 mt-1">List view only. Runs next weekend (Fri–Sun).</div>
                  </div>
                  <div className="text-sm font-semibold text-[#2C4F4E]">Free</div>
                </div>
              </Card>

              <Card className={`p-4 cursor-pointer border-2 transition-all ${tier === "featured" ? "border-[#5DADA5] bg-[#E7D7B8] shadow-md" : "border-[#2C4F4E]/40 bg-[#F3E6CF] hover:border-[#2C4F4E]"}`} onClick={() => setTier("featured")}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-[#2C4F4E] flex items-center gap-2">
                      Featured
                      {tier === "featured" && <span className="text-xs bg-[#5DADA5] text-white px-2 py-0.5 rounded-full">Selected</span>}
                    </div>
                    <div className="text-sm text-[#1F2937] opacity-80 mt-1">Strong visibility. Requires exactly 3 consecutive days.</div>
                  </div>
                  <div className="text-sm font-semibold text-[#2C4F4E]">($)</div>
                </div>
              </Card>

              <Card className={`p-4 cursor-pointer border-2 transition-all ${tier === "premium" ? "border-[#F4A849] bg-[#E7D7B8] shadow-md" : "border-[#2C4F4E]/40 bg-[#F3E6CF] hover:border-[#2C4F4E]"}`} onClick={() => setTier("premium")}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-[#2C4F4E] flex items-center gap-2">
                      Premium
                      {tier === "premium" && <span className="text-xs bg-[#F4A849] text-[#2C4F4E] px-2 py-0.5 rounded-full">Selected</span>}
                    </div>
                    <div className="text-sm text-[#1F2937] opacity-80 mt-1">Highest residential tier. Allows 1-5 consecutive days. Includes pre-activation advertising.</div>
                  </div>
                  <div className="text-sm font-semibold text-[#2C4F4E]">$7.99</div>
                </div>
              </Card>
            </div>
          </div>

          {(tier === "featured" || tier === "premium") && (
            <div className="pt-6 mt-6 border-t-2 border-[#2C4F4E]/20">
              <div className="rounded-xl border-2 border-[#2C4F4E] bg-[#E7D7B8] p-4 mb-4">
                <h3 className="text-[#2C4F4E] font-semibold">Event Dates</h3>
                <p className="text-sm text-[#1F2937] opacity-80">
                  {tier === "featured" 
                    ? "Featured listings must run exactly 3 consecutive days." 
                    : "Premium listings can run up to 5 consecutive days."}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#2C4F4E]">Start Date *</Label>
                  <Input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={formData.selectedRangeStartDate || ""}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      const nextState = { ...formData, selectedRangeStartDate: newStart };
                      
                      if (newStart) {
                        const d = new Date(`${newStart}T00:00:00`);
                        if (tier === "featured") {
                          d.setDate(d.getDate() + 2); // exactly 3 days (start + 2)
                          const pad = (n) => String(n).padStart(2, "0");
                          nextState.selectedRangeEndDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
                        } else if (tier === "premium") {
                           if (nextState.selectedRangeEndDate) {
                              const eDt = new Date(`${nextState.selectedRangeEndDate}T00:00:00`);
                              const diff = Math.round((eDt - d) / (1000 * 60 * 60 * 24));
                              if (diff < 0 || diff > 4) {
                                  d.setDate(d.getDate() + 4);
                                  const pad = (n) => String(n).padStart(2, "0");
                                  nextState.selectedRangeEndDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
                              }
                           }
                        }
                      }
                      setFormData(nextState);
                    }}
                    className={`bg-[#F3E6CF] border-[#2C4F4E]`}
                    required
                  />
                </div>
                <div>
                  <Label className="text-[#2C4F4E]">End Date *</Label>
                  <Input
                    type="date"
                    min={formData.selectedRangeStartDate || new Date().toISOString().split('T')[0]}
                    max={tier === "premium" && formData.selectedRangeStartDate ? (() => {
                      const d = new Date(`${formData.selectedRangeStartDate}T00:00:00`);
                      d.setDate(d.getDate() + 4);
                      const pad = (n) => String(n).padStart(2, "0");
                      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
                    })() : undefined}
                    value={formData.selectedRangeEndDate || ""}
                    disabled={tier === "featured"}
                    onChange={(e) => {
                       if (tier === "premium") {
                          const newEnd = e.target.value;
                          const dStart = new Date(`${formData.selectedRangeStartDate}T00:00:00`);
                          const dEnd = new Date(`${newEnd}T00:00:00`);
                          const diff = Math.round((dEnd - dStart) / (1000 * 60 * 60 * 24));
                          if (diff >= 0 && diff <= 4) {
                             setFormData(prev => ({ ...prev, selectedRangeEndDate: newEnd }));
                          } else {
                             toast.error("Premium can run up to 5 consecutive days.");
                          }
                       }
                    }}
                    className={`bg-[#F3E6CF] border-[#2C4F4E]`}
                    required
                  />
                  {formData.selectedRangeStartDate && formData.selectedRangeEndDate && tier === "premium" && (
                     <p className={`text-xs mt-1 ${
                       (() => {
                         const s = new Date(`${formData.selectedRangeStartDate}T00:00:00`);
                         const e = new Date(`${formData.selectedRangeEndDate}T00:00:00`);
                         const diffDays = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
                         return diffDays > 0 && diffDays <= 5 ? "hidden" : "text-red-500 font-medium";
                       })()
                     }`}>
                       Premium allows up to 5 consecutive days.
                     </p>
                  )}
                </div>
              </div>

              {tier === "premium" && (
                <div className="mt-6 p-4 border-2 border-[#F4A849] bg-[#E7D7B8] rounded-xl shadow-sm">
                  <Label className="text-[#2C4F4E] text-base font-bold mb-2 block">Pre-Activation Advertising</Label>
                  <p className="text-sm text-[#1F2937] opacity-80 mb-4">
                    Shows your pin early for advertising only. Does not start the sale early.
                  </p>
                  <div className="flex items-center gap-4 bg-[#F3E6CF] p-3 rounded-lg border border-[#2C4F4E]/30 w-fit">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setFormData(p => ({ ...p, earlyVisibilityDays: Math.max(0, (p.earlyVisibilityDays || 0) - 1)}))}
                      className="w-10 h-10 border-2 border-[#2C4F4E] bg-white text-[#2C4F4E] shadow-sm font-bold text-lg"
                    >-</Button>
                    <span className="font-bold text-[#2C4F4E] text-xl w-6 text-center">{formData.earlyVisibilityDays || 0}</span>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setFormData(p => ({ ...p, earlyVisibilityDays: Math.min(3, (p.earlyVisibilityDays || 0) + 1)}))}
                      className="w-10 h-10 border-2 border-[#2C4F4E] bg-white text-[#2C4F4E] shadow-sm font-bold text-lg"
                    >+</Button>
                    <span className="text-sm font-medium text-[#2C4F4E] ml-2">Days before start</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <div className="rounded-xl border-2 border-[#2C4F4E] bg-[#E7D7B8] p-4 mt-8">
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
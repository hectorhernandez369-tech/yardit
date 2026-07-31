import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Calendar, Home, Loader2, Plus } from "lucide-react";
import { FALLBACK_ACTION_CANCEL, FALLBACK_ACTION_PREMIUM, getEligibleFallbackListings } from "@/lib/neighborhoodFallback";

function makeListingNumber(user, fallbackZip) {
  const stateCode = String(user?.state || "CA").toUpperCase().slice(0, 2) || "CA";
  const zipLast4 = String(fallbackZip || user?.zip_code || "0000").slice(-4).padStart(4, "0");
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let suffix = "";
  for (let i = 0; i < 5; i += 1) suffix += chars[Math.floor(Math.random() * chars.length)];
  return `${stateCode}${zipLast4}-${suffix}`;
}

function formatRange(item) {
  const start = item?.selectedRangeStartDate || item?.startDateTime?.slice?.(0, 10) || "?";
  const end = item?.selectedRangeEndDate || item?.endDateTime?.slice?.(0, 10) || "?";
  return start === end ? start : `${start} to ${end}`;
}

export default function NeighborhoodFallbackChoice({ formData, setFormData, user }) {
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState({ title: "My Yard Sale", category: "Miscellaneous", openTime: "08:00", closeTime: "14:00", description: "" });

  const eligibleListings = useMemo(() => getEligibleFallbackListings(listings, formData, user?.id), [listings, formData, user?.id]);
  const selectedListing = eligibleListings.find((listing) => listing.id === formData.fallback_listing_id);

  useEffect(() => {
    let cancelled = false;
    const loadListings = async () => {
      if (!user?.id) return;
      setIsLoading(true);
      const rows = await base44.entities.Listing.filter({ ownerUserId: user.id, listingType: "yard_sale" }, "-created_date").catch(() => []);
      if (!cancelled) {
        setListings(rows || []);
        setIsLoading(false);
      }
    };
    loadListings();
    return () => { cancelled = true; };
  }, [user?.id]);

  const setFallbackAction = (action) => {
    setFormData((prev) => ({
      ...prev,
      fallback_action: action,
      fallback_listing_id: action === FALLBACK_ACTION_PREMIUM ? prev.fallback_listing_id || "" : "",
      fallback_consent_at: "",
    }));
  };

  const selectListing = (listing) => {
    setFormData((prev) => ({
      ...prev,
      fallback_action: FALLBACK_ACTION_PREMIUM,
      fallback_listing_id: listing.id,
      fallback_consent_at: "",
    }));
    toast.success("Host Yard Sale connected for Premium fallback.");
  };

  const createHostListing = async () => {
    if (!user?.id) return;
    if (!formData.selectedRangeStartDate || !formData.selectedRangeEndDate) {
      toast.error("Choose Neighborhood Sale dates first.");
      return;
    }
    if (formData.host_mode !== "self") {
      toast.error("Creating a Premium fallback Yard Sale requires your own confirmed address inside the Neighborhood Sale radius.");
      return;
    }
    const addressText = user.street_address || formData.host_addressText;
    const city = user.city || formData.host_city;
    const state = user.state || formData.host_state;
    const zip = user.zip_code || formData.host_zip;
    const lat = user.address_lat ?? formData.host_address_lat;
    const lng = user.address_lng ?? formData.host_address_lng;
    if (!addressText || !city || !state || !zip || typeof lat !== "number" || typeof lng !== "number") {
      toast.error("The Premium fallback needs your own confirmed host address inside the Neighborhood Sale radius.");
      return;
    }

    setIsCreating(true);
    try {
      const payload = {
        ownerUserId: user.id,
        listingType: "yard_sale",
        title: draft.title || "My Yard Sale",
        description: draft.description || "",
        addressText,
        city,
        state,
        zip,
        lat,
        lng,
        timeZoneId: formData.timeZoneId || user.timeZoneId || "America/Los_Angeles",
        tier: "free",
        pricePaid: 0,
        status: "scheduled",
        category: draft.category || "Miscellaneous",
        categories: [draft.category || "Miscellaneous"],
        selectedRangeStartDate: formData.selectedRangeStartDate,
        selectedRangeEndDate: formData.selectedRangeEndDate,
        openTime: draft.openTime || "08:00",
        closeTime: draft.closeTime || "14:00",
        startDateTime: new Date(`${formData.selectedRangeStartDate}T${draft.openTime || "08:00"}:00`).toISOString(),
        endDateTime: new Date(`${formData.selectedRangeEndDate}T${draft.closeTime || "14:00"}:00`).toISOString(),
        activeDates: [],
        earlyVisibilityDates: [],
        neighborhood_join_status: "none",
        payment_intent_status: "none",
        participant_origin: "standalone",
        listingNumber: makeListingNumber(user, zip),
      };
      const response = await base44.functions.invoke("saveResidentialListing", { action: "create", data: payload });
      const created = response?.data?.listing;
      if (!created?.id) throw new Error("Host Yard Sale could not be created.");
      setListings((prev) => [created, ...prev]);
      selectListing(created);
      setShowCreate(false);
    } catch (error) {
      toast.error(error?.response?.data?.error || error?.message || "Host Yard Sale could not be created.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-amber-200 bg-white p-4">
      <div>
        <h3 className="text-lg font-bold text-slate-900">Required fallback choice</h3>
        <p className="text-sm text-slate-600">Choose what Yardit should do if fewer than 5 approved homes join.</p>
      </div>

      <RadioGroup value={formData.fallback_action || ""} onValueChange={setFallbackAction} className="space-y-3">
        <label className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${formData.fallback_action === FALLBACK_ACTION_CANCEL ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"}`}>
          <RadioGroupItem value={FALLBACK_ACTION_CANCEL} className="mt-1" />
          <span>
            <span className="block font-semibold text-slate-900">Cancel the Neighborhood Sale</span>
            <span className="block text-sm text-slate-600">If fewer than 5 approved homes join, cancel the event with no Neighborhood Sale charge.</span>
          </span>
        </label>
        <label className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${formData.fallback_action === FALLBACK_ACTION_PREMIUM ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}>
          <RadioGroupItem value={FALLBACK_ACTION_PREMIUM} className="mt-1" />
          <span>
            <span className="block font-semibold text-slate-900">Continue with my Premium Yard Sale — $7.99</span>
            <span className="block text-sm text-slate-600">If fewer than 5 approved homes join, convert the organizer’s connected Yard Sale into a Premium residential listing for $7.99.</span>
          </span>
        </label>
      </RadioGroup>

      {formData.fallback_action === FALLBACK_ACTION_PREMIUM && (
        <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm font-semibold text-amber-950">Connect your host Yard Sale</p>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowCreate((value) => !value)} className="gap-2 bg-white">
              <Plus className="h-4 w-4" /> Create one here
            </Button>
          </div>
          {selectedListing ? (
            <div className="rounded-lg border border-emerald-200 bg-white p-3 text-sm text-emerald-900">
              Connected: <strong>{selectedListing.title}</strong> • {formatRange(selectedListing)}
            </div>
          ) : (
            <div className="rounded-lg border border-red-200 bg-white p-3 text-sm text-red-700">
              Premium fallback needs your own eligible Yard Sale listing. Select an existing listing or create one below.
            </div>
          )}

          {isLoading ? <p className="text-sm text-amber-800">Loading your eligible listings...</p> : eligibleListings.length > 0 && (
            <div className="space-y-2">
              {eligibleListings.map((listing) => (
                <Card key={listing.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{listing.title}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatRange(listing)}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1"><Home className="h-3 w-3" /> {listing.addressText || "Address saved"}</p>
                  </div>
                  <Button type="button" size="sm" variant={listing.id === formData.fallback_listing_id ? "secondary" : "outline"} onClick={() => selectListing(listing)}>
                    {listing.id === formData.fallback_listing_id ? "Selected" : "Select"}
                  </Button>
                </Card>
              ))}
            </div>
          )}

          {showCreate && (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
              <Label>Yard Sale title</Label>
              <Input value={draft.title} onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))} />
              <Label>Category</Label>
              <Input value={draft.category} onChange={(e) => setDraft((prev) => ({ ...prev, category: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Open</Label><Input type="time" value={draft.openTime} onChange={(e) => setDraft((prev) => ({ ...prev, openTime: e.target.value }))} /></div>
                <div><Label>Close</Label><Input type="time" value={draft.closeTime} onChange={(e) => setDraft((prev) => ({ ...prev, closeTime: e.target.value }))} /></div>
              </div>
              <Label>Description</Label>
              <Textarea rows={3} value={draft.description} onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))} />
              <Button type="button" onClick={createHostListing} disabled={isCreating} className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Create and connect Yard Sale
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
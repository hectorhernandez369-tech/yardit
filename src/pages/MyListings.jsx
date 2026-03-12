import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Map, Trash2 } from "lucide-react";
import { format } from "date-fns";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  formatListingDateRange,
  formatListingStatusLabel,
  formatListingTierLabel,
  getListingAddressLine,
  getListingDisplayStatus,
  statusColors,
  tierColors,
} from "@/components/listing/listingDisplay";

const RELIST_STORAGE_KEY = "yardit_relist_prefill_v1";

export default function MyListingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [user, setUser] = useState(null);

  // (Tabs) "active" | "past" | "billing" | "hunt"
  const [tab, setTab] = useState("active");

  // (Edit Description modal state)
  const [editingListing, setEditingListing] = useState(null);
  const [editDescription, setEditDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        navigate(createPageUrl("Home"));
      }
    };
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["myListings", user?.id],
    queryFn: () => base44.entities.Listing.filter({ ownerUserId: user.id }, "-created_date"),
    enabled: !!user,
    initialData: [],
  });

  // ---- Helpers ----
  const getLatLng = (listing) => {
    const lat = listing?.lat ?? listing?.latitude ?? null;
    const lng = listing?.lng ?? listing?.longitude ?? null;
    return { lat, lng };
  };

  const hasCoords = (listing) => {
    const { lat, lng } = getLatLng(listing);
    return !!lat && !!lng;
  };

  const listingNumberText = (listing) => {
    if (listing?.listingNumber) return listing.listingNumber;
    // Fallback: generate from state + zip + id for older listings
    const st = (listing?.state || "XX").toUpperCase().slice(0, 2);
    const zp = (listing?.zip || "0000").slice(-4).padStart(4, "0");
    const idSuffix = (listing?.id || "00000").slice(-5).toLowerCase();
    return `${st}${zp}-${idSuffix}`;
  };

  const isPastListing = (listing) => {
    if (listing?.status === "expired" || listing?.status === "completed") return true;
    if (!listing?.endDateTime) return false;
    const endMs = new Date(listing.endDateTime).getTime();
    if (Number.isNaN(endMs)) return false;
    return endMs < Date.now();
  };

  const normalizedListings = useMemo(() => {
    return listings.map((listing) => ({
      ...listing,
      displayStatus: getListingDisplayStatus(listing),
    }));
  }, [listings]);

  const activeListings = useMemo(() => normalizedListings.filter((l) => !isPastListing(l)), [normalizedListings]);
  const pastListings = useMemo(() => normalizedListings.filter((l) => isPastListing(l)), [normalizedListings]);

  useEffect(() => {
    const cleanup = async () => {
      if (!listings || listings.length === 0) return;
      const now = Date.now();
      const toUpdate = listings.filter(l => 
        l.status === "active" && l.endDateTime && new Date(l.endDateTime).getTime() < now
      );
      
      for (const l of toUpdate) {
        try {
          await base44.entities.Listing.update(l.id, { status: "expired" });
        } catch (e) {}
      }
      if (toUpdate.length > 0) {
        queryClient.invalidateQueries({ queryKey: ["myListings", user?.id] });
      }
    };
    cleanup();
  }, [listings, user, queryClient]);

  const shownListings = tab === "past" ? pastListings : activeListings;

  const openEditDescription = (listing) => {
    setEditingListing(listing);
    setEditDescription(listing?.description || "");
  };

  const closeEditDescription = () => {
    setEditingListing(null);
    setEditDescription("");
  };

  const saveDescription = async () => {
    if (!editingListing) return;

    setIsSaving(true);
    try {
      await base44.entities.Listing.update(editingListing.id, {
        description: editDescription,
      });

      toast.success("Description updated");
      closeEditDescription();
      await queryClient.invalidateQueries({ queryKey: ["myListings", user?.id] });
    } catch (e) {
      toast.error("Could not update description");
    } finally {
      setIsSaving(false);
    }
  };

  const relist = (listing) => {
    // ✅ Build prefill payload using CreateListing's real keys
    const payload = {
      relistFromId: listing.id,
      startAtStep: 3,
      relistPrefill: {
        // Step 1
        title: listing.title || "",
        description: listing.description || "",

        // Step 2 (must match CreateListing formData keys)
        addressText: listing.addressText || listing.street_address || listing.street || "",
        city: listing.city || "",
        state: listing.state || "",
        zip: listing.zip || listing.zip_code || "",

        // Location
        lat: listing.lat ?? listing.latitude ?? null,
        lng: listing.lng ?? listing.longitude ?? null,
      },
    };

    try {
      localStorage.setItem(RELIST_STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      // ignore
    }

    // ✅ navigate to CreateListing which now reads relist + jumps to step 3
    navigate(createPageUrl("CreateListing") + "?relist=1&step=3");
  };

  const deleteListing = async (listing) => {
    const ok = window.confirm("Delete this listing? This cannot be undone.");
    if (!ok) return;

    try {
      await base44.entities.Listing.delete(listing.id);

      // Notification Cleanup
      try {
        const reqs = await base44.entities.JoinRequest.filter({ listingId: listing.id });
        for (const req of reqs) {
          await base44.entities.JoinRequest.delete(req.id);
        }

        const allNotifs = await base44.entities.Notification.filter({});
        const toDelete = allNotifs.filter(n => 
          n.metadata?.requester_listing_id === listing.id || 
          n.metadata?.sale_listing_id === listing.id
        );
        for (const n of toDelete) {
          await base44.entities.Notification.delete(n.id);
        }
      } catch (err) {
        console.error("Cleanup error", err);
      }

      toast.success("Listing deleted");
      await queryClient.invalidateQueries({ queryKey: ["myListings", user?.id] });
    } catch (e) {
      toast.error("Could not delete listing");
    }
  };

  // ---- Render Guards ----
  if (!user) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="min-h-[calc(100vh-140px)] p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold">My Listings</h1>

          <Button
            onClick={() => navigate(createPageUrl("CreateListing"))}
            className="bg-amber-600 hover:bg-amber-700 text-white w-full sm:w-auto"
          >
            Create New Listing
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap mb-6">
          <Button
            variant={tab === "active" ? "default" : "outline"}
            onClick={() => setTab("active")}
          >
            Active ({activeListings.length})
          </Button>

          <Button
            variant={tab === "past" ? "default" : "outline"}
            onClick={() => setTab("past")}
          >
            Past Listings ({pastListings.length})
          </Button>

          <Button
            variant={tab === "billing" ? "default" : "outline"}
            onClick={() => setTab("billing")}
          >
            Billing / Payments
          </Button>

          <Button
            variant={tab === "hunt" ? "default" : "outline"}
            onClick={() => setTab("hunt")}
            className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
          >
            My Hunt
          </Button>
        </div>

        {/* Tabs Content */}
        {tab === "billing" ? (
          <Card>
            <CardContent className="p-8">
              <h2 className="text-xl font-semibold mb-2">Billing / Payments</h2>
              <p className="text-slate-600">
                Coming soon. (This will show receipts and payment history per listing.)
              </p>
            </CardContent>
          </Card>
        ) : tab === "hunt" ? (
          <Card>
            <CardContent className="p-8">
              <h2 className="text-xl font-semibold mb-4 text-[#2C4F4E]">My Hunt</h2>
              <p className="text-slate-600 mb-6 max-w-lg">
                View your current selected hunt stops and manage your routing history.
              </p>
              <div className="flex gap-3">
                <Button onClick={() => navigate(createPageUrl("MyHunt"))} className="bg-[#5DADA5] hover:bg-[#4A9B93] text-white">
                  Manage Current Hunt Selection
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-slate-500">Loading listings...</p>
            </CardContent>
          </Card>
        ) : shownListings.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-slate-500 mb-4">
                {tab === "past"
                  ? "No past listings yet"
                  : "You don't have any active listings right now"}
              </p>

              {tab === "active" && (
                <Button
                  onClick={() => navigate(createPageUrl("CreateListing"))}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Create a Listing
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {shownListings.map((listing) => (
              <Card key={listing.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-3">
                    <div className="min-w-0">
                      <h3 className="text-lg sm:text-xl font-semibold mb-1 break-words">{listing.title}</h3>

                      {/* Listing # small print */}
                      <div className="text-xs text-slate-500 mb-2 space-y-1 break-all">
                        <p>Listing #{String(listingNumberText(listing))}</p>
                        <p>ID: {listing.id}</p>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        {/* (plain english) Requester listing badges for neighborhood join status */}
                        {(listing.neighborhood_join_status === "pending" || listing.neighborhood_join_status === "requested") && (
                          <Badge className="bg-yellow-500 text-yellow-950 hover:bg-yellow-600 border-none">Pending Neighborhood Approval</Badge>
                        )}
                        {listing.neighborhood_join_status === "approved" && (
                          <Badge className="bg-green-600 text-white hover:bg-green-700 border-none">Neighborhood Approved</Badge>
                        )}
                        {listing.neighborhood_join_status === "denied" && (
                          <Badge className="bg-red-600 text-white hover:bg-red-700 border-none">Neighborhood Denied</Badge>
                        )}

                        <Badge className={tierColors[listing.tier] || "bg-slate-500"}>
                          {formatListingTierLabel(listing.tier)}
                        </Badge>

                        <Badge className={statusColors[listing.displayStatus] || "bg-gray-500"}>
                          {formatListingStatusLabel(listing.displayStatus)}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:flex gap-2 sm:flex-wrap sm:justify-end">
                      <Button
                        size="sm"
                        disabled={!hasCoords(listing)}
                        onClick={() => navigate(createPageUrl("Home") + `?listingId=${listing.id}`)}
                        className="gap-1 bg-teal-600 hover:bg-teal-700 text-white"
                      >
                        <Map className="w-3 h-3" />
                        View on Map
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => navigate(createPageUrl("ListingDetail") + `?id=${listing.id}`)}
                        className="bg-slate-700 hover:bg-slate-800 text-white"
                      >
                        View Details
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => openEditDescription(listing)}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Edit Description
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => relist(listing)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        Relist
                      </Button>

                      {/* Delete Listing */}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteListing(listing)}
                        className="gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </Button>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-slate-600 mb-4 whitespace-pre-wrap">
                    {listing.description || "(No description)"}
                  </p>

                  {/* Address + Dates */}
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <MapPin className="w-4 h-4" />
                      <span className="break-words">{getListingAddressLine(listing)}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar className="w-4 h-4" />
                      <span>{formatListingDateRange(listing)}</span>
                    </div>
                  </div>

                  {listing.statusReason && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>Status Note:</strong> {listing.statusReason}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* (Edit Description popup) */}
      <Dialog open={!!editingListing} onOpenChange={(open) => !open && closeEditDescription()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Description</DialogTitle>
          </DialogHeader>

          <Textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            rows={7}
            placeholder="Update your description..."
          />

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={closeEditDescription}>
              Cancel
            </Button>
            <Button
              onClick={saveDescription}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
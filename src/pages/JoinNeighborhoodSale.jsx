import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { normalizeNeighborhoodJoinStatus, doesListingOverlapNeighborhoodSale } from "@/lib/neighborhoodSaleState";
import NeighborhoodSalePreviewMap from "@/components/neighborhood/NeighborhoodSalePreviewMap";
import PrimaryAddressVerificationGate from "@/components/create/PrimaryAddressVerificationGate";
import { computedAddressVerified } from "@/lib/trustActions";
import { normalizeUser } from "@/lib/normalizeUser";

function buildListingNumber(state = "XX", zip = "0000") {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let suffix = "";
  for (let i = 0; i < 5; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
  return `${String(state).toUpperCase().slice(0, 2)}${String(zip).slice(-4).padStart(4, "0")}-${suffix}`;
}

const INVALID_LISTING_STATUSES = new Set(["draft", "cancelled", "canceled", "rejected", "removed", "deleted", "expired", "closed", "completed", "hidden", "suspended"]);

function normalizeAddress(value = "") {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function sameConfirmedAddress(listing, user) {
  const userAddress = normalizeAddress([user?.primary_address || user?.street_address, user?.city, user?.state, user?.zip_code].filter(Boolean).join(""));
  if (!userAddress) return true;
  const listingAddress = normalizeAddress([listing?.addressText || listing?.display_address || listing?.address_text, listing?.city, listing?.state, listing?.zip].filter(Boolean).join(""));
  return !!listingAddress && listingAddress === userAddress;
}

export default function JoinNeighborhoodSale() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get("code");
  const queryClient = useQueryClient();

  const [user, setUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [showExistingListingDialog, setShowExistingListingDialog] = useState(false);
  const [selectedExistingListingId, setSelectedExistingListingId] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = normalizeUser(await base44.auth.me());
        setUser(currentUser);
      } catch {
        setUser(null);
      } finally {
        setIsAuthChecking(false);
      }
    };
    fetchUser();
  }, []);

  const { data: sale, isLoading: isSaleLoading } = useQuery({
    queryKey: ["neighborhood_sale_by_code", code],
    queryFn: async () => {
      if (!code) return null;
      const response = await base44.functions.invoke("getNeighborhoodSaleByInviteCode", { code });
      return response?.data?.sale || null;
    },
    enabled: !!code,
  });

  const { data: existingRequests = [] } = useQuery({
    queryKey: ["join_requests", user?.id, sale?.id],
    queryFn: async () => {
      if (!user?.id || !sale?.id) return [];
      return await base44.entities.JoinRequest.filter({ requesterUserId: user.id, saleListingId: sale.id });
    },
    enabled: !!user?.id && !!sale?.id,
    initialData: [],
  });

  const { data: existingListings = [] } = useQuery({
    queryKey: ["existingListingsForNeighborhoodJoin", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return await base44.entities.Listing.filter({ ownerUserId: user.id });
    },
    enabled: !!user?.id,
    initialData: [],
  });

  const { data: participantRequests = [] } = useQuery({
    queryKey: ["neighborhood_participant_requests", sale?.id],
    queryFn: async () => {
      if (!sale?.id) return [];
      return await base44.entities.JoinRequest.filter({ saleListingId: sale.id });
    },
    enabled: !!sale?.id,
    initialData: [],
  });

  const requestMutation = useMutation({
    mutationFn: async ({ existingListing } = {}) => {
      const verifiedUser = normalizeUser(user);
      if (!computedAddressVerified(verifiedUser)) {
        throw new Error("Please verify your address before joining this Neighborhood Sale.");
      }

      const existing = await base44.entities.JoinRequest.filter({ requesterUserId: user.id, saleListingId: sale.id });
      if (existing.some((request) => ["pending", "approved"].includes(normalizeNeighborhoodJoinStatus(request.status)))) {
        throw new Error("You already have a join request for this Neighborhood Sale.");
      }

      if (existingListing) {
        await base44.entities.Listing.update(existingListing.id, {
          neighborhood_sale_id: sale.id,
          neighborhood_join_status: "pending",
          participant_origin: "existing_listing",
          origin_sale_listing_id: sale.id,
        });

        await base44.entities.Notification.create({
          userId: user.id,
          user_id: user.id,
          title: "Join Request Sent",
          message: "Your yard sale request has been sent to the Neighborhood Sale organizer.",
          type: "join_request_sent",
          metadata: {
            sale_listing_id: sale.id,
            requester_listing_id: existingListing.id,
            requester_user_id: user.id,
            event_title: sale.title,
          },
        });

        return await base44.entities.JoinRequest.create({
          listingId: existingListing.id,
          saleListingId: sale.id,
          requesterUserId: user.id,
          ownerUserId: sale.ownerUserId,
          status: "pending",
          participant_origin_snapshot: "existing_listing",
        });
      }

      // Participant listing keeps its OWN dates — do not copy sale dates.
      // Visibility inside the sale is governed by the overlap window.
      const saleStartDate = sale.selectedRangeStartDate || sale.startDateTime?.slice(0, 10);
      const saleEndDate = sale.selectedRangeEndDate || sale.endDateTime?.slice(0, 10);

      const inviteListing = await base44.entities.Listing.create({
        ownerUserId: verifiedUser.id,
        listingType: "yard_sale",
        title: verifiedUser.street_address ? `Yard Sale at ${verifiedUser.street_address}` : "Yard Sale",
        description: "",
        addressText: verifiedUser.street_address,
        city: verifiedUser.city,
        state: String(verifiedUser.state || "").toUpperCase().slice(0, 2),
        zip: verifiedUser.zip_code,
        lat: verifiedUser.address_lat,
        lng: verifiedUser.address_lng,
        timeZoneId: verifiedUser.timeZoneId || sale.timeZoneId || "America/Los_Angeles",
        tier: "free",
        pricePaid: 0,
        status: "active",
        category: "Neighborhood Sale",
        categories: [],
        // Use sale dates as default so participant is visible during the sale.
        // The participant can have their own broader date range — overlap logic handles visibility.
        startDateTime: sale.startDateTime,
        endDateTime: sale.endDateTime,
        selectedRangeStartDate: saleStartDate,
        selectedRangeEndDate: saleEndDate,
        neighborhood_join_status: "pending",
        payment_intent_status: "none",
        neighborhood_sale_id: sale.id,
        participant_origin: "neighborhood_join",
        origin_sale_listing_id: sale.id,
        listingNumber: buildListingNumber(verifiedUser.state, verifiedUser.zip_code),
      });

      await base44.entities.Notification.create({
        userId: user.id,
        user_id: user.id,
        title: "Join Request Sent",
        message: "Your request to join the Neighborhood Sale has been sent.",
        type: "join_request_sent",
        metadata: {
          sale_listing_id: sale.id,
          requester_listing_id: inviteListing.id,
          requester_user_id: user.id,
          event_title: sale.title,
        },
      });

      return await base44.entities.JoinRequest.create({
        listingId: inviteListing.id,
        saleListingId: sale.id,
        requesterUserId: user.id,
        ownerUserId: sale.ownerUserId,
        status: "pending",
        participant_origin_snapshot: "neighborhood_join",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["join_requests"] });
      queryClient.invalidateQueries({ queryKey: ["myListings"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Request sent successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send request. Please try again.");
    }
  });

  if (!code) {
    return (
      <div className="min-h-[calc(100vh-140px)] flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center text-slate-500">Invalid invite link</CardContent>
        </Card>
      </div>
    );
  }

  if (isSaleLoading || isAuthChecking) {
    return <div className="min-h-[calc(100vh-140px)] flex items-center justify-center">Loading...</div>;
  }

  if (!sale) {
    return (
      <div className="min-h-[calc(100vh-140px)] flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center text-slate-500">Sale not found or invalid code.</CardContent>
        </Card>
      </div>
    );
  }

  const startDate = sale.startDateTime ? new Date(sale.startDateTime).toLocaleDateString() : "";
  const endDate = sale.endDateTime ? new Date(sale.endDateTime).toLocaleDateString() : "";
  const activeRequest = existingRequests.find((request) => ["pending", "approved"].includes(normalizeNeighborhoodJoinStatus(request.status)));
  const missingConfirmedAddress = user && !computedAddressVerified(user);
  const eligibleExistingListings = !sale || !user ? [] : existingListings.filter((listing) => {
    const joinStatus = normalizeNeighborhoodJoinStatus(listing.neighborhood_join_status);
    return listing.ownerUserId === user.id &&
      listing.listingType === "yard_sale" &&
      !INVALID_LISTING_STATUSES.has(listing.status) &&
      !listing.deleted_date &&
      listing.id !== sale.id &&
      listing.id !== sale.organizer_participant_listing_id &&
      (!listing.neighborhood_sale_id || listing.neighborhood_sale_id === sale.id) &&
      (!joinStatus || joinStatus === "none" || (listing.neighborhood_sale_id === sale.id && joinStatus === "denied")) &&
      sameConfirmedAddress(listing, user) &&
      doesListingOverlapNeighborhoodSale(listing, sale);
  });
  const selectedExistingListing = eligibleExistingListings.find((listing) => listing.id === selectedExistingListingId) || eligibleExistingListings[0] || null;
  const organizerCount = sale.organizer_participation === "organizing_only" ? 0 : 1;
  // Only count approved participants whose listing overlaps the sale date range and haven't been removed
  const approvedHomesCount = organizerCount + participantRequests.filter((request) => {
    if (normalizeNeighborhoodJoinStatus(request.status) !== "approved") return false;
    if (request.status === "canceled" || request.status === "cancelled") return false;
    if (request.removed_by_eo === true) return false;
    if (request.removed_by_listing_owner === true) return false;
    // Check overlap using the listing dates stored on the request's linked listing
    // Fall back to counting if we don't have listing dates (conservative)
    const pStart = request.participant_start_date || request.selectedRangeStartDate;
    const pEnd = request.participant_end_date || request.selectedRangeEndDate;
    if (!pStart || !pEnd) return true;
    const sStart = sale.selectedRangeStartDate || sale.startDateTime?.slice(0, 10);
    const sEnd = sale.selectedRangeEndDate || sale.endDateTime?.slice(0, 10);
    if (!sStart || !sEnd) return true;
    return pStart <= sEnd && pEnd >= sStart;
  }).length;
  const availableSpots = Math.max(0, 25 - approvedHomesCount);
  const isFull = availableSpots === 0;
  const isOrganizer = !!user && sale.ownerUserId === user.id;
  const organizerAlreadyIncluded = isOrganizer && sale.organizer_participation !== "organizing_only";

  const handleSignIn = () => {
    const nextUrl = window.location.pathname + window.location.search;
    base44.auth.redirectToLogin(nextUrl);
  };

  const handleRequest = () => {
    if (missingConfirmedAddress) {
      toast.error("Please verify your address before joining this Neighborhood Sale.");
      return;
    }
    if (isOrganizer) {
      toast.error(organizerAlreadyIncluded ? "You're already included in this Neighborhood Sale." : "You are the organizer of this event.");
      return;
    }
    if (eligibleExistingListings.length > 0) {
      setSelectedExistingListingId((current) => current || eligibleExistingListings[0].id);
      setShowExistingListingDialog(true);
      return;
    }
    requestMutation.mutate({});
  };

  if (user && missingConfirmedAddress) {
    return (
      <PrimaryAddressVerificationGate
        user={user}
        onVerified={(verifiedUser) => setUser(normalizeUser(verifiedUser))}
      />
    );
  }

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-2 border-[#2C4F4E] bg-[#E7D7B8]">
        <CardHeader className="bg-[#5DADA5] text-white border-b-2 border-[#2C4F4E] rounded-t-lg">
          <CardTitle className="text-xl">Neighborhood Sale in your area</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div>
            <h3 className="font-bold text-lg text-[#2C4F4E]">{sale.title}</h3>
            {startDate && endDate && (
              <p className="text-sm text-[#1F2937]">{startDate} - {endDate}</p>
            )}
          </div>

          <div className="p-3 bg-white/60 border border-[#2C4F4E]/20 rounded-md text-sm text-[#2C4F4E] space-y-2">
            <h4 className="font-bold">Included with This Neighborhood Sale</h4>
            <p>Your yard sale will be included as part of this Neighborhood Sale. You will not be charged a separate listing payment to participate.</p>
            <p>If you already purchased a listing or upgrade, Yardit will preserve it when your listing is added to the Neighborhood Sale.</p>
          </div>

          <div className="space-y-3">
            <NeighborhoodSalePreviewMap lat={sale.event_center_lat} lng={sale.event_center_lng} />
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
                Homes Joined: {approvedHomesCount} / 25
              </div>
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
                {isFull ? "Neighborhood Sale is full" : `Available Spots: ${availableSpots} left`}
              </div>
            </div>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-900 text-sm font-medium">
            If this Neighborhood Sale is canceled or your participation is removed, your existing listing will keep its original tier and visibility. If Yardit creates a participant record for you, it will no longer appear through this event.
          </div>

          {user && isOrganizer && (
            <div className="p-3 bg-white/50 border border-[#2C4F4E]/30 rounded-md text-[#2C4F4E] text-sm font-medium">
              {organizerAlreadyIncluded ? "You're already included in this Neighborhood Sale as the organizer." : "You created this Neighborhood Sale, so invite links are for neighbors joining from their own accounts."}
            </div>
          )}

          {user && !isOrganizer && activeRequest && (
            <div className="p-3 bg-white/50 border border-[#2C4F4E]/30 rounded-md text-[#2C4F4E] text-sm font-medium">
              {normalizeNeighborhoodJoinStatus(activeRequest.status) === "approved" ? "Your request has been approved." : "Request already sent. Pending approval."}
            </div>
          )}

          {missingConfirmedAddress && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-900 text-sm font-medium">
              Confirm your address in Settings before joining this Neighborhood Sale.
            </div>
          )}

          {eligibleExistingListings.length > 0 && !activeRequest && !isOrganizer && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-900 text-sm font-medium">
              Yardit found {eligibleExistingListings.length === 1 ? "an existing Yard Sale" : "existing Yard Sales"} that can be included with this Neighborhood Sale.
            </div>
          )}
        </CardContent>
        <CardFooter>
          {!user ? (
            <Button onClick={handleSignIn} className="w-full bg-[#F4A849] hover:bg-[#E39635] text-[#2C4F4E] border-2 border-[#2C4F4E] font-bold">
              Sign in to Join
            </Button>
          ) : (
            <Button
              onClick={handleRequest}
              disabled={isFull || !!activeRequest || missingConfirmedAddress || requestMutation.isPending || isOrganizer}
              className="w-full bg-[#F4A849] hover:bg-[#E39635] text-[#2C4F4E] border-2 border-[#2C4F4E] font-bold disabled:opacity-50"
            >
              {requestMutation.isPending ? "Sending..." : isOrganizer ? (organizerAlreadyIncluded ? "You're already in this sale" : "Invite neighbors to join") : isFull ? "Neighborhood Sale is full" : activeRequest ? "Request sent" : "Join Neighborhood Sale"}
            </Button>
          )}
        </CardFooter>
      </Card>

      <Dialog open={showExistingListingDialog} onOpenChange={setShowExistingListingDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Use Your Existing Yard Sale?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-700">
              You already have a Yardit listing that can be included with this Neighborhood Sale. Your current listing, payment, and any upgrades you purchased will be preserved.
            </p>
            {eligibleExistingListings.length > 1 && (
              <div className="space-y-2">
                {eligibleExistingListings.map((listing) => (
                  <button
                    key={listing.id}
                    type="button"
                    onClick={() => setSelectedExistingListingId(listing.id)}
                    className={`w-full rounded-lg border p-3 text-left text-sm ${selectedExistingListing?.id === listing.id ? "border-[#2C4F4E] bg-[#F3E6CF]" : "border-slate-200 bg-white"}`}
                  >
                    <span className="block font-semibold text-[#2C4F4E]">{listing.title || "Yard Sale"}</span>
                    <span className="block text-xs text-slate-600">{listing.selectedRangeStartDate || listing.startDateTime?.slice(0, 10)} – {listing.selectedRangeEndDate || listing.endDateTime?.slice(0, 10)}</span>
                  </button>
                ))}
              </div>
            )}
            {eligibleExistingListings.length === 1 && (
              <div className="rounded-lg border border-[#2C4F4E]/20 bg-[#F3E6CF] p-3 text-sm">
                <p className="font-semibold text-[#2C4F4E]">{selectedExistingListing?.title || "Yard Sale"}</p>
                <p className="text-slate-700">{selectedExistingListing?.selectedRangeStartDate || selectedExistingListing?.startDateTime?.slice(0, 10)} – {selectedExistingListing?.selectedRangeEndDate || selectedExistingListing?.endDateTime?.slice(0, 10)}</p>
              </div>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowExistingListingDialog(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1 bg-[#F4A849] text-[#2C4F4E] hover:bg-[#E39635]"
                disabled={!selectedExistingListing || requestMutation.isPending}
                onClick={() => {
                  if (!selectedExistingListing) return;
                  setShowExistingListingDialog(false);
                  requestMutation.mutate({ existingListing: selectedExistingListing });
                }}
              >
                Use Existing Listing
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
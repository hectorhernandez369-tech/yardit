import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { normalizeNeighborhoodJoinStatus, doesListingOverlapNeighborhoodSale } from "@/lib/neighborhoodSaleState";
import NeighborhoodSalePreviewMap from "@/components/neighborhood/NeighborhoodSalePreviewMap";

function buildListingNumber(state = "XX", zip = "0000") {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let suffix = "";
  for (let i = 0; i < 5; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
  return `${String(state).toUpperCase().slice(0, 2)}${String(zip).slice(-4).padStart(4, "0")}-${suffix}`;
}

export default function JoinNeighborhoodSale() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get("code");
  const queryClient = useQueryClient();

  const [user, setUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
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
      const sales = await base44.entities.Listing.filter({ invite_code: code, listingType: "neighborhood_sale" });
      return sales[0] || null;
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
    mutationFn: async () => {
      if (!user?.street_address || !user?.city || !user?.state || !user?.zip_code || !user?.address_lat || !user?.address_lng) {
        throw new Error("Please confirm your address in Settings before joining this Neighborhood Sale.");
      }

      const existing = await base44.entities.JoinRequest.filter({ requesterUserId: user.id, saleListingId: sale.id });
      if (existing.some((request) => ["pending", "approved"].includes(normalizeNeighborhoodJoinStatus(request.status)))) {
        throw new Error("You already have a join request for this Neighborhood Sale.");
      }

      // Participant listing keeps its OWN dates — do not copy sale dates.
      // Visibility inside the sale is governed by the overlap window.
      const saleStartDate = sale.selectedRangeStartDate || sale.startDateTime?.slice(0, 10);
      const saleEndDate = sale.selectedRangeEndDate || sale.endDateTime?.slice(0, 10);

      const inviteListing = await base44.entities.Listing.create({
        ownerUserId: user.id,
        listingType: "yard_sale",
        title: user.street_address ? `Yard Sale at ${user.street_address}` : "Yard Sale",
        description: "",
        addressText: user.street_address,
        city: user.city,
        state: String(user.state || "").toUpperCase().slice(0, 2),
        zip: user.zip_code,
        lat: user.address_lat,
        lng: user.address_lng,
        timeZoneId: sale.timeZoneId || "America/Los_Angeles",
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
        participant_origin: "neighborhood_invite",
        origin_sale_listing_id: sale.id,
        listingNumber: buildListingNumber(user.state, user.zip_code),
      });

      await base44.entities.Notification.create({
        userId: sale.ownerUserId,
        user_id: sale.ownerUserId,
        title: "New Join Request",
        message: "Someone requested to join your Neighborhood Sale.",
        type: "join_request",
        metadata: {
          sale_listing_id: sale.id,
          requester_listing_id: inviteListing.id,
          requester_user_id: user.id,
          event_title: sale.title,
        },
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
        participant_origin_snapshot: "neighborhood_invite",
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
  const missingConfirmedAddress = user && (!user.street_address || !user.city || !user.state || !user.zip_code || !user.address_lat || !user.address_lng);
  // A listing only blocks joining if it is active, standalone, AND overlaps the sale's date range
  const hasBlockingResidentialListing = sale && existingListings.some((listing) =>
    listing.listingType !== "neighborhood_sale" &&
    listing.status === "active" &&
    !listing.neighborhood_sale_id &&
    normalizeNeighborhoodJoinStatus(listing.neighborhood_join_status) === "none" &&
    doesListingOverlapNeighborhoodSale(listing, sale)
  );
  const organizerCount = sale.organizer_participation === "organizing_only" ? 0 : 1;
  // Only count approved participants whose listing overlaps the sale date range
  const approvedHomesCount = organizerCount + participantRequests.filter((request) => {
    if (normalizeNeighborhoodJoinStatus(request.status) !== "approved") return false;
    if (request.removed_by_eo === true) return false;
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

  const handleSignIn = () => {
    const nextUrl = window.location.pathname + window.location.search;
    base44.auth.redirectToLogin(nextUrl);
  };

  const handleRequest = () => {
    if (sale.ownerUserId === user.id) {
      toast.error("You are the organizer of this event.");
      return;
    }
    if (hasBlockingResidentialListing) {
      toast.error("Cancel your current listing first, then request to join this Neighborhood Sale.");
      return;
    }
    requestMutation.mutate();
  };

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

          <div className="p-3 bg-white/60 border border-[#2C4F4E]/20 rounded-md text-sm text-[#2C4F4E]">
            Joining from this invite link creates a free Neighborhood participant listing using your confirmed address.
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
            If this Neighborhood Sale is canceled or your participation is removed, you will need to create a normal listing to appear independently.
          </div>

          {user && activeRequest && (
            <div className="p-3 bg-white/50 border border-[#2C4F4E]/30 rounded-md text-[#2C4F4E] text-sm font-medium">
              {normalizeNeighborhoodJoinStatus(activeRequest.status) === "approved" ? "Your request has been approved." : "Request already sent. Pending approval."}
            </div>
          )}

          {missingConfirmedAddress && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-900 text-sm font-medium">
              Confirm your address in Settings before joining this Neighborhood Sale.
            </div>
          )}

          {hasBlockingResidentialListing && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-900 text-sm font-medium">
              You already have a normal active listing. Cancel it first, then come back here to request to join.
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
              disabled={isFull || !!activeRequest || missingConfirmedAddress || hasBlockingResidentialListing || requestMutation.isPending || sale.ownerUserId === user.id}
              className="w-full bg-[#F4A849] hover:bg-[#E39635] text-[#2C4F4E] border-2 border-[#2C4F4E] font-bold disabled:opacity-50"
            >
              {requestMutation.isPending ? "Sending..." : isFull ? "Neighborhood Sale is full" : activeRequest ? "Request sent" : "Join Neighborhood Sale"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
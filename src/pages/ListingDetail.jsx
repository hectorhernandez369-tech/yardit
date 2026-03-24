import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPageUrl, safeBack } from "@/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Calendar, AlertTriangle, Map, Copy, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import ReportModal from "../components/ReportModal";
import PromotionModal from "../components/admin/promotions/PromotionModal";
import { useAppMode } from "../components/shared/DemoMode";
import {
  calculateNeighborhoodSalePrice,
  getNeighborhoodPricingSummary,
  NEIGHBORHOOD_MAX_HOMES,
  NEIGHBORHOOD_MIN_HOMES,
  NEIGHBORHOOD_PRICE_CAP,
} from "@/lib/neighborhoodSalePricing";
import { getListingNumber, getOwnerDisplayName } from "@/components/listing/listingDisplay";
import { deriveNeighborhoodEventState, normalizeNeighborhoodJoinStatus } from "@/lib/neighborhoodSaleState";

export default function ListingDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [listingId, setListingId] = useState(null);
  const [returnTarget, setReturnTarget] = useState("default");
  const [user, setUser] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [reportContext, setReportContext] = useState(null);
  const [showPromoModal, setShowPromoModal] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setListingId(params.get("id"));
    setReturnTarget(params.get("from") || "default");

    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.log("Not logged in");
      }
    };
    fetchUser();
  }, []);

  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing", listingId],
    queryFn: async () => {
      const listings = await base44.entities.Listing.filter({ id: listingId });
      return listings[0];
    },
    enabled: !!listingId,
  });

  const { data: ownerUser } = useQuery({
    queryKey: ["listingOwner", listing?.ownerUserId],
    queryFn: async () => {
      const users = await base44.entities.User.filter({ id: listing.ownerUserId });
      return users[0] || null;
    },
    enabled: !!listing?.ownerUserId,
  });

  // (plain english) query to get pending and approved join requests if the user is the owner of a neighborhood sale
  const { data: joinRequests } = useQuery({
    queryKey: ["joinRequests", listingId],
    queryFn: async () => {
      const reqs = await base44.entities.JoinRequest.filter({ saleListingId: listingId });
      const enriched = await Promise.all(reqs.map(async (r) => {
        const l = await base44.entities.Listing.filter({ id: r.listingId });
        return {
          ...r,
          raw_status: r.status,
          status: normalizeNeighborhoodJoinStatus(r.status),
          listingDetails: l[0],
        };
      }));
      return enriched;
    },
    enabled: !!listing && listing.listingType === "neighborhood_sale",
  });

  const pendingRequests = joinRequests?.filter(r => r.status === "pending") || [];
  const approvedRequests = joinRequests?.filter(r => r.status === "approved" && r.removed_by_eo !== true) || [];
  const removedRequests = joinRequests?.filter(r => r.removed_by_eo === true) || [];
  const formatAddress = (item) => {
    const base = [item.addressText || "Address unavailable", item.city, item.state].filter(Boolean).join(", ");
    return item.zip ? `${base} ${item.zip}` : base;
  };
  const salePricing = useMemo(() => {
    if (!listing || listing.listingType !== "neighborhood_sale") return null;
    return getNeighborhoodPricingSummary(joinRequests || [], listing.pricePaid || 0);
  }, [joinRequests, listing]);
  const neighborhoodEventState = useMemo(() => deriveNeighborhoodEventState(listing), [listing]);
  const isNeighborhoodSaleLive = listing?.listingType === "neighborhood_sale" && neighborhoodEventState === "active";
  const participantAddresses = (isNeighborhoodSaleLive ? approvedRequests : [])
    .map((req) => req.listingDetails ? formatAddress(req.listingDetails) : null)
    .filter(Boolean);

  // (plain english) query to get parent neighborhood sale info if the listing was approved to join one
  const { data: parentSale } = useQuery({
    queryKey: ["parentSale", listing?.neighborhood_sale_id],
    queryFn: async () => {
      if (!listing?.neighborhood_sale_id) return null;
      const sales = await base44.entities.Listing.filter({ id: listing.neighborhood_sale_id });
      return sales[0];
    },
    enabled: !!listing && normalizeNeighborhoodJoinStatus(listing.neighborhood_join_status) === "approved" && !!listing.neighborhood_sale_id,
  });

  const syncNeighborhoodSaleListing = async (saleId, paidAmountOverride) => {
    const sales = await base44.entities.Listing.filter({ id: saleId });
    const sale = sales[0];
    if (!sale) return null;

    const terminalState = deriveNeighborhoodEventState(sale);
    const requests = await base44.entities.JoinRequest.filter({ saleListingId: saleId });
    const paidAmount = Number(paidAmountOverride ?? sale.pricePaid ?? 0);
    const summary = getNeighborhoodPricingSummary(requests, paidAmount);

    if (["downgraded", "canceled"].includes(terminalState)) {
      await base44.entities.Listing.update(saleId, {
        homeCount: summary.visibleHomeCount,
        status: "closed",
        event_state: terminalState,
      });
      return { summary, nextStatus: "closed" };
    }

    const alreadyLocked = sale.status === "active" && (Number(paidAmount || 0) > 0 || sale.payment_intent_status === "captured");
    const nextStatus = alreadyLocked || sale.status === "active"
      ? "active"
      : (summary.readyForPayment ? "ready_for_payment" : "collecting_participants");
    const nextEventState = deriveNeighborhoodEventState({ ...sale, status: nextStatus, pricePaid: paidAmount }, new Date());

    await base44.entities.Listing.update(saleId, {
      status: nextStatus,
      event_state: nextEventState === "activated_locked" ? "activated" : nextEventState,
      activation_status: nextStatus === "active" ? "active" : "pending",
      homeCount: summary.visibleHomeCount,
    });

    return { summary, nextStatus };
  };

  const respondToJoinRequestMutation = useMutation({
    mutationFn: async ({ requestId, requesterListingId, action, requesterUserId, eventTitle }) => {
      const sales = await base44.entities.Listing.filter({ id: listingId });
      const sale = sales[0];
      const saleRequests = await base44.entities.JoinRequest.filter({ saleListingId: listingId });
      const lockedState = deriveNeighborhoodEventState(sale);

      if (["activated_locked", "coming_soon", "active"].includes(lockedState)) {
        throw new Error("This Neighborhood Sale is locked and participant changes must go through the report flow.");
      }

      if (action === "approve") {
        const activeHomes = 1 + saleRequests.filter((request) => request.removed_by_eo !== true && normalizeNeighborhoodJoinStatus(request.status) === "approved").length;
        if (activeHomes >= NEIGHBORHOOD_MAX_HOMES) {
          throw new Error("Neighborhood Sale has reached the 25-home limit.");
        }

        await base44.entities.JoinRequest.update(requestId, { status: "approved" });
        await base44.entities.Listing.update(requesterListingId, {
          neighborhood_join_status: "approved",
          payment_intent_status: "none",
          hold_deadline_at: null,
          neighborhood_sale_id: listingId,
          tier: "free",
          pricePaid: 0,
          participant_origin: "neighborhood_invite",
        });
        await base44.entities.Notification.create({
          userId: requesterUserId,
          title: "Join Request Approved",
          message: `Approved — you joined ${eventTitle}`,
          type: "join_response_accept",
          metadata: { sale_listing_id: listingId, requester_listing_id: requesterListingId, requester_user_id: requesterUserId, event_title: eventTitle }
        });
        await syncNeighborhoodSaleListing(listingId);
      } else if (action === "remove") {
        if (["activated_locked", "coming_soon", "active"].includes(deriveNeighborhoodEventState(sale))) {
          throw new Error("Locked Neighborhood Sales require the report flow for removal.");
        }
        await base44.entities.JoinRequest.update(requestId, { 
          status: "denied",
          removed_by_eo: true,
          removed_at: new Date().toISOString(),
          removal_reason: "eo_removed"
        });
        await base44.entities.Listing.update(requesterListingId, {
          neighborhood_join_status: "denied",
          neighborhood_sale_id: null,
          payment_intent_status: "none"
        });
        await base44.entities.Notification.create({
          userId: requesterUserId,
          title: "Removed from Neighborhood Sale",
          message: "Removed from neighborhood sale",
          type: "removed_from_neighborhood",
          metadata: { sale_listing_id: listingId, requester_listing_id: requesterListingId, requester_user_id: requesterUserId, event_title: eventTitle }
        });
        await syncNeighborhoodSaleListing(listingId);
      } else {
        await base44.entities.JoinRequest.update(requestId, { status: "denied" });
        await base44.entities.Listing.update(requesterListingId, {
          neighborhood_join_status: "denied",
          payment_intent_status: "none"
        });
        await base44.entities.Notification.create({
          userId: requesterUserId,
          title: "Join Request Denied",
          message: "Denied — create a normal listing if you still want to appear independently.",
          type: "join_response_deny",
          metadata: { sale_listing_id: listingId, requester_listing_id: requesterListingId, requester_user_id: requesterUserId, event_title: eventTitle }
        });
        await syncNeighborhoodSaleListing(listingId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["joinRequests", listingId] });
      queryClient.invalidateQueries({ queryKey: ["listing", listingId] });
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Response sent");
    },
    onError: (error) => {
      toast.error(error.message || "Could not update request.");
    }
  });


  if (isLoading || !listing) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  const tierColors = {
    free: "bg-slate-500",
    featured: "bg-purple-600",
    premium: "bg-amber-600",
    neighborhood_tier: "bg-emerald-600"
  };

  const eventAddress = formatAddress(listing);
  const inviteLink = listing.invite_code ? `${window.location.origin}${createPageUrl("JoinNeighborhoodSale")}?code=${listing.invite_code}` : "";
  const inviteText = [
    listing.title,
    listing.startDateTime && listing.endDateTime
      ? `${format(new Date(listing.startDateTime), "PPp")} - ${format(new Date(listing.endDateTime), "PPp")}`
      : null,
    eventAddress,
    inviteLink || null,
  ].filter(Boolean).join("\n");

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(inviteText).then(() => {
      toast.success("Invite copied");
    });
  };

  return (
    <div className="min-h-[calc(100vh-140px)] bg-slate-50">
      <div className="max-w-4xl mx-auto">
        {/* Sticky title + address header */}
        <div className="sticky top-[73px] z-40 bg-white border-b border-slate-200 shadow-sm px-3 sm:px-4 md:px-6 py-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 break-words">{listing.title}</h1>
              <div className="flex items-center gap-1.5 text-slate-600 text-sm mt-0.5">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="break-words">
                  {listing.addressText || "Address unavailable"}{listing.city ? `, ${listing.city}` : ""}{listing.state ? `, ${listing.state}` : ""}{listing.zip ? ` ${listing.zip}` : ""}
                </span>
              </div>
              <div className="mt-1 space-y-1 text-xs text-slate-500">
                <p>Listing #: {getListingNumber(listing)}</p>
                <p>
                  Owner:{" "}
                  <button
                    type="button"
                    onClick={() => navigate(createPageUrl("AdminLite") + `?tab=lite&liteTab=users&openUserId=${listing.ownerUserId}`)}
                    className="font-medium text-blue-600 hover:text-blue-800 underline underline-offset-2"
                  >
                    {getOwnerDisplayName(ownerUser, listing)}
                  </button>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
              {user?.isAdmin && (
                <Button 
                  size="sm" 
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
                  onClick={() => setShowPromoModal(true)}
                >
                  PROMOTIONAL
                </Button>
              )}
              <Badge className={tierColors[listing.tier]}>
                {listing.tier === "neighborhood_tier" ? "Neighborhood Sale" : listing.tier.toUpperCase()}
              </Badge>
              {user && user.id !== listing.ownerUserId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReport(true)}
                  className="gap-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Report
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 md:p-8">
        <Card>
          <CardContent className="space-y-6 pt-6">
            {listing.photoUrls && listing.photoUrls.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {listing.photoUrls.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`Photo ${idx + 1}`}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                ))}
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-slate-700 whitespace-pre-wrap">{listing.description}</p>
            </div>

            {(listing.categories?.length > 0 || listing.category) && (
              <div>
                <h3 className="font-semibold mb-2">Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {(listing.categories?.length > 0 ? listing.categories : [listing.category]).filter(Boolean).map((cat, idx) => (
                    <Badge key={idx} variant="outline" className="border-[#2C4F4E] text-[#2C4F4E] bg-[#E7D7B8] px-3 py-1">
                      {cat}
                    </Badge>
                  ))}
                  {listing.collectible_type && (
                    <Badge variant="outline" className="border-[#2C4F4E] text-[#2C4F4E] bg-[#E7D7B8] px-3 py-1">
                      {listing.collectible_type}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-start gap-2 text-slate-600">
              <MapPin className="w-5 h-5 mt-0.5" />
              <span>
                {listing.addressText || "Address unavailable"}{listing.city ? `, ${listing.city}` : ""}{listing.state ? `, ${listing.state}` : ""}{listing.zip ? ` ${listing.zip}` : ""}
              </span>
            </div>

            <div className="flex items-start gap-2 text-slate-600">
              <Calendar className="w-5 h-5 mt-0.5" />
              <div>
                <p>Start: {format(new Date(listing.startDateTime), "PPp")}</p>
                <p>End: {format(new Date(listing.endDateTime), "PPp")}</p>
              </div>
            </div>

            {listing.listingType === "neighborhood_sale" && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-emerald-900 mb-2">Neighborhood Sale</h3>
                    <p className="text-sm text-emerald-800">
                      {listing.homeCount} homes participating • Span: {listing.spanFeet} ft
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="gap-2 border-emerald-300 text-emerald-800 hover:bg-emerald-100" onClick={handleCopyInvite}>
                    <Copy className="w-4 h-4" />
                    Copy Invite
                  </Button>
                </div>

                <div className="bg-white/70 border border-emerald-200 rounded-lg p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-1">Main Event Address</p>
                  <p className="text-sm text-emerald-950 font-medium">{eventAddress}</p>
                </div>

                {user && user.id === listing.ownerUserId && salePricing && (
                  <div className="bg-white/70 border border-emerald-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-1">Neighborhood Sale Payment</p>
                        <p className="text-sm text-emerald-950 font-medium">{salePricing.totalApprovedHomes} homes • {salePricing.homesNeeded > 0 ? `${salePricing.homesNeeded} more needed to activate` : 'Activated / ready'}</p>
                      </div>
                      <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 border-none capitalize">
                        {String(neighborhoodEventState || "pending_activation").replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <div className="rounded-md border border-emerald-200 bg-white p-3">
                        <p className="text-xs uppercase tracking-wide text-emerald-700">Paid</p>
                        <p className="font-semibold text-emerald-950">${Number(listing.pricePaid || 0).toFixed(2)}</p>
                      </div>
                      <div className="rounded-md border border-emerald-200 bg-white p-3">
                        <p className="text-xs uppercase tracking-wide text-emerald-700">Calculated Cost</p>
                        <p className="font-semibold text-emerald-950">${Number(calculateNeighborhoodSalePrice(salePricing.totalApprovedHomes) || 0).toFixed(2)}</p>
                      </div>
                      <div className="rounded-md border border-emerald-200 bg-white p-3">
                        <p className="text-xs uppercase tracking-wide text-emerald-700">Additional Due</p>
                        <p className="font-semibold text-emerald-950">${Number(salePricing.additionalDue || 0).toFixed(2)}</p>
                      </div>
                    </div>
                    {salePricing.totalApprovedHomes < NEIGHBORHOOD_MIN_HOMES ? (
                      <p className="text-sm text-emerald-800">If the sale is still under {NEIGHBORHOOD_MIN_HOMES} approved homes at the 24-hour lock point, Yardit will switch the organizer to the $7.99 Premium fallback and remove the Neighborhood container.</p>
                    ) : neighborhoodEventState === "activated_locked" || neighborhoodEventState === "coming_soon" || neighborhoodEventState === "active" ? (
                      <p className="text-sm text-emerald-800">This sale is locked after the organizer charge and can no longer add or remove participants through the normal flow.</p>
                    ) : (
                      <p className="text-sm text-emerald-800">The organizer card on file will be charged automatically once, exactly 24 hours before start time, using the locked Neighborhood Sale pricing.</p>
                    )}
                  </div>
                )}

                <div className="bg-white/70 border border-emerald-200 rounded-lg p-3 space-y-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-1">Participating in Sale</p>
                    <p className="text-sm text-emerald-950 font-medium">{salePricing?.visibleHomeCount || 1} homes currently live in this sale</p>
                  </div>
                  {isNeighborhoodSaleLive && approvedRequests.length > 0 ? (
                    <div className="space-y-3">
                      {approvedRequests.map((req, index) => (
                        <div key={req.id || index} className="text-sm text-emerald-900 border border-emerald-200 rounded-md bg-white p-3 space-y-2">
                          <div>
                            <p className="font-semibold text-emerald-950">{req.listingDetails?.title || "Participant"}</p>
                            <p className="text-emerald-800">{req.listingDetails ? formatAddress(req.listingDetails) : "Address unavailable"}</p>
                          </div>
                          <div className="flex gap-2 flex-wrap pt-2 mt-2 border-t border-emerald-100">
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                              onClick={() => navigate(createPageUrl("ListingDetail") + "?id=" + req.listingId)}
                            >
                              View More Details
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                              onClick={() => toast.info("Messaging feature coming soon.")}
                            >
                              Send Message
                            </Button>
                            {(user?.id === listing.ownerUserId || user?.isAdmin) && (
                              isNeighborhoodSaleLive ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={() => {
                                    setReportContext({
                                      joinRequestId: req.id,
                                      requesterListingId: req.listingId,
                                      requesterUserId: req.requesterUserId,
                                      saleListingId: listingId,
                                      eventTitle: listing.title,
                                    });
                                    setShowReport(true);
                                  }}
                                >
                                  Report
                                </Button>
                              ) : (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={() => {
                                    if (window.confirm("Are you sure you want to remove this participant from the sale?")) {
                                      respondToJoinRequestMutation.mutate({
                                        requestId: req.id,
                                        requesterListingId: req.listingId,
                                        action: "remove",
                                        requesterUserId: req.requesterUserId,
                                        eventTitle: listing.title
                                      });
                                    }
                                  }}
                                >
                                  Remove From Sale
                                </Button>
                              )
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-emerald-800">
                      {isNeighborhoodSaleLive
                        ? "No approved participant addresses available yet."
                        : "This sale is not public yet. Approved homes become visible after payment is completed."}
                    </p>
                  )}
                </div>

                {/* (plain english) section to show pending requests for EO */}
                {user && user.id === listing.ownerUserId && pendingRequests.length > 0 && (
                  <div className="mt-4 border-t border-emerald-200 pt-4">
                    <h4 className="font-semibold text-emerald-900 mb-3">Pending Join Requests ({pendingRequests.length})</h4>
                    <div className="space-y-3">
                      {pendingRequests.map(req => (
                        <div key={req.id} className="bg-white p-3 rounded border border-emerald-100 shadow-sm">
                          <p className="font-medium text-slate-800">{req.listingDetails?.title || "Unknown Listing"}</p>
                          <p className="text-sm text-slate-600 mb-1">{req.listingDetails?.addressText || "No address"}</p>
                          <p className="text-sm text-slate-500 line-clamp-2 mb-3">{req.listingDetails?.description}</p>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => respondToJoinRequestMutation.mutate({
                                requestId: req.id,
                                requesterListingId: req.listingId,
                                action: "approve",
                                requesterUserId: req.requesterUserId,
                                eventTitle: listing.title
                              })}
                            >
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => respondToJoinRequestMutation.mutate({
                                requestId: req.id,
                                requesterListingId: req.listingId,
                                action: "deny",
                                requesterUserId: req.requesterUserId,
                                eventTitle: listing.title
                              })}
                            >
                              Deny
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* (plain english) section to show participating homes for EO */}
                {user && user.id === listing.ownerUserId && approvedRequests.length > 0 && (
                  <div className="mt-4 border-t border-emerald-200 pt-4">
                    <h4 className="font-semibold text-emerald-900 mb-3">Participating Homes ({approvedRequests.length})</h4>
                    <div className="space-y-3">
                      {approvedRequests.map(req => (
                        <div key={req.id} className="bg-white p-3 rounded border border-emerald-100 shadow-sm">
                          <div className="flex justify-between items-start mb-1">
                            <p className="font-medium text-slate-800">{req.listingDetails?.title || "Unknown Listing"}</p>
                            <Badge className="bg-green-600 text-white hover:bg-green-700 border-none">Approved</Badge>
                          </div>
                          <p className="text-sm text-slate-600 mb-1">{req.listingDetails?.addressText || "No address"}</p>
                          <p className="text-sm text-slate-500 line-clamp-2 mb-3">{req.listingDetails?.description}</p>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-blue-600 border-blue-200 hover:bg-blue-50"
                              onClick={() => navigate(createPageUrl("CreateListing") + "?edit=1&listingId=" + req.listingId)}
                            >
                              Edit Listing
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => respondToJoinRequestMutation.mutate({
                                requestId: req.id,
                                requesterListingId: req.listingId,
                                action: "remove",
                                requesterUserId: req.requesterUserId,
                                eventTitle: listing.title
                              })}
                            >
                              Remove from Neighborhood
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* (plain english) section to show removed homes for EO */}
                {user && user.id === listing.ownerUserId && removedRequests.length > 0 && (
                  <div className="mt-4 border-t border-red-200 pt-4">
                    <h4 className="font-semibold text-red-900 mb-3">Removed Homes ({removedRequests.length})</h4>
                    <div className="space-y-3">
                      {removedRequests.map(req => (
                        <div key={req.id} className="bg-white p-3 rounded border border-red-100 shadow-sm opacity-75">
                          <div className="flex justify-between items-start mb-1">
                            <p className="font-medium text-slate-800">{req.listingDetails?.title || "Unknown Listing"}</p>
                            <Badge className="bg-red-600 text-white hover:bg-red-700 border-none">Removed</Badge>
                          </div>
                          <p className="text-sm text-slate-600 mb-1">{req.listingDetails?.addressText || "No address"}</p>
                          <p className="text-sm text-slate-500 line-clamp-2 mb-3">{req.listingDetails?.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* (plain english) info box for the requester about their join status */}
            {normalizeNeighborhoodJoinStatus(listing.neighborhood_join_status) === "pending" && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-900">Neighborhood Sale: Pending approval</h3>
              </div>
            )}
            {normalizeNeighborhoodJoinStatus(listing.neighborhood_join_status) === "approved" && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-1">Neighborhood Sale: Approved</h3>
                {parentSale && (
                  <div className="text-sm text-green-800 mt-2">
                    <p><strong>Event:</strong> {parentSale.title}</p>
                    {parentSale.startDateTime && parentSale.endDateTime && (
                      <p><strong>Dates:</strong> {format(new Date(parentSale.startDateTime), "PPp")} - {format(new Date(parentSale.endDateTime), "PPp")}</p>
                    )}
                    <p className="mt-2">If this Neighborhood Sale is canceled or your participation is removed, you will need to create a normal listing to appear independently.</p>
                  </div>
                )}
              </div>
            )}
            {listing.neighborhood_join_status === "denied" && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-red-900">Neighborhood Sale: Denied</h3>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => navigate(createPageUrl("Home") + `?listingId=${listing.id}`)}
                disabled={!listing.lat || !listing.lng}
                className="flex-1 gap-2"
                style={{ backgroundColor: '#0F766E' }}
              >
                <Map className="w-4 h-4" />
                Show on Map
              </Button>
              <Button
                onClick={() => safeBack(navigate, createPageUrl("Home"), returnTarget !== "default" ? createPageUrl(returnTarget) : null)}
                variant="outline"
                className="flex-1"
              >
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>

      {showReport && (
        <ReportModal
          listingId={reportContext?.requesterListingId || listingId}
          neighborhoodRemovalContext={reportContext}
          onClose={() => {
            setShowReport(false);
            setReportContext(null);
          }}
        />
      )}
      
      {showPromoModal && (
        <PromotionModal
          open={showPromoModal}
          onClose={() => setShowPromoModal(false)}
          listing={listing}
        />
      )}
    </div>
  );
}
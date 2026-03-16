import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
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
  getNeighborhoodPricingSummary,
  NEIGHBORHOOD_MAX_HOMES,
  NEIGHBORHOOD_MIN_HOMES,
  NEIGHBORHOOD_PRICE_CAP,
} from "@/lib/neighborhoodSalePricing";
import { getListingNumber, getOwnerDisplayName } from "@/components/listing/listingDisplay";

export default function ListingDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [listingId, setListingId] = useState(null);
  const [returnTarget, setReturnTarget] = useState("default");
  const [user, setUser] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

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
        return { ...r, listingDetails: l[0] };
      }));
      return enriched;
    },
    enabled: !!listing && listing.listingType === "neighborhood_sale",
  });

  const pendingRequests = joinRequests?.filter(r => r.status === "pending") || [];
  const approvedRequests = joinRequests?.filter(r => r.status === "approved" && !r.removed_by_eo) || [];
  const pendingPaymentRequests = joinRequests?.filter(r => r.status === "approved_pending_payment" && !r.removed_by_eo) || [];
  const removedRequests = joinRequests?.filter(r => r.status === "denied" && r.removed_by_eo === true) || [];
  const formatAddress = (item) => {
    const base = [item.addressText || "Address unavailable", item.city, item.state].filter(Boolean).join(", ");
    return item.zip ? `${base} ${item.zip}` : base;
  };
  const salePricing = useMemo(() => {
    if (!listing || listing.listingType !== "neighborhood_sale") return null;
    return getNeighborhoodPricingSummary(joinRequests || [], listing.pricePaid || 0);
  }, [joinRequests, listing]);
  const isNeighborhoodSaleLive = listing?.listingType === "neighborhood_sale" && ["active", "payment_pending_adjustment"].includes(listing.status);
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
    enabled: !!listing && ["approved", "approved_pending_payment"].includes(listing.neighborhood_join_status) && !!listing.neighborhood_sale_id,
  });

  const { isDemoMode } = useAppMode();

  const syncNeighborhoodSaleListing = async (saleId, paidAmountOverride) => {
    const sales = await base44.entities.Listing.filter({ id: saleId });
    const sale = sales[0];
    if (!sale) return null;

    const requests = await base44.entities.JoinRequest.filter({ saleListingId: saleId });
    const paidAmount = Number(paidAmountOverride ?? sale.pricePaid ?? 0);
    const summary = getNeighborhoodPricingSummary(requests, paidAmount);
    const alreadyLive = ["active", "payment_pending_adjustment"].includes(sale.status) || paidAmount > 0;
    const nextStatus = alreadyLive
      ? (summary.additionalDue > 0 ? "payment_pending_adjustment" : "active")
      : (summary.readyForPayment ? "ready_for_payment" : "collecting_participants");

    await base44.entities.Listing.update(saleId, {
      status: nextStatus,
      activation_status: ["active", "payment_pending_adjustment"].includes(nextStatus) ? "active" : "pending",
      homeCount: summary.visibleHomeCount,
    });

    return { summary, nextStatus };
  };

  const respondToJoinRequestMutation = useMutation({
    mutationFn: async ({ requestId, requesterListingId, action, requesterUserId, eventTitle }) => {
      const sales = await base44.entities.Listing.filter({ id: listingId });
      const sale = sales[0];
      const saleRequests = await base44.entities.JoinRequest.filter({ saleListingId: listingId });

      if (action === "approve") {
        const activeHomes = 1 + saleRequests.filter((request) => request.removed_by_eo !== true && ["approved", "approved_pending_payment"].includes(request.status)).length;
        if (activeHomes >= NEIGHBORHOOD_MAX_HOMES) {
          throw new Error("Neighborhood Sale has reached the 25-home limit.");
        }

        const saleIsLive = ["active", "payment_pending_adjustment"].includes(sale?.status);
        let requestStatus = "approved";
        let requesterStatus = "approved";

        if (saleIsLive) {
          const projectedSummary = getNeighborhoodPricingSummary([
            ...saleRequests.filter((request) => request.id !== requestId && request.removed_by_eo !== true),
            { id: requestId, status: "approved" }
          ], sale?.pricePaid || 0);

          if (projectedSummary.additionalDue > 0) {
            requestStatus = "approved_pending_payment";
            requesterStatus = "approved_pending_payment";
          }
        }

        await base44.entities.JoinRequest.update(requestId, { status: requestStatus });
        await base44.entities.Listing.update(requesterListingId, {
          neighborhood_join_status: requesterStatus,
          payment_intent_status: requestStatus === "approved_pending_payment" ? "hold_requested" : "voided",
          neighborhood_sale_id: listingId
        });
        await base44.entities.Notification.create({
          userId: requesterUserId,
          title: requestStatus === "approved_pending_payment" ? "Approved Pending Organizer Payment" : "Join Request Approved",
          message: requestStatus === "approved_pending_payment"
            ? "Approved — this home will go live after the organizer completes the additional payment."
            : `Approved — you joined ${eventTitle}`,
          type: requestStatus === "approved_pending_payment" ? "join_request_approved_pending_payment" : "join_request_approved",
          metadata: { sale_listing_id: listingId, requester_listing_id: requesterListingId }
        });
        await syncNeighborhoodSaleListing(listingId);
      } else if (action === "remove") {
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
          type: "join_request_removed",
          metadata: { sale_listing_id: listingId, requester_listing_id: requesterListingId }
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
          message: "Denied — your listing stays active under your selected tier",
          type: "join_request_denied",
          metadata: { sale_listing_id: listingId, requester_listing_id: requesterListingId }
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

  const handleNeighborhoodSalePayment = async () => {
    if (!salePricing || salePricing.additionalDue <= 0) return;

    setIsProcessingPayment(true);
    try {
      const durationDays = Math.max(
        1,
        Math.ceil((new Date(listing.endDateTime).getTime() - new Date(listing.startDateTime).getTime()) / (1000 * 60 * 60 * 24)) + 1
      );

      await base44.entities.Payment.create({
        location_id: listingId,
        amount: salePricing.additionalDue,
        plan: Number(listing.pricePaid || 0) > 0 ? "neighborhood_sale_adjustment" : "neighborhood_sale_initial",
        duration_days: durationDays,
        status: "completed",
        payment_method: isDemoMode ? "none" : "simulated_card",
        transaction_id: `${isDemoMode ? "DEMO" : "TXN"}_${Date.now()}`,
      });

      for (const request of pendingPaymentRequests) {
        await base44.entities.JoinRequest.update(request.id, { status: "approved" });
        await base44.entities.Listing.update(request.listingId, {
          neighborhood_join_status: "approved",
          payment_intent_status: isDemoMode ? "none" : "captured",
          neighborhood_sale_id: listingId,
        });
      }

      const newPaidAmount = Math.min(
        NEIGHBORHOOD_PRICE_CAP,
        Number(listing.pricePaid || 0) + Number(salePricing.additionalDue || 0)
      );
      const refreshedRequests = await base44.entities.JoinRequest.filter({ saleListingId: listingId });
      const refreshedSummary = getNeighborhoodPricingSummary(refreshedRequests, newPaidAmount);

      await base44.entities.Listing.update(listingId, {
        pricePaid: newPaidAmount,
        status: refreshedSummary.additionalDue > 0 ? "payment_pending_adjustment" : "active",
        activation_status: "active",
        homeCount: refreshedSummary.visibleHomeCount,
        payment_intent_status: isDemoMode ? "none" : "captured",
      });

      queryClient.invalidateQueries({ queryKey: ["joinRequests", listingId] });
      queryClient.invalidateQueries({ queryKey: ["listing", listingId] });
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setShowPaymentDialog(false);
      toast.success(Number(listing.pricePaid || 0) > 0 ? "Additional payment recorded." : "Neighborhood Sale is now live.");
    } catch {
      toast.error("Payment could not be completed.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

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
                        <p className="text-sm text-emerald-950 font-medium">{salePricing.totalApprovedHomes} approved homes • {salePricing.visibleHomeCount} currently visible</p>
                      </div>
                      <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 border-none capitalize">
                        {String(listing.status || "collecting_participants").replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <div className="rounded-md border border-emerald-200 bg-white p-3">
                        <p className="text-xs uppercase tracking-wide text-emerald-700">Paid</p>
                        <p className="font-semibold text-emerald-950">${Number(listing.pricePaid || 0).toFixed(2)}</p>
                      </div>
                      <div className="rounded-md border border-emerald-200 bg-white p-3">
                        <p className="text-xs uppercase tracking-wide text-emerald-700">Total Due</p>
                        <p className="font-semibold text-emerald-950">${Number(salePricing.totalDue || 0).toFixed(2)}</p>
                      </div>
                      <div className="rounded-md border border-emerald-200 bg-white p-3">
                        <p className="text-xs uppercase tracking-wide text-emerald-700">Additional Due</p>
                        <p className="font-semibold text-emerald-950">${Number(salePricing.additionalDue || 0).toFixed(2)}</p>
                      </div>
                    </div>
                    {salePricing.totalApprovedHomes < NEIGHBORHOOD_MIN_HOMES ? (
                      <p className="text-sm text-emerald-800">At least {NEIGHBORHOOD_MIN_HOMES} approved homes are required before payment and activation.</p>
                    ) : salePricing.additionalDue > 0 ? (
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <p className="text-sm text-emerald-800">
                          {Number(listing.pricePaid || 0) > 0
                            ? "Newly approved homes will stay pending until the difference is paid."
                            : "Payment is required before the sale goes live."}
                        </p>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setShowPaymentDialog(true)}>
                          {Number(listing.pricePaid || 0) > 0 ? `Pay Additional $${Number(salePricing.additionalDue || 0).toFixed(2)}` : `Pay & Activate Sale ($${Number(salePricing.additionalDue || 0).toFixed(2)})`}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-emerald-800">This sale is fully paid up{salePricing.atCap ? " and has reached the $50 cap" : ""}.</p>
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

                {user && user.id === listing.ownerUserId && pendingPaymentRequests.length > 0 && (
                  <div className="mt-4 border-t border-amber-200 pt-4">
                    <h4 className="font-semibold text-amber-900 mb-3">Approved Pending Payment ({pendingPaymentRequests.length})</h4>
                    <div className="space-y-3">
                      {pendingPaymentRequests.map(req => (
                        <div key={req.id} className="bg-white p-3 rounded border border-amber-100 shadow-sm">
                          <div className="flex justify-between items-start mb-1">
                            <p className="font-medium text-slate-800">{req.listingDetails?.title || "Unknown Listing"}</p>
                            <Badge className="bg-amber-500 text-amber-950 hover:bg-amber-600 border-none">Pending Payment</Badge>
                          </div>
                          <p className="text-sm text-slate-600 mb-1">{req.listingDetails?.addressText || "No address"}</p>
                          <p className="text-sm text-slate-500 line-clamp-2">This home is approved and will go live after the organizer pays the remaining difference.</p>
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
            {(listing.neighborhood_join_status === "pending" || listing.neighborhood_join_status === "requested") && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-900">Neighborhood Sale: Pending approval</h3>
              </div>
            )}
            {listing.neighborhood_join_status === "approved" && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-1">Neighborhood Sale: Approved</h3>
                {parentSale && (
                  <div className="text-sm text-green-800 mt-2">
                    <p><strong>Event:</strong> {parentSale.title}</p>
                    {parentSale.startDateTime && parentSale.endDateTime && (
                      <p><strong>Dates:</strong> {format(new Date(parentSale.startDateTime), "PPp")} - {format(new Date(parentSale.endDateTime), "PPp")}</p>
                    )}
                  </div>
                )}
              </div>
            )}
            {listing.neighborhood_join_status === "approved_pending_payment" && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="font-semibold text-amber-900 mb-1">Neighborhood Sale: Approved Pending Payment</h3>
                <p className="text-sm text-amber-800">This home will go live in the sale after the organizer pays the remaining amount.</p>
                {parentSale && (
                  <div className="text-sm text-amber-800 mt-2">
                    <p><strong>Event:</strong> {parentSale.title}</p>
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
                onClick={() => navigate(-1)}
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

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{Number(listing.pricePaid || 0) > 0 ? "Pay Additional Neighborhood Sale Balance" : "Pay & Activate Neighborhood Sale"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 space-y-2">
              <p><strong>Approved homes:</strong> {salePricing?.totalApprovedHomes || 0}</p>
              <p><strong>Already paid:</strong> ${Number(listing.pricePaid || 0).toFixed(2)}</p>
              <p><strong>Amount due now:</strong> ${Number(salePricing?.additionalDue || 0).toFixed(2)}</p>
              <p>{isDemoMode ? "Demo Mode will follow the same activation flow without a real charge." : "This uses the current in-app payment flow to record the sale payment."}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowPaymentDialog(false)} disabled={isProcessingPayment}>
                Cancel
              </Button>
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleNeighborhoodSalePayment} disabled={isProcessingPayment || !salePricing || salePricing.additionalDue <= 0}>
                {isProcessingPayment ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {Number(listing.pricePaid || 0) > 0 ? "Pay Difference" : "Confirm Payment"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {showReport && (
        <ReportModal
          listingId={listingId}
          onClose={() => setShowReport(false)}
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
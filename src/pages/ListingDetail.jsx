import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPageUrl, safeBack } from "@/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { MapPin, Calendar, AlertTriangle, Map, Tag } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import ReportModal from "../components/ReportModal";
import PromotionModal from "../components/admin/promotions/PromotionModal";
import { getAdminSession } from "@/components/admin/AdminLoginModal";
import { useAppMode } from "../components/shared/DemoMode";
import { useGuestGuard } from "@/hooks/useGuestGuard";
import GuestAuthModal from "@/components/guest/GuestAuthModal";
import {
  getNeighborhoodPricingSummary,
  NEIGHBORHOOD_MAX_HOMES,
} from "@/lib/neighborhoodSalePricing";
import { getStateAbbreviation } from "@/lib/listingLocation";
import { getListingNumber, getOwnerDisplayName } from "@/components/listing/listingDisplay";
import { deriveNeighborhoodEventState, normalizeNeighborhoodJoinStatus } from "@/lib/neighborhoodSaleState";
import { formatEventTierLabel } from "@/lib/eventListingConfig";
import { formatMarqueeSlotTime, normalizeMarqueeSlots } from "@/lib/marqueeSchedule";
import {
  getFeaturedItems,
  getFormattedDescription,
  getHookLine,
  getTrustSignal,
  getUrgencyText,
} from "@/components/listing/listingDetailContent";
import SaveListingButton from "@/components/listing/SaveListingButton";
import ListingPhotoGallery from "@/components/listing/ListingPhotoGallery";
import ListingShareButton from "@/components/listing/ListingShareButton";
import NeighborhoodSalePanel from "@/components/listing/NeighborhoodSalePanel";
import ResidentialBillingList from "@/components/billing/ResidentialBillingList";
import { getTransactionListingId, isResidentialTransaction } from "@/components/billing/residentialBillingUtils";
import { getListingOwnerId, isOwnerPreviewVisibleListing, isPubliclyVisibleListing } from "@/lib/listingVisibility";

export default function ListingDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [listingId, setListingId] = useState(null);
  const [user, setUser] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [reportContext, setReportContext] = useState(null);
  const [showPromoModal, setShowPromoModal] = useState(false);

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const { guardAction, showModal, setShowModal, isGuest } = useGuestGuard();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setListingId(params.get("id"));

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
  const approvedRequests = joinRequests?.filter(r =>
    r.status === "approved" &&
    r.removed_by_eo !== true &&
    r.removed_by_listing_owner !== true &&
    r.listingDetails?.status !== "canceled" &&
    r.listingDetails?.status !== "cancelled"
  ) || [];
  const removedRequests = joinRequests?.filter(r => r.removed_by_eo === true || r.removed_by_listing_owner === true) || [];
  const isOwner = !!user && user.id === getListingOwnerId(listing);
  const isAcceptedCoHost = !!user && listing?.listingType === "neighborhood_sale" && listing?.co_host_user_id === user.id && listing?.co_host_status === "accepted";
  const canManageNeighborhoodSale = isOwner || isAcceptedCoHost;

  // Fetch the organizer's own linked yard sale listing (created during NS setup flow).
  // It is stored on the NS as organizer_participant_listing_id and has no JoinRequest record.
  const { data: organizerParticipantListing } = useQuery({
    queryKey: ["organizerParticipantListing", listing?.organizer_participant_listing_id],
    queryFn: async () => {
      const results = await base44.entities.Listing.filter({ id: listing.organizer_participant_listing_id });
      return results[0] || null;
    },
    enabled: !!listing?.organizer_participant_listing_id && listing?.listingType === "neighborhood_sale",
  });

  // Canonical roster:
  // 1. Organizer's own yard sale (via organizer_participant_listing_id), only if active/not cancelled
  // 2. Approved JoinRequest participants (excluding any that might reference the NS parent itself)
  const visibleParticipatingHomes = useMemo(() => {
    if (!listing || listing.listingType !== "neighborhood_sale") return [];

    const homes = [];

    // Add organizer's linked listing if it exists and is not cancelled
    if (organizerParticipantListing &&
        organizerParticipantListing.status !== "canceled" &&
        organizerParticipantListing.status !== "cancelled") {
      homes.push({
        _isOrganizerListing: true,
        id: `organizer-${organizerParticipantListing.id}`,
        listingId: organizerParticipantListing.id,
        listingDetails: organizerParticipantListing,
        requesterUserId: listing.ownerUserId,
      });
    }

    // Add approved JoinRequest participants (never include the NS parent itself)
    for (const r of approvedRequests) {
      if (r.listingId !== listing.id) {
        homes.push(r);
      }
    }

    return homes;
  }, [listing, organizerParticipantListing, approvedRequests]);

  const approvedHomesCount = visibleParticipatingHomes.length;
  const availableSpots = Math.max(0, 25 - approvedHomesCount);

  const formatAddress = (item) => {
    const base = [item.display_address || item.address_text || item.addressText || "Address unavailable", item.city, getStateAbbreviation(item.state)].filter(Boolean).join(", ");
    return item.zip ? `${base} ${item.zip}` : base;
  };

  const salePricing = useMemo(() => {
    if (!listing || listing.listingType !== "neighborhood_sale") return null;
    const summary = getNeighborhoodPricingSummary(joinRequests || [], listing.pricePaid || 0);
    const canonicalCount = visibleParticipatingHomes.length;
    return { ...summary, visibleHomeCount: canonicalCount, totalApprovedHomes: canonicalCount };
  }, [joinRequests, listing, visibleParticipatingHomes]);
  const neighborhoodEventState = useMemo(() => deriveNeighborhoodEventState(listing), [listing]);
  const isNeighborhoodSaleLive = listing?.listingType === "neighborhood_sale" && neighborhoodEventState === "active";
  const participantAddresses = (isNeighborhoodSaleLive ? visibleParticipatingHomes : [])
    .map((entry) => entry.listingDetails ? formatAddress(entry.listingDetails) : null)
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

  const isAdminViewer = !!user && (user.isAdmin || ["master", "super_master", "supervisor", "admin"].includes(user.role));

  const { data: listingBillingTransactions = [], isLoading: isLoadingListingBilling } = useQuery({
    queryKey: ["adminListingBillingTransactions", "listingOnlyV2", listing?.id, listing?.ownerUserId],
    queryFn: async () => {
      const transactions = await base44.entities.PaymentTransaction.list("-created_date", 250);
      const completedSessions = new Set(
        transactions
          .filter((tx) => tx.event_type !== "checkout.session.created" && tx.stripe_checkout_session_id)
          .map((tx) => tx.stripe_checkout_session_id)
      );
      const seenKeys = new Set();
      return transactions
        .filter(isResidentialTransaction)
        .filter((tx) => {
          if (tx.event_type === "checkout.session.created" && completedSessions.has(tx.stripe_checkout_session_id)) return false;

          const hasExplicitRecordLink = !!(tx.yardit_record_type || tx.yardit_record_id);
          if (hasExplicitRecordLink) {
            return String(tx.yardit_record_type || "").toLowerCase() === "listing" && tx.yardit_record_id === listing.id;
          }

          const listingStripeIds = new Set([
            listing.stripe_checkout_session_id,
            listing.pending_checkout_session_id,
            listing.pending_upgrade_checkout_session_id,
            listing.stripe_payment_intent_id,
          ].filter(Boolean));

          const txStripeMatchesListing = [tx.stripe_checkout_session_id, tx.stripe_payment_intent_id]
            .filter(Boolean)
            .some((id) => listingStripeIds.has(id));

          if (txStripeMatchesListing) return true;

          const legacyListingId = getTransactionListingId(tx);
          if (legacyListingId === listing.id) return true;

          if (tx.metadata_json) {
            const metadata = JSON.parse(tx.metadata_json);
            return [metadata.listing_id, metadata.residential_listing_id, metadata.yardit_record_id].filter(Boolean).includes(listing.id);
          }

          return false;
        })
        .filter((tx) => {
          const key = tx.stripe_payment_intent_id || tx.stripe_checkout_session_id || tx.id;
          if (seenKeys.has(key)) return false;
          seenKeys.add(key);
          return true;
        })
        .sort((a, b) => new Date(b.processed_at || b.received_at || b.created_date || 0) - new Date(a.processed_at || a.received_at || a.created_date || 0));
    },
    enabled: !!listing?.id && isAdminViewer,
    initialData: [],
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

  useEffect(() => {
    if (listing) {
      const shareTitle = listing.event_name || listing.title;
      const listingUrl = `${window.location.origin}${createPageUrl("ListingDetail")}?id=${listing.id}`;
      
      const listingImages = (() => {
        const basePhotos = listing?.listingType === "event"
          ? (listing?.event_photos || listing?.photoUrls || [])
          : (listing?.photoUrls || listing?.event_photos || []);
        return (listing?.marquee_flyer_url ? [listing.marquee_flyer_url] : []).concat(basePhotos).filter(Boolean);
      })();
      const mainImage = listingImages[0];

      if (mainImage) {
        document.title = shareTitle;
        const setMeta = (attr, key, val) => {
          let el = document.querySelector(`meta[${attr}="${key}"]`);
          if (!el) {
            el = document.createElement("meta");
            el.setAttribute(attr, key);
            document.head.appendChild(el);
          }
          el.setAttribute("content", val);
        };
        
        setMeta("property", "og:title", shareTitle);
        setMeta("property", "og:description", listing.event_description || listing.description || "");
        setMeta("property", "og:image", mainImage);
        setMeta("property", "og:url", listingUrl);
        setMeta("property", "og:type", "website");
        setMeta("name", "twitter:title", shareTitle);
        setMeta("name", "twitter:description", listing.event_description || listing.description || "");
        setMeta("name", "twitter:image", mainImage);
        setMeta("name", "twitter:card", "summary_large_image");
      }
    }
  }, [listing]);

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
        
        const { summary } = await syncNeighborhoodSaleListing(listingId);
        
        // Notify organizer if exactly hitting 5th participant (commitment trigger)
        if (summary?.totalApprovedHomes === 5) {
          await base44.entities.Notification.create({
            userId: user.id,
            title: "Neighborhood Sale Committed",
            message: `Your sale has reached 5 homes and is now COMMITTED. Cancelling now will trigger an immediate charge. Otherwise, you will be charged once exactly 24 hours before the event.`,
            type: "neighborhood_sale_committed",
            metadata: { sale_listing_id: listingId, event_title: eventTitle }
          });
        }
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

  const canViewListingDetail = isPubliclyVisibleListing(listing, { currentUser: user }) || isOwnerPreviewVisibleListing(listing, user, { viewingOwnerPreviewMode: true }) || user?.isAdmin || ["master", "super_master", "supervisor"].includes(user?.role);
  if (!canViewListingDetail) {
    return <div className="p-8 text-center text-slate-600">This listing is not publicly available.</div>;
  }

  const tierColors = {
    free: "bg-slate-500",
    basic: "bg-slate-700",
    featured: "bg-purple-600",
    premium: "bg-amber-600",
    marquee: "bg-rose-600",
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

  const marqueeSchedule = normalizeMarqueeSlots(listing?.marquee_schedule_slots || []);
  const hookLine = getHookLine(listing);
  const featuredItems = getFeaturedItems(listing);
  const formattedDescription = getFormattedDescription(listing);
  const trustSignal = getTrustSignal(listing);
  const urgencyText = getUrgencyText(listing);
  const listingImages = (() => {
    const basePhotos = listing?.listingType === "event"
      ? (listing?.event_photos || listing?.photoUrls || [])
      : (listing?.photoUrls || listing?.event_photos || []);

    return (listing?.marquee_flyer_url ? [listing.marquee_flyer_url] : []).concat(basePhotos).filter(Boolean);
  })();
  const mainImage = listingImages[selectedImageIndex] || listingImages[0];
  const listingUrl = `${window.location.origin}${createPageUrl("ListingDetail")}?id=${listing.id}`;
  const shareTitle = listing.event_name || listing.title;
  return (
    <div className="min-h-[calc(100vh-140px)] bg-slate-50">
      <div className="max-w-4xl mx-auto">
        {/* Sticky lightweight action header */}
        <div className="sticky top-[73px] z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur px-3 sm:px-4 md:px-6 py-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">View Listing</p>
              <p className="truncate text-sm font-medium text-slate-800">{listing.event_name || listing.title}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap self-start">
              {user?.isAdmin && (
                <Button 
                  size="sm" 
                  className="rounded-full bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-sm"
                  onClick={() => setShowPromoModal(true)}
                >
                  PROMOTIONAL
                </Button>
              )}
              {(user || isGuest) && user?.id !== getListingOwnerId(listing) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => guardAction(() => setShowReport(true))}
                  className="gap-2 rounded-full"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Report
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 md:p-8">
        <Card className="overflow-hidden rounded-[2rem] border-0 bg-white/95 shadow-[0_18px_60px_rgba(15,23,42,0.10)]">
          <CardContent className="space-y-8 p-4 sm:p-6 md:p-8">
            <div className="space-y-5">
              {listingImages.length > 0 && (
                <ListingPhotoGallery
                  images={listingImages}
                  selectedIndex={selectedImageIndex}
                  onIndexChange={setSelectedImageIndex}
                  title={shareTitle}
                />
              )}

              <div className="space-y-8">
                {/* B. Event Title & C. Description */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`${tierColors[listing.event_tier || listing.tier] || "bg-slate-500"} rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white shadow-sm`}>
                      {listing.listingType === "event" ? formatEventTierLabel(listing.event_tier || listing.tier) : listing.tier === "neighborhood_tier" ? "Neighborhood Sale" : listing.tier.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-slate-500 font-medium">Listing #{getListingNumber(listing)}</span>
                  </div>
                  
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-950 break-words leading-[1.1]">
                    {listing.event_name || listing.title}
                  </h1>
                  
                  <div className="space-y-3 py-2">
                    <p className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                      {hookLine}
                    </p>
                    {formattedDescription.length > 0 && (
                      <div className="space-y-2 mt-2">
                        {formattedDescription.map((line, index) => (
                          <p key={index} className="text-slate-700 text-base sm:text-lg leading-relaxed">
                            {line}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <p className="text-xs text-slate-500">
                    Owner:{" "}
                    {user?.isAdmin && getAdminSession() ? (
                      <button
                        type="button"
                        onClick={() => navigate(createPageUrl("AdminLite") + `?tab=lite&liteTab=users&openUserId=${getListingOwnerId(listing)}`)}
                        className="font-medium text-blue-600 hover:text-blue-800 underline underline-offset-2"
                      >
                        {getOwnerDisplayName(ownerUser, listing)}
                      </button>
                    ) : (
                      <span className="font-medium text-slate-700">{getOwnerDisplayName(ownerUser, listing)}</span>
                    )}
                  </p>
                </div>

                {/* D. Quick Info Row */}
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 sm:p-5 shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm text-slate-700">
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="font-medium truncate">{listing.city}{getStateAbbreviation(listing.state) ? `, ${getStateAbbreviation(listing.state)}` : ""}</span>
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="font-medium truncate">{format(new Date(listing.startDateTime), "MMM d")} - {format(new Date(listing.endDateTime), "MMM d")}</span>
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <Tag className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="font-medium truncate">{(listing.categories?.length > 0 ? listing.categories[0] : listing.event_category || listing.category) || "General"}</span>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm border border-slate-100">
                      {urgencyText.starts}
                    </div>
                    <div className="rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800 border border-amber-100/50">
                      {urgencyText.ends}
                    </div>
                  </div>
                </div>

                {/* E. Primary Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <ListingShareButton
                    listing={listing}
                    listingUrl={listingUrl}
                    mainImage={mainImage}
                  />
                  <Button
                    onClick={() => navigate(createPageUrl("Home") + `?listingId=${listing.id}${isOwner ? "&ownerPreview=1" : ""}`)}
                    disabled={!listing.lat || !listing.lng}
                    variant="outline"
                    className="flex-1 gap-2 rounded-xl h-12 border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 font-medium"
                  >
                    <Map className="w-4 h-4" />
                    Show on Map
                  </Button>
                  <SaveListingButton 
                    listing={listing}
                    className="flex-1 gap-2 rounded-xl h-12 border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 font-medium"
                    size="default"
                  />
                </div>

                {/* F. Date/Time & G. Location Grid */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    <div className="flex items-start gap-3 text-slate-700">
                      <Calendar className="w-5 h-5 text-slate-400 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Date & Time</p>
                        <p className="text-sm font-medium text-slate-900">{format(new Date(listing.startDateTime), "EEEE, MMM d, yyyy")}</p>
                        <p className="text-sm text-slate-600 mt-0.5">{format(new Date(listing.startDateTime), "h:mm a")} - {format(new Date(listing.endDateTime), "h:mm a")}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    <div className="flex items-start gap-3 text-slate-700">
                      <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Location</p>
                        <p className="text-sm font-medium text-slate-900">{listing.city}{getStateAbbreviation(listing.state) ? `, ${getStateAbbreviation(listing.state)}` : ""}</p>
                        <p className="text-sm text-slate-600 mt-0.5 break-words">{listing.display_address || listing.address_text || listing.addressText}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* H. Featured Items - Toned Down */}
                {featuredItems.length > 0 && (
                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100/50">
                    <div className="flex items-center gap-2 mb-3">
                      <Tag className="w-4 h-4 text-slate-400" />
                      <h3 className="text-sm font-medium text-slate-700">Featured Items</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {featuredItems.map((item, idx) => (
                        <Badge key={idx} variant="secondary" className="rounded-lg bg-white border border-slate-200 text-slate-600 font-normal px-3 py-1 text-sm">
                          {item}
                        </Badge>
                      ))}
                    </div>
                    {trustSignal && <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-200/60">{trustSignal}</p>}
                  </div>
                )}
              </div>
            </div>

            {marqueeSchedule.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Schedule</h3>
                <div className="space-y-2">
                  {marqueeSchedule.map((slot) => (
                    <div key={slot.id} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{slot.label}</p>
                        <p className="text-xs text-slate-500">{format(slot.startDate, "PPP")}</p>
                      </div>
                      <p className="text-sm font-medium text-amber-700 whitespace-nowrap">{formatMarqueeSlotTime(slot)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <NeighborhoodSalePanel
              listing={listing}
              user={user}
              salePricing={salePricing}
              neighborhoodEventState={neighborhoodEventState}
              isNeighborhoodSaleLive={isNeighborhoodSaleLive}
              approvedRequests={approvedRequests}
              visibleParticipatingHomes={visibleParticipatingHomes}
              pendingRequests={pendingRequests}
              removedRequests={removedRequests}
              approvedHomesCount={approvedHomesCount}
              availableSpots={availableSpots}
              canManageNeighborhoodSale={canManageNeighborhoodSale}
              parentSale={parentSale}
              listingId={listingId}
              inviteText={inviteText}
              onRespondToJoinRequest={(args) => respondToJoinRequestMutation.mutate(args)}
              onReport={(ctx) => { setReportContext(ctx); setShowReport(true); }}
            />

            {isAdminViewer && ["yard_sale", "neighborhood_sale"].includes(listing.listingType) && (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                <ResidentialBillingList
                  transactions={listingBillingTransactions}
                  listings={[listing]}
                  isLoading={isLoadingListingBilling}
                  variant="billing"
                  emptyMessage="No PaymentTransaction records are linked to this listing yet."
                />
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                onClick={() => safeBack(navigate, createPageUrl("Home"))}
                variant="outline"
                className="flex-1 rounded-full"
              >
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
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

      <GuestAuthModal open={showModal} onClose={() => setShowModal(false)} />
      </div>
    </div>
  );
}
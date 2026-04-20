import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPageUrl, safeBack } from "@/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MapPin, Calendar, AlertTriangle, Map, Copy, Share2, Tag } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import ReportModal from "../components/ReportModal";
import PromotionModal from "../components/admin/promotions/PromotionModal";
import { useAppMode } from "../components/shared/DemoMode";
import { useGuestGuard } from "@/hooks/useGuestGuard";
import GuestAuthModal from "@/components/guest/GuestAuthModal";
import {
  calculateNeighborhoodSalePrice,
  getNeighborhoodPricingSummary,
  NEIGHBORHOOD_MAX_HOMES,
  NEIGHBORHOOD_MIN_HOMES,
} from "@/lib/neighborhoodSalePricing";
import { getStateAbbreviation } from "@/lib/listingLocation";
import { getListingNumber, getOwnerDisplayName } from "@/components/listing/listingDisplay";
import { deriveNeighborhoodEventState, normalizeNeighborhoodJoinStatus } from "@/lib/neighborhoodSaleState";
import { formatEventTierLabel } from "@/lib/eventListingConfig";
import { formatMarqueeSlotTime, normalizeMarqueeSlots } from "@/lib/marqueeSchedule";
import NeighborhoodSalePreviewMap from "@/components/neighborhood/NeighborhoodSalePreviewMap";
import {
  getFeaturedItems,
  getFormattedDescription,
  getHookLine,
  getTrustSignal,
  getUrgencyText,
} from "@/components/listing/listingDetailContent";

export default function ListingDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [listingId, setListingId] = useState(null);
  const [user, setUser] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [reportContext, setReportContext] = useState(null);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [shareFallbackOpen, setShareFallbackOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  
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
  const approvedRequests = joinRequests?.filter(r => r.status === "approved" && r.removed_by_eo !== true) || [];
  const removedRequests = joinRequests?.filter(r => r.removed_by_eo === true) || [];
  const isOwner = !!user && user.id === listing?.ownerUserId;
  const isAcceptedCoHost = !!user && listing?.listingType === "neighborhood_sale" && listing?.co_host_user_id === user.id && listing?.co_host_status === "accepted";
  const canManageNeighborhoodSale = isOwner || isAcceptedCoHost;
  const approvedHomesCount = 1 + approvedRequests.length;
  const availableSpots = Math.max(0, 25 - approvedHomesCount);
  const formatAddress = (item) => {
    const base = [item.address_text || item.addressText || "Address unavailable", item.city, getStateAbbreviation(item.state)].filter(Boolean).join(", ");
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
  const shareText = [shareTitle, listing.event_description || listing.description, listingUrl].filter(Boolean).join("\n\n");

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(listingUrl);
    toast.success("Link copied");
  };

  const handleShare = async () => {
    if (!navigator.share) {
      setShareFallbackOpen(true);
      return;
    }

    try {
      await navigator.share({
        title: shareTitle,
        text: listing.event_description || listing.description || undefined,
        url: listingUrl,
      });
    } catch (error) {
      if (error?.name === "NotAllowedError" || error?.name === "AbortError") {
        setShareFallbackOpen(true);
        return;
      }
      throw error;
    }
  };

  const handleCopyForApp = async (appName) => {
    await navigator.clipboard.writeText(shareText);
    toast.success(`${appName} text copied`);
  };

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(inviteText).then(() => {
      toast.success("Invite copied");
    });
  };

  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    
    if (isLeftSwipe && selectedImageIndex < listingImages.length - 1) {
      setSelectedImageIndex(prev => prev + 1);
    }
    if (isRightSwipe && selectedImageIndex > 0) {
      setSelectedImageIndex(prev => prev - 1);
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  const handlePhotoClick = (e) => {
    if (listingImages.length <= 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 2) {
      setSelectedImageIndex(prev => prev > 0 ? prev - 1 : prev);
    } else {
      setSelectedImageIndex(prev => (prev + 1) % listingImages.length);
    }
  };

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
              {(user || isGuest) && user?.id !== listing.ownerUserId && (
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
                <div className="space-y-4">
                  <div 
                    className="relative overflow-hidden rounded-[1.75rem] bg-slate-100 shadow-[0_12px_40px_rgba(15,23,42,0.16)] cursor-pointer select-none touch-pan-y"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onClick={handlePhotoClick}
                  >
                    <img
                      src={mainImage}
                      alt={shareTitle}
                      className="w-full max-h-[420px] sm:max-h-[480px] object-cover transition-opacity duration-300"
                      draggable="false"
                      key={mainImage}
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    {listingImages.length > 1 && (
                      <div className="absolute bottom-4 right-4 bg-black/60 text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-md pointer-events-none">
                        {selectedImageIndex + 1} / {listingImages.length}
                      </div>
                    )}
                  </div>
                  {listingImages.length > 1 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                      {listingImages.map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedImageIndex(idx)}
                          className={`overflow-hidden rounded-2xl bg-slate-100 shadow-sm transition-all ${selectedImageIndex === idx ? "ring-2 ring-slate-900 ring-offset-2 ring-offset-white" : "opacity-85 hover:opacity-100"}`}
                        >
                          <img
                            src={url}
                            alt={`Listing image ${idx + 1}`}
                            className="h-24 sm:h-28 w-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-5">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`${tierColors[listing.event_tier || listing.tier] || "bg-slate-500"} rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white shadow-lg shadow-slate-900/10`}>
                      {listing.listingType === "event" ? formatEventTierLabel(listing.event_tier || listing.tier) : listing.tier === "neighborhood_tier" ? "Neighborhood Sale" : listing.tier.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-slate-500">Listing #{getListingNumber(listing)}</span>
                  </div>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-950 break-words leading-[0.95]">
                    {listing.event_name || listing.title}
                  </h1>
                  <p className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                    {hookLine}
                  </p>
                  <p className="text-xs text-slate-500">
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

                <div className="rounded-3xl bg-slate-50/90 p-4 sm:p-5 shadow-sm space-y-3">
                  <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-sm text-slate-700">
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      <span className="font-medium truncate">{listing.city}{getStateAbbreviation(listing.state) ? `, ${getStateAbbreviation(listing.state)}` : ""}</span>
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <Calendar className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      <span className="font-medium truncate">{format(new Date(listing.startDateTime), "MMM d")} - {format(new Date(listing.endDateTime), "MMM d")}</span>
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <Tag className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      <span className="font-medium truncate">{(listing.categories?.length > 0 ? listing.categories[0] : listing.event_category || listing.category) || "General"}</span>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm">
                      {urgencyText.starts}
                    </div>
                    <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 shadow-sm border border-amber-100">
                      {urgencyText.ends}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Featured Items</h3>
                    <span className="text-xs text-slate-400">Parsed from listing details</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {featuredItems.map((item, idx) => (
                      <Badge key={idx} variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700">
                        • {item}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm font-medium text-slate-600">{trustSignal}</p>
                </div>

                {formattedDescription.length > 0 && (
                  <div className="space-y-2">
                    {formattedDescription.map((line, index) => (
                      <p key={index} className={`text-slate-700 leading-relaxed ${index === 0 ? "text-base sm:text-lg font-semibold text-slate-900" : "text-base"}`}>
                        {line}
                      </p>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <DropdownMenu open={shareFallbackOpen} onOpenChange={setShareFallbackOpen}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          onClick={handleShare}
                          className="flex-1 gap-2 rounded-full bg-slate-900 text-white hover:bg-slate-800 h-12 sm:h-13 text-base font-semibold shadow-lg"
                        >
                          <Share2 className="w-4 h-4" />
                          Share Listing
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="center" className="w-56 rounded-xl">
                        <DropdownMenuItem onClick={handleCopyLink}>Copy Link</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(listingUrl)}`, "_blank")}>Facebook</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { handleCopyForApp("Instagram"); toast.success("Link copied for Instagram"); }}>Instagram</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { handleCopyForApp("Snapchat"); toast.success("Link copied for Snapchat"); }}>Snapchat</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { handleCopyForApp("TikTok"); toast.success("Link copied for TikTok"); }}>TikTok</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      onClick={() => navigate(createPageUrl("Home") + `?listingId=${listing.id}`)}
                      disabled={!listing.lat || !listing.lng}
                      variant="outline"
                      className="flex-1 gap-2 rounded-full h-12 border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      <Map className="w-4 h-4" />
                      Show on Map
                    </Button>
                  </div>
                  <p className="px-1 text-sm text-slate-500">Share your sale to bring more people</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-3xl bg-slate-50 p-4 shadow-sm">
                    <div className="flex items-start gap-3 text-slate-700">
                      <Calendar className="w-5 h-5 mt-0.5 text-slate-500" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date</p>
                        <p className="text-sm font-medium text-slate-900">{format(new Date(listing.startDateTime), "PPp")}</p>
                        <p className="text-sm text-slate-600">Ends {format(new Date(listing.endDateTime), "PPp")}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl bg-slate-50 p-4 shadow-sm">
                    <div className="flex items-start gap-3 text-slate-700">
                      <Tag className="w-5 h-5 mt-0.5 text-slate-500" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {(listing.categories?.length > 0 ? listing.categories : [listing.event_category || listing.category]).filter(Boolean).map((cat, idx) => (
                            <Badge key={idx} variant="outline" className="rounded-full border-slate-200 bg-white px-3 py-1 text-slate-700 shadow-sm">
                              {cat}
                            </Badge>
                          ))}
                          {listing.collectible_type && (
                            <Badge variant="outline" className="rounded-full border-slate-200 bg-white px-3 py-1 text-slate-700 shadow-sm">
                              {listing.collectible_type}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl bg-slate-50 p-4 shadow-sm sm:col-span-2 lg:col-span-1">
                    <div className="flex items-start gap-3 text-slate-700">
                      <MapPin className="w-5 h-5 mt-0.5 text-slate-500" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Location</p>
                        <p className="text-sm font-medium text-slate-900">{listing.city}{getStateAbbreviation(listing.state) ? `, ${getStateAbbreviation(listing.state)}` : ""}</p>
                        <p className="text-sm text-slate-600 break-words">{listing.address_text || listing.addressText || "Address unavailable"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-900">Details</h3>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Full Address</p>
                  <p className="text-sm text-slate-700 break-words">{eventAddress}</p>
                </div>
                {(listing.event_description || listing.description) && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Description</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{listing.event_description || listing.description}</p>
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

            {listing.listingType === "neighborhood_sale" && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-emerald-900 mb-2">Neighborhood Sale</h3>
                    <p className="text-sm text-emerald-800">
                      {listing.homeCount} homes participating • Span: {listing.spanFeet} ft
                    </p>
                    {listing.co_host_user_id && (
                      <p className="text-sm text-emerald-800 mt-1">
                        Co-host status: <span className="font-medium capitalize">{listing.co_host_status || "pending"}</span>
                      </p>
                    )}
                  </div>
                  <Button size="sm" variant="outline" className="gap-2 border-emerald-300 text-emerald-800 hover:bg-emerald-100" onClick={handleCopyInvite}>
                    <Copy className="w-4 h-4" />
                    Copy Invite
                  </Button>
                </div>

                <div className="bg-white/70 border border-emerald-200 rounded-lg p-3 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-1">Main Event Address</p>
                  <p className="text-sm text-emerald-950 font-medium">{eventAddress}</p>
                  <NeighborhoodSalePreviewMap lat={listing.event_center_lat} lng={listing.event_center_lng} />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
                      Homes Joined: {approvedHomesCount} / 25
                    </div>
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
                      {availableSpots === 0 ? "Neighborhood Sale is full" : `Available Spots: ${availableSpots} left`}
                    </div>
                  </div>
                </div>

                {canManageNeighborhoodSale && salePricing && (
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
                      <p className="text-sm text-emerald-800">
                        <strong>Committed:</strong> Your sale has reached {NEIGHBORHOOD_MIN_HOMES} homes. Cancelling now will trigger an immediate charge. Otherwise, your card on file will be charged exactly 24 hours before start time.
                      </p>
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
                            {(canManageNeighborhoodSale || user?.isAdmin) && (
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
                {canManageNeighborhoodSale && pendingRequests.length > 0 && (
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
                {canManageNeighborhoodSale && approvedRequests.length > 0 && (
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
                {canManageNeighborhoodSale && removedRequests.length > 0 && (
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
  );
}
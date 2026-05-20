import React, { useEffect, useMemo, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Map, Trash2, X, ChevronDown, ChevronUp, Search, Send, MoreHorizontal, Shield, UserX } from "lucide-react";
import { format } from "date-fns";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { normalizeNeighborhoodJoinStatus, getNeighborhoodCreationLeadTimeError, shouldShowListingOnMainMap, isNeighborhoodVisibleOnMap } from "@/lib/neighborhoodSaleState";
import { Input } from "@/components/ui/input";
import EventIconManager from "@/components/events/EventIconManager";
import MarqueeSlotsEditor from "@/components/create/event/MarqueeSlotsEditor";
import ImageCropEditor from "@/components/admin/ImageCropEditor";
import EditListingPhotos from "@/components/listing/EditListingPhotos";
import EditParticipantSaleTime from "@/components/listing/EditParticipantSaleTime";
import ListingUpgradeDialog from "@/components/listing/ListingUpgradeDialog";
import { canSelfServeUpgrade } from "@/lib/listingUpgradeConfig";
import { getDefaultEventIconForCategory, EVENT_BASIC_ICON_LIBRARY, getEventIconEmoji } from "@/lib/eventListingConfig";
import { getUserDisplayName } from "@/lib/userIdentity";
import { getPhotoLimitByTier } from "@/components/shared/listingTierEngine";
import { getStateAbbreviation } from "@/lib/listingLocation";
import YardSaleGuideModal from "@/components/guide/YardSaleGuideModal";

const RELIST_STORAGE_KEY = "yardit_relist_prefill_v1";

export default function MyListingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [user, setUser] = useState(null);

  // (Tabs) "active" | "pending" | "past" | "billing" | "hunt"
  const [tab, setTab] = useState("active");

  const [showGuideModal, setShowGuideModal] = useState(false);

  // (Edit Listing modal state)
  const [editingListing, setEditingListing] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategories, setEditCategories] = useState([]);
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editEventIcon, setEditEventIcon] = useState("");
  const [editEventLogoUrl, setEditEventLogoUrl] = useState("");
  const [editPhotoUrls, setEditPhotoUrls] = useState([]);
  const [editMarqueeSlots, setEditMarqueeSlots] = useState([]);
  const [editEventStartDate, setEditEventStartDate] = useState("");
  const [editEventEndDate, setEditEventEndDate] = useState("");
  const [editEventStartTime, setEditEventStartTime] = useState("");
  const [editEventEndTime, setEditEventEndTime] = useState("");
  const [editMarqueeFlyerUrl, setEditMarqueeFlyerUrl] = useState("");
  const [editMarqueeBackgroundUrl, setEditMarqueeBackgroundUrl] = useState("");
  const [isUploadingFlyer, setIsUploadingFlyer] = useState(false);
  const [isUploadingBackground, setIsUploadingBackground] = useState(false);
  const [cropEditorOpen, setCropEditorOpen] = useState(false);
  const [backgroundImageForCrop, setBackgroundImageForCrop] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [upgradeListing, setUpgradeListing] = useState(null);
  const [coHostSearchQuery, setCoHostSearchQuery] = useState("");
  const [selectedCoHostUserId, setSelectedCoHostUserId] = useState("");
  const [isSendingCoHostInvite, setIsSendingCoHostInvite] = useState(false);
  const [isUpdatingCoHost, setIsUpdatingCoHost] = useState(false);

  const refreshEditingListing = useCallback(async (listingId) => {
    const latestListing = await base44.entities.Listing.get(listingId);
    setEditingListing(latestListing);
    return latestListing;
  }, []);

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
    queryFn: async () => {
      const owned = await base44.entities.Listing.filter({ ownerUserId: user.id }, "-created_date");
      const coHosted = await base44.entities.Listing.filter({ co_host_user_id: user.id }, "-created_date");
      const merged = [...owned, ...coHosted.filter((listing) => listing.co_host_status === "accepted")];
      const seen = new Set();
      return merged.filter((listing) => {
        if (seen.has(listing.id)) return false;
        seen.add(listing.id);
        return true;
      });
    },
    enabled: !!user,
    initialData: [],
  });


  const { data: searchableUsers = [] } = useQuery({
    queryKey: ["coHostUserSearch", editingListing?.id],
    queryFn: () => base44.entities.User.list(),
    enabled: !!editingListing && editingListing.listingType === "neighborhood_sale",
    initialData: [],
  });

  const { data: coHostInvites = [] } = useQuery({
    queryKey: ["coHostInvites", editingListing?.id, user?.id],
    queryFn: () => base44.entities.NeighborhoodCoHostInvite.filter({ organizer_user_id: user?.id }, "-created_date"),
    enabled: !!editingListing?.id && !!user?.id && editingListing?.listingType === "neighborhood_sale",
    initialData: [],
  });

  const listingCoHostInvites = useMemo(() => {
    if (!editingListing?.id) return [];
    return coHostInvites.filter((invite) => invite.related_listing_id === editingListing.id);
  }, [coHostInvites, editingListing?.id]);

  const latestInviteForAttachedCoHost = useMemo(() => {
    if (!editingListing?.co_host_user_id) return null;
    return listingCoHostInvites.find((invite) => invite.host_user_id === editingListing.co_host_user_id) || null;
  }, [listingCoHostInvites, editingListing?.co_host_user_id]);

  const pendingInviteRows = useMemo(() => {
    return listingCoHostInvites
      .filter((invite) => invite.status === "pending")
      .map((invite) => ({
        id: invite.id,
        inviteId: invite.id,
        userId: invite.host_user_id,
        status: "pending",
        name: invite.host_name || "Invited co-host",
        email: invite.host_email || "",
        created_date: invite.created_date,
      }));
  }, [listingCoHostInvites]);

  const activeCoHostRows = useMemo(() => {
    if (!editingListing?.co_host_user_id || editingListing?.co_host_status !== "active") return [];
    return [{
      id: editingListing.co_host_user_id,
      inviteId: latestInviteForAttachedCoHost?.id || null,
      userId: editingListing.co_host_user_id,
      status: "active",
      name: latestInviteForAttachedCoHost?.host_name || "Co-host",
      email: latestInviteForAttachedCoHost?.host_email || "",
    }];
  }, [editingListing?.co_host_user_id, editingListing?.co_host_status, latestInviteForAttachedCoHost]);

  const suspendedCoHostRows = useMemo(() => {
    if (!editingListing?.co_host_user_id || editingListing?.co_host_status !== "suspended") return [];
    return [{
      id: editingListing.co_host_user_id,
      inviteId: latestInviteForAttachedCoHost?.id || null,
      userId: editingListing.co_host_user_id,
      status: "suspended",
      name: latestInviteForAttachedCoHost?.host_name || "Co-host",
      email: latestInviteForAttachedCoHost?.host_email || "",
    }];
  }, [editingListing?.co_host_user_id, editingListing?.co_host_status, latestInviteForAttachedCoHost]);

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
    const st = getStateAbbreviation(listing?.state || "XX");
    const zp = (listing?.zip || "0000").slice(-4).padStart(4, "0");
    const idSuffix = (listing?.id || "00000").slice(-5).toLowerCase();
    return `${st}${zp}-${idSuffix}`;
  };

  // RULE 1: Past = terminated, regardless of dates
  const isPastListing = (listing) => {
    const status = listing?.status || "";
    return (
      status === "expired" ||
      status === "completed" ||
      status === "closed" ||
      status === "cancelled" ||
      status === "canceled" ||
      status === "removed" ||
      status === "denied" ||
      status === "rejected" ||
      status === "suspended"
    );
  };

  // RULE 2: Active = currently visible on the map (reuses map logic)
  const isActiveListing = (listing) => {
    if (isPastListing(listing)) return false;
    const now = new Date();
    if (listing?.listingType === "neighborhood_sale") {
      return isNeighborhoodVisibleOnMap(listing, now);
    }
    // For yard sales and events, reuse the exact same map visibility check
    return shouldShowListingOnMainMap(listing, now);
  };

  // RULE 3: Pending = not past, not active yet
  const isPendingListing = (listing) => {
    return !isEffectivelyPastListing(listing) && !isActiveListing(listing);
  };


  const canCancelListingDirectly = (listing) => {
    return [
      "active",
      "activated_locked",
      "payment_pending",
      "scheduled",
      "ready_for_payment",
      "payment_pending_adjustment",
      "under_review",
      "collecting_participants",
    ].includes(listing?.status);
  };

  const normalizedListings = useMemo(() => {
    return listings.map((listing) => ({
      ...listing,
      displayStatus: getListingDisplayStatus(listing),
    }));
  }, [listings]);

  const isEffectivelyPastListing = (listing) => {
    return isPastListing(listing) || listing?.displayStatus === "expired";
  };

  const activeListings = useMemo(() => normalizedListings.filter((l) => isActiveListing(l)), [normalizedListings]);
  const pendingListings = useMemo(() => normalizedListings.filter((l) => isPendingListing(l)), [normalizedListings]);
  const pastListings = useMemo(() => normalizedListings.filter((l) => isEffectivelyPastListing(l)), [normalizedListings]);

  const filteredCoHostUsers = useMemo(() => {
    if (!editingListing || editingListing.listingType !== "neighborhood_sale") return [];
    const query = coHostSearchQuery.trim().toLowerCase();
    if (!query) return [];

    const matchConfigs = [
      { key: "name", label: "Name", getValue: (candidate) => `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim() || candidate.email || "" },
      { key: "phone", label: "Phone Number", getValue: (candidate) => candidate.phone || "" },
      { key: "address", label: "Address", getValue: (candidate) => [candidate.street_address, candidate.city, getStateAbbreviation(candidate.state), candidate.zip_code].filter(Boolean).join(", ") },
      { key: "user_id", label: "User ID", getValue: (candidate) => candidate.id || "" },
      { key: "email", label: "Email", getValue: (candidate) => candidate.email || "" },
    ];

    const getPriority = (key) => {
      if (key === "name") return 5;
      if (key === "phone") return 4;
      if (key === "email") return 3;
      if (key === "address") return 2;
      return 1;
    };

    return searchableUsers
      .map((candidate) => {
        if (!candidate?.id || candidate.id === user?.id) return null;

        const matches = matchConfigs
          .map((config) => {
            const value = String(config.getValue(candidate) || "").trim();
            if (!value) return null;
            const normalizedValue = value.toLowerCase();
            if (!normalizedValue.includes(query)) return null;
            return {
              key: config.key,
              label: config.label,
              value,
              exact: normalizedValue === query,
              startsWith: normalizedValue.startsWith(query),
              priority: getPriority(config.key),
            };
          })
          .filter(Boolean)
          .sort((a, b) => {
            if (a.exact !== b.exact) return a.exact ? -1 : 1;
            if (a.startsWith !== b.startsWith) return a.startsWith ? -1 : 1;
            return b.priority - a.priority;
          });

        if (!matches.length) return null;

        return {
          ...candidate,
          matchedField: matches[0],
        };
      })
      .filter(Boolean)
      .slice(0, 8);
  }, [searchableUsers, coHostSearchQuery, editingListing, user?.id]);

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
          if (l.listingType === "neighborhood_sale") {
            await base44.functions.invoke("syncNeighborhoodDeadlineJobs", {
              data: { ...l, status: "expired" },
              event: { type: "update", entity_id: l.id }
            }).catch(console.error);
          }
          const notif = await base44.entities.Notification.create({
            user_id: user?.id,
            userId: user?.id,
            type: "listing_expired",
            title: "Listing Expired",
            message: `Your listing "${l.title}" has expired.`,
            related_entity_type: "listing",
            related_entity_id: l.id,
            is_read: false,
            read: false,
          });
          console.log("Created Notification:", {
            user_id: notif.user_id || notif.userId,
            type: notif.type,
            title: notif.title,
            message: notif.message,
            related_entity_type: notif.related_entity_type,
            related_entity_id: notif.related_entity_id,
            created_at: notif.created_date
          });
        } catch (e) {}
      }
      if (toUpdate.length > 0) {
        queryClient.invalidateQueries({ queryKey: ["myListings", user?.id] });
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      }
    };
    cleanup();
  }, [listings, user, queryClient]);

  const shownListings = tab === "past" ? pastListings : tab === "pending" ? pendingListings : activeListings;

  const openEditDescription = async (listing) => {
   setIconPickerOpen(false);
   const latestListing = await refreshEditingListing(listing.id);
   setEditTitle(latestListing?.title || latestListing?.event_name || "");
   setEditDescription(latestListing?.description || latestListing?.event_description || "");
   setEditCategories(latestListing?.categories?.length > 0 ? latestListing.categories : (latestListing?.category ? [latestListing.category] : []));
   setEditEventIcon(latestListing?.event_icon || getDefaultEventIconForCategory(latestListing?.event_category || latestListing?.category));
   setEditEventLogoUrl(latestListing?.event_logo_url || "");
   setEditPhotoUrls(latestListing?.listingType === "event" ? (latestListing?.event_photos || latestListing?.photoUrls || []) : (latestListing?.photoUrls || []));
   setEditMarqueeSlots(Array.isArray(latestListing?.marquee_schedule_slots) ? latestListing.marquee_schedule_slots : []);
   const flyerUrl = latestListing?.marquee_flyer_url || "";
   setEditMarqueeFlyerUrl(flyerUrl);
   const bgUrl = latestListing?.marquee_background_url || "";
   setEditMarqueeBackgroundUrl(bgUrl);

    if (latestListing?.listingType === "event" && (latestListing?.event_tier || latestListing?.tier) === "marquee") {
      const start = latestListing.startDateTime ? new Date(latestListing.startDateTime) : null;
      const end = latestListing.endDateTime ? new Date(latestListing.endDateTime) : null;
      setEditEventStartDate(start ? start.toISOString().slice(0, 10) : "");
      setEditEventEndDate(end ? end.toISOString().slice(0, 10) : "");
      setEditEventStartTime(start ? start.toTimeString().slice(0, 5) : "");
      setEditEventEndTime(end ? end.toTimeString().slice(0, 5) : "");
    } else {
      setEditEventStartDate("");
      setEditEventEndDate("");
      setEditEventStartTime("");
      setEditEventEndTime("");
    }

    if (latestListing?.listingType === "neighborhood_sale") {
      const nsStart = latestListing.startDateTime ? new Date(latestListing.startDateTime) : null;
      const nsEnd = latestListing.endDateTime ? new Date(latestListing.endDateTime) : null;
      setEditStartDate(latestListing.selectedRangeStartDate || (nsStart ? nsStart.toISOString().slice(0, 10) : ""));
      setEditEndDate(latestListing.selectedRangeEndDate || (nsEnd ? nsEnd.toISOString().slice(0, 10) : ""));
      setEditStartTime(nsStart ? nsStart.toTimeString().slice(0, 5) : "08:00");
      setEditEndTime(nsEnd ? nsEnd.toTimeString().slice(0, 5) : "14:00");
      setSelectedCoHostUserId(latestListing.co_host_user_id || "");
    } else if (
      latestListing?.listingType === "yard_sale" &&
      latestListing?.neighborhood_sale_id &&
      ["pending", "approved"].includes(normalizeNeighborhoodJoinStatus(latestListing?.neighborhood_join_status))
    ) {
      // Participant yard_sale listing — allow editing sale time within the NS window
      const pStart = latestListing.startDateTime ? new Date(latestListing.startDateTime) : null;
      const pEnd = latestListing.endDateTime ? new Date(latestListing.endDateTime) : null;
      setEditStartDate(latestListing.selectedRangeStartDate || (pStart ? pStart.toISOString().slice(0, 10) : ""));
      setEditEndDate(latestListing.selectedRangeEndDate || (pEnd ? pEnd.toISOString().slice(0, 10) : ""));
      setEditStartTime(pStart ? pStart.toTimeString().slice(0, 5) : "08:00");
      setEditEndTime(pEnd ? pEnd.toTimeString().slice(0, 5) : "14:00");
    } else {
      setEditStartDate("");
      setEditEndDate("");
      setEditStartTime("");
      setEditEndTime("");
    }
  };

  const closeEditDescription = () => {
    setEditingListing(null);
    setEditTitle("");
    setEditDescription("");
    setEditCategories([]);
    setEditStartDate("");
    setEditEndDate("");
    setEditStartTime("");
    setEditEndTime("");
    setEditEventIcon("");
    setEditEventLogoUrl("");
    setEditPhotoUrls([]);
    setEditMarqueeSlots([]);
    setEditEventStartDate("");
    setEditEventEndDate("");
    setEditEventStartTime("");
    setEditEventEndTime("");
    setEditMarqueeFlyerUrl("");
    setEditMarqueeBackgroundUrl("");
    setCoHostSearchQuery("");
    setSelectedCoHostUserId("");
  };

  const sendCoHostInvite = async () => {
    if (!editingListing || editingListing.listingType !== "neighborhood_sale" || !selectedCoHostUserId) return;

    const selectedUser = searchableUsers.find((candidate) => candidate.id === selectedCoHostUserId);
    if (!selectedUser) {
      toast.error("Select a user first");
      return;
    }

    setIsSendingCoHostInvite(true);
    try {
      const duplicateInvite = listingCoHostInvites.find((invite) => invite.host_user_id === selectedUser.id && ["pending", "accepted", "active", "suspended"].includes(invite.status));
      const duplicateLiveCoHost = editingListing.co_host_user_id === selectedUser.id && ["active", "suspended"].includes(editingListing.co_host_status);

      if (duplicateInvite || duplicateLiveCoHost) {
        toast.error("That co-host already has an active or pending relationship on this listing");
        return;
      }

      const reusableInvite = listingCoHostInvites.find((invite) => invite.host_user_id === selectedUser.id && ["declined", "removed"].includes(invite.status));

      let inviteRecord = reusableInvite;
      if (reusableInvite) {
        inviteRecord = await base44.entities.NeighborhoodCoHostInvite.update(reusableInvite.id, {
          host_user_id: selectedUser.id,
          host_email: selectedUser.email,
          host_name: getUserDisplayName(selectedUser),
          status: "pending",
          related_listing_id: editingListing.id,
          event_title: editingListing.title,
        });
      } else {
        inviteRecord = await base44.entities.NeighborhoodCoHostInvite.create({
          organizer_user_id: user?.id,
          organizer_email: user?.email,
          organizer_name: getUserDisplayName(user) || user?.email || "",
          event_title: editingListing.title,
          address_key: `listing|${editingListing.id}|${selectedUser.id}`,
          street_address: editingListing.display_address || editingListing.addressText || editingListing.host_addressText || "Unknown",
          city: editingListing.city || editingListing.host_city || "Unknown",
          state: getStateAbbreviation(editingListing.state || editingListing.host_state || "XX"),
          zip_code: editingListing.zip || editingListing.host_zip || "00000",
          host_user_id: selectedUser.id,
          host_email: selectedUser.email,
          host_name: getUserDisplayName(selectedUser),
          status: "pending",
          related_listing_id: editingListing.id,
        });
      }

      await base44.entities.Notification.create({
        userId: selectedUser.id,
        user_id: selectedUser.id,
        user_email: selectedUser.email,
        title: "Neighborhood Sale Co-Host Invite",
        message: `${getUserDisplayName(user) || "A Yardit user"} invited you to co-host \"${editingListing.title}\".`,
        type: "co_host_invite",
        related_entity_type: "NeighborhoodCoHostInvite",
        related_entity_id: inviteRecord.id,
        read: false,
        is_read: false,
        metadata: {
          invite_id: inviteRecord.id,
          sale_listing_id: editingListing.id,
          event_title: editingListing.title,
          inviter_user_id: user?.id,
          inviter_name: getUserDisplayName(user) || user?.email || "",
          invite_type: "co_host",
          invited_user_id: selectedUser.id,
        },
      });

      toast.success("Co-host invite sent");
      await queryClient.invalidateQueries({ queryKey: ["myListings", user?.id] });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["coHostInvites", editingListing.id] });
      await refreshEditingListing(editingListing.id);
      setSelectedCoHostUserId(selectedUser.id);
    } catch (error) {
      toast.error("Could not send invite");
    } finally {
      setIsSendingCoHostInvite(false);
    }
  };

  const updateCoHostDetails = async (updates, successMessage) => {
    if (!editingListing) return;
    setIsUpdatingCoHost(true);
    try {
      await base44.entities.Listing.update(editingListing.id, updates);
      toast.success(successMessage);
      await queryClient.invalidateQueries({ queryKey: ["myListings", user?.id] });
      await refreshEditingListing(editingListing.id);
    } catch (error) {
      toast.error("Could not update co-host");
    } finally {
      setIsUpdatingCoHost(false);
    }
  };

  const handleCancelInvite = async (inviteId) => {
    if (inviteId) {
      await base44.entities.NeighborhoodCoHostInvite.update(inviteId, { status: "removed" });
    }
    await queryClient.invalidateQueries({ queryKey: ["coHostInvites", editingListing.id, user?.id] });
    await refreshEditingListing(editingListing.id);
    toast.success("Co-host invite canceled");
  };

  const handleResendInvite = async (row) => {
    setIsUpdatingCoHost(true);
    try {
      await base44.entities.Notification.create({
        userId: row.userId,
        user_id: row.userId,
        user_email: row.email,
        title: "Neighborhood Sale Co-Host Invite",
        message: `${getUserDisplayName(user) || "A Yardit user"} invited you to co-host "${editingListing?.title}".`,
        type: "co_host_invite",
        related_entity_type: "NeighborhoodCoHostInvite",
        related_entity_id: row.inviteId,
        read: false,
        is_read: false,
        metadata: {
          invite_id: row.inviteId,
          sale_listing_id: editingListing?.id,
          event_title: editingListing?.title,
          inviter_user_id: user?.id,
          inviter_name: getUserDisplayName(user) || user?.email || "",
          invite_type: "co_host",
          invited_user_id: row.userId,
        },
      });
      toast.success("Co-host invite resent");
    } catch (e) {
      toast.error("Could not resend invite");
    } finally {
      setIsUpdatingCoHost(false);
    }
  };

  const handleSuspendCoHost = async (inviteId) => {
    if (inviteId) {
      await base44.entities.NeighborhoodCoHostInvite.update(inviteId, { status: "accepted" });
    }
    await updateCoHostDetails(
      {
        co_host_status: "suspended",
        cohost_invite_status: null,
      },
      "Co-host suspended"
    );
    await queryClient.invalidateQueries({ queryKey: ["coHostInvites", editingListing.id, user?.id] });
  };

  const handleReactivateCoHost = async (inviteId) => {
    if (inviteId) {
      await base44.entities.NeighborhoodCoHostInvite.update(inviteId, { status: "accepted" });
    }
    await updateCoHostDetails(
      {
        co_host_status: "active",
        cohost_invite_status: null,
      },
      "Co-host re-activated"
    );
    await queryClient.invalidateQueries({ queryKey: ["coHostInvites", editingListing.id, user?.id] });
  };

  const handleRemoveCoHost = async (inviteId) => {
    if (inviteId) {
      await base44.entities.NeighborhoodCoHostInvite.update(inviteId, { status: "removed" });
    }
    await updateCoHostDetails(
      {
        co_host_user_id: null,
        co_host_status: null,
        cohost_invite_status: null,
        co_host_permissions: null,
      },
      "Co-host removed"
    );
    await queryClient.invalidateQueries({ queryKey: ["coHostInvites", editingListing.id, user?.id] });
  };

  const saveDescription = async () => {
    if (!editingListing) return;

    if (editingListing.listingType === "yard_sale" && editCategories.length === 0) {
      toast.error("Please select at least 1 category");
      return;
    }

    if (editingListing.listingType === "event") {
      const tier = editingListing.event_tier || editingListing.tier || "basic";
      if (["basic", "featured"].includes(tier) && !editEventIcon) {
        toast.error("Please choose an event icon");
        return;
      }
      if (tier === "premium" && !editEventIcon && !editEventLogoUrl) {
        toast.error("Please choose an event icon or upload a logo/image");
        return;
      }
    }

    let dateChanged = false;
    const updateData = {
      title: editTitle,
      description: editDescription,
    };

    if (editingListing.listingType === "event") {
      updateData.event_name = editTitle;
      updateData.event_description = editDescription;
    }

    if (editingListing.listingType === "yard_sale") {
      updateData.categories = editCategories;
      updateData.category = editCategories[0] || "";
      updateData.photoUrls = editPhotoUrls;
    }

    if (editingListing.listingType === "event") {
      updateData.photoUrls = editPhotoUrls;
      updateData.event_photos = editPhotoUrls;

      updateData.event_icon = editEventIcon || getDefaultEventIconForCategory(editingListing.event_category || editingListing.category);
      updateData.event_logo_url = editEventLogoUrl || "";
      if ((editingListing.event_tier || editingListing.tier) === "marquee") {
        updateData.marquee_schedule_slots = editMarqueeSlots;
        updateData.marquee_flyer_url = editMarqueeFlyerUrl;
        updateData.marquee_background_url = editMarqueeBackgroundUrl;

        // Update start/end datetimes if provided
        if (editEventStartDate && editEventStartTime) {
          updateData.startDateTime = new Date(`${editEventStartDate}T${editEventStartTime}`).toISOString();
          updateData.start_datetime = updateData.startDateTime;
        }
        if (editEventEndDate && editEventEndTime) {
          updateData.endDateTime = new Date(`${editEventEndDate}T${editEventEndTime}`).toISOString();
          updateData.end_datetime = updateData.endDateTime;
        }
      }
    }

    if (editingListing.listingType === "neighborhood_sale") {
      const oldStartStr = editingListing.selectedRangeStartDate || (editingListing.startDateTime ? new Date(editingListing.startDateTime).toISOString().split("T")[0] : "");
      const oldEndStr = editingListing.selectedRangeEndDate || (editingListing.endDateTime ? new Date(editingListing.endDateTime).toISOString().split("T")[0] : "");
      const oldStartTime = editingListing.startDateTime ? new Date(editingListing.startDateTime).toTimeString().slice(0, 5) : "";
      const oldEndTime = editingListing.endDateTime ? new Date(editingListing.endDateTime).toTimeString().slice(0, 5) : "";

      const startDateChanged = editStartDate && editStartDate !== oldStartStr;
      const endDateChanged = editEndDate && editEndDate !== oldEndStr;
      const startTimeChanged = editStartTime && editStartTime !== oldStartTime;
      const endTimeChanged = editEndTime && editEndTime !== oldEndTime;

      if (startDateChanged || endDateChanged || startTimeChanged || endTimeChanged) {
        if (startDateChanged) {
          const leadTimeError = getNeighborhoodCreationLeadTimeError(editStartDate);
          if (leadTimeError) {
            toast.error(leadTimeError);
            return;
          }
        }

        const newStartDate = editStartDate || oldStartStr;
        const newEndDate = editEndDate || oldEndStr;
        const newStartTime = editStartTime || oldStartTime || "08:00";
        const newEndTime = editEndTime || oldEndTime || "14:00";

        if (newEndDate < newStartDate) {
          toast.error("End date cannot be before start date.");
          return;
        }

        updateData.startDateTime = `${newStartDate}T${newStartTime}:00`;
        updateData.endDateTime = `${newEndDate}T${newEndTime}:00`;
        updateData.selectedRangeStartDate = newStartDate;
        updateData.selectedRangeEndDate = newEndDate;

        dateChanged = true;
      }
    }

    // Participant yard_sale listing — allow editing sale time within the NS window
    const isParticipantYardSale =
      editingListing.listingType === "yard_sale" &&
      editingListing.neighborhood_sale_id &&
      ["pending", "approved"].includes(normalizeNeighborhoodJoinStatus(editingListing.neighborhood_join_status));

    if (isParticipantYardSale && (editStartDate || editStartTime || editEndDate || editEndTime)) {
      const oldStartStr = editingListing.selectedRangeStartDate || editingListing.startDateTime?.slice(0, 10) || "";
      const oldEndStr = editingListing.selectedRangeEndDate || editingListing.endDateTime?.slice(0, 10) || "";
      const oldStartTime = editingListing.startDateTime ? new Date(editingListing.startDateTime).toTimeString().slice(0, 5) : "08:00";
      const oldEndTime = editingListing.endDateTime ? new Date(editingListing.endDateTime).toTimeString().slice(0, 5) : "14:00";

      const newStartDate = editStartDate || oldStartStr;
      const newEndDate = editEndDate || oldEndStr;
      const newStartTime = editStartTime || oldStartTime;
      const newEndTime = editEndTime || oldEndTime;

      // Validate end is after start
      const newStart = new Date(`${newStartDate}T${newStartTime}`);
      const newEnd = new Date(`${newEndDate}T${newEndTime}`);
      if (newEnd <= newStart) {
        toast.error("End time must be after start time.");
        return;
      }

      // Validate that the new dates overlap the Neighborhood Sale
      const nsStart = editingListing.neighborhood_sale_id;
      // Fetch the parent sale to validate overlap
      let parentSale = null;
      try {
        const results = await base44.entities.Listing.filter({ id: editingListing.neighborhood_sale_id });
        parentSale = results[0] || null;
      } catch (_) {}

      if (parentSale) {
        const nsStartDate = parentSale.selectedRangeStartDate || parentSale.startDateTime?.slice(0, 10);
        const nsEndDate = parentSale.selectedRangeEndDate || parentSale.endDateTime?.slice(0, 10);
        if (!nsStartDate || !nsEndDate || newStartDate > nsEndDate || newEndDate < nsStartDate) {
          toast.error(`Your sale dates must overlap the Neighborhood Sale window (${nsStartDate} – ${nsEndDate}).`);
          return;
        }
      }

      updateData.startDateTime = new Date(`${newStartDate}T${newStartTime}`).toISOString();
      updateData.endDateTime = new Date(`${newEndDate}T${newEndTime}`).toISOString();
      updateData.selectedRangeStartDate = newStartDate;
      updateData.selectedRangeEndDate = newEndDate;
    }

    setIsSaving(true);
    try {
      await base44.entities.Listing.update(editingListing.id, updateData);

      if (dateChanged) {
        await base44.functions.invoke("syncNeighborhoodDeadlineJobs", {
          data: { ...editingListing, ...updateData },
          event: { type: "update", entity_id: editingListing.id }
        }).catch(console.error);
      }

      toast.success("Listing updated");
      closeEditDescription();
      await queryClient.invalidateQueries({ queryKey: ["myListings", user?.id] });
    } catch (e) {
      toast.error("Could not update listing");
    } finally {
      setIsSaving(false);
    }
  };

  const relist = (listing) => {
    const isEvent = listing.listingType === "event";

    const basePayload = {
      relistFromId: listing.id,
      listingType: listing.listingType || "yard_sale",
    };

    if (isEvent) {
      // Event relist: prefill all event fields across steps 1, 2, 3
      basePayload.relistPrefill = {
        listingType: "event",

        // Step 1 — Event Details
        event_name: listing.event_name || listing.title || "",
        event_description: listing.event_description || listing.description || "",
        event_category: listing.event_category || listing.category || "",
        event_icon: listing.event_icon || "",
        event_photos: listing.event_photos || listing.photoUrls || [],

        // Step 2 — Event Location
        display_address: listing.display_address || listing.address_text || listing.addressText || "",
        geocoded_address: listing.geocoded_address || "",
        location_source: listing.location_source || "search",
        address_text: listing.display_address || listing.address_text || listing.addressText || "",
        addressText: listing.display_address || listing.address_text || listing.addressText || "",
        city: listing.city || "",
        state: getStateAbbreviation(listing.state || ""),
        zip: listing.zip || "",
        lat: listing.lat ?? null,
        lng: listing.lng ?? null,

        // Step 3 — Schedule (cleared so user picks new dates)
        event_start_date: "",
        event_end_date: "",
        event_start_time: "",
        event_end_time: "",
        start_datetime: "",
        end_datetime: "",
        startDateTime: "",
        endDateTime: "",

        // Step 4 — Tier: preselect original tier (marquee stays marquee)
        event_tier: listing.event_tier || listing.tier || "basic",

        // Marquee extras
        marquee_schedule_slots: listing.marquee_schedule_slots || [],
        marquee_flyer_url: listing.marquee_flyer_url || "",
        marquee_background_url: listing.marquee_background_url || "",
        event_logo_url: listing.event_logo_url || "",
      };
    } else {
      // Yard sale / neighborhood sale relist
      basePayload.relistPrefill = {
        listingType: listing.listingType || "yard_sale",
        title: listing.title || "",
        description: listing.description || "",
        display_address: listing.display_address || listing.addressText || listing.street_address || listing.street || "",
        geocoded_address: listing.geocoded_address || "",
        location_source: listing.location_source || "search",
        addressText: listing.display_address || listing.addressText || listing.street_address || listing.street || "",
        city: listing.city || "",
        state: getStateAbbreviation(listing.state || ""),
        zip: listing.zip || listing.zip_code || "",
        lat: listing.lat ?? listing.latitude ?? null,
        lng: listing.lng ?? listing.longitude ?? null,
        tier: listing.tier || "free",
      };
    }

    try {
      localStorage.setItem(RELIST_STORAGE_KEY, JSON.stringify(basePayload));
    } catch (e) {
      // ignore
    }

    if (isEvent) {
      // Event relist: go to step 1 so the user flows through event steps naturally
      navigate(createPageUrl("CreateListing") + "?relist=1&eventRelist=1");
    } else {
      navigate(createPageUrl("CreateListing") + "?relist=1");
    }
  };

  const cancelListing = async (listing) => {
    if (listing.listingType !== "neighborhood_sale" && listing.neighborhood_join_status === "approved" && listing.neighborhood_sale_id) {
      try {
        const parentSales = await base44.entities.Listing.filter({ id: listing.neighborhood_sale_id });
        const parentSale = parentSales[0];
        if (parentSale && ["activated_locked", "coming_soon", "active"].includes(parentSale.event_state)) {
          toast.error("You cannot cancel your listing because the Neighborhood Sale is locked. Contact support if there is an emergency.");
          return;
        }
      } catch (e) {}
    }

    const isActive = listing.status === "active" || listing.status === "activated_locked";
    const isCommittedNeighborhoodSale = listing.listingType === "neighborhood_sale" && (listing.homeCount >= 5) && !listing.pricePaid;

    let message = `Cancel this ${isActive ? 'active ' : ''}listing?`;
    if (listing.pricePaid > 0) {
      message = `Cancel this ${isActive ? 'active ' : ''}listing? Any eligible refund will be handled through the normal process.`;
    } else if (isCommittedNeighborhoodSale) {
      message = `WARNING: Your Neighborhood Sale is COMMITTED (5+ homes). Cancelling now will trigger an immediate non-refundable charge for the event. Are you sure you want to cancel?`;
    }
      
    const ok = window.confirm(message);
    if (!ok) return;

    try {
      if (listing.listingType === "neighborhood_sale") {
        await base44.functions.invoke("cancelNeighborhoodSale", {
          saleListingId: listing.id,
          reason: isActive ? "owner_cancelled_active" : "owner_cancelled_before_activation",
          finalState: "canceled",
          deleteSale: false,
        });
      } else {
        await base44.entities.Listing.update(listing.id, {
          status: "cancelled",
          statusReason: isActive ? "Canceled by owner" : "Canceled by owner before activation",
        });

        // Clean up any JoinRequests tied to this participant listing
        if (listing.neighborhood_sale_id || listing.neighborhood_join_status !== "none") {
          try {
            const reqs = await base44.entities.JoinRequest.filter({ listingId: listing.id });
            for (const req of reqs) {
              await base44.entities.JoinRequest.update(req.id, {
                removed_by_listing_owner: true,
                removed_at: new Date().toISOString(),
                removal_reason: "listing_canceled",
                status: "canceled",
              });
            }
            // Dismiss any pending join-request notifications for this listing
            const notifs = await base44.entities.Notification.filter({ user_id: listing.ownerUserId });
            for (const n of notifs) {
              if (n.metadata?.requester_listing_id === listing.id) {
                await base44.entities.Notification.delete(n.id);
              }
            }
          } catch (cleanupErr) {
            console.error("JoinRequest cleanup error on cancel", cleanupErr);
          }
        }
      }

      toast.success("Listing canceled");
      await queryClient.invalidateQueries({ queryKey: ["myListings", user?.id] });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch (e) {
      toast.error("Could not cancel listing");
    }
  };

  const deleteListing = async (listing) => {
    const ok = window.confirm("Delete this listing? This cannot be undone.");
    if (!ok) return;

    try {
      if (listing.listingType !== "neighborhood_sale") {
        await base44.entities.Listing.delete(listing.id);
      }

      // Cleanup JoinRequests and Notifications
      try {
        // Mark any JoinRequests for this listing as canceled (not hard-deleted, for audit trail)
        const requesterReqs = await base44.entities.JoinRequest.filter({ listingId: listing.id });
        for (const req of requesterReqs) {
          await base44.entities.JoinRequest.update(req.id, {
            removed_by_listing_owner: true,
            removed_at: new Date().toISOString(),
            removal_reason: "listing_deleted",
            status: "canceled",
          });
        }

        if (listing.listingType === "neighborhood_sale") {
          await base44.functions.invoke("cancelNeighborhoodSale", {
            saleListingId: listing.id,
            reason: "event_deleted",
            finalState: "canceled",
            deleteSale: true,
          });
        }

        // Delete notifications tied to this listing
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
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch (e) {
      toast.error("Could not delete listing");
    }
  };

  // ---- Render Guards ----
  if (!user) {
    return (
      <div className="min-h-[calc(100vh-140px)] flex items-center justify-center bg-gradient-to-br from-orange-50 via-purple-50 to-pink-50">
        <p className="text-gray-600">Loading listings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-140px)] p-4 md:p-8 bg-gradient-to-br from-orange-50 via-purple-50 to-pink-50">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                <Map className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">My Listings</h1>
                <p className="text-gray-600">Manage your active, pending, and past Yardit listings</p>
              </div>
            </div>

            <Button
              onClick={() => navigate(createPageUrl("CreateListing"))}
              className="bg-[#F4A849] hover:bg-[#E39635] text-[#2C4F4E] border-2 border-[#2C4F4E] font-semibold w-full sm:w-auto"
            >
              Create New Listing
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap mb-6 rounded-xl border bg-white/70 p-2 shadow-sm max-w-4xl">
          <Button
            variant={tab === "active" ? "default" : "outline"}
            onClick={() => setTab("active")}
          >
            Active ({activeListings.length})
          </Button>

          <Button
            variant={tab === "pending" ? "default" : "outline"}
            onClick={() => setTab("pending")}
            className={tab !== "pending" ? "border-yellow-400 text-yellow-700 hover:bg-yellow-50" : ""}
          >
            Pending ({pendingListings.length})
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

        </div>

        {/* Tabs Content */}
        {tab === "billing" ? (
          <Card className="rounded-xl border bg-white/80 shadow">
            <CardContent className="p-8">
              <h2 className="text-xl font-semibold mb-2">Billing / Payments</h2>
              <p className="text-slate-600">
                Coming soon. (This will show receipts and payment history per listing.)
              </p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <Card className="rounded-xl border bg-white/80 shadow">
            <CardContent className="p-12 text-center">
              <p className="text-slate-500">Loading listings...</p>
            </CardContent>
          </Card>
        ) : shownListings.length === 0 ? (
          <Card className="rounded-xl border bg-white/80 shadow">
            <CardContent className="p-12 text-center">
              <p className="text-slate-500 mb-4">
                {tab === "past"
                  ? "No past listings yet"
                  : tab === "pending"
                  ? "No pending or scheduled listings"
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
              <Card key={listing.id} className="rounded-xl border bg-white/85 shadow hover:shadow-lg transition-shadow">
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
                        <Badge variant="outline" className="bg-white text-slate-700 border-slate-300">
                          {listing.listingType === "event" ? "Event" : listing.listingType === "yard_sale" ? "Yard Sale" : listing.listingType === "neighborhood_sale" ? "Neighborhood Sale" : "Listing"}
                        </Badge>
                        {listing.co_host_user_id === user?.id && listing.co_host_status === "active" && (
                          <Badge className="bg-indigo-600 text-white hover:bg-indigo-700 border-none">
                            Co-Host
                          </Badge>
                        )}
                        {/* (plain english) Requester listing badges for neighborhood join status */}
                        {normalizeNeighborhoodJoinStatus(listing.neighborhood_join_status) === "pending" && (
                          <Badge className="bg-yellow-500 text-yellow-950 hover:bg-yellow-600 border-none">Pending Neighborhood Approval</Badge>
                        )}
                        {normalizeNeighborhoodJoinStatus(listing.neighborhood_join_status) === "approved" && (
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

                    <div className="grid grid-cols-2 sm:flex gap-2 sm:flex-wrap sm:justify-end bg-white/60 rounded-xl p-2 border border-gray-100">
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

                      {listing.ownerUserId === user?.id && (
                        <Button
                          size="sm"
                          onClick={() => openEditDescription(listing)}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Edit Listing
                        </Button>
                      )}

                      <Button
                        size="sm"
                        onClick={() => relist(listing)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        Relist
                      </Button>

                      {canSelfServeUpgrade(listing) && (
                        <Button
                          size="sm"
                          onClick={() => setUpgradeListing(listing)}
                          className="bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          Upgrade
                        </Button>
                      )}

                      {canCancelListingDirectly(listing) ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => cancelListing(listing)}
                          className="gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Cancel Listing
                        </Button>
                      ) : isActiveListing(listing) ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(createPageUrl("ContactSupport"))}
                          className="gap-1"
                        >
                          Need Help? Contact Support
                        </Button>
                      ) : isEffectivelyPastListing(listing) ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteListing(listing)}
                          className="gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-gray-600 mb-4 whitespace-pre-wrap">
                    {listing.description || "(No description)"}
                  </p>

                  {/* Address + Dates */}
                  <div className="grid md:grid-cols-2 gap-4 text-sm rounded-xl bg-orange-50/60 border border-orange-100 p-4">
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

                  {listing.listingType === "yard_sale" && (
                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-center sm:justify-start">
                      <button 
                        type="button" 
                        onClick={() => setShowGuideModal(true)} 
                        className="text-sm text-teal-600 font-medium hover:text-teal-800 underline underline-offset-2 transition-colors"
                      >
                        Want more traffic? View Success Guide
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <YardSaleGuideModal open={showGuideModal} onOpenChange={setShowGuideModal} />

      {/* (Edit Listing popup) */}
      <Dialog open={!!editingListing} onOpenChange={(open) => !open && closeEditDescription()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Listing</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {editingListing?.listingType === "neighborhood_sale" && (
              <>
                <div>
                  <Label className="text-[#2C4F4E] mb-2 block">Title</Label>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Neighborhood Sale Title..."
                    className="bg-[#F3E6CF] border-[#2C4F4E]"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-[#2C4F4E] font-semibold block">Event Date &amp; Time</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-slate-500 mb-1 block">Start Date</Label>
                      <Input
                        type="date"
                        min={new Date().toISOString().split("T")[0]}
                        value={editStartDate}
                        onChange={(e) => setEditStartDate(e.target.value)}
                        className="bg-[#F3E6CF] border-[#2C4F4E]"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500 mb-1 block">Start Time</Label>
                      <Input
                        type="time"
                        value={editStartTime}
                        onChange={(e) => setEditStartTime(e.target.value)}
                        className="bg-[#F3E6CF] border-[#2C4F4E]"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500 mb-1 block">End Date</Label>
                      <Input
                        type="date"
                        min={editStartDate || new Date().toISOString().split("T")[0]}
                        value={editEndDate}
                        onChange={(e) => setEditEndDate(e.target.value)}
                        className="bg-[#F3E6CF] border-[#2C4F4E]"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500 mb-1 block">End Time</Label>
                      <Input
                        type="time"
                        value={editEndTime}
                        onChange={(e) => setEditEndTime(e.target.value)}
                        className="bg-[#F3E6CF] border-[#2C4F4E]"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">Changing the start date must be at least 7 days in the future. Time changes take effect immediately for all participants.</p>
                </div>

                <div className="rounded-lg border border-slate-200 p-4 space-y-3">
                  <div>
                    <Label className="text-[#2C4F4E] mb-2 block">Add Co-Host</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        value={coHostSearchQuery}
                        onChange={(e) => setCoHostSearchQuery(e.target.value)}
                        placeholder="Search Co-Host by name, email, phone, address, city, or user ID"
                        className="pl-9"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Search existing Yardit users only.</p>
                  </div>

                  {filteredCoHostUsers.length > 0 && (
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {filteredCoHostUsers.map((candidate) => {
                        const displayName = getUserDisplayName(candidate);
                        const isSelected = selectedCoHostUserId === candidate.id;
                        const matchedValue = candidate.matchedField?.value || "";
                        const supportingAddress = [candidate.street_address, candidate.city, candidate.state, candidate.zip_code].filter(Boolean).join(", ");
                        return (
                          <button
                            key={candidate.id}
                            type="button"
                            onClick={() => setSelectedCoHostUserId(candidate.id)}
                            className={`w-full rounded-md border p-3 text-left transition ${isSelected ? "border-blue-600 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}
                          >
                            <div className="font-medium text-slate-900">{displayName}</div>
                            <div className="text-xs font-medium text-slate-500 mt-1">Matched by: {candidate.matchedField.label}</div>
                            <div className="text-xs text-slate-600 mt-1 space-y-1">
                              {matchedValue && <p>{matchedValue}</p>}
                              {supportingAddress && candidate.matchedField.key !== "address" && <p>{supportingAddress}</p>}
                              {candidate.phone && candidate.matchedField.key !== "phone" && <p>{candidate.phone}</p>}
                              {candidate.email && candidate.matchedField.key !== "email" && matchedValue !== candidate.email && <p>{candidate.email}</p>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {coHostSearchQuery.trim() && filteredCoHostUsers.length === 0 && (
                    <p className="text-sm text-slate-500">No users found.</p>
                  )}

                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Co-Host Management</p>
                      <p className="text-xs text-slate-500">Manage pending invites, active co-hosts, and suspended co-hosts.</p>
                    </div>

                    {pendingInviteRows.length === 0 && activeCoHostRows.length === 0 && suspendedCoHostRows.length === 0 ? (
                      <p className="text-sm text-slate-500">No co-hosts or invites yet.</p>
                    ) : (
                      <div className="space-y-4">
                        {pendingInviteRows.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pending Invites</p>
                            {pendingInviteRows.map((row) => (
                              <div key={row.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-slate-800 truncate">{row.name}</p>
                                  <p className="text-xs text-slate-500 truncate">{row.email || "No email available"}</p>
                                  {row.created_date && <p className="text-[10px] text-slate-400 mt-0.5">Sent: {format(new Date(row.created_date), "MMM d, yyyy")}</p>}
                                  <Badge variant="outline" className="mt-2 capitalize bg-amber-100 text-amber-800 border-amber-200">Pending</Badge>
                                </div>
                                <DropdownMenu modal={false}>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      disabled={isUpdatingCoHost}
                                      onPointerDown={(e) => e.stopPropagation()}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="end"
                                    side="bottom"
                                    sideOffset={8}
                                    collisionPadding={12}
                                    onCloseAutoFocus={(e) => e.preventDefault()}
                                    className="z-[2000]"
                                  >
                                    <DropdownMenuItem
                                      onSelect={(e) => {
                                        e.preventDefault();
                                        handleResendInvite(row);
                                      }}
                                    >
                                      <Send className="w-4 h-4" />
                                      Resend Invite
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onSelect={(e) => {
                                        e.preventDefault();
                                        handleCancelInvite(row.inviteId);
                                      }}
                                    >
                                      <UserX className="w-4 h-4" />
                                      Cancel Invite
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            ))}
                          </div>
                        )}

                        {activeCoHostRows.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active Co-Hosts</p>
                            {activeCoHostRows.map((row) => (
                              <div key={row.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-slate-800 truncate">{row.name}</p>
                                  <p className="text-xs text-slate-500 truncate">{row.email || "No email available"}</p>
                                  <Badge variant="outline" className="mt-2 capitalize bg-green-100 text-green-800 border-green-200">Active</Badge>
                                </div>
                                <DropdownMenu modal={false}>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      disabled={isUpdatingCoHost}
                                      onPointerDown={(e) => e.stopPropagation()}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="end"
                                    side="bottom"
                                    sideOffset={8}
                                    collisionPadding={12}
                                    onCloseAutoFocus={(e) => e.preventDefault()}
                                    className="z-[2000]"
                                  >
                                    <DropdownMenuItem
                                      onSelect={(e) => {
                                        e.preventDefault();
                                        handleSuspendCoHost(row.inviteId);
                                      }}
                                    >
                                      <Shield className="w-4 h-4" />
                                      Suspend Co-Host
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onSelect={(e) => {
                                        e.preventDefault();
                                        handleRemoveCoHost(row.inviteId);
                                      }}
                                    >
                                      <UserX className="w-4 h-4" />
                                      Remove Co-Host
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            ))}
                          </div>
                        )}

                        {suspendedCoHostRows.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Suspended Co-Hosts</p>
                            {suspendedCoHostRows.map((row) => (
                              <div key={row.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-slate-800 truncate">{row.name}</p>
                                  <p className="text-xs text-slate-500 truncate">{row.email || "No email available"}</p>
                                  <Badge variant="outline" className="mt-2 capitalize bg-red-100 text-red-800 border-red-200">Suspended</Badge>
                                </div>
                                <DropdownMenu modal={false}>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      disabled={isUpdatingCoHost}
                                      onPointerDown={(e) => e.stopPropagation()}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="end"
                                    side="bottom"
                                    sideOffset={8}
                                    collisionPadding={12}
                                    onCloseAutoFocus={(e) => e.preventDefault()}
                                    className="z-[2000]"
                                  >
                                    <DropdownMenuItem
                                      onSelect={(e) => {
                                        e.preventDefault();
                                        handleReactivateCoHost(row.inviteId);
                                      }}
                                    >
                                      <Shield className="w-4 h-4" />
                                      Re-Activate Co-Host
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onSelect={(e) => {
                                        e.preventDefault();
                                        handleRemoveCoHost(row.inviteId);
                                      }}
                                    >
                                      <UserX className="w-4 h-4" />
                                      Remove Co-Host
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={sendCoHostInvite}
                      disabled={!selectedCoHostUserId || isSendingCoHostInvite || isUpdatingCoHost}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {isSendingCoHostInvite ? "Sending..." : "Send Invite"}
                    </Button>
                  </div>
                </div>
              </>
            )}

            {editingListing?.listingType === "yard_sale" && (
              <div className="space-y-4">
                <div>
                  <Label className="text-[#2C4F4E] mb-2 block">Title</Label>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Yard Sale Title..."
                    className="bg-[#F3E6CF] border-[#2C4F4E]"
                  />
                </div>
                <div>
                  <Label className="text-[#2C4F4E] mb-2 block">Categories (Up to 10) *</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                {editCategories.map((cat, i) => (
                   <Badge key={i} className="flex items-center gap-1 bg-[#5DADA5] py-1.5 px-3 text-sm rounded-full">
                      {cat} 
                      <X className="w-3 h-3 cursor-pointer" onClick={() => {
                        setEditCategories(prev => prev.filter((_, idx) => idx !== i));
                      }} />
                   </Badge>
                ))}
              </div>
              {editCategories.length < 10 && (
                <Select
                  value=""
                  onValueChange={(value) => {
                    if (editCategories.includes(value)) return;
                    setEditCategories(prev => [...prev, value]);
                  }}
                >
                  <SelectTrigger className="border-[#2C4F4E] mt-3">
                    <SelectValue placeholder="Add Category +" />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "Household Items", "Furniture", "Clothing & Accessories",
                      "Electronics", "Tools & Hardware", "Toys & Games",
                      "Baby & Kids", "Outdoor & Garden", "Sports Equipment",
                      "Collectibles", "Antiques & Vintage", "Vehicles & Auto Parts",
                      "Free Items", "Food / Baked Goods", "Miscellaneous"
                    ].filter(cat => !editCategories.includes(cat)).map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              </div>
            </div>
            )}

            {editingListing?.listingType === "event" && (
              <div className="space-y-4">
                <div>
                  <Label className="text-[#2C4F4E] mb-2 block">Event Title *</Label>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Event title..."
                    className="bg-[#F3E6CF] border-[#2C4F4E]"
                  />
                </div>

                {/* Collapsible Event Icon Section */}
                {(() => {
                  const tier = editingListing?.event_tier || editingListing?.tier || "basic";
                  const isBasic = tier === "basic";
                  const iconLabel = isBasic
                    ? (EVENT_BASIC_ICON_LIBRARY.find(i => i.key === editEventIcon)?.label || editEventIcon || "None selected")
                    : (editEventIcon ? editEventIcon.replace(/_/g, " ") : "None selected");
                  const iconEmoji = isBasic ? null : getEventIconEmoji(editEventIcon);
                  const previewImage = editEventLogoUrl;

                  return (
                    <div className="border border-[#2C4F4E]/20 rounded-xl overflow-hidden">
                      {/* Collapsed header row — always visible */}
                      <button
                        type="button"
                        onClick={() => setIconPickerOpen(o => !o)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-[#F3E6CF] hover:bg-[#EDD9B5] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-[#2C4F4E]">Event Icon</span>
                          <div className="flex items-center gap-2">
                            {previewImage ? (
                              <img src={previewImage} alt="icon" className="w-6 h-6 rounded-full object-cover border border-[#2C4F4E]/30" />
                            ) : iconEmoji ? (
                              <span className="text-lg leading-none">{iconEmoji}</span>
                            ) : editEventIcon ? (
                              <span className="w-5 h-5 flex items-center justify-center text-[#2C4F4E] opacity-70">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" stroke="#2C4F4E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
                                  <rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
                                </svg>
                              </span>
                            ) : null}
                            <span className="text-xs text-slate-500 capitalize">{iconLabel}</span>
                          </div>
                        </div>
                        {iconPickerOpen
                          ? <ChevronUp className="w-4 h-4 text-[#2C4F4E]" />
                          : <ChevronDown className="w-4 h-4 text-[#2C4F4E]" />
                        }
                      </button>

                      {/* Expanded picker */}
                      {iconPickerOpen && (
                        <div className="p-4 border-t border-[#2C4F4E]/10 bg-white">
                          <EventIconManager
                            tier={tier}
                            selectedIcon={editEventIcon}
                            setSelectedIcon={setEditEventIcon}
                            uploadedImageUrl={editEventLogoUrl}
                            setUploadedImageUrl={setEditEventLogoUrl}
                          />
                        </div>
                      )}
                    </div>
                  );
                })()}

                {(editingListing?.event_tier || editingListing?.tier) === "marquee" && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-[#2C4F4E] font-semibold block mb-2">Event Date &amp; Time</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-slate-500 mb-1 block">Start Date</Label>
                          <Input
                            type="date"
                            value={editEventStartDate}
                            onChange={(e) => setEditEventStartDate(e.target.value)}
                            className="bg-[#F3E6CF] border-[#2C4F4E]"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500 mb-1 block">Start Time</Label>
                          <Input
                            type="time"
                            value={editEventStartTime}
                            onChange={(e) => setEditEventStartTime(e.target.value)}
                            className="bg-[#F3E6CF] border-[#2C4F4E]"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500 mb-1 block">End Date</Label>
                          <Input
                            type="date"
                            value={editEventEndDate}
                            min={editEventStartDate || undefined}
                            onChange={(e) => setEditEventEndDate(e.target.value)}
                            className="bg-[#F3E6CF] border-[#2C4F4E]"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500 mb-1 block">End Time</Label>
                          <Input
                            type="time"
                            value={editEventEndTime}
                            onChange={(e) => setEditEventEndTime(e.target.value)}
                            className="bg-[#F3E6CF] border-[#2C4F4E]"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="text-[#2C4F4E] font-semibold block mb-2">Flyer</Label>
                      {editMarqueeFlyerUrl ? (
                        <div className="space-y-2">
                          <div className="w-full max-w-xs border-2 border-[#2C4F4E] rounded-lg overflow-hidden">
                            <img src={editMarqueeFlyerUrl} alt="Flyer preview" className="w-full h-auto" />
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => setEditMarqueeFlyerUrl("")}
                          >
                            Delete Flyer
                          </Button>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-[#2C4F4E] rounded-lg p-4 text-center">
                          <input
                            type="file"
                            id="flyer-upload"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setIsUploadingFlyer(true);
                              try {
                                 const result = await base44.integrations.Core.UploadFile({ file });
                                 setEditMarqueeFlyerUrl(result.file_url);
                                 toast.success("Flyer uploaded - click Save to persist");
                               } catch (error) {
                                 console.error("Upload error:", error);
                                 toast.error("Failed to upload flyer");
                               } finally {
                                 setIsUploadingFlyer(false);
                               }
                            }}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="border-[#2C4F4E]"
                            disabled={isUploadingFlyer}
                            onClick={() => document.getElementById("flyer-upload")?.click()}
                          >
                            {isUploadingFlyer ? "Uploading..." : "Upload Flyer"}
                          </Button>
                          <p className="text-xs text-slate-500 mt-2">JPG, PNG (shown in listing details)</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label className="text-[#2C4F4E] font-semibold block mb-2">Background Image</Label>
                      {editMarqueeBackgroundUrl ? (
                        <div className="space-y-2">
                          <div className="w-full max-w-xs border-2 border-[#2C4F4E] rounded-lg overflow-hidden aspect-video">
                            <img src={editMarqueeBackgroundUrl} alt="Background preview" className="w-full h-full object-cover" />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setBackgroundImageForCrop(editMarqueeBackgroundUrl);
                                setCropEditorOpen(true);
                              }}
                            >
                              Crop & Zoom
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => setEditMarqueeBackgroundUrl("")}
                            >
                              Delete Background
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-[#2C4F4E] rounded-lg p-4 text-center">
                          <input
                            type="file"
                            id="background-upload"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setIsUploadingBackground(true);
                              try {
                                const result = await base44.integrations.Core.UploadFile({ file });
                                setBackgroundImageForCrop(result.file_url);
                                setCropEditorOpen(true);
                              } catch (error) {
                                toast.error("Failed to upload background");
                              } finally {
                                setIsUploadingBackground(false);
                              }
                            }}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="border-[#2C4F4E]"
                            disabled={isUploadingBackground}
                            onClick={() => document.getElementById("background-upload")?.click()}
                          >
                            {isUploadingBackground ? "Uploading..." : "Upload Background"}
                          </Button>
                          <p className="text-xs text-slate-500 mt-2">16:9 aspect ratio recommended (1920x1080 or larger)</p>
                          {backgroundImageForCrop && (
                            <Button
                              type="button"
                              variant="secondary"
                              className="w-full mt-2"
                              onClick={() => setCropEditorOpen(true)}
                            >
                              Crop & Zoom Image
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    <MarqueeSlotsEditor
                      value={editMarqueeSlots}
                      onChange={setEditMarqueeSlots}
                      eventStartDate={editEventStartDate || editingListing?.startDateTime?.slice(0, 10)}
                      eventEndDate={editEventEndDate || editingListing?.endDateTime?.slice(0, 10)}
                    />
                  </div>
                )}
              </div>
            )}

            <EditParticipantSaleTime
              listing={editingListing}
              startDate={editStartDate} setStartDate={setEditStartDate}
              startTime={editStartTime} setStartTime={setEditStartTime}
              endDate={editEndDate} setEndDate={setEditEndDate}
              endTime={editEndTime} setEndTime={setEditEndTime}
            />

            {editingListing?.listingType === "yard_sale" && (
              <EditListingPhotos
                label="Listing Photos"
                value={editPhotoUrls}
                onChange={setEditPhotoUrls}
                maxPhotos={getPhotoLimitByTier(editingListing?.tier)}
              />
            )}

            {editingListing?.listingType === "event" && ["featured", "premium", "marquee", "galactic_display", "galactic", "display"].includes(editingListing?.event_tier || editingListing?.tier) && (
              <EditListingPhotos
                label="Event Photos"
                value={editPhotoUrls}
                onChange={setEditPhotoUrls}
                maxPhotos={getPhotoLimitByTier(editingListing?.event_tier || editingListing?.tier)}
              />
            )}

            <div>
              <Label className="text-[#2C4F4E] mb-2 block">Description</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={5}
                placeholder="Update your description..."
              />
            </div>
          </div>

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

      {/* Image Crop Editor */}
      <ListingUpgradeDialog
        open={!!upgradeListing}
        onClose={() => setUpgradeListing(null)}
        listing={upgradeListing}
        user={user}
        onSuccess={() => {
          setUpgradeListing(null);
          queryClient.invalidateQueries({ queryKey: ["myListings", user?.id] });
          queryClient.invalidateQueries({ queryKey: ["listings"] });
        }}
      />

      <ImageCropEditor
        imageUrl={backgroundImageForCrop}
        open={cropEditorOpen}
        onClose={() => setCropEditorOpen(false)}
        onApply={async (file) => {
          try {
            const result = await base44.integrations.Core.UploadFile({ file });
            setEditMarqueeBackgroundUrl(result.file_url);
            if (editingListing?.id) {
              await base44.entities.Listing.update(editingListing.id, { marquee_background_url: result.file_url });
              await queryClient.invalidateQueries({ queryKey: ["myListings", user?.id] });
            }
            
            toast.success("Background image cropped and saved");
          } catch (error) {
            console.error("Upload error:", error);
            toast.error("Failed to save cropped image");
          }
        }}
        aspectRatio={16 / 9}
      />
    </div>
  );
}
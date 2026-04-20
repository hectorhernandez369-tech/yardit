import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Map, Trash2, X, ChevronDown, ChevronUp, Search, Send } from "lucide-react";
import { format } from "date-fns";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import MyCoinsPanel from "@/components/jth/MyCoinsPanel";
import ListingUpgradeDialog from "@/components/listing/ListingUpgradeDialog";
import { canSelfServeUpgrade } from "@/lib/listingUpgradeConfig";
import { getDefaultEventIconForCategory, EVENT_BASIC_ICON_LIBRARY, getEventIconEmoji } from "@/lib/eventListingConfig";

const RELIST_STORAGE_KEY = "yardit_relist_prefill_v1";

export default function MyListingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [user, setUser] = useState(null);

  // (Tabs) "active" | "pending" | "past" | "billing" | "hunt"
  const [tab, setTab] = useState("active");

  // (Edit Listing modal state)
  const [editingListing, setEditingListing] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategories, setEditCategories] = useState([]);
  const [editStartDate, setEditStartDate] = useState("");
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

  const { data: myCoinStats = null } = useQuery({
    queryKey: ["myListingsJthCoinStats", user?.id],
    queryFn: async () => {
      const rows = await base44.entities.JTHUserCoinStats.filter({ user_id: user.id });
      return rows[0] || null;
    },
    enabled: !!user?.id,
  });

  const { data: myCoinHistory = [] } = useQuery({
    queryKey: ["myListingsJthCoinHistory", user?.id],
    queryFn: () => base44.entities.JTHCoinEvent.filter({ collected_by_user_id: user.id }, "-collected_timestamp"),
    enabled: !!user?.id,
    initialData: [],
  });

  const { data: searchableUsers = [] } = useQuery({
    queryKey: ["coHostUserSearch", editingListing?.id],
    queryFn: () => base44.entities.User.list(),
    enabled: !!editingListing && editingListing.listingType === "neighborhood_sale",
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
      { key: "name", label: "Name", getValue: (candidate) => `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim() || candidate.full_name || "" },
      { key: "phone", label: "Phone Number", getValue: (candidate) => candidate.phone || "" },
      { key: "address", label: "Address", getValue: (candidate) => [candidate.address, candidate.city].filter(Boolean).join(", ") },
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

  const openEditDescription = (listing) => {
   setIconPickerOpen(false);
   setEditingListing(listing);
   setEditTitle(listing?.title || listing?.event_name || "");
   setEditDescription(listing?.description || listing?.event_description || "");
   setEditCategories(listing?.categories?.length > 0 ? listing.categories : (listing?.category ? [listing.category] : []));
   setEditEventIcon(listing?.event_icon || getDefaultEventIconForCategory(listing?.event_category || listing?.category));
   setEditEventLogoUrl(listing?.event_logo_url || "");
   setEditPhotoUrls(listing?.listingType === "event" ? (listing?.event_photos || listing?.photoUrls || []) : (listing?.photoUrls || []));
   setEditMarqueeSlots(Array.isArray(listing?.marquee_schedule_slots) ? listing.marquee_schedule_slots : []);
   const flyerUrl = listing?.marquee_flyer_url || "";
   setEditMarqueeFlyerUrl(flyerUrl);
   console.log("DEBUG: openEditDescription - marquee_flyer_url:", flyerUrl);
   const bgUrl = listing?.marquee_background_url || "";
   setEditMarqueeBackgroundUrl(bgUrl);
   console.log("DEBUG: openEditDescription - marquee_background_url:", bgUrl);

    // Marquee date/time prefill
    if (listing?.listingType === "event" && (listing?.event_tier || listing?.tier) === "marquee") {
      const start = listing.startDateTime ? new Date(listing.startDateTime) : null;
      const end = listing.endDateTime ? new Date(listing.endDateTime) : null;
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

    if (listing?.listingType === "neighborhood_sale") {
      setEditStartDate(listing.selectedRangeStartDate || (listing.startDateTime ? new Date(listing.startDateTime).toISOString().split("T")[0] : ""));
    } else {
      setEditStartDate("");
    }
  };

  const closeEditDescription = () => {
    setEditingListing(null);
    setEditTitle("");
    setEditDescription("");
    setEditCategories([]);
    setEditStartDate("");
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
      await base44.entities.Listing.update(editingListing.id, {
        co_host_user_id: selectedUser.id,
        co_host_status: "pending",
        cohost_invite_status: "pending",
      });

      await base44.entities.Notification.create({
        userId: selectedUser.id,
        user_id: selectedUser.id,
        user_email: selectedUser.email,
        title: "Neighborhood Sale Co-Host Invite",
        message: `${user?.full_name || [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "A Yardit user"} invited you to co-host \"${editingListing.title}\".`,
        type: "co_host_invite",
        related_entity_type: "listing",
        related_entity_id: editingListing.id,
        read: false,
        is_read: false,
        metadata: {
          sale_listing_id: editingListing.id,
          event_title: editingListing.title,
          inviter_user_id: user?.id,
          inviter_name: user?.full_name || [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.email || "",
          invite_type: "co_host",
          invited_user_id: selectedUser.id,
        },
      });

      toast.success("Co-host invite sent");
      setSelectedCoHostUserId(selectedUser.id);
      await queryClient.invalidateQueries({ queryKey: ["myListings", user?.id] });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch (error) {
      toast.error("Could not send invite");
    } finally {
      setIsSendingCoHostInvite(false);
    }
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

    if (editingListing.listingType === "neighborhood_sale" && editStartDate) {
      const oldStartStr = editingListing.selectedRangeStartDate || (editingListing.startDateTime ? new Date(editingListing.startDateTime).toISOString().split("T")[0] : "");
      if (oldStartStr !== editStartDate) {
        const leadTimeError = getNeighborhoodCreationLeadTimeError(editStartDate);
        if (leadTimeError) {
          toast.error(leadTimeError);
          return;
        }

        const newStart = new Date(editStartDate + "T00:00:00Z").toISOString();
        updateData.startDateTime = newStart;
        updateData.selectedRangeStartDate = editStartDate;

        // Ensure end date is not before start date
        if (editingListing.endDateTime && new Date(editingListing.endDateTime) < new Date(newStart)) {
          updateData.endDateTime = new Date(editStartDate + "T23:59:59Z").toISOString();
          updateData.selectedRangeEndDate = editStartDate;
        }

        dateChanged = true;
      }
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
        address_text: listing.address_text || listing.addressText || "",
        addressText: listing.address_text || listing.addressText || "",
        city: listing.city || "",
        state: listing.state || "",
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
        addressText: listing.addressText || listing.street_address || listing.street || "",
        city: listing.city || "",
        state: listing.state || "",
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

      // Notification Cleanup
      try {
        const requesterReqs = await base44.entities.JoinRequest.filter({ listingId: listing.id });
        for (const req of requesterReqs) {
          await base44.entities.JoinRequest.delete(req.id);
        }

        if (listing.listingType === "neighborhood_sale") {
          await base44.functions.invoke("cancelNeighborhoodSale", {
            saleListingId: listing.id,
            reason: "event_deleted",
            finalState: "canceled",
            deleteSale: true,
          });
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
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
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

          <Button
            variant={tab === "hunt" ? "default" : "outline"}
            onClick={() => setTab("hunt")}
            className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
          >
            My Hunt
          </Button>

          <Button
            variant={tab === "coins" ? "default" : "outline"}
            onClick={() => setTab("coins")}
            className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
          >
            My Coins
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
        ) : tab === "coins" ? (
          <MyCoinsPanel stats={myCoinStats} history={myCoinHistory} />
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
                        <Badge variant="outline" className="bg-white text-slate-700 border-slate-300">
                          {listing.listingType === "event" ? "Event" : listing.listingType === "yard_sale" ? "Yard Sale" : listing.listingType === "neighborhood_sale" ? "Neighborhood Sale" : "Listing"}
                        </Badge>
                        {listing.co_host_user_id === user?.id && listing.co_host_status === "accepted" && (
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
                  <Label className="text-[#2C4F4E] mb-2 block">Start Date</Label>
                  <Input
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="bg-[#F3E6CF] border-[#2C4F4E]"
                  />
                  <p className="text-xs text-slate-500 mt-1">Must be at least 7 days in the future. Changing this updates your event deadline rules and charge date.</p>
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
                        const fullName = `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim() || candidate.full_name || candidate.email || "Unnamed user";
                        const isSelected = selectedCoHostUserId === candidate.id;
                        const supportingAddress = [candidate.address, candidate.city].filter(Boolean).join(", ");
                        return (
                          <button
                            key={candidate.id}
                            type="button"
                            onClick={() => setSelectedCoHostUserId(candidate.id)}
                            className={`w-full rounded-md border p-3 text-left transition ${isSelected ? "border-blue-600 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}
                          >
                            <div className="font-medium text-slate-900">{fullName}</div>
                            <div className="text-xs font-medium text-slate-500 mt-1">Matched by: {candidate.matchedField.label}</div>
                            <div className="text-xs text-slate-600 mt-1 space-y-1">
                              <p>{candidate.matchedField.value}</p>
                              {candidate.matchedField.key !== "phone" && candidate.phone && <p>{candidate.phone}</p>}
                              {candidate.matchedField.key !== "email" && candidate.email && <p>{candidate.email}</p>}
                              {candidate.matchedField.key !== "address" && supportingAddress && <p>{supportingAddress}</p>}
                              <p>User ID: {candidate.id}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {coHostSearchQuery.trim() && filteredCoHostUsers.length === 0 && (
                    <p className="text-sm text-slate-500">No users found.</p>
                  )}

                  {editingListing.co_host_user_id && editingListing.co_host_status && (
                    <p className="text-sm text-slate-600">
                      Current co-host status: <span className="font-medium capitalize">{editingListing.co_host_status}</span>
                    </p>
                  )}

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={sendCoHostInvite}
                      disabled={!selectedCoHostUserId || isSendingCoHostInvite}
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
              <div>
                <Label className="text-[#2C4F4E]">Categories (Up to 10) *</Label>
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

            {editingListing?.listingType === "yard_sale" && (
              <EditListingPhotos
                label="Listing Photos"
                value={editPhotoUrls}
                onChange={setEditPhotoUrls}
                maxPhotos={3}
              />
            )}

            {editingListing?.listingType === "event" && ["featured", "premium", "marquee"].includes(editingListing?.event_tier || editingListing?.tier) && (
              <EditListingPhotos
                label="Event Photos"
                value={editPhotoUrls}
                onChange={setEditPhotoUrls}
                maxPhotos={3}
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
            console.log("DEBUG: onApply - uploading file...");
            const result = await base44.integrations.Core.UploadFile({ file });
            console.log("DEBUG: onApply - upload result:", result.file_url);
            
            setEditMarqueeBackgroundUrl(result.file_url);
            
            // Auto-save the background URL to the listing
            if (editingListing?.id) {
              console.log("DEBUG: onApply - saving to listing:", editingListing.id, result.file_url);
              await base44.entities.Listing.update(editingListing.id, {
                marquee_background_url: result.file_url
              });
              console.log("DEBUG: onApply - update complete, invalidating queries");
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
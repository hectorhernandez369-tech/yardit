import React, { useEffect, useMemo, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Map, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  formatListingDateRange, formatListingStatusLabel, formatListingTierLabel,
  getListingAddressLine, getListingDisplayStatus, statusColors, tierColors,
} from "@/components/listing/listingDisplay";
import { normalizeNeighborhoodJoinStatus, getNeighborhoodCreationLeadTimeError, shouldShowListingOnMainMap, isNeighborhoodVisibleOnMap } from "@/lib/neighborhoodSaleState";
import EditListingDialog from "@/components/listing/EditListingDialog";
import ListingUpgradeDialog from "@/components/listing/ListingUpgradeDialog";
import { canSelfServeUpgrade } from "@/lib/listingUpgradeConfig";
import { getDefaultEventIconForCategory } from "@/lib/eventListingConfig";
import { getUserDisplayName } from "@/lib/userIdentity";
import { getStateAbbreviation } from "@/lib/listingLocation";
import YardSaleGuideModal from "@/components/guide/YardSaleGuideModal";

const RELIST_STORAGE_KEY = "yardit_relist_prefill_v1";

export default function MyListingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("active");
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [upgradeListing, setUpgradeListing] = useState(null);

  // Edit listing state
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
  const [isSaving, setIsSaving] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
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
      try { setUser(await base44.auth.me()); }
      catch { navigate(createPageUrl("Home")); }
    };
    fetchUser();
  }, []);

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["myListings", user?.id],
    queryFn: async () => {
      const owned = await base44.entities.Listing.filter({ ownerUserId: user.id }, "-created_date");
      const coHosted = await base44.entities.Listing.filter({ co_host_user_id: user.id }, "-created_date");
      const merged = [...owned, ...coHosted.filter((l) => l.co_host_status === "accepted")];
      const seen = new Set();
      return merged.filter((listing) => {
        if (seen.has(listing.id)) return false;
        seen.add(listing.id);
        // Hide admin-assisted listings that are still unclaimed (owner_type still guest_assisted and not owned by current user)
        if (
          (listing.created_by_admin === true || listing.assisted_listing === true) &&
          listing.owner_type === "guest_assisted" &&
          listing.ownerUserId !== user.id
        ) {
          return false;
        }
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

  const pendingInviteRows = useMemo(() => listingCoHostInvites.filter((i) => i.status === "pending").map((invite) => ({
    id: invite.id, inviteId: invite.id, userId: invite.host_user_id, status: "pending",
    name: invite.host_name || "Invited co-host", email: invite.host_email || "", created_date: invite.created_date,
  })), [listingCoHostInvites]);

  const activeCoHostRows = useMemo(() => {
    if (!editingListing?.co_host_user_id || editingListing?.co_host_status !== "active") return [];
    return [{ id: editingListing.co_host_user_id, inviteId: latestInviteForAttachedCoHost?.id || null, userId: editingListing.co_host_user_id, status: "active", name: latestInviteForAttachedCoHost?.host_name || "Co-host", email: latestInviteForAttachedCoHost?.host_email || "" }];
  }, [editingListing?.co_host_user_id, editingListing?.co_host_status, latestInviteForAttachedCoHost]);

  const suspendedCoHostRows = useMemo(() => {
    if (!editingListing?.co_host_user_id || editingListing?.co_host_status !== "suspended") return [];
    return [{ id: editingListing.co_host_user_id, inviteId: latestInviteForAttachedCoHost?.id || null, userId: editingListing.co_host_user_id, status: "suspended", name: latestInviteForAttachedCoHost?.host_name || "Co-host", email: latestInviteForAttachedCoHost?.host_email || "" }];
  }, [editingListing?.co_host_user_id, editingListing?.co_host_status, latestInviteForAttachedCoHost]);

  const filteredCoHostUsers = useMemo(() => {
    if (!editingListing || editingListing.listingType !== "neighborhood_sale") return [];
    const query = coHostSearchQuery.trim().toLowerCase();
    if (!query) return [];
    const matchConfigs = [
      { key: "name", label: "Name", getValue: (c) => `${c.first_name || ""} ${c.last_name || ""}`.trim() || c.email || "" },
      { key: "phone", label: "Phone Number", getValue: (c) => c.phone || "" },
      { key: "address", label: "Address", getValue: (c) => [c.street_address, c.city, getStateAbbreviation(c.state), c.zip_code].filter(Boolean).join(", ") },
      { key: "user_id", label: "User ID", getValue: (c) => c.id || "" },
      { key: "email", label: "Email", getValue: (c) => c.email || "" },
    ];
    const getPriority = (key) => ({ name: 5, phone: 4, email: 3, address: 2 }[key] || 1);
    return searchableUsers.map((candidate) => {
      if (!candidate?.id || candidate.id === user?.id) return null;
      const matches = matchConfigs.map((config) => {
        const value = String(config.getValue(candidate) || "").trim();
        if (!value) return null;
        const normalizedValue = value.toLowerCase();
        if (!normalizedValue.includes(query)) return null;
        return { key: config.key, label: config.label, value, exact: normalizedValue === query, startsWith: normalizedValue.startsWith(query), priority: getPriority(config.key) };
      }).filter(Boolean).sort((a, b) => { if (a.exact !== b.exact) return a.exact ? -1 : 1; if (a.startsWith !== b.startsWith) return a.startsWith ? -1 : 1; return b.priority - a.priority; });
      if (!matches.length) return null;
      return { ...candidate, matchedField: matches[0] };
    }).filter(Boolean).slice(0, 8);
  }, [searchableUsers, coHostSearchQuery, editingListing, user?.id]);

  const listingNumberText = (listing) => {
    if (listing?.listingNumber) return listing.listingNumber;
    const st = getStateAbbreviation(listing?.state || "XX");
    const zp = (listing?.zip || "0000").slice(-4).padStart(4, "0");
    const idSuffix = (listing?.id || "00000").slice(-5).toLowerCase();
    return `${st}${zp}-${idSuffix}`;
  };

  const hasCoords = (listing) => !!(listing?.lat ?? listing?.latitude) && !!(listing?.lng ?? listing?.longitude);

  const isPastListing = (listing) => ["expired","completed","closed","cancelled","canceled","removed","denied","rejected","suspended"].includes(listing?.status || "");

  const isActiveListing = (listing) => {
    if (isPastListing(listing)) return false;
    const now = new Date();
    if (listing?.listingType === "neighborhood_sale") return isNeighborhoodVisibleOnMap(listing, now);
    return shouldShowListingOnMainMap(listing, now);
  };

  const normalizedListings = useMemo(() => listings.map((l) => ({ ...l, displayStatus: getListingDisplayStatus(l) })), [listings]);
  const isEffectivelyPastListing = (listing) => isPastListing(listing) || listing?.displayStatus === "expired";
  const isPendingListing = (listing) => !isEffectivelyPastListing(listing) && !isActiveListing(listing);

  const activeListings = useMemo(() => normalizedListings.filter((l) => isActiveListing(l)), [normalizedListings]);
  const pendingListings = useMemo(() => normalizedListings.filter((l) => isPendingListing(l)), [normalizedListings]);
  const pastListings = useMemo(() => normalizedListings.filter((l) => isEffectivelyPastListing(l)), [normalizedListings]);

  const canCancelListingDirectly = (listing) => ["active","activated_locked","payment_pending","scheduled","ready_for_payment","payment_pending_adjustment","under_review","collecting_participants"].includes(listing?.status);

  useEffect(() => {
    const cleanup = async () => {
      if (!listings?.length) return;
      const now = Date.now();
      const toUpdate = listings.filter(l => l.status === "active" && l.endDateTime && new Date(l.endDateTime).getTime() < now);
      for (const l of toUpdate) {
        try {
          await base44.entities.Listing.update(l.id, { status: "expired" });
          if (l.listingType === "neighborhood_sale") {
            await base44.functions.invoke("syncNeighborhoodDeadlineJobs", { data: { ...l, status: "expired" }, event: { type: "update", entity_id: l.id } }).catch(console.error);
          }
          await base44.entities.Notification.create({ user_id: user?.id, userId: user?.id, type: "listing_expired", title: "Listing Expired", message: `Your listing "${l.title}" has expired.`, related_entity_type: "listing", related_entity_id: l.id, is_read: false, read: false });
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
    const l = await refreshEditingListing(listing.id);
    setEditTitle(l?.title || l?.event_name || "");
    setEditDescription(l?.description || l?.event_description || "");
    setEditCategories(l?.categories?.length > 0 ? l.categories : (l?.category ? [l.category] : []));
    setEditEventIcon(l?.event_icon || getDefaultEventIconForCategory(l?.event_category || l?.category));
    setEditEventLogoUrl(l?.event_logo_url || "");
    setEditPhotoUrls(l?.listingType === "event" ? (l?.event_photos || l?.photoUrls || []) : (l?.photoUrls || []));
    setEditMarqueeSlots(Array.isArray(l?.marquee_schedule_slots) ? l.marquee_schedule_slots : []);
    setEditMarqueeFlyerUrl(l?.marquee_flyer_url || "");
    setEditMarqueeBackgroundUrl(l?.marquee_background_url || "");
    if (l?.listingType === "event" && (l?.event_tier || l?.tier) === "marquee") {
      const start = l.startDateTime ? new Date(l.startDateTime) : null;
      const end = l.endDateTime ? new Date(l.endDateTime) : null;
      setEditEventStartDate(start ? start.toISOString().slice(0, 10) : "");
      setEditEventEndDate(end ? end.toISOString().slice(0, 10) : "");
      setEditEventStartTime(start ? start.toTimeString().slice(0, 5) : "");
      setEditEventEndTime(end ? end.toTimeString().slice(0, 5) : "");
    } else { setEditEventStartDate(""); setEditEventEndDate(""); setEditEventStartTime(""); setEditEventEndTime(""); }
    if (l?.listingType === "neighborhood_sale") {
      const nsStart = l.startDateTime ? new Date(l.startDateTime) : null;
      const nsEnd = l.endDateTime ? new Date(l.endDateTime) : null;
      setEditStartDate(l.selectedRangeStartDate || (nsStart ? nsStart.toISOString().slice(0, 10) : ""));
      setEditEndDate(l.selectedRangeEndDate || (nsEnd ? nsEnd.toISOString().slice(0, 10) : ""));
      setEditStartTime(nsStart ? nsStart.toTimeString().slice(0, 5) : "08:00");
      setEditEndTime(nsEnd ? nsEnd.toTimeString().slice(0, 5) : "14:00");
      setSelectedCoHostUserId(l.co_host_user_id || "");
    } else if (l?.listingType === "yard_sale" && l?.neighborhood_sale_id && ["pending","approved"].includes(normalizeNeighborhoodJoinStatus(l?.neighborhood_join_status))) {
      const pStart = l.startDateTime ? new Date(l.startDateTime) : null;
      const pEnd = l.endDateTime ? new Date(l.endDateTime) : null;
      setEditStartDate(l.selectedRangeStartDate || (pStart ? pStart.toISOString().slice(0, 10) : ""));
      setEditEndDate(l.selectedRangeEndDate || (pEnd ? pEnd.toISOString().slice(0, 10) : ""));
      setEditStartTime(pStart ? pStart.toTimeString().slice(0, 5) : "08:00");
      setEditEndTime(pEnd ? pEnd.toTimeString().slice(0, 5) : "14:00");
    } else { setEditStartDate(""); setEditEndDate(""); setEditStartTime(""); setEditEndTime(""); }
  };

  const closeEditDescription = () => {
    setEditingListing(null); setEditTitle(""); setEditDescription(""); setEditCategories([]);
    setEditStartDate(""); setEditEndDate(""); setEditStartTime(""); setEditEndTime("");
    setEditEventIcon(""); setEditEventLogoUrl(""); setEditPhotoUrls([]); setEditMarqueeSlots([]);
    setEditEventStartDate(""); setEditEventEndDate(""); setEditEventStartTime(""); setEditEventEndTime("");
    setEditMarqueeFlyerUrl(""); setEditMarqueeBackgroundUrl(""); setCoHostSearchQuery(""); setSelectedCoHostUserId("");
  };

  const sendCoHostInvite = async () => {
    if (!editingListing || editingListing.listingType !== "neighborhood_sale" || !selectedCoHostUserId) return;
    const selectedUser = searchableUsers.find((c) => c.id === selectedCoHostUserId);
    if (!selectedUser) { toast.error("Select a user first"); return; }
    setIsSendingCoHostInvite(true);
    try {
      const dup = listingCoHostInvites.find((i) => i.host_user_id === selectedUser.id && ["pending","accepted","active","suspended"].includes(i.status));
      const dupLive = editingListing.co_host_user_id === selectedUser.id && ["active","suspended"].includes(editingListing.co_host_status);
      if (dup || dupLive) { toast.error("That co-host already has an active or pending relationship on this listing"); return; }
      const reusable = listingCoHostInvites.find((i) => i.host_user_id === selectedUser.id && ["declined","removed"].includes(i.status));
      let inviteRecord;
      if (reusable) {
        inviteRecord = await base44.entities.NeighborhoodCoHostInvite.update(reusable.id, { host_user_id: selectedUser.id, host_email: selectedUser.email, host_name: getUserDisplayName(selectedUser), status: "pending", related_listing_id: editingListing.id, event_title: editingListing.title });
      } else {
        inviteRecord = await base44.entities.NeighborhoodCoHostInvite.create({ organizer_user_id: user?.id, organizer_email: user?.email, organizer_name: getUserDisplayName(user) || user?.email || "", event_title: editingListing.title, address_key: `listing|${editingListing.id}|${selectedUser.id}`, street_address: editingListing.display_address || editingListing.addressText || editingListing.host_addressText || "Unknown", city: editingListing.city || editingListing.host_city || "Unknown", state: getStateAbbreviation(editingListing.state || editingListing.host_state || "XX"), zip_code: editingListing.zip || editingListing.host_zip || "00000", host_user_id: selectedUser.id, host_email: selectedUser.email, host_name: getUserDisplayName(selectedUser), status: "pending", related_listing_id: editingListing.id });
      }
      await base44.entities.Notification.create({ userId: selectedUser.id, user_id: selectedUser.id, user_email: selectedUser.email, title: "Neighborhood Sale Co-Host Invite", message: `${getUserDisplayName(user) || "A Yardit user"} invited you to co-host "${editingListing.title}".`, type: "co_host_invite", related_entity_type: "NeighborhoodCoHostInvite", related_entity_id: inviteRecord.id, read: false, is_read: false, metadata: { invite_id: inviteRecord.id, sale_listing_id: editingListing.id, event_title: editingListing.title, inviter_user_id: user?.id, inviter_name: getUserDisplayName(user) || user?.email || "", invite_type: "co_host", invited_user_id: selectedUser.id } });
      toast.success("Co-host invite sent");
      await queryClient.invalidateQueries({ queryKey: ["myListings", user?.id] });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["coHostInvites", editingListing.id] });
      await refreshEditingListing(editingListing.id);
      setSelectedCoHostUserId(selectedUser.id);
    } catch { toast.error("Could not send invite"); }
    finally { setIsSendingCoHostInvite(false); }
  };

  const updateCoHostDetails = async (updates, successMessage) => {
    if (!editingListing) return;
    setIsUpdatingCoHost(true);
    try { await base44.entities.Listing.update(editingListing.id, updates); toast.success(successMessage); await queryClient.invalidateQueries({ queryKey: ["myListings", user?.id] }); await refreshEditingListing(editingListing.id); }
    catch { toast.error("Could not update co-host"); }
    finally { setIsUpdatingCoHost(false); }
  };

  const handleCancelInvite = async (inviteId) => { if (inviteId) await base44.entities.NeighborhoodCoHostInvite.update(inviteId, { status: "removed" }); await queryClient.invalidateQueries({ queryKey: ["coHostInvites", editingListing.id, user?.id] }); await refreshEditingListing(editingListing.id); toast.success("Co-host invite canceled"); };
  const handleResendInvite = async (row) => { setIsUpdatingCoHost(true); try { await base44.entities.Notification.create({ userId: row.userId, user_id: row.userId, user_email: row.email, title: "Neighborhood Sale Co-Host Invite", message: `${getUserDisplayName(user) || "A Yardit user"} invited you to co-host "${editingListing?.title}".`, type: "co_host_invite", related_entity_type: "NeighborhoodCoHostInvite", related_entity_id: row.inviteId, read: false, is_read: false, metadata: { invite_id: row.inviteId, sale_listing_id: editingListing?.id, event_title: editingListing?.title, inviter_user_id: user?.id, inviter_name: getUserDisplayName(user) || user?.email || "", invite_type: "co_host", invited_user_id: row.userId } }); toast.success("Co-host invite resent"); } catch { toast.error("Could not resend invite"); } finally { setIsUpdatingCoHost(false); } };
  const handleSuspendCoHost = async (inviteId) => { if (inviteId) await base44.entities.NeighborhoodCoHostInvite.update(inviteId, { status: "accepted" }); await updateCoHostDetails({ co_host_status: "suspended", cohost_invite_status: null }, "Co-host suspended"); await queryClient.invalidateQueries({ queryKey: ["coHostInvites", editingListing.id, user?.id] }); };
  const handleReactivateCoHost = async (inviteId) => { if (inviteId) await base44.entities.NeighborhoodCoHostInvite.update(inviteId, { status: "accepted" }); await updateCoHostDetails({ co_host_status: "active", cohost_invite_status: null }, "Co-host re-activated"); await queryClient.invalidateQueries({ queryKey: ["coHostInvites", editingListing.id, user?.id] }); };
  const handleRemoveCoHost = async (inviteId) => { if (inviteId) await base44.entities.NeighborhoodCoHostInvite.update(inviteId, { status: "removed" }); await updateCoHostDetails({ co_host_user_id: null, co_host_status: null, cohost_invite_status: null, co_host_permissions: null }, "Co-host removed"); await queryClient.invalidateQueries({ queryKey: ["coHostInvites", editingListing.id, user?.id] }); };

  const saveDescription = async () => {
    if (!editingListing) return;
    if (editingListing.listingType === "yard_sale" && editCategories.length === 0) { toast.error("Please select at least 1 category"); return; }
    if (editingListing.listingType === "event") {
      const tier = editingListing.event_tier || editingListing.tier || "basic";
      if (["basic","featured"].includes(tier) && !editEventIcon) { toast.error("Please choose an event icon"); return; }
      if (tier === "premium" && !editEventIcon && !editEventLogoUrl) { toast.error("Please choose an event icon or upload a logo/image"); return; }
    }
    let dateChanged = false;
    const updateData = { title: editTitle, description: editDescription };
    if (editingListing.listingType === "event") { updateData.event_name = editTitle; updateData.event_description = editDescription; }
    if (editingListing.listingType === "yard_sale") { updateData.categories = editCategories; updateData.category = editCategories[0] || ""; updateData.photoUrls = editPhotoUrls; }
    if (editingListing.listingType === "event") {
      updateData.photoUrls = editPhotoUrls; updateData.event_photos = editPhotoUrls;
      updateData.event_icon = editEventIcon || getDefaultEventIconForCategory(editingListing.event_category || editingListing.category);
      updateData.event_logo_url = editEventLogoUrl || "";
      if ((editingListing.event_tier || editingListing.tier) === "marquee") {
        updateData.marquee_schedule_slots = editMarqueeSlots; updateData.marquee_flyer_url = editMarqueeFlyerUrl; updateData.marquee_background_url = editMarqueeBackgroundUrl;
        if (editEventStartDate && editEventStartTime) { updateData.startDateTime = new Date(`${editEventStartDate}T${editEventStartTime}`).toISOString(); updateData.start_datetime = updateData.startDateTime; }
        if (editEventEndDate && editEventEndTime) { updateData.endDateTime = new Date(`${editEventEndDate}T${editEventEndTime}`).toISOString(); updateData.end_datetime = updateData.endDateTime; }
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
        if (startDateChanged) { const e = getNeighborhoodCreationLeadTimeError(editStartDate); if (e) { toast.error(e); return; } }
        const newStartDate = editStartDate || oldStartStr; const newEndDate = editEndDate || oldEndStr;
        const newStartTime = editStartTime || oldStartTime || "08:00"; const newEndTime = editEndTime || oldEndTime || "14:00";
        if (newEndDate < newStartDate) { toast.error("End date cannot be before start date."); return; }
        updateData.startDateTime = `${newStartDate}T${newStartTime}:00`; updateData.endDateTime = `${newEndDate}T${newEndTime}:00`;
        updateData.selectedRangeStartDate = newStartDate; updateData.selectedRangeEndDate = newEndDate; dateChanged = true;
      }
    }
    const isParticipantYardSale = editingListing.listingType === "yard_sale" && editingListing.neighborhood_sale_id && ["pending","approved"].includes(normalizeNeighborhoodJoinStatus(editingListing.neighborhood_join_status));
    if (isParticipantYardSale && (editStartDate || editStartTime || editEndDate || editEndTime)) {
      const oldStartStr = editingListing.selectedRangeStartDate || editingListing.startDateTime?.slice(0, 10) || "";
      const oldEndStr = editingListing.selectedRangeEndDate || editingListing.endDateTime?.slice(0, 10) || "";
      const oldStartTime = editingListing.startDateTime ? new Date(editingListing.startDateTime).toTimeString().slice(0, 5) : "08:00";
      const oldEndTime = editingListing.endDateTime ? new Date(editingListing.endDateTime).toTimeString().slice(0, 5) : "14:00";
      const newStartDate = editStartDate || oldStartStr; const newEndDate = editEndDate || oldEndStr;
      const newStartTime = editStartTime || oldStartTime; const newEndTime = editEndTime || oldEndTime;
      if (new Date(`${newEndDate}T${newEndTime}`) <= new Date(`${newStartDate}T${newStartTime}`)) { toast.error("End time must be after start time."); return; }
      let parentSale = null;
      try { const r = await base44.entities.Listing.filter({ id: editingListing.neighborhood_sale_id }); parentSale = r[0] || null; } catch (_) {}
      if (parentSale) {
        const nsStartDate = parentSale.selectedRangeStartDate || parentSale.startDateTime?.slice(0, 10);
        const nsEndDate = parentSale.selectedRangeEndDate || parentSale.endDateTime?.slice(0, 10);
        if (!nsStartDate || !nsEndDate || newStartDate > nsEndDate || newEndDate < nsStartDate) { toast.error(`Your sale dates must overlap the Neighborhood Sale window (${nsStartDate} – ${nsEndDate}).`); return; }
      }
      updateData.startDateTime = new Date(`${newStartDate}T${newStartTime}`).toISOString();
      updateData.endDateTime = new Date(`${newEndDate}T${newEndTime}`).toISOString();
      updateData.selectedRangeStartDate = newStartDate; updateData.selectedRangeEndDate = newEndDate;
    }
    setIsSaving(true);
    try {
      await base44.entities.Listing.update(editingListing.id, updateData);
      if (dateChanged) await base44.functions.invoke("syncNeighborhoodDeadlineJobs", { data: { ...editingListing, ...updateData }, event: { type: "update", entity_id: editingListing.id } }).catch(console.error);
      toast.success("Listing updated"); closeEditDescription(); await queryClient.invalidateQueries({ queryKey: ["myListings", user?.id] });
    } catch { toast.error("Could not update listing"); }
    finally { setIsSaving(false); }
  };

  const relist = (listing) => {
    const isEvent = listing.listingType === "event";
    const basePayload = { relistFromId: listing.id, listingType: listing.listingType || "yard_sale" };
    if (isEvent) {
      basePayload.relistPrefill = { listingType: "event", event_name: listing.event_name || listing.title || "", event_description: listing.event_description || listing.description || "", event_category: listing.event_category || listing.category || "", event_icon: listing.event_icon || "", event_photos: listing.event_photos || listing.photoUrls || [], display_address: listing.display_address || listing.address_text || listing.addressText || "", geocoded_address: listing.geocoded_address || "", location_source: listing.location_source || "search", address_text: listing.display_address || listing.address_text || listing.addressText || "", addressText: listing.display_address || listing.address_text || listing.addressText || "", city: listing.city || "", state: getStateAbbreviation(listing.state || ""), zip: listing.zip || "", lat: listing.lat ?? null, lng: listing.lng ?? null, event_start_date: "", event_end_date: "", event_start_time: "", event_end_time: "", start_datetime: "", end_datetime: "", startDateTime: "", endDateTime: "", event_tier: listing.event_tier || listing.tier || "basic", marquee_schedule_slots: listing.marquee_schedule_slots || [], marquee_flyer_url: listing.marquee_flyer_url || "", marquee_background_url: listing.marquee_background_url || "", event_logo_url: listing.event_logo_url || "" };
    } else {
      basePayload.relistPrefill = { listingType: listing.listingType || "yard_sale", title: listing.title || "", description: listing.description || "", display_address: listing.display_address || listing.addressText || listing.street_address || listing.street || "", geocoded_address: listing.geocoded_address || "", location_source: listing.location_source || "search", addressText: listing.display_address || listing.addressText || listing.street_address || listing.street || "", city: listing.city || "", state: getStateAbbreviation(listing.state || ""), zip: listing.zip || listing.zip_code || "", lat: listing.lat ?? listing.latitude ?? null, lng: listing.lng ?? listing.longitude ?? null, tier: listing.tier || "free" };
    }
    try { localStorage.setItem(RELIST_STORAGE_KEY, JSON.stringify(basePayload)); } catch (e) {}
    navigate(createPageUrl("CreateListing") + (isEvent ? "?relist=1&eventRelist=1" : "?relist=1"));
  };

  const cancelListing = async (listing) => {
    if (listing.listingType !== "neighborhood_sale" && listing.neighborhood_join_status === "approved" && listing.neighborhood_sale_id) {
      try { const r = await base44.entities.Listing.filter({ id: listing.neighborhood_sale_id }); if (r[0] && ["activated_locked","coming_soon","active"].includes(r[0].event_state)) { toast.error("You cannot cancel your listing because the Neighborhood Sale is locked. Contact support if there is an emergency."); return; } } catch (e) {}
    }
    const isActive = listing.status === "active" || listing.status === "activated_locked";
    const isCommittedNS = listing.listingType === "neighborhood_sale" && listing.homeCount >= 5 && !listing.pricePaid;
    let message = `Cancel this ${isActive ? "active " : ""}listing?`;
    if (listing.pricePaid > 0) message = `Cancel this ${isActive ? "active " : ""}listing? Any eligible refund will be handled through the normal process.`;
    else if (isCommittedNS) message = `WARNING: Your Neighborhood Sale is COMMITTED (5+ homes). Cancelling now will trigger an immediate non-refundable charge for the event. Are you sure you want to cancel?`;
    if (!window.confirm(message)) return;
    try {
      if (listing.listingType === "neighborhood_sale") {
        await base44.functions.invoke("cancelNeighborhoodSale", { saleListingId: listing.id, reason: isActive ? "owner_cancelled_active" : "owner_cancelled_before_activation", finalState: "canceled", deleteSale: false });
      } else {
        await base44.entities.Listing.update(listing.id, { status: "cancelled", statusReason: isActive ? "Canceled by owner" : "Canceled by owner before activation" });
        if (listing.neighborhood_sale_id || listing.neighborhood_join_status !== "none") {
          try {
            const reqs = await base44.entities.JoinRequest.filter({ listingId: listing.id });
            for (const req of reqs) await base44.entities.JoinRequest.update(req.id, { removed_by_listing_owner: true, removed_at: new Date().toISOString(), removal_reason: "listing_canceled", status: "canceled" });
            const notifs = await base44.entities.Notification.filter({ user_id: listing.ownerUserId });
            for (const n of notifs) { if (n.metadata?.requester_listing_id === listing.id) await base44.entities.Notification.delete(n.id); }
          } catch (cleanupErr) { console.error("JoinRequest cleanup error on cancel", cleanupErr); }
        }
      }
      toast.success("Listing canceled"); await queryClient.invalidateQueries({ queryKey: ["myListings", user?.id] }); await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch { toast.error("Could not cancel listing"); }
  };

  const deleteListing = async (listing) => {
    if (!window.confirm("Delete this listing? This cannot be undone.")) return;
    try {
      if (listing.listingType !== "neighborhood_sale") await base44.entities.Listing.delete(listing.id);
      try {
        const reqs = await base44.entities.JoinRequest.filter({ listingId: listing.id });
        for (const req of reqs) await base44.entities.JoinRequest.update(req.id, { removed_by_listing_owner: true, removed_at: new Date().toISOString(), removal_reason: "listing_deleted", status: "canceled" });
        if (listing.listingType === "neighborhood_sale") await base44.functions.invoke("cancelNeighborhoodSale", { saleListingId: listing.id, reason: "event_deleted", finalState: "canceled", deleteSale: true });
        const allNotifs = await base44.entities.Notification.filter({});
        for (const n of allNotifs.filter(n => n.metadata?.requester_listing_id === listing.id || n.metadata?.sale_listing_id === listing.id)) await base44.entities.Notification.delete(n.id);
      } catch (err) { console.error("Cleanup error", err); }
      toast.success("Listing deleted"); await queryClient.invalidateQueries({ queryKey: ["myListings", user?.id] }); await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch { toast.error("Could not delete listing"); }
  };

  if (!user) {
    return <div className="min-h-[calc(100vh-140px)] flex items-center justify-center bg-gradient-to-br from-orange-50 via-purple-50 to-pink-50"><p className="text-gray-600">Loading listings...</p></div>;
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
            <Button onClick={() => navigate(createPageUrl("CreateListing"))} className="bg-[#F4A849] hover:bg-[#E39635] text-[#2C4F4E] border-2 border-[#2C4F4E] font-semibold w-full sm:w-auto">
              Create New Listing
            </Button>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap mb-6 rounded-xl border bg-white/70 p-2 shadow-sm max-w-4xl">
          <Button variant={tab === "active" ? "default" : "outline"} onClick={() => setTab("active")}>Active ({activeListings.length})</Button>
          <Button variant={tab === "pending" ? "default" : "outline"} onClick={() => setTab("pending")} className={tab !== "pending" ? "border-yellow-400 text-yellow-700 hover:bg-yellow-50" : ""}>Pending ({pendingListings.length})</Button>
          <Button variant={tab === "past" ? "default" : "outline"} onClick={() => setTab("past")}>Past Listings ({pastListings.length})</Button>
          <Button variant={tab === "billing" ? "default" : "outline"} onClick={() => setTab("billing")}>Billing / Payments</Button>
        </div>

        {tab === "billing" ? (
          <Card className="rounded-xl border bg-white/80 shadow"><CardContent className="p-8"><h2 className="text-xl font-semibold mb-2">Billing / Payments</h2><p className="text-slate-600">Coming soon. (This will show receipts and payment history per listing.)</p></CardContent></Card>
        ) : isLoading ? (
          <Card className="rounded-xl border bg-white/80 shadow"><CardContent className="p-12 text-center"><p className="text-slate-500">Loading listings...</p></CardContent></Card>
        ) : shownListings.length === 0 ? (
          <Card className="rounded-xl border bg-white/80 shadow"><CardContent className="p-12 text-center">
            <p className="text-slate-500 mb-4">{tab === "past" ? "No past listings yet" : tab === "pending" ? "No pending or scheduled listings" : "You don't have any active listings right now"}</p>
            {tab === "active" && <Button onClick={() => navigate(createPageUrl("CreateListing"))} className="bg-amber-600 hover:bg-amber-700 text-white">Create a Listing</Button>}
          </CardContent></Card>
        ) : (
          <div className="grid gap-4">
            {shownListings.map((listing) => (
              <Card key={listing.id} className="rounded-xl border bg-white/85 shadow hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-3">
                    <div className="min-w-0">
                      <h3 className="text-lg sm:text-xl font-semibold mb-1 break-words">{listing.title}</h3>
                      <div className="text-xs text-slate-500 mb-2 space-y-1 break-all">
                        <p>Listing #{String(listingNumberText(listing))}</p>
                        <p>ID: {listing.id}</p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="outline" className="bg-white text-slate-700 border-slate-300">{listing.listingType === "event" ? "Event" : listing.listingType === "yard_sale" ? "Yard Sale" : listing.listingType === "neighborhood_sale" ? "Neighborhood Sale" : "Listing"}</Badge>
                        {listing.co_host_user_id === user?.id && listing.co_host_status === "active" && <Badge className="bg-indigo-600 text-white hover:bg-indigo-700 border-none">Co-Host</Badge>}
                        {normalizeNeighborhoodJoinStatus(listing.neighborhood_join_status) === "pending" && <Badge className="bg-yellow-500 text-yellow-950 hover:bg-yellow-600 border-none">Pending Neighborhood Approval</Badge>}
                        {normalizeNeighborhoodJoinStatus(listing.neighborhood_join_status) === "approved" && <Badge className="bg-green-600 text-white hover:bg-green-700 border-none">Neighborhood Approved</Badge>}
                        {listing.neighborhood_join_status === "denied" && <Badge className="bg-red-600 text-white hover:bg-red-700 border-none">Neighborhood Denied</Badge>}
                        <Badge className={tierColors[listing.tier] || "bg-slate-500"}>{formatListingTierLabel(listing.tier)}</Badge>
                        <Badge className={statusColors[listing.displayStatus] || "bg-gray-500"}>{formatListingStatusLabel(listing.displayStatus)}</Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:flex gap-2 sm:flex-wrap sm:justify-end bg-white/60 rounded-xl p-2 border border-gray-100">
                      <Button size="sm" disabled={!hasCoords(listing)} onClick={() => navigate(createPageUrl("Home") + `?listingId=${listing.id}`)} className="gap-1 bg-teal-600 hover:bg-teal-700 text-white"><Map className="w-3 h-3" />View on Map</Button>
                      <Button size="sm" onClick={() => navigate(createPageUrl("ListingDetail") + `?id=${listing.id}`)} className="bg-slate-700 hover:bg-slate-800 text-white">View Details</Button>
                      {listing.ownerUserId === user?.id && <Button size="sm" onClick={() => openEditDescription(listing)} className="bg-blue-600 hover:bg-blue-700 text-white">Edit Listing</Button>}
                      <Button size="sm" onClick={() => relist(listing)} className="bg-emerald-600 hover:bg-emerald-700 text-white">Relist</Button>
                      {canSelfServeUpgrade(listing) && <Button size="sm" onClick={() => setUpgradeListing(listing)} className="bg-amber-600 hover:bg-amber-700 text-white">Upgrade</Button>}
                      {canCancelListingDirectly(listing) ? (
                        <Button size="sm" variant="destructive" onClick={() => cancelListing(listing)} className="gap-1"><Trash2 className="w-3 h-3" />Cancel Listing</Button>
                      ) : isActiveListing(listing) ? (
                        <Button size="sm" variant="outline" onClick={() => navigate(createPageUrl("ContactSupport"))} className="gap-1">Need Help? Contact Support</Button>
                      ) : isEffectivelyPastListing(listing) ? (
                        <Button size="sm" variant="destructive" onClick={() => deleteListing(listing)} className="gap-1"><Trash2 className="w-3 h-3" />Delete</Button>
                      ) : null}
                    </div>
                  </div>
                  <p className="text-gray-600 mb-4 whitespace-pre-wrap">{listing.description || "(No description)"}</p>
                  <div className="grid md:grid-cols-2 gap-4 text-sm rounded-xl bg-orange-50/60 border border-orange-100 p-4">
                    <div className="flex items-center gap-2 text-slate-600"><MapPin className="w-4 h-4" /><span className="break-words">{getListingAddressLine(listing)}</span></div>
                    <div className="flex items-center gap-2 text-slate-600"><Calendar className="w-4 h-4" /><span>{formatListingDateRange(listing)}</span></div>
                  </div>
                  {listing.statusReason && <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"><p className="text-sm text-yellow-800"><strong>Status Note:</strong> {listing.statusReason}</p></div>}
                  {listing.listingType === "yard_sale" && (
                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-center sm:justify-start">
                      <button type="button" onClick={() => setShowGuideModal(true)} className="text-sm text-teal-600 font-medium hover:text-teal-800 underline underline-offset-2 transition-colors">Want more traffic? View Success Guide</button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <YardSaleGuideModal open={showGuideModal} onOpenChange={setShowGuideModal} />

      <EditListingDialog
        editingListing={editingListing}
        onClose={closeEditDescription}
        onSave={saveDescription}
        isSaving={isSaving}
        editTitle={editTitle} setEditTitle={setEditTitle}
        editDescription={editDescription} setEditDescription={setEditDescription}
        editCategories={editCategories} setEditCategories={setEditCategories}
        editStartDate={editStartDate} setEditStartDate={setEditStartDate}
        editEndDate={editEndDate} setEditEndDate={setEditEndDate}
        editStartTime={editStartTime} setEditStartTime={setEditStartTime}
        editEndTime={editEndTime} setEditEndTime={setEditEndTime}
        editEventIcon={editEventIcon} setEditEventIcon={setEditEventIcon}
        editEventLogoUrl={editEventLogoUrl} setEditEventLogoUrl={setEditEventLogoUrl}
        editPhotoUrls={editPhotoUrls} setEditPhotoUrls={setEditPhotoUrls}
        editMarqueeSlots={editMarqueeSlots} setEditMarqueeSlots={setEditMarqueeSlots}
        editEventStartDate={editEventStartDate} setEditEventStartDate={setEditEventStartDate}
        editEventEndDate={editEventEndDate} setEditEventEndDate={setEditEventEndDate}
        editEventStartTime={editEventStartTime} setEditEventStartTime={setEditEventStartTime}
        editEventEndTime={editEventEndTime} setEditEventEndTime={setEditEventEndTime}
        editMarqueeFlyerUrl={editMarqueeFlyerUrl} setEditMarqueeFlyerUrl={setEditMarqueeFlyerUrl}
        editMarqueeBackgroundUrl={editMarqueeBackgroundUrl} setEditMarqueeBackgroundUrl={setEditMarqueeBackgroundUrl}
        iconPickerOpen={iconPickerOpen} setIconPickerOpen={setIconPickerOpen}
        filteredCoHostUsers={filteredCoHostUsers}
        coHostSearchQuery={coHostSearchQuery} setCoHostSearchQuery={setCoHostSearchQuery}
        selectedCoHostUserId={selectedCoHostUserId} setSelectedCoHostUserId={setSelectedCoHostUserId}
        isSendingCoHostInvite={isSendingCoHostInvite}
        isUpdatingCoHost={isUpdatingCoHost}
        pendingInviteRows={pendingInviteRows}
        activeCoHostRows={activeCoHostRows}
        suspendedCoHostRows={suspendedCoHostRows}
        sendCoHostInvite={sendCoHostInvite}
        handleCancelInvite={handleCancelInvite}
        handleResendInvite={handleResendInvite}
        handleSuspendCoHost={handleSuspendCoHost}
        handleReactivateCoHost={handleReactivateCoHost}
        handleRemoveCoHost={handleRemoveCoHost}
        user={user}
      />

      <ListingUpgradeDialog
        open={!!upgradeListing}
        onClose={() => setUpgradeListing(null)}
        listing={upgradeListing}
        user={user}
        onSuccess={() => { setUpgradeListing(null); queryClient.invalidateQueries({ queryKey: ["myListings", user?.id] }); queryClient.invalidateQueries({ queryKey: ["listings"] }); }}
      />
    </div>
  );
}
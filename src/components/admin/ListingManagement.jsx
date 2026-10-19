import React, { useMemo, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Calendar, MapPin, Plus, QrCode, AlertTriangle, Star, Ghost, Camera, X, Loader2, Pencil } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import PromotionModal from "./promotions/PromotionModal";
import AdminAssistedListingForm from "@/components/admin/assisted/AdminAssistedListingForm";
import AdminQRViewModal from "@/components/admin/assisted/AdminQRViewModal";
import {
  formatListingDateRange,
  formatListingStatusLabel,
  formatListingTierLabel,
  getListingAddressLine,
  getListingDisplayStatus,
  getOwnerDisplayName,
  statusColors,
} from "@/components/listing/listingDisplay";

// Vendor listing types to exclude from residential view
const VENDOR_LISTING_TYPES = ["vendor", "vendor_event"];

function hasAssistedQr(record) {
  const token = record?.assisted_qr_token;
  const approvalUrl = record?.approval_url;
  return !!record?.qr_image_url || !!(token && token !== "__invalidated__" && approvalUrl?.includes(token));
}

function hasListingQrBackup(listing) {
  const token = listing?.assisted_qr_token;
  const approvalUrl = listing?.assisted_approval_url;
  return !!listing?.assisted_qr_image_url || !!(token && token !== "__invalidated__" && approvalUrl?.includes(token));
}

function buildListingQrBackupRecord(listing) {
  if (!hasListingQrBackup(listing)) return null;

  return {
    id: `listing-backup-${listing.id}`,
    source: "listing_backup",
    listing_id: listing.id,
    listing_number: listing.listingNumber,
    assisted_status: listing.assisted_status,
    assisted_qr_token: listing.assisted_qr_token,
    approval_url: listing.assisted_approval_url,
    qr_image_url: listing.assisted_qr_image_url,
    assisted_qr_expires_at: listing.assisted_qr_expires_at,
    assisted_sale_formatted_address: listing.display_address || listing.addressText || listing.address_text,
  };
}

export default function ListingManagement({ mode, adminUser }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [promoListing, setPromoListing] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [qrModalRecord, setQrModalRecord] = useState(null);
  const [starInfoListing, setStarInfoListing] = useState(null);
  const [listingTypeFilter, setListingTypeFilter] = useState("all");
  const [editListing, setEditListing] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isUploadingEditPhoto, setIsUploadingEditPhoto] = useState(false);
  const editPhotoInputRef = useRef(null);

  const { data: listings } = useQuery({
    queryKey: ["allListings"],
    queryFn: () => base44.entities.Listing.list("-created_date"),
    initialData: [],
  });

  const { data: seasonalLocations } = useQuery({
    queryKey: ["adminSeasonalLocations"],
    queryFn: async () => {
      const [halloween, holidayLights] = await Promise.all([
        base44.entities.Location.filter({ type: "halloween_candy" }, "-created_date"),
        base44.entities.Location.filter({ type: "holiday_lights" }, "-created_date"),
      ]);
      return [...halloween, ...holidayLights].sort((a, b) =>
        String(b.created_date || "").localeCompare(String(a.created_date || ""))
      );
    },
    initialData: [],
  });

  const { data: users } = useQuery({
    queryKey: ["listingOwners"],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const { data: assistedListings } = useQuery({
    queryKey: ["assistedListings"],
    queryFn: () => base44.entities.AssistedListing.list("-created_date", 500),
    initialData: [],
  });

  const assistedMap = useMemo(() => {
    const map = {};
    assistedListings.forEach((a) => { map[a.listing_id] = a; });
    return map;
  }, [assistedListings]);

  const ownerMap = useMemo(() => {
    const map = {};
    users.forEach((user) => {
      map[user.id] = user;
    });
    return map;
  }, [users]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, ownerUserId, status, reason, title, listingType, startDateTime, endDateTime, event_state, sourceEntity }) => {
      if (sourceEntity === "Location") {
        await base44.functions.invoke("manageSeasonalLocation", { action: "admin_patch", location_id: id, patch: { status, statusReason: reason } });
      } else {
        await base44.entities.Listing.update(id, { status, statusReason: reason });
      }
      
      if (listingType === "neighborhood_sale") {
        await base44.functions.invoke("syncNeighborhoodDeadlineJobs", {
          data: { id, ownerUserId, title, listingType, startDateTime, endDateTime, event_state, status, statusReason: reason },
          event: { type: "update", entity_id: id }
        }).catch(console.error);
      }

      let notifType = "listing_status_change";
      let notifTitle = "Listing Status Changed";
      let message = `Your listing "${title}" status changed to ${status}.`;

      if (status === "suspended" || status === "hidden") {
        notifType = "listing_removed";
        notifTitle = "Listing Removed";
        message = `Your listing "${title}" has been removed/suspended. Reason: ${reason}`;
      } else if (status === "under_review") {
        notifType = "listing_flagged";
        notifTitle = "Listing Flagged";
        message = `Your listing "${title}" is currently under review.`;
      } else if (status === "expired") {
        notifType = "listing_expired";
        notifTitle = "Listing Expired";
        message = `Your listing "${title}" has expired.`;
      }

      if (ownerUserId) {
        const notif = await base44.entities.Notification.create({
          user_id: ownerUserId,
          userId: ownerUserId,
          type: notifType,
          title: notifTitle,
          message,
          related_entity_type: sourceEntity === "Location" ? "location" : "listing",
          related_entity_id: id,
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
      }
    },
    onSuccess: () => {
      toast.success("Listing status updated");
      queryClient.invalidateQueries({ queryKey: ["allListings"] });
      queryClient.invalidateQueries({ queryKey: ["adminSeasonalLocations"] });
      queryClient.invalidateQueries({ queryKey: ["halloweenLocations"] });
      queryClient.invalidateQueries({ queryKey: ["publicMapData"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const openEditListing = (listing) => {
    const toLocalInput = (value) => {
      if (!value) return "";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return String(value).slice(0, 16);
      const pad = (n) => String(n).padStart(2, "0");
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    setEditListing(listing);
    setEditDraft({
      title: listing.title || listing.display_title || "",
      description: listing.description || "",
      addressText: listing.street_address || listing.addressText || listing.display_address || listing.address || "",
      city: listing.city || "",
      state: listing.state || "",
      zip: listing.zip || listing.zip_code || "",
      startDateTime: toLocalInput(listing.startDateTime || listing.start_date_time),
      endDateTime: toLocalInput(listing.endDateTime || listing.end_date_time || listing.expires_at),
      photoUrls: listing._sourceEntity === "Location" ? [...(listing.photos || [])] : [...(listing.photoUrls || [])],
      halloweenContributor: listing.halloween_contributor_name || "",
    });
  };

  const handleEditPhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !editDraft) return;
    setIsUploadingEditPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setEditDraft((prev) => ({ ...prev, photoUrls: [...(prev.photoUrls || []), file_url] }));
    } catch (error) {
      console.error(error);
      toast.error("Photo upload failed");
    } finally {
      setIsUploadingEditPhoto(false);
      if (editPhotoInputRef.current) editPhotoInputRef.current.value = "";
    }
  };

  const saveListingEdits = async () => {
    if (!editListing || !editDraft) return;
    if (!editDraft.title.trim()) {
      toast.error("Title is required");
      return;
    }

    setIsSavingEdit(true);
    try {
      if (editListing._sourceEntity === "Location") {
        const address = [editDraft.addressText, editDraft.city, editDraft.state, editDraft.zip].filter(Boolean).join(", ");
        const start = editDraft.startDateTime ? new Date(editDraft.startDateTime) : null;
        const end = editDraft.endDateTime ? new Date(editDraft.endDateTime) : null;
        const patch = {
          title: editDraft.title.trim(),
          display_title: editDraft.title.trim(),
          description: editDraft.description || "",
          street_address: editDraft.addressText || "",
          city: editDraft.city || "",
          state: editDraft.state || "",
          zip_code: editDraft.zip || "",
          address,
          photos: editDraft.photoUrls || [],
          start_date_time: start && !Number.isNaN(start.getTime()) ? start.toISOString() : null,
          end_date_time: end && !Number.isNaN(end.getTime()) ? end.toISOString() : null,
        };

        if (editListing._isHalloween) {
          if (start && !Number.isNaN(start.getTime())) {
            patch.halloween_start_date = editDraft.startDateTime.slice(0, 10);
            patch.halloween_start_time = editDraft.startDateTime.slice(11, 16);
            patch.viewing_start_time = editDraft.startDateTime.slice(11, 16);
          }
          if (end && !Number.isNaN(end.getTime())) {
            patch.halloween_end_date = editDraft.endDateTime.slice(0, 10);
            patch.halloween_end_time = editDraft.endDateTime.slice(11, 16);
            patch.viewing_end_time = editDraft.endDateTime.slice(11, 16);
            patch.expires_at = end.toISOString();
          }
          patch.halloween_contributor_name = editDraft.halloweenContributor || "";
        }

        await base44.functions.invoke("manageSeasonalLocation", {
          action: "admin_patch",
          location_id: editListing.id,
          patch,
        });
      } else {
        const start = editDraft.startDateTime ? new Date(editDraft.startDateTime) : null;
        const end = editDraft.endDateTime ? new Date(editDraft.endDateTime) : null;
        await base44.entities.Listing.update(editListing.id, {
          title: editDraft.title.trim(),
          description: editDraft.description || "",
          addressText: editDraft.addressText || "",
          address_text: editDraft.addressText || "",
          display_address: [editDraft.addressText, editDraft.city, editDraft.state, editDraft.zip].filter(Boolean).join(", "),
          city: editDraft.city || "",
          state: editDraft.state || "",
          zip: editDraft.zip || "",
          photoUrls: editDraft.photoUrls || [],
          ...(start && !Number.isNaN(start.getTime()) ? { startDateTime: start.toISOString(), selectedRangeStartDate: editDraft.startDateTime.slice(0, 10) } : {}),
          ...(end && !Number.isNaN(end.getTime()) ? { endDateTime: end.toISOString(), selectedRangeEndDate: editDraft.endDateTime.slice(0, 10) } : {}),
        });
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["allListings"] }),
        queryClient.invalidateQueries({ queryKey: ["adminSeasonalLocations"] }),
        queryClient.invalidateQueries({ queryKey: ["halloweenLocations"] }),
        queryClient.invalidateQueries({ queryKey: ["publicMapData"] }),
      ]);
      toast.success("Listing updated");
      setEditListing(null);
      setEditDraft(null);
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "Could not update listing");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const normalizedListings = [
    ...listings.map((listing) => ({
      ...listing,
      displayStatus: getListingDisplayStatus(listing),
      _sourceEntity: "Listing",
    })),
    ...seasonalLocations.map((spot) => {
      const isHalloween = spot.type === "halloween_candy";
      const isHolidayLights = spot.type === "holiday_lights";
      return {
        ...spot,
        _sourceEntity: "Location",
        listingType: isHalloween ? "halloween_spot" : isHolidayLights ? "holiday_lights" : spot.type,
        ownerUserId: spot.owner_user_id || spot.created_by_id || null,
        title: spot.title || spot.display_title || (isHalloween ? "Halloween Spot" : "Holiday Lights"),
        display_address: spot.address || [spot.street_address, spot.city, spot.state, spot.zip_code].filter(Boolean).join(", "),
        addressText: spot.address || [spot.street_address, spot.city, spot.state, spot.zip_code].filter(Boolean).join(", "),
        startDateTime: spot.start_date_time || spot.halloween_start_date,
        endDateTime: spot.end_date_time || spot.halloween_end_date || spot.expires_at,
        tier: isHalloween ? "halloween" : "holiday",
        displayStatus: spot.status || "active",
        _isHalloween: isHalloween,
        _isHolidayLights: isHolidayLights,
      };
    }),
  ]; 

  const filteredListings = normalizedListings.filter((listing) => {
    // Mode filtering: residential excludes vendor listing types
    if (mode === "residential" && VENDOR_LISTING_TYPES.includes(listing.listingType)) return false;

    if (listingTypeFilter === "residential" && ["neighborhood_sale", "halloween_spot", "holiday_lights"].includes(listing.listingType)) return false;
    if (listingTypeFilter === "neighborhood" && listing.listingType !== "neighborhood_sale") return false;
    if (listingTypeFilter === "halloween" && !listing._isHalloween) return false;
    if (listingTypeFilter === "holiday_lights" && !listing._isHolidayLights) return false;

    const query = searchQuery.toLowerCase();
    return [listing.title, listing.city, listing.zip, listing.id]
      .some((value) => String(value || "").toLowerCase().includes(query));
  });

  return (
    <div className="mt-6">
      <div className="mb-4 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by title, city, ZIP, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={listingTypeFilter} onValueChange={setListingTypeFilter}>
          <SelectTrigger className="w-full lg:w-[210px]">
            <SelectValue placeholder="Filter listings" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Listings</SelectItem>
            <SelectItem value="residential">Residential Sales</SelectItem>
            <SelectItem value="neighborhood">Neighborhood Sales</SelectItem>
            <SelectItem value="halloween">Halloween</SelectItem>
            <SelectItem value="holiday_lights">Holiday Lights</SelectItem>
          </SelectContent>
        </Select>
        <Button 
          className="bg-amber-600 hover:bg-amber-700 whitespace-nowrap gap-2"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="w-4 h-4" /> Create Listing (Admin)
        </Button>
      </div>

      <div className="space-y-4">
        {filteredListings.map((listing) => {
          const owner = ownerMap[listing.ownerUserId];
          const assistedRecord = assistedMap[listing.id];
          const assistedQrRecord = hasAssistedQr(assistedRecord) ? assistedRecord : null;
          const listingQrBackupRecord = buildListingQrBackupRecord(listing);
          const qrRecord = assistedQrRecord || listingQrBackupRecord;
          const isAssisted = listing.assisted_listing === true || !!assistedRecord || !!listingQrBackupRecord;
          return (
            <Card key={listing.id}>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="relative">
                      <h3 className="font-semibold text-lg break-words pr-8">{listing.title || "Untitled"}</h3>
                      <p className="text-xs text-slate-500 break-all">Listing ID: {listing.id}</p>
                      {(listing.created_by_admin === true || listing.assisted_listing === true) && (
                        <button
                          type="button"
                          title="Admin-created listing — click for details"
                          onClick={() => setStarInfoListing({ listing, assisted: assistedRecord })}
                          className="absolute top-0 right-0 text-amber-500 hover:text-amber-600 transition-colors"
                        >
                          <Star className="w-5 h-5 fill-amber-400 stroke-amber-500" />
                        </button>
                      )}
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <Badge className={statusColors[listing.displayStatus] || "bg-gray-500"}>
                        {formatListingStatusLabel(listing.displayStatus)}
                      </Badge>
                      {listing._isHalloween ? (
                        <Badge className="gap-1 border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-50">
                          <Ghost className="h-3 w-3" /> Halloween
                        </Badge>
                      ) : listing._isHolidayLights ? (
                        <Badge className="gap-1 border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-50">
                          ✨ Holiday Lights
                        </Badge>
                      ) : (
                        <Badge variant="outline">{formatListingTierLabel(listing.tier)}</Badge>
                      )}
                    </div>

                    <div className="space-y-1.5 text-sm text-slate-600">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span className="break-words">{getListingAddressLine(listing)}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{formatListingDateRange(listing)}</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Owner:{" "}
                        <button
                          type="button"
                          onClick={() => navigate(createPageUrl("AdminLite") + `?tab=lite&liteTab=users&openUserId=${listing.ownerUserId}`)}
                          className="font-medium text-blue-600 hover:text-blue-800 underline underline-offset-2"
                        >
                          {getOwnerDisplayName(owner, listing)}
                        </button>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row lg:flex-col gap-2 lg:min-w-[220px]">
                    <Button
                      size="sm"
                      className="gap-1.5 bg-[#2C4F4E] text-white hover:bg-[#203b3a]"
                      onClick={() => openEditListing(listing)}
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit Listing
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (listing._isHalloween) {
                          navigate(createPageUrl("HalloweenSpotDetail") + `?id=${listing.id}`);
                        } else if (listing._isHolidayLights) {
                          navigate(createPageUrl("Home") + `?listingId=${listing.id}`);
                        } else {
                          navigate(createPageUrl("ListingDetail") + `?id=${listing.id}&from=admin-lite-listings`);
                        }
                      }}
                    >
                      View More Details
                    </Button>
                    {isAssisted && qrRecord && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50"
                        onClick={() => setQrModalRecord(qrRecord)}
                      >
                        <QrCode className="w-3.5 h-3.5" /> View QR
                      </Button>
                    )}
                    {isAssisted && !qrRecord && (
                      <Button size="sm" variant="outline" disabled className="gap-1.5 border-red-200 text-red-400 cursor-not-allowed">
                        <AlertTriangle className="w-3.5 h-3.5" /> QR Missing
                      </Button>
                    )}
                    {listing._sourceEntity !== "Location" && (
                      <Button
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                        onClick={() => setPromoListing(listing)}
                      >
                        PROMOTIONAL
                      </Button>
                    )}
                    <Select
                      value={listing.status}
                      onValueChange={(value) =>
                        updateStatusMutation.mutate({
                          id: listing.id,
                          ownerUserId: listing.ownerUserId,
                          status: value,
                          reason: `Admin changed status to ${value}`,
                          title: listing.title || "Untitled",
                          listingType: listing.listingType,
                          startDateTime: listing.startDateTime,
                          endDateTime: listing.endDateTime,
                          event_state: listing.event_state,
                          sourceEntity: listing._sourceEntity
                        })
                      }
                    >
                      <SelectTrigger className="w-full sm:w-40 lg:w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        {listing._sourceEntity === "Location" ? (
                          <>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="under_review">Under Review</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="hidden">Hidden</SelectItem>
                            <SelectItem value="under_review">Under Review</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="expired">Expired</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!editListing} onOpenChange={(open) => { if (!open && !isSavingEdit) { setEditListing(null); setEditDraft(null); } }}>
        <DialogContent className="w-[calc(100vw-24px)] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Listing</DialogTitle>
          </DialogHeader>
          {editDraft && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={editDraft.title} onChange={(e) => setEditDraft((p) => ({ ...p, title: e.target.value }))} />
                <Label>Description</Label>
                <Textarea rows={4} value={editDraft.description} onChange={(e) => setEditDraft((p) => ({ ...p, description: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={editDraft.addressText} onChange={(e) => setEditDraft((p) => ({ ...p, addressText: e.target.value }))} />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Input placeholder="City" value={editDraft.city} onChange={(e) => setEditDraft((p) => ({ ...p, city: e.target.value }))} />
                  <Input placeholder="State" value={editDraft.state} onChange={(e) => setEditDraft((p) => ({ ...p, state: e.target.value }))} />
                  <Input placeholder="ZIP" value={editDraft.zip} onChange={(e) => setEditDraft((p) => ({ ...p, zip: e.target.value }))} />
                </div>
                <p className="text-xs text-amber-700">Changing address text does not move the map pin. Use the listing/location tools if coordinates also need to change.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Starts</Label>
                  <Input type="datetime-local" value={editDraft.startDateTime} onChange={(e) => setEditDraft((p) => ({ ...p, startDateTime: e.target.value }))} />
                </div>
                <div>
                  <Label>Ends</Label>
                  <Input type="datetime-local" value={editDraft.endDateTime} onChange={(e) => setEditDraft((p) => ({ ...p, endDateTime: e.target.value }))} />
                </div>
              </div>

              {editListing?._isHalloween && (
                <div>
                  <Label>Community Source / Contributor</Label>
                  <Input
                    value={editDraft.halloweenContributor}
                    onChange={(e) => setEditDraft((p) => ({ ...p, halloweenContributor: e.target.value }))}
                    placeholder="e.g. Visalia Stringer"
                  />
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label>Photos</Label>
                    <p className="text-xs text-slate-500">Add or remove listing photos.</p>
                  </div>
                  <input
                    ref={editPhotoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleEditPhotoUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUploadingEditPhoto}
                    onClick={() => editPhotoInputRef.current?.click()}
                  >
                    {isUploadingEditPhoto ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Camera className="w-4 h-4 mr-1" />}
                    {isUploadingEditPhoto ? "Uploading..." : "Add Photo"}
                  </Button>
                </div>
                {(editDraft.photoUrls || []).length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {editDraft.photoUrls.map((url, index) => (
                      <div key={`${url}-${index}`} className="relative aspect-square">
                        <img src={url} alt="" className="h-full w-full rounded-lg border object-cover" />
                        <button
                          type="button"
                          aria-label="Remove photo"
                          onClick={() => setEditDraft((p) => ({ ...p, photoUrls: p.photoUrls.filter((_, i) => i !== index) }))}
                          className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white shadow"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-5 text-center text-sm text-slate-500">No photos yet.</div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" disabled={isSavingEdit} onClick={() => { setEditListing(null); setEditDraft(null); }}>Cancel</Button>
                <Button className="flex-1 bg-[#2C4F4E] hover:bg-[#203b3a]" disabled={isSavingEdit || isUploadingEditPhoto} onClick={saveListingEdits}>
                  {isSavingEdit ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {qrModalRecord && (
        <AdminQRViewModal
          record={qrModalRecord}
          onClose={() => setQrModalRecord(null)}
          onRefreshed={(updated) => setQrModalRecord(updated)}
        />
      )}

      {promoListing && (
        <PromotionModal
          open={!!promoListing}
          onClose={() => setPromoListing(null)}
          listing={promoListing}
        />
      )}

      {/* Admin Star Info Modal */}
      <Dialog open={!!starInfoListing} onOpenChange={(open) => !open && setStarInfoListing(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <Star className="w-4 h-4 fill-amber-400 stroke-amber-500" /> Admin-Created Listing
            </DialogTitle>
          </DialogHeader>
          {starInfoListing && (() => {
            const { listing, assisted } = starInfoListing;
            const creatorId = assisted?.admin_creator_id || listing.ownerUserId;
            const creatorEmail = assisted?.admin_creator_email || "";
            const creatorUser = ownerMap[creatorId];
            const creatorName = creatorUser ? `${creatorUser.first_name || ""} ${creatorUser.last_name || ""}`.trim() || creatorUser.email : (creatorEmail || creatorId || "Unknown");
            return (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-2">
                  <span className="text-slate-500 font-medium">Created by:</span>
                  <span className="text-slate-800 break-all">{creatorName}</span>

                  {creatorEmail && (
                    <>
                      <span className="text-slate-500 font-medium">Admin email:</span>
                      <span className="text-slate-800 break-all">{creatorEmail}</span>
                    </>
                  )}

                  <span className="text-slate-500 font-medium">Created:</span>
                  <span className="text-slate-800">{listing.created_date ? format(new Date(listing.created_date), "MMM d, yyyy h:mm a") : "—"}</span>

                  <span className="text-slate-500 font-medium">Listing ID:</span>
                  <span className="text-slate-800 break-all">{listing.id}</span>

                  <span className="text-slate-500 font-medium">Assisted status:</span>
                  <span className="text-slate-800 capitalize">{assisted?.assisted_status?.replace(/_/g, " ") || "—"}</span>

                  <span className="text-slate-500 font-medium">Approved:</span>
                  <span className="text-slate-800">
                    {assisted?.seller_approved_at ? format(new Date(assisted.seller_approved_at), "MMM d, yyyy h:mm a") : "Not yet"}
                  </span>

                  <span className="text-slate-500 font-medium">Claimed by:</span>
                  <span className="text-slate-800 break-all">
                    {assisted?.claimed_by_user_id ? (ownerMap[assisted.claimed_by_user_id]?.email || assisted.claimed_by_user_id) : "Unclaimed"}
                  </span>

                  {assisted?.claimed_at && (
                    <>
                      <span className="text-slate-500 font-medium">Claimed at:</span>
                      <span className="text-slate-800">{format(new Date(assisted.claimed_at), "MMM d, yyyy h:mm a")}</span>
                    </>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="w-[calc(100vw-32px)] max-w-2xl max-h-[90vh] overflow-x-hidden overflow-y-auto p-4 sm:p-6 box-border">
          <DialogHeader>
            <DialogTitle className="text-[#2C4F4E] text-base leading-snug pr-6">Create Assisted Listing (Admin Only)</DialogTitle>
          </DialogHeader>
          <AdminAssistedListingForm adminUser={adminUser} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
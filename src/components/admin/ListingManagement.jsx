import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Calendar, MapPin } from "lucide-react";
import { toast } from "sonner";
import PromotionModal from "./promotions/PromotionModal";
import {
  formatListingDateRange,
  formatListingStatusLabel,
  formatListingTierLabel,
  getListingAddressLine,
  getListingDisplayStatus,
  getOwnerDisplayName,
  statusColors,
} from "@/components/listing/listingDisplay";

export default function ListingManagement() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [promoListing, setPromoListing] = useState(null);

  const { data: listings } = useQuery({
    queryKey: ["allListings"],
    queryFn: () => base44.entities.Listing.list("-created_date"),
    initialData: [],
  });

  const { data: users } = useQuery({
    queryKey: ["listingOwners"],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const ownerMap = useMemo(() => {
    const map = {};
    users.forEach((user) => {
      map[user.id] = user;
    });
    return map;
  }, [users]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, ownerUserId, status, reason, title }) => {
      await base44.entities.Listing.update(id, { status, statusReason: reason });
      
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

      const notif = await base44.entities.Notification.create({
        user_id: ownerUserId,
        userId: ownerUserId,
        type: notifType,
        title: notifTitle,
        message,
        related_entity_type: "listing",
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
    },
    onSuccess: () => {
      toast.success("Listing status updated");
      queryClient.invalidateQueries({ queryKey: ["allListings"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const normalizedListings = listings.map((listing) => ({
    ...listing,
    displayStatus: getListingDisplayStatus(listing),
  }));

  const filteredListings = normalizedListings.filter((listing) => {
    const query = searchQuery.toLowerCase();
    return [listing.title, listing.city, listing.zip, listing.id]
      .some((value) => String(value || "").toLowerCase().includes(query));
  });

  return (
    <div className="mt-6">
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by title, city, ZIP, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filteredListings.slice(0, 20).map((listing) => {
          const owner = ownerMap[listing.ownerUserId];
          return (
            <Card key={listing.id}>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-3">
                    <div>
                      <h3 className="font-semibold text-lg break-words">{listing.title || "Untitled"}</h3>
                      <p className="text-xs text-slate-500 break-all">Listing ID: {listing.id}</p>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <Badge className={statusColors[listing.displayStatus] || "bg-gray-500"}>
                        {formatListingStatusLabel(listing.displayStatus)}
                      </Badge>
                      <Badge variant="outline">{formatListingTierLabel(listing.tier)}</Badge>
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
                      variant="outline"
                      onClick={() => navigate(createPageUrl("ListingDetail") + `?id=${listing.id}&from=admin-lite-listings`)}
                    >
                      View More Details
                    </Button>
                    <Button
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                      onClick={() => setPromoListing(listing)}
                    >
                      PROMOTIONAL
                    </Button>
                    <Select
                      value={listing.status}
                      onValueChange={(value) =>
                        updateStatusMutation.mutate({
                          id: listing.id,
                          ownerUserId: listing.ownerUserId,
                          status: value,
                          reason: `Admin changed status to ${value}`,
                          title: listing.title || "Untitled",
                        })
                      }
                    >
                      <SelectTrigger className="w-full sm:w-40 lg:w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="hidden">Hidden</SelectItem>
                        <SelectItem value="under_review">Under Review</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {promoListing && (
        <PromotionModal
          open={!!promoListing}
          onClose={() => setPromoListing(null)}
          listing={promoListing}
        />
      )}
    </div>
  );
}
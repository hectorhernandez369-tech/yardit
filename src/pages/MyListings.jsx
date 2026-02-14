import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Map } from "lucide-react";
import { format } from "date-fns";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function MyListingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [user, setUser] = useState(null);

  // (Edit Description modal state)
  const [editingListing, setEditingListing] = useState(null);
  const [editDescription, setEditDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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
    queryFn: () => base44.entities.Listing.filter({ ownerUserId: user.id }, "-created_date"),
    enabled: !!user,
    initialData: [],
  });

  const tierColors = useMemo(
    () => ({
      free: "bg-slate-500",
      featured: "bg-purple-600",
      premium: "bg-amber-600",
      neighborhood_tier: "bg-emerald-600",
    }),
    []
  );

  const statusColors = useMemo(
    () => ({
      active: "bg-green-600",
      hidden: "bg-gray-500",
      under_review: "bg-yellow-600",
      suspended: "bg-red-600",
      completed: "bg-blue-600",
      expired: "bg-gray-400",
    }),
    []
  );

  if (!user) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  const openEditDescription = (listing) => {
    setEditingListing(listing);
    setEditDescription(listing?.description || "");
  };

  const closeEditDescription = () => {
    setEditingListing(null);
    setEditDescription("");
  };

  const saveDescription = async () => {
    if (!editingListing) return;

    setIsSaving(true);
    try {
      await base44.entities.Listing.update(editingListing.id, {
        description: editDescription,
      });

      toast.success("Description updated");
      closeEditDescription();

      // (Refresh the list so the edited description shows immediately)
      await queryClient.invalidateQueries({ queryKey: ["myListings", user?.id] });
    } catch (e) {
      toast.error("Could not update description");
    } finally {
      setIsSaving(false);
    }
  };

  const relist = (listing) => {
    // (Prefill Step 1 + Step 2, then jump to Step 3 tier selection)
    navigate(createPageUrl("CreateListing"), {
      state: {
        startAtStep: 3, // (jump straight to tier selection)
        relistFromId: listing.id,
        relistPrefill: {
          // Step 1
          title: listing.title || "",
          description: listing.description || "",

          // Step 2 (use whichever fields exist in your Listing entity)
          street: listing.street || listing.street_address || listing.addressText || "",
          city: listing.city || "",
          state: listing.state || "",
          zip: listing.zip || listing.zip_code || "",
          lat: listing.lat ?? listing.latitude ?? null,
          lng: listing.lng ?? listing.longitude ?? null,
        },
      },
    });
  };

  return (
    <div className="min-h-[calc(100vh-140px)] p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">My Listings</h1>

          <Button
            onClick={() => navigate(createPageUrl("CreateListing"))}
            className="bg-amber-600 hover:bg-amber-700"
          >
            Create New Listing
          </Button>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-slate-500">Loading listings...</p>
            </CardContent>
          </Card>
        ) : listings.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-slate-500 mb-4">You haven't created any listings yet</p>
              <Button
                onClick={() => navigate(createPageUrl("CreateListing"))}
                className="bg-amber-600 hover:bg-amber-700"
              >
                Create Your First Listing
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {listings.map((listing) => (
              <Card key={listing.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold mb-2">{listing.title}</h3>

                      <div className="flex gap-2 flex-wrap">
                        <Badge className={tierColors[listing.tier] || "bg-slate-500"}>
                          {listing.tier === "neighborhood_tier"
                            ? "Neighborhood"
                            : String(listing.tier || "free").toUpperCase()}
                        </Badge>

                        <Badge className={statusColors[listing.status] || "bg-gray-500"}>
                          {listing.status === "under_review"
                            ? "Under Review"
                            : String(listing.status || "active").toUpperCase()}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!((listing.lat ?? listing.latitude) && (listing.lng ?? listing.longitude))}
                        onClick={() => navigate(createPageUrl("Map") + `?listingId=${listing.id}`)}
                        className="gap-1"
                      >
                        <Map className="w-3 h-3" />
                        Show on Map
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(createPageUrl("ListingDetail") + `?id=${listing.id}`)}
                      >
                        View Details
                      </Button>

                      <Button variant="outline" size="sm" onClick={() => openEditDescription(listing)}>
                        Edit Description
                      </Button>

                      <Button variant="outline" size="sm" onClick={() => relist(listing)}>
                        Relist
                      </Button>
                    </div>
                  </div>

                  <p className="text-slate-600 mb-4">{listing.description}</p>

                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {listing.city}, {listing.zip}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {listing.startDateTime ? format(new Date(listing.startDateTime), "PPp") : "No start time set"}
                      </span>
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

      {/* (Edit Description popup) */}
      <Dialog open={!!editingListing} onOpenChange={(open) => !open && closeEditDescription()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Description</DialogTitle>
          </DialogHeader>

          <Textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            rows={7}
            placeholder="Update your description..."
          />

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={closeEditDescription}>
              Cancel
            </Button>
            <Button onClick={saveDescription} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

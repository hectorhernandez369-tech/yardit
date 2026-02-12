import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Eye, EyeOff, Navigation } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function MyListingsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

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
  }, []);

  const { data: listings, isLoading } = useQuery({
    queryKey: ["myListings", user?.id],
    queryFn: () => base44.entities.Listing.filter({ ownerUserId: user.id }, "-created_date"),
    enabled: !!user,
    initialData: [],
  });

  if (!user) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  const tierColors = {
    free: "bg-slate-500",
    featured: "bg-purple-600",
    premium: "bg-amber-600",
    neighborhood_tier: "bg-emerald-600"
  };

  const statusColors = {
    active: "bg-green-600",
    hidden: "bg-gray-500",
    under_review: "bg-yellow-600",
    suspended: "bg-red-600",
    completed: "bg-blue-600",
    expired: "bg-gray-400"
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

        {listings.length === 0 ? (
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
                      <div className="flex gap-2">
                        <Badge className={tierColors[listing.tier]}>
                          {listing.tier === "neighborhood_tier" ? "Neighborhood" : listing.tier.toUpperCase()}
                        </Badge>
                        <Badge className={statusColors[listing.status]}>
                          {listing.status === "under_review" ? "Under Review" : listing.status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {listing.lat && listing.lng && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(createPageUrl("Map") + `?listingId=${listing.id}`)}
                          className="gap-1"
                        >
                          <Navigation className="w-3 h-3" />
                          Show on Map
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(createPageUrl("ListingDetail") + `?id=${listing.id}`)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>

                  <p className="text-slate-600 mb-4">{listing.description}</p>

                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <MapPin className="w-4 h-4" />
                      <span>{listing.city}, {listing.zip}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar className="w-4 h-4" />
                      <span>{format(new Date(listing.startDateTime), "PPp")}</span>
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
    </div>
  );
}
import React, { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Trash2, MapPin, Calendar, ShoppingBag, Candy } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function TrackedListings({ user }) {
  const queryClient = useQueryClient();

  const { data: tracked, isLoading } = useQuery({
    queryKey: ["trackedListings", user?.email],
    queryFn: () => base44.entities.TrackedListing.filter({ user_email: user.email }, "-created_date"),
    enabled: !!user?.email,
    initialData: [],
  });

  const { data: locations } = useQuery({
    queryKey: ["locations"],
    queryFn: () => base44.entities.Location.list("-created_date"),
    initialData: [],
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TrackedListing.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trackedListings"] });
      toast.success("Stopped tracking listing");
    },
  });

  const getLocation = (locationId) => {
    return locations.find((loc) => loc.id === locationId);
  };

  const trackedWithDetails = tracked.map((t) => ({
    ...t,
    location: getLocation(t.location_id),
  })).filter((t) => t.location);

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <Eye className="w-5 h-5" />
          Tracked Listings
          <span className="text-sm font-normal text-gray-500">({trackedWithDetails.length})</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6">
        {trackedWithDetails.length === 0 ? (
          <div className="text-center py-8">
            <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No tracked listings</p>
            <p className="text-sm text-gray-500">
              Track listings from the map to get expiration notifications
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {trackedWithDetails.map((item) => {
              const location = item.location;
              const isExpired = location.expires_at && new Date(location.expires_at) < new Date();
              const isExpiringSoon = location.expires_at && 
                new Date(location.expires_at) < new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

              return (
                <Card key={item.id} className="border-2">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        location.type === "yard_sale" ? "bg-orange-100" : "bg-purple-100"
                      }`}>
                        {location.type === "yard_sale" ? (
                          <ShoppingBag className="w-5 h-5 text-orange-600" />
                        ) : (
                          <Candy className="w-5 h-5 text-purple-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 mb-2">
                          <h3 className="font-semibold">{location.title}</h3>
                          {isExpired ? (
                            <Badge variant="outline" className="border-red-500 text-red-600">
                              Expired
                            </Badge>
                          ) : isExpiringSoon ? (
                            <Badge variant="outline" className="border-orange-500 text-orange-600">
                              Expiring Soon
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-green-500 text-green-600">
                              Active
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{location.address}</p>
                        {location.expires_at && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Calendar className="w-3 h-3" />
                            Expires: {format(new Date(location.expires_at), "MMM d, yyyy")}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(item.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
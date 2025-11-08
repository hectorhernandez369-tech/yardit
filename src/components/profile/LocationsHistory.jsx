import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Calendar, 
  ShoppingBag, 
  Candy, 
  Trash2, 
  ExternalLink,
  Clock,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function LocationsHistory({ locations, isLoading }) {
  const queryClient = useQueryClient();

  const deleteLocationMutation = useMutation({
    mutationFn: (locationId) => base44.entities.Location.delete(locationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userLocations"] });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast.success("Location deleted successfully!");
    },
    onError: (error) => {
      toast.error("Failed to delete location.");
      console.error(error);
    },
  });

  const handleDelete = (locationId, title) => {
    if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
      deleteLocationMutation.mutate(locationId);
    }
  };

  const isExpired = (location) => {
    if (!location.expires_at) return false;
    return new Date(location.expires_at) < new Date();
  };

  const getStatusBadge = (location) => {
    if (!location.active) {
      return (
        <Badge variant="outline" className="border-gray-400 text-gray-600">
          <XCircle className="w-3 h-3 mr-1" />
          Inactive
        </Badge>
      );
    }
    if (isExpired(location)) {
      return (
        <Badge variant="outline" className="border-red-400 text-red-600">
          <Clock className="w-3 h-3 mr-1" />
          Expired
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-green-500 text-green-600">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Active
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle>My Locations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 border rounded-lg">
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          My Locations
          <span className="text-sm font-normal text-gray-500">
            ({locations.length} total)
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {locations.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No locations yet</h3>
            <p className="text-gray-500 mb-4">Start by adding your first location to the map!</p>
            <Button
              onClick={() => (window.location.href = "/add-location")}
              className="bg-gradient-to-r from-orange-500 to-purple-600"
            >
              Add Location
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {locations.map((location) => (
              <Card key={location.id} className="border-2 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      location.type === "yard_sale" ? "bg-orange-100" : "bg-purple-100"
                    }`}>
                      {location.type === "yard_sale" ? (
                        <ShoppingBag className="w-6 h-6 text-orange-600" />
                      ) : (
                        <Candy className="w-6 h-6 text-purple-600" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start gap-2 mb-2">
                        <h3 className="font-bold text-lg">{location.title}</h3>
                        {getStatusBadge(location)}
                        <Badge
                          variant="outline"
                          className={
                            location.type === "yard_sale"
                              ? "bg-orange-50 text-orange-700 border-orange-300"
                              : "bg-purple-50 text-purple-700 border-purple-300"
                          }
                        >
                          {location.type === "yard_sale" ? "Yard Sale" : "Halloween Candy"}
                        </Badge>
                      </div>

                      <p className="text-sm text-gray-600 mb-2">{location.address}</p>

                      {location.description && (
                        <p className="text-sm text-gray-700 mb-2">{location.description}</p>
                      )}

                      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Created: {format(new Date(location.created_date), "MMM d, yyyy")}
                        </div>
                        {location.date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Event: {format(new Date(location.date), "MMM d, yyyy")}
                          </div>
                        )}
                        {location.expires_at && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Expires: {format(new Date(location.expires_at), "MMM d, yyyy")}
                          </div>
                        )}
                      </div>

                      {location.payment_plan && location.payment_plan !== "free" && (
                        <div className="mt-2">
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                            {location.payment_plan === "5_day" ? "5-Day Plan" : "Monthly Plan"} - 
                            ${location.payment_amount?.toFixed(2)}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex sm:flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          window.open(
                            `/?location=${location.latitude},${location.longitude}`,
                            "_blank"
                          )
                        }
                        className="gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span className="hidden sm:inline">View</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(location.id, location.title)}
                        disabled={deleteLocationMutation.isPending}
                        className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Delete</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
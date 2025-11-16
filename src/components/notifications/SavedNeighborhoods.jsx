import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MapPin, Plus, Trash2, Edit2, X, Save } from "lucide-react";
import { toast } from "sonner";

export default function SavedNeighborhoods({ user }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newNeighborhood, setNewNeighborhood] = useState({
    name: "",
    center_lat: null,
    center_lng: null,
    radius_km: 5,
  });

  const queryClient = useQueryClient();

  const { data: neighborhoods, isLoading } = useQuery({
    queryKey: ["savedNeighborhoods", user?.email],
    queryFn: () => base44.entities.SavedNeighborhood.filter({ user_email: user.email }, "-created_date"),
    enabled: !!user?.email,
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SavedNeighborhood.create({ ...data, user_email: user.email }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedNeighborhoods"] });
      toast.success("Neighborhood saved!");
      setIsAdding(false);
      setNewNeighborhood({ name: "", center_lat: null, center_lng: null, radius_km: 5 });
    },
    onError: () => {
      toast.error("Failed to save neighborhood");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SavedNeighborhood.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedNeighborhoods"] });
      toast.success("Neighborhood removed");
    },
  });

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setNewNeighborhood((prev) => ({
            ...prev,
            center_lat: position.coords.latitude,
            center_lng: position.coords.longitude,
          }));
          toast.success("Location detected!");
        },
        () => {
          toast.error("Could not get your location");
        }
      );
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newNeighborhood.name || !newNeighborhood.center_lat || !newNeighborhood.center_lng) {
      toast.error("Please fill in all fields and set location");
      return;
    }
    createMutation.mutate(newNeighborhood);
  };

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Saved Neighborhoods
            <span className="text-sm font-normal text-gray-500">({neighborhoods.length})</span>
          </CardTitle>
          {!isAdding && (
            <Button
              size="sm"
              onClick={() => setIsAdding(true)}
              className="gap-2 bg-gradient-to-r from-orange-500 to-purple-600"
            >
              <Plus className="w-4 h-4" />
              Add
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {isAdding && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Neighborhood Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Downtown, My Neighborhood"
                  value={newNeighborhood.name}
                  onChange={(e) =>
                    setNewNeighborhood((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={getCurrentLocation}
                  className="w-full"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Use Current Location
                </Button>
                {newNeighborhood.center_lat && (
                  <p className="text-xs text-green-600">
                    Location set: {newNeighborhood.center_lat.toFixed(4)}, {newNeighborhood.center_lng.toFixed(4)}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="radius">Radius (km)</Label>
                <Input
                  id="radius"
                  type="number"
                  min="1"
                  max="50"
                  value={newNeighborhood.radius_km}
                  onChange={(e) =>
                    setNewNeighborhood((prev) => ({ ...prev, radius_km: parseFloat(e.target.value) }))
                  }
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAdding(false);
                    setNewNeighborhood({ name: "", center_lat: null, center_lng: null, radius_km: 5 });
                  }}
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-purple-600"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>
          </form>
        )}

        {neighborhoods.length === 0 && !isAdding ? (
          <div className="text-center py-8">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No saved neighborhoods yet</p>
            <p className="text-sm text-gray-500">
              Save neighborhoods to get notified about new listings nearby
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {neighborhoods.map((neighborhood) => (
              <Card key={neighborhood.id} className="border-2">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">{neighborhood.name}</h3>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>
                          Location: {neighborhood.center_lat.toFixed(4)}, {neighborhood.center_lng.toFixed(4)}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{neighborhood.radius_km} km radius</Badge>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(neighborhood.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
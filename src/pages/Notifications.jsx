import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bell, 
  MapPin, 
  Plus, 
  Trash2, 
  Heart,
  Loader2,
  Navigation,
  Settings
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function NotificationsPage() {
  const [user, setUser] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [newNeighborhood, setNewNeighborhood] = useState({
    name: "",
    latitude: null,
    longitude: null,
    radius_km: 2,
  });
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setIsLoadingUser(false);
      }
    };
    fetchUser();
  }, []);

  const { data: notifications } = useQuery({
    queryKey: ["notifications", user?.email],
    queryFn: () => base44.entities.Notification.filter({ user_email: user.email }, "-created_date"),
    enabled: !!user?.email,
    initialData: [],
  });

  const { data: savedNeighborhoods } = useQuery({
    queryKey: ["savedNeighborhoods", user?.email],
    queryFn: () => base44.entities.SavedNeighborhood.filter({ user_email: user.email }),
    enabled: !!user?.email,
    initialData: [],
  });

  const { data: trackedLocations } = useQuery({
    queryKey: ["trackedLocations", user?.email],
    queryFn: () => base44.entities.TrackedLocation.filter({ user_email: user.email }),
    enabled: !!user?.email,
    initialData: [],
  });

  const { data: allLocations } = useQuery({
    queryKey: ["locations"],
    queryFn: () => base44.entities.Location.list(),
    initialData: [],
  });

  const addNeighborhoodMutation = useMutation({
    mutationFn: (data) => base44.entities.SavedNeighborhood.create({
      ...data,
      user_email: user.email,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedNeighborhoods"] });
      setNewNeighborhood({ name: "", latitude: null, longitude: null, radius_km: 2 });
      toast.success("Neighborhood saved! You'll be notified of new listings here.");
    },
  });

  const deleteNeighborhoodMutation = useMutation({
    mutationFn: (id) => base44.entities.SavedNeighborhood.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedNeighborhoods"] });
      toast.success("Neighborhood removed.");
    },
  });

  const untrackLocationMutation = useMutation({
    mutationFn: (id) => base44.entities.TrackedLocation.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trackedLocations"] });
      toast.success("Location untracked.");
    },
  });

  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          setNewNeighborhood((prev) => ({
            ...prev,
            latitude: lat,
            longitude: lng,
          }));

          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
            );
            const data = await response.json();
            if (data.address) {
              const name = data.address.neighbourhood || data.address.suburb || data.address.city || "My Area";
              setNewNeighborhood((prev) => ({
                ...prev,
                name: name,
              }));
            }
          } catch (error) {
            console.error("Error getting address:", error);
          }

          setIsGettingLocation(false);
          toast.success("Location detected!");
        },
        (error) => {
          setIsGettingLocation(false);
          toast.error("Could not get your location.");
        }
      );
    }
  };

  const handleAddNeighborhood = (e) => {
    e.preventDefault();
    if (!newNeighborhood.name || !newNeighborhood.latitude || !newNeighborhood.longitude) {
      toast.error("Please fill in all fields and set location.");
      return;
    }
    addNeighborhoodMutation.mutate(newNeighborhood);
  };

  const getTrackedLocationDetails = (trackedLocation) => {
    return allLocations.find(loc => loc.id === trackedLocation.location_id);
  };

  if (isLoadingUser) {
    return (
      <div className="min-h-[calc(100vh-140px)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-140px)] p-4 md:p-8 bg-gradient-to-br from-orange-50 via-purple-50 to-pink-50">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Bell className="w-8 h-8" />
            Notifications & Alerts
          </h1>
          <p className="text-gray-600 mt-2">
            Manage your notification preferences and stay updated on listings
          </p>
        </div>

        <Tabs defaultValue="notifications" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              Alerts
              {notifications.filter(n => !n.read).length > 0 && (
                <Badge className="ml-1 bg-red-500">{notifications.filter(n => !n.read).length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="neighborhoods" className="gap-2">
              <MapPin className="w-4 h-4" />
              Areas
              <Badge variant="outline" className="ml-1">{savedNeighborhoods.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="tracked" className="gap-2">
              <Heart className="w-4 h-4" />
              Tracked
              <Badge variant="outline" className="ml-1">{trackedLocations.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notifications">
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle>Recent Notifications</CardTitle>
              </CardHeader>
              <CardContent>
                {notifications.length === 0 ? (
                  <div className="text-center py-12">
                    <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No notifications yet</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Save neighborhoods and track listings to get alerts!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((notification) => (
                      <Card key={notification.id} className={`border-2 ${!notification.read ? "bg-blue-50 border-blue-200" : ""}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold">{notification.title}</h3>
                                {!notification.read && (
                                  <Badge className="bg-blue-600">New</Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                              <p className="text-xs text-gray-400">
                                {formatDistanceToNow(new Date(notification.created_date), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="neighborhoods">
            <div className="space-y-6">
              <Card className="border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Add Neighborhood
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddNeighborhood} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="neighborhood-name">Neighborhood Name</Label>
                      <Input
                        id="neighborhood-name"
                        placeholder="e.g., Downtown, Westside"
                        value={newNeighborhood.name}
                        onChange={(e) => setNewNeighborhood(prev => ({ ...prev, name: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={getCurrentLocation}
                        disabled={isGettingLocation}
                        className="w-full gap-2"
                      >
                        {isGettingLocation ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Navigation className="w-4 h-4" />
                        )}
                        Use My Current Location
                      </Button>
                      {newNeighborhood.latitude && newNeighborhood.longitude && (
                        <p className="text-xs text-green-600">
                          Location set: {newNeighborhood.latitude.toFixed(4)}, {newNeighborhood.longitude.toFixed(4)}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="radius">Alert Radius (km)</Label>
                      <Input
                        id="radius"
                        type="number"
                        min="1"
                        max="10"
                        value={newNeighborhood.radius_km}
                        onChange={(e) => setNewNeighborhood(prev => ({ ...prev, radius_km: parseFloat(e.target.value) }))}
                      />
                      <p className="text-xs text-gray-500">
                        You'll be notified of new listings within this radius
                      </p>
                    </div>
                    <Button type="submit" className="w-full" disabled={addNeighborhoodMutation.isPending}>
                      <Plus className="w-4 h-4 mr-2" />
                      Save Neighborhood
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl">
                <CardHeader>
                  <CardTitle>Saved Neighborhoods ({savedNeighborhoods.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {savedNeighborhoods.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No saved neighborhoods yet</p>
                  ) : (
                    <div className="space-y-3">
                      {savedNeighborhoods.map((neighborhood) => (
                        <Card key={neighborhood.id} className="border-2">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-semibold flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-blue-600" />
                                  {neighborhood.name}
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">
                                  {neighborhood.radius_km}km radius • {neighborhood.latitude.toFixed(4)}, {neighborhood.longitude.toFixed(4)}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteNeighborhoodMutation.mutate(neighborhood.id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tracked">
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle>Tracked Listings ({trackedLocations.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {trackedLocations.length === 0 ? (
                  <div className="text-center py-12">
                    <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No tracked listings yet</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Click the heart icon on any listing to track it
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {trackedLocations.map((tracked) => {
                      const location = getTrackedLocationDetails(tracked);
                      if (!location) return null;
                      
                      return (
                        <Card key={tracked.id} className="border-2">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <h3 className="font-semibold">{location.title}</h3>
                                <p className="text-sm text-gray-600">{location.address}</p>
                                {location.expires_at && (
                                  <p className="text-xs text-orange-600 mt-1">
                                    Expires: {new Date(location.expires_at).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => untrackLocationMutation.mutate(tracked.id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}